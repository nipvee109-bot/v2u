import { useNavigate, Link } from 'react-router-dom';
import { Calculator, Code2, Atom, Brain, Cpu, BookMarked, Search, LayoutGrid, PlayCircle, Route as RouteIcon, ArrowRight, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SUBJECTS } from '../../types';
import type { SubjectId } from '../../types';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { useNextStep } from '../../hooks/useNextStep';
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
  const step = useNextStep();

  const liveSession =
    activeLearningSession &&
    activeLearningSession.status !== 'completed' &&
    activeLearningSession.status !== 'abandoned'
      ? activeLearningSession
      : null;
  const liveLesson = liveSession ? lessons.find((l) => l.id === liveSession.lessonId) : undefined;

  // "Continue" card: a live sitting first, otherwise today's curriculum lesson
  const cont = liveLesson
    ? { to: `/study/${liveLesson.id}`, eyebrow: 'กำลังเรียนอยู่', title: liveLesson.title, meta: 'กลับเข้าห้องเรียน', stage: 'learn' as const }
    : step.curriculum
      ? { to: `/learn/curriculum/${step.curriculum.lessonId}`, eyebrow: 'บทถัดไปของคุณ', title: step.curriculum.title, meta: step.minutes ? `วันนี้ ${step.minutes} นาที` : `${step.curriculum.estimatedMinutes} นาที`, stage: 'today' as const }
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
      ? [{ to: `/study/${liveLesson.id}`, title: 'ห้องเรียน', description: `เรียนต่อ: ${liveLesson.title}`, icon: PlayCircle }]
      : []),
    { to: '/learn/curriculum', title: 'หลักสูตรวิศวกรรมคอมพิวเตอร์', description: 'วิชา → หัวข้อ → บทเรียน ที่ต้องใช้สอบเข้า', icon: RouteIcon },
    { to: '/resources', title: 'คลังแหล่งเรียนรู้', description: 'วิดีโอ เอกสาร และเว็บไซต์ที่บันทึกไว้', icon: BookMarked },
    { to: '/dashboard', title: 'ภาพรวมการเรียนแบบเต็ม', description: 'แผนวันนี้ บทที่ค้าง และสรุปทั้งหมด', icon: LayoutGrid },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 sm:space-y-8">
      <HubHeader title="เรียน" subtitle="เรียนต่อจากตรงที่ค้าง หรือหาเรื่องที่อยากรู้" />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('q') as string | null)?.trim();
          navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
        }}
        className="relative"
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

      {cont && (
        <Link
          to={cont.to}
          className="block rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/15 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
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

      <Section title="วิชา" id="learn-subjects">
        <RowGroup label="วิชา" items={subjectItems} />
      </Section>

      <HubLinkList heading="เครื่องมือการเรียน" links={toolLinks} />

      <Surface tone="muted" className="text-xs text-slate-600">
        ค้นหาได้ทั้งบทเรียนของ V2U คลิป เอกสาร และโจทย์ — ผลจากเว็บภายนอกจะแยกไว้และบอกชัดว่ายังไม่ได้คัด ·{' '}
        <Link to="/search" className="font-semibold text-brand-700 underline">ไปหน้าค้นหา</Link>
      </Surface>
    </div>
  );
}
