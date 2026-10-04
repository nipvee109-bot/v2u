/* ⚠ DEVELOPMENT ONLY — never shipped (Phase 72).
   Reached only through backend/index.ts under `import.meta.env.DEV && VITE_V2U_DEV_ADMIN=1`.
   Seeds one fake account per role so the admin UI can be exercised locally without Firebase.
   Choose who "signs in" with localStorage key `v2u-dev-as` (a role name). Data lives in memory. */

import { ROLES } from '../auth/permissions';
import type { Role } from '../auth/permissions';
import type { UserProfile } from '../cms/types';
import { createMemoryBackend } from './memory';

export const DEV_FIXTURE_MARKER = 'V2U_DEV_ADMIN_FIXTURE';

export function devUser(role: Role): UserProfile {
  const at = '2026-10-04T00:00:00.000Z';
  return { uid: `dev-${role.toLowerCase()}`, displayName: `DEV ${role}`, email: `${role.toLowerCase()}@dev.invalid`, photoURL: null, role, status: 'ACTIVE', createdAt: at, updatedAt: at, lastLoginAt: at, onboardingCompleted: true, learnerData: { location: 'local-device' }, schemaVersion: 1 };
}

export function createDevFixtureBackend() {
  let as: Role = 'SUPER_ADMIN';
  try {
    const v = localStorage.getItem('v2u-dev-as') as Role | null;
    if (v && (ROLES as readonly string[]).includes(v)) as = v;
  } catch {
    /* private mode */
  }
  const users = ROLES.map(devUser);
  const me = users.find((u) => u.role === as)!;
  console.warn(`[${DEV_FIXTURE_MARKER}] development-only in-memory backend — signed in as ${as}`);
  return createMemoryBackend({ users, signInAs: { uid: me.uid, displayName: me.displayName, email: me.email, photoURL: null } });
}
