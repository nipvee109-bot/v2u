-- Forward-only T004 fixes; apply only to an approved environment.
begin;

-- Preserve history exactly. Legacy numbering needs explicit owner repair before
-- this migration can run; never silently discard or renumber a live snapshot.
-- Hold writers until commit so the preflight cannot race with publication.
lock table public.cms_published, public.cms_versions in share row exclusive mode;
do $$
declare conflict record;
begin
  select p.kind, p.entity_id, p.version, max(v.version) historical_version
    into conflict
    from public.cms_published p join public.cms_versions v
      on v.kind = p.kind and v.entity_id = p.entity_id
    group by p.kind, p.entity_id, p.version
    having p.version <= max(v.version)
    order by p.kind, p.entity_id limit 1;
  if found then
    raise exception 'T004 history invariant: %/% live version % <= historical version %; explicit owner repair required',
      conflict.kind, conflict.entity_id, conflict.version, conflict.historical_version
      using errcode = '23514';
  end if;
end $$;

-- PostgreSQL has a GLOBAL default EXECUTE grant to PUBLIC: schema-only revoke
-- cannot remove that global grant. Explicitly grant future API functions.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

alter table public.content_overrides add column contributors uuid[] not null default '{}';
-- Recover intermediate editors since the last approval from database-written
-- actor IDs, without relying on redacted content summaries.
select set_config('v2u.in_rpc', 'on', true);
update public.content_overrides c set contributors = array(
  select distinct uid from (
    select unnest(array[c.created_by, c.updated_by]) uid
    union all
    select a.actor_id from public.audit_logs a
    where a.entity_type = 'contentOverride' and a.entity_id = c.id::text
      and a.action in ('CONTENT_CREATED', 'CONTENT_UPDATED')
      and a.id > coalesce((select max(ap.id) from public.audit_logs ap
        where ap.entity_type = 'contentOverride' and ap.entity_id = c.id::text
          and ap.action = 'CONTENT_APPROVED'), 0)
  ) actors where uid is not null
) where c.state in ('DRAFT', 'IN_REVIEW', 'REJECTED', 'ARCHIVED');
select set_config('v2u.in_rpc', 'off', true);

create or replace function public.v2u_content_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  wf constant text[] := array['contributors', 'id', 'state', 'published_version', 'review_note', 'submitted_by', 'approved_by', 'approved_at',
    'reviewed_by', 'reviewed_at', 'created_by', 'created_at', 'updated_by', 'updated_at', 'verified_by', 'verified_at'];
  n jsonb := to_jsonb(new);
  o jsonb;
  k text;
  patch jsonb;
begin
  if not public.v2u_is_client() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if n ->> 'verification_status' = 'VERIFIED' then
      raise exception 'VERIFIED requires an explicit reviewer verification' using errcode = '42501';
    end if;
    patch := jsonb_build_object('state', 'DRAFT', 'published_version', 0, 'review_note', null, 'submitted_by', null,
      'approved_by', null, 'approved_at', null, 'reviewed_by', null, 'reviewed_at', null,
      'created_by', auth.uid(), 'updated_by', auth.uid(), 'created_at', now(), 'updated_at', now());
    if n ? 'verified_by' then
      patch := patch || jsonb_build_object('verified_by', null, 'verified_at', null);
    end if;
    if n ? 'contributors' then
      patch := patch || jsonb_build_object('contributors', array[auth.uid()]);
    end if;
    return jsonb_populate_record(new, patch);
  end if;
  o := to_jsonb(old);
  if o ->> 'state' = 'ARCHIVED' then
    raise exception 'archived — reopen it first' using errcode = '42501';
  end if;
  foreach k in array wf loop
    if k not in ('updated_at', 'updated_by') and (n -> k) is distinct from (o -> k) then
      raise exception 'column % is managed by the publishing workflow', k using errcode = '42501';
    end if;
  end loop;
  if n ->> 'verification_status' = 'VERIFIED' and (o ->> 'verification_status') is distinct from 'VERIFIED' then
    raise exception 'VERIFIED requires an explicit reviewer verification' using errcode = '42501';
  end if;
  patch := jsonb_build_object('updated_by', auth.uid(), 'updated_at', now());
  if n ? 'contributors' and (n - wf) is distinct from (o - wf) then
    patch := patch || jsonb_build_object('contributors', (
      select jsonb_agg(distinct x) from jsonb_array_elements(
        coalesce(o -> 'contributors', '[]'::jsonb) || jsonb_build_array(auth.uid())) x
    ));
  end if;
  -- a verified link that changes must be verified again
  if o ->> 'verification_status' = 'VERIFIED' and (n ->> 'url') is distinct from (o ->> 'url') then
    patch := patch || jsonb_build_object('verification_status', 'VERIFICATION_PENDING', 'verified_by', null, 'verified_at', null);
  end if;
  -- editing in-review/approved/published/rejected content makes a new draft (published copy stays live)
  if (n - wf) is distinct from (o - wf) and o ->> 'state' in ('IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED') then
    patch := patch || jsonb_build_object('state', 'DRAFT');
  end if;
  return jsonb_populate_record(new, patch);
end $$;

create or replace function public.cms_transition(p_kind text, p_id uuid, p_transition text, p_note text default null)
returns public.content_state
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.v2u_content_table(p_kind);
  r jsonb;
  pub public.cms_published;
  st public.content_state;
  nxt public.content_state;
  controlled boolean := p_kind = 'contentOverride';
  me uuid := auth.uid();
  snap jsonb;
  visible boolean;
  act public.audit_action;
  last_version integer;
begin
  if tbl is null then raise exception 'unknown content kind' using errcode = '22023'; end if;
  perform set_config('v2u.in_rpc', 'on', true);
  perform public.v2u_require(case p_transition
    when 'submit' then 'content.submit' when 'approve' then 'content.review' when 'reject' then 'content.review'
    when 'reopen' then 'content.draft' when 'publish' then 'content.publish' when 'unpublish' then 'content.publish'
    when 'archive' then 'content.draft' else 'invalid' end);
  execute format('select to_jsonb(t) from public.%I t where t.id = $1 for update', tbl) into r using p_id;
  if r is null then raise exception 'not found' using errcode = 'P0002'; end if;
  st := (r ->> 'state')::public.content_state;
  select * into pub from public.cms_published where kind = p_kind and entity_id = p_id for update;

  select greatest(coalesce(pub.version, 0), coalesce((r ->> 'published_version')::integer, 0),
    coalesce(max(version), 0)) into last_version from public.cms_versions where kind = p_kind and entity_id = p_id;

  case p_transition
    when 'submit' then
      if st <> 'DRAFT' then raise exception 'only drafts can be submitted' using errcode = '22023'; end if;
      nxt := 'IN_REVIEW'; act := 'CONTENT_SUBMITTED';
    when 'approve' then
      if st <> 'IN_REVIEW' then raise exception 'only items in review can be approved' using errcode = '22023'; end if;
      if controlled and ((r ->> 'updated_by')::uuid = me or (r ->> 'created_by')::uuid = me or coalesce(r -> 'contributors', '[]'::jsonb) ? me::text) then
        raise exception 'learning content must be approved by someone else' using errcode = '42501';
      end if;
      nxt := 'APPROVED'; act := 'CONTENT_APPROVED';
    when 'reject' then
      if st not in ('IN_REVIEW', 'APPROVED') then raise exception 'cannot reject from this state' using errcode = '22023'; end if;
      nxt := 'REJECTED'; act := 'CONTENT_REJECTED';
    when 'reopen' then
      if st not in ('REJECTED', 'ARCHIVED') then raise exception 'cannot reopen from this state' using errcode = '22023'; end if;
      nxt := 'DRAFT'; act := 'CONTENT_REOPENED';
    when 'publish' then
      if not (st = 'APPROVED' or (not controlled and st in ('DRAFT', 'IN_REVIEW'))) then
        raise exception '%', case when controlled then 'learning content must be approved before publishing' else 'cannot publish from this state' end using errcode = '42501';
      end if;
      nxt := 'PUBLISHED'; act := 'CONTENT_PUBLISHED';
    when 'unpublish' then
      if pub is null then raise exception 'not published' using errcode = '22023'; end if;
      nxt := case when st = 'PUBLISHED' then 'APPROVED'::public.content_state else st end; act := 'CONTENT_UNPUBLISHED';
    when 'archive' then
      if st = 'ARCHIVED' then raise exception 'already archived' using errcode = '22023'; end if;
      if pub.entity_id is not null and not public.v2u_can('content.publish') then
        raise exception 'unpublish before archiving' using errcode = '42501';
      end if;
      nxt := 'ARCHIVED'; act := 'CONTENT_ARCHIVED';
  end case;

  -- keep the previous published copy (recovery)
  if p_transition in ('publish', 'unpublish') or (p_transition = 'archive' and pub.entity_id is not null) then
    if pub.entity_id is not null then
      insert into public.cms_versions (kind, entity_id, lesson_id, data, version, published_at, published_by, learner_visible)
      values (pub.kind, pub.entity_id, pub.lesson_id, pub.data, pub.version, pub.published_at, pub.published_by, pub.learner_visible);
    end if;
  end if;

  if p_transition = 'publish' then
    snap := r - array['contributors', 'state', 'published_version', 'review_note', 'submitted_by', 'approved_by', 'approved_at', 'reviewed_by', 'reviewed_at', 'created_by', 'updated_by', 'created_at', 'updated_at'];
    visible := case when controlled then true
      else coalesce((r ->> 'visible')::boolean, false) and r ->> 'verification_status' = 'VERIFIED'
           and r ->> 'verified_by' is not null and public.v2u_https_url(r ->> 'url') end;
    insert into public.cms_published (kind, entity_id, lesson_id, data, version, previous_version, published_at, published_by, learner_visible)
    values (p_kind, p_id, r ->> 'lesson_id', snap, last_version + 1, nullif(last_version, 0), now(), me, visible)
    on conflict (kind, entity_id) do update set data = excluded.data, lesson_id = excluded.lesson_id, version = excluded.version,
      previous_version = excluded.previous_version, published_at = excluded.published_at, published_by = excluded.published_by,
      learner_visible = excluded.learner_visible;
    execute format('update public.%I set state = $2, published_version = $3, updated_at = now() where id = $1', tbl)
      using p_id, nxt, last_version + 1;
  else
    if p_transition = 'unpublish' or (p_transition = 'archive' and pub.entity_id is not null) then
      delete from public.cms_published where kind = p_kind and entity_id = p_id;
    end if;
    execute format($f$update public.%I set state = $2, review_note = coalesce($3, review_note), updated_at = now(),
        submitted_by = case when $2 = 'IN_REVIEW' then $4 else submitted_by end,
        approved_by = case when $2 = 'APPROVED' and $5 = 'approve' then $4 else approved_by end,
        approved_at = case when $2 = 'APPROVED' and $5 = 'approve' then now() else approved_at end,
        reviewed_by = case when $5 in ('approve', 'reject') then $4 else reviewed_by end,
        reviewed_at = case when $5 in ('approve', 'reject') then now() else reviewed_at end
      where id = $1$f$, tbl) using p_id, nxt, p_note, me, p_transition;
  end if;
  if controlled and p_transition = 'approve' then
    update public.content_overrides set contributors = '{}'::uuid[] where id = p_id;
  end if;
  perform public.v2u_audit(act, p_kind, p_id::text, st::text, nxt::text);
  return nxt;
end $$;


commit;
