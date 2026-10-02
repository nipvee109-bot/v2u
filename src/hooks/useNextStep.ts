import { useStore } from '../store/useStore';
import { useLearningRecords } from './useLearningRecords';
import { normalizeStudentProfile } from '../route/engine';
import { getNextStep } from '../utils/nextStep';
import type { NextStep } from '../utils/nextStep';
import { buildRoadmap } from '../roadmap/engine';
import type { BuildRoadmapParams } from '../roadmap/engine';
import type { Roadmap } from '../roadmap/types';
import { getReadinessSummary } from '../readiness/engine';
import type { ReadinessSummary } from '../readiness/engine';

/**
 * The ONE set of inputs for "what should I do today?".
 * Home, เส้นทาง and the Roadmap all derive their next action from this,
 * so they can never disagree.
 */
export function useNextStepParams(): BuildRoadmapParams {
  const {
    lessons,
    sessions = [],
    learningSessionsHistory = [],
    activeLearningSession,
    getDueReviewItems,
    getKnowledgeGaps,
    getCalculatedGoals,
    studentProfile,
    admissionInputs,
  } = useStore();
  const records = useLearningRecords();
  const budget = normalizeStudentProfile(studentProfile).availableMinutes;
  const { overdue, dueToday } = getDueReviewItems();
  return {
    lessons,
    sessions,
    learningSessionsHistory,
    activeLearningSession,
    overdueReviews: overdue,
    dueTodayReviews: dueToday,
    knowledgeGaps: getKnowledgeGaps(),
    goals: getCalculatedGoals(),
    // Adaptive, route-aware mode (Phase 45); checklist answers (Phase 46C)
    route: { profile: studentProfile, records, budget, checklist: admissionInputs?.checklist },
  };
}

export function useNextStep(): NextStep {
  return getNextStep(useNextStepParams());
}

export function useRoadmap(): Roadmap {
  return buildRoadmap(useNextStepParams());
}

/** "ตอนนี้ฉันพร้อมแค่ไหน?" — same inputs as the next step, plus admission answers. */
export function useReadiness(): ReadinessSummary {
  const params = useNextStepParams();
  const admissionInputs = useStore((s) => s.admissionInputs);
  return getReadinessSummary({ ...params, admissionInputs });
}
