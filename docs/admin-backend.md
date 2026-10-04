# V2U accounts, admin CMS and RBAC (Phase 72)

## Backend decision

V2U had no backend before this phase. All learner data lived in `localStorage`.

Phase 72 adds **Firebase Authentication** (Google sign-in) and **Cloud Firestore**:

- Google sign-in comes with no server code to run.
- Firestore Security Rules enforce permissions server-side. They are tested against the emulator with `npm run test:rules`.
- The SDK is loaded lazily, so a guest never downloads it.
- With no config, the app runs in guest mode exactly as before.

| Layer | File |
|---|---|
| Permission engine (`can(user, permission)`) | `src/auth/permissions.ts` |
| Server-side enforcement | `firestore.rules` |
| Backend interface | `src/backend/types.ts` |
| Firebase implementation | `src/backend/firebase.ts` |
| DEVELOPMENT ONLY in-memory fixture | `src/backend/devFixture.ts`, `src/backend/memory.ts` |
| Workflow, validation, audit events | `src/cms/workflow.ts` |
| Service (permission → validate → write + audit) | `src/cms/service.ts` |
| What learners may see | `src/cms/resolver.ts`, `src/cms/overlay.ts` |
| Admin UI (`/admin`) | `src/admin/` |

## Roles

| Role | Can do |
|---|---|
| STUDENT | Learn. No admin access. |
| CONTENT_EDITOR | Draft and submit videos, resources and text overrides. Cannot verify, publish, or change roles. |
| GAME_EDITOR | Register games, set their lifecycle, attach or order them on lessons. Cannot publish curriculum content. |
| REVIEWER | Review, approve, reject, publish and unpublish. Verify sources. Cannot manage users. |
| ADMIN | All of the above, plus users (non-admin roles), account status, audit log and settings. Cannot grant ADMIN or SUPER_ADMIN. |
| SUPER_ADMIN | Everything, including granting and removing ADMIN and SUPER_ADMIN. |

Account status is ACTIVE, SUSPENDED or DISABLED. A non-ACTIVE account has no staff permissions.

**The last SUPER_ADMIN cannot be lost.**
- The rules forbid changing your own role or status, so only another SUPER_ADMIN can demote one.
- The service also refuses to demote or suspend the last remaining SUPER_ADMIN.

## Firestore data model

| Collection | Contents | Who can read |
|---|---|---|
| `users/{uid}` | `UserProfile`. Self-created as STUDENT/ACTIVE only. | Self, or ADMIN and above |
| `cmsDrafts/{id}` | Working copy plus workflow state | Staff |
| `cmsPublished/{id}` | Learner copy. `learnerVisible` is computed and re-checked by the rules. | Public if `learnerVisible`, otherwise staff |
| `cmsVersions/{id}__v{n}` | Previous published versions (recovery). Append-only. | Staff |
| `games/{gameId}` | `GameDoc` (contracts 1.1) | Public if `published` |
| `lessonGameAssignments/{lessonId}__{gameId}` | `required` is always false; detached rather than deleted | Public if attached and visible |
| `auditLogs/{auto}` | `AuditEvent`. Append-only; actor uid and role must match the writer. | ADMIN and above |
| `settings/{id}` | Operational settings | Writable by ADMIN and above |

Everything else is denied by default.

**Learner state never enters Firestore through the CMS.** No collection can hold, read, or change any of these:
- mastery;
- diagnostic results;
- skill evidence;
- the review queue;
- next-step state;
- learner history.

**Protected data stays in code.** None of the following is editable through the CMS:
- lesson and skill IDs;
- scoring, mastery, evidence and next-step algorithms;
- the review scheduler.

## Content workflow

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
            ↘ REJECTED → (reopen) DRAFT
any → ARCHIVED → (reopen) DRAFT
```

**Safe operational content** (videos, resources, announcements):
- A REVIEWER, ADMIN or SUPER_ADMIN may publish it directly.
- Learners only ever see items that are **VISIBLE, VERIFIED and https**.
- Entering a URL never verifies it. A reviewer must press "ยืนยันแหล่ง", which records `verifiedBy` and `verifiedAt`.

**Controlled content** (`contentOverride`: summary, analogy or whyItMatters for a lesson):
- It must be APPROVED by a different person before it can be published.
- The rules check that the draft is APPROVED.

**Versions:**
- Each publish increments `version` and stores the previous copy in `cmsVersions`.
- "กู้คืนเป็นร่าง" restores an old version as a new draft, which then needs re-publishing.

## Games

The CMS only registers, hides, disables and assigns games. **It does not build them.**

A lesson's game is playable only when both of these are true:
1. The CMS says AVAILABLE, enabled and published.
2. The code integration registry (`src/learning/games/registry.ts`) also says AVAILABLE.

GameContent always comes from the V2U adapter. Pixel Code Battle is unchanged and remains PREPARING.

## First SUPER_ADMIN bootstrap

No owner email exists anywhere in client code. The first account becomes SUPER_ADMIN like this:

1. The owner signs in once with Google on the deployed site. This creates `users/{uid}` as STUDENT.
2. In the **Firebase console → Firestore**, open `users/{uid}` and set `role` to `SUPER_ADMIN`. The console uses the owner's Google Cloud credentials, which bypass client rules.
   - Alternatively, run a one-off Admin SDK script **on your own machine**, using a service-account key that is **never committed** (`.gitignore` blocks `*service-account*.json` and `.env*`).
3. Reload `/admin`. From then on, grant all roles from **ผู้ใช้และบทบาท**.

## Environment

Copy `.env.example` to `.env.local` and fill in the Firebase web config.

- These values are public client identifiers. Security comes from the rules.
- Never put service-account keys, Admin SDK private keys or OAuth client secrets in the repository or in any `VITE_*` variable.
- Deploy the rules with `firebase deploy --only firestore:rules`. This is done by the owner; this repository does not deploy.
- In Firebase Auth, enable the Google provider and add the site domain to the authorised domains.

## Development fixture (DEVELOPMENT ONLY)

`VITE_V2U_DEV_ADMIN=1 npm run dev` uses an in-memory backend.
- It seeds one fake `@dev.invalid` account per role.
- Choose the role with `localStorage['v2u-dev-as']`.
- The admin header shows a "DEVELOPMENT ONLY" badge.

It can only be enabled under `import.meta.env.DEV`, which is false in `vite build`. The fixture is therefore absent from production bundles; `scripts/test-phase-72.js` checks `dist/`.

## Guest mode and learner-data migration

Guest mode is unchanged: every learning feature works without an account.

Signing in **does not** move, upload, merge or delete local learner data. `src/cms/migration.ts` is the plan for a future sync, and every step is non-destructive:

1. Back up locally using the existing export.
2. Copy to the account only with explicit consent.
3. Verify the copy.
4. Keep the local copy.

## Tests

- `npm test` includes `test-phase-72.js`:
  - permission matrix;
  - role-escalation attempts;
  - workflow;
  - learner visibility;
  - disabled games;
  - absence of secrets and owner email;
  - dev fixture excluded from production.
- `npm run test:rules` runs the Firestore emulator suite against `firestore.rules`. It needs Java and the emulator jar.
