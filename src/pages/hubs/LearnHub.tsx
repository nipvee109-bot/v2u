import { learningHubPathFor } from '../../curriculum/engine';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { usePathway } from '../../hooks/usePathway';
import { AutoRecommendation, ManualPicker } from '../../components/pathway/PathwayBits';
import type { CurriculumSubjectId } from '../../curriculum/types';
import { Calculator, Code2, Atom, Brain, Cpu, BookMarked, Search, LayoutGrid, PlayCircle, Route as RouteIcon, ArrowRight, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SUBJECTS } from '../../types';
import type { SubjectId } from '../../types';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { RowGroup, Section, Surface, LoopStrip } from '../../components/ui';

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
      icon: SUBJECT_ICONS[id],
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

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <HubHeader title="เรียน" subtitle="เรียนต่อจากตรงที่ค้าง หรือหาเรื่องที่อยากรู้" />

      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
      {cont && (
        <Link
          to={cont.to}
          className="order-2 lg:order-none block rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/15 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          <LoopStrip current={cont.stage} onDark />
          <p className="mt-3 text-xs font-semibold text-brand-100">{cont.eyebrow}</p>
          <p className="mt-0.5 text-lg font-bold break-words">{cont.title}</p>
          <p className="mt-3 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-white/85">
              <Clock className="h-4 w-4" /> {cont.meta}
            </span>
            <span className="flex items-center gap-1 font-bold">
              เปิดบทเรียน <ArrowRight className="h-4 w-4" />
            </span>
          </p>
        </Link>
      )}

      {/* Phase 60: two clear ways to start — V2U decides, or I choose */}
      <section aria-labelledby="learn-how" className="order-2 lg:order-none space-y-4" data-testid="learn-modes">
        <h2 id="learn-how" className="sr-only">เริ่มเรียนแบบไหน</h2>
        <div role="tablist" aria-label="วิธีเลือกบทเรียน" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button type="button" role="tab" aria-selected={!manual} onClick={() => setManual(false)} className={`min-h-[48px] rounded-xl px-3 text-sm font-bold ${!manual ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'}`}>
            ✨ ให้ V2U จัดให้
          </button>
          <button type="button" role="tab" aria-selected={manual} onClick={() => setManual(true, manualSubject)} className={`min-h-[48px] rounded-xl px-3 text-sm font-bold ${manual ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'}`}>
            ฉันอยากเลือกเอง
          </button>
        </div>
        {manual ? (
          <ManualPicker subject={manualSubject} onSubject={(s) => setManual(true, s)} gaps={pathway.gaps} />
        ) : (
          <AutoRecommendation rec={pathway.recommendation} onManual={() => setManual(true)} />
        )}
      </section>

      <Section title="วิชา" id="learn-subjects" className="order-3 lg:order-none">
        <RowGroup label="วิชา" items={subjectItems} />
      </Section>

        </div>
        <aside aria-label="ค้นหาและเครื่องมือ" className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-6">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('q') as string | null)?.trim();
          navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
        }}
        className="relative order-1 lg:order-none"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          type="search"
          aria-label="ค้นหาบทเรียน คลิป เอกสาร และโจทย์"
          placeholder="ค้นหาบทเรียน คลิป โจทย์…"
          className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-ink shadow-xs outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </form>

      <div className="order-4 lg:order-none">
      <HubLinkList heading="เครื่องมือการเรียน" links={toolLinks} />

      </div>
      <Surface tone="muted" className="order-5 lg:order-none text-xs text-slate-600">
        ค้นหาได้ทั้งบทเรียนของ V2U คลิป เอกสาร และโจทย์ — ผลจากเว็บภายนอกจะแยกไว้และบอกชัดว่ายังไม่ได้คัด ·{' '}
        <Link to="/search" className="font-semibold text-brand-700 underline">ไปหน้าค้นหา</Link>
      </Surface>
        </aside>
      </div>
    </div>
  );
}
