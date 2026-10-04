/* In-memory backend — DEVELOPMENT AND TESTS ONLY (Phase 72).
   It is only created by backend/index.ts when import.meta.env.DEV is true AND
   VITE_V2U_DEV_ADMIN=1, so production builds cannot reach it. It mirrors the
   Firestore rules for profile creation (first profile is always STUDENT/ACTIVE). */

import type { AuditEvent, DraftDoc, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile } from '../cms/types';
import type { AuthUserInfo, CmsBackend } from './types';

export interface MemorySeed {
  users?: UserProfile[];
  /** Who is "signed in" when signInWithGoogle() is called */
  signInAs?: AuthUserInfo;
}

export function createMemoryBackend(seed: MemorySeed = {}): CmsBackend & { _dump(): unknown } {
  const users = new Map((seed.users ?? []).map((u) => [u.uid, u]));
  const drafts = new Map<string, DraftDoc>();
  const published = new Map<string, PublishedDoc>();
  const versions: PublishedDoc[] = [];
  const games = new Map<string, GameDoc>();
  const assignments = new Map<string, LessonGameAssignment>();
  const audit: AuditEvent[] = [];
  let current: AuthUserInfo | null = null;
  const listeners = new Set<(u: AuthUserInfo | null) => void>();
  const emit = () => listeners.forEach((l) => l(current));
  const clone = <T,>(x: T): T => structuredClone(x);

  return {
    kind: 'memory-dev',
    onAuthChanged(cb) {
      listeners.add(cb);
      cb(current);
      return () => listeners.delete(cb);
    },
    async signInWithGoogle() {
      if (!seed.signInAs) return { ok: false, reason: 'cancelled' };
      current = seed.signInAs;
      emit();
      return { ok: true };
    },
    async signOut() {
      current = null;
      emit();
    },
    async getProfile(uid) {
      return clone(users.get(uid) ?? null);
    },
    async upsertOwnProfile(u) {
      const now = new Date().toISOString();
      const prev = users.get(u.uid);
      const next: UserProfile = prev
        ? { ...prev, displayName: u.displayName, photoURL: u.photoURL, lastLoginAt: now, updatedAt: now }
        : { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, role: 'STUDENT', status: 'ACTIVE', createdAt: now, updatedAt: now, lastLoginAt: now, onboardingCompleted: false, learnerData: { location: 'local-device' }, schemaVersion: 1 };
      users.set(u.uid, next);
      return clone(next);
    },
    async listUsers() {
      return clone([...users.values()]);
    },
    async setUserRole(uid, role, ev) {
      const u = users.get(uid);
      if (!u) throw new Error('no such user');
      users.set(uid, { ...u, role, updatedAt: ev.at });
      audit.push(ev);
    },
    async setUserStatus(uid, status, ev) {
      const u = users.get(uid);
      if (!u) throw new Error('no such user');
      users.set(uid, { ...u, status, updatedAt: ev.at });
      audit.push(ev);
    },
    async listDrafts() {
      return clone([...drafts.values()]);
    },
    async listPublished(opts) {
      return clone([...published.values()].filter((p) => !opts?.learnerOnly || p.learnerVisible));
    },
    async listVersions(id) {
      return clone(versions.filter((v) => v.id === id));
    },
    async saveDraft(d, ev) {
      drafts.set(d.id, clone(d));
      audit.push(ev);
    },
    async publish(d, pub, previous, ev) {
      if (previous) versions.push(clone(previous));
      published.set(pub.id, clone(pub));
      drafts.set(d.id, clone(d));
      audit.push(ev);
    },
    async unpublish(d, ev) {
      const prev = published.get(d.id);
      if (prev) versions.push(clone(prev));
      published.delete(d.id);
      drafts.set(d.id, clone(d));
      audit.push(ev);
    },
    async listGames(opts) {
      return clone([...games.values()].filter((g) => !opts?.learnerOnly || g.published));
    },
    async saveGame(g, ev) {
      games.set(g.gameId, clone(g));
      audit.push(ev);
    },
    async listAssignments(opts) {
      return clone([...assignments.values()].filter((a) => !opts?.learnerOnly || (a.attached && a.visible)));
    },
    async saveAssignment(a, ev) {
      assignments.set(a.id, clone(a));
      audit.push(ev);
    },
    async saveAssignments(list, ev) {
      for (const a of list) assignments.set(a.id, clone(a));
      audit.push(ev);
    },
    async listAudit(limit = 200) {
      return clone([...audit].reverse().slice(0, limit));
    },
    _dump: () => ({ users: [...users.values()], drafts: [...drafts.values()], published: [...published.values()], versions, games: [...games.values()], assignments: [...assignments.values()], audit }),
  };
}
