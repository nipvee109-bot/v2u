import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CURRICULUM } from '../curriculum/data';
import {
  getCurriculumTopic,
  getCurriculumLesson,
  findStudyLesson,
  isCurriculumLessonCompleted,
  getMissingPrerequisites,
  getPathwayReadiness,
} from '../curriculum/engine';
import type { CurriculumLevel } from '../curriculum/types';

const LEVEL_LABEL: Record<CurriculumLevel, string> = {
  foundation: 'พื้นฐาน',
  core: 'แกนหลัก',
  advanced: 'ขั้นสูง',
};

/** เรียน → หลักสูตร: browse Pathway → Subject → Topic → Lesson. */
export function CurriculumPage() {
  const { lessons } = useStore();
  const readiness = getPathwayReadiness(lessons);
  const skillTitle = (id: string) => CURRICULUM.skills.find((s) => s.id === id)?.title ?? id;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <Link to="/learn" className="text-xs font-semibold text-blue-700 hover:underline">
          ← เรียน
        </Link>
        <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">หลักสูตร{CURRICULUM.pathway.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{CURRICULUM.pathway.description}</p>
      </header>

      <section aria-label="ความพร้อมตามข้อกำหนด" className="mb-6 grid gap-2.5 sm:grid-cols-3">
        {CURRICULUM.pathway.requirements.map((req) => {
          const r = readiness.find((x) => x.subjectId === req.subjectId);
          const subject = CURRICULUM.subjects.find((s) => s.id === req.subjectId);
          const pct = r?.readinessPercent ?? 0;
          return (
            <div key={req.subjectId} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <p className="text-sm font-bold text-slate-900">{subject?.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">ความพร้อม {pct}% · เป้าหมาย {req.targetReadinessPercent}%</p>
              <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-emerald-600" style={{ left: `${req.targetReadinessPercent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{req.exams.join(' · ')}</p>
            </div>
          );
        })}
      </section>

      {CURRICULUM.subjects.map((subject) => (
        <section key={subject.id} aria-labelledby={`subj-${subject.id}`} className="mb-6">
          <h2 id={`subj-${subject.id}`} className="text-base font-extrabold text-slate-900">{subject.title}</h2>
          <p className="mb-2 text-xs text-slate-500">{subject.description}</p>

          {subject.topicIds.map((topicId) => {
            const topic = getCurriculumTopic(topicId);
            if (!topic) return null;
            return (
              <div key={topic.id} className="mb-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">{topic.title}</h3>
                <p className="text-xs text-slate-500">{topic.description}</p>
                <ol className="mt-2 space-y-2">
                  {topic.lessonIds.map((lessonId) => {
                    const lesson = getCurriculumLesson(lessonId);
                    if (!lesson) return null;
                    const done = isCurriculumLessonCompleted(lesson, lessons);
                    const studyLesson = findStudyLesson(lesson, lessons);
                    const missing = getMissingPrerequisites(lesson, lessons);
                    return (
                      <li key={lesson.id}>
                        <details className="group rounded-xl border border-slate-100 bg-slate-50/60">
                          <summary className="flex cursor-pointer list-none items-center gap-2.5 p-2.5 min-h-[44px]">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="เรียนจบแล้ว" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="ยังไม่จบ" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">{lesson.title}</span>
                              <span className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{LEVEL_LABEL[lesson.level]}</span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {lesson.estimatedMinutes} นาที
                                </span>
                              </span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="space-y-2 px-3 pb-3 text-xs text-slate-700">
                            <p>{lesson.description}</p>
                            <div>
                              <p className="font-bold text-slate-800">เรียนจบแล้วจะทำได้</p>
                              <ul className="ml-4 list-disc">
                                {lesson.learningOutcomes.map((o) => (
                                  <li key={o}>{o}</li>
                                ))}
                              </ul>
                            </div>
                            <p>
                              <span className="font-bold text-slate-800">ทักษะ: </span>
                              {lesson.skillIds.map(skillTitle).join(', ')}
                            </p>
                            <p>
                              แบบฝึก {lesson.exerciseIds.length} ชุด · แบบทดสอบ {lesson.quizIds.length} ชุด
                            </p>
                            {missing.length > 0 && (
                              <p className="text-amber-700">ควรปูพื้นก่อน: {missing.map((m) => m.title).join(', ')}</p>
                            )}
                            {studyLesson && (
                              <Link
                                to={`/lessons/${studyLesson.id}`}
                                className="inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-2 min-h-[40px] text-xs font-bold text-white hover:bg-blue-700"
                              >
                                เปิดบทเรียน
                              </Link>
                            )}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
