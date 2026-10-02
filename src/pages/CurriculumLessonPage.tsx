import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson, getMissingPrerequisites } from '../curriculum/engine';
import { buildLearningPlan, isTimeBudget } from '../resources/engine';
import { getLearningPath, describePlan } from '../content/engine';
import { normalizeStudentProfile } from '../route/engine';
import { OriginalLessonView } from '../components/learn/OriginalLessonView';
import { ResourceLink } from '../components/learn/ResourceLink';

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
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link to="/learn/curriculum" className="text-xs font-semibold text-blue-700 hover:underline">← หลักสูตร</Link>
        <p className="mt-1 text-[11px] text-slate-500">{subject?.title}</p>
        <h1 className="text-xl font-extrabold text-slate-900 break-words">{lesson.title}</h1>
        <p className="mt-1 text-sm text-slate-600 break-words">{lesson.description}</p>
        {missing.length > 0 && <p className="mt-1 text-xs text-amber-700">ควรปูพื้นก่อน: {missing.map((x) => x.title).join(', ')}</p>}
      </header>

      <div role="tablist" aria-label="วิธีเรียน" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
        {MODES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={mode === x.id}
            onClick={() => setParams({ mode: x.id }, { replace: true })}
            className={`min-h-[44px] rounded-xl px-2 text-xs font-bold ${mode === x.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
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
        <section aria-label="แผนวันนี้" className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-xs">
          <p className="font-bold text-blue-900">แผนวันนี้ ({budget} นาที)</p>
          <p className="mt-1 text-slate-800 break-words" data-testid="plan-summary">{describePlan(plan)}</p>
        </section>
      )}
      {studyLesson && (
        <Link to={`/lessons/${studyLesson.id}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
          เริ่มเรียนตามแผน
        </Link>
      )}
    </div>
  );
}
