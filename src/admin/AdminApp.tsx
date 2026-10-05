/* V2U Admin (Phase 72) — /admin, its own shell outside the learner Layout.
   Every action goes through CmsService (can() → validate → workflow → backend + audit);
   the database (Supabase RLS + RPCs) enforces the same limits server-side. The admin cannot reach learner
   mastery, diagnostics, evidence, review scheduling or next-step logic: those live only
   on each learner's device and are not part of any CMS collection. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { can, ROLE_LABEL } from '../auth/permissions';
import type { Permission } from '../auth/permissions';
import { CURRICULUM } from '../curriculum/data';
import { LESSON_KNOWLEDGE } from '../content/knowledge';
import { CmsService } from '../cms/service';
import type { AuditEvent, DraftDoc, GameDoc, LessonGameAssignment, PublishedDoc, UserProfile } from '../cms/types';
import type { ValidationContext } from '../cms/workflow';
import { ConfirmDialog } from './ui';
import type { ConfirmRequest } from './ui';
import { AuditSection, DashboardSection, GamesSection, LessonDetail, LessonsSection, PublishingSection, SettingsSection, UsersSection, VideosSection } from './sections';

export interface AdminData {
  drafts: DraftDoc[];
  published: PublishedDoc[];
  games: GameDoc[];
  assignments: LessonGameAssignment[];
  users: UserProfile[];
  audit: AuditEvent[];
  loaded: boolean;
}

export interface AdminCtx {
  data: AdminData;
  svc: CmsService;
  allowed: (p: Permission) => boolean;
  reload: () => Promise<void>;
  /** Run an action; shows success/error in the live region */
  act: (label: string, fn: () => Promise<unknown>) => Promise<void>;
  confirm: (r: ConfirmRequest) => void;
  me: UserProfile;
}

const NAV: { to: string; label: string; need: Permission }[] = [
  { to: '/admin', label: 'ภาพรวม', need: 'admin.access' },
  { to: '/admin/lessons', label: 'บทเรียน', need: 'admin.access' },
  { to: '/admin/videos', label: 'วิดีโอ / แหล่งเรียนรู้', need: 'admin.access' },
  { to: '/admin/games', label: 'เกม', need: 'admin.access' },
  { to: '/admin/publishing', label: 'การเผยแพร่', need: 'admin.access' },
  { to: '/admin/users', label: 'ผู้ใช้และบทบาท', need: 'users.view' },
  { to: '/admin/audit', label: 'บันทึกการแก้ไข', need: 'audit.view' },
  { to: '/admin/settings', label: 'ตั้งค่า', need: 'settings.manage' },
];

export const validationContext = (): ValidationContext => ({
  lessonIds: new Set(CURRICULUM.lessons.map((l) => l.id)),
  notYet: new Map(LESSON_KNOWLEDGE.map((k) => [k.lessonId, k.notYetAllowed])),
});

function Gate({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4" data-admin-gate={title}>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      {children}
      <Link to="/" className="text-sm underline">กลับไปหน้าเรียน</Link>
    </main>
  );
}

export function AdminApp() {
  const a = useAuth();
  if (a.status === 'loading') return <Gate title="กำลังตรวจสอบสิทธิ์…" />;
  if (a.status === 'unconfigured')
    return (
      <Gate title="ยังไม่ได้ตั้งค่าระบบบัญชี">
        <p className="text-sm">หน้าผู้ดูแลต้องใช้ระบบบัญชี (Supabase) ซึ่งยังไม่ได้ตั้งค่าในเว็บนี้ ดูวิธีตั้งค่าที่ docs/supabase-setup.md</p>
      </Gate>
    );
  if (a.status === 'error') return <Gate title="โหลดบัญชีไม่สำเร็จ">
    <p role="alert" className="text-sm">{a.error}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-[44px] rounded-xl border px-4" onClick={() => void a.refreshProfile()}>ลองอีกครั้ง</button>
      <button type="button" className="min-h-[44px] rounded-xl border px-4" disabled={a.signingOut} onClick={() => void a.signOut()}>ออกจากระบบ</button>
    </div>
  </Gate>;
  if (a.status === 'signed-out')
    return (
      <Gate title="เข้าสู่ระบบผู้ดูแล">
        <p className="text-sm">เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับสิทธิ์ผู้ดูแล</p>
        <button type="button" className="min-h-[44px] rounded-xl bg-[#1a2490] px-4 font-semibold text-white" disabled={!a.online || a.signingIn} onClick={() => void a.signIn()}>{a.signingIn ? 'กำลังไปยัง Google…' : 'เข้าสู่ระบบด้วย Google'}</button>
        {a.error && <p role="alert" className="text-sm">{a.error}</p>}
      </Gate>
    );
  if (!a.actor || !a.profile || !a.backend || !can(a.actor, 'admin.access'))
    return (
      <Gate title="ไม่มีสิทธิ์เข้าถึง">
        <p className="text-sm" data-testid="access-denied">บัญชีนี้ไม่มีสิทธิ์ใช้หน้าผู้ดูแล{a.profile?.status && a.profile.status !== 'ACTIVE' ? ' (บัญชีถูกระงับ)' : ''} หากคิดว่าเป็นความผิดพลาด ให้ติดต่อผู้ดูแลระบบ</p>
      </Gate>
    );
  return <AdminShell />;
}

function AdminShell() {
  const a = useAuth();
  const actor = a.actor!;
  const backend = a.backend!;
  const me = a.profile!;
  const svc = useMemo(() => new CmsService(backend, actor, validationContext()), [backend, actor]);
  const allowed = useCallback((p: Permission) => can(actor, p), [actor]);
  const [data, setData] = useState<AdminData>({ drafts: [], published: [], games: [], assignments: [], users: [], audit: [], loaded: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const reload = useCallback(async () => {
    const [drafts, published, games, assignments, users, audit] = await Promise.all([
      backend.listDrafts(),
      backend.listPublished(),
      backend.listGames(),
      backend.listAssignments(),
      can(actor, 'users.view') ? backend.listUsers() : Promise.resolve([]),
      can(actor, 'audit.view') ? backend.listAudit(200) : Promise.resolve([]),
    ]);
    setData({ drafts, published, games, assignments, users, audit, loaded: true });
  }, [backend, actor]);

  useEffect(() => {
    reload().catch(() => setMsg({ ok: false, text: 'โหลดข้อมูลไม่สำเร็จ' }));
  }, [reload]);

  const act = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        await reload();
        setMsg({ ok: true, text: `${label} สำเร็จ` });
      } catch (e) {
        setMsg({ ok: false, text: `${label} ไม่สำเร็จ: ${(e as Error).message}` });
      }
    },
    [reload]
  );

  const ctx: AdminCtx = { data, svc, allowed, reload, act, confirm: setConfirmReq, me };
  const nav = NAV.filter((n) => allowed(n.need));

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]" data-admin-shell>
      <a href="#admin-main" className="sr-only focus:not-sr-only">ข้ามไปเนื้อหา</a>
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2">
        <button type="button" className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] lg:hidden" aria-expanded={navOpen} aria-controls="admin-nav" onClick={() => setNavOpen((v) => !v)}>
          <span aria-hidden>☰</span>
          <span className="sr-only">เมนูผู้ดูแล</span>
        </button>
        <span className="font-display font-bold">V2U ผู้ดูแล</span>
        {a.mode === 'memory-dev' && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-black">DEVELOPMENT ONLY — ข้อมูลจำลอง</span>}
        <span className="ml-auto truncate text-sm">{me.displayName} · {ROLE_LABEL[me.role]}</span>
        <Link to="/" className="min-h-[44px] content-center rounded-xl px-2 text-sm underline">หน้าเรียน</Link>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-4 p-4">
        <nav id="admin-nav" aria-label="เมนูผู้ดูแล" className={`${navOpen ? 'block' : 'hidden'} fixed inset-x-0 top-[60px] z-10 border-b border-[var(--line)] bg-[var(--surface)] p-3 lg:static lg:block lg:w-56 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0`}>
          <ul className="flex flex-col gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/admin'} onClick={() => setNavOpen(false)} className={({ isActive }) => `flex min-h-[44px] items-center rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-[#1a2490] text-white' : 'hover:bg-[var(--surface-2,#eef0ff)]'}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="admin-main" className="min-w-0 flex-1">
          <div aria-live="polite" role="status" className="mb-2 min-h-6 text-sm" data-admin-msg={msg ? (msg.ok ? 'ok' : 'error') : ''} style={{ color: msg && !msg.ok ? '#b42318' : undefined }}>
            {msg?.text}
          </div>
          {!data.loaded ? (
            <p role="status">กำลังโหลด…</p>
          ) : (
            <Routes>
              <Route index element={<DashboardSection c={ctx} />} />
              <Route path="lessons" element={<LessonsSection c={ctx} />} />
              <Route path="lessons/:lessonId" element={<LessonDetailRoute c={ctx} />} />
              <Route path="videos" element={<VideosSection c={ctx} />} />
              <Route path="games" element={<GamesSection c={ctx} />} />
              <Route path="publishing" element={<PublishingSection c={ctx} />} />
              <Route path="users" element={allowed('users.view') ? <UsersSection c={ctx} /> : <Denied />} />
              <Route path="audit" element={allowed('audit.view') ? <AuditSection c={ctx} /> : <Denied />} />
              <Route path="settings" element={allowed('settings.manage') ? <SettingsSection c={ctx} /> : <Denied />} />
              <Route path="*" element={<Denied />} />
            </Routes>
          )}
        </main>
      </div>
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

function Denied() {
  return <p data-testid="section-denied">ไม่มีสิทธิ์ใช้ส่วนนี้</p>;
}

function LessonDetailRoute({ c }: { c: AdminCtx }) {
  const { lessonId = '' } = useParams();
  return <LessonDetail c={c} lessonId={lessonId} />;
}
