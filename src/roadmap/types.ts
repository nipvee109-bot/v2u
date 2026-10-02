/* =========================================================================
   V2U Roadmap (Phase 47) — domain types
   -------------------------------------------------------------------------
   horizon (student's own months) → month → week → today, derived from:
     Route (requirements, verified admission path or generic)
     Skill Gap (readiness, weak skills)
     Curriculum (lessons, prerequisites, estimated minutes)
     Next Step (today — the single source of truth)
   ========================================================================= */

import type { RequirementStatus } from '../route/types';
import type { NextStep } from '../utils/nextStep';
import type { PlanFit } from './plan';

export type RoadmapActionKind = 'study' | 'strengthen' | 'review' | 'continue' | 'checklist';

export interface RoadmapAction {
  kind: RoadmapActionKind;
  title: string;
  /** Planned minutes; undefined when it cannot be estimated honestly. */
  minutes?: number;
  curriculumLessonId?: string;
  skillId?: string;
  /** Trackable store lesson for the existing study flow. */
  studyLessonId?: string;
  /** Route requirement this action serves. */
  requirementId?: string;
}

export interface RoadmapPhase {
  requirementId: string;
  title: string;
  kind: 'subject' | 'exam' | 'portfolio' | 'application';
  status: RequirementStatus;
  readinessPercent?: number;
  targetPercent?: number;
  /** Remaining work items (subject phases only). */
  work: RoadmapAction[];
  /** Sum of work minutes; undefined for open-ended phases (exams, portfolio, application). */
  remainingMinutes?: number;
  /** 1-based week within the 6-month horizon; undefined when finished. */
  startWeek?: number;
  endWeek?: number;
  /** True when the phase has no honest duration estimate (runs until application). */
  openEnded: boolean;
}

export interface RoadmapMonth {
  index: number; // 1..6
  startWeek: number;
  endWeek: number;
  phaseIds: string[];
  /** Plain-Thai focus line, e.g. "พื้นฐานคณิตศาสตร์ → ฟิสิกส์" */
  focus: string;
  isCurrent: boolean;
}

export interface RoadmapWeek {
  /** Week 1 = the current week */
  index: number;
  budgetMinutes: number;
  plannedMinutes: number;
  actions: RoadmapAction[];
}

export interface Roadmap {
  /** Weeks in the planning horizon (chosen by the student, or the default) */
  horizonWeeks: number;
  /** Phase 50: the horizon; isDefault = student has not chosen one yet */
  horizon: { months: number; isDefault: boolean; preset: boolean };
  dailyMinutes: number;
  /** Does the remaining work fit the horizon at the current daily time? */
  fit: PlanFit;
  /** true when time is short and important topics were moved first */
  prioritized: boolean;
  /** Work that does not fit inside the horizon at the current daily time */
  beyondHorizon: RoadmapAction[];
  /** Daily minutes × study days per week */
  weeklyMinutes: number;
  phases: RoadmapPhase[];
  months: RoadmapMonth[];
  currentPhaseId?: string;
  currentMonth: RoadmapMonth;
  thisWeek: RoadmapWeek;
  /** TODAY — identical to getNextStep() for the same inputs. */
  today: NextStep;
  /** Subject work fits within the horizon at the current daily time. */
  fitsInHorizon: boolean;
  /** Weeks of subject work remaining at the current daily time. */
  subjectWeeksNeeded: number;
  basis: { kind: 'generic' } | { kind: 'admission-path'; pathId: string; pathName: string };
}
