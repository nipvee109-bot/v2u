-- =============================================================================
-- V2U Phase 72B — accounts, admin CMS and RBAC on Supabase (PostgreSQL + RLS)
--
-- Authorization lives HERE. The browser's can(user, permission) is only UX.
--   * every application table has RLS enabled; default privileges are revoked
--     and only the minimum is granted back (fail closed)
--   * roles/status change only through set_user_role / set_user_status
--   * workflow state, verification and publishing change only through
--     cms_transition / cms_verify_source (SECURITY DEFINER, search_path = '')
--   * the audit log is written by the database itself and is append-only
--   * learner state (mastery, diagnostics, evidence, review, next step) is NOT
--     stored here; no table or function can read or change it
-- =============================================================================

create extension if not exists pgcrypto;

-- ── Types ────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('STUDENT', 'CONTENT_EDITOR', 'GAME_EDITOR', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN');
create type public.account_status as enum ('ACTIVE', 'SUSPENDED', 'DISABLED');
create type public.content_state as enum ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
create type public.video_purpose as enum ('FIRST_LEARNING', 'REVIEW', 'PRACTICE_SUPPORT');
create type public.verification_status as enum ('DISCOVERED', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'UNAVAILABLE', 'DEPRECATED');
create type public.game_status as enum ('DRAFT', 'PREPARING', 'READY_FOR_REVIEW', 'AVAILABLE', 'DISABLED', 'ERROR', 'ARCHIVED');
create type public.audit_action as enum (
  'VIDEO_CREATED', 'VIDEO_UPDATED', 'VIDEO_VERIFIED', 'VIDEO_HIDDEN',
  'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_VERIFIED',
  'GAME_REGISTERED', 'GAME_UPDATED', 'GAME_ATTACHED', 'GAME_DETACHED', 'GAME_ENABLED', 'GAME_DISABLED',
  'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_SUBMITTED', 'CONTENT_APPROVED', 'CONTENT_REJECTED',
  'CONTENT_PUBLISHED', 'CONTENT_UNPUBLISHED', 'CONTENT_ARCHIVED', 'CONTENT_REOPENED',
  'ROLE_CHANGED', 'STATUS_CHANGED', 'ORDER_CHANGED', 'SETTINGS_UPDATED'
);

-- Shared value checks
create function public.v2u_https_url(u text) returns boolean language sql immutable set search_path = '' as $$
  select u ~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$' and length(u) <= 2000
$$;
create function public.v2u_lesson_id(l text) returns boolean language sql immutable set search_path = '' as $$
  select l ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(l) <= 120
$$;

-- ── Profiles (auth.users is identity only) ──────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 200),
  email text not null default '',
  avatar_url text check (avatar_url is null or public.v2u_https_url(avatar_url)),
  role public.app_role not null default 'STUDENT',
  status public.account_status not null default 'ACTIVE',
  onboarding_completed boolean not null default false,
  learner_data_location text not null default 'local-device' check (learner_data_location in ('local-device', 'account')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ── Permission engine (mirror of src/auth/permissions.ts; parity is tested) ─
create function public.v2u_role_can(r public.app_role, perm text) returns boolean
language sql immutable set search_path = '' as $$
  select case r
    when 'CONTENT_EDITOR' then perm = any (array['admin.access', 'content.draft', 'content.submit'])
    when 'GAME_EDITOR' then perm = any (array['admin.access', 'game.manage', 'game.assign'])
    when 'REVIEWER' then perm = any (array['admin.access', 'content.review', 'content.publish', 'content.verifySource'])
    when 'ADMIN' then perm = any (array['admin.access', 'content.draft', 'content.submit', 'game.manage', 'game.assign',
      'content.review', 'content.publish', 'content.verifySource', 'users.view', 'users.manageRoles', 'users.setStatus',
      'audit.view', 'settings.manage'])
    when 'SUPER_ADMIN' then perm = any (array['admin.access', 'content.draft', 'content.submit', 'game.manage', 'game.assign',
      'content.review', 'content.publish', 'content.verifySource', 'users.view', 'users.manageRoles', 'users.setStatus',
      'audit.view', 'settings.manage', 'users.manageAdmins', 'system.emergency'])
    else false
  end
$$;

-- Role of the caller, only while ACTIVE. SECURITY DEFINER so RLS policies on
-- profiles can use it without recursion.
create function public.v2u_current_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE'
$$;

create function public.v2u_can(perm text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.v2u_role_can(public.v2u_current_role(), perm), false)
$$;

-- True for direct PostgREST writes by browsers; false inside V2U RPCs
-- (they set v2u.in_rpc, which PostgREST clients cannot do) and for the
-- project owner in the SQL editor.
create function public.v2u_is_client() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated') and coalesce(current_setting('v2u.in_rpc', true), '') <> 'on'
$$;

create function public.v2u_redact(t text) returns text language sql immutable set search_path = '' as $$
  select left(regexp_replace(t, '(ya29\.|AIza|eyJ|sbp_|sb_secret_)[A-Za-z0-9._-]+', '[redacted]', 'g'), 300)
$$;

-- ── Audit log (append-only; written only by the database) ───────────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.app_role,
  action public.audit_action not null,
  entity_type text not null check (entity_type in ('video', 'resource', 'contentOverride', 'game', 'assignment', 'user', 'settings')),
  entity_id text not null,
  before_summary text check (length(before_summary) <= 300),
  after_summary text check (length(after_summary) <= 300),
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create function public.v2u_audit(a public.audit_action, etype text, eid text, b text, af text) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_summary, after_summary)
  values (auth.uid(), (select p.role from public.profiles p where p.id = auth.uid()), a, etype, eid, public.v2u_redact(b), public.v2u_redact(af))
$$;

create function public.v2u_audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'audit log is append-only' using errcode = '42501';
end $$;
create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.v2u_audit_immutable();

-- ── Content working copies (videos, resources, controlled text overrides) ───
-- Workflow columns are identical across the three tables.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null check (public.v2u_lesson_id(lesson_id)),
  title text not null check (length(btrim(title)) > 0 and length(title) <= 300),
  provider text not null default 'youtube' check (provider in ('youtube', 'vimeo', 'other')),
  url text not null check (public.v2u_https_url(url)),
  video_id text check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  channel text not null default '' check (length(channel) <= 200),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  purpose public.video_purpose not null default 'FIRST_LEARNING',
  verification_status public.verification_status not null default 'DISCOVERED',
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text not null default '' check (length(notes) <= 2000),
  state public.content_state not null default 'DRAFT',
  published_version integer not null default 0,
  review_note text,
  submitted_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_verified_has_reviewer check (verification_status <> 'VERIFIED' or (verified_by is not null and verified_at is not null))
);
create index videos_lesson_idx on public.videos (lesson_id, sort_order);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null check (public.v2u_lesson_id(lesson_id)),
  title text not null check (length(btrim(title)) > 0 and length(title) <= 300),
  description text not null default '' check (length(description) <= 2000),
  url text not null check (public.v2u_https_url(url)),
  publisher text not null default '' check (length(publisher) <= 200),
  resource_type text not null default 'article' check (resource_type in ('article', 'book', 'documentation', 'course', 'other')),
  verification_status public.verification_status not null default 'DISCOVERED',
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  state public.content_state not null default 'DRAFT',
  published_version integer not null default 0,
  review_note text,
  submitted_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_verified_has_reviewer check (verification_status <> 'VERIFIED' or (verified_by is not null and verified_at is not null))
);
create index resources_lesson_idx on public.resources (lesson_id, sort_order);

-- Controlled learning text: ONLY summary / analogy / whyItMatters, reviewed by someone else.
create table public.content_overrides (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null check (public.v2u_lesson_id(lesson_id)),
  field text not null check (field in ('summary', 'analogy', 'whyItMatters')),
  value jsonb not null check (
    (field = 'summary' and jsonb_typeof(value) = 'array' and jsonb_array_length(value) > 0)
    or (field <> 'summary' and jsonb_typeof(value) = 'string' and length(btrim(value #>> '{}')) > 0)
  ),
  reason text not null check (length(btrim(reason)) > 0 and length(reason) <= 500),
  state public.content_state not null default 'DRAFT',
  published_version integer not null default 0,
  review_note text,
  submitted_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_overrides_lesson_idx on public.content_overrides (lesson_id);

-- What learners see: immutable snapshots written only by cms_transition.
create table public.cms_published (
  kind text not null check (kind in ('video', 'resource', 'contentOverride')),
  entity_id uuid not null,
  lesson_id text not null,
  data jsonb not null,
  version integer not null check (version > 0),
  previous_version integer,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id),
  learner_visible boolean not null,
  primary key (kind, entity_id)
);
create index cms_published_visible_idx on public.cms_published (learner_visible, lesson_id);

create table public.cms_versions (
  id bigint generated always as identity primary key,
  kind text not null,
  entity_id uuid not null,
  lesson_id text not null,
  data jsonb not null,
  version integer not null,
  published_at timestamptz not null,
  published_by uuid,
  learner_visible boolean not null,
  superseded_at timestamptz not null default now(),
  unique (kind, entity_id, version)
);
create trigger cms_versions_immutable before update or delete on public.cms_versions
  for each row execute function public.v2u_audit_immutable();

-- ── Games ────────────────────────────────────────────────────────────────────
create table public.games (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique check (game_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(game_id) <= 80),
  name text not null check (length(btrim(name)) > 0 and length(name) <= 200),
  description text not null default '' check (length(description) <= 2000),
  subjects text[] not null default '{}',
  skill_ids text[] not null default '{}',
  game_version text not null default '0.1.0' check (length(game_version) <= 40),
  game_content_contract_version text not null default '1.1' check (game_content_contract_version = '1.1'),
  game_evidence_contract_version text not null default '1.1' check (game_evidence_contract_version = '1.1'),
  launch_type text not null default 'none' check (launch_type in ('iframe', 'external', 'none')),
  launch_path text not null default '' check (launch_path = '' or launch_path ~ '^/[A-Za-z0-9._/-]*$' or public.v2u_https_url(launch_path)),
  thumbnail_url text not null default '' check (thumbnail_url = '' or thumbnail_url ~ '^/[A-Za-z0-9._/-]*$' or public.v2u_https_url(thumbnail_url)),
  status public.game_status not null default 'DRAFT',
  enabled boolean not null default false,
  published boolean not null default false,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_game_assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null check (public.v2u_lesson_id(lesson_id)),
  game_id text not null references public.games (game_id),
  position text not null default 'after-guided-practice' check (position in ('after-guided-practice', 'after-summary')),
  display_title text not null default '' check (length(display_title) <= 200),
  description text not null default '' check (length(description) <= 1000),
  sort_order integer not null default 0 check (sort_order >= 0),
  optional boolean not null default true check (optional), -- games are never required in V2U
  visible boolean not null default false,
  attached boolean not null default true,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, game_id)
);

-- ── Triggers: new users, client-write guards, audit ──────────────────────────
-- Every new auth user gets a STUDENT profile. OAuth metadata only fills display fields.
create function public.v2u_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  av text := new.raw_user_meta_data ->> 'avatar_url';
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)), 200),
    case when public.v2u_https_url(av) then av end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.v2u_handle_new_user();

create function public.v2u_profiles_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if public.v2u_is_client() and (new.id, new.role, new.status, new.email, new.created_at, new.learner_data_location)
       is distinct from (old.id, old.role, old.status, old.email, old.created_at, old.learner_data_location) then
    raise exception 'role, status and identity fields cannot be changed directly' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.v2u_profiles_guard();

-- Content tables: clients edit content only. Workflow/verification columns are managed by RPCs.
create function public.v2u_content_guard() returns trigger language plpgsql set search_path = '' as $$
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
  -- editing approved/published/rejected content makes a new draft (published copy stays live)
  if (n - wf) is distinct from (o - wf) and o ->> 'state' in ('APPROVED', 'PUBLISHED', 'REJECTED') then
    patch := patch || jsonb_build_object('state', 'DRAFT');
  end if;
  return jsonb_populate_record(new, patch);
end $$;
create trigger videos_guard before insert or update on public.videos for each row execute function public.v2u_content_guard();
create trigger resources_guard before insert or update on public.resources for each row execute function public.v2u_content_guard();
create trigger content_overrides_guard before insert or update on public.content_overrides for each row execute function public.v2u_content_guard();

create function public.v2u_game_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if public.v2u_is_client() then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.created_at := now();
    elsif (new.id, new.game_id, new.created_by, new.created_at) is distinct from (old.id, old.game_id, old.created_by, old.created_at) then
      raise exception 'game_id and creation fields cannot change' using errcode = '42501';
    end if;
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger games_guard before insert or update on public.games for each row execute function public.v2u_game_guard();

create function public.v2u_assignment_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if public.v2u_is_client() then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.created_at := now();
    elsif (new.id, new.lesson_id, new.game_id, new.created_by, new.created_at) is distinct from (old.id, old.lesson_id, old.game_id, old.created_by, old.created_at) then
      raise exception 'lesson/game of an assignment cannot change — detach and attach instead' using errcode = '42501';
    end if;
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger assignments_guard before insert or update on public.lesson_game_assignments for each row execute function public.v2u_assignment_guard();

-- Audit of direct (RLS-checked) writes. RPCs log their own, more specific events.
create function public.v2u_audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
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
create trigger videos_audit after insert or update on public.videos for each row execute function public.v2u_audit_row();
create trigger resources_audit after insert or update on public.resources for each row execute function public.v2u_audit_row();
create trigger content_overrides_audit after insert or update on public.content_overrides for each row execute function public.v2u_audit_row();
create trigger games_audit after insert or update on public.games for each row execute function public.v2u_audit_row();
create trigger assignments_audit after insert or update on public.lesson_game_assignments for each row execute function public.v2u_audit_row();

-- ── Secure RPCs ──────────────────────────────────────────────────────────────
create function public.v2u_content_table(p_kind text) returns text language sql immutable set search_path = '' as $$
  select case p_kind when 'video' then 'videos' when 'resource' then 'resources' when 'contentOverride' then 'content_overrides' end
$$;

create function public.v2u_require(perm text) returns void language plpgsql stable set search_path = '' as $$
begin
  if not public.v2u_can(perm) then
    raise exception 'permission denied: %', perm using errcode = '42501';
  end if;
end $$;

-- Workflow: submit | approve | reject | reopen | publish | unpublish | archive
create function public.cms_transition(p_kind text, p_id uuid, p_transition text, p_note text default null)
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
      nxt := 'APPROVED'; act := 'CONTENT_UNPUBLISHED';
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

-- Explicit source verification by a reviewer (entering a URL never verifies it).
create function public.cms_verify_source(p_kind text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := case p_kind when 'video' then 'videos' when 'resource' then 'resources' end;
  before text;
begin
  if tbl is null then raise exception 'only videos and resources are verified' using errcode = '22023'; end if;
  perform set_config('v2u.in_rpc', 'on', true);
  perform public.v2u_require('content.verifySource');
  execute format('select verification_status::text from public.%I where id = $1 for update', tbl) into before using p_id;
  if before is null then raise exception 'not found' using errcode = 'P0002'; end if;
  execute format($f$update public.%I set verification_status = 'VERIFIED', verified_by = $2, verified_at = now(),
      state = case when state = 'PUBLISHED' then 'DRAFT'::public.content_state else state end, updated_by = $2, updated_at = now()
    where id = $1$f$, tbl) using p_id, auth.uid();
  perform public.v2u_audit(case when p_kind = 'video' then 'VIDEO_VERIFIED' else 'RESOURCE_VERIFIED' end::public.audit_action, p_kind, p_id::text, before, 'VERIFIED');
end $$;

-- Role administration. Only SUPER_ADMIN touches ADMIN/SUPER_ADMIN; nobody changes themselves;
-- there is always at least one SUPER_ADMIN.
create function public.set_user_role(target_user_id uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.app_role;
  supers integer;
begin
  perform set_config('v2u.in_rpc', 'on', true);
  perform public.v2u_require('users.manageRoles');
  if target_user_id = auth.uid() then raise exception 'you cannot change your own role' using errcode = '42501'; end if;
  perform 1 from public.profiles where role = 'SUPER_ADMIN' for update;
  select role into cur from public.profiles where id = target_user_id for update;
  if cur is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if (cur in ('ADMIN', 'SUPER_ADMIN') or new_role in ('ADMIN', 'SUPER_ADMIN')) and not public.v2u_can('users.manageAdmins') then
    raise exception 'only SUPER_ADMIN can grant or remove admin roles' using errcode = '42501';
  end if;
  select count(*) into supers from public.profiles where role = 'SUPER_ADMIN';
  if cur = 'SUPER_ADMIN' and new_role <> 'SUPER_ADMIN' and supers <= 1 then
    raise exception 'at least one SUPER_ADMIN is required' using errcode = '42501';
  end if;
  if cur = new_role then return; end if;
  update public.profiles set role = new_role where id = target_user_id;
  perform public.v2u_audit('ROLE_CHANGED', 'user', target_user_id::text, cur::text, new_role::text);
end $$;

create function public.set_user_status(target_user_id uuid, new_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.profiles;
  active_supers integer;
begin
  perform set_config('v2u.in_rpc', 'on', true);
  perform public.v2u_require('users.setStatus');
  if target_user_id = auth.uid() then raise exception 'you cannot change your own status' using errcode = '42501'; end if;
  perform 1 from public.profiles where role = 'SUPER_ADMIN' for update;
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

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.resources enable row level security;
alter table public.content_overrides enable row level security;
alter table public.cms_published enable row level security;
alter table public.cms_versions enable row level security;
alter table public.games enable row level security;
alter table public.lesson_game_assignments enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: own row, or users.view. Own update limited to display columns (column grants below).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.v2u_can('users.view'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and status = 'ACTIVE') with check (id = auth.uid());

-- content working copies: staff read; drafters write (workflow columns guarded by trigger)
create policy videos_select on public.videos for select to authenticated using (public.v2u_can('admin.access'));
create policy videos_insert on public.videos for insert to authenticated with check (public.v2u_can('content.draft'));
create policy videos_update on public.videos for update to authenticated using (public.v2u_can('content.draft')) with check (public.v2u_can('content.draft'));
create policy resources_select on public.resources for select to authenticated using (public.v2u_can('admin.access'));
create policy resources_insert on public.resources for insert to authenticated with check (public.v2u_can('content.draft'));
create policy resources_update on public.resources for update to authenticated using (public.v2u_can('content.draft')) with check (public.v2u_can('content.draft'));
create policy overrides_select on public.content_overrides for select to authenticated using (public.v2u_can('admin.access'));
create policy overrides_insert on public.content_overrides for insert to authenticated with check (public.v2u_can('content.draft'));
create policy overrides_update on public.content_overrides for update to authenticated using (public.v2u_can('content.draft')) with check (public.v2u_can('content.draft'));

-- learners (including guests) read only learner-visible published snapshots; writes only via cms_transition
create policy published_learner_select on public.cms_published for select to anon, authenticated
  using (learner_visible or public.v2u_can('admin.access'));
create policy versions_select on public.cms_versions for select to authenticated using (public.v2u_can('admin.access'));

-- games: public sees published games; game managers write
create policy games_select on public.games for select to anon, authenticated using (published or public.v2u_can('admin.access'));
create policy games_insert on public.games for insert to authenticated with check (public.v2u_can('game.manage'));
create policy games_update on public.games for update to authenticated using (public.v2u_can('game.manage')) with check (public.v2u_can('game.manage'));
create policy assignments_select on public.lesson_game_assignments for select to anon, authenticated
  using ((attached and visible) or public.v2u_can('admin.access'));
create policy assignments_insert on public.lesson_game_assignments for insert to authenticated with check (public.v2u_can('game.assign'));
create policy assignments_update on public.lesson_game_assignments for update to authenticated using (public.v2u_can('game.assign')) with check (public.v2u_can('game.assign'));

create policy audit_select on public.audit_logs for select to authenticated using (public.v2u_can('audit.view'));
-- no insert/update/delete policies anywhere: deletes are impossible; audit/published/versions writes only via definer functions

-- ── Privileges (fail closed: revoke Supabase's broad defaults, grant back the minimum) ─
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, last_login_at, onboarding_completed) on public.profiles to authenticated;
grant select, insert, update on public.videos, public.resources, public.content_overrides to authenticated;
grant select on public.cms_published to anon, authenticated;
grant select on public.cms_versions to authenticated;
grant select on public.games, public.lesson_game_assignments to anon;
grant select, insert, update on public.games, public.lesson_game_assignments to authenticated;
grant select on public.audit_logs to authenticated;

-- helpers used inside policies / guard triggers (all side-effect free)
grant execute on function public.v2u_role_can(public.app_role, text), public.v2u_current_role(), public.v2u_can(text),
  public.v2u_is_client(), public.v2u_https_url(text), public.v2u_lesson_id(text) to anon, authenticated;
-- RPCs callable by signed-in users (each checks permissions itself)
grant execute on function public.cms_transition(text, uuid, text, text), public.cms_verify_source(text, uuid),
  public.set_user_role(uuid, public.app_role), public.set_user_status(uuid, public.account_status) to authenticated;
-- v2u_audit, v2u_content_table, v2u_require, v2u_redact and trigger functions are NOT granted to clients.
