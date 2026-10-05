# T004 local security validation — 2026-10-05

Status: **PASS / complete local validation**. The required commands were
reproduced on this Windows machine. This report supersedes the earlier partial
29/29 SQL-only run and child-process restrictions.

| Check | Actual result |
|---|---|
| `npm run test:rls`, both required flags enabled | Exit 0; **36/36 groups passed**, 0 failed, 0 skipped; `RLS RESULT: PASS`. All original 34 groups executed, plus two populated-legacy migration groups. |
| REST/client portion | **5/5 groups passed** through supabase-js → local HTTP `/rest/v1` proxy → PostgREST → PostgreSQL. The remaining 31 groups use direct PostgreSQL connections, including real role/claim simulation and migration tests. |
| PostgreSQL | **16.15**, disposable local cluster, TCP on 127.0.0.1. |
| PostgREST | **16.4**, verified using the executable's `--version`. |
| `npm test` | Exit 0; **56/56 test suites passed**, 0 failed. |
| `npm run build` | Exit 0; TypeScript, Vite production build and PWA generation completed. |
| `npm run lint -- --format json` | Exit 1 from existing debt: **10 errors, 176 warnings**. Exact comparison with `.aiteam/lint-baseline.json` by file, severity, rule, message and multiplicity: 0 added, 0 removed. |
| `node --check scripts/test-supabase-rls.mjs`; `git diff --check` | Passed. |

## Reproduction on Windows

Run from the repository root in PowerShell:

```powershell
$env:PG_BIN = 'C:\Program Files\PostgreSQL\16\bin'
$env:POSTGREST_BIN = 'C:\Tools\PostgREST\postgrest.exe'
$env:PATH = "$env:PG_BIN;$env:PATH"
$env:V2U_RLS_REQUIRED = '1'
$env:V2U_RLS_E2E_REQUIRED = '1'
npm run test:rls
npm test
npm run build
npm run lint -- --format json
```

The first RLS attempt passed 31 SQL/migration groups but stopped before REST
because PostgREST exited with Windows status 3221225781 (missing runtime DLL).
Adding the PostgreSQL binary directory to the process PATH supplied its runtime
libraries. The subsequent standard command executed all 36 groups and passed;
the initial attempt is not counted as a full pass. No system PATH change or
software installation was needed.

The runner initializes its own throwaway cluster, applies the Supabase test
shim and real migrations, starts PostgREST with an ephemeral JWT secret, then
shuts down the services and removes the cluster. It never uses application
Supabase credentials or a configured remote project. No modified copy of the
runner or manually managed database was used for the passing run.

## Review findings and populated-state proof

**M1 — verified and fixed.** The contributors backfill previously invoked the
row audit trigger without an internal-operation flag. It now sets the existing
transaction-local `v2u.in_rpc` flag to `on` for the backfill and returns it to
`off` immediately afterward. Global auditing stays enabled.

The populated-legacy regression applies the two old migrations in a separate
database, creates content through authenticated users, and records creator,
intermediate editor and last editor audit identities. After the forward
migration, it checks that all three contributors were recovered, the content
row count is unchanged, the entire audit table is identical to its
pre-migration state, and there are zero NULL-actor rows. A subsequent normal
edit records CONTENT_UPDATED with the actual actor, proving auditing resumes.

**M2 — verified and fixed; fail-closed strategy.** Migration preflight locks
the snapshot/history tables against concurrent writes and rejects any live
version less than or equal to that entity's highest historical version. It
raises SQLSTATE 23514 with the kind, entity ID, live/history numbers and an
explicit-owner-repair diagnostic. The migration does not renumber or remove
history. Archiving now uses a plain INSERT; a duplicate version raises 23505
and rolls back the transition rather than silently losing a snapshot.

The legacy regression starts with a distinct historical snapshot at version 3
and a live snapshot at version 3, then also tests live version 2. Both migration
attempts fail with the expected diagnostic; live/history/audit rows remain
identical and the contributors column is not installed. An explicit fixture
repair places the live snapshot at version 4 without changing the historical
snapshot. The migration then succeeds; unpublish/republish cycles produce
live versions 5 and 6 with historical versions 3, 4 and 5. The original
historical and live payloads survive exactly. A deliberately injected later
archive collision rejects the RPC, preserving the live snapshot and audit
count. **No snapshot loss was observed.** Fixture repair happens only in the
disposable test database; no user database was repaired.

**M3 — reproduced and documented.** All original 34 groups ran, including the
REST metadata-spoofing/self-role PATCH group and four real application-client
groups. The two additional migration groups explain the new 36/36 total.

**L2 — improved.** The promoted editor is explicitly neither creator nor last
editor, but is present in contributors; promotion to REVIEWER does not allow
self-approval.

**L3 — added.** Independent approval clears contributors. A former intermediate
ADMIN contributor can approve a later cycle in which only the creator edits;
the ADMIN is neither creator, last editor nor a contributor in that cycle.

The six-role operation matrix, suspended/anon checks, role escalation and JWT
spoofing defenses, reviewer separation, IN_REVIEW edit reset, unpublish rules,
last-active-owner and concurrent-admin protections, learner/game restrictions,
audit/history immutability, SECURITY DEFINER search_path checks and future-object
fail-closed privileges all passed. No security regression was observed and no
HIGH/CRITICAL finding remains in the requested scope.

The original two migrations are unchanged. Existing T004 memory-backend and
workflow fixes are included in this checkpoint and covered by application
tests. Memory read-permission architecture, approval-button UX, global audit
TRUNCATE semantics, unrelated lint debt, Google OAuth work and the next
checkpoint remain deferred. No browser QA result is claimed.

Final scope review covers only the seven T004 source/test/migration/documentation
files; no secrets, `.env` files, generated build output or unrelated files are
included. Local validation does not authorize applying the migration to a
configured Supabase project. **No push, deployment or `supabase db push` was
performed.**
