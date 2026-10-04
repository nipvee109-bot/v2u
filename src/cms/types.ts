/* =========================================================================
   V2U CMS data model (Phase 72, Supabase since 72B).
   CMS content is OPERATIONAL content layered on top of the trusted knowledge
   layer — it never replaces lesson/skill ids, mastery, evidence, review or
   next-step logic. PostgreSQL tables (supabase/migrations, docs/supabase-setup.md):

     profiles                  UserProfile (auth.users is identity only)
     videos / resources        working copies + workflow state (staff only)
     content_overrides         reviewed text overrides (summary/analogy/whyItMatters)
     cms_published             learner snapshots (written only by cms_transition)
     cms_versions              previous published snapshots (recovery, append-only)
     games                     GameDoc
     lesson_game_assignments   LessonGameAssignment
     audit_logs                AuditEvent (database-written, append-only)
   ========================================================================= */

import type { AccountStatus, Role } from '../auth/permissions';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  onboardingCompleted: boolean;
  /** Where this user's learner data lives (local until synced — see migration plan) */
  learnerData: { location: 'local-device' | 'account'; migratedAt?: string };
  schemaVersion: 1;
}

/* ── Workflow ── */
export const CONTENT_STATES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export type ContentState = (typeof CONTENT_STATES)[number];

/** SAFE_OPERATIONAL may be managed directly; CONTROLLED needs review; PROTECTED never comes through the CMS. */
export type ContentCategory = 'SAFE_OPERATIONAL' | 'CONTROLLED';

/* ── Videos / resources ── */
export const VIDEO_PURPOSES = ['FIRST_LEARNING', 'REVIEW', 'PRACTICE_SUPPORT'] as const;
export type VideoPurpose = (typeof VIDEO_PURPOSES)[number];
export const VERIFICATION_STATES = ['DISCOVERED', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'UNAVAILABLE', 'DEPRECATED'] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export interface VideoData {
  lessonId: string;
  title: string;
  provider: 'youtube' | 'vimeo' | 'other';
  url: string;
  videoId: string | null;
  channel: string;
  /** Seconds, only when verified */
  durationSec: number | null;
  purpose: VideoPurpose;
  verification: VerificationState;
  /** Who/when explicitly verified (required for VERIFIED) */
  verifiedBy: string | null;
  verifiedAt: string | null;
  visibility: 'VISIBLE' | 'HIDDEN';
  order: number;
  notes: string;
}

export interface ResourceData {
  lessonId: string;
  title: string;
  description: string;
  url: string;
  publisher: string;
  type: 'article' | 'book' | 'documentation' | 'course' | 'other';
  verification: VerificationState;
  verifiedBy: string | null;
  verifiedAt: string | null;
  visibility: 'VISIBLE' | 'HIDDEN';
  order: number;
}

/** Controlled learning content: an override of ONE allowed field of a lesson (reviewed). */
export const OVERRIDABLE_FIELDS = ['summary', 'analogy', 'whyItMatters'] as const;
export type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];
export interface ContentOverrideData {
  lessonId: string;
  field: OverridableField;
  value: string | string[];
  reason: string;
}

export type EntityKind = 'video' | 'resource' | 'contentOverride';
export interface EntityDataMap {
  video: VideoData;
  resource: ResourceData;
  contentOverride: ContentOverrideData;
}
export const ENTITY_CATEGORY: Record<EntityKind, ContentCategory> = {
  video: 'SAFE_OPERATIONAL',
  resource: 'SAFE_OPERATIONAL',
  contentOverride: 'CONTROLLED',
};

export interface DraftDoc<K extends EntityKind = EntityKind> {
  id: string;
  kind: K;
  lessonId: string | null;
  data: EntityDataMap[K];
  state: ContentState;
  /** Version currently published (0 = never published) */
  publishedVersion: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  reviewNote: string | null;
  /** Reviewer who approved (recorded by the database) */
  approvedBy?: string | null;
}

export interface PublishedDoc<K extends EntityKind = EntityKind> {
  id: string;
  kind: K;
  lessonId: string | null;
  data: EntityDataMap[K];
  version: number;
  publishedAt: string;
  publishedBy: string;
  previousVersion: number | null;
  /** Computed at publish time (videos/resources: VISIBLE + VERIFIED; others: not HIDDEN). Rules re-check it. */
  learnerVisible: boolean;
}

/* ── Games ── */
export const GAME_STATES = ['DRAFT', 'PREPARING', 'READY_FOR_REVIEW', 'AVAILABLE', 'DISABLED', 'ERROR', 'ARCHIVED'] as const;
export type GameState = (typeof GAME_STATES)[number];

export interface GameDoc {
  gameId: string;
  name: string;
  description: string;
  subjects: string[];
  skillIds: string[];
  gameVersion: string;
  contentContract: '1.1';
  evidenceContract: '1.1';
  launchType: 'iframe' | 'external' | 'none';
  /** Same-origin path or https URL; only used when a lesson game is AVAILABLE */
  launchUrl: string;
  thumbnail: string;
  status: GameState;
  enabled: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LessonGameAssignment {
  id: string;
  lessonId: string;
  gameId: string;
  /** Where in the lesson the activity appears */
  position: 'after-guided-practice' | 'after-summary';
  /** false = detached (kept for history; never deleted) */
  attached: boolean;
  visible: boolean;
  required: false; // games are always optional in V2U
  displayTitle: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/* ── Audit ── */
export const AUDIT_ACTIONS = [
  'VIDEO_CREATED', 'VIDEO_UPDATED', 'VIDEO_VERIFIED', 'VIDEO_HIDDEN',
  'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_VERIFIED',
  'GAME_REGISTERED', 'GAME_UPDATED', 'GAME_ATTACHED', 'GAME_DETACHED', 'GAME_ENABLED', 'GAME_DISABLED',
  'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_SUBMITTED', 'CONTENT_APPROVED', 'CONTENT_REJECTED', 'CONTENT_PUBLISHED', 'CONTENT_UNPUBLISHED', 'CONTENT_ARCHIVED', 'CONTENT_REOPENED',
  'ROLE_CHANGED', 'STATUS_CHANGED', 'ORDER_CHANGED', 'SETTINGS_UPDATED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEvent {
  actorUid: string;
  actorRole: Role;
  action: AuditAction;
  entityType: 'video' | 'resource' | 'contentOverride' | 'game' | 'assignment' | 'user' | 'settings';
  entityId: string;
  /** Short human summaries — never tokens or secrets */
  before: string | null;
  after: string | null;
  at: string;
}
