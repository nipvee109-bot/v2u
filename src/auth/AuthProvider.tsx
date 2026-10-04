/* Account session (Phase 72). Guest learning keeps working exactly as before:
   signing in is optional for learners and required only for /admin.
   Role/status always come from the stored profile, never from the browser. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { backendMode, getBackend } from '../backend';
import type { CmsBackend, SignInResult } from '../backend/types';
import type { UserProfile } from '../cms/types';
import { setCmsOverlay } from '../cms/overlay';
import { learnerOverrides, learnerResources } from '../cms/resolver';
import { AuthContext } from './authContext';
import type { AuthState, AuthStatus } from './authContext';

const MESSAGES: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว',
  'popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง',
  network: 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่เมื่อออนไลน์',
  'not-configured': 'ระบบบัญชียังไม่ได้ตั้งค่า',
  error: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = backendMode();
  const [backend, setBackend] = useState<CmsBackend | null>(null);
  const [status, setStatus] = useState<AuthStatus>(mode === 'none' ? 'unconfigured' : 'loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (mode === 'none') return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    getBackend()
      .then((b) => {
        if (cancelled || !b) return;
        setBackend(b);
        // learner-visible CMS content (public read) — never drafts
        Promise.all([b.listPublished({ learnerOnly: true }), b.listGames({ learnerOnly: true }), b.listAssignments({ learnerOnly: true })])
          .then(([pub, games, assignments]) => setCmsOverlay({ resources: learnerResources(pub), overrides: learnerOverrides(pub), games, assignments }))
          .catch(() => setCmsOverlay({}));
        unsub = b.onAuthChanged(async (u) => {
          if (!u) {
            setProfile(null);
            setStatus('signed-out');
            return;
          }
          try {
            setProfile(await b.upsertOwnProfile(u));
            setStatus('signed-in');
          } catch {
            // e.g. a suspended account cannot update its profile — read it instead
            const p = await b.getProfile(u.uid).catch(() => null);
            setProfile(p);
            setStatus(p ? 'signed-in' : 'error');
          }
        });
      })
      .catch(() => setStatus('error'));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [mode]);

  const signIn = useCallback(async (): Promise<SignInResult> => {
    setError(null);
    if (!backend) return { ok: false, reason: 'not-configured' };
    if (!navigator.onLine) {
      setError(MESSAGES.network);
      return { ok: false, reason: 'network' };
    }
    const r = await backend.signInWithGoogle();
    if (!r.ok) setError(MESSAGES[r.reason] ?? MESSAGES.error);
    return r;
  }, [backend]);

  const signOut = useCallback(async () => {
    await backend?.signOut();
    setProfile(null);
    setStatus('signed-out');
  }, [backend]);

  const refreshProfile = useCallback(async () => {
    if (backend && profile) setProfile(await backend.getProfile(profile.uid));
  }, [backend, profile]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      mode,
      profile,
      actor: profile ? { uid: profile.uid, role: profile.role, status: profile.status } : null,
      backend,
      online,
      error,
      signIn,
      signOut,
      refreshProfile,
    }),
    [status, mode, profile, backend, online, error, signIn, signOut, refreshProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
