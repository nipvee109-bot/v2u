/* =========================================================================
   Phase 61 — the adaptive learning loop (one place, used by the Learning Hub
   and by tests):
     check (+ practice) → evidence → skill / mastery / review → gap → next step
   It only drives the EXISTING store actions (session engine, review engine);
   everything after is recalculated from the fresh store — nothing hard-coded.
   ========================================================================= */

import { useStore } from '../store/useStore';
import type { UnderstandingSummary, LearningMode } from '../interactive/types';
import { computeSkillProfile, diffSkillProfiles } from '../diagnostic/engine';
import type { SkillChange } from '../diagnostic/engine';
import { getNextStep } from '../utils/nextStep';
import type { NextStep } from '../utils/nextStep';
import { nextStepParamsFromState } from './useNextStep';

export interface LoopOutcome {
  passed: boolean;
  score: number;
  practice?: { total: number; solved: number; revealed: number };
  changes: SkillChange[];
  mastery: { before?: number; after?: number };
  review?: { at: string; reason: string };
  next: NextStep;
  /** The next step before this evidence (to show it was recalculated) */
  nextBefore?: { todayAction: string };
}

/** The pass rule used everywhere (same as the completion screen). */
export const checkPassed = (c: Pick<UnderstandingSummary, 'score' | 'confused'>) => c.score >= 70 && c.confused.length === 0;

type Snapshot = ReturnType<typeof useStore.getState>;
const profileOf = (st: Snapshot) => computeSkillProfile({ storeLessons: st.lessons, records: nextStepParamsFromState(st).route!.records, diagnostic: st.diagnostic });

export function recordCheckEvidence(input: {
  studyLessonId: string;
  curriculumLessonId: string;
  skillIds: string[];
  summary: UnderstandingSummary;
  mode?: LearningMode;
  plannedMinutes?: number;
  /** Notes for the existing session draft (review engine) */
  notesDraft?: Parameters<Snapshot['updateLearningSessionDraft']>[0];
}): LoopOutcome {
  const { studyLessonId, curriculumLessonId, skillIds, summary: c } = input;
  const st0 = useStore.getState();
  const p0 = nextStepParamsFromState(st0);
  const before = profileOf(st0);
  const nextBefore = getNextStep(p0);
  const masteryBefore = p0.route!.records.find((r) => r.lessonId === studyLessonId)?.masteryScore;

  // keep a sitting that is already running for this lesson (its timer); otherwise start one
  const live = st0.activeLearningSession;
  const sessionHere = !!live && live.lessonId === studyLessonId && live.status !== 'completed' && live.status !== 'abandoned';
  if (!sessionHere) st0.startLearningSession({ lessonId: studyLessonId, curriculumLessonId, plannedMinutes: input.plannedMinutes });
  if (input.mode) useStore.getState().setLearningMode(input.mode);
  useStore.getState().recordUnderstandingCheck({ score: c.score, understood: c.understood, confused: c.confused, ...(c.practice?.total ? { practice: c.practice } : {}) });
  if (input.notesDraft) useStore.getState().updateLearningSessionDraft(input.notesDraft);
  useStore.getState().finishLearningSession(undefined, c.score);

  const st1 = useStore.getState();
  const p1 = nextStepParamsFromState(st1);
  const review = st1.reviewQueue.find((r) => r.lessonId === studyLessonId && r.status !== 'completed');
  return {
    passed: checkPassed(c),
    score: c.score,
    practice: c.practice,
    changes: diffSkillProfiles(before, profileOf(st1), skillIds),
    mastery: { before: masteryBefore, after: p1.route!.records.find((r) => r.lessonId === studyLessonId)?.masteryScore },
    review: review ? { at: review.nextReviewAt, reason: review.reason } : undefined,
    next: getNextStep(p1),
    nextBefore: { todayAction: nextBefore.todayAction },
  };
}

/** Review answer → the same recalculation (skills of the reviewed lesson + next step). */
export function recordReviewEvidence(input: { reviewItemId: string; outcome: Parameters<Snapshot['submitReviewOutcome']>[1]; notes?: string; skillIds: string[] }) {
  const st0 = useStore.getState();
  const before = profileOf(st0);
  st0.submitReviewOutcome(input.reviewItemId, input.outcome, input.notes);
  const st1 = useStore.getState();
  return { changes: diffSkillProfiles(before, profileOf(st1), input.skillIds), next: getNextStep(nextStepParamsFromState(st1)) };
}
