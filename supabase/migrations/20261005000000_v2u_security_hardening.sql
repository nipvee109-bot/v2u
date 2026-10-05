-- Forward-only Phase 72B hardening. Existing rows and migration remain intact.
-- Review edits must be resubmitted; withdrawing a snapshot never approves new text.

begin;

create or replace function public.v2u_content_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  wf constant text[] := array['id', 'state', 'published_version', 'review_note', 'submitted_by', 'approved_by', 'approved_at',
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

  case p_transition
    when 'submit' then
      if st <> 'DRAFT' then raise exception 'only drafts can be submitted' using errcode = '22023'; end if;
      nxt := 'IN_REVIEW'; act := 'CONTENT_SUBMITTED';
    when 'approve' then
      if st <> 'IN_REVIEW' then raise exception 'only items in review can be approved' using errcode = '22023'; end if;
      if controlled and ((r ->> 'updated_by')::uuid = me or (r ->> 'created_by')::uuid = me) then
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
      values (pub.kind, pub.entity_id, pub.lesson_id, pub.data, pub.version, pub.published_at, pub.published_by, pub.learner_visible)
      on conflict (kind, entity_id, version) do nothing;
    end if;
  end if;

  if p_transition = 'publish' then
    snap := r - array['state', 'published_version', 'review_note', 'submitted_by', 'approved_by', 'approved_at', 'reviewed_by', 'reviewed_at', 'created_by', 'updated_by', 'created_at', 'updated_at'];
    visible := case when controlled then true
      else coalesce((r ->> 'visible')::boolean, false) and r ->> 'verification_status' = 'VERIFIED'
           and r ->> 'verified_by' is not null and public.v2u_https_url(r ->> 'url') end;
    insert into public.cms_published (kind, entity_id, lesson_id, data, version, previous_version, published_at, published_by, learner_visible)
    values (p_kind, p_id, r ->> 'lesson_id', snap, coalesce(pub.version, 0) + 1, pub.version, now(), me, visible)
    on conflict (kind, entity_id) do update set data = excluded.data, lesson_id = excluded.lesson_id, version = excluded.version,
      previous_version = excluded.previous_version, published_at = excluded.published_at, published_by = excluded.published_by,
      learner_visible = excluded.learner_visible;
    execute format('update public.%I set state = $2, published_version = $3, updated_at = now() where id = $1', tbl)
      using p_id, nxt, coalesce(pub.version, 0) + 1;
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
  perform public.v2u_audit(act, p_kind, p_id::text, st::text, nxt::text);
  return nxt;
end $$;

create or replace function public.set_user_role(target_user_id uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.app_role;
  active_supers integer;
  target_status public.account_status;
begin
  perform set_config('v2u.in_rpc', 'on', true);
  -- Serialize admin changes, then re-check permission using a fresh statement snapshot.
  perform 1 from public.profiles where role = 'SUPER_ADMIN' order by id for update;
  perform public.v2u_require('users.manageRoles');
  if target_user_id = auth.uid() then raise exception 'you cannot change your own role' using errcode = '42501'; end if;
  select role, status into cur, target_status from public.profiles where id = target_user_id for update;
  if cur is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if (cur in ('ADMIN', 'SUPER_ADMIN') or new_role in ('ADMIN', 'SUPER_ADMIN')) and not public.v2u_can('users.manageAdmins') then
    raise exception 'only SUPER_ADMIN can grant or remove admin roles' using errcode = '42501';
  end if;
  select count(*) into active_supers from public.profiles where role = 'SUPER_ADMIN' and status = 'ACTIVE';
  if cur = 'SUPER_ADMIN' and target_status = 'ACTIVE' and new_role <> 'SUPER_ADMIN' and active_supers <= 1 then
    raise exception 'at least one active SUPER_ADMIN is required' using errcode = '42501';
  end if;
  if cur = new_role then return; end if;
  update public.profiles set role = new_role where id = target_user_id;
  perform public.v2u_audit('ROLE_CHANGED', 'user', target_user_id::text, cur::text, new_role::text);
end $$;

create or replace function public.set_user_status(target_user_id uuid, new_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.profiles;
  active_supers integer;
begin
  perform set_config('v2u.in_rpc', 'on', true);
  -- Serialize admin changes, then re-check permission using a fresh statement snapshot.
  perform 1 from public.profiles where role = 'SUPER_ADMIN' order by id for update;
  perform public.v2u_require('users.setStatus');
  if target_user_id = auth.uid() then raise exception 'you cannot change your own status' using errcode = '42501'; end if;
  select * into cur from public.profiles where id = target_user_id for update;
  if cur.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if cur.role in ('ADMIN', 'SUPER_ADMIN') and not public.v2u_can('users.manageAdmins') then
    raise exception 'only SUPER_ADMIN can suspend admin accounts' using errcode = '42501';
  end if;
  select count(*) into active_supers from public.profiles where role = 'SUPER_ADMIN' and status = 'ACTIVE';
  if cur.role = 'SUPER_ADMIN' and cur.status = 'ACTIVE' and new_status <> 'ACTIVE' and active_supers <= 1 then
    raise exception 'at least one active SUPER_ADMIN is required' using errcode = '42501';
  end if;
  if cur.status = new_status then return; end if;
  update public.profiles set status = new_status where id = target_user_id;
  perform public.v2u_audit('STATUS_CHANGED', 'user', target_user_id::text, cur.status::text, new_status::text);
end $$;

drop policy assignments_select on public.lesson_game_assignments;
create policy assignments_select on public.lesson_game_assignments for select to anon, authenticated
  using ((attached and visible and exists (
    select 1 from public.games g where g.game_id = lesson_game_assignments.game_id and g.published
  )) or public.v2u_can('admin.access'));

-- Explicitly preserve least privilege even under Supabase's function defaults.
revoke execute on function public.v2u_content_guard(), public.cms_transition(text, uuid, text, text),
  public.set_user_role(uuid, public.app_role), public.set_user_status(uuid, public.account_status)
  from public, anon, authenticated;
grant execute on function public.cms_transition(text, uuid, text, text),
  public.set_user_role(uuid, public.app_role), public.set_user_status(uuid, public.account_status) to authenticated;
revoke insert, update, delete on public.audit_logs, public.cms_versions from anon, authenticated;

commit;
