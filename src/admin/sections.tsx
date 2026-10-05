/* Admin sections (Phase 72). Lesson/skill ids are read-only everywhere: the CMS only
   layers operational content (videos, resources, game assignments, reviewed text
   overrides) on top of the trusted curriculum. */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ACCOUNT_STATUSES, can, ROLE_LABEL, ROLES, roleChangeDenied, statusChangeDenied } from '../auth/permissions';
import type { AccountStatus, Role } from '../auth/permissions';
import { CURRICULUM } from '../curriculum/data';
import { GAME_REGISTRY } from '../learning/games/registry';
import { effectiveGameAvailability, isLearnerVisible, learnerResources } from '../cms/resolver';
import { isLearnerVisibleData, transitionResult } from '../cms/workflow';
import type { Transition } from '../cms/workflow';
import { GAME_STATES, OVERRIDABLE_FIELDS, VIDEO_PURPOSES } from '../cms/types';
import type { DraftDoc, GameDoc, GameState, OverridableField, PublishedDoc, ResourceData, VideoData, VideoPurpose } from '../cms/types';
import { parseYouTubeVideoId } from '../video/youtube';
import type { AdminCtx } from './AdminApp';
import { btnDanger, btnLine, btnPrimary, Field, field, move, panel, StateBadge, UpDown } from './ui';

const LESSONS = CURRICULUM.lessons;
const lessonTitle = (id: string | null) => LESSONS.find((l) => l.id === id)?.title ?? id ?? '—';
const H1 = ({ children }: { children: React.ReactNode }) => <h1 className="mb-3 font-display text-2xl font-bold">{children}</h1>;
const PURPOSE_LABEL: Record<VideoPurpose, string> = { FIRST_LEARNING: 'เรียนครั้งแรก', REVIEW: 'ทบทวน', PRACTICE_SUPPORT: 'ช่วยฝึก' };
const TRANSITION_LABEL: Record<Transition, string> = { submit: 'ส่งตรวจ', approve: 'อนุมัติ', reject: 'ตีกลับ', reopen: 'เปิดแก้ใหม่', publish: 'เผยแพร่', unpublish: 'ถอนการเผยแพร่', archive: 'เก็บถาวร' };
const DANGEROUS: Transition[] = ['unpublish', 'archive', 'reject'];
const pubOf = (c: AdminCtx, id: string) => c.data.published.find((p) => p.id === id) ?? null;

function Table({ caption, head, children }: { caption: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{head.map((h) => <th key={h} scope="col" className="border-b border-[var(--line)] p-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── Dashboard: real counts only ── */
export function DashboardSection({ c }: { c: AdminCtx }) {
  const d = c.data;
  const stats: [string, number][] = [
    ['บทเรียนในหลักสูตร', LESSONS.length],
    ['ร่างทั้งหมด', d.drafts.length],
    ['รอตรวจ', d.drafts.filter((x) => x.state === 'IN_REVIEW').length],
    ['เผยแพร่แล้ว', d.published.length],
    ['วิดีโอที่ยืนยันแล้ว', d.drafts.filter((x) => x.kind === 'video' && (x.data as VideoData).verification === 'VERIFIED').length],
    ['เกมที่ลงทะเบียน', d.games.length],
    ['เกมที่ผูกกับบทเรียน', d.assignments.filter((a) => a.attached).length],
    ...(c.allowed('users.view') ? ([['ผู้ใช้', d.users.length]] as [string, number][]) : []),
  ];
  return (
    <section aria-labelledby="dash-h">
      <H1><span id="dash-h">ภาพรวม</span></H1>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <li key={k} className={panel}>
            <span className="block text-xs text-[var(--ink-2)]">{k}</span>
            <span className="font-display text-2xl font-bold" data-stat={k}>{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-[var(--ink-2)]">ผู้ดูแลแก้ไขได้เฉพาะเนื้อหาเชิงปฏิบัติการ (วิดีโอ แหล่งเรียนรู้ เกม ข้อความที่ผ่านการตรวจ) — ผลการเรียน ความเชี่ยวชาญ ผลวินิจฉัย และตารางทบทวนของผู้เรียนแก้จากหน้านี้ไม่ได้</p>
    </section>
  );
}

/* ── Lessons ── */
export function LessonsSection({ c }: { c: AdminCtx }) {
  const [q, setQ] = useState('');
  const rows = LESSONS.filter((l) => !q || `${l.id} ${l.title}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section>
      <H1>บทเรียน</H1>
      <div className="mb-3 max-w-sm"><Field label="ค้นหาบทเรียน"><input className={field} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
      <Table caption="รายการบทเรียน" head={['รหัสบทเรียน', 'ชื่อ', 'วิชา', 'สื่อ CMS', 'เกม', '']}>
        {rows.map((l) => (
          <tr key={l.id} className="border-b border-[var(--line)]">
            <td className="p-2 font-mono text-xs">{l.id}</td>
            <td className="p-2">{l.title}</td>
            <td className="p-2">{l.subjectId}</td>
            <td className="p-2">{c.data.drafts.filter((d) => d.lessonId === l.id).length}</td>
            <td className="p-2">{c.data.assignments.filter((a) => a.lessonId === l.id && a.attached).length}</td>
            <td className="p-2"><Link className={btnLine} to={`/admin/lessons/${l.id}`}>จัดการ<span className="sr-only"> {l.title}</span></Link></td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

export function LessonDetail({ c, lessonId }: { c: AdminCtx; lessonId: string }) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  const attached = c.data.assignments.filter((a) => a.lessonId === lessonId && a.attached).sort((a, b) => a.order - b.order);
  const [gameId, setGameId] = useState('');
  const [title, setTitle] = useState('');
  const [visible, setVisible] = useState(false);
  if (!lesson) return <p>ไม่พบบทเรียน</p>;
  const integration = GAME_REGISTRY.find((g) => g.lessonIds.includes(lessonId))?.status ?? 'NOT_AVAILABLE';
  const effective = effectiveGameAvailability(lessonId, integration, c.data.games, c.data.assignments);
  const canAssign = c.allowed('game.assign');
  const preview = learnerResources(c.data.published.filter((p) => p.lessonId === lessonId));
  return (
    <section className="flex flex-col gap-4">
      <H1>{lesson.title}</H1>
      <dl className={`${panel} grid gap-2 text-sm sm:grid-cols-2`}>
        <div><dt className="font-semibold">รหัสบทเรียน (แก้ไม่ได้)</dt><dd><input readOnly aria-readonly className={`${field} font-mono`} value={lesson.id} aria-label="รหัสบทเรียน" /></dd></div>
        <div><dt className="font-semibold">รหัสทักษะ (แก้ไม่ได้)</dt><dd className="font-mono text-xs">{lesson.skillIds.join(', ')}</dd></div>
      </dl>

      <div className={panel}>
        <h2 className="mb-2 text-lg font-bold">กิจกรรมเกม</h2>
        <p className="mb-2 text-sm">สถานะที่ผู้เรียนเห็น: <StateBadge value={effective} /> · การเชื่อมต่อในระบบ: <StateBadge value={integration} /></p>
        <p className="mb-2 text-xs text-[var(--ink-2)]">เกมเปิดให้เล่นได้เฉพาะเมื่อทั้ง CMS และการเชื่อมต่อในระบบพร้อม — เนื้อหาเกม (GameContent) มาจากตัวแปลงของ V2U เสมอ เกมเป็นกิจกรรมเสริม ไม่บังคับ</p>
        {attached.length === 0 ? <p className="text-sm">ยังไม่มีเกมในบทนี้</p> : (
          <ol className="flex flex-col gap-2">
            {attached.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] p-2">
                <span className="min-w-0 flex-1">{a.displayTitle} <span className="font-mono text-xs">({a.gameId})</span> {a.visible ? <StateBadge value="VISIBLE" /> : <StateBadge value="HIDDEN" />}</span>
                {canAssign && (
                  <>
                    <UpDown label={a.displayTitle} index={i} count={attached.length} onMove={(f, t) => void c.act('เปลี่ยนลำดับ', () => c.svc.reorderAssignments(move(attached, f, t)))} />
                    <button type="button" className={btnLine} onClick={() => { const g = c.data.games.find((x) => x.gameId === a.gameId); if (g) void c.act(a.visible ? 'ซ่อนเกม' : 'แสดงเกม', () => c.svc.attachGame(lessonId, g, { position: a.position, visible: !a.visible, displayTitle: a.displayTitle, description: a.description }, c.data.assignments)); }}>{a.visible ? 'ซ่อน' : 'แสดง'}</button>
                    <button type="button" className={btnDanger} onClick={() => c.confirm({ title: 'นำเกมออกจากบทเรียน?', body: `นำ "${a.displayTitle}" ออกจากบท ${lesson.title} (ประวัติยังเก็บไว้)`, confirmLabel: 'นำออก', danger: true, run: () => c.act('นำเกมออก', () => c.svc.detachGame(a)) })}>นำออก</button>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
        {canAssign && (
          <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const g = c.data.games.find((x) => x.gameId === gameId); if (!g) return; void c.act('เพิ่มกิจกรรมเกม', () => c.svc.attachGame(lessonId, g, { position: 'after-guided-practice', visible, displayTitle: title, description: '' }, c.data.assignments)); }}>
            <Field label="เกม">
              <select className={field} value={gameId} onChange={(e) => setGameId(e.target.value)} required>
                <option value="">เลือกเกม</option>
                {c.data.games.filter((g) => g.status !== 'ARCHIVED').map((g) => <option key={g.gameId} value={g.gameId}>{g.name} ({g.status})</option>)}
              </select>
            </Field>
            <Field label="ชื่อที่ผู้เรียนเห็น (ไม่ใส่ = ชื่อเกม)"><input className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> แสดงให้ผู้เรียนเห็น</label>
            <button type="submit" className={btnPrimary} disabled={!gameId}>เพิ่มกิจกรรมเกม</button>
          </form>
        )}
      </div>

      <div className={panel}>
        <h2 className="mb-2 text-lg font-bold">มุมมองผู้เรียน — สื่อจาก CMS ที่เผยแพร่แล้ว</h2>
        {preview.length === 0 ? <p className="text-sm">ยังไม่มีสื่อจาก CMS ที่ผู้เรียนเห็นในบทนี้</p> : (
          <ol className="list-decimal pl-5 text-sm" data-preview-list>{preview.map((r) => <li key={r.id}>{r.title} — {r.provider}</li>)}</ol>
        )}
        <Link className="mt-2 inline-block text-sm underline" to={`/admin/videos?lesson=${lessonId}`}>จัดการวิดีโอ/แหล่งเรียนรู้ของบทนี้</Link>
      </div>
    </section>
  );
}

/* ── Videos & resources ── */
const emptyVideo = (lessonId: string): VideoData => ({ lessonId, title: '', provider: 'youtube', url: '', videoId: null, channel: '', durationSec: null, purpose: 'FIRST_LEARNING', verification: 'DISCOVERED', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 0, notes: '' });

export function VideosSection({ c }: { c: AdminCtx }) {
  const [sp, setSp] = useSearchParams();
  const lessonId = sp.get('lesson') ?? LESSONS[0].id;
  const items = c.data.drafts.filter((d) => (d.kind === 'video' || d.kind === 'resource') && d.lessonId === lessonId && d.state !== 'ARCHIVED').sort((a, b) => (a.data as VideoData).order - (b.data as VideoData).order);
  const [form, setForm] = useState<VideoData>(() => emptyVideo(lessonId));
  const [previewId, setPreviewId] = useState<string | null>(null);
  const canDraft = c.allowed('content.draft');
  const set = <K extends keyof VideoData>(k: K, v: VideoData[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section className="flex flex-col gap-4">
      <H1>วิดีโอ / แหล่งเรียนรู้</H1>
      <div className="max-w-md">
        <Field label="บทเรียน">
          <select className={field} value={lessonId} onChange={(e) => { setSp({ lesson: e.target.value }); setForm(emptyVideo(e.target.value)); }}>
            {LESSONS.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </Field>
      </div>
      <p className="text-sm text-[var(--ink-2)]">การใส่ลิงก์ไม่ได้ทำให้คลิป “ยืนยันแล้ว” — ผู้ตรวจทานต้องเปิดดูและกดยืนยันเอง ผู้เรียนเห็นเฉพาะรายการที่เผยแพร่ แสดงอยู่ และยืนยันแล้ว</p>

      {items.length === 0 ? <p className={panel}>ยังไม่มีรายการในบทนี้</p> : (
        <ol className="flex flex-col gap-2" aria-label="ลำดับสื่อของบทเรียน">
          {items.map((d, i) => {
            const v = d.data as VideoData | ResourceData;
            const pub = pubOf(c, d.id);
            return (
              <li key={d.id} className={`${panel} flex flex-col gap-2`} data-cms-item={d.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 font-semibold">{i + 1}. {v.title}</span>
                  <StateBadge value={d.state} /> <StateBadge value={v.verification} /> <StateBadge value={v.visibility} />
                  {d.kind === 'video' && <span className="text-xs">{PURPOSE_LABEL[(v as VideoData).purpose]}</span>}
                </div>
                <span className="break-all font-mono text-xs">{v.url}</span>
                <div className="flex flex-wrap gap-2">
                  {canDraft && <UpDown label={v.title} index={i} count={items.length} onMove={(f, t) => void c.act('เปลี่ยนลำดับ', () => c.svc.reorder(move(items, f, t)))} />}
                  {c.allowed('content.verifySource') && v.verification !== 'VERIFIED' && (
                    <button type="button" className={btnLine} onClick={() => c.confirm({ title: 'ยืนยันแหล่งนี้?', body: 'ยืนยันว่าเปิดดูแล้ว เนื้อหาตรงบทเรียน ถูกต้อง และเข้าถึงได้จริง', confirmLabel: 'ยืนยันแล้ว', run: () => c.act('ยืนยันแหล่ง', () => c.svc.verifySource(d as DraftDoc<'video'>)) })}>ยืนยันแหล่ง</button>
                  )}
                  {canDraft && (
                    <button type="button" className={btnLine} onClick={() => {
                      const next = { ...v, visibility: v.visibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE' } as VideoData;
                      const run = () => c.act(next.visibility === 'HIDDEN' ? 'ซ่อนรายการ' : 'แสดงรายการ', () => c.svc.updateDraft(d as DraftDoc<'video'>, next));
                      if (next.visibility === 'HIDDEN') c.confirm({ title: 'ซ่อนรายการนี้?', body: 'ผู้เรียนจะไม่เห็นรายการนี้หลังเผยแพร่ใหม่', confirmLabel: 'ซ่อน', danger: true, run });
                      else void run();
                    }}>{v.visibility === 'VISIBLE' ? 'ซ่อน' : 'แสดง'}</button>
                  )}
                  <TransitionButtons c={c} d={d} pub={pub} />
                  <button type="button" className={btnLine} aria-expanded={previewId === d.id} onClick={() => setPreviewId(previewId === d.id ? null : d.id)}>มุมมองผู้เรียน</button>
                </div>
                {previewId === d.id && (
                  <div className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm" data-learner-preview>
                    {isLearnerVisibleData(d.kind, d.data) ? (
                      <>
                        <p className="font-semibold">{v.title}</p>
                        <p className="text-xs">{d.kind === 'video' ? (v as VideoData).channel : (v as ResourceData).publisher}</p>
                        <p className="mt-1 text-xs">{pub?.learnerVisible ? 'ผู้เรียนเห็นรายการนี้อยู่ (ฉบับที่เผยแพร่)' : 'จะเห็นเมื่อเผยแพร่'}</p>
                      </>
                    ) : (
                      <p>ผู้เรียนจะไม่เห็นรายการนี้ — {v.visibility !== 'VISIBLE' ? 'ซ่อนอยู่' : 'ยังไม่ได้ยืนยันแหล่ง'}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {canDraft && (
        <form className={`${panel} grid gap-3 md:grid-cols-2`} aria-labelledby="new-video-h" onSubmit={(e) => {
          e.preventDefault();
          const videoId = form.provider === 'youtube' ? parseYouTubeVideoId(form.url) : null;
          void c.act('เพิ่มวิดีโอ', async () => { await c.svc.createDraft('video', { ...form, lessonId, videoId, order: items.length }); setForm(emptyVideo(lessonId)); });
        }}>
          <h2 id="new-video-h" className="text-lg font-bold md:col-span-2">เพิ่มวิดีโอ</h2>
          <Field label="ชื่อคลิป"><input className={field} value={form.title} onChange={(e) => set('title', e.target.value)} required /></Field>
          <Field label="ลิงก์ (https)"><input className={field} type="url" inputMode="url" value={form.url} onChange={(e) => set('url', e.target.value)} required /></Field>
          <Field label="ผู้ให้บริการ">
            <select className={field} value={form.provider} onChange={(e) => set('provider', e.target.value as VideoData['provider'])}>
              <option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="other">อื่น ๆ</option>
            </select>
          </Field>
          <Field label="ช่อง / ผู้สอน"><input className={field} value={form.channel} onChange={(e) => set('channel', e.target.value)} /></Field>
          <Field label="จุดประสงค์">
            <select className={field} value={form.purpose} onChange={(e) => set('purpose', e.target.value as VideoPurpose)}>
              {VIDEO_PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="สถานะการตรวจ" hint="VERIFIED ทำได้ผ่านปุ่ม “ยืนยันแหล่ง” เท่านั้น">
            <select className={field} value={form.verification} onChange={(e) => set('verification', e.target.value as VideoData['verification'])}>
              {(['DISCOVERED', 'VERIFICATION_PENDING'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="หมายเหตุ"><textarea className={`${field} py-2`} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          <div className="flex items-end"><button type="submit" className={btnPrimary}>บันทึกเป็นฉบับร่าง</button></div>
        </form>
      )}
    </section>
  );
}

// Publishing a hidden or unverified video/resource succeeds but stays invisible to learners — say so.
const publishBody = (d: DraftDoc) =>
  isLearnerVisibleData(d.kind, d.data)
    ? 'ผู้เรียนจะเห็นฉบับนี้ทันที (ฉบับก่อนหน้าเก็บไว้ในประวัติ)'
    : `เผยแพร่ได้ แต่ผู้เรียนจะยังไม่เห็น — ${(d.data as VideoData).visibility !== 'VISIBLE' ? 'ซ่อนอยู่' : 'ยังไม่ได้ยืนยันแหล่ง'}`;

function TransitionButtons({ c, d, pub }: { c: AdminCtx; d: DraftDoc; pub: PublishedDoc | null }) {
  const actor = { uid: c.me.uid, role: c.me.role, status: c.me.status };
  const ts = (['submit', 'approve', 'reject', 'publish', 'unpublish', 'reopen', 'archive'] as Transition[]).filter((t) => transitionResult(actor, d, t, !!pub).ok);
  return (
    <>
      {ts.map((t) => {
        const run = () => c.act(TRANSITION_LABEL[t], () => c.svc.transition(d, t, null, pub));
        return (
          <button key={t} type="button" className={DANGEROUS.includes(t) ? btnDanger : t === 'publish' ? btnPrimary : btnLine} onClick={() => DANGEROUS.includes(t) || t === 'publish' ? c.confirm({ title: `${TRANSITION_LABEL[t]}?`, body: t === 'publish' ? publishBody(d) : 'ยืนยันการทำรายการนี้', confirmLabel: TRANSITION_LABEL[t], danger: DANGEROUS.includes(t), run }) : void run()}>
            {TRANSITION_LABEL[t]}
          </button>
        );
      })}
    </>
  );
}

/* ── Games ── */
const emptyGame = (): GameDoc => ({ gameId: '', name: '', description: '', subjects: [], skillIds: [], gameVersion: '0.1.0', contentContract: '1.1', evidenceContract: '1.1', launchType: 'none', launchUrl: '', thumbnail: '', status: 'DRAFT', enabled: false, published: false, createdAt: '', updatedAt: '', updatedBy: '' });

export function GamesSection({ c }: { c: AdminCtx }) {
  const [form, setForm] = useState<GameDoc>(emptyGame);
  const canManage = c.allowed('game.manage');
  const save = (g: GameDoc, before: GameDoc | null, label: string) => c.act(label, () => c.svc.saveGame(g, before));
  return (
    <section className="flex flex-col gap-4">
      <H1>เกม</H1>
      <p className="text-sm text-[var(--ink-2)]">การลงทะเบียนเกมที่นี่ไม่ได้สร้างเกม — ทีมเกมพัฒนาแยก และเกมจะเปิดเล่นได้เมื่อการเชื่อมต่อในระบบ V2U พร้อมด้วยเท่านั้น</p>
      <Table caption="เกมที่ลงทะเบียน" head={['gameId', 'ชื่อ', 'สถานะ', 'เปิดใช้', 'เผยแพร่', 'การเชื่อมต่อ', 'จัดการ']}>
        {c.data.games.map((g) => (
          <tr key={g.gameId} className="border-b border-[var(--line)]">
            <td className="p-2 font-mono text-xs">{g.gameId}</td>
            <td className="p-2">{g.name}</td>
            <td className="p-2">
              {canManage ? (
                <select aria-label={`สถานะของ ${g.name}`} className={field} value={g.status} onChange={(e) => void save({ ...g, status: e.target.value as GameState }, g, 'เปลี่ยนสถานะเกม')}>
                  {GAME_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : <StateBadge value={g.status} />}
            </td>
            <td className="p-2">{g.enabled ? 'ใช่' : 'ไม่'}</td>
            <td className="p-2">{g.published ? 'ใช่' : 'ไม่'}</td>
            <td className="p-2"><StateBadge value={GAME_REGISTRY.find((r) => r.gameId === g.gameId)?.status ?? 'NOT_INTEGRATED'} /></td>
            <td className="p-2">
              {canManage && (
                <span className="flex flex-wrap gap-1">
                  <button type="button" className={g.enabled ? btnDanger : btnLine} onClick={() => g.enabled ? c.confirm({ title: 'ปิดใช้เกมนี้?', body: `ผู้เรียนจะเปิด ${g.name} ไม่ได้`, confirmLabel: 'ปิดใช้', danger: true, run: () => save({ ...g, enabled: false }, g, 'ปิดใช้เกม') }) : void save({ ...g, enabled: true }, g, 'เปิดใช้เกม')}>{g.enabled ? 'ปิดใช้' : 'เปิดใช้'}</button>
                  <button type="button" className={btnLine} onClick={() => void save({ ...g, published: !g.published }, g, g.published ? 'ซ่อนเกม' : 'เผยแพร่ข้อมูลเกม')}>{g.published ? 'ซ่อน' : 'เผยแพร่'}</button>
                </span>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {canManage && (
        <form className={`${panel} grid gap-3 md:grid-cols-2`} aria-labelledby="new-game-h" onSubmit={(e) => { e.preventDefault(); void c.act('ลงทะเบียนเกม', async () => { await c.svc.saveGame(form, null); setForm(emptyGame()); }); }}>
          <h2 id="new-game-h" className="text-lg font-bold md:col-span-2">ลงทะเบียนเกม</h2>
          <Field label="gameId (แก้ไม่ได้หลังสร้าง)" hint="a-z 0-9 -"><input className={`${field} font-mono`} value={form.gameId} onChange={(e) => setForm({ ...form, gameId: e.target.value.trim() })} required pattern="[a-z0-9-]+" /></Field>
          <Field label="ชื่อเกม"><input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="คำอธิบาย"><input className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="เวอร์ชันเกม"><input className={field} value={form.gameVersion} onChange={(e) => setForm({ ...form, gameVersion: e.target.value })} /></Field>
          <Field label="วิธีเปิดเกม">
            <select className={field} value={form.launchType} onChange={(e) => setForm({ ...form, launchType: e.target.value as GameDoc['launchType'] })}>
              <option value="none">ยังไม่มี</option><option value="iframe">ฝังในหน้า</option><option value="external">ลิงก์ภายนอก</option>
            </select>
          </Field>
          <Field label="Launch URL" hint="path ในเว็บ หรือ https เท่านั้น"><input className={field} value={form.launchUrl} onChange={(e) => setForm({ ...form, launchUrl: e.target.value })} /></Field>
          <p className="text-xs text-[var(--ink-2)] md:col-span-2">สัญญาข้อมูล: GameContent 1.1 · GameEvidence 1.1</p>
          <div><button type="submit" className={btnPrimary}>ลงทะเบียน</button></div>
        </form>
      )}
    </section>
  );
}

/* ── Publishing queue + controlled content ── */
export function PublishingSection({ c }: { c: AdminCtx }) {
  const [filter, setFilter] = useState<string>('IN_REVIEW');
  const rows = c.data.drafts.filter((d) => filter === 'ALL' || d.state === filter);
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  const [fieldName, setFieldName] = useState<OverridableField>('whyItMatters');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<{ id: string; list: PublishedDoc[] } | null>(null);
  return (
    <section className="flex flex-col gap-4">
      <H1>การเผยแพร่</H1>
      <div className="max-w-xs">
        <Field label="สถานะ">
          <select className={field} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'ทั้งหมด' : s}</option>)}
          </select>
        </Field>
      </div>
      {rows.length === 0 ? <p className={panel}>ไม่มีรายการ</p> : (
        <ul className="flex flex-col gap-2">
          {rows.map((d) => (
            <li key={d.id} className={`${panel} flex flex-col gap-2`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-semibold">{(d.data as { title?: string }).title ?? `${d.kind}: ${(d.data as { field?: string }).field}`}</span>
                <StateBadge value={d.state} /><span className="text-xs">{d.kind} · {lessonTitle(d.lessonId)} · v{d.publishedVersion}</span>
              </div>
              {d.kind === 'contentOverride' && <p className="whitespace-pre-wrap text-sm">{String((d.data as { value: unknown }).value)}</p>}
              <div className="flex flex-wrap gap-2">
                <TransitionButtons c={c} d={d} pub={pubOf(c, d.id)} />
                <button type="button" className={btnLine} onClick={() => void c.svc.versions(d).then((list) => setHistory({ id: d.id, list }))}>ประวัติเวอร์ชัน</button>
              </div>
              {history?.id === d.id && (
                <ul className="text-sm" data-version-history>
                  {history.list.length === 0 ? <li>ยังไม่มีเวอร์ชันก่อนหน้า</li> : history.list.map((v) => (
                    <li key={v.version} className="flex flex-wrap items-center gap-2">
                      v{v.version} · {v.publishedAt.slice(0, 16)}
                      {c.allowed('content.draft') && <button type="button" className={btnLine} onClick={() => c.confirm({ title: `กู้คืน v${v.version}?`, body: 'สร้างฉบับร่างจากเวอร์ชันนี้ (ต้องเผยแพร่ใหม่ถึงจะมีผล)', confirmLabel: 'กู้คืนเป็นร่าง', run: () => c.act('กู้คืนเวอร์ชัน', () => c.svc.updateDraft(d, v.data)) })}>กู้คืนเป็นร่าง</button>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {c.allowed('content.draft') && (
        <form className={`${panel} grid gap-3 md:grid-cols-2`} aria-labelledby="ovr-h" onSubmit={(e) => {
          e.preventDefault();
          const v = fieldName === 'summary' ? value.split('\n').map((x) => x.trim()).filter(Boolean) : value;
          void c.act('สร้างร่างข้อความ', async () => { await c.svc.createDraft('contentOverride', { lessonId, field: fieldName, value: v, reason }); setValue(''); setReason(''); });
        }}>
          <h2 id="ovr-h" className="text-lg font-bold md:col-span-2">แก้ข้อความบทเรียน (ต้องผ่านการตรวจ)</h2>
          <p className="text-xs text-[var(--ink-2)] md:col-span-2">แก้ได้เฉพาะ สรุป · การเปรียบเทียบ · ทำไมต้องเรียน — ต้องมีผู้ตรวจคนอื่นอนุมัติก่อนเผยแพร่ รหัสทักษะ เกณฑ์ประเมิน และตรรกะการเรียนแก้จากที่นี่ไม่ได้</p>
          <Field label="บทเรียน"><select className={field} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>{LESSONS.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></Field>
          <Field label="ช่องที่แก้"><select className={field} value={fieldName} onChange={(e) => setFieldName(e.target.value as OverridableField)}>{OVERRIDABLE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}</select></Field>
          <Field label="เนื้อหาใหม่" hint={fieldName === 'summary' ? 'หนึ่งข้อต่อบรรทัด' : undefined}><textarea className={`${field} py-2`} rows={4} value={value} onChange={(e) => setValue(e.target.value)} required /></Field>
          <Field label="เหตุผลของการแก้ไข"><input className={field} value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
          <div><button type="submit" className={btnPrimary}>บันทึกเป็นฉบับร่าง</button></div>
        </form>
      )}
    </section>
  );
}

/* ── Users & roles ── */
export function UsersSection({ c }: { c: AdminCtx }) {
  const actor = { uid: c.me.uid, role: c.me.role, status: c.me.status };
  const activeSupers = c.data.users.filter((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE').length;
  const [q, setQ] = useState('');
  const rows = useMemo(() => c.data.users.filter((u) => !q || `${u.displayName} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [c.data.users, q]);
  return (
    <section className="flex flex-col gap-4">
      <H1>ผู้ใช้และบทบาท</H1>
      <div className="max-w-sm"><Field label="ค้นหาผู้ใช้"><input className={field} value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>
      <Table caption="ผู้ใช้" head={['ชื่อ', 'อีเมล', 'บทบาท', 'สถานะ', 'เข้าใช้ล่าสุด']}>
        {rows.map((u) => (
          <tr key={u.uid} className="border-b border-[var(--line)]" data-user={u.uid}>
            <td className="p-2">{u.displayName}{u.uid === c.me.uid && ' (คุณ)'}</td>
            <td className="p-2">{u.email}</td>
            <td className="p-2">
              <select aria-label={`บทบาทของ ${u.displayName}`} className={field} value={u.role} disabled={!can(actor, 'users.manageRoles')} onChange={(e) => {
                const next = e.target.value as Role;
                const deny = roleChangeDenied(actor, u, next, activeSupers);
                if (deny) return void c.act('เปลี่ยนบทบาท', () => Promise.reject(new Error(deny)));
                c.confirm({ title: 'เปลี่ยนบทบาท?', body: `${u.displayName}: ${ROLE_LABEL[u.role]} → ${ROLE_LABEL[next]}`, confirmLabel: 'เปลี่ยนบทบาท', danger: next === 'ADMIN' || next === 'SUPER_ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN', run: () => c.act('เปลี่ยนบทบาท', () => c.svc.setRole(u, next, activeSupers)) });
              }}>
                {ROLES.map((r) => <option key={r} value={r} disabled={r !== u.role && !!roleChangeDenied(actor, u, r, activeSupers)}>{ROLE_LABEL[r]}</option>)}
              </select>
            </td>
            <td className="p-2">
              <select aria-label={`สถานะของ ${u.displayName}`} className={field} value={u.status} disabled={!can(actor, 'users.setStatus') || u.uid === c.me.uid} onChange={(e) => {
                const next = e.target.value as AccountStatus;
                const deny = statusChangeDenied(actor, u, next, activeSupers);
                if (deny) return void c.act('เปลี่ยนสถานะ', () => Promise.reject(new Error(deny)));
                c.confirm({ title: 'เปลี่ยนสถานะบัญชี?', body: `${u.displayName}: ${u.status} → ${next}`, confirmLabel: 'ยืนยัน', danger: next !== 'ACTIVE', run: () => c.act('เปลี่ยนสถานะ', () => c.svc.setStatus(u, next, activeSupers)) });
              }}>
                {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
            <td className="p-2 text-xs">{u.lastLoginAt.slice(0, 16).replace('T', ' ')}</td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-[var(--ink-2)]">เฉพาะผู้ดูแลระบบสูงสุดให้หรือถอนสิทธิ์ ADMIN / SUPER_ADMIN ได้ และต้องมีผู้ดูแลระบบสูงสุดที่ใช้งานได้อย่างน้อย 1 คนเสมอ ข้อมูลการเรียนของผู้ใช้ไม่แสดงและแก้จากหน้านี้ไม่ได้</p>
    </section>
  );
}

/* ── Audit ── */
export function AuditSection({ c }: { c: AdminCtx }) {
  return (
    <section>
      <H1>บันทึกการแก้ไข</H1>
      <Table caption="บันทึกการแก้ไข (ล่าสุดก่อน)" head={['เวลา', 'ผู้ทำ', 'การกระทำ', 'รายการ', 'ก่อน → หลัง']}>
        {c.data.audit.map((e, i) => (
          <tr key={`${e.at}-${i}`} className="border-b border-[var(--line)] align-top">
            <td className="p-2 text-xs">{e.at.slice(0, 19).replace('T', ' ')}</td>
            <td className="p-2 text-xs">{c.data.users.find((u) => u.uid === e.actorUid)?.displayName ?? e.actorUid} · {e.actorRole}</td>
            <td className="p-2 font-mono text-xs">{e.action}</td>
            <td className="p-2 text-xs">{e.entityType}: {e.entityId}</td>
            <td className="max-w-[320px] break-all p-2 font-mono text-xs">{e.before ?? '—'} → {e.after ?? '—'}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

/* ── Settings ── */
export function SettingsSection({ c }: { c: AdminCtx }) {
  const visible = c.data.published.filter((p) => p.learnerVisible).length;
  const hiddenVideos = c.data.drafts.filter((d) => d.kind === 'video' && !isLearnerVisible(d.data as VideoData)).length;
  return (
    <section className="flex flex-col gap-3">
      <H1>ตั้งค่า</H1>
      <dl className={`${panel} grid gap-2 text-sm`}>
        <div><dt className="font-semibold">ระบบบัญชี</dt><dd>{c.svc ? 'เชื่อมต่อแล้ว' : '—'}</dd></div>
        <div><dt className="font-semibold">รายการที่ผู้เรียนเห็น</dt><dd>{visible}</dd></div>
        <div><dt className="font-semibold">วิดีโอที่ผู้เรียนยังไม่เห็น (ซ่อน/ยังไม่ยืนยัน)</dt><dd>{hiddenVideos}</dd></div>
      </dl>
      <p className="text-sm text-[var(--ink-2)]">การตั้งผู้ดูแลระบบสูงสุดคนแรก การตั้งค่า Supabase และแผนย้ายข้อมูลผู้เรียน อยู่ใน docs/supabase-setup.md — ไม่มีอีเมลหรือรหัสลับเก็บในโค้ดฝั่งเว็บ</p>
    </section>
  );
}
