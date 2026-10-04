/* In-memory backend — DEVELOPMENT AND TESTS ONLY (Phase 72B).
   Created only by backend/index.ts under `import.meta.env.DEV && VITE_V2U_DEV_ADMIN=1`
   (absent from production builds) and by unit tests. It mirrors the database rules of
   supabase/migrations (RLS, guard triggers, RPCs, database-written audit) so the admin UI
   behaves the same locally; the real enforcement is the database (npm run test:rls). */

import { can, roleChangeDenied, statusChangeDenied } from '../auth/permissions';
import type { Actor, Permission } from '../auth/permissions';
import type { AuditAction, AuditEvent, DraftDoc, EntityKind, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile, VideoData } from '../cms/types';
import { ENTITY_CATEGORY } from '../cms/types';
import { auditEvent, nextPublished, transitionResult, TRANSITION_AUDIT } from '../cms/workflow';
import type { AuthUserInfo, CmsBackend } from './types';

export interface MemorySeed {
  users?: UserProfile[];
  /** Who is "signed in" when signInWithGoogle() is called */
  signInAs?: AuthUserInfo;
}

class Denied extends Error {}

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
  const now = () => new Date().toISOString();
  let seq = 0;
  const newId = () => `00000000-0000-4000-8000-${(++seq).toString(16).padStart(12, '0')}`;
  // authority = the stored profile, like v2u_current_role(); `by` is only who is calling
  const live = (by: Actor): Actor => {
    const p = users.get(by.uid);
    return p ? { uid: p.uid, role: p.role, status: p.status } : { uid: by.uid, role: 'STUDENT', status: 'DISABLED' };
  };
  const need = (by: Actor, p: Permission) => {
    if (!can(live(by), p)) throw new Denied(`permission denied: ${p}`);
  };
  const log = (by: Actor, action: AuditAction, type: AuditEvent['entityType'], id: string, before: unknown, after: unknown) =>
    audit.push(auditEvent(live(by), action, type, id, before === null || before === undefined ? null : JSON.stringify(before), after === null || after === undefined ? null : JSON.stringify(after), now()));

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
      // like the auth.users trigger: a new identity always gets STUDENT/ACTIVE
      if (!users.has(current.uid)) {
        const at = now();
        users.set(current.uid, { uid: current.uid, displayName: current.displayName, email: current.email, photoURL: current.photoURL, role: 'STUDENT', status: 'ACTIVE', createdAt: at, updatedAt: at, lastLoginAt: at, onboardingCompleted: false, learnerData: { location: 'local-device' }, schemaVersion: 1 });
      }
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
    async touchOwnProfile(u) {
      const p = users.get(u.uid);
      if (!p) throw new Error('profile missing');
      if (p.status !== 'ACTIVE') throw new Denied('inactive account');
      const next = { ...p, lastLoginAt: now(), updatedAt: now() };
      users.set(u.uid, next);
      return clone(next);
    },
    async listUsers() {
      return clone([...users.values()]);
    },
    async setUserRole(by, uid, role) {
      const t = users.get(uid);
      if (!t) throw new Error('not found');
      const deny = roleChangeDenied(live(by), t, role, [...users.values()].filter((u) => u.role === 'SUPER_ADMIN').length);
      if (deny || uid === by.uid) throw new Denied(deny ?? 'you cannot change your own role');
      if (t.role === role) return;
      users.set(uid, { ...t, role, updatedAt: now() });
      log(by, 'ROLE_CHANGED', 'user', uid, t.role, role);
    },
    async setUserStatus(by, uid, status) {
      const t = users.get(uid);
      if (!t) throw new Error('not found');
      const deny = statusChangeDenied(live(by), t, status, [...users.values()].filter((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE').length);
      if (deny) throw new Denied(deny);
      if (t.status === status) return;
      users.set(uid, { ...t, status, updatedAt: now() });
      log(by, 'STATUS_CHANGED', 'user', uid, t.status, status);
    },
    async listDrafts() {
      return clone([...drafts.values()]);
    },
    async listPublished(opts) {
      return clone([...published.values()].filter((p) => !opts?.learnerOnly || p.learnerVisible));
    },
    async listVersions(_kind, id) {
      return clone(versions.filter((v) => v.id === id));
    },
    async insertDraft(by, kind, data) {
      need(by, 'content.draft');
      if ((kind === 'video' || kind === 'resource') && (data as VideoData).verification === 'VERIFIED') throw new Denied('VERIFIED requires an explicit reviewer verification');
      const at = now();
      const clean = kind === 'video' || kind === 'resource' ? { ...data, verifiedBy: null, verifiedAt: null } : data;
      const d = { id: newId(), kind, lessonId: (data as { lessonId: string }).lessonId, data: clean, state: 'DRAFT', publishedVersion: 0, createdAt: at, createdBy: by.uid, updatedAt: at, updatedBy: by.uid, reviewNote: null, approvedBy: null } as DraftDoc<typeof kind>;
      drafts.set(d.id, clone(d));
      log(by, kind === 'video' ? 'VIDEO_CREATED' : kind === 'resource' ? 'RESOURCE_CREATED' : 'CONTENT_CREATED', kind, d.id, null, clean);
      return clone(d);
    },
    async updateDraft(by, kind, id, data) {
      need(by, 'content.draft');
      const d = drafts.get(id);
      if (!d || d.kind !== kind) throw new Error('not found');
      if (d.state === 'ARCHIVED') throw new Denied('archived — reopen it first');
      const prev = d.data as VideoData;
      let next = { ...data } as VideoData;
      if (kind === 'video' || kind === 'resource') {
        if (next.verification === 'VERIFIED' && prev.verification !== 'VERIFIED') throw new Denied('VERIFIED requires an explicit reviewer verification');
        next = { ...next, verifiedBy: prev.verifiedBy, verifiedAt: prev.verifiedAt };
        if (prev.verification === 'VERIFIED' && next.url !== prev.url) next = { ...next, verification: 'VERIFICATION_PENDING', verifiedBy: null, verifiedAt: null };
      }
      const changed = JSON.stringify(next) !== JSON.stringify(prev);
      const onlyOrder = changed && JSON.stringify({ ...next, order: 0 }) === JSON.stringify({ ...prev, order: 0 });
      const state = changed && ['APPROVED', 'PUBLISHED', 'REJECTED'].includes(d.state) ? 'DRAFT' : d.state;
      const out = { ...d, data: next, state, updatedAt: now(), updatedBy: by.uid } as DraftDoc;
      drafts.set(id, clone(out));
      const action: AuditAction = onlyOrder ? 'ORDER_CHANGED' : kind === 'video' ? (prev.visibility === 'VISIBLE' && next.visibility === 'HIDDEN' ? 'VIDEO_HIDDEN' : 'VIDEO_UPDATED') : kind === 'resource' ? 'RESOURCE_UPDATED' : 'CONTENT_UPDATED';
      log(by, action, kind, id, prev, next);
      return clone(out) as DraftDoc<typeof kind>;
    },
    async verifySource(by, kind, id) {
      need(by, 'content.verifySource');
      const d = drafts.get(id);
      if (!d || d.kind !== kind) throw new Error('not found');
      const before = (d.data as VideoData).verification;
      drafts.set(id, { ...d, data: { ...(d.data as VideoData), verification: 'VERIFIED', verifiedBy: by.uid, verifiedAt: now() }, state: d.state === 'PUBLISHED' ? 'DRAFT' : d.state, updatedAt: now(), updatedBy: by.uid });
      log(by, kind === 'video' ? 'VIDEO_VERIFIED' : 'RESOURCE_VERIFIED', kind, id, before, 'VERIFIED');
    },
    async transition(by, kind, id, t, note) {
      const d = drafts.get(id);
      if (!d || d.kind !== kind) throw new Error('not found');
      const pub = published.get(id) ?? null;
      const actor = live(by);
      const r = transitionResult(actor, d, t, !!pub);
      if (!r.ok) throw new Denied(r.reason);
      if (t === 'approve' && ENTITY_CATEGORY[kind] === 'CONTROLLED' && d.createdBy === by.uid) throw new Denied('learning content must be approved by someone else');
      const at = now();
      const next: DraftDoc = { ...d, state: r.next, reviewNote: note ?? d.reviewNote, updatedAt: at, approvedBy: t === 'approve' ? by.uid : d.approvedBy ?? null };
      if (t === 'publish' || t === 'unpublish' || (t === 'archive' && pub)) if (pub) versions.push(clone(pub));
      if (t === 'publish') {
        const p = nextPublished(next, pub, by.uid, at);
        published.set(id, p);
        next.publishedVersion = p.version;
      } else if (t === 'unpublish' || (t === 'archive' && pub)) published.delete(id);
      drafts.set(id, next);
      log(by, TRANSITION_AUDIT[t], kind as EntityKind, id, d.state, r.next);
      return r.next;
    },
    async listGames(opts) {
      return clone([...games.values()].filter((g) => !opts?.learnerOnly || g.published));
    },
    async insertGame(by, g) {
      need(by, 'game.manage');
      if (games.has(g.gameId)) throw new Error('duplicate gameId');
      const at = now();
      const out = { ...g, createdAt: at, updatedAt: at, updatedBy: by.uid };
      games.set(g.gameId, clone(out));
      log(by, 'GAME_REGISTERED', 'game', g.gameId, null, { status: g.status, enabled: g.enabled, published: g.published });
      return clone(out);
    },
    async updateGame(by, g) {
      need(by, 'game.manage');
      const prev = games.get(g.gameId);
      if (!prev) throw new Error('not found');
      const out = { ...g, createdAt: prev.createdAt, updatedAt: now(), updatedBy: by.uid };
      games.set(g.gameId, clone(out));
      log(by, prev.enabled && !g.enabled ? 'GAME_DISABLED' : !prev.enabled && g.enabled ? 'GAME_ENABLED' : 'GAME_UPDATED', 'game', g.gameId, { status: prev.status, enabled: prev.enabled, published: prev.published }, { status: g.status, enabled: g.enabled, published: g.published });
      return clone(out);
    },
    async listAssignments(opts) {
      return clone([...assignments.values()].filter((a) => !opts?.learnerOnly || (a.attached && a.visible)));
    },
    async upsertAssignment(by, a) {
      need(by, 'game.assign');
      if (!games.has(a.gameId)) throw new Error('unknown game');
      const key = `${a.lessonId}__${a.gameId}`;
      const prev = assignments.get(key);
      const at = now();
      const out: LessonGameAssignment = { ...a, id: prev?.id ?? newId(), required: false, createdAt: prev?.createdAt ?? at, updatedAt: at, updatedBy: by.uid };
      assignments.set(key, clone(out));
      const onlyOrder = !!prev && JSON.stringify({ ...prev, order: 0, updatedAt: '', updatedBy: '' }) === JSON.stringify({ ...out, order: 0, updatedAt: '', updatedBy: '' }) && prev.order !== out.order;
      const action: AuditAction = !prev || (!prev.attached && out.attached) ? 'GAME_ATTACHED' : prev.attached && !out.attached ? 'GAME_DETACHED' : onlyOrder ? 'ORDER_CHANGED' : 'GAME_UPDATED';
      log(by, action, 'assignment', out.id, prev && { visible: prev.visible, attached: prev.attached, order: prev.order }, { visible: out.visible, attached: out.attached, order: out.order });
      return clone(out);
    },
    async listAudit(limit = 200) {
      return clone([...audit].reverse().slice(0, limit));
    },
    _dump: () => ({ users: [...users.values()], drafts: [...drafts.values()], published: [...published.values()], versions, games: [...games.values()], assignments: [...assignments.values()], audit }),
  };
}
