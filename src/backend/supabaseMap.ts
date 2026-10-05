/* Row ⇄ app-model mapping for the Supabase backend (Phase 72B). Pure functions (unit-tested).
   Writes include CONTENT columns only — workflow, verification, creator and timestamp
   columns are set by the database (guard triggers / RPCs) and are never sent. */

import type { AccountStatus, Role } from '../auth/permissions';
import type { AuditEvent, ContentOverrideData, ContentState, DraftDoc, EntityDataMap, EntityKind, GameDoc, LessonGameAssignment, PublishedDoc, ResourceData, UserProfile, VideoData } from '../cms/types';

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const sn = (v: unknown) => (v === null || v === undefined ? null : String(v));

export const TABLE: Record<EntityKind, string> = { video: 'videos', resource: 'resources', contentOverride: 'content_overrides' };

export function rowToProfile(r: Row): UserProfile {
  return {
    uid: s(r.id),
    displayName: s(r.display_name),
    email: s(r.email),
    photoURL: sn(r.avatar_url),
    role: r.role as Role,
    status: r.status as AccountStatus,
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
    lastLoginAt: s(r.last_login_at),
    onboardingCompleted: !!r.onboarding_completed,
    learnerData: { location: r.learner_data_location === 'account' ? 'account' : 'local-device' },
    schemaVersion: 1,
  };
}

export function rowToData<K extends EntityKind>(kind: K, r: Row): EntityDataMap[K] {
  if (kind === 'video') {
    const v: VideoData = { lessonId: s(r.lesson_id), title: s(r.title), provider: (r.provider as VideoData['provider']) ?? 'youtube', url: s(r.url), videoId: sn(r.video_id), channel: s(r.channel), durationSec: r.duration_seconds === null || r.duration_seconds === undefined ? null : Number(r.duration_seconds), purpose: r.purpose as VideoData['purpose'], verification: r.verification_status as VideoData['verification'], verifiedBy: sn(r.verified_by), verifiedAt: sn(r.verified_at), visibility: r.visible ? 'VISIBLE' : 'HIDDEN', order: Number(r.sort_order ?? 0), notes: s(r.notes) };
    return v as EntityDataMap[K];
  }
  if (kind === 'resource') {
    const v: ResourceData = { lessonId: s(r.lesson_id), title: s(r.title), description: s(r.description), url: s(r.url), publisher: s(r.publisher), type: (r.resource_type as ResourceData['type']) ?? 'article', verification: r.verification_status as ResourceData['verification'], verifiedBy: sn(r.verified_by), verifiedAt: sn(r.verified_at), visibility: r.visible ? 'VISIBLE' : 'HIDDEN', order: Number(r.sort_order ?? 0) };
    return v as EntityDataMap[K];
  }
  const v: ContentOverrideData = { lessonId: s(r.lesson_id), field: r.field as ContentOverrideData['field'], value: r.value as string | string[], reason: s(r.reason) };
  return v as EntityDataMap[K];
}

/** Content columns only (never state/verified_by/created_by/…). VERIFIED is only set by cms_verify_source. */
export function dataToRow<K extends EntityKind>(kind: K, data: EntityDataMap[K]): Row {
  if (kind === 'video') {
    const v = data as VideoData;
    return { lesson_id: v.lessonId, title: v.title, provider: v.provider, url: v.url, video_id: v.videoId, channel: v.channel, duration_seconds: v.durationSec, purpose: v.purpose, verification_status: v.verification, visible: v.visibility === 'VISIBLE', sort_order: v.order, notes: v.notes };
  }
  if (kind === 'resource') {
    const r = data as ResourceData;
    return { lesson_id: r.lessonId, title: r.title, description: r.description, url: r.url, publisher: r.publisher, resource_type: r.type, verification_status: r.verification, visible: r.visibility === 'VISIBLE', sort_order: r.order };
  }
  const c = data as ContentOverrideData;
  return { lesson_id: c.lessonId, field: c.field, value: c.value, reason: c.reason };
}

export function rowToDraft<K extends EntityKind>(kind: K, r: Row): DraftDoc<K> {
  return { id: s(r.id), kind, lessonId: sn(r.lesson_id), data: rowToData(kind, r), state: r.state as ContentState, publishedVersion: Number(r.published_version ?? 0), createdAt: s(r.created_at), createdBy: s(r.created_by), updatedAt: s(r.updated_at), updatedBy: s(r.updated_by), reviewNote: sn(r.review_note), approvedBy: sn(r.approved_by), revision: Number(r.revision ?? 1) };
}

export function rowToPublished(r: Row): PublishedDoc {
  const kind = r.kind as EntityKind;
  return { id: s(r.entity_id), kind, lessonId: sn(r.lesson_id), data: rowToData(kind, (r.data ?? {}) as Row), version: Number(r.version), publishedAt: s(r.published_at), publishedBy: s(r.published_by), previousVersion: r.previous_version === null || r.previous_version === undefined ? null : Number(r.previous_version), learnerVisible: !!r.learner_visible };
}

export function rowToGame(r: Row): GameDoc {
  return { gameId: s(r.game_id), name: s(r.name), description: s(r.description), subjects: (r.subjects as string[]) ?? [], skillIds: (r.skill_ids as string[]) ?? [], gameVersion: s(r.game_version), contentContract: '1.1', evidenceContract: '1.1', launchType: (r.launch_type as GameDoc['launchType']) ?? 'none', launchUrl: s(r.launch_path), thumbnail: s(r.thumbnail_url), status: r.status as GameDoc['status'], enabled: !!r.enabled, published: !!r.published, createdAt: s(r.created_at), updatedAt: s(r.updated_at), updatedBy: s(r.updated_by), revision: Number(r.revision ?? 1) };
}

export function gameToRow(g: GameDoc): Row {
  return { game_id: g.gameId, name: g.name, description: g.description, subjects: g.subjects, skill_ids: g.skillIds, game_version: g.gameVersion, game_content_contract_version: g.contentContract, game_evidence_contract_version: g.evidenceContract, launch_type: g.launchType, launch_path: g.launchUrl, thumbnail_url: g.thumbnail, status: g.status, enabled: g.enabled, published: g.published };
}

export function rowToAssignment(r: Row): LessonGameAssignment {
  return { id: s(r.id), lessonId: s(r.lesson_id), gameId: s(r.game_id), position: (r.position as LessonGameAssignment['position']) ?? 'after-guided-practice', attached: !!r.attached, visible: !!r.visible, required: false, displayTitle: s(r.display_title), description: s(r.description), order: Number(r.sort_order ?? 0), createdAt: s(r.created_at), updatedAt: s(r.updated_at), updatedBy: s(r.updated_by) };
}

export function assignmentToRow(a: LessonGameAssignment): Row {
  return { lesson_id: a.lessonId, game_id: a.gameId, position: a.position, display_title: a.displayTitle, description: a.description, sort_order: a.order, visible: a.visible, attached: a.attached };
}

export function rowToAudit(r: Row): AuditEvent {
  return { actorUid: s(r.actor_id), actorRole: (r.actor_role as Role) ?? 'STUDENT', action: r.action as AuditEvent['action'], entityType: r.entity_type as AuditEvent['entityType'], entityId: s(r.entity_id), before: sn(r.before_summary), after: sn(r.after_summary), at: s(r.created_at) };
}
