import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson, getMissingPrerequisites } from '../curriculum/engine';
import { buildLearningPlan, isTimeBudget } from '../resources/engine';
import { getLearningPath, describePlan } from '../content/engine';
import { normalizeStudentProfile } from '../route/engine';
import { OriginalLessonView } from '../components/learn/OriginalLessonView';
import { ResourceLink } from '../components/learn/ResourceLink';
import { Chip, LoopStrip, PlanBar, ScreenHeader } from '../components/ui';

type Mode = 'video' | 'read' | 'original';
const MODES: { id: Mode; label: string }[] = [
  { id: 'video', label: 'ดูคลิป' },
  { id: 'read', label: 'อ่าน' },
  { id: 'original', label: 'เรียนจาก V2U' },
];

/** /learn/curriculum/:lessonId — one lesson, three ways to learn it. */
export function CurriculumLessonPage() {
  const { lessonId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { lessons, studentProfile } = useStore();
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  const path = getLearningPath(lessonId);
  if (!lesson || !path) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-slate-700">ไม่พบบทเรียนนี้</p>
        <Link to="/learn/curriculum" className="text-sm font-semibold text-blue-700 underline">กลับไปหลักสูตร</Link>
      </div>
    );
  }
  const m = params.get('mode');
  const mode: Mode = m === 'read' || m === 'original' || m === 'video' ? m : path.primary?.type === 'video' ? 'video' : 'original';
  const daily = normalizeStudentProfile(studentProfile).availableMinutes;
  const budget = isTimeBudget(daily) ? daily : 30;
  const plan = buildLearningPlan(lessonId, budget);
  const studyLesson = findStudyLesson(lesson, lessons);
  const missing = getMissingPrerequisites(lesson, lessons);
  const subject = CURRICULUM.subjects.find((s) => s.id === lesson.subjectId);
  const video = [path.primary, path.alternative].find((r) => r && (r.type === 'video' || r.type === 'course'));
  const altVideo = path.alternative && path.alternative.id !== video?.id && (path.alternative.type === 'video' || path.alternative.type === 'course') ? path.alternative : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-20 md:pb-0">
      <ScreenHeader
        back={{ to: '/learn/curriculum', label: 'หลักสูตร' }}
        eyebrow={subject?.title}
        title={lesson.title}
        subtitle={lesson.description}
      />
      <div className="-mt-3 flex flex-wrap gap-2">
        <Chip tone="brand">{lesson.estimatedMinutes} นาที</Chip>
        <Chip>{lesson.learningOutcomes.length} สิ่งที่จะทำได้</Chip>
        {missing.length > 0 && <Chip tone="warn">ควรปูพื้นก่อน: {missing.map((x) => x.title).join(', ')}</Chip>}
      </div>

      <div role="tablist" aria-label="วิธีเรียน" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/60 p-1">
        {MODES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={mode === x.id}
            onClick={() => setParams({ mode: x.id }, { replace: true })}
            className={`min-h-[44px] rounded-xl px-2 text-sm font-semibold transition-colors ${mode === x.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-ink'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {mode === 'video' && (
        <section aria-label="ดูคลิป" className="space-y-2">
          {video ? <ResourceLink r={video} heading="คลิปหลัก" /> : <p className="text-sm text-slate-600">บทนี้ยังไม่มีคลิปที่ V2U คัดไว้ — ลองโหมด “เรียนจาก V2U”</p>}
          {altVideo && <ResourceLink r={altVideo} heading="อีกคลิปถ้าคลิปแรกไม่เข้าใจ" />}
          <OriginalLessonView content={path.original} compact />
        </section>
      )}
      {mode === 'read' && (
        <section aria-label="อ่าน" className="space-y-2">
          {path.reading ? <ResourceLink r={path.reading} heading="อ่านเพิ่ม" /> : <p className="text-sm text-slate-600">ยังไม่มีเอกสารภายนอกที่คัดไว้ — อ่านบทของ V2U ด้านล่างได้เลย</p>}
          <OriginalLessonView content={path.original} />
        </section>
      )}
      {mode === 'original' && <OriginalLessonView content={path.original} />}

      {plan && (
        <section aria-label="แผนวันนี้" className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-brand-900">แผนวันนี้ · {budget} นาที</p>
            <LoopStrip current="learn" />
          </div>
          <p className="sr-only" data-testid="plan-summary">{describePlan(plan)}</p>
          <div className="mt-3">
            <PlanBar segments={plan.steps.map((st) => ({ label: st.label, minutes: st.minutes }))} />
          </div>
        </section>
      )}
      {studyLesson && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <Link to={`/lessons/${studyLesson.id}`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-base font-bold text-white shadow-sm hover:bg-brand-700 md:w-auto md:inline-flex">
            เริ่มเรียนตามแผน
          </Link>
        </div>
      )}
    </div>
  );
}
