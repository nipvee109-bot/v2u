# V2U — CURRENT GOAL

## Product Goal

V2U — Vocational to University

ช่วยนักเรียนสายอาชีพตอบคำถามว่า:

> จากจุดที่คุณอยู่ตอนนี้ คุณต้องทำอะไรต่อเพื่อไปถึงมหาวิทยาลัยที่คุณต้องการ?

V2U เป็น Navigation-first product ที่มี Learning อยู่ภายใน
ไม่ใช่ Learning App ที่เพียงเพิ่ม Navigation เข้ามา

Core flow:

Goal
→ Current State
→ Route
→ Today's Next Step
→ Learning
→ Proof of Understanding
→ Review
→ Adapted Next Step

## Current Confirmed Baseline

Repository HEAD at the beginning of this goal:

f1e4ec2
Phase 72B: move accounts and admin backend from Firebase to Supabase

Phase 72 already introduced:
- Accounts
- Google login architecture
- Admin CMS
- RBAC
- Six roles
- Publishing workflow

Phase 72B introduced the Supabase migration foundation.

The repository is authoritative.
Do not assume old reports are more current than the actual code.

## Current Major Goal

VERIFY, COMPLETE AND HARDEN PHASE 72B.

Do NOT redo the Firebase → Supabase migration from scratch.

Inspect what Phase 72B actually implemented and complete only what is
missing, broken, insecure, untested or incomplete.

Target backend:

- Supabase Auth
- Google OAuth
- PostgreSQL
- Row Level Security
- Supabase Storage only when actually needed

Supabase should be the final account/admin backend.

Do not maintain two competing production backend implementations.

## Priority 1 — Reconciliation

Before modifying code:

1. Inspect repository HEAD and recent history.
2. Inspect package.json.
3. Inspect src/auth/.
4. Inspect src/backend/.
5. Inspect src/admin/.
6. Inspect src/cms/.
7. Inspect supabase/.
8. Inspect docs/supabase-setup.md.
9. Inspect .env.example.
10. Inspect current tests.

Determine:

- what Phase 72B completed
- what remains Firebase-related
- whether remaining Firebase references are intentional or obsolete
- whether Supabase Auth is wired correctly
- whether Google OAuth is actually ready
- whether PostgreSQL schema matches the Phase 72 domain model
- whether RLS correctly protects all privileged data
- whether Admin/CMS behavior remains compatible

Do not modify code until reconciliation is complete.

## Priority 2 — Supabase Security

Verify and harden:

- RLS
- role enforcement
- client role spoofing prevention
- self-role escalation prevention
- last SUPER_ADMIN protection
- first SUPER_ADMIN bootstrap
- publishing permissions
- audit-log integrity
- unauthorized Admin access
- fail-closed behavior

UI permission checks are not security.
Database authorization must be authoritative.

## Priority 3 — Regression Safety

Preserve the existing learner product:

- guest learning
- existing local learner progress
- Diagnostic
- Route
- Review
- Next Step
- Learning Core
- 15 existing lessons
- GameContent 1.1
- GameEvidence 1.1

Admin must not directly modify:

- mastery
- diagnostic results
- learner evidence
- review scheduling
- Next Step engine

## Priority 4 — Validation

Inspect package.json before assuming scripts.

Known baseline commands include:

- npm test
- npm run lint
- npm run build

Run all applicable:
- unit tests
- backend tests
- Supabase/RLS security tests
- type checking if configured
- build
- learner regression QA
- Admin QA

Do not hide pre-existing lint debt.
Do not introduce new lint regressions.

## Priority 5 — First Real Game Integration

Only after Phase 72B is stable:

V2U GameContent
→ Pixel Code Battle
→ real session
→ GameEvidence
→ V2U read-only interpretation

Do not activate mastery effects until the real integration is proven.

## Product Principles

- Thai-first
- mobile-first
- few focused pages
- clear next action
- learning by doing
- explain WHY
- preserve learner data
- guest-friendly
- accessible
- keyboard and touch friendly
- reduced-motion friendly
- fail closed for auth/security
- no fake readiness
- no invented curriculum
- no invented source verification
- games support learning, not replace the learning engine

Keep the five primary learner navigation items:

1. หน้าหลัก
2. เรียน
3. ทบทวน
4. เส้นทาง
5. ฉัน

Do not change them without explicit product approval.

## Definition of Done

This Goal is complete when:

1. Phase 72B implementation has been reconciled against the real repository.
2. Supabase is the single intended account/admin backend.
3. No obsolete competing Firebase backend remains active.
4. Google OAuth is correctly integrated or clearly blocked on human-owned credentials/configuration.
5. All six roles behave according to the permission model.
6. PostgreSQL RLS enforces authorization.
7. Client-side role spoofing fails.
8. Self privilege escalation fails.
9. Last SUPER_ADMIN protection works.
10. First SUPER_ADMIN bootstrap is safe.
11. /admin works for authorized staff.
12. CMS workflows work.
13. Draft → Review → Approve → Publish works.
14. Audit logging works.
15. Guest learning still works.
16. Existing learner state is preserved.
17. Learning Core has no regression.
18. GameContent/GameEvidence contracts remain valid.
19. Relevant automated tests pass.
20. Security/RLS tests pass.
21. Production build passes.
22. Required browser QA passes.
23. No secrets are committed.
24. Working tree is clean after completion.
25. Meaningful changes are committed and pushed to origin/master.
26. Nothing is deployed without explicit human approval.

## Improvement Mode

After the major Goal is complete:

Claude and Codex may inspect for meaningful improvements.

Meaningful improvements include:

- real bugs
- correctness problems
- security gaps
- important UX/accessibility friction
- proven technical debt
- reliability problems
- missing test coverage
- incomplete existing requirements

Do not perform random refactors, architecture churn or cosmetic changes
just to continue working.

When no meaningful improvement remains:

PROJECT_STABLE

When owner input is required:

HUMAN_DECISION_REQUIRED