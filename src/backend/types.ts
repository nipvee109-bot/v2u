/* Backend abstraction (Phase 72B). UI → CmsService → CmsBackend → database.
   Implementations:
   - supabase.ts — Supabase Auth (Google OAuth) + PostgreSQL with Row Level Security (production)
   - memory.ts   — in-memory mirror of the database rules, DEVELOPMENT/TESTS ONLY (never in production builds)
   Operations are semantic (insert draft, transition, verify…) so authorization, workflow and audit
   happen in the database (RLS, guard triggers, SECURITY DEFINER RPCs), not in the browser.
   `by` is the caller as the app knows it; Supabase ignores it (the database identifies the caller
   from the session), the memory mirror uses it to apply the same rules. */

import type { AccountStatus, Actor, Role } from '../auth/permissions';
import type { AuditEvent, ContentState, DraftDoc, EntityDataMap, EntityKind, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile } from '../cms/types';
import type { Transition } from '../cms/workflow';

export interface AuthUserInfo {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export type SignInResult = { ok: true; redirecting?: boolean } | { ok: false; reason: 'cancelled' | 'popup-blocked' | 'network' | 'not-configured' | 'callback' | 'error'; message?: string };

export interface CmsBackend {
  kind: 'supabase' | 'memory-dev';
  /* auth */
  onAuthChanged(cb: (u: AuthUserInfo | null, event?: string) => void): () => void;
  signInWithGoogle(): Promise<SignInResult>;
  signOut(): Promise<void>;
  /** An OAuth error the provider returned in the URL (e.g. the user cancelled), consumed once */
  consumeAuthRedirectError?(): SignInResult | null;
  /* users — role/status always come from the database */
  getProfile(uid: string): Promise<UserProfile | null>;
  /** The database creates the STUDENT/ACTIVE profile on sign-up; this only records the login */
  touchOwnProfile(u: AuthUserInfo): Promise<UserProfile>;
  listUsers(): Promise<UserProfile[]>;
  setUserRole(by: Actor, uid: string, role: Role): Promise<void>;
  setUserStatus(by: Actor, uid: string, status: AccountStatus): Promise<void>;
  /* CMS */
  listDrafts(): Promise<DraftDoc[]>;
  /** learnerOnly: only learner-visible snapshots (what RLS lets learners and guests read) */
  listPublished(opts?: { learnerOnly?: boolean }): Promise<PublishedDoc[]>;
  listVersions(kind: EntityKind, id: string): Promise<PublishedDoc[]>;
  getDraft<K extends EntityKind>(kind: K, id: string): Promise<DraftDoc<K> | null>;
  insertDraft<K extends EntityKind>(by: Actor, kind: K, data: EntityDataMap[K]): Promise<DraftDoc<K>>;
  /** `revision` = the revision the edit is based on; a newer row is refused as stale (never overwritten) */
  updateDraft<K extends EntityKind>(by: Actor, kind: K, id: string, data: EntityDataMap[K], revision: number): Promise<DraftDoc<K>>;
  verifySource(by: Actor, kind: 'video' | 'resource', id: string, revision?: number): Promise<void>;
  transition(by: Actor, kind: EntityKind, id: string, t: Transition, note: string | null, revision?: number): Promise<ContentState>;
  /* games */
  listGames(opts?: { learnerOnly?: boolean }): Promise<GameDoc[]>;
  insertGame(by: Actor, g: GameDoc): Promise<GameDoc>;
  /** Based on `g.revision`; a newer row is refused as stale */
  updateGame(by: Actor, g: GameDoc): Promise<GameDoc>;
  listAssignments(opts?: { learnerOnly?: boolean }): Promise<LessonGameAssignment[]>;
  /** Insert or update by (lessonId, gameId) */
  upsertAssignment(by: Actor, a: LessonGameAssignment): Promise<LessonGameAssignment>;
  /* audit (written by the database; read-only here) */
  listAudit(limit?: number): Promise<AuditEvent[]>;
}
