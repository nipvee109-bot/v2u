import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson, getMissingPrerequisites, isCurriculumLessonCompleted } from '../curriculum/engine';
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
  const done = isCurriculumLessonCompleted(lesson, lessons);
  const subject = CURRICULUM.subjects.find((s) => s.id === lesson.subjectId);
  const video = [path.primary, path.alternative].find((r) => r && (r.type === 'video' || r.type === 'course'));
  const altVideo = path.alternative && path.alternative.id !== video?.id && (path.alternative.type === 'video' || path.alternative.type === 'course') ? path.alternative : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-5 pb-20 md:pb-0">
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

      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="min-w-0 space-y-5">
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
        </div>
        <aside aria-label="แผน ความคืบหน้า และเริ่มเรียน" className="space-y-4 lg:sticky lg:top-0">
      {plan && (
        <section aria-label="แผนวันนี้" className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-start">
            <p className="text-sm font-bold text-brand-900">แผนวันนี้ · {budget} นาที</p>
            <LoopStrip current="learn" />
          </div>
          <p className="sr-only" data-testid="plan-summary">{describePlan(plan)}</p>
          <div className="mt-3">
            <PlanBar segments={plan.steps.map((st) => ({ label: st.label, minutes: st.minutes }))} />
          </div>
        </section>
      )}
          <section aria-label="ความคืบหน้าของบทนี้" className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">บทนี้</p>
              <Chip tone={done ? 'good' : 'neutral'}>{done ? 'เรียนจบแล้ว' : 'ยังไม่จบ'}</Chip>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">เรียนจบแล้วจะทำได้</p>
            <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700">
              {lesson.learningOutcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 break-words">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
            {path.nextLessonId && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                ต่อไป: <Link to={`/learn/curriculum/${path.nextLessonId}`} className="font-semibold text-brand-700">{CURRICULUM.lessons.find((l) => l.id === path.nextLessonId)?.title}</Link>
              </p>
            )}
          </section>
      {studyLesson && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <Link to={`/lessons/${studyLesson.id}`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-base font-bold text-white shadow-sm hover:bg-brand-700 md:w-auto md:inline-flex lg:flex lg:w-full">
            เริ่มเรียนตามแผน
          </Link>
        </div>
      )}
        </aside>
      </div>
    </div>
  );
}
