/* Optional account session. Roles/status come from the database; learner state stays local. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { backendMode, getBackend } from '../backend';
import type { CmsBackend, SignInResult } from '../backend/types';
import { setCmsOverlay } from '../cms/overlay';
import { learnerOverrides, learnerResources } from '../cms/resolver';
import { AuthContext } from './authContext';
import type { AuthState } from './authContext';
import { AUTH_MESSAGES, createSessionController } from './sessionController';
import type { SessionState } from './sessionController';

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = backendMode();
  const [backend, setBackend] = useState<CmsBackend | null>(null);
  const [session, setSession] = useState<SessionState>({ status: mode === 'none' ? 'unconfigured' : 'loading', profile: null, error: null, errorKind: null, signingIn: false, signingOut: false });
  const controller = useRef<ReturnType<typeof createSessionController> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (mode === 'none') return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    let active: ReturnType<typeof createSessionController> | null = null;
    getBackend().then((b) => {
      if (cancelled || !b) return;
      setBackend(b);
      active = createSessionController(b, setSession);
      controller.current = active;
      active.redirectError(b.consumeAuthRedirectError?.() ?? null);
      // Public learner CMS snapshots only; this never touches learner storage.
      Promise.all([b.listPublished({ learnerOnly: true }), b.listGames({ learnerOnly: true }), b.listAssignments({ learnerOnly: true })])
        .then(([pub, games, assignments]) => { if (!cancelled) setCmsOverlay({ resources: learnerResources(pub), overrides: learnerOverrides(pub), games, assignments }); })
        .catch(() => { if (!cancelled) setCmsOverlay({}); });
      unsub = b.onAuthChanged((u, event) => { void active?.authChanged(u, event); });
    }).catch(() => {
      if (!cancelled) setSession({ status: 'error', profile: null, error: AUTH_MESSAGES.error, errorKind: 'auth', signingIn: false, signingOut: false });
    });
    return () => { cancelled = true; unsub?.(); active?.dispose(); controller.current = null; };
  }, [mode, attempt]);

  const signIn = useCallback((): Promise<SignInResult> => controller.current?.signIn(navigator.onLine) ?? Promise.resolve({ ok: false, reason: 'not-configured' }), []);
  const signOut = useCallback(async () => {
    if (controller.current) await controller.current.signOut();
    else {
      // No backend/session was established, so returning to guest is safe.
      setSession({ status: 'signed-out', profile: null, error: null, errorKind: null, signingIn: false, signingOut: false });
    }
  }, []);
  const refreshProfile = useCallback(async () => {
    if (controller.current) await controller.current.refreshProfile();
    else { setSession((s) => ({ ...s, status: 'loading', error: null })); setAttempt((n) => n + 1); }
  }, []);
  const value = useMemo<AuthState>(() => ({ ...session, mode, backend, online,
    actor: session.profile ? { uid: session.profile.uid, role: session.profile.role, status: session.profile.status } : null,
    signIn, signOut, refreshProfile,
  }), [session, mode, backend, online, signIn, signOut, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
