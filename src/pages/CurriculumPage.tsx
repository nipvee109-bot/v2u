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
import { getResourcesForLesson, buildLearningPlan, TYPE_LABEL } from '../resources/engine';
import type { ResourceLevel } from '../resources/types';
import { TimeBudgetPicker } from '../components/TimeBudgetPicker';
import { ProgressBar, ScreenHeader } from '../components/ui';
import { normalizeStudentProfile } from '../route/engine';

const RESOURCE_LEVEL_LABEL: Record<ResourceLevel, string> = {
  beginner: 'เริ่มต้น',
  intermediate: 'กลาง',
  advanced: 'สูง',
};

const LEVEL_LABEL: Record<CurriculumLevel, string> = {
  foundation: 'พื้นฐาน',
  core: 'แกนหลัก',
  advanced: 'ขั้นสูง',
};

/** เรียน → หลักสูตร: browse Pathway → Subject → Topic → Lesson. */
export function CurriculumPage() {
  const { lessons, studentProfile, setStudentProfile } = useStore();
  const readiness = getPathwayReadiness(lessons);
  const budget = normalizeStudentProfile(studentProfile).availableMinutes;
  const skillTitle = (id: string) => CURRICULUM.skills.find((s) => s.id === id)?.title ?? id;

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <ScreenHeader back={{ to: '/learn', label: 'เรียน' }} title={`หลักสูตร${CURRICULUM.pathway.title}`} subtitle={CURRICULUM.pathway.description} />

      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="order-3 lg:order-none space-y-8">
      {CURRICULUM.subjects.map((subject) => (
        <section key={subject.id} aria-labelledby={`subj-${subject.id}`} className="space-y-3">
          <h2 id={`subj-${subject.id}`} className="text-lg font-bold text-ink">{subject.title}</h2>
          <p className="-mt-2 text-xs text-slate-500">{subject.description}</p>

          {subject.topicIds.map((topicId) => {
            const topic = getCurriculumTopic(topicId);
            if (!topic) return null;
            return (
              <div key={topic.id} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h3 className="text-sm font-bold text-ink">{topic.title}</h3>
                <p className="text-xs text-slate-500">{topic.description}</p>
                <ol className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {topic.lessonIds.map((lessonId) => {
                    const lesson = getCurriculumLesson(lessonId);
                    if (!lesson) return null;
                    const done = isCurriculumLessonCompleted(lesson, lessons);
                    const studyLesson = findStudyLesson(lesson, lessons);
                    const missing = getMissingPrerequisites(lesson, lessons);
                    return (
                      <li key={lesson.id}>
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-3 py-3 min-h-[52px]">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="เรียนจบแล้ว" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="ยังไม่จบ" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink">{lesson.title}</span>
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
                          <div className="space-y-2.5 pb-4 pl-8 text-xs text-slate-700">
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
                            {(() => {
                              const curated = getResourcesForLesson(lesson.id);
                              const plan = buildLearningPlan(lesson.id, budget);
                              return (
                                <>
                                  {curated.length > 0 && (
                                    <div>
                                      <p className="font-bold text-slate-800">แหล่งเรียนรู้ที่ V2U คัดมา</p>
                                      <ul className="mt-1 space-y-1.5">
                                        {curated.map((r) => (
                                          <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                                            <p className="font-semibold text-slate-900">{r.title}</p>
                                            <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                                              <span>{TYPE_LABEL[r.type]}</span>
                                              <span>{r.estimatedMinutes} นาที</span>
                                              <span>ระดับ{RESOURCE_LEVEL_LABEL[r.level]}</span>
                                              <span>{r.language === 'th' ? 'ภาษาไทย' : 'ภาษาอังกฤษ'}</span>
                                              <span>{r.isFree ? 'ฟรี' : 'มีค่าใช้จ่าย'}</span>
                                            </p>
                                            <p className="mt-1 text-slate-700">
                                              <span className="font-semibold text-blue-700">ทำไม V2U เลือก: </span>
                                              {r.whyV2USelected}
                                            </p>
                                            {r.url ? (
                                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-blue-700 underline">
                                                เปิดแหล่งเรียนรู้
                                              </a>
                                            ) : (
                                              <p className="mt-1 text-[11px] text-slate-500">
                                                หาได้ที่: {r.locator}
                                                {r.status === 'unverified' && <span className="ml-1 text-amber-700">(ยังไม่ได้ตรวจลิงก์)</span>}
                                              </p>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {plan && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
                                      <p className="font-bold text-blue-900">แผนที่ V2U จัดให้ · {plan.totalMinutes} นาที</p>
                                      <ol className="mt-1 space-y-1">
                                        {plan.steps.map((st, i) => (
                                          <li key={`${st.kind}-${i}`} className="text-slate-800">
                                            <span className="font-semibold">
                                              {i + 1}. {st.label} — {st.minutes} นาที
                                            </span>
                                            <span className="block text-[11px] text-slate-500">
                                              {st.detail}
                                            </span>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <Link
                              to={`/learn/curriculum/${lesson.id}`}
                              className="mr-2 inline-flex items-center rounded-xl border border-blue-300 bg-white px-3.5 py-2 min-h-[44px] text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              เปิดบทเรียน (คลิป · อ่าน · V2U)
                            </Link>
                            {studyLesson && (
                              <Link
                                to={`/learn/curriculum/${lesson.id}?mode=v2u`}
                                className="inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-2 min-h-[44px] text-xs font-bold text-white hover:bg-blue-700"
                              >
                                เริ่มเรียนตามแผน
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
        <aside aria-label="ความพร้อมและเวลา" className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-4">
      <section aria-label="ความพร้อมตามข้อกำหนด" className="order-1 lg:order-none grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
        {CURRICULUM.pathway.requirements.map((req) => {
          const r = readiness.find((x) => x.subjectId === req.subjectId);
          const subject = CURRICULUM.subjects.find((s) => s.id === req.subjectId);
          const pct = r?.readinessPercent ?? 0;
          return (
            <div key={req.subjectId} className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">{subject?.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">ความพร้อม {pct}% · เป้าหมาย {req.targetReadinessPercent}%</p>
              <div className="mt-2.5">
                <ProgressBar value={pct} target={req.targetReadinessPercent} label={`${subject?.title} ความพร้อม ${pct}%`} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{req.exams.join(' · ')}</p>
            </div>
          );
        })}
      </section>

      <section aria-label="เวลาที่มี" className="order-2 lg:order-none sticky top-0 z-[5] -mx-3.5 lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-white lg:px-4 border-b border-slate-200 bg-canvas/95 px-3.5 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:px-4">
        <TimeBudgetPicker value={budget} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        <p className="mt-1.5 text-[11px] text-slate-500">เปิดบทเรียนด้านล่างเพื่อดูแผนที่ V2U จัดให้ตามเวลานี้</p>
      </section>

        </aside>
      </div>
    </div>
  );
}
