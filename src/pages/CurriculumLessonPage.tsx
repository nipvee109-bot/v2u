import { SubjectTag } from '../components/ui/subject';
import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson, getMissingPrerequisites, isCurriculumLessonCompleted } from '../curriculum/engine';
import { buildLearningPlan, isTimeBudget } from '../resources/engine';
import { getLearningPath, describePlan } from '../content/engine';
import { normalizeStudentProfile } from '../route/engine';
import { LessonLearning } from '../components/learning/LessonLearning';
import type { LearningMode, UnderstandingSummary } from '../interactive/types';
import { unclearNoteFrom } from '../interactive/engine';
import { mergeIntoDraft, notesToSessionDraft } from '../notes/engine';
import { useLearningRecords } from '../hooks/useLearningRecords';
import { getSkillGaps } from '../skills/engine';
import { Chip, LoopStrip, PlanBar, ScreenHeader } from '../components/ui';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { getNextStep } from '../utils/nextStep';
import { LoopResult } from '../components/pathway/LoopResult';
import { recordCheckEvidence } from '../hooks/learningLoop';
import type { LoopOutcome } from '../hooks/learningLoop';
import { nextStepParamsFromState } from '../hooks/useNextStep';

const MODES: LearningMode[] = ['read', 'video', 'v2u'];

/** /learn/curriculum/:lessonId — one lesson, three ways to learn it. */
export function CurriculumLessonPage() {
  const { lessonId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { lessons, studentProfile, startLearningSession, setLearningMode, activeLearningSession } = useStore();
  const fromNext = params.get('from') === 'next';
  const plannedFromNext = Number(params.get('min')) || undefined;
  const lastCheck = useRef<UnderstandingSummary | null>(null);
  const [outcome, setOutcome] = useState<LoopOutcome | null>(null);
  const { start, confirmModal } = useStartNextStep();
  const notes = useStore((st) => st.learningNotes?.notes) ?? [];
  const records = useLearningRecords();
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
  // No default: the learner chooses how to learn (old links: ?mode=original → เรียนกับ V2U)
  const m = params.get('mode') === 'original' ? 'v2u' : params.get('mode');
  const mode = MODES.find((x) => x === m);
  const daily = normalizeStudentProfile(studentProfile).availableMinutes;
  const budget = isTimeBudget(daily) ? daily : 30;
  const plan = buildLearningPlan(lessonId, budget);
  const studyLesson = findStudyLesson(lesson, lessons);
  const missing = getMissingPrerequisites(lesson, lessons);
  const done = isCurriculumLessonCompleted(lesson, lessons);
  const weakSkillIds = getSkillGaps({ storeLessons: lessons, records }).filter((g) => g.status === 'needs-review').map((g) => g.skill.id);
  const subject = CURRICULUM.subjects.find((s) => s.id === lesson.subjectId);

  // Finishing here records the sitting through the normal study flow (mastery, review, next step)
  const sessionHere = !!studyLesson && activeLearningSession?.lessonId === studyLesson.id && activeLearningSession.status !== 'completed' && activeLearningSession.status !== 'abandoned';
  /** Choosing a mode from the next step starts the timed sitting (the existing session engine). */
  const chooseMode = (next: LearningMode) => {
    setParams({ mode: next, ...(fromNext ? { from: 'next' } : {}), ...(plannedFromNext ? { min: String(plannedFromNext) } : {}) }, { replace: true });
    if (!studyLesson) return;
    if (fromNext && !sessionHere) startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: lesson.id, plannedMinutes: plannedFromNext ?? budget });
    if (fromNext || sessionHere) setLearningMode(next);
  };

  /**
   * Phase 61 — the learning loop, right here in the Learning Hub:
   * check (+ practice) → evidence → skill / mastery / review → gap → next step.
   * Uses the existing session engine (start → recordUnderstandingCheck → finish);
   * everything after is recalculated from the fresh store, nothing is hard-coded.
   */
  const recordEvidence = (c: UnderstandingSummary) => {
    lastCheck.current = c;
    if (!studyLesson) return;
    setOutcome(
      recordCheckEvidence({
        studyLessonId: studyLesson.id,
        curriculumLessonId: lesson.id,
        skillIds: lesson.skillIds,
        summary: c,
        mode,
        plannedMinutes: plannedFromNext ?? budget,
        // personal notes + confused skills → the existing session notes (review engine)
        notesDraft: mergeIntoDraft(notesToSessionDraft(notes, lesson.id), unclearNoteFrom(c)),
      })
    );
  };

  /** Next: the RECALCULATED next step (never "the next lesson in the list"). */
  const goNext = () => {
    if (outcome) return start(outcome.next);
    const st = useStore.getState();
    start(getNextStep(nextStepParamsFromState(st)));
  };

  return (
    <div className={`mx-auto w-full max-w-3xl lg:max-w-6xl space-y-5 md:pb-0 ${mode ? '' : 'pb-20'}`}>
      {confirmModal}
      <ScreenHeader
        back={{ to: '/learn/curriculum', label: 'หลักสูตร' }}
        eyebrow={subject ? <SubjectTag subjectId={lesson.subjectId} label={subject.title} /> : undefined}
        title={lesson.title}
        subtitle={lesson.description}
      />
      <div className="-mt-3 flex flex-wrap gap-2">
        <Chip tone="brand">{lesson.estimatedMinutes} นาที</Chip>
        <Chip>{lesson.learningOutcomes.length} สิ่งที่จะทำได้</Chip>
        {missing.length > 0 && <Chip tone="warn">ควรปูพื้นก่อน: {missing.map((x) => x.title).join(', ')}</Chip>}
      </div>
      {(fromNext || sessionHere) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm" data-testid="learning-hub-context">
          <span className="text-brand-900">
            <b>ก้าวต่อไปที่ V2U เลือกให้</b>
            {plannedFromNext ? ` · วันนี้ ${plannedFromNext} นาที` : ''}
            {sessionHere ? ' · ⏱ กำลังจับเวลาเรียน' : ' · เริ่มจับเวลาเมื่อคุณเลือกวิธีเรียน'}
          </span>
          {sessionHere && studyLesson && (
            <Link to={`/study/${studyLesson.id}`} className="inline-flex min-h-[40px] items-center text-xs font-semibold text-brand-700">
              ไปห้องเรียน (ตัวจับเวลา + โน้ต)
            </Link>
          )}
        </div>
      )}

      <div className={mode === 'video' ? 'space-y-5' : 'space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:space-y-0'}>
        <div className="min-w-0 space-y-5">
          <LessonLearning
            curriculumLessonId={lesson.id}
            mode={mode}
            onModeChange={chooseMode}
            ownResources={studyLesson?.resources ?? []}
            availableMinutes={budget}
            weakSkillIds={weakSkillIds}
            onCheckSubmitted={recordEvidence}
            onNext={goNext}
            nextLabel="เริ่มขั้นต่อไป"
            result={outcome ? <LoopResult outcome={outcome} onNext={goNext} /> : undefined}
          />
        </div>
        <aside aria-label="แผน ความคืบหน้า และเริ่มเรียน" className={mode === 'video' ? 'hidden' : 'space-y-4 lg:sticky lg:top-0'}>
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
          <section aria-label="ความคืบหน้าของบทนี้" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4">
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
        <div className={mode ? '' : 'fixed inset-x-0 bottom-[68px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0'}>
          <Link to={`/learn/curriculum/${lesson.id}?mode=v2u`} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-base font-bold text-white shadow-sm hover:bg-brand-700 md:w-auto md:inline-flex lg:flex lg:w-full">
            เริ่มเรียนตามแผน
          </Link>
        </div>
      )}
        </aside>
      </div>
    </div>
  );
}
