import type { AuthUserInfo, CmsBackend, SignInResult } from '../backend/types';
import type { UserProfile } from '../cms/types';
import type { AuthStatus } from './authContext';

export type AuthErrorKind = 'missing-profile' | 'profile-load' | 'auth' | null;
export interface SessionState {
  status: AuthStatus;
  profile: UserProfile | null;
  error: string | null;
  errorKind: AuthErrorKind;
  signingIn: boolean;
  signingOut: boolean;
}

export const AUTH_MESSAGES: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว',
  'popup-blocked': 'เปิดหน้าเข้าสู่ระบบไม่ได้ กรุณาลองอีกครั้ง',
  network: 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่เมื่อออนไลน์',
  'not-configured': 'ระบบบัญชียังไม่ได้ตั้งค่า',
  callback: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบด้วย Google อีกครั้ง',
  error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง',
  'missing-profile': 'ยังไม่พบโปรไฟล์บัญชี กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลระบบ',
  'profile-load': 'โหลดโปรไฟล์บัญชีไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง',
};

/** One identity/generation owns every async state result. No learner storage I/O. */
export function createSessionController(backend: CmsBackend, publish: (state: SessionState) => void) {
  let state: SessionState = { status: 'loading', profile: null, error: null, errorKind: null, signingIn: false, signingOut: false };
  let generation = 0;
  let user: AuthUserInfo | null = null;
  let disposed = false;
  let signInPending: Promise<SignInResult> | null = null;
  const update = (patch: Partial<SessionState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    publish(state);
  };
  const current = (g: number, uid: string | null) => !disposed && generation === g && (user?.uid ?? null) === uid;

  const load = async (u: AuthUserInfo, touch: boolean) => {
    const g = ++generation;
    update({ status: 'loading', profile: null, error: null, errorKind: null, signingIn: false, signingOut: false });
    // Supabase holds an auth lock during onAuthStateChange; do I/O afterward.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (!current(g, u.uid)) return;
    try {
      let p: UserProfile | null;
      if (touch) {
        try { p = await backend.touchOwnProfile(u); }
        catch {
          if (!current(g, u.uid)) return;
          // Inactive accounts cannot update last_login_at; read their status.
          p = await backend.getProfile(u.uid);
        }
      } else p = await backend.getProfile(u.uid);
      if (!current(g, u.uid)) return;
      if (!p) update({ status: 'error', profile: null, errorKind: 'missing-profile', error: AUTH_MESSAGES['missing-profile'], signingIn: false });
      else if (p.uid !== u.uid) throw new Error('profile identity mismatch');
      else update({ status: 'signed-in', profile: p, error: null, errorKind: null, signingIn: false });
    } catch {
      if (current(g, u.uid)) update({ status: 'error', profile: null, errorKind: 'profile-load', error: AUTH_MESSAGES['profile-load'], signingIn: false });
    }
  };

  return {
    async authChanged(u: AuthUserInfo | null, event = 'INITIAL_SESSION') {
      if (disposed) return;
      const same = user?.uid === u?.uid;
      if (same && event === 'TOKEN_REFRESHED') return;
      if (same && event === 'SIGNED_IN' && state.status === 'signed-in') return;
      user = u;
      if (!u) {
        ++generation;
        update({ status: 'signed-out', profile: null, errorKind: null, signingIn: false, signingOut: false });
        return;
      }
      await load(u, event === 'INITIAL_SESSION' || event === 'SIGNED_IN');
    },
    async refreshProfile() {
      if (user && !disposed) await load(user, false);
    },
    redirectError(result: SignInResult | null) {
      if (result && !result.ok) update({ error: AUTH_MESSAGES[result.reason] ?? AUTH_MESSAGES.error, errorKind: 'auth' });
    },
    signIn(online = true): Promise<SignInResult> {
      if (signInPending) return signInPending;
      if (state.signingIn) return Promise.resolve({ ok: true, redirecting: true });
      if (!online) {
        update({ error: AUTH_MESSAGES.network, errorKind: 'auth' });
        return Promise.resolve({ ok: false, reason: 'network' });
      }
      const g = generation;
      update({ signingIn: true, error: null, errorKind: null });
      signInPending = (async () => {
        let result: SignInResult;
        try { result = await backend.signInWithGoogle(); }
        catch { result = { ok: false, reason: 'error' }; }
        if (!disposed && generation === g) {
          update({ signingIn: result.ok && !!result.redirecting,
            ...(!result.ok ? { errorKind: 'auth' as const, error: AUTH_MESSAGES[result.reason] ?? AUTH_MESSAGES.error } : {}) });
        }
        signInPending = null;
        return result;
      })();
      return signInPending;
    },
    async signOut() {
      if (state.signingOut || disposed) return;
      const previous = user;
      user = null;
      const g = ++generation; // Invalidate pending profile/retry results now.
      update({ status: 'loading', profile: null, signingIn: false, signingOut: true, error: null, errorKind: null });
      try {
        await backend.signOut();
        if (current(g, null)) update({ status: 'signed-out', signingOut: false });
      } catch {
        if (current(g, null)) {
          user = previous;
          update({ status: 'error', signingOut: false, errorKind: 'auth', error: 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง' });
        }
      }
    },
    dispose() { disposed = true; ++generation; },
  };
}
