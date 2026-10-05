# Phase 72B security audit — T003

Reviewed against `26e615b` on 2026-10-05. Repository branch is `master`, remote is
`origin` at the expected V2U repository, and the initial working tree had no changes.
The original `20261004000000_v2u_admin.sql` remains unchanged. Hardening is in
`20261005000000_v2u_security_hardening.sql`, applied after the original migration.
No production database was contacted and no Git commit/push was performed.

## Reconciliation

The existing implementation already uses Supabase Auth, Google OAuth redirects,
PostgreSQL and RLS. `src/backend/index.ts` selects Supabase or an explicitly enabled
development-only memory backend. There is no Firebase reference in `src/`,
`package.json` or `.env.example`. Auth roles come from stored profiles, not OAuth
metadata. Admin uses `CmsService` and the existing backend interface; learner
state remains local and is outside the database schema. Google provider and
redirect configuration remain owner-managed; real OAuth readiness was not tested
in this security task. Setup instructions and both Phase 72 test suites were read.

## Priority 2 verdicts

| Item | Repository evidence and verdict |
| --- | --- |
| RLS and six-role enforcement | All nine application tables enable RLS in the original migration. `v2u_role_can` defines the permission matrix; `v2u_current_role` only returns an ACTIVE profile's role; `v2u_can` coalesces missing rights to false. Existing RLS tests compare every role/permission pair. Static review passes; database execution remains blocked below. |
| Client role spoofing | `v2u_handle_new_user` copies only display fields from OAuth metadata and defaults role/status to STUDENT/ACTIVE. `v2u_profiles_guard` rejects protected-field changes; profile UPDATE grants only cover display/login/onboarding columns. No client role/status INSERT or UPDATE grant. Existing SQL and memory tests exercise spoofing. No change needed. |
| Self-role escalation | `set_user_role` checks `users.manageRoles`, rejects self-targeting, and requires `users.manageAdmins` to grant or remove ADMIN/SUPER_ADMIN. Only stored ACTIVE roles authorize it. No change needed to these checks. |
| Last ACTIVE SUPER_ADMIN | Confirmed gap: the old role RPC counted inactive SUPER_ADMINs. The forward migration counts ACTIVE profiles and checks target status. Both role/status RPCs lock SUPER_ADMIN rows in UUID order before checking caller rights again, preventing a queued suspended/demoted caller from continuing with stale authorization. Regression tests cover both lock order races and inactive backups. |
| First SUPER_ADMIN bootstrap | No client bootstrap RPC exists; only the project owner can run the documented profile update. The new migration introduces no bootstrap surface. Operational procedure verification remains T005. Browser users cannot invoke the owner path. |
| Publishing permission | `cms_transition` validates each transition's permission, whitelists table names, locks working content, and enforces independent approval for controlled content. Confirmed bypass: unpublish used to set every working copy to APPROVED. It now changes only PUBLISHED to APPROVED and otherwise preserves state. Editing IN_REVIEW now resets to DRAFT, requiring resubmission. Memory workflow and Admin role counts mirror these changes. |
| Audit integrity and forgery | Clients have SELECT only on `audit_logs` and `cms_versions`; neither has client write policies. Immutable triggers reject UPDATE/DELETE even for the owner. `v2u_audit` and audit trigger helpers are not client-executable. Forward migration explicitly revokes INSERT/UPDATE/DELETE again. Added SQL tests require 42501 for every client mutation, including SUPER_ADMIN. |
| Unauthorized Admin access | `src/admin/AdminApp.tsx` gates with `admin.access`; database working-copy SELECT policies independently require staff rights. Students/suspended users get no privileged rows, and mutation RPCs reject missing rights. UI checks remain convenience only. |
| Guest/public reads | `cms_published` exposes only learner-visible snapshots and `games` exposes only published rows (staff may read others). Confirmed assignment leak: attached/visible rows could reference unpublished games. Assignment SELECT now also requires a published game. Staff access is preserved. Both memory and Supabase learner filters require published games, including for staff viewing learner content; a failed game lookup rejects the request. |
| DELETE and fail-closed behavior | No client DELETE/TRUNCATE grants or DELETE policies exist. Detachment, archival and unpublishing use existing reversible operations. Each mutation SECURITY DEFINER RPC validates permissions and pins an empty search path. Side-effecting helpers remain inaccessible; the public role helper deliberately reads only the caller's role for RLS. Suspended accounts may read their own profile and public learner content, but receive no staff privileges. |

## Validation and limits

- `node scripts/test-phase-72.js`: **21/21 passed**, including new memory/workflow regressions and Supabase client learner filtering with a mocked HTTP response (not database validation).
- `node scripts/test-nextstep-core-loop.js`: **22/22 passed**.
- `node scripts/test-phase-71.js`: **8 passed, 1 failed**; contracts, evidence interpretation and learner-state preservation assertions passed, but deterministic export subprocess launch returned EPERM. `node scripts/test-phase-70.js` failed during Python subprocess discovery, before assertions.
- `node node_modules/typescript/bin/tsc -b`: **passed** after the final source changes.
- `npm run lint`: baseline **10 errors, 176 warnings**; identical diagnostics after changes, **zero new regressions** (compared with line numbers normalized).
- `git diff --check`: passed. Original migration has no diff. Function bodies were copied from that migration and reviewed for targeted changes only.
- `npm run test:rls`: **blocked before migrations/assertions**. Windows `pg_ctl` failed to create a restricted token (error 87) and start the server (error 3) in the managed sandbox. New SQL/concurrency assertions have not run; this is not a database security PASS.
- `npm test`: failed to launch all 56 test subprocesses because the sandbox rejects nested `cmd.exe` with EPERM. No test assertion results were produced by that command.
- `node scripts/test-phase-72b.js`: **15 passed, 2 failed** due to sandbox subprocess restrictions (harness spawn and Python discovery). No test was skipped or weakened.
- `npm run build`: TypeScript stage passed; Vite failed loading its config because its nested real-path subprocess returned EPERM. Production bundling and browser QA remain unverified.

The Manager should run the unchanged validation commands outside this restricted
sandbox, with PostgreSQL and PostgREST available, before accepting the checkpoint.
Require both `V2U_RLS_REQUIRED=1` and `V2U_RLS_E2E_REQUIRED=1` for a complete RLS result.

### Review follow-up

All four review findings were confirmed. The concurrency test now observes the
queued connection by PID through a third postgres connection outside the caller
transactions, so restricted `authenticated` statistics visibility cannot hide the
lock wait. The lock-wait assertion remains. It saves both profiles' role/status
before the test and restores those exact values during cleanup. Supabase learner
assignment filtering now matches memory; client regression coverage passes and
the real PostgREST test includes staff learner-view checks.

Validation was retried after these fixes: TypeScript, syntax and diff checks pass;
NextStep remains 22/22, Phase 71 remains 8/9, and Phase 72B remains 15/17 with the
same subprocess blockers. Lint still reports 10 errors and 176 warnings; the eight
changed source/test files have only the pre-existing unused `execFileSync` import
warning, confirmed in HEAD. No new lint regression was found. The required RLS
run (both required flags enabled) still exits before migrations on pg_ctl error
87/3. `npm test` still cannot launch its 56 subprocesses; the build still fails
at Vite configuration loading with EPERM after TypeScript succeeds. Database and
PostgREST security evidence, production bundling and browser QA remain blocked
or unverified. T003 is not a validated checkpoint yet.

### Validation failure follow-up

The Manager supplied a PostgreSQL run with 19/20 SQL tests passing and PostgREST
unavailable. The failing client-mutation test used `UPDATE id = id` on both
tables' `GENERATED ALWAYS AS IDENTITY` columns. PostgreSQL rejects that statement
before checking privileges, so it cannot test the expected authorization error.
The test now updates `audit_logs.entity_id` or `cms_versions.data` to itself,
preserving every caller/operation case and the strict `42501` assertion. Assertion
failures identify the caller and statement. No database permission was changed.

After this correction, local Phase 72 remains **21/21**, NextStep **22/22**, and
TypeScript and script syntax checks pass. Phase 72B remains **15/17** and Phase 71
**8/9** with subprocess restrictions. The required RLS command still fails at
`pg_ctl` restricted-token error 87 before any assertion; `npm test` cannot launch
its 56 subprocesses, and the build fails at Vite configuration loading with EPERM.
The changed files have only the existing unused-import lint warning. The corrected
SQL test still needs a fresh Manager run with PostgREST; the supplied earlier run
does not establish a complete PASS. Browser QA remains unverified.

Existing limitation: `audit_logs.actor_id` uses ON DELETE SET NULL, but immutable
audit rows reject that update. Removing an auth user referenced by the audit log
therefore fails. This audit-preservation behavior was not changed; no user data
was deleted. Controlled approval checks creator and latest editor; it does not
maintain a complete list of intermediate editors. No learner engine or contract
was modified.
