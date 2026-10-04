/* Firebase backend (Phase 72): Firebase Authentication (Google) + Cloud Firestore.
   Loaded lazily (dynamic import) so learners who never sign in don't download the SDK.
   Authorization is enforced by firestore.rules — the client never decides roles.
   No provider tokens are read, stored or logged. */

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AccountStatus, Role } from '../auth/permissions';
import type { AuditEvent, DraftDoc, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile } from '../cms/types';
import type { AuthUserInfo, CmsBackend, SignInResult } from './types';

export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export function readFirebaseEnv(env: Record<string, string | undefined>): FirebaseEnv | null {
  const c = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  if (!c.apiKey || !c.authDomain || !c.projectId || !c.appId) return null;
  if (/your-|placeholder|xxx/i.test(`${c.apiKey}${c.projectId}`)) return null;
  return c as FirebaseEnv;
}

export async function createFirebaseBackend(cfg: FirebaseEnv): Promise<CmsBackend> {
  const { initializeApp, getApps } = await import('firebase/app');
  const A = await import('firebase/auth');
  const F = await import('firebase/firestore');
  const app: FirebaseApp = getApps()[0] ?? initializeApp(cfg);
  const auth: Auth = A.getAuth(app);
  const db: Firestore = F.getFirestore(app);
  const info = (u: import('firebase/auth').User | null): AuthUserInfo | null => (u ? { uid: u.uid, displayName: u.displayName ?? u.email ?? 'ผู้ใช้', email: u.email ?? '', photoURL: u.photoURL } : null);
  const auditRef = () => F.doc(F.collection(db, 'auditLogs'));
  const list = async <T,>(name: string, max?: number) => {
    const q = max ? F.query(F.collection(db, name), F.orderBy('at', 'desc'), F.limit(max)) : F.collection(db, name);
    return (await F.getDocs(q)).docs.map((d) => d.data() as T);
  };

  return {
    kind: 'firebase',
    onAuthChanged: (cb) => A.onAuthStateChanged(auth, (u) => cb(info(u))),
    async signInWithGoogle(): Promise<SignInResult> {
      try {
        const provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await A.signInWithPopup(auth, provider);
        return { ok: true };
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return { ok: false, reason: 'cancelled' };
        if (code === 'auth/popup-blocked') return { ok: false, reason: 'popup-blocked' };
        if (code === 'auth/network-request-failed') return { ok: false, reason: 'network' };
        return { ok: false, reason: 'error', message: code || 'unknown' };
      }
    },
    signOut: () => A.signOut(auth),
    async getProfile(uid) {
      const s = await F.getDoc(F.doc(db, 'users', uid));
      return s.exists() ? (s.data() as UserProfile) : null;
    },
    async upsertOwnProfile(u) {
      const ref = F.doc(db, 'users', u.uid);
      const now = new Date().toISOString();
      const s = await F.getDoc(ref);
      if (s.exists()) {
        // rules allow a user to change only these fields on their own profile
        await F.updateDoc(ref, { displayName: u.displayName, photoURL: u.photoURL, lastLoginAt: now, updatedAt: now });
        return { ...(s.data() as UserProfile), displayName: u.displayName, photoURL: u.photoURL, lastLoginAt: now, updatedAt: now };
      }
      const p: UserProfile = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, role: 'STUDENT', status: 'ACTIVE', createdAt: now, updatedAt: now, lastLoginAt: now, onboardingCompleted: false, learnerData: { location: 'local-device' }, schemaVersion: 1 };
      await F.setDoc(ref, p);
      return p;
    },
    listUsers: () => list<UserProfile>('users'),
    async setUserRole(uid: string, role: Role, ev: AuditEvent) {
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'users', uid), { role, updatedAt: ev.at });
      b.set(auditRef(), ev);
      await b.commit();
    },
    async setUserStatus(uid: string, status: AccountStatus, ev: AuditEvent) {
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'users', uid), { status, updatedAt: ev.at });
      b.set(auditRef(), ev);
      await b.commit();
    },
    listDrafts: () => list<DraftDoc>('cmsDrafts'),
    async listPublished(opts) {
      const c = F.collection(db, 'cmsPublished');
      return (await F.getDocs(opts?.learnerOnly ? F.query(c, F.where('learnerVisible', '==', true)) : c)).docs.map((d) => d.data() as PublishedDoc);
    },
    async listVersions(id) {
      const q = F.query(F.collection(db, 'cmsVersions'), F.where('id', '==', id));
      return (await F.getDocs(q)).docs.map((d) => d.data() as PublishedDoc);
    },
    async saveDraft(d, ev) {
      const b = F.writeBatch(db);
      b.set(F.doc(db, 'cmsDrafts', d.id), d);
      b.set(auditRef(), ev);
      await b.commit();
    },
    async publish(d, pub, previous, ev) {
      const b = F.writeBatch(db);
      if (previous) b.set(F.doc(db, 'cmsVersions', `${previous.id}__v${previous.version}`), previous);
      b.set(F.doc(db, 'cmsPublished', pub.id), pub);
      b.set(F.doc(db, 'cmsDrafts', d.id), d);
      b.set(auditRef(), ev);
      await b.commit();
    },
    async unpublish(d, ev) {
      const prev = await F.getDoc(F.doc(db, 'cmsPublished', d.id));
      const b = F.writeBatch(db);
      if (prev.exists()) {
        const p = prev.data() as PublishedDoc;
        b.set(F.doc(db, 'cmsVersions', `${p.id}__v${p.version}`), p);
      }
      b.delete(F.doc(db, 'cmsPublished', d.id));
      b.set(F.doc(db, 'cmsDrafts', d.id), d);
      b.set(auditRef(), ev);
      await b.commit();
    },
    async listGames(opts) {
      const c = F.collection(db, 'games');
      return (await F.getDocs(opts?.learnerOnly ? F.query(c, F.where('published', '==', true)) : c)).docs.map((d) => d.data() as GameDoc);
    },
    async saveGame(g: GameDoc, ev: AuditEvent) {
      const b = F.writeBatch(db);
      b.set(F.doc(db, 'games', g.gameId), g);
      b.set(auditRef(), ev);
      await b.commit();
    },
    async listAssignments(opts) {
      const c = F.collection(db, 'lessonGameAssignments');
      return (await F.getDocs(opts?.learnerOnly ? F.query(c, F.where('attached', '==', true), F.where('visible', '==', true)) : c)).docs.map((d) => d.data() as LessonGameAssignment);
    },
    async saveAssignment(a: LessonGameAssignment, ev: AuditEvent) {
      const b = F.writeBatch(db);
      b.set(F.doc(db, 'lessonGameAssignments', a.id), a);
      b.set(auditRef(), ev);
      await b.commit();
    },
    async saveAssignments(items: LessonGameAssignment[], ev: AuditEvent) {
      const b = F.writeBatch(db);
      for (const a of items) b.set(F.doc(db, 'lessonGameAssignments', a.id), a);
      b.set(auditRef(), ev);
      await b.commit();
    },
    listAudit: (max = 200) => list<AuditEvent>('auditLogs', max),
  };
}
