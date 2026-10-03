import { subjectStyle } from '../../components/ui/subjectStyle';
import { learningHubPathFor } from '../../curriculum/engine';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { usePathway } from '../../hooks/usePathway';
import { AutoRecommendation, ManualPicker } from '../../components/pathway/PathwayBits';
import type { CurriculumSubjectId } from '../../curriculum/types';
import { Calculator, Code2, Atom, Brain, Cpu, BookMarked, LayoutGrid, PlayCircle, Route as RouteIcon } from 'lucide-react';
import { KIcon, Pill } from '../../components/v2u/kit';
import { ST, stOf, subOf } from '../../components/v2u/tokens';
import { SUBJECT_LABEL, SUBJECT_ORDER, getCurriculumMap } from '../../diagnostic/engine';
import { isCurriculumLessonCompleted } from '../../curriculum/engine';
import { useStore } from '../../store/useStore';
import { SUBJECTS } from '../../types';
import type { SubjectId } from '../../types';
import { HubLinkList } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { RowGroup, Section, LoopStrip } from '../../components/ui';

const SUBJECT_ICONS: Record<SubjectId, HubLink['icon']> = {
  math: Calculator,
  programming: Code2,
  physics: Atom,
  tgat3: Brain,
  ai: Cpu,
};

/** เรียน — continue where you are, find anything, then browse subjects. */
export function LearnHub() {
  const navigate = useNavigate();
  const { lessons, activeLearningSession } = useStore();
  const [params, setParams] = useSearchParams();
  const manual = params.get('pick') === 'manual';
  const subjectParam = params.get('subject');
  const manualSubject = subjectParam === 'math' || subjectParam === 'physics' || subjectParam === 'programming' ? (subjectParam as CurriculumSubjectId) : null;
  const pathway = usePathway();
  const setManual = (on: boolean, subject: CurriculumSubjectId | null = null) =>
    setParams(on ? { pick: 'manual', ...(subject ? { subject } : {}) } : {}, { replace: true });

  const liveSession =
    activeLearningSession &&
    activeLearningSession.status !== 'completed' &&
    activeLearningSession.status !== 'abandoned'
      ? activeLearningSession
      : null;
  const liveLesson = liveSession ? lessons.find((l) => l.id === liveSession.lessonId) : undefined;

  const liveHref = liveLesson ? learningHubPathFor(liveLesson, lessons, liveSession?.curriculumLessonId) ?? `/study/${liveLesson.id}` : '';
  // "Continue" card: a live sitting first, otherwise today's curriculum lesson
  const cont = liveLesson
    ? { to: liveHref, eyebrow: 'กำลังเรียนอยู่', title: liveLesson.title, meta: 'กลับไปเรียนบทนี้', stage: 'learn' as const }
    : null;

  const subjectItems = (Object.keys(SUBJECTS) as SubjectId[]).map((id) => {
    const subjectLessons = lessons.filter((l) => l.subjectId === id);
    const done = subjectLessons.filter((l) => l.status === 'COMPLETED').length;
    return {
      to: `/subjects/${id}`,
      title: SUBJECTS[id].name,
      meta: `เรียนจบ ${done}/${subjectLessons.length} บท`,
      icon: subjectStyle(id).icon ?? SUBJECT_ICONS[id],
      iconTone: `${subjectStyle(id).soft} ${subjectStyle(id).text}`,
      progress: subjectLessons.length ? (done / subjectLessons.length) * 100 : 0,
    };
  });

  const toolLinks: HubLink[] = [
    ...(liveLesson
      ? [{ to: liveHref, title: 'กลับไปเรียนบทนี้', description: `เรียนต่อ: ${liveLesson.title}`, icon: PlayCircle }]
      : []),
    { to: '/learn/curriculum', title: 'หลักสูตรวิศวกรรมคอมพิวเตอร์', description: 'วิชา → หัวข้อ → บทเรียน ที่ต้องใช้สอบเข้า', icon: RouteIcon },
    { to: '/resources', title: 'คลังแหล่งเรียนรู้', description: 'วิดีโอ เอกสาร และเว็บไซต์ที่บันทึกไว้', icon: BookMarked },
    { to: '/dashboard', title: 'ภาพรวมการเรียนแบบเต็ม', description: 'แผนวันนี้ บทที่ค้าง และสรุปทั้งหมด', icon: LayoutGrid },
  ];

  const curriculumMap = getCurriculumMap();
  const subjectCards = SUBJECT_ORDER.map((id) => {
    const rows = curriculumMap.find((m) => m.subjectId === id)?.topics.flatMap((t) => t.lessons) ?? [];
    const doneN = rows.filter((r) => isCurriculumLessonCompleted(r.lesson, lessons)).length;
    const profile = pathway.subjects.find((p) => p.subjectId === id);
    const rec = pathway.bySubject.find((b) => b.subjectId === id)?.rec;
    return { id, sub: subOf(id), st: ST[stOf(profile?.status ?? 'not-assessed')], count: rows.length, doneN, rec: rec?.lesson.title };
  });
  const h1 = { fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)' } as const;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 lg:max-w-6xl">
      {manual && manualSubject ? (
        <ManualPicker
          subject={manualSubject}
          onSubject={(s) => setManual(true, s)}
          gaps={pathway.gaps}
          recLessonId={pathway.bySubject.find((b) => b.subjectId === manualSubject)?.rec?.lesson.id}
          profile={pathway.subjects.find((p) => p.subjectId === manualSubject)}
          onBack={() => setManual(false)}
        />
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <span className="text-xs font-semibold" style={{ letterSpacing: '.08em', color: 'var(--brand-ink)' }}>เรียน</span>
            <h1 className="font-display font-bold leading-tight" style={h1}>วันนี้อยากเรียนแบบไหน</h1>
          </header>

          {cont && (
            <Link to={cont.to} className="flex flex-wrap items-center gap-4 p-4 transition-transform hover:-translate-y-0.5" style={{ borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}><KIcon name="play" size={20} /></span>
              <span className="min-w-0 flex-1">
                <LoopStrip current={cont.stage} />
                <span className="mt-1 block text-xs font-semibold" style={{ color: 'var(--ok)' }}>{cont.eyebrow}</span>
                <span className="block font-semibold break-words" style={{ color: 'var(--ink)' }}>{cont.title}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--brand-ink)' }}>{cont.meta} <KIcon name="arrowR" size={16} /></span>
            </Link>
          )}

          {/* Two ways to start — V2U decides, or I choose */}
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]" data-testid="learn-modes">
            <AutoRecommendation rec={pathway.recommendation} onManual={() => setManual(true)} />
            <section aria-labelledby="self-h" className="flex flex-col gap-3.5" style={{ padding: 22, borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl" style={{ background: 'var(--surface-3)', color: 'var(--ink)' }}><KIcon name="target" size={20} /></span>
                <h2 id="self-h" className="font-display text-[19px] font-bold" style={{ color: 'var(--ink)' }}>ฉันอยากเลือกเอง</h2>
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>เลือกวิชา แล้วเลือกบทที่อยากเรียน บทที่มีกุญแจเรียนได้ แต่ควรเรียนบทก่อนหน้าก่อน</p>
              <ol aria-label="ขั้นการเลือก" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>
                {['วิชา', 'บทเรียน', 'วิธีเรียน'].map((t, i) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true" className="mr-1.5 h-px w-4" style={{ background: 'var(--line-2)' }} />}
                    <span className="grid h-5 w-5 place-items-center rounded-full font-mono text-[11px]" style={i === 0 ? { background: 'var(--ink)', color: 'var(--bg)' } : { border: '1px solid var(--line-2)' }}>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex flex-wrap gap-2">
                {SUBJECT_ORDER.map((id) => (
                  <button key={id} type="button" data-subject={id} onClick={() => setManual(true, id)} className="inline-flex h-11 items-center gap-2 rounded-xl pl-2.5 pr-3.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]" style={{ border: '1px solid var(--line-2)', color: 'var(--ink)' }}>
                    <span style={{ color: subOf(id).c }}><KIcon name={subOf(id).k} size={16} /></span>{SUBJECT_LABEL[id]}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section aria-labelledby="subj-h" className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <h2 id="subj-h" className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>วิชาในเส้นทางของคุณ</h2>
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg,var(--line-2),transparent)' }} />
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
              {subjectCards.map((c) => (
                <button key={c.id} type="button" data-subject-card={c.id} onClick={() => setManual(true, c.id)} className="relative flex flex-col gap-4 overflow-hidden p-[18px] text-left transition-transform hover:-translate-y-0.5" style={{ borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
                  <span aria-hidden="true" className="absolute -right-10 -top-10 h-[140px] w-[140px] rounded-full" style={{ background: `radial-gradient(circle,${c.sub.soft} 0%,transparent 70%)` }} />
                  <span className="relative flex items-center justify-between gap-2">
                    <span className="grid h-[46px] w-[46px] place-items-center rounded-[14px]" style={{ background: c.sub.soft, color: c.sub.c }}><KIcon name={c.sub.k} size={24} /></span>
                    <Pill c={c.st.c} soft={c.st.soft} icon={c.st.k}>{c.st.label}</Pill>
                  </span>
                  <span className="relative"><span className="block font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>{SUBJECT_LABEL[c.id]}</span><span className="text-xs" style={{ color: 'var(--ink-3)' }}>{c.count} บทเรียน</span></span>
                  <span className="relative flex flex-col gap-1.5">
                    <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}><span className="block h-full rounded-full" style={{ width: `${c.count ? (c.doneN / c.count) * 100 : 0}%`, background: c.sub.c }} /></span>
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>เรียนจบ {c.doneN} จาก {c.count} บท</span>
                  </span>
                  <span className="relative flex items-center gap-2 pt-3 text-[13px]" style={{ borderTop: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--brand-ink)' }}><KIcon name="sparkle" size={14} /></span>
                    <span className="min-w-0 flex-1" style={{ color: 'var(--ink-2)' }}>แนะนำตอนนี้: <span className="font-semibold" style={{ color: 'var(--ink)' }}>{c.rec ?? 'ไม่มีบทที่ขาดในวิชานี้'}</span></span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-4">
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = (new FormData(e.currentTarget).get('q') as string | null)?.trim();
                  navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
                }}
                className="relative"
              >
                <KIcon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
                <input name="q" type="search" aria-label="ค้นหาบทเรียน คลิป เอกสาร และโจทย์" placeholder="ค้นหาบทเรียน คลิป โจทย์…"
                  className="min-h-[50px] w-full rounded-[14px] pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-[var(--brand-soft)]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', color: 'var(--ink)' }} />
              </form>
              <HubLinkList heading="เครื่องมือการเรียน" links={toolLinks} />
            </div>
            <Section title="คลังวิชาทั้งหมด" id="learn-subjects">
              <RowGroup label="วิชา" items={subjectItems} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
