# V2U accounts, admin CMS and RBAC on Supabase (Phase 72B)

V2U uses **Supabase Auth (Google OAuth) + PostgreSQL with Row Level Security**.
Firebase was never deployed and has been removed.

Learning without an account (guest mode) works exactly as before.

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
| `lesson_game_assignments` | Lesson ↔ game. `optional` is always true; unique per (lesson, game). | `attached and visible` |
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
- the last SUPER_ADMIN cannot be removed.

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
- It must be APPROVED by someone who neither created nor last edited it.
- The approver is recorded in `approved_by`.

**General rules:**
- Editing approved, published or rejected content turns it back into a DRAFT. The live snapshot stays until it is re-published.
- Every publish increments the version and moves the old snapshot to `cms_versions`.

## Games

The CMS registers, enables or disables, publishes or hides, and assigns games. **It does not build them.**

A learner can launch a game only when both of these are true:
1. The CMS says AVAILABLE, enabled and published.
2. The code registry `src/learning/games/registry.ts` says AVAILABLE.

GameContent always comes from the V2U adapter. Pixel Code Battle is unchanged and still PREPARING.

## Setup (owner)

1. **Create a project.** In supabase.com, choose New project. Pick a region close to the learners, and keep the database password in your password manager. Never commit it.
2. **Project URL.** Find it under Project Settings → API (`https://<ref>.supabase.co`).
3. **Anon key.** Copy the anon / publishable key from Project Settings → API. **Never** use the `service_role` or `sb_secret_…` key in V2U: the app refuses it, and it bypasses RLS.
4. **Google OAuth client.** In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID of type *Web application*.
   - Authorized JavaScript origins: `http://localhost:5173` for local development, plus the production origin later.
   - Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
5. **Google provider in Supabase.** In Authentication → Sign In / Providers → Google, enable it and paste the client ID and client secret. The secret stays in Supabase and is never placed in this repository.
6. **Redirect URLs.** In Authentication → URL Configuration:
   - Site URL: `http://localhost:5173` for now.
   - Additional redirect URLs: `http://localhost:5173/**`.
   - Add the production URL (e.g. `https://<domain>/**`) when V2U is deployed.
7. **Local environment.** Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
8. **Migrations.** Apply them with either:
   - `supabase link --project-ref <ref>` then `supabase db push` (Supabase CLI); or
   - paste `supabase/migrations/*.sql` into the SQL Editor, in filename order.
9. **First SUPER_ADMIN.**
   1. Sign in once on the site with Google. This creates your `profiles` row as STUDENT.
   2. In Authentication → Users, copy your user UUID.
   3. In the SQL Editor, run this once:
      ```sql
      update public.profiles set role = 'SUPER_ADMIN' where id = '<your-uuid>';
      ```
      This works because the SQL Editor runs as the project owner, not as a browser user.
   4. Reload `/admin`. From then on, change every role from **ผู้ใช้และบทบาท**, which uses the protected RPCs.

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
  - The `v2u.in_rpc` transaction flag marks RPC-internal writes. PostgREST clients cannot set it, because `set_config` is not exposed through the API.
  - Do not expose `pg_catalog` functions through PostgREST.
