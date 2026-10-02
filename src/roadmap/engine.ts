/* =========================================================================
   V2U Roadmap Engine (Phase 47 → Phase 50: personal time horizon)
   -------------------------------------------------------------------------
   Horizon is the student's own choice (preset 3/6/9/12 or custom 1–24
   months); 6 months is only the planning default until they choose.
   Workload, time fit and priority order come from ./plan (shared with
   getNextStep, so today's step and the week list follow the same plan).
   Exams / portfolio / application have no honest duration → open-ended.
   ========================================================================= */

import type { NextStep, NextStepParams } from '../utils/nextStep';
import { buildNextStepRoute, getNextStep } from '../utils/nextStep';
import { normalizeStudentProfile, resolvePlanningHorizon } from '../route/engine';
import type { PlanningHorizon } from '../route/types';
import type { Roadmap, RoadmapAction, RoadmapMonth, RoadmapPhase, RoadmapWeek } from './types';
import { computePlan, monthsToWeeks, STRENGTHEN_MINUTES, STUDY_DAYS_PER_WEEK } from './plan';
import type { PlanItem } from './plan';

export { STUDY_DAYS_PER_WEEK, STRENGTHEN_MINUTES };

export interface BuildRoadmapParams extends NextStepParams {
  route: NonNullable<NextStepParams['route']>;
}

/** Week range of month m within a horizon of `months` months. */
export function monthWeekRange(m: number, months: number): { startWeek: number; endWeek: number } {
  const total = monthsToWeeks(months);
  return { startWeek: Math.round(((m - 1) * total) / months) + 1, endWeek: Math.round((m * total) / months) };
}

function toAction(i: PlanItem): RoadmapAction {
  return {
    kind: i.kind,
    title: i.title,
    minutes: i.minutes,
    curriculumLessonId: i.curriculumLessonId,
    skillId: i.skillId,
    studyLessonId: i.studyLessonId,
    requirementId: i.requirementId,
  };
}

/** Map today's NextStep onto a roadmap action (for the week list). */
function todayAction(step: NextStep): RoadmapAction {
  const kind: RoadmapAction['kind'] =
    step.kind === 'strengthen' ? 'strengthen' : step.kind === 'review' ? 'review' : step.kind === 'continue' ? 'continue' : 'study';
  return {
    kind,
    title: step.todayAction,
    minutes: step.minutes,
    curriculumLessonId: step.curriculum?.lessonId,
    studyLessonId: step.lessonId,
  };
}

export function buildRoadmap(params: BuildRoadmapParams): Roadmap {
  const referenceDate = params.referenceDate ?? new Date();
  const p = { ...params, referenceDate };
  const lessons = p.lessons ?? [];

  // TODAY: single source of truth
  const today = getNextStep(p);
  const route = buildNextStepRoute(p)!;
  const profile = normalizeStudentProfile(p.route.profile);
  const horizon = resolvePlanningHorizon(p.route.profile);
  const dailyMinutes = p.route.budget ?? profile.availableMinutes;

  const plan = computePlan({ route, storeLessons: lessons, records: p.route.records, referenceDate, dailyMinutes, horizon });
  const weeklyMinutes = plan.fit.weeklyMinutes;
  const horizonWeeks = plan.fit.targetWeeks;

  // ── Phases ──────────────────────────────────────────────────────────
  const phases: RoadmapPhase[] = route.steps.map((step) => {
    const req = step.requirement;
    if (req.kind !== 'subject' || !req.subjectId) {
      return {
        requirementId: req.id,
        title: req.title,
        kind: req.kind,
        status: step.status,
        work: (step.checklist ?? [])
          .filter((c) => c.status !== 'met')
          .map((c) => ({ kind: 'checklist' as const, title: c.item, requirementId: req.id })),
        openEnded: true,
      };
    }
    const work = (plan.work.get(req.id) ?? []).map(toAction);
    return {
      requirementId: req.id,
      title: req.title,
      kind: 'subject',
      status: step.status,
      readinessPercent: step.readinessPercent,
      targetPercent: step.targetPercent,
      work,
      remainingMinutes: work.reduce((s, a) => s + (a.minutes ?? 0), 0),
      openEnded: false,
    };
  });

  // ── Weeks: subject phases sequentially; open-ended phases after their dependencies ──
  let cursor = 1;
  for (const ph of phases) {
    if (ph.openEnded || !ph.remainingMinutes) continue;
    const weeks = Math.max(1, Math.ceil(ph.remainingMinutes / weeklyMinutes));
    ph.startWeek = cursor;
    ph.endWeek = cursor + weeks - 1;
    cursor = ph.endWeek + 1;
  }
  const subjectWeeksNeeded = cursor - 1;
  // Work that falls after the chosen horizon (shown as "ถ้ามีเวลา", not silently compressed)
  const beyondHorizon: RoadmapAction[] = [];
  {
    let minutesSoFar = 0;
    const capacity = horizonWeeks * weeklyMinutes;
    for (const ph of phases) {
      if (ph.openEnded) continue;
      for (const a of ph.work) {
        minutesSoFar += a.minutes ?? 0;
        if (minutesSoFar > capacity) beyondHorizon.push(a);
      }
    }
  }
  for (const ph of phases) {
    if (!ph.openEnded || ph.status === 'done') continue;
    const deps = route.steps.find((s) => s.requirement.id === ph.requirementId)?.requirement.dependsOn ?? [];
    // Finite dependency → start after it ends; open-ended dependency → can run alongside it.
    const depStart = Math.max(
      1,
      ...deps.map((d) => {
        const dep = phases.find((x) => x.requirementId === d);
        if (!dep || dep.startWeek === undefined || dep.endWeek === undefined) return 1;
        return dep.openEnded ? dep.startWeek : dep.endWeek + 1;
      })
    );
    const end = Math.max(horizonWeeks, depStart);
    ph.startWeek = depStart;
    ph.endWeek = end;
  }

  // ── Months of the chosen horizon ───────────────────────────────────
  const months: RoadmapMonth[] = Array.from({ length: horizon.months }, (_, i) => {
    const m = i + 1;
    const { startWeek, endWeek } = monthWeekRange(m, horizon.months);
    const active = phases.filter((ph) => ph.startWeek !== undefined && ph.endWeek !== undefined && ph.startWeek <= endWeek && ph.endWeek >= startWeek);
    return {
      index: m,
      startWeek,
      endWeek,
      phaseIds: active.map((a) => a.requirementId),
      focus: active.length > 0 ? active.map((a) => a.title).join(' → ') : 'ทบทวนและรักษาความพร้อม',
      isCurrent: m === 1,
    };
  });

  // ── This week: today first, then the next work in plan order ───────
  const first = todayAction(today);
  const actions: RoadmapAction[] = [first];
  let planned = first.minutes ?? 0;
  const same = (a: RoadmapAction) =>
    (first.curriculumLessonId && a.curriculumLessonId === first.curriculumLessonId) ||
    (first.kind === 'strengthen' && a.kind === 'strengthen' && a.studyLessonId === first.studyLessonId);
  // Stop at the first item that does not fit, so the week keeps plan order.
  fill: for (const ph of phases) {
    if (ph.openEnded) continue;
    for (const a of ph.work) {
      if (same(a)) continue;
      if (planned + (a.minutes ?? 0) > weeklyMinutes) break fill;
      actions.push(a);
      planned += a.minutes ?? 0;
    }
  }
  const thisWeek: RoadmapWeek = { index: 1, budgetMinutes: weeklyMinutes, plannedMinutes: planned, actions };

  const chosen: PlanningHorizon | undefined = profile.planningHorizon;
  return {
    horizonWeeks,
    horizon: { months: horizon.months, isDefault: horizon.isDefault, preset: chosen?.preset ?? true },
    dailyMinutes,
    weeklyMinutes,
    fit: plan.fit,
    prioritized: plan.prioritize,
    beyondHorizon,
    phases,
    months,
    currentPhaseId: route.currentRequirementId,
    currentMonth: months[0],
    thisWeek,
    today,
    fitsInHorizon: subjectWeeksNeeded <= horizonWeeks,
    subjectWeeksNeeded,
    basis: route.basis,
  };
}
