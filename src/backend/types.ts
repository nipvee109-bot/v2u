/* Backend abstraction (Phase 72). Two implementations:
   - firebase.ts  — Firebase Auth (Google) + Cloud Firestore (production)
   - memory.ts    — in-memory, DEVELOPMENT/TESTS ONLY (never in production builds)
   Authorization is enforced by Firestore Security Rules in production; the service layer
   applies the same permission engine so the UI gives clear errors before a write. */

import type { AccountStatus, Role } from '../auth/permissions';
import type { AuditEvent, DraftDoc, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile } from '../cms/types';

export interface AuthUserInfo {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export type SignInResult = { ok: true } | { ok: false; reason: 'cancelled' | 'popup-blocked' | 'network' | 'not-configured' | 'error'; message?: string };

export interface CmsBackend {
  kind: 'firebase' | 'memory-dev';
  /* auth */
  onAuthChanged(cb: (u: AuthUserInfo | null) => void): () => void;
  signInWithGoogle(): Promise<SignInResult>;
  signOut(): Promise<void>;
  /* users — role/status always read from the database, never from the browser */
  getProfile(uid: string): Promise<UserProfile | null>;
  /** First login creates a STUDENT/ACTIVE profile; later logins update name/photo/lastLoginAt only */
  upsertOwnProfile(u: AuthUserInfo): Promise<UserProfile>;
  listUsers(): Promise<UserProfile[]>;
  setUserRole(uid: string, role: Role, audit: AuditEvent): Promise<void>;
  setUserStatus(uid: string, status: AccountStatus, audit: AuditEvent): Promise<void>;
  /* CMS */
  listDrafts(): Promise<DraftDoc[]>;
  /** learnerOnly: only learner-visible docs (what rules allow non-staff to read) */
  listPublished(opts?: { learnerOnly?: boolean }): Promise<PublishedDoc[]>;
  listVersions(entityId: string): Promise<PublishedDoc[]>;
  /** Writes the draft and its audit event together */
  saveDraft(d: DraftDoc, audit: AuditEvent): Promise<void>;
  /** Publishes: writes cmsPublished, keeps the previous published copy in cmsVersions, updates the draft state */
  publish(d: DraftDoc, pub: PublishedDoc, previous: PublishedDoc | null, audit: AuditEvent): Promise<void>;
  unpublish(d: DraftDoc, audit: AuditEvent): Promise<void>;
  /* games */
  listGames(opts?: { learnerOnly?: boolean }): Promise<GameDoc[]>;
  saveGame(g: GameDoc, audit: AuditEvent): Promise<void>;
  listAssignments(opts?: { learnerOnly?: boolean }): Promise<LessonGameAssignment[]>;
  saveAssignment(a: LessonGameAssignment, audit: AuditEvent): Promise<void>;
  saveAssignments(list: LessonGameAssignment[], audit: AuditEvent): Promise<void>;
  /* audit */
  listAudit(limit?: number): Promise<AuditEvent[]>;
}
