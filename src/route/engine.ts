/* =========================================================================
   V2U Route Engine (Phase 43) — deterministic route & today's step
   Pure functions: no React / store.
   ========================================================================= */

import type { Lesson } from '../types';
import type { Curriculum, CurriculumLesson, CurriculumSubjectId } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import {
  getOrderedCurriculumLessons,
  isCurriculumLessonCompleted,
  getMissingPrerequisites,
  findStudyLesson,
} from '../curriculum/engine';
import { buildLearningPlan, isTimeBudget } from '../resources/engine';
import type { TimeBudgetMinutes } from '../resources/types';
import { DEFAULT_STUDENT_PROFILE, ROUTE_REQUIREMENTS, ROUTE_TARGETS, VOCATIONAL_PROGRAMS } from './data';
import type {
  RequirementProgress,
  RouteNextStep,
  RouteRequirement,
  RouteTarget,
  StudentProfile,
  StudentRoute,
  VocationalProgram,
} from './types';
import { EDUCATION_LEVELS } from './types';
import { checklistKey } from './keys';
import { ADMISSION_REGISTRY } from '../admission/registry';
import { getPathsForRouteTarget, toRouteRequirements } from '../admission/engine';
import type { AdmissionRegistry } from '../admission/types';

/* ── Lookups ──────────────────────────────────────────────────────────── */

export function getRouteTarget(id: string): RouteTarget | undefined {
  return ROUTE_TARGETS.find((t) => t.id === id);
}

export function getRouteRequirement(id: string): RouteRequirement | undefined {
  return ROUTE_REQUIREMENTS.find((r) => r.id === id);
}

export function getVocationalProgram(id: string): VocationalProgram {
  return VOCATIONAL_PROGRAMS.find((p) => p.id === id) ?? VOCATIONAL_PROGRAMS[VOCATIONAL_PROGRAMS.length - 1];
}

/** Fill gaps / repair invalid values from older or partial persisted profiles. */
export function normalizeStudentProfile(profile?: Partial<StudentProfile> | null): StudentProfile {
  const p = { ...DEFAULT_STUDENT_PROFILE, ...(profile ?? {}) };
  return {
    educationLevel: EDUCATION_LEVELS.includes(p.educationLevel) ? p.educationLevel : DEFAULT_STUDENT_PROFILE.educationLevel,
    programId: VOCATIONAL_PROGRAMS.some((x) => x.id === p.programId) ? p.programId : DEFAULT_STUDENT_PROFILE.programId,
    targetId: getRouteTarget(p.targetId) ? p.targetId : DEFAULT_STUDENT_PROFILE.targetId,
    availableMinutes: isTimeBudget(p.availableMinutes) ? p.availableMinutes : DEFAULT_STUDENT_PROFILE.availableMinutes,
  };
}

/**
 * Map the onboarding weekly study load to the nearest daily time option,
 * using the onboarding's own wording (hours ÷ 7 days).
 */
export function budgetFromWeeklyHours(hours: number): TimeBudgetMinutes {
  const daily = (Math.max(0, hours) * 60) / 7;
  const options: TimeBudgetMinutes[] = [15, 30, 60, 120];
  return options.reduce((best, m) => (Math.abs(m - daily) < Math.abs(best - daily) ? m : best), options[0]);
}

export function getHorizonText(level: StudentProfile['educationLevel']): string {
  if (level === 'ปวช.3' || level === 'ปวส.2') return 'ปีสุดท้าย — เตรียมสอบและสมัครในรอบปีนี้';
  if (level === 'ปวช.2' || level === 'ปวส.1') return 'เหลือเวลาประมาณ 1 ปีก่อนสมัคร';
  return 'เหลือเวลาประมาณ 2 ปี — ปูพื้นให้แน่นก่อน';
}

/* ── Subject readiness (replaceable by the Skill Gap engine) ──────────── */

export interface SubjectReadinessInput {
  subjectId: CurriculumSubjectId;
  readinessPercent: number;
}

/**
 * Readiness provider. Default: share of curriculum lessons completed.
 * Phase 44 passes a skill-gap based provider instead.
 */
export type ReadinessProvider = (subjectId: CurriculumSubjectId, storeLessons: Lesson[]) => number;

export const completionReadiness: ReadinessProvider = (subjectId, storeLessons) => {
  const lessons = CURRICULUM.lessons.filter((l) => l.subjectId === subjectId);
  if (lessons.length === 0) return 0;
  const done = lessons.filter((l) => isCurriculumLessonCompleted(l, storeLessons)).length;
  return Math.round((done / lessons.length) * 100);
};

/* ── Route ────────────────────────────────────────────────────────────── */

export { checklistKey } from './keys';

export interface BuildRouteParams {
  profile?: Partial<StudentProfile> | null;
  storeLessons: Lesson[];
  /** Student answers for exam / portfolio / application checklists (absent = unknown). */
  checklist?: Record<string, 'met' | 'gap'>;
  readiness?: ReadinessProvider;
  curriculum?: Curriculum;
  /** Admission data; only VERIFIED paths can replace the generic route. */
  admissionRegistry?: AdmissionRegistry;
  /** Preferred verified path; defaults to the earliest-round verified path. */
  admissionPathId?: string;
}

export function buildStudentRoute(params: BuildRouteParams): StudentRoute {
  const { storeLessons, readiness = completionReadiness, curriculum = CURRICULUM } = params;
  const profile = normalizeStudentProfile(params.profile);
  const target = getRouteTarget(profile.targetId) ?? ROUTE_TARGETS[0];
  const program = getVocationalProgram(profile.programId);

  // Verified admission path (if any) refines the route; otherwise generic route.
  const verifiedPaths = getPathsForRouteTarget(target.id, params.admissionRegistry ?? ADMISSION_REGISTRY);
  const path = verifiedPaths.find((p) => p.id === params.admissionPathId) ?? verifiedPaths[0];
  const requirements: RouteRequirement[] = path
    ? toRouteRequirements(path, params.admissionRegistry ?? ADMISSION_REGISTRY, curriculum)
    : target.requirementIds.map((id) => getRouteRequirement(id)).filter((r): r is RouteRequirement => !!r);

  const statusById = new Map<string, RequirementProgress['status']>();
  const steps: RequirementProgress[] = [];

  for (const requirement of requirements) {
    const reqId = requirement.id;
    const depsDone = requirement.dependsOn.every((d) => statusById.get(d) === 'done');

    if (requirement.kind === 'subject' && requirement.subjectId) {
      const subjectId = requirement.subjectId;
      const targetPercent =
        requirement.targetPercent ?? curriculum.pathway.requirements.find((r) => r.subjectId === subjectId)?.targetReadinessPercent ?? 70;
      const readinessPercent = readiness(subjectId, storeLessons);
      const subjectLessons = curriculum.lessons.filter((l) => l.subjectId === subjectId);
      const remaining = subjectLessons.filter((l) => !isCurriculumLessonCompleted(l, storeLessons));
      const started =
        remaining.length < subjectLessons.length ||
        subjectLessons.some((l) => findStudyLesson(l, storeLessons)?.status === 'IN PROGRESS');
      const status: RequirementProgress['status'] =
        readinessPercent >= targetPercent ? 'done' : started || readinessPercent > 0 ? 'in-progress' : 'not-started';
      statusById.set(reqId, status);
      steps.push({
        requirement,
        status,
        readinessPercent,
        targetPercent,
        remainingLessonIds: remaining.map((l) => l.id),
        note: program.strengths.includes(subjectId) ? 'ต่อยอดจากสายที่เรียนมา' : undefined,
      });
    } else {
      // Exams / portfolio / application: progress comes only from what the
      // student answered. Unanswered items stay 'unknown' (never inferred).
      const answers = params.checklist ?? {};
      const items = (requirement.checklist ?? []).map((item) => {
        const key = checklistKey(reqId, item);
        return { item, key, status: (answers[key] ?? 'unknown') as 'met' | 'gap' | 'unknown' };
      });
      const allMet = items.length > 0 && items.every((i) => i.status === 'met');
      const anyMet = items.some((i) => i.status === 'met');
      const status: RequirementProgress['status'] = allMet
        ? 'done'
        : !depsDone
          ? 'locked'
          : anyMet
            ? 'in-progress'
            : 'not-started';
      statusById.set(reqId, status);
      steps.push({ requirement, status, remainingLessonIds: [], checklist: items });
    }
  }

  const current = steps.find(
    (s) => s.status !== 'done' && s.status !== 'locked' && s.requirement.dependsOn.every((d) => statusById.get(d) === 'done')
  );

  return {
    profile,
    program,
    target,
    steps,
    currentRequirementId: current?.requirement.id,
    completedCount: steps.filter((s) => s.status === 'done').length,
    horizon: getHorizonText(profile.educationLevel),
    basis: path ? { kind: 'admission-path', pathId: path.id, pathName: path.name } : { kind: 'generic' },
  };
}

/* ── Today's next step on the route ───────────────────────────────────── */

/** Walk prerequisites until reaching a lesson whose own prerequisites are met. */
function resolvePrerequisiteGap(
  lesson: CurriculumLesson,
  storeLessons: Lesson[],
  curriculum: Curriculum,
  seen = new Set<string>()
): CurriculumLesson {
  if (seen.has(lesson.id)) return lesson;
  seen.add(lesson.id);
  const missing = getMissingPrerequisites(lesson, storeLessons, curriculum);
  return missing.length > 0 ? resolvePrerequisiteGap(missing[0], storeLessons, curriculum, seen) : lesson;
}

export function getRouteNextStep(
  route: StudentRoute,
  storeLessons: Lesson[],
  budget?: TimeBudgetMinutes,
  curriculum: Curriculum = CURRICULUM
): RouteNextStep | null {
  const step = route.steps.find((s) => s.requirement.id === route.currentRequirementId);
  const subjectId = step?.requirement.subjectId;
  if (!step || !subjectId) return null;

  const budgetMinutes = budget ?? route.profile.availableMinutes;
  const ordered = getOrderedCurriculumLessons(curriculum);
  const wanted = ordered.find((l) => l.subjectId === subjectId && !isCurriculumLessonCompleted(l, storeLessons));
  if (!wanted) return null;

  const lesson = resolvePrerequisiteGap(wanted, storeLessons, curriculum);
  const dependent = ordered.find((l) => l.prerequisites.includes(lesson.id));

  const reasons: string[] = [];
  if (lesson.id !== wanted.id) {
    reasons.push(`ต้องปูพื้นเรื่องนี้ก่อนเรียน "${wanted.title}"`);
  } else if (dependent) {
    reasons.push(`หัวข้อนี้เป็นพื้นฐานของ "${dependent.title}"`);
  }
  if (step.readinessPercent !== undefined && step.targetPercent !== undefined) {
    reasons.push(
      `${step.requirement.title} ยังขาดอีก ${Math.max(0, step.targetPercent - step.readinessPercent)}% จากเป้าหมาย ${step.targetPercent}% ในเส้นทางไป${route.target.title}`
    );
  }
  if (step.note) reasons.push(step.note);

  return {
    requirementId: step.requirement.id,
    curriculumLessonId: lesson.id,
    curriculumLessonTitle: lesson.title,
    studyLessonId: findStudyLesson(lesson, storeLessons)?.id,
    budgetMinutes,
    plan: buildLearningPlan(lesson.id, budgetMinutes, undefined, curriculum),
    reason: reasons.join(' และ'),
    outcomes: lesson.learningOutcomes,
  };
}

/* ── Validation ───────────────────────────────────────────────────────── */

export function validateRouteData(curriculum: Curriculum = CURRICULUM): string[] {
  const errors: string[] = [];
  const reqIds = new Set<string>();
  for (const r of ROUTE_REQUIREMENTS) {
    if (reqIds.has(r.id)) errors.push(`duplicate requirement ${r.id}`);
    reqIds.add(r.id);
  }
  for (const r of ROUTE_REQUIREMENTS) {
    r.dependsOn.forEach((d) => !reqIds.has(d) && errors.push(`${r.id} depends on unknown ${d}`));
    if (r.kind === 'subject' && !curriculum.subjects.some((s) => s.id === r.subjectId)) errors.push(`${r.id}: unknown subject`);
    if (r.kind !== 'subject' && (!r.checklist || r.checklist.length === 0)) errors.push(`${r.id}: needs a checklist`);
  }
  for (const t of ROUTE_TARGETS) {
    if (!curriculum.pathway || curriculum.pathway.id !== t.pathwayId) errors.push(`${t.id}: unknown pathway ${t.pathwayId}`);
    t.requirementIds.forEach((id, i) => {
      const r = getRouteRequirement(id);
      if (!r) return errors.push(`${t.id}: unknown requirement ${id}`);
      // a requirement may only depend on requirements listed before it
      r.dependsOn.forEach((d) => {
        const at = t.requirementIds.indexOf(d);
        if (at === -1 || at >= i) errors.push(`${t.id}: ${id} depends on ${d} which is not earlier in the route`);
      });
    });
  }
  const programIds = new Set<string>();
  for (const p of VOCATIONAL_PROGRAMS) {
    if (programIds.has(p.id)) errors.push(`duplicate program ${p.id}`);
    programIds.add(p.id);
    p.strengths.forEach((s) => !curriculum.subjects.some((x) => x.id === s) && errors.push(`${p.id}: unknown strength ${s}`));
  }
  return errors;
}
