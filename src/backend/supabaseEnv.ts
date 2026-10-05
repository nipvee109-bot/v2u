/* Supabase browser configuration (Phase 72B). Only the project URL and the PUBLIC
   anon/publishable key belong in the browser; access is enforced by RLS.
   A service-role/secret key is refused outright (it would bypass RLS). */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

function jwtRole(key: string): string | null {
  const part = key.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/** True for keys that must never reach a browser. */
export const isSecretKey = (key: string) => key.trim().startsWith('sb_secret_') || jwtRole(key.trim()) === 'service_role';

/** Run before Vite transforms any browser code. Report names only, never values. */
export function assertSafeFrontendEnv(env: Record<string, string | boolean | undefined>): void {
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith('VITE_') && typeof value === 'string' && isSecretKey(value)) {
      throw new Error(`Unsafe frontend environment variable: ${name}. Use a public anon/publishable key.`);
    }
  }
}

export function readSupabaseEnv(env: Record<string, string | boolean | undefined>): SupabaseEnv | null {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  if (!url || !anonKey) return null;
  if (/your-|placeholder|xxx/i.test(url + anonKey)) return null;
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?\/?$/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) return null;
  if (isSecretKey(anonKey)) {
    console.error('[V2U] A Supabase service-role/secret key was configured for the browser. It is ignored — use the anon/publishable key.');
    return null;
  }
  return { url: url.replace(/\/$/, ''), anonKey };
}
