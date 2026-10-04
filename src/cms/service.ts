/* CMS service (Phase 72/72B): every admin action goes through here.
   UX checks first (can → validate → workflow, clear Thai errors), then the backend.
   The database is authoritative: RLS, guard triggers and SECURITY DEFINER RPCs enforce
   the same limits and write the audit log themselves (supabase/migrations). */

import { can, roleChangeDenied, statusChangeDenied } from '../auth/permissions';
import type { AccountStatus, Actor, Permission, Role } from '../auth/permissions';
import type { CmsBackend } from '../backend/types';
import type { DraftDoc, EntityDataMap, EntityKind, GameDoc, LessonGameAssignment, PublishedDoc, VideoData } from './types';
import { transitionResult, validateEntity, verificationChangeDenied } from './workflow';
import type { Transition, ValidationContext } from './workflow';
import { GAME_STATES } from './types';

export class CmsError extends Error {}

/** Database/RPC errors → short Thai messages (never raw internals). */
function friendly(e: unknown): CmsError {
  if (e instanceof CmsError) return e;
  const m = (e as { message?: string })?.message ?? String(e);
  if (/permission denied|row-level security|42501/i.test(m)) return new CmsError(`ไม่มีสิทธิ์ทำรายการนี้ (${m.slice(0, 120)})`);
  if (/check constraint|violates/i.test(m)) return new CmsError('ข้อมูลไม่ผ่านเงื่อนไขของระบบ');
  if (/fetch|network/i.test(m)) return new CmsError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  return new CmsError(m.slice(0, 200));
}

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
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      throw friendly(e);
    }
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
    return this.call(() => this.backend.insertDraft(this.actor, kind, data));
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
    // editing approved/published content makes a new draft (the database does this too)
    return this.call(() => this.backend.updateDraft(this.actor, d.kind, d.id, data));
  }

  /** Explicit source verification (VERIFIED needs a reviewer — entering a URL never verifies it). */
  async verifySource(d: DraftDoc<'video'> | DraftDoc<'resource'>): Promise<void> {
    this.need('content.verifySource');
    await this.call(() => this.backend.verifySource(this.actor, d.kind, d.id));
  }

  async transition(d: DraftDoc, t: Transition, note: string | null, published: PublishedDoc | null) {
    const r = transitionResult(this.actor, d, t, !!published);
    if (!r.ok) throw new CmsError(r.reason);
    if (t === 'publish') {
      const errs = validateEntity(d.kind, d.data, this.ctx);
      if (errs.length) throw new CmsError(errs.join(' · '));
    }
    const next = await this.call(() => this.backend.transition(this.actor, d.kind, d.id, t, note));
    return { ...d, state: next, reviewNote: note ?? d.reviewNote } as DraftDoc;
  }

  /** Store an explicit order for a lesson's items (takes effect for learners when re-published). */
  async reorder(items: DraftDoc[]): Promise<void> {
    this.need('content.draft');
    for (const [i, d] of items.entries()) {
      if (d.kind !== 'video' && d.kind !== 'resource') continue;
      if ((d.data as VideoData).order === i) continue;
      await this.call(() => this.backend.updateDraft(this.actor, d.kind, d.id, { ...(d.data as VideoData), order: i }));
    }
  }

  /** Previous published versions (recovery: restore one as a new draft with updateDraft). */
  async versions(d: DraftDoc) {
    if (!can(this.actor, 'content.draft') && !can(this.actor, 'content.review')) throw new CmsError('ไม่มีสิทธิ์ดูประวัติ');
    return (await this.call(() => this.backend.listVersions(d.kind, d.id))).sort((a, b) => b.version - a.version);
  }

  /* ── games ── */
  async saveGame(g: GameDoc, before: GameDoc | null): Promise<GameDoc> {
    this.need('game.manage');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.gameId)) throw new CmsError('gameId ใช้ได้เฉพาะ a-z 0-9 และ -');
    if (before && before.gameId !== g.gameId) throw new CmsError('gameId แก้ไม่ได้หลังสร้าง');
    if (!GAME_STATES.includes(g.status)) throw new CmsError('สถานะเกมไม่ถูกต้อง');
    if (g.contentContract !== '1.1' || g.evidenceContract !== '1.1') throw new CmsError('รองรับเฉพาะสัญญา GameContent/GameEvidence 1.1');
    if (g.launchUrl && !/^(\/[\w./-]*|https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?)$/i.test(g.launchUrl)) throw new CmsError('launch URL ต้องเป็น path ในเว็บหรือ https');
    return this.call(() => (before ? this.backend.updateGame(this.actor, g) : this.backend.insertGame(this.actor, g)));
  }

  async attachGame(lessonId: string, game: GameDoc, opts: Pick<LessonGameAssignment, 'position' | 'visible' | 'displayTitle' | 'description'>, existing: LessonGameAssignment[]): Promise<LessonGameAssignment> {
    this.need('game.assign');
    if (!this.ctx.lessonIds.has(lessonId)) throw new CmsError('บทเรียนไม่ถูกต้อง');
    const prev = existing.find((a) => a.lessonId === lessonId && a.gameId === game.gameId);
    const a: LessonGameAssignment = { id: prev?.id ?? '', lessonId, gameId: game.gameId, position: opts.position, attached: true, visible: opts.visible, required: false, displayTitle: opts.displayTitle || game.name, description: opts.description, order: prev?.attached ? prev.order : existing.filter((x) => x.lessonId === lessonId && x.attached).length, createdAt: prev?.createdAt ?? '', updatedAt: '', updatedBy: this.actor.uid };
    return this.call(() => this.backend.upsertAssignment(this.actor, a));
  }

  async detachGame(a: LessonGameAssignment): Promise<LessonGameAssignment> {
    this.need('game.assign');
    return this.call(() => this.backend.upsertAssignment(this.actor, { ...a, attached: false, visible: false }));
  }

  async reorderAssignments(list: LessonGameAssignment[]): Promise<void> {
    this.need('game.assign');
    for (const [i, a] of list.entries()) if (a.order !== i) await this.call(() => this.backend.upsertAssignment(this.actor, { ...a, order: i }));
  }

  /* ── users (the database re-checks everything in set_user_role / set_user_status) ── */
  async setRole(target: { uid: string; role: Role }, next: Role, superAdminCount: number) {
    const deny = roleChangeDenied(this.actor, target, next, superAdminCount);
    if (deny) throw new CmsError(deny);
    await this.call(() => this.backend.setUserRole(this.actor, target.uid, next));
  }

  async setStatus(target: { uid: string; role: Role; status: AccountStatus }, next: AccountStatus, activeSuperAdmins: number) {
    const deny = statusChangeDenied(this.actor, target, next, activeSuperAdmins);
    if (deny) throw new CmsError(deny);
    await this.call(() => this.backend.setUserStatus(this.actor, target.uid, next));
  }

  async audit(limit = 200) {
    this.need('audit.view');
    return this.call(() => this.backend.listAudit(limit));
  }
}
