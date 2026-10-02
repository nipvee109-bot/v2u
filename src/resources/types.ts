/* =========================================================================
   V2U Resource Curation Foundation (Phase 42B) — data model
   -------------------------------------------------------------------------
   Curriculum Lesson → Learning Outcomes → Resource Pool
     → Quality / Relevance filtering → Time-based Learning Plan
     → existing Study Room → Summary → Quiz → Progress

   Curated resources are static reference data (not user state).
   URLs are only stored once verified; until then `url` is omitted and
   `locator` tells the student exactly where to find the material.
   ========================================================================= */

export type CuratedResourceType = 'video' | 'article' | 'documentation' | 'book' | 'pdf' | 'course';

/** What the resource does inside a learning plan. */
export type ResourceRole = 'explanation' | 'worked-example' | 'reference';

export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ResourceLanguage = 'th' | 'en';

/**
 * - active: curated and URL verified
 * - unverified-link: content curated, URL not yet verified (no url stored)
 * - retired: no longer recommended (kept so old references resolve)
 */
export type ResourceStatus = 'active' | 'unverified-link' | 'retired';

/** Outcome id format: `${curriculumLessonId}#o${1-based index}` */
export type OutcomeId = string;

export interface CuratedResource {
  id: string;
  title: string;
  /** Publisher / institution, e.g. "OpenStax (Rice University)" */
  provider: string;
  type: CuratedResourceType;
  role: ResourceRole;
  /** Only when verified. Never fabricated. */
  url?: string;
  /** Only for type === 'video', and only when verified. */
  videoId?: string;
  /** Where to find it without a URL: chapter / section / lecture name. */
  locator: string;
  estimatedMinutes: number;
  level: ResourceLevel;
  description: string;
  curriculumLessonIds: string[];
  coveredOutcomes: OutcomeId[];
  /** "ทำไม V2U เลือก" — shown to the student. */
  whyV2USelected: string;
  /** ISO date (YYYY-MM-DD) the curation was last reviewed. */
  lastChecked: string;
  language: ResourceLanguage;
  /** Explicit — never undefined. */
  isFree: boolean;
  status: ResourceStatus;
}

export type TimeBudgetMinutes = 15 | 30 | 60 | 120;

export const TIME_BUDGETS: { minutes: TimeBudgetMinutes; label: string }[] = [
  { minutes: 15, label: '15 นาที' },
  { minutes: 30, label: '30 นาที' },
  { minutes: 60, label: '1 ชั่วโมง' },
  { minutes: 120, label: '2 ชั่วโมง' },
];

export type PlanStepKind = 'learn' | 'example' | 'deepen' | 'practice' | 'check' | 'recap';

export interface LearningPlanStep {
  kind: PlanStepKind;
  /** Student-facing label, e.g. "ดูบทเรียน" */
  label: string;
  minutes: number;
  /** Curated resource used by this step (learn / example / deepen). */
  resourceId?: string;
  /** V2U curriculum activity used by this step (practice / check). */
  exerciseId?: string;
  quizId?: string;
  /** True when only part of a longer resource fits the budget. */
  partial?: boolean;
  detail: string;
}

export interface LearningPlan {
  curriculumLessonId: string;
  budgetMinutes: TimeBudgetMinutes;
  totalMinutes: number;
  steps: LearningPlanStep[];
}
