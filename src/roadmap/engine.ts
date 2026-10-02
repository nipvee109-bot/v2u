/* =========================================================================
   V2U Roadmap Engine (Phase 47) — deterministic 6 months → month → week → today
   -------------------------------------------------------------------------
   Consumes Route + Skill Gap + Curriculum + Next Step; owns only scheduling.

   Estimates are deliberately coarse and labelled "ประมาณ":
     remaining work  = minutes of curriculum lessons not yet completed
                       (+ missing prerequisites from other subjects, scheduled first)
                       + a fixed strengthening block per skill that is not solid
     weekly capacity = daily minutes × STUDY_DAYS_PER_WEEK
   Exams / portfolio / application have no honest duration → open-ended.
   ========================================================================= */

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
import type { NextStep, NextStepParams } from '../utils/nextStep';
import { buildNextStepRoute, getNextStep } from '../utils/nextStep';
import { normalizeStudentProfile } from '../route/engine';
import type { Roadmap, RoadmapAction, RoadmapMonth, RoadmapPhase, RoadmapWeek } from './types';

export const HORIZON_WEEKS = 26;
export const HORIZON_MONTHS = 6;
/** Assumed study days per week for weekly capacity (documented, coarse). */
export const STUDY_DAYS_PER_WEEK = 5;
/** Block reserved to strengthen one skill that is not yet solid. */
export const STRENGTHEN_MINUTES = 30;

export interface BuildRoadmapParams extends NextStepParams {
  route: NonNullable<NextStepParams['route']>;
}

/** Week range of month m (1..6) within the 26-week horizon. */
export function monthWeekRange(m: number): { startWeek: number; endWeek: number } {
  const per = HORIZON_WEEKS / HORIZON_MONTHS;
  return { startWeek: Math.ceil((m - 1) * per) + 1, endWeek: Math.ceil(m * per) };
}

function lessonAction(l: CurriculumLesson, storeLessons: NextStepParams['lessons'], requirementId: string): RoadmapAction {
  return {
    kind: 'study',
    title: l.title,
    minutes: l.estimatedMinutes,
    curriculumLessonId: l.id,
    studyLessonId: findStudyLesson(l, storeLessons)?.id,
    requirementId,
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
  const dailyMinutes = p.route.budget ?? profile.availableMinutes;
  const weeklyMinutes = dailyMinutes * STUDY_DAYS_PER_WEEK;

  const skillGaps = getSkillGaps({ storeLessons: lessons, records: p.route.records, referenceDate });
  const ordered = getOrderedCurriculumLessons(CURRICULUM);
  const scheduled = new Set<string>();

  // Insert missing prerequisites (any subject) before the lesson that needs them.
  const withPrereqs = (l: CurriculumLesson, out: CurriculumLesson[]) => {
    if (scheduled.has(l.id) || isCurriculumLessonCompleted(l, lessons)) return;
    for (const pre of getMissingPrerequisites(l, lessons)) withPrereqs(pre, out);
    if (!scheduled.has(l.id)) {
      scheduled.add(l.id);
      out.push(l);
    }
  };

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
    const work: RoadmapAction[] = [];
    if (step.status !== 'done') {
      const lessonsOut: CurriculumLesson[] = [];
      ordered.filter((l) => l.subjectId === req.subjectId).forEach((l) => withPrereqs(l, lessonsOut));
      lessonsOut.forEach((l) => work.push(lessonAction(l, lessons, req.id)));
      // Skills not solid in this subject: needs-review always; developing only once its lessons are done
      skillGaps
        .filter((g) => g.skill.subjectId === req.subjectId)
        .filter((g) => g.status === 'needs-review' || (g.status === 'developing' && g.lessonIds.every((id) => {
          const cl = getCurriculumLesson(id);
          return !cl || isCurriculumLessonCompleted(cl, lessons);
        })))
        .forEach((g) =>
          work.push({ kind: 'strengthen', title: `ทบทวน: ${g.skill.title}`, minutes: STRENGTHEN_MINUTES, skillId: g.skill.id, studyLessonId: g.studyLessonIds[0], requirementId: req.id })
        );
    }
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
    ph.startWeek = Math.min(depStart, HORIZON_WEEKS);
    ph.endWeek = HORIZON_WEEKS;
  }

  // ── Months ──────────────────────────────────────────────────────────
  const months: RoadmapMonth[] = Array.from({ length: HORIZON_MONTHS }, (_, i) => {
    const m = i + 1;
    const { startWeek, endWeek } = monthWeekRange(m);
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

  // ── This week: today first, then the next work in roadmap order ─────
  const first = todayAction(today);
  const actions: RoadmapAction[] = [first];
  let planned = first.minutes ?? 0;
  const same = (a: RoadmapAction) =>
    (first.curriculumLessonId && a.curriculumLessonId === first.curriculumLessonId) ||
    (first.kind === 'strengthen' && a.kind === 'strengthen' && a.studyLessonId === first.studyLessonId);
  // Stop at the first item that does not fit, so the week keeps roadmap order.
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

  return {
    horizonWeeks: HORIZON_WEEKS,
    weeklyMinutes,
    phases,
    months,
    currentPhaseId: route.currentRequirementId,
    currentMonth: months[0],
    thisWeek,
    today,
    fitsInHorizon: subjectWeeksNeeded <= HORIZON_WEEKS,
    subjectWeeksNeeded,
    basis: route.basis,
  };
}
