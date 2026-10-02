/* =========================================================================
   V2U Route Engine (Phase 43) — domain model
   -------------------------------------------------------------------------
   StartingState + Target
     → Requirements (ordered, with real dependencies)
     → Progress / Gaps per requirement
     → Curriculum lessons → Resources (time-based plan)
     → Today's next step

   Pure data types: no React, no store. Shared by Web/PWA and a future app.
   ========================================================================= */

import type { CurriculumSubjectId } from '../curriculum/types';
import type { LearningPlan, TimeBudgetMinutes } from '../resources/types';

export type EducationLevel = 'ปวช.1' | 'ปวช.2' | 'ปวช.3' | 'ปวส.1' | 'ปวส.2';

export const EDUCATION_LEVELS: EducationLevel[] = ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'];

export interface VocationalProgram {
  id: string;
  title: string;
  /** Subjects the program already gives some practice in. */
  strengths: CurriculumSubjectId[];
}

/**
 * Phase 50: the planning horizon the student chose. Not a promise that all
 * content fits — the planner checks that separately.
 */
export interface PlanningHorizon {
  /** Whole months, 1–24 */
  months: number;
  /** true when picked from the preset list, false for a custom value */
  preset: boolean;
}

export const HORIZON_PRESET_MONTHS = [3, 6, 9, 12] as const;
export const MIN_HORIZON_MONTHS = 1;
export const MAX_HORIZON_MONTHS = 24;
/** Used for planning only while the student has not chosen a horizon. */
export const DEFAULT_HORIZON_MONTHS = 6;

/** Persisted per student (store: studentProfile). */
export interface StudentProfile {
  educationLevel: EducationLevel;
  programId: string;
  targetId: string;
  /** Preferred daily study time; drives the time-based plan. */
  availableMinutes: TimeBudgetMinutes;
  /** Chosen planning horizon; absent = not chosen yet (planner uses the default, labelled as such). */
  planningHorizon?: PlanningHorizon;
  /* Phase 60: the learner's own words for their goal (never inferred; absent = not set yet) */
  targetUniversity?: string;
  targetFaculty?: string;
  targetMajor?: string;
}

export interface RouteTarget {
  id: string;
  /** e.g. "วิศวกรรมคอมพิวเตอร์" */
  title: string;
  faculty: string;
  /** Curriculum pathway this target uses. */
  pathwayId: string;
  requirementIds: string[];
}

export type RequirementKind = 'subject' | 'exam' | 'portfolio' | 'application';

export interface RouteRequirement {
  id: string;
  kind: RequirementKind;
  title: string;
  description: string;
  /** For kind 'subject': readiness comes from the curriculum. */
  subjectId?: CurriculumSubjectId;
  /** Real dependencies (must be done first). Order comes from target.requirementIds. */
  dependsOn: string[];
  /** For non-subject requirements: what has to be prepared. */
  checklist?: string[];
  /** Subject readiness target (0–100); defaults to the curriculum pathway target. */
  targetPercent?: number;
}

export type RequirementStatus = 'done' | 'in-progress' | 'not-started' | 'locked';

export type ChecklistItemStatus = 'met' | 'gap' | 'unknown';

export interface RequirementProgress {
  requirement: RouteRequirement;
  status: RequirementStatus;
  /** For checklist requirements: the student's own answers (Phase 46C). */
  checklist?: { item: string; key: string; status: ChecklistItemStatus }[];
  readinessPercent?: number;
  targetPercent?: number;
  /** Curriculum lessons still to complete (subject requirements). */
  remainingLessonIds: string[];
  /** Student-facing note, e.g. "ต่อยอดจากสายที่เรียน" */
  note?: string;
}

export interface StudentRoute {
  profile: StudentProfile;
  program: VocationalProgram;
  target: RouteTarget;
  steps: RequirementProgress[];
  /** First requirement that is not done and whose dependencies are done. */
  currentRequirementId?: string;
  completedCount: number;
  /** Student-facing summary of the time horizon. */
  horizon: string;
  /** Where the requirements came from: generic route, or a VERIFIED admission path. */
  basis: { kind: 'generic' } | { kind: 'admission-path'; pathId: string; pathName: string };
}

export interface RouteNextStep {
  requirementId: string;
  curriculumLessonId: string;
  curriculumLessonTitle: string;
  /** Trackable store lesson for the existing study flow, when linked. */
  studyLessonId?: string;
  budgetMinutes: TimeBudgetMinutes;
  plan: LearningPlan | null;
  /** WHY — plain Thai. */
  reason: string;
  /** OUTCOME — what the student can do afterwards. */
  outcomes: string[];
}
