/* CMS workflow (Phase 72) — pure functions: who may move an entity to which state,
   what a valid entity looks like, and which audit event each action produces.
   The service and the database (supabase/migrations: cms_transition) both follow these rules. */

import { can } from '../auth/permissions';
import type { Actor, Permission } from '../auth/permissions';
import { parseYouTubeVideoId } from '../video/youtube';
import type { AuditAction, AuditEvent, ContentState, DraftDoc, EntityDataMap, EntityKind, PublishedDoc, VideoData } from './types';
import { CONTENT_STATES, ENTITY_CATEGORY, OVERRIDABLE_FIELDS, VERIFICATION_STATES, VIDEO_PURPOSES } from './types';

export type Transition = 'submit' | 'approve' | 'reject' | 'reopen' | 'publish' | 'unpublish' | 'archive';

const NEED: Record<Transition, Permission> = {
  submit: 'content.submit',
  approve: 'content.review',
  reject: 'content.review',
  reopen: 'content.draft',
  publish: 'content.publish',
  unpublish: 'content.publish',
  archive: 'content.draft',
};

/** Resulting state, or a Thai reason when the transition is not allowed. */
export function transitionResult(actor: Actor, d: DraftDoc, t: Transition, isPublished: boolean): { ok: true; next: ContentState } | { ok: false; reason: string } {
  if (!can(actor, NEED[t])) return { ok: false, reason: 'ไม่มีสิทธิ์ทำขั้นตอนนี้' };
  const controlled = ENTITY_CATEGORY[d.kind] === 'CONTROLLED';
  switch (t) {
    case 'submit':
      return d.state === 'DRAFT' ? { ok: true, next: 'IN_REVIEW' } : { ok: false, reason: 'ส่งตรวจได้เฉพาะฉบับร่าง' };
    case 'approve':
      if (d.state !== 'IN_REVIEW') return { ok: false, reason: 'อนุมัติได้เฉพาะรายการที่รอตรวจ' };
      if (d.updatedBy === actor.uid && controlled) return { ok: false, reason: 'เนื้อหาการเรียนต้องให้คนอื่นตรวจ' };
      return { ok: true, next: 'APPROVED' };
    case 'reject':
      return d.state === 'IN_REVIEW' || d.state === 'APPROVED' ? { ok: true, next: 'REJECTED' } : { ok: false, reason: 'ตีกลับได้เฉพาะรายการที่รอตรวจหรืออนุมัติแล้ว' };
    case 'reopen':
      return d.state === 'REJECTED' || d.state === 'ARCHIVED' ? { ok: true, next: 'DRAFT' } : { ok: false, reason: 'เปิดแก้ใหม่ได้เฉพาะรายการที่ถูกตีกลับหรือเก็บถาวร' };
    case 'publish':
      if (d.state === 'APPROVED') return { ok: true, next: 'PUBLISHED' };
      // safe operational content (videos, resources) may skip review for publishers
      if (!controlled && (d.state === 'DRAFT' || d.state === 'IN_REVIEW')) return { ok: true, next: 'PUBLISHED' };
      return { ok: false, reason: controlled ? 'เนื้อหาการเรียนต้องผ่านการอนุมัติก่อนเผยแพร่' : 'เผยแพร่ไม่ได้จากสถานะนี้' };
    case 'unpublish':
      return isPublished ? { ok: true, next: 'APPROVED' } : { ok: false, reason: 'รายการนี้ยังไม่ได้เผยแพร่' };
    case 'archive':
      if (isPublished && !can(actor, 'content.publish')) return { ok: false, reason: 'ต้องถอนการเผยแพร่ก่อนเก็บถาวร' };
      return d.state === 'ARCHIVED' ? { ok: false, reason: 'เก็บถาวรแล้ว' } : { ok: true, next: 'ARCHIVED' };
  }
}

export const TRANSITION_AUDIT: Record<Transition, AuditAction> = {
  submit: 'CONTENT_SUBMITTED',
  approve: 'CONTENT_APPROVED',
  reject: 'CONTENT_REJECTED',
  reopen: 'CONTENT_REOPENED',
  publish: 'CONTENT_PUBLISHED',
  unpublish: 'CONTENT_UNPUBLISHED',
  archive: 'CONTENT_ARCHIVED',
};

export interface ValidationContext {
  lessonIds: Set<string>;
  /** notYetAllowed phrases per lesson (controlled content may not introduce them) */
  notYet: Map<string, string[]>;
}

const SAFE_HTTPS = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i;

export function validateEntity<K extends EntityKind>(kind: K, data: EntityDataMap[K], ctx: ValidationContext): string[] {
  const e: string[] = [];
  const lessonId = (data as { lessonId?: string }).lessonId;
  if ((!lessonId || !ctx.lessonIds.has(lessonId))) e.push('บทเรียนไม่ถูกต้อง');
  if (kind === 'video') {
    const v = data as VideoData;
    if (!v.title?.trim()) e.push('ต้องมีชื่อคลิป');
    if (!SAFE_HTTPS.test(v.url ?? '')) e.push('ลิงก์ต้องเป็น https ที่ถูกต้อง');
    if (v.provider === 'youtube') {
      const id = parseYouTubeVideoId(v.url ?? '');
      if (!id) e.push('ลิงก์ YouTube ไม่มีรหัสคลิปที่ถูกต้อง');
      else if (v.videoId && v.videoId !== id) e.push('รหัสคลิปไม่ตรงกับลิงก์');
    }
    if (!VIDEO_PURPOSES.includes(v.purpose)) e.push('จุดประสงค์ไม่ถูกต้อง');
    if (!VERIFICATION_STATES.includes(v.verification)) e.push('สถานะการตรวจไม่ถูกต้อง');
    if (v.verification === 'VERIFIED' && (!v.verifiedBy || !v.verifiedAt)) e.push('VERIFIED ต้องระบุผู้ตรวจและเวลาที่ตรวจ');
    if (v.durationSec !== null && !(Number.isInteger(v.durationSec) && v.durationSec > 0)) e.push('ความยาวต้องเป็นวินาทีที่เป็นจำนวนเต็มบวก');
    if (!Number.isInteger(v.order) || v.order < 0) e.push('ลำดับต้องเป็นจำนวนเต็มไม่ติดลบ');
  }
  if (kind === 'resource') {
    const r = data as EntityDataMap['resource'];
    if (!r.title?.trim()) e.push('ต้องมีชื่อแหล่งเรียนรู้');
    if (!SAFE_HTTPS.test(r.url ?? '')) e.push('ลิงก์ต้องเป็น https ที่ถูกต้อง');
    if (r.verification === 'VERIFIED' && (!r.verifiedBy || !r.verifiedAt)) e.push('VERIFIED ต้องระบุผู้ตรวจและเวลาที่ตรวจ');
    if (!Number.isInteger(r.order) || r.order < 0) e.push('ลำดับต้องเป็นจำนวนเต็มไม่ติดลบ');
  }
  if (kind === 'contentOverride') {
    const c = data as EntityDataMap['contentOverride'];
    if (!OVERRIDABLE_FIELDS.includes(c.field)) e.push('แก้ไขช่องนี้ผ่าน CMS ไม่ได้');
    const values = Array.isArray(c.value) ? c.value : [c.value];
    if (!values.length || values.some((x) => typeof x !== 'string' || !x.trim())) e.push('ต้องมีเนื้อหา');
    if (c.field === 'summary' && !Array.isArray(c.value)) e.push('สรุปต้องเป็นรายการ');
    if (!c.reason?.trim()) e.push('ต้องระบุเหตุผลของการแก้ไข');
    for (const n of ctx.notYet.get(c.lessonId) ?? []) if (values.some((x) => x.includes(n))) e.push(`มีเนื้อหาที่บทนี้ยังไม่สอน: ${n}`);
  }
  return e;
}

/** An editor may not mark something VERIFIED unless they hold content.verifySource. */
export function verificationChangeDenied(actor: Actor, before: VideoData | EntityDataMap['resource'] | null, after: VideoData | EntityDataMap['resource']): string | null {
  const was = before?.verification === 'VERIFIED';
  if (after.verification === 'VERIFIED' && !was && !can(actor, 'content.verifySource')) return 'การยืนยันแหล่ง (VERIFIED) ต้องทำโดยผู้ตรวจทาน';
  return null;
}

const SAFE_HTTPS_URL = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i;
/** Learner policy: videos/resources must be VISIBLE + explicitly VERIFIED + safe https; other kinds must not be HIDDEN. */
export function isLearnerVisibleData(kind: EntityKind, data: EntityDataMap[EntityKind]): boolean {
  if (kind === 'video' || kind === 'resource') {
    const d = data as VideoData;
    return d.visibility === 'VISIBLE' && d.verification === 'VERIFIED' && !!d.verifiedBy && !!d.verifiedAt && SAFE_HTTPS_URL.test(d.url);
  }
  return true;
}

export function nextPublished<K extends EntityKind>(d: DraftDoc<K>, prev: PublishedDoc<K> | null, actorUid: string, at: string): PublishedDoc<K> {
  return { id: d.id, kind: d.kind, lessonId: d.lessonId, data: d.data, version: (prev?.version ?? 0) + 1, publishedAt: at, publishedBy: actorUid, previousVersion: prev?.version ?? null, learnerVisible: isLearnerVisibleData(d.kind, d.data) };
}

export function auditEvent(actor: Actor, action: AuditAction, entityType: AuditEvent['entityType'], entityId: string, before: string | null, after: string | null, at: string): AuditEvent {
  const clip = (s: string | null) => (s === null ? null : s.replace(/(ya29\.|AIza|eyJ)[\w.-]+/g, '[redacted]').slice(0, 300));
  return { actorUid: actor.uid, actorRole: actor.role, action, entityType, entityId, before: clip(before), after: clip(after), at };
}

export const isContentState = (s: string): s is ContentState => (CONTENT_STATES as readonly string[]).includes(s);
