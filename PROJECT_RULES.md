# V2U — PROJECT RULES

## Repository

Project:
V2U — Vocational to University

Repository root:
C:\Users\com\.gemini\antigravity\scratch\engineering-study-hub

Primary branch:
master

Remote:
origin

Expected remote:
https://github.com/nipvee109-bot/v2u.git

Repository state is authoritative.

Before meaningful work:
- inspect git status
- confirm current branch
- inspect git remote
- inspect recent commits
- read GOAL.md completely
- read PROJECT_RULES.md completely

If repository reality conflicts with old reports or documentation:
- trust the actual repository
- report the mismatch
- do not guess

Keep all changes inside this repository unless explicitly approved.

---

## Current Baseline

Current confirmed baseline at creation of these rules:

f1e4ec2 — Phase 72B:
move accounts and admin backend from Firebase to Supabase

Phase 72B already contains a Supabase migration foundation.

Do NOT recreate the Firebase → Supabase migration from scratch.

First inspect and verify the existing implementation.

---

## Always

- Follow GOAL.md as the product source of truth.
- Inspect existing architecture before changing it.
- Preserve existing user-facing behavior unless the active Goal requires a change.
- Preserve existing learner data.
- Keep guest learning functional.
- Prefer small, reviewable changes.
- Run applicable tests before declaring work complete.
- Run applicable build/type/lint/security checks.
- Inspect git diff before committing.
- Keep documentation consistent with actual implementation.
- Distinguish pre-existing problems from regressions introduced by the current work.
- Fail closed for authentication, authorization and security-sensitive behavior.
- Use actual evidence from the repository; do not invent test results or readiness.

---

## Never

- No production deployment.
- No destructive database migration.
- No deleting user data.
- No resetting production data.
- No committing secrets or credentials.
- No committing `.env` files containing real credentials.
- No service-role key in frontend code.
- No OAuth client secret in browser code.
- No disabling tests to make them pass.
- No hiding failing tests.
- No fake PASS results.
- No force push.
- No rewriting shared Git history.
- No arbitrary architecture rewrite.
- No random refactor merely to keep the autonomous loop running.
- No enabling paid services without human approval.
- No switching Claude/Codex to paid API keys.
- No production infrastructure changes without explicit approval.
- No changes to unrelated repositories.
- No deploy automatically after Git push.

---

## Git

Primary branch:

master

Push target:

origin/master

Push after validated checkpoints: yes

For every meaningful website/app change:

1. inspect diff
2. run relevant validation
3. commit
4. push to origin/master when validation passes

Use meaningful commit messages, for example:

- feat(auth): complete Supabase Google sign-in flow
- fix(admin): enforce publishing permission checks
- test(rls): cover role escalation attempts
- docs(supabase): clarify bootstrap procedure

Do not commit:

- secrets
- credentials
- access tokens
- refresh tokens
- service-role keys
- database passwords
- generated local AI-Team state

`.aiteam/` is machine-local state and must remain ignored.

If uncommitted changes exist that were not created by AI Dev Team:
do not overwrite them.

Set:

NEEDS_HUMAN

and explain what was found.

---

## Validation

Inspect package.json before assuming available scripts.

Known baseline commands include:

npm test
npm run lint
npm run build

Do not invent npm scripts.

If a type-check script exists, run it.

For authentication/backend/security changes:
run the applicable Supabase/RLS tests.

For learner-facing changes:
run relevant regression/browser QA.

For Admin changes:
run relevant Admin QA.

A feature is not complete merely because it builds.

Relevant tests and requirements must also pass.

Pre-existing lint debt must be reported separately from new lint errors.

---

## Backend Rules

Current confirmed baseline:

f1e4ec2 — Phase 72B

Supabase migration foundation already exists.

Do NOT rebuild the migration from scratch.

Inspect and improve the existing implementation.

Final backend direction:

- Supabase Auth
- Google OAuth
- PostgreSQL
- Row Level Security
- Supabase Storage only when actually required

Firebase code may exist historically or as migration remnants.

Do not maintain two competing active production backend implementations.

Do not delete legacy Firebase code blindly.

First determine whether each remaining reference is:

- still active
- required for compatibility/migration
- test-only
- documentation-only
- obsolete

Remove or replace only after verification.

---

## Authentication and Authorization

Supported roles:

- STUDENT
- CONTENT_EDITOR
- GAME_EDITOR
- REVIEWER
- ADMIN
- SUPER_ADMIN

Frontend permission checks are UX only.

Database authorization is authoritative.

RLS must protect privileged data.

Never trust a role supplied by the client.

Users must not be able to elevate their own role.

Protect the final SUPER_ADMIN from accidental removal/demotion.

First SUPER_ADMIN bootstrap must be secure.

Do not hard-code a privileged owner email into frontend source as the security mechanism.

Authentication/security changes must fail closed.

---

## Data Rules

Existing learner progress must be preserved.

Current learner data may exist locally in the browser.

Do not destructively migrate learner progress to cloud storage.

Cloud synchronization requires an explicit strategy for:

- migration
- conflict handling
- ownership
- merging
- offline behavior
- rollback

Admin/CMS data and learner-state engines must remain separated.

Admin must not directly modify:

- mastery
- diagnostic state
- learning evidence
- review scheduling
- Next Step calculation
- learner history

---

## Learning Core Rules

Preserve the existing V2U Learning Core unless the active Goal explicitly requires a change.

Do not casually change:

- mastery rules
- diagnostic scoring
- review scheduling
- pathway logic
- Next Step behavior
- learning evidence semantics

The learner should understand WHY, not only whether an answer is correct.

Avoid regressing learning UX into:

long passive text
→ quiz

Prefer:

explanation
→ learner action
→ feedback
→ guided retry
→ independent attempt
→ understanding check
→ next step

Guest learning must continue to work.

---

## Navigation Rules

Keep the five primary learner navigation items unless the owner explicitly approves a change:

1. หน้าหลัก
2. เรียน
3. ทบทวน
4. เส้นทาง
5. ฉัน

Admin has its own navigation context.

Do not add unnecessary primary pages.

V2U should remain simple and focused.

---

## Product UX Rules

V2U is:

Navigation-first with Learning inside it.

Core question:

จากจุดที่คุณอยู่ตอนนี้
คุณต้องทำอะไรต่อเพื่อไปถึงมหาวิทยาลัยที่คุณต้องการ?

Product principles:

- Thai-first
- mobile-first
- few focused pages
- clear next action
- learning by doing
- explanatory feedback
- preserve user data
- accessible
- keyboard friendly
- touch friendly
- reduced-motion friendly
- no horizontal overflow
- honest readiness

Do not add features merely because they are technically possible.

---

## Game Rules

Games are optional learning activities.

V2U remains the authority for:

- curriculum
- mastery
- diagnostic
- review
- Next Step

Games consume GameContent.

Games return GameEvidence.

Games must not directly set mastery.

Games must not directly alter review state.

Games must not directly alter Next Step.

Do not let standalone games import V2U curriculum internals directly.

Pixel Code Battle integration must use the established GameContent/GameEvidence contract.

Do not enable learning effects until real integration is proven.

Do not use `eval` for learner-controlled code.

---

## Resource / Video Rules

External videos/resources are supplementary.

A discovered URL is not automatically VERIFIED.

Do not mark resources VERIFIED unless their actual contents have been inspected.

Do not generate trusted:

- summaries
- timestamps
- video-specific quizzes
- quality claims

from only:

- titles
- thumbnails
- snippets
- search results
- descriptions

If source inspection is unavailable, keep the item pending/unverified.

---

## Environment Rules

Allowed by default:

- local development
- local tests
- local browser QA
- local database/test environments

Staging:
only when explicitly configured and approved.

Production:
DO NOT TOUCH without specific human approval.

Production builds are allowed.

Deploying/publishing production builds is not.

---

## Claude / Codex Rules

Use the user's currently logged-in:

- Claude Code CLI
- Codex CLI

Use subscription sessions only.

Do NOT automatically switch to:

- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- paid API fallback
- paid overage

Preferred responsibilities:

Claude:
- product/requirement reasoning
- architecture
- UX
- security review
- code review
- regression analysis

Codex:
- implementation
- debugging
- testing
- build
- refactoring
- Git validation

Either agent may temporarily perform the other's role when the preferred agent reaches a usage limit.

If one agent reaches quota:
- mark it COOLDOWN
- continue with the other agent where reasonable
- preserve context and partial work
- do not restart completed work unnecessarily

If both reach quota:
- save state
- save current task
- save reports
- preserve Git state
- set WAITING_FOR_QUOTA
- stop safely or wait for scheduled quota probe

Never spam retry an exhausted provider.

---

## Autonomous Improvement Rules

After the active Goal is complete:

look only for meaningful improvements.

Meaningful improvements include:

- real bug fixes
- security improvements
- correctness improvements
- material UX/accessibility improvements
- reliability improvements
- missing test coverage
- proven technical debt
- completion of an existing requirement

Do NOT continue indefinitely with:

- cosmetic churn
- random refactoring
- dependency churn
- architecture rewrites for style
- speculative features
- feature creep

When no meaningful improvement remains:

PROJECT_STABLE

---

## Human Approval Required

Stop and set:

NEEDS_HUMAN

before:

- production deployment
- destructive database migration
- deleting real user data
- enabling a paid service
- changing hosting/provider cost
- changing backend away from Supabase
- major product-direction change
- changing primary learner navigation
- rewriting mastery/diagnostic/review/Next Step behavior
- destructive learner-data migration
- changing stable lesson/skill IDs
- disabling an important existing feature
- irreversible authentication/security decisions
- resolving unclear local/cloud learner data conflicts
- requiring secrets/credentials the agent does not already have

When human input is required, report:

1. what decision is needed
2. why it is needed
3. available options
4. risks
5. recommended option

Do not guess and continue.