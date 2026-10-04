/* CMS service (Phase 72): every admin action goes through here.
   permission check (can) → validation → workflow → backend write + audit event.
   Firestore rules enforce the same limits server-side; this layer gives clear errors first. */

import { can, roleChangeDenied, statusChangeDenied } from '../auth/permissions';
import type { AccountStatus, Actor, Permission, Role } from '../auth/permissions';
import type { CmsBackend } from '../backend/types';
import type { AuditAction, AuditEvent, DraftDoc, EntityDataMap, EntityKind, GameDoc, LessonGameAssignment, PublishedDoc, VideoData } from './types';
import { auditEvent, nextPublished, transitionResult, TRANSITION_AUDIT, validateEntity, verificationChangeDenied } from './workflow';
import type { Transition, ValidationContext } from './workflow';
import { GAME_STATES } from './types';

export class CmsError extends Error {}

const now = () => new Date().toISOString();
const summary = (x: unknown) => (x === null || x === undefined ? null : JSON.stringify(x).slice(0, 300));
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export class CmsService {
  private backend: CmsBackend;
  private actor: Actor;
  private ctx: ValidationContext;
  constructor(backend: CmsBackend, actor: Actor, ctx: ValidationContext) {
    this.backend = backend;
    this.actor = actor;
    this.ctx = ctx;
  }

  private need(p: Permission) {
    if (!can(this.actor, p)) throw new CmsError('ไม่มีสิทธิ์ทำรายการนี้');
  }
  private ev(action: AuditAction, type: AuditEvent['entityType'], id: string, before: unknown, after: unknown) {
    return auditEvent(this.actor, action, type, id, summary(before), summary(after), now());
  }

  /* ── drafts ── */
  async createDraft<K extends EntityKind>(kind: K, data: EntityDataMap[K]): Promise<DraftDoc<K>> {
    this.need('content.draft');
    const errs = validateEntity(kind, data, this.ctx);
    if (errs.length) throw new CmsError(errs.join(' · '));
    if (kind === 'video' || kind === 'resource') {
      const deny = verificationChangeDenied(this.actor, null, data as VideoData);
      if (deny) throw new CmsError(deny);
    }
    const at = now();
    const d: DraftDoc<K> = { id: newId(kind), kind, lessonId: (data as { lessonId?: string }).lessonId ?? null, data, state: 'DRAFT', publishedVersion: 0, createdAt: at, createdBy: this.actor.uid, updatedAt: at, updatedBy: this.actor.uid, reviewNote: null };
    const action: AuditAction = kind === 'video' ? 'VIDEO_CREATED' : kind === 'resource' ? 'RESOURCE_CREATED' : 'CONTENT_CREATED';
    await this.backend.saveDraft(d, this.ev(action, kind, d.id, null, { title: (data as { title?: string }).title ?? kind }));
    return d;
  }

  async updateDraft<K extends EntityKind>(d: DraftDoc<K>, data: EntityDataMap[K]): Promise<DraftDoc<K>> {
    this.need('content.draft');
    if (d.state === 'ARCHIVED') throw new CmsError('รายการนี้ถูกเก็บถาวร — เปิดแก้ใหม่ก่อน');
    const errs = validateEntity(d.kind, data, this.ctx);
    if (errs.length) throw new CmsError(errs.join(' · '));
    if (d.kind === 'video' || d.kind === 'resource') {
      const deny = verificationChangeDenied(this.actor, d.data as VideoData, data as VideoData);
      if (deny) throw new CmsError(deny);
    }
    // editing a published item makes a new draft; the published copy stays live until re-published
    const next: DraftDoc<K> = { ...d, data, state: d.state === 'PUBLISHED' || d.state === 'APPROVED' || d.state === 'REJECTED' ? 'DRAFT' : d.state, updatedAt: now(), updatedBy: this.actor.uid };
    const hidden = d.kind === 'video' && (d.data as VideoData).visibility === 'VISIBLE' && (data as VideoData).visibility === 'HIDDEN';
    const action: AuditAction = hidden ? 'VIDEO_HIDDEN' : d.kind === 'video' ? 'VIDEO_UPDATED' : d.kind === 'resource' ? 'RESOURCE_UPDATED' : 'CONTENT_UPDATED';
    await this.backend.saveDraft(next, this.ev(action, d.kind, d.id, d.data, data));
    return next;
  }

  /** Explicit source verification (VERIFIED needs a reviewer — entering a URL never verifies it). */
  async verifySource(d: DraftDoc<'video'> | DraftDoc<'resource'>): Promise<DraftDoc> {
    this.need('content.verifySource');
    const data = { ...d.data, verification: 'VERIFIED' as const, verifiedBy: this.actor.uid, verifiedAt: now() };
    const next = { ...d, data, state: d.state === 'PUBLISHED' ? 'DRAFT' : d.state, updatedAt: now(), updatedBy: this.actor.uid } as DraftDoc;
    await this.backend.saveDraft(next, this.ev(d.kind === 'video' ? 'VIDEO_VERIFIED' : 'RESOURCE_UPDATED', d.kind, d.id, d.data.verification, 'VERIFIED'));
    return next;
  }

  async transition(d: DraftDoc, t: Transition, note: string | null, published: PublishedDoc | null): Promise<DraftDoc> {
    const r = transitionResult(this.actor, d, t, !!published);
    if (!r.ok) throw new CmsError(r.reason);
    if (t === 'publish') {
      const errs = validateEntity(d.kind, d.data, this.ctx);
      if (errs.length) throw new CmsError(errs.join(' · '));
    }
    const at = now();
    const next: DraftDoc = { ...d, state: r.next, reviewNote: note ?? d.reviewNote, updatedAt: at, updatedBy: this.actor.uid };
    const ev = this.ev(TRANSITION_AUDIT[t], d.kind, d.id, d.state, r.next);
    if (t === 'publish') {
      const pub = nextPublished(next, published, this.actor.uid, at);
      next.publishedVersion = pub.version;
      await this.backend.publish(next, pub, published, ev);
    } else if (t === 'unpublish' || (t === 'archive' && published)) {
      next.publishedVersion = d.publishedVersion;
      await this.backend.unpublish(next, ev);
    } else await this.backend.saveDraft(next, ev);
    return next;
  }

  /** Store an explicit order for a lesson's items (takes effect for learners when re-published). */
  async reorder(items: DraftDoc[]): Promise<DraftDoc[]> {
    this.need('content.draft');
    const out: DraftDoc[] = [];
    for (const [i, d] of items.entries()) {
      if (d.kind !== 'video' && d.kind !== 'resource') continue;
      const data = { ...(d.data as VideoData), order: i };
      if ((d.data as VideoData).order === i) { out.push(d); continue; }
      const next = { ...d, data, state: d.state === 'PUBLISHED' ? 'DRAFT' : d.state, updatedAt: now(), updatedBy: this.actor.uid } as DraftDoc;
      await this.backend.saveDraft(next, this.ev('ORDER_CHANGED', d.kind, d.id, (d.data as VideoData).order, i));
      out.push(next);
    }
    return out;
  }

  /* ── games ── */
  async saveGame(g: GameDoc, before: GameDoc | null): Promise<GameDoc> {
    this.need('game.manage');
    if (!/^[a-z0-9-]+$/.test(g.gameId)) throw new CmsError('gameId ใช้ได้เฉพาะ a-z 0-9 และ -');
    if (before && before.gameId !== g.gameId) throw new CmsError('gameId แก้ไม่ได้หลังสร้าง');
    if (!GAME_STATES.includes(g.status)) throw new CmsError('สถานะเกมไม่ถูกต้อง');
    if (g.contentContract !== '1.1' || g.evidenceContract !== '1.1') throw new CmsError('รองรับเฉพาะสัญญา GameContent/GameEvidence 1.1');
    if (g.launchUrl && !/^(\/[\w./-]*|https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?)$/i.test(g.launchUrl)) throw new CmsError('launch URL ต้องเป็น path ในเว็บหรือ https');
    const next = { ...g, updatedAt: now(), updatedBy: this.actor.uid, createdAt: before?.createdAt ?? now() };
    const action: AuditAction = !before ? 'GAME_REGISTERED' : before.enabled && !g.enabled ? 'GAME_DISABLED' : !before.enabled && g.enabled ? 'GAME_ENABLED' : 'GAME_UPDATED';
    await this.backend.saveGame(next, this.ev(action, 'game', g.gameId, before && { status: before.status, enabled: before.enabled, published: before.published }, { status: g.status, enabled: g.enabled, published: g.published }));
    return next;
  }

  async attachGame(lessonId: string, game: GameDoc, opts: Pick<LessonGameAssignment, 'position' | 'visible' | 'displayTitle' | 'description'>, existing: LessonGameAssignment[]): Promise<LessonGameAssignment> {
    this.need('game.assign');
    if (!this.ctx.lessonIds.has(lessonId)) throw new CmsError('บทเรียนไม่ถูกต้อง');
    const prev = existing.find((a) => a.lessonId === lessonId && a.gameId === game.gameId);
    const at = now();
    const a: LessonGameAssignment = { id: `${lessonId}__${game.gameId}`, lessonId, gameId: game.gameId, position: opts.position, attached: true, visible: opts.visible, required: false, displayTitle: opts.displayTitle || game.name, description: opts.description, order: prev?.order ?? existing.filter((x) => x.lessonId === lessonId && x.attached).length, createdAt: prev?.createdAt ?? at, updatedAt: at, updatedBy: this.actor.uid };
    await this.backend.saveAssignment(a, this.ev(prev?.attached ? 'GAME_UPDATED' : 'GAME_ATTACHED', 'assignment', a.id, prev && { visible: prev.visible, attached: prev.attached }, { visible: a.visible, attached: true }));
    return a;
  }

  async detachGame(a: LessonGameAssignment): Promise<LessonGameAssignment> {
    this.need('game.assign');
    const next = { ...a, attached: false, visible: false, updatedAt: now(), updatedBy: this.actor.uid };
    await this.backend.saveAssignment(next, this.ev('GAME_DETACHED', 'assignment', a.id, { attached: true }, { attached: false }));
    return next;
  }

  async reorderAssignments(list: LessonGameAssignment[]): Promise<LessonGameAssignment[]> {
    this.need('game.assign');
    const next = list.map((a, i) => ({ ...a, order: i, updatedAt: now(), updatedBy: this.actor.uid }));
    await this.backend.saveAssignments(next, this.ev('ORDER_CHANGED', 'assignment', next[0]?.lessonId ?? '', list.map((a) => a.gameId), next.map((a) => a.gameId)));
    return next;
  }

  /* ── users ── */
  async setRole(target: { uid: string; role: Role }, next: Role, superAdminCount: number) {
    const deny = roleChangeDenied(this.actor, target, next, superAdminCount);
    if (deny) throw new CmsError(deny);
    await this.backend.setUserRole(target.uid, next, this.ev('ROLE_CHANGED', 'user', target.uid, target.role, next));
  }

  async setStatus(target: { uid: string; role: Role; status: AccountStatus }, next: AccountStatus, activeSuperAdmins: number) {
    const deny = statusChangeDenied(this.actor, target, next, activeSuperAdmins);
    if (deny) throw new CmsError(deny);
    await this.backend.setUserStatus(target.uid, next, this.ev('STATUS_CHANGED', 'user', target.uid, target.status, next));
  }

  /** Previous published versions (recovery: restore one as a new draft with updateDraft). */
  async versions(id: string) {
    if (!can(this.actor, 'content.draft') && !can(this.actor, 'content.review')) throw new CmsError('ไม่มีสิทธิ์ดูประวัติ');
    return (await this.backend.listVersions(id)).sort((a, b) => b.version - a.version);
  }

  async audit(limit = 200) {
    this.need('audit.view');
    return this.backend.listAudit(limit);
  }
}
