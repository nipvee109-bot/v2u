import { KIcon, Pill } from '../components/v2u/kit';
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
import { LoopStrip, PlanBar } from '../components/ui';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { getNextStep } from '../utils/nextStep';
import { LoopResult } from '../components/pathway/LoopResult';
import { recordCheckEvidence } from '../hooks/learningLoop';
import type { LoopOutcome } from '../hooks/learningLoop';
import { nextStepParamsFromState } from '../hooks/useNextStep';
import { isTrackSubject } from '../subjects/registry';

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
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed p-8 text-center" style={{ borderColor: 'var(--line-2)' }}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}><KIcon name="file" size={26} /></span>
          <p className="font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>ไม่พบบทเรียนนี้</p>
          <Link to="/learn/curriculum" className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold" style={{ border: '1px solid var(--line-2)', color: 'var(--ink)' }}>กลับไปหลักสูตร</Link>
        </div>
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
  const track = isTrackSubject(lesson.subjectId);
  const weakSkillIds = getSkillGaps({ storeLessons: lessons, records }).filter((g) => g.status === 'needs-review').map((g) => g.skill.id);

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
    // Optional tracks get their study lesson only when the learner actually does the work (additive, idempotent)
    const studyLessonId = studyLesson?.id ?? (track ? useStore.getState().ensureStudyLesson({ title: lesson.studyLessonTitle, subjectId: lesson.subjectId, description: CURRICULUM.subjects.find((s) => s.id === lesson.subjectId)?.description }) : undefined);
    if (!studyLessonId) return;
    setOutcome(
      recordCheckEvidence({
        studyLessonId,
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
      <div className={mode === 'video' ? 'space-y-5' : 'space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:space-y-0'}>
        <div className="min-w-0 space-y-5">
          <LessonLearning
            curriculumLessonId={lesson.id}
            backTo={fromNext ? '/' : '/learn'}
            notice={<>
      {track && (
        <p className="flex items-start gap-2 rounded-[14px] px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--web-soft)', color: 'var(--ink)' }} data-testid="track-notice">
          <span style={{ color: 'var(--web)', marginTop: 2 }}><KIcon name="code" size={16} /></span>
          <span><b>เส้นทางทักษะเสริม</b> — เรียนตามสนใจได้เลย บทนี้ไม่นับรวมความพร้อมสอบเข้ามหาวิทยาลัย</span>
        </p>
      )}
      {missing.length > 0 && (
        <p className="flex items-start gap-2 rounded-[14px] px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--rev-soft)', color: 'var(--ink)' }}>
          <span style={{ color: 'var(--rev)', marginTop: 2 }}><KIcon name="lock" size={16} /></span>
          <span>ควรปูพื้นก่อน: {missing.map((x) => x.title).join(', ')} — เรียนบทนี้ได้ แต่จะง่ายขึ้นถ้าเรียนบทก่อนหน้าก่อน</span>
        </p>
      )}
      {(fromNext || sessionHere) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--brand-soft)', color: 'var(--ink)' }} data-testid="learning-hub-context">
          <span className="flex items-center gap-2"><span style={{ color: 'var(--brand-ink)' }}><KIcon name="nav" size={16} /></span><span>
            <b>ก้าวต่อไปที่ V2U เลือกให้</b>
            {plannedFromNext ? ` · วันนี้ ${plannedFromNext} นาที` : ''}
            {sessionHere ? ' · กำลังจับเวลาเรียน' : ' · เริ่มจับเวลาเมื่อคุณเลือกวิธีเรียน'}
          </span></span>
          {sessionHere && studyLesson && (
            <Link to={`/study/${studyLesson.id}`} className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-xs font-bold" style={{ color: 'var(--brand-ink)' }}>
              ไปห้องเรียน (ตัวจับเวลา + โน้ต)
            </Link>
          )}
        </div>
      )}

            </>}
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
        <section aria-label="แผนวันนี้" className="p-5" style={{ borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-start">
            <p className="flex items-center gap-1.5 font-display text-[15px] font-bold" style={{ color: 'var(--ink)' }}><KIcon name="clock" size={16} /> แผนวันนี้ · {budget} นาที</p>
            <LoopStrip current="learn" />
          </div>
          <p className="sr-only" data-testid="plan-summary">{describePlan(plan)}</p>
          <div className="mt-3">
            <PlanBar segments={plan.steps.map((st) => ({ label: st.label, minutes: st.minutes }))} />
          </div>
        </section>
      )}
          <section aria-label="ความคืบหน้าของบทนี้" className="p-5" style={{ borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-[15px] font-bold" style={{ color: 'var(--ink)' }}>บทนี้</p>
              <Pill c={done ? 'var(--ok)' : 'var(--none)'} soft={done ? 'var(--ok-soft)' : 'var(--none-soft)'} icon={done ? 'sOk' : 'sNone'}>{done ? 'เรียนจบแล้ว' : 'ยังไม่จบ'}</Pill>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">เรียนจบแล้วจะทำได้</p>
            <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700">
              {lesson.learningOutcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 break-words">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${done ? 'bg-[var(--ok)]' : 'bg-[var(--line-2)]'}`} aria-hidden="true" />
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
        <div className={mode ? '' : 'fixed inset-x-0 bottom-[66px] z-30 border-t border-[var(--line)] bg-[var(--nav-bg)] p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0'}>
          <Link to={`/learn/curriculum/${lesson.id}?mode=v2u`} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] px-6 text-base font-bold md:w-auto md:inline-flex lg:flex lg:w-full" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
            เริ่มเรียนตามแผน
          </Link>
        </div>
      )}
        </aside>
      </div>
    </div>
  );
}
