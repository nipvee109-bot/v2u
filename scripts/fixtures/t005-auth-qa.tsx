/* Standalone browser test fixture; absent from the application entry/build.
   No credentials, network auth, storage writes or real OAuth are used here. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/auth/authContext';
import { createSessionController } from '../../src/auth/sessionController';
import type { SessionState } from '../../src/auth/sessionController';
import type { CmsBackend } from '../../src/backend/types';
import type { UserProfile } from '../../src/cms/types';
import { AccountCard } from '../../src/components/account/AccountCard';
import { AdminApp } from '../../src/admin/AdminApp';
import '../../src/index.css';

const scenario = new URLSearchParams(window.location.search).get('case') ?? 'missing';
const cases = ['guest', 'signed-out', 'loading', 'missing', 'network', 'cancelled', 'callback', 'student', 'suspended', 'disabled'];
export function Fixture() {
  const [state, setState] = useState<SessionState>({ status: scenario === 'guest' ? 'unconfigured' : 'loading', profile: null, error: null, errorKind: null, signingIn: false, signingOut: false });
  const [setup] = useState(() => {
    let fail = scenario;
    const u = { uid: 'qa-learner', displayName: 'ผู้เรียนทดสอบ', email: 'learner@example.invalid', photoURL: null };
    const p = { ...u, role: 'STUDENT', status: scenario === 'suspended' ? 'SUSPENDED' : scenario === 'disabled' ? 'DISABLED' : 'ACTIVE' } as UserProfile;
    const backend = {
      kind: 'supabase',
      touchOwnProfile: async () => {
        if (['missing', 'network', 'suspended', 'disabled'].includes(fail)) throw new Error('simulated');
        return p;
      },
      getProfile: async () => {
        if (fail === 'network') throw new Error('simulated network failure');
        return fail === 'missing' ? null : p;
      },
      signOut: async () => {},
      signInWithGoogle: async () => ({ ok: true, redirecting: true }),
    } as unknown as CmsBackend;
    const controller = createSessionController(backend, setState);
    return { backend, controller, u, retry: async () => { fail = 'student'; await controller.refreshProfile(); } };
  });
  useEffect(() => {
    if (scenario === 'guest' || scenario === 'loading') return;
    if (scenario === 'cancelled' || scenario === 'callback') setup.controller.redirectError({ ok: false, reason: scenario });
    void setup.controller.authChanged(['signed-out', 'cancelled', 'callback'].includes(scenario) ? null : setup.u);
    return () => setup.controller.dispose();
  }, [setup]);
  return <MemoryRouter initialEntries={['/admin']}>
    <div className="p-4">
      <h1 className="mb-2 text-lg font-bold">T005 — simulated auth UI (Google OAuth not tested)</h1>
      <nav className="mb-4 flex flex-wrap gap-3">{cases.map((c) => <a className="underline" key={c} href={`?case=${c}`}>{c}</a>)}</nav>
      <AuthContext.Provider value={{ ...state, mode: scenario === 'guest' ? 'none' : 'supabase', backend: setup.backend, online: true,
        actor: state.profile ? { uid: state.profile.uid, role: state.profile.role, status: state.profile.status } : null,
        signIn: () => setup.controller.signIn(), signOut: () => setup.controller.signOut(), refreshProfile: setup.retry }}>
        <div data-testid="qa-account"><AccountCard /></div>
        <div data-testid="qa-admin"><AdminApp /></div>
      </AuthContext.Provider>
    </div>
  </MemoryRouter>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
