-- T007D: optimistic concurrency for CMS edits + minimal learner snapshots.
-- Forward-only and additive. Apply only after review; never with an unreviewed `db push`.
--
-- 1. Every editable CMS row (videos, resources, content_overrides, games) gets a
--    `revision` (default 1). A client UPDATE must write exactly old.revision + 1,
--    so an edit made from a stale copy is refused (SQLSTATE PT409 → HTTP 409)
--    instead of silently overwriting someone else's change. RPC/owner writes
--    (workflow transitions, verification) advance the revision too.
-- 2. cms_transition / cms_verify_source accept p_expected_revision. When given,
--    acting on a stale copy (e.g. approving text you have not seen) is refused.
-- 3. Learner snapshots (cms_published) no longer carry editorial metadata:
--    reason, verified_by, verified_at, revision. Visibility is still computed
--    from the source row at publish time.
--
-- Rollback (manual, owner only): re-run the previous definitions of
-- v2u_content_guard / v2u_game_guard / v2u_audit_row / cms_transition /
-- cms_verify_source from 20261005010000 / 20261004000000, restore the 4-arg and
-- 2-arg RPC grants, then drop the `revision` columns. Stripped snapshot keys are
-- not recoverable from cms_published (they remain in the source rows).
begin;

alter table public.videos add column revision integer not null default 1 check (revision >= 1);
alter table public.resources add column revision integer not null default 1 check (revision >= 1);
alter table public.content_overrides add column revision integer not null default 1 check (revision >= 1);
alter table public.games add column revision integer not null default 1 check (revision >= 1);

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
    -- workflow RPCs and owner maintenance still advance the revision
    if tg_op = 'UPDATE' then
      new.revision := old.revision + 1;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if n ->> 'verification_status' = 'VERIFIED' then
      raise exception 'VERIFIED requires an explicit reviewer verification' using errcode = '42501';
    end if;
    patch := jsonb_build_object('state', 'DRAFT', 'published_version', 0, 'review_note', null, 'submitted_by', null,
      'approved_by', null, 'approved_at', null, 'reviewed_by', null, 'reviewed_at', null, 'revision', 1,
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
  -- optimistic concurrency: write exactly the next revision of the copy you loaded
  if (n ->> 'revision')::integer is distinct from (o ->> 'revision')::integer + 1 then
    raise exception 'stale revision: this item was changed by someone else; reload the latest version' using errcode = 'PT409';
  end if;
  n := n - 'revision';
  o := o - 'revision';
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

create or replace function public.v2u_game_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if public.v2u_is_client() then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.created_at := now();
      new.revision := 1;
    else
      if (new.id, new.game_id, new.created_by, new.created_at) is distinct from (old.id, old.game_id, old.created_by, old.created_at) then
        raise exception 'game_id and creation fields cannot change' using errcode = '42501';
      end if;
      if new.revision is distinct from old.revision + 1 then
        raise exception 'stale revision: this item was changed by someone else; reload the latest version' using errcode = 'PT409';
      end if;
    end if;
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Same audit behavior; the revision counter is bookkeeping, not an edit.
create or replace function public.v2u_audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n jsonb := to_jsonb(new) - 'revision';
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) - 'revision' end;
  only_order boolean := tg_op = 'UPDATE'
    and (n - array['sort_order', 'updated_at', 'updated_by', 'state']) = (o - array['sort_order', 'updated_at', 'updated_by', 'state'])
    and (n -> 'sort_order') is distinct from (o -> 'sort_order');
  a public.audit_action;
  etype text;
  b text;
  af text;
begin
  if coalesce(current_setting('v2u.in_rpc', true), '') = 'on' then
    return null;
  end if;
  case tg_table_name
    when 'videos' then
      etype := 'video';
      a := case when tg_op = 'INSERT' then 'VIDEO_CREATED' when only_order then 'ORDER_CHANGED'
                when (o ->> 'visible')::boolean and not (n ->> 'visible')::boolean then 'VIDEO_HIDDEN' else 'VIDEO_UPDATED' end;
    when 'resources' then
      etype := 'resource';
      a := case when tg_op = 'INSERT' then 'RESOURCE_CREATED' when only_order then 'ORDER_CHANGED' else 'RESOURCE_UPDATED' end;
    when 'content_overrides' then
      etype := 'contentOverride';
      a := case when tg_op = 'INSERT' then 'CONTENT_CREATED' else 'CONTENT_UPDATED' end;
    when 'games' then
      etype := 'game';
      a := case when tg_op = 'INSERT' then 'GAME_REGISTERED'
                when (o ->> 'enabled')::boolean and not (n ->> 'enabled')::boolean then 'GAME_DISABLED'
                when not (o ->> 'enabled')::boolean and (n ->> 'enabled')::boolean then 'GAME_ENABLED' else 'GAME_UPDATED' end;
    when 'lesson_game_assignments' then
      etype := 'assignment';
      a := case when tg_op = 'INSERT' or (not (o ->> 'attached')::boolean and (n ->> 'attached')::boolean) then 'GAME_ATTACHED'
                when (o ->> 'attached')::boolean and not (n ->> 'attached')::boolean then 'GAME_DETACHED'
                when only_order then 'ORDER_CHANGED' else 'GAME_UPDATED' end;
  end case;
  b := case when o is null then null else (o - array['created_at', 'updated_at', 'created_by', 'updated_by', 'id'])::text end;
  af := (n - array['created_at', 'updated_at', 'created_by', 'updated_by', 'id'])::text;
  perform public.v2u_audit(a, etype, coalesce(n ->> 'game_id', n ->> 'id'), b, af);
  return null;
end $$;

-- New signatures (old overloads are removed so clients cannot bypass the check by arity).
drop function public.cms_transition(text, uuid, text, text);
drop function public.cms_verify_source(text, uuid);

create function public.cms_transition(p_kind text, p_id uuid, p_transition text, p_note text default null, p_expected_revision integer default null)
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
  if p_expected_revision is not null and (r ->> 'revision')::integer <> p_expected_revision then
    raise exception 'stale revision: this item was changed by someone else; reload the latest version' using errcode = 'PT409';
  end if;
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
    -- learners get only what the learner UI renders: no workflow, actor or editorial metadata
    snap := r - array['contributors', 'state', 'published_version', 'review_note', 'submitted_by', 'approved_by', 'approved_at', 'reviewed_by', 'reviewed_at', 'created_by', 'updated_by', 'created_at', 'updated_at',
      'revision', 'reason', 'verified_by', 'verified_at'];
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

create function public.cms_verify_source(p_kind text, p_id uuid, p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := case p_kind when 'video' then 'videos' when 'resource' then 'resources' end;
  before text;
  rev integer;
begin
  if tbl is null then raise exception 'only videos and resources are verified' using errcode = '22023'; end if;
  perform set_config('v2u.in_rpc', 'on', true);
  perform public.v2u_require('content.verifySource');
  execute format('select verification_status::text, revision from public.%I where id = $1 for update', tbl) into before, rev using p_id;
  if before is null then raise exception 'not found' using errcode = 'P0002'; end if;
  -- never verify a link the reviewer has not seen (e.g. an editor changed it meanwhile)
  if p_expected_revision is not null and rev <> p_expected_revision then
    raise exception 'stale revision: this item was changed by someone else; reload the latest version' using errcode = 'PT409';
  end if;
  execute format($f$update public.%I set verification_status = 'VERIFIED', verified_by = $2, verified_at = now(),
      state = case when state = 'PUBLISHED' then 'DRAFT'::public.content_state else state end, updated_by = $2, updated_at = now()
    where id = $1$f$, tbl) using p_id, auth.uid();
  perform public.v2u_audit(case when p_kind = 'video' then 'VIDEO_VERIFIED' else 'RESOURCE_VERIFIED' end::public.audit_action, p_kind, p_id::text, before, 'VERIFIED');
end $$;

revoke execute on function public.cms_transition(text, uuid, text, text, integer), public.cms_verify_source(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.cms_transition(text, uuid, text, text, integer), public.cms_verify_source(text, uuid, integer)
  to authenticated;

-- Existing live snapshots: drop editorial metadata learners never needed.
update public.cms_published set data = data - array['revision', 'reason', 'verified_by', 'verified_at'];

commit;
