/* Backend selection (Phase 72B).
   - Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are configured (the only production backend).
   - DEVELOPMENT ONLY: an in-memory fixture when `vite dev` runs with VITE_V2U_DEV_ADMIN=1.
     `import.meta.env.DEV` is false in production builds, so this branch (and the fixture
     module) is removed from the production bundle entirely.
   - Otherwise null: V2U runs in guest mode exactly as before; /admin explains that
     accounts are not configured. */

import type { CmsBackend } from './types';
import { readSupabaseEnv } from './supabaseEnv';

let pending: Promise<CmsBackend | null> | null = null;

export function backendMode(): 'supabase' | 'memory-dev' | 'none' {
  if (readSupabaseEnv(import.meta.env)) return 'supabase';
  if (import.meta.env.DEV && import.meta.env.VITE_V2U_DEV_ADMIN === '1') return 'memory-dev';
  return 'none';
}

export function getBackend(): Promise<CmsBackend | null> {
  if (pending) return pending;
  const cfg = readSupabaseEnv(import.meta.env);
  if (cfg) pending = import('./supabase').then((m) => m.createSupabaseBackend(cfg));
  else if (import.meta.env.DEV && import.meta.env.VITE_V2U_DEV_ADMIN === '1') pending = import('./devFixture').then((m) => m.createDevFixtureBackend());
  else pending = Promise.resolve(null);
  return pending;
}
