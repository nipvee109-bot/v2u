/* =========================================================================
   V2U Personal Plan (Phase 50) — workload, time fit and priority order
   -------------------------------------------------------------------------
   Pure and deterministic. Shared by the Roadmap AND getNextStep() so that a
   tighter plan changes both the week list and today's step together
   (no second decision engine).

   Curriculum = WHAT must be learned. This module = WHEN, for this student.
   ========================================================================= */

import type { Lesson, LearningRecord } from '../types';
import { CURRICULUM } from '../curriculum/data';
import {
  findStudyLesson,
  getCurriculumLesson,
  getMissingPrerequisites,
  getOrderedCurriculumLessons,
  isCurriculumLessonCompleted,
} from '../curriculum/engine';
import type { CurriculumLesson } from '../curriculum/types';
import { getSkillGaps } from '../skills/engine';
import type { StudentRoute } from '../route/types';
import type { ResolvedHorizon } from '../route/engine';
import type { TimeBudgetMinutes } from '../resources/types';

/** Assumed study days per week (documented, coarse; estimates are labelled "ประมาณ"). */
export const STUDY_DAYS_PER_WEEK = 5;
/** Block reserved to strengthen one skill that is not yet solid. */
export const STRENGTHEN_MINUTES = 30;
/** Share of the horizon subject work may use before exam/portfolio prep gets squeezed. */
export const TIGHT_SHARE = 0.75;
/** At or below this share the plan leaves lots of room. */
export const ROOMY_SHARE = 0.4;
const WEEKS_PER_MONTH = 52 / 12;

export function monthsToWeeks(months: number): number {
  return Math.round(months * WEEKS_PER_MONTH);
}

export type PlanItemKind = 'study' | 'strengthen';

export interface PlanItem {
  kind: PlanItemKind;
  title: string;
  minutes: number;
  requirementId: string;
  curriculumLessonId?: string;
  skillId?: string;
  studyLessonId?: string;
}

/* ── Priority ─────────────────────────────────────────────────────────── */

let importanceCache: Map<string, number> | null = null;

/** How many curriculum lessons (transitively) build on this one. */
export function lessonImportance(id: string): number {
  if (!importanceCache) {
    importanceCache = new Map();
    const dependents = new Map<string, string[]>();
    for (const l of CURRICULUM.lessons) for (const p of l.prerequisites) dependents.set(p, [...(dependents.get(p) ?? []), l.id]);
    const count = (x: string, seen: Set<string>): number => {
      for (const d of dependents.get(x) ?? []) if (!seen.has(d)) { seen.add(d); count(d, seen); }
      return seen.size;
    };
    for (const l of CURRICULUM.lessons) importanceCache.set(l.id, count(l.id, new Set()));
  }
  return importanceCache.get(id) ?? 0;
}

/**
 * Order remaining lessons so prerequisites always come first.
 * prioritize=false → normal teaching order.
 * prioritize=true  → among lessons that are ready to learn, the one that the most
 *                    later topics depend on goes first ("เรื่องสำคัญก่อน").
 */
export function orderLessons(lessons: CurriculumLesson[], storeLessons: Lesson[], prioritize: boolean): CurriculumLesson[] {
  const pending = [...lessons];
  const out: CurriculumLesson[] = [];
  const placed = new Set<string>();
  const ready = (l: CurriculumLesson) =>
    getMissingPrerequisites(l, storeLessons).every((p) => placed.has(p.id) || !pending.some((x) => x.id === p.id));
  while (pending.length > 0) {
    const candidates = pending.filter(ready);
    const pool = candidates.length > 0 ? candidates : pending; // safety: never loop forever
    const next = prioritize
      ? [...pool].sort((a, b) => lessonImportance(b.id) - lessonImportance(a.id) || pending.indexOf(a) - pending.indexOf(b))[0]
      : pool[0];
    out.push(next);
    placed.add(next.id);
    pending.splice(pending.indexOf(next), 1);
  }
  return out;
}

/* ── Workload ─────────────────────────────────────────────────────────── */

export interface WorkPlanInputs {
  route: StudentRoute;
  storeLessons: Lesson[];
  records: LearningRecord[];
  referenceDate: Date;
}

/** Remaining work per route requirement (subject phases only), in plan order. */
export function buildWorkPlan(inputs: WorkPlanInputs, prioritize: boolean): Map<string, PlanItem[]> {
  const { route, storeLessons, records, referenceDate } = inputs;
  const ordered = getOrderedCurriculumLessons(CURRICULUM);
  const skillGaps = getSkillGaps({ storeLessons, records, referenceDate });
  const scheduled = new Set<string>();
  const plan = new Map<string, PlanItem[]>();

  const collect = (l: CurriculumLesson, out: CurriculumLesson[]) => {
    if (scheduled.has(l.id) || isCurriculumLessonCompleted(l, storeLessons)) return;
    for (const pre of getMissingPrerequisites(l, storeLessons)) collect(pre, out);
    if (!scheduled.has(l.id)) {
      scheduled.add(l.id);
      out.push(l);
    }
  };

  for (const step of route.steps) {
    const req = step.requirement;
    if (req.kind !== 'subject' || !req.subjectId || step.status === 'done') {
      plan.set(req.id, []);
      continue;
    }
    const lessonsOut: CurriculumLesson[] = [];
    ordered.filter((l) => l.subjectId === req.subjectId).forEach((l) => collect(l, lessonsOut));
    const items: PlanItem[] = [];
    // Weak skills first when prioritising (they block later topics)
    const strengthen = skillGaps
      .filter((g) => g.skill.subjectId === req.subjectId)
      .filter(
        (g) =>
          g.status === 'needs-review' ||
          (g.status === 'developing' &&
            g.lessonIds.every((id) => {
              const cl = getCurriculumLesson(id);
              return !cl || isCurriculumLessonCompleted(cl, storeLessons);
            }))
      )
      .map<PlanItem>((g) => ({
        kind: 'strengthen',
        title: `ทบทวน: ${g.skill.title}`,
        minutes: STRENGTHEN_MINUTES,
        skillId: g.skill.id,
        studyLessonId: g.studyLessonIds[0],
        requirementId: req.id,
      }));
    const study = orderLessons(lessonsOut, storeLessons, prioritize).map<PlanItem>((l) => ({
      kind: 'study',
      title: l.title,
      minutes: l.estimatedMinutes,
      curriculumLessonId: l.id,
      studyLessonId: findStudyLesson(l, storeLessons)?.id,
      requirementId: req.id,
    }));
    items.push(...(prioritize ? [...strengthen, ...study] : [...study, ...strengthen]));
    plan.set(req.id, items);
  }
  return plan;
}

/* ── Time fit ─────────────────────────────────────────────────────────── */

export type FitStatus = 'roomy' | 'fits' | 'tight' | 'over';

export interface PlanFit {
  status: FitStatus;
  /** Weeks in the horizon the student chose (or the default) */
  targetWeeks: number;
  /** Weeks of subject work at the current daily time */
  estimatedWeeks: number;
  /** Plain range in months for the estimate, e.g. 8–9 */
  estimatedMonths: { min: number; max: number };
  remainingMinutes: number;
  weeklyMinutes: number;
  /** Smallest daily-time option that would make the plan fit (if any) */
  suggestedDailyMinutes?: TimeBudgetMinutes;
  /** Months that would fit at the current daily time */
  suggestedMonths?: number;
}

const BUDGETS: TimeBudgetMinutes[] = [15, 30, 60, 120];

export function assessFit(remainingMinutes: number, dailyMinutes: number, horizon: ResolvedHorizon): PlanFit {
  const weeklyMinutes = dailyMinutes * STUDY_DAYS_PER_WEEK;
  const targetWeeks = monthsToWeeks(horizon.months);
  const estimatedWeeks = remainingMinutes > 0 ? Math.ceil(remainingMinutes / weeklyMinutes) : 0;
  const share = targetWeeks > 0 ? estimatedWeeks / targetWeeks : Infinity;
  const status: FitStatus = share > 1 ? 'over' : share > TIGHT_SHARE ? 'tight' : share <= ROOMY_SHARE ? 'roomy' : 'fits';
  const monthsExact = estimatedWeeks / WEEKS_PER_MONTH;
  const fit: PlanFit = {
    status,
    targetWeeks,
    estimatedWeeks,
    estimatedMonths: { min: Math.max(0, Math.floor(monthsExact)), max: Math.max(1, Math.ceil(monthsExact)) },
    remainingMinutes,
    weeklyMinutes,
  };
  if (status === 'over' || status === 'tight') {
    fit.suggestedDailyMinutes = BUDGETS.find(
      (m) => m > dailyMinutes && Math.ceil(remainingMinutes / (m * STUDY_DAYS_PER_WEEK)) <= targetWeeks * TIGHT_SHARE
    );
    fit.suggestedMonths = Math.ceil(estimatedWeeks / TIGHT_SHARE / WEEKS_PER_MONTH);
  }
  return fit;
}

/** Plan mode used by both Roadmap and Next Step: fit + priority order. */
export function computePlan(inputs: WorkPlanInputs & { dailyMinutes: number; horizon: ResolvedHorizon }): {
  fit: PlanFit;
  prioritize: boolean;
  work: Map<string, PlanItem[]>;
} {
  const normal = buildWorkPlan(inputs, false);
  const minutes = [...normal.values()].flat().reduce((s, i) => s + i.minutes, 0);
  const fit = assessFit(minutes, inputs.dailyMinutes, inputs.horizon);
  const prioritize = fit.status === 'over' || fit.status === 'tight';
  return { fit, prioritize, work: prioritize ? buildWorkPlan(inputs, true) : normal };
}
