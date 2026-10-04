/* Backend selection (Phase 72).
   - Firebase when VITE_FIREBASE_* are configured.
   - DEVELOPMENT ONLY: an in-memory admin fixture when `vite dev` runs with
     VITE_V2U_DEV_ADMIN=1. `import.meta.env.DEV` is false in production builds, so this
     branch (and the fixture module) is removed from the production bundle entirely.
   - Otherwise null: V2U runs in guest mode exactly as before; /admin explains that
     accounts are not configured. */

import type { CmsBackend } from './types';
import { readFirebaseEnv } from './firebase';

let pending: Promise<CmsBackend | null> | null = null;

export function backendMode(): 'firebase' | 'memory-dev' | 'none' {
  if (readFirebaseEnv(import.meta.env)) return 'firebase';
  if (import.meta.env.DEV && import.meta.env.VITE_V2U_DEV_ADMIN === '1') return 'memory-dev';
  return 'none';
}

export function getBackend(): Promise<CmsBackend | null> {
  if (pending) return pending;
  const cfg = readFirebaseEnv(import.meta.env);
  if (cfg) pending = import('./firebase').then((m) => m.createFirebaseBackend(cfg));
  else if (import.meta.env.DEV && import.meta.env.VITE_V2U_DEV_ADMIN === '1') pending = import('./devFixture').then((m) => m.createDevFixtureBackend());
  else pending = Promise.resolve(null);
  return pending;
}
