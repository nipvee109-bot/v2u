# V2U accounts, admin CMS and RBAC on Supabase (Phase 72B)

V2U uses **Supabase Auth (Google OAuth) + PostgreSQL with Row Level Security**.
Firebase was never deployed and has been removed.

Learning without an account (guest mode) works exactly as before.

**REAL GOOGLE OAUTH: VERIFIED LOCALLY (T006, 2026-10-05)** against Supabase
project `rnerufxwzfhugurlfhce` from `http://localhost:5173`. Production is not
configured or deployed; physical mobile devices were not tested. See
[Real Google OAuth validation (T006)](#real-google-oauth-validation-t006).

## Architecture

```
React UI (/admin, ฉัน account card)
  → CmsService            src/cms/service.ts           UX checks + Thai errors
  → CmsBackend interface  src/backend/types.ts
  → Supabase repository   src/backend/supabase.ts      supabase-js, lazy-loaded
                          src/backend/supabaseMap.ts   row ⇄ model mapping
  → PostgREST → PostgreSQL                             supabase/migrations
```

The database is authoritative. The browser's `can(user, permission)` in `src/auth/permissions.ts` only shapes the UI.

| Layer | What it does |
|---|---|
| RLS on every table | Default privileges are revoked and only the minimum is granted back. |
| Guard triggers | Clients edit content columns only. Workflow, verification, creator and timestamp columns are set by the database. |
| `SECURITY DEFINER` RPCs | All use `search_path = ''`. They are `cms_transition`, `cms_verify_source`, `set_user_role` and `set_user_status`. |
| Audit log | Written by the database (triggers and RPCs). Append-only for everyone. |

`src/backend/memory.ts` is a DEVELOPMENT/TEST ONLY mirror of these rules.

## Tables (`supabase/migrations/20261004000000_v2u_admin.sql`)

| Table | Purpose | Learner/guest read |
|---|---|---|
| `profiles` | App profile, one per `auth.users` row. Role and status live here, never in OAuth metadata. | Own row only |
| `videos` | Working copies plus workflow state | none (staff only) |
| `resources` | Working copies plus workflow state | none |
| `content_overrides` | Reviewed text overrides: summary, analogy, whyItMatters only | none |
| `cms_published` | Immutable learner snapshot per item, written only by `cms_transition` | `learner_visible = true` |
| `cms_versions` | Previous snapshots, for recovery. Append-only. | none |
| `games` | Game registry. Contract columns must be `1.1`. | `published = true` |
| `lesson_game_assignments` | Lesson ↔ game. `optional` is always true; unique per (lesson, game). | `attached and visible` with a published game |
| `audit_logs` | `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, before and after summaries. Tokens are redacted. | none (ADMIN+) |

### Why there is no `publishing_records` table

- Publish history is already covered: `cms_versions` keeps every replaced snapshot and `audit_logs` records who did each transition.
- Reviewer identity (`approved_by`, `reviewed_by`) is stored on the content row.

### Lesson IDs

- Lesson IDs are validated by format in SQL, and against the curriculum in the service.
- The curriculum itself stays in `src/content` and is not copied into PostgreSQL.

### Learner state stays out of the database

These are never stored in these tables:
- mastery;
- diagnostics;
- evidence;
- the review schedule;
- next step;
- learner history.

They stay on the learner's device. Cloud sync is a later phase; `src/cms/migration.ts` is a non-destructive plan for it.

## Roles and permissions

There are six roles: STUDENT, CONTENT_EDITOR, GAME_EDITOR, REVIEWER, ADMIN and SUPER_ADMIN.

- The SQL function `v2u_role_can` mirrors `ROLE_PERMISSIONS` exactly. `npm run test:rls` checks every role × permission pair.
- Staff rights require `status = 'ACTIVE'`. A suspended or disabled user keeps a valid session but has no rights.

**Role changes** go only through `set_user_role(target_user_id, new_role)`:
- the caller needs `users.manageRoles`;
- only SUPER_ADMIN can grant or remove ADMIN or SUPER_ADMIN;
- nobody can change their own role;
- the last **active** SUPER_ADMIN cannot be demoted; inactive SUPER_ADMINs do not count as backups.

**Status changes** go only through `set_user_status`:
- the same rules apply;
- the last *active* SUPER_ADMIN cannot be suspended.

A direct `update profiles set role = …` from the browser fails twice over: there is no column privilege, and a guard trigger rejects it.

## Content workflow

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
            ↘ REJECTED → reopen → DRAFT;   archive ↔ reopen
```

**Safe operational content** (videos, resources):
- A reviewer can publish it directly.
- Learners only see items that are VISIBLE, VERIFIED and https.
- VERIFIED is set only by `cms_verify_source`, which records `verified_by` and `verified_at`. Inserting a URL never verifies it.
- Changing the URL of a verified item resets it to VERIFICATION_PENDING.

**Controlled content** (`content_overrides`):
- It must be APPROVED by someone who neither created nor last edited it, and who made no edits since the last approval. Intermediate edits cannot hide a contributor's identity.
- The database maintains a protected `contributors` array, clears it on independent approval, and excludes it from learner snapshots. Archive/reopen and unpublish do not clear it. The forward migration recovers existing contributors from creator/editor fields and database-written audit actor IDs since the last approval.
- The approver is recorded in `approved_by`.

**General rules:**
- Editing in-review, approved, published or rejected content turns it back into a DRAFT. The live snapshot stays until it is re-published.
- Unpublishing an unchanged PUBLISHED copy restores APPROVED. Otherwise it preserves the working state, so withdrawing an older snapshot never approves new edits.
- Role/status RPCs lock SUPER_ADMIN rows in UUID order before checking the caller again; suspended or demoted callers waiting on another change lose their rights.
- Every publish increments the highest live, working-copy or historical version and moves the old snapshot to `cms_versions`. Unpublish/republish preserves the version sequence and `previous_version` chain.
- The forward migration aborts with an explicit owner-repair diagnostic if any live version is less than or equal to its highest stored historical version. It does not renumber legacy history. Duplicate archive versions fail the transition instead of silently dropping the live snapshot. Contributor backfill uses the transaction-local internal-operation flag to avoid fake user audit rows.

### Concurrent edits and learner snapshots (T007D)

`20261006000000_v2u_cms_revisions.sql` (local; apply only after owner review, see below):

- **Optimistic concurrency.** `videos`, `resources`, `content_overrides` and `games` carry a `revision` (starts at 1). A client UPDATE must write exactly `old.revision + 1`. An edit made from an older copy (another admin saved first, or the same admin in a stale tab) is refused with SQLSTATE `PT409` (HTTP 409) and nothing is overwritten. Workflow RPCs and owner writes advance the revision too. Inserts always start at 1. Lesson-game assignments are not revisioned (toggle/upsert only).
- **Stale workflow actions.** `cms_transition(…, p_expected_revision)` and `cms_verify_source(…, p_expected_revision)` refuse to act on a copy older than the row (e.g. approving text the reviewer has not seen, or verifying a link an editor changed meanwhile). The admin app always sends it; omitting it keeps the previous behaviour. Self-approval rules are unchanged and still apply with a correct revision.
- **Learner snapshots.** `cms_published.data` no longer contains `reason`, `verified_by`, `verified_at` or `revision` (in addition to the workflow fields already removed). Visibility is still computed from the full source row at publish time; staff keep the metadata on the source rows. The migration strips these keys from existing live snapshots; `cms_versions` history is untouched.
- **Admin UI.** A refused edit shows “ข้อมูลนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก” with **โหลดข้อมูลล่าสุด**; an open edit form then flags the newer copy and offers **เริ่มแก้จากฉบับล่าสุด** (the user's own text stays in the form until they choose).

**Apply order.** The app code that sends `revision` / `p_expected_revision` requires this migration: apply the migration to a project before pointing this build at it, otherwise CMS edits and transitions fail. Use `supabase db push --dry-run` first, as for the initial migrations. Rollback notes are in the migration header.

### Future-object privileges

`20261005010000_v2u_review_history_privileges.sql` revokes the broad default grants for future `postgres`-owned tables, sequences and functions in `public`. The first migration's privilege block revokes existing-object grants only; its header's reference to default privileges should not be read as protecting future objects.

PostgreSQL's global PUBLIC function EXECUTE default is also revoked for objects created by `postgres` (across schemas); a schema-specific revoke alone cannot remove it. Future migrations must grant API access explicitly and enable suitable RLS for exposed tables. Existing explicit grants and service-role grants remain intact. Objects created by `supabase_admin` or another owner, including dashboard-created objects under those roles, are not covered and need a separate privilege review.

These defaults affect future objects beyond V2U in a shared database. Applying this migration to a configured Supabase project requires owner approval; local throwaway test application does not authorize `supabase db push` or production changes.

## Games

The CMS registers, enables or disables, publishes or hides, and assigns games. **It does not build them.**

A learner can launch a game only when both of these are true:
1. The CMS says AVAILABLE, enabled and published.
2. The code registry `src/learning/games/registry.ts` says AVAILABLE.

GameContent always comes from the V2U adapter. Pixel Code Battle is unchanged and still PREPARING.

## Setup (owner)

1. **Create a project.** In supabase.com, choose New project. Pick a region close to the learners, and keep the database password in your password manager. Never commit it.
2. **Project URL.** Find it under Project Settings → API (`https://<ref>.supabase.co`).
3. **Anon key.** Copy the anon / publishable key from Project Settings → API. **Never** use the `service_role` or `sb_secret_…` key in V2U: the build and runtime refuse it, and it bypasses RLS. The build guard checks all exposed `VITE_*` values, including unused key variables, and reports only the unsafe variable name.
4. **Google OAuth client.** In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID of type *Web application*.
   - Authorized JavaScript origins: `http://localhost:5173` for local development, plus `https://<prod-origin>` later.
   - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
5. **Google provider in Supabase.** In Authentication → Sign In / Providers → Google, enable it and paste the client ID and client secret. The secret stays in Supabase and is never placed in this repository.
6. **Redirect URLs.** In Authentication → URL Configuration:
   - Site URL: `http://localhost:5173` for now.
   - Additional redirect URLs: `http://localhost:5173/**`.
   - When production is approved, set Site URL to `https://<prod-origin>` and add only the intended application redirect paths to the allowlist (production placeholder: `https://<prod-origin>/**`). Replace the placeholder with the owned origin; do not use unrestricted host wildcards.
7. **Local environment.** Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put the Google client secret in any frontend environment variable; it belongs only in Supabase's Google provider configuration.
8. **Migrations.** Apply them with either:
   - `supabase link --project-ref <ref>` then `supabase db push` (Supabase CLI); or
   - paste `supabase/migrations/*.sql` into the SQL Editor, in filename order.
9. **First SUPER_ADMIN.**
   1. After configuring Google OAuth, sign in once on the site. The database sign-up trigger creates your `profiles` row as STUDENT/ACTIVE. Real Google sign-in readiness is verified separately in T006; the local RLS suite tests the trigger, not Google credentials or redirects.
   2. In Authentication → Users, confirm the intended owner's identity and copy that user's UUID. Confirm the profile exists with `select id, role, status from public.profiles where id = '<your-uuid>';` in the SQL Editor. Do not proceed if no row is returned.
   3. Replace `<your-uuid>` below with that UUID. Run the entire block in the SQL Editor **as the project owner (`postgres`)**, or through an equivalent database-privileged connection. Never put this SQL or database credentials in the browser. There is no client bootstrap/claim RPC.

      <!-- v2u-owner-bootstrap-sql: tested verbatim by test-supabase-rls.mjs -->
      ```sql
      begin;
      -- Serialize bootstrap attempts, including when no SUPER_ADMIN row exists yet.
      lock table public.profiles in exclusive mode;
      update public.profiles
      set role = 'SUPER_ADMIN', status = 'ACTIVE'
      where id = '<your-uuid>'
        and not exists (
          select 1 from public.profiles
          where role = 'SUPER_ADMIN' and status = 'ACTIVE'
        )
      returning id, role, status;
      commit;
      ```

   4. In the SQL Editor result grid, check for exactly one returned row showing the intended UUID with role SUPER_ADMIN and status ACTIVE. No returned rows means an active SUPER_ADMIN already exists, or the UUID has no profile. Query the profiles to distinguish these cases; do not remove the guard to force bootstrap. Repeating this block while an active SUPER_ADMIN exists changes nothing.
   5. Reload `/admin`. From then on, change every role/status from **ผู้ใช้และบทบาท**, which uses the protected, audited RPCs.

### Recovery when no active SUPER_ADMIN remains

Only the project owner may use the same guarded transaction above to restore a verified owner's profile to SUPER_ADMIN/ACTIVE. It also works when an existing SUPER_ADMIN is suspended or disabled. If any active SUPER_ADMIN remains, use **ผู้ใช้และบทบาท** instead; the recovery block deliberately does nothing.

Owner SQL bypasses client RLS, the RPC last-SUPER_ADMIN checks and RPC audit logging. Use it only for bootstrap or recovery, retain an owner operations record of the UUID and reason, and use the application for all subsequent role/status changes. The table lock serializes concurrent bootstrap transactions. Clients have neither this lock privilege nor permission to write role/status, even on a project with no SUPER_ADMIN.

No owner email is stored in code.

## Environment

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Public |
| `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) | browser | Public; RLS protects the data |
| `VITE_V2U_DEV_ADMIN` | `npm run dev` only | DEVELOPMENT ONLY fixture; ignored by production builds |

**Never commit:**
- `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_…` keys;
- the database password;
- the Google OAuth client secret.

`.gitignore` blocks `.env*` (except `.env.example`) and Supabase CLI local state.

### Auth session and recovery (T005)

The configured client uses persistent PKCE sessions. It explicitly exchanges
`?code=` and handles invalid/expired callbacks before restoring the session;
`history.replaceState` removes OAuth code/error parameters while keeping the
application path and unrelated query/hash values. Sign-in redirects to the
current origin/path; URL-supplied redirect targets are not used. See the
[Supabase PKCE documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Profile work is guarded by current UID and generation. Logout, account switches
and disposal invalidate old results, including refresh/retry results and errors.
INITIAL_SESSION and SIGNED_IN can record last_login_at; TOKEN_REFRESHED does
not reload or write the current profile, and unrelated events/retries read only.
Duplicate same-user SIGNED_IN notifications are ignored after the profile loads.

Missing-profile and backend/network profile failures show different Thai errors.
Both Account and Admin error views offer **ลองอีกครั้ง** and **ออกจากระบบ**;
retry uses the session UID even when no profile is loaded. Redirect start shows
**กำลังไปยัง Google…** and disables repeat sign-in clicks. Suspended/disabled
profiles remain readable and cannot access Admin; STUDENT cannot access Admin.

`20261005020000_v2u_existing_auth_profiles.sql` creates profiles for legacy
auth.users that predate the profile trigger. It takes role/status from database
defaults (STUDENT/ACTIVE), ignores privileged OAuth metadata, sanitizes avatars,
and preserves all existing profile rows. It is safe to repeat. Applying it to an
owner project is a separate human operation; T005 applied it only to disposable
local test databases and did not run `supabase db push`.

Sign-in/sign-out do not migrate, clear or overwrite onboarding, diagnostic,
progress, review or learning-evidence data. Cloud learner sync remains deferred.
Local validation evidence and limitations are in `docs/t005-auth-validation.md`.

### Real Google OAuth validation (T006)

Configuration used (no credentials are stored in this repository):

| Setting | Value |
|---|---|
| Supabase project ref | `rnerufxwzfhugurlfhce` |
| Project URL | `https://rnerufxwzfhugurlfhce.supabase.co` |
| Google OAuth callback (Authorized redirect URI) | `https://rnerufxwzfhugurlfhce.supabase.co/auth/v1/callback` |
| Authorized JavaScript origin | `http://localhost:5173` |
| Site URL / redirect allowlist | `http://localhost:5173` / `http://localhost:5173/**` |
| Frontend env (`.env.local`, gitignored) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public `sb_publishable_` key only) |

The callback URL was confirmed from the `redirect_uri` of Google's real sign-in
request. The four migrations were applied by the owner and verified read-only to
match the local files exactly (tables, functions, triggers, policies, grants).

Verified with a real Google account:

- First login created exactly one `auth.users` row and one `profiles` row with
  role/status **STUDENT / ACTIVE**. OAuth metadata contained no role and did not
  escalate privileges; `/admin` shows the access-denied gate.
- Callback leaves no `?code=` or OAuth error parameters in the URL.
- Reload restores the session (`loading` → `signed-in`, no signed-out flash,
  no admin link); a second tab shares the session and follows sign-out.
- Sign-out removes the local session; reload and `/admin` stay signed out.
- Second login reuses the same user/profile/identity, keeps the role, and
  updates `last_login_at`.
- Failed callbacks (provider `access_denied`; invalid/expired `?code=`) show
  Thai messages, clean the OAuth parameters, keep unrelated query/hash values,
  create no session and allow retry.
- Guest learner data (onboarding, profile, lessons, review, evidence) was
  byte-identical before and after login, reload, logout and second login.
- BFCache (T005 M1): Back from Google left the sign-in button usable. The
  in-app test browser reloaded rather than restoring from BFCache; the owner
  checked manually and it did not reproduce.

Open low-priority findings: the OAuth return keeps the path but drops the query
string (`redirectTo` is origin + path); the Email provider is still enabled
although NextStep signs in with Google only; abandoned sign-in attempts leave
PKCE verifier entries in localStorage until the next sign-in/sign-out; physical
mobile devices and a production origin were not tested.

## Development fixture (DEVELOPMENT ONLY)

`VITE_V2U_DEV_ADMIN=1 npm run dev` uses the in-memory mirror.
- It has one fake `@dev.invalid` account per role.
- Choose the role with `localStorage['v2u-dev-as']`.
- The admin header shows a "DEVELOPMENT ONLY" badge.

The fixture is reachable only under `import.meta.env.DEV`, so production bundles do not contain it. `scripts/test-phase-72.js` checks `dist/`.

## Tests

- **`npm test`** includes `test-phase-72.js`:
  - permission matrix and escalation;
  - workflow;
  - learner visibility;
  - game gating;
  - secret and service-key refusal;
  - mapping.
- **`npm run test:rls`** applies the real migration to a throwaway PostgreSQL 16 cluster, using `supabase/tests/supabase-shim.sql` to stand in for Supabase's roles and `auth` schema. It then:
  - acts as anon or authenticated users exactly like PostgREST does;
  - executes the owner bootstrap SQL above directly from this document, checking first bootstrap, missing profiles, repeat attempts, recovery, client denial before/after bootstrap, and an exact allowlist of client-executable public functions;
  - tests all six roles, suspended staff and anon against table reads/writes and each workflow/RPC operation; matrix probes roll back and check database-written audit identity and action;
  - checks forged role claims, future-object default privileges, intermediate-editor self-approval, and history after unpublish/republish;
  - checks T007D concurrency (stale edits refused with PT409, revision +1, stale approve/publish/verify refused, self-approval unaffected), minimal anon/learner snapshots, and the migration on populated legacy data;
  - if a PostgREST binary is available (`POSTGREST_BIN`), runs the app's repository through **supabase-js → PostgREST → PostgreSQL** end to end.
  - It needs PostgreSQL server binaries (`PG_BIN`). Missing dependencies are reported as SKIPPED, PARTIAL or BLOCKED, never as a complete pass.

### Running `test:rls` locally and in CI

The runner creates an isolated, throwaway local cluster; it does not connect to a Supabase project or an existing database.
On Windows it first checks `PG_BIN` for `initdb.exe`, `pg_ctl.exe` and `postgres.exe`, then searches
`Program Files\PostgreSQL\<version>\bin` (newest version first), the x86 and local Programs locations, and Scoop.
If the Program Files environment variables are absent, it checks the standard folders on `SystemDrive` (default `C:`).
Linux checks `/usr/lib/postgresql/<version>/bin`; macOS also checks Homebrew install locations.
An invalid `PG_BIN` produces a warning if automatic discovery finds a fallback. Set `V2U_RLS_PG_AUTODETECT=0`
to use only `PG_BIN` and diagnose a missing or mistyped path.

PowerShell example:

```powershell
$env:PG_BIN = 'C:\Program Files\PostgreSQL\16\bin'
$env:V2U_RLS_REQUIRED = '1'
npm run test:rls
```

- `V2U_RLS_REQUIRED=1` (also `true` or `yes`) requires PostgreSQL; a missing runtime is BLOCKED with exit 2.
- A truthy `CI` also requires PostgreSQL. Explicit `V2U_RLS_REQUIRED=0` overrides that default for optional local checks.
  `CI=0`, `false` or `no` does not enable strict mode.
- `POSTGREST_BIN` points to the PostgREST executable, including `.exe` on Windows. Without it, SQL assertions still run,
  but the final result is PARTIAL and names the skipped client end-to-end section.
- `V2U_RLS_E2E_REQUIRED=1` additionally requires that client section. Missing PostgREST then produces BLOCKED (exit 2),
  after recording the SQL assertion counts. Use both required settings for complete security validation.
- `V2U_RLS_PG_PORT` overrides port 54329; PostgREST and its proxy use the next two ports.
- `V2U_RLS_PG_TRANSPORT=tcp|socket` overrides transport; Windows defaults to localhost TCP, other platforms to a Unix socket.

Exit codes: **0** means a complete PASS, or an explicitly reported non-strict SKIPPED/PARTIAL run;
**1** means failed assertions or a runtime/setup error; **2** means required coverage was blocked by missing dependencies.
Always read the result label as well as the exit code: **SKIPPED and PARTIAL are not a complete pass**.
Startup, migration and assertion errors are never converted into skips. Assertion failures take precedence over missing optional coverage.

## Security review checklist (covered by `test:rls`)

- **Recursive RLS:** avoided. `v2u_current_role()` is SECURITY DEFINER, so policies on `profiles` never re-enter themselves.
- **Public writes:** none. anon has SELECT only, on the learner tables, and nobody has DELETE or TRUNCATE.
- **Over-broad authenticated access:** every policy is tied to a specific permission. Profile self-update is limited by column privileges.
- **SECURITY DEFINER functions:** all pin `search_path = ''` and fully qualify every name. Internal helpers (`v2u_audit`, `v2u_require`, trigger functions) are not executable by clients.
- **Role spoofing:** OAuth metadata only fills `display_name`. Avatars must be https. Roles are never read from JWT or metadata.
- **Mass-assignment and IDOR:**
  - `created_by`, `state`, `verified_by` and similar columns are forced or rejected by triggers;
  - a user can only update their own profile row;
  - an assignment cannot be moved to a different lesson or game.
- **Draft reads:** staff only. Guests get "permission denied" and students get no rows.
- **Audit log:** append-only for everyone, including the owner (enforced by a trigger). Token-like strings are redacted.
- **RPC arguments:** whitelisted. `cms_transition` only accepts known kinds and transitions; dynamic SQL uses `format('%I')` with the whitelisted table name only.
- **Limitations:**
  - PostgreSQL claim simulation does not prove REST behavior. The direct self-role PATCH and forged-metadata supabase-js attacks run only in the PostgREST section; absence of PostgREST always leaves validation PARTIAL (or BLOCKED when required).
  - The `v2u.in_rpc` transaction flag marks RPC-internal writes. PostgREST clients cannot set it, because `set_config` is not exposed through the API.
  - Do not expose `pg_catalog` functions through PostgREST.
