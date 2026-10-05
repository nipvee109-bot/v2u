# T005 local auth validation — 2026-10-05

Baseline verified before edits: local Windows repository
`C:\Users\com\.gemini\antigravity\scratch\engineering-study-hub`, branch
`master`, clean HEAD `622ab1481c5bd6dde609ba019e46cabdebd9c8c1`.

**REAL GOOGLE OAUTH: NOT YET VERIFIED / NOT TESTED.** No owner project,
Google credentials or real Google login was used. Simulated callback tests and
local PostgreSQL/PostgREST tests do not prove Google provider readiness.

| Check | Actual result |
|---|---|
| `npm test` | 57 suites, 57 passed, 0 failed; the existing 56 suites plus T005. |
| `node scripts/test-phase-73.js` | 28 behavioral groups passed, 0 failed. |
| Full required `npm run test:rls` | 37 groups, 37 passed, 0 failed, 0 skipped; the locked 36 groups plus profile-backfill regression. |
| REST/client portion | All 5 groups pass through supabase-js → local `/rest/v1` HTTP proxy → PostgREST → PostgreSQL. Other groups use SQL connections and role/claim simulation. |
| Database/runtime | PostgreSQL 16.15; PostgREST 16.4; throwaway local cluster. |
| `npm run build` | PASS: TypeScript, Vite production build and PWA generation. |
| Lint | Existing 10 errors / 176 warnings; zero added or removed findings by file, severity, rule, message and multiplicity. Exit 1 remains historical debt. |
| Browser QA | PASS at 390, 768 and 1440 CSS pixels; details below. |
| Local learner state | Preserved, both live Zustand state and persisted device data. |

## Behavioral and integration evidence

- Vite's configuration validates the resolved mode-specific frontend environment
  plus process environment before browser transformation. Tests execute actual
  failing Vite builds for service-role JWT and sb_secret_* canaries, including an
  unused variable and an isolated `.env.production` file. The variable name is
  reported, the value never appears in output, and no browser output is created.
  Public anon JWT and sb_publishable_* values pass the guard.
- Deferred promises deterministically prove A-after-logout, A-after-B, stale
  profile failures, refresh-after-switch/logout and disposed-controller behavior.
  Auth identity changes are delivered synchronously; profile I/O is deferred
  outside the SDK notification. TOKEN_REFRESHED does not touch the profile.
- Initial/returning/session-restore, guest, logout, missing profile, backend
  failure, retry without a profile, logout from errors, failed logout, duplicate
  redirect attempts and inactive/STUDENT restrictions are covered. A real
  Supabase SDK client also restores an entirely synthetic persisted session and
  emits INITIAL_SESSION across two client instances without network auth. This
  tests restoration plumbing, not Google login or server token verification.
- Cancelled query/hash callbacks, invalid/expired/failed exchanges, successful
  exchange, URL cleanup, preserved paths/query/anchors and unused external
  redirect query values are tested. Failed callback tests leave a null profile
  and signed-out state; Thai messages describe cancellation or expired links.
- The new profile migration is tested against auth.users inserted before the
  original profile table/trigger existed. All three previous migrations then
  run. A preexisting REVIEWER/SUSPENDED profile remains byte-for-byte unchanged;
  two missing profiles receive exactly one STUDENT/ACTIVE row apiece despite
  malicious role/status metadata. HTTPS avatars survive; unsafe avatars do not.
  Repeating the new migration produces the same rows and no duplicates.
- Real learner store fixtures include onboarding/profile, diagnostic, progress,
  review queue and learning-session evidence. Auth restoration, profile retry
  and logout leave both full live state and stored bytes unchanged.

## Browser QA

Run `npm run dev -- --host 127.0.0.1`, then open
`http://127.0.0.1:5173/scripts/fixtures/t005-auth-qa.html`.
This standalone fixture imports the actual AccountCard and AdminApp gate
components and the session controller with simulated backend results. It is
outside the production HTML entry; it contains no real credentials or OAuth
requests. It is not an auth bypass in the application.

At each width (390, 768, 1440), the browser checked guest/unconfigured,
signed-out, loading, missing-profile, backend failure, cancelled callback,
invalid callback, STUDENT, SUSPENDED and DISABLED: 30 state/layout checks, no
horizontal overflow. Retry and logout from errors were exercised in **both**
Account and Admin views at every width. Redirect feedback appeared and sign-in
buttons became disabled. The ordinary application's `/me` guest page was also
checked at all three widths; guest learning remained available. Mobile,
tablet and desktop screenshots were visually inspected.

## Reproduction and scope

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

The owner setup still needs a Supabase project URL and public anon/publishable
key, a Google Web OAuth client, its redirect URI
`https://<ref>.supabase.co/auth/v1/callback`, the Google provider configured in
Supabase, Site URL and an explicit application redirect allowlist. Production
remains the placeholder `https://<prod-origin>`. The Google client secret belongs
only in Supabase provider settings, never in frontend environment variables.
See `docs/supabase-setup.md` for the human steps.

No cloud learner sync, unrelated CMS changes, UX redesign or historical lint
cleanup was performed. Old migrations/commits remain unchanged. No secrets,
`.env` files or generated output are part of this checkpoint. No push,
deployment, remote database mutation or `supabase db push` was performed.
