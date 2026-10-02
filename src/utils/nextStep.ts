/* =========================================================================
   V2U — Next Step Engine (Phase 41)
   -------------------------------------------------------------------------
   Pure, framework-free decision logic that answers the Home screen questions:
     1. ตอนนี้อยู่ตรงไหน      (current position)
     2. เป้าหมายคืออะไร       (target)
     3. ยังขาดอะไร            (what is missing)
     4. วันนี้ควรทำอะไร        (today's single action)
     5. ทำไมจึงควรทำสิ่งนั้น    (reason)

   No React, no store access: callers pass plain data in, so the same function
   can be reused by a future mobile app.

   Priority order (deterministic, explainable — see NextStep.rule):
     1. Unfinished study session              → continue it
     2. Overdue review items                  → review first (memory is fading)
     3. Weak skill (adaptive mode)            → strengthen it before moving on
     4. Route next lesson (adaptive mode)     → current requirement, prerequisite
                                                gaps first, plan fits available time
     5. General lesson recommendation          → incomplete → today's plan → roadmap
     6. Everything completed                   → review due today / general review

   Adaptive mode is enabled by passing `route` (profile + learning records);
   without it the Phase 41 behaviour is unchanged.
   ========================================================================= */

import type {
  Lesson,
  StudySession,
  LearningSession,
  ReviewItem,
  KnowledgeGap,
  LearningRecord,
} from '../types';
import { getSmartDashboardRecommendation, getDashboardRoadmapStatus } from './dashboardUtils';
import { resolveCurriculumStep, learningHubPathFor, getCurriculumLesson, getMissingPrerequisites } from '../curriculum/engine';
import type { CurriculumLesson } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { getResourcesForLesson } from '../resources/engine';
import type { LearningPlan, TimeBudgetMinutes } from '../resources/types';
import { buildStudentRoute, getRouteNextStep, resolvePlanningHorizon } from '../route/engine';
import { computePlan } from '../roadmap/plan';
import type { StudentProfile, StudentRoute } from '../route/types';
import type { AdmissionRegistry } from '../admission/types';
import { createSkillReadinessProvider, getWeakestSkill } from '../skills/engine';
import { computeLessonGaps, recommendPathway } from '../diagnostic/engine';
import type { DiagnosticData } from '../diagnostic/types';
import type { CurriculumSubjectId } from '../curriculum/types';
import { buildLearningPlan } from '../resources/engine';
import { findStudyLesson } from '../curriculum/engine';

export type NextStepKind = 'continue' | 'review' | 'strengthen' | 'study' | 'empty';

/** Which deterministic priority rule produced the step (for explainability). */
export type NextStepRule =
  | 'unfinished-study'
  | 'overdue-review'
  | 'weak-skill'
  | 'route'
  | 'recommendation'
  | 'due-today-review'
  | 'nothing-pending';

/** Phase 45: passing this switches getNextStep() to the route-aware adaptive mode. */
export interface NextStepRouteContext {
  profile?: Partial<StudentProfile> | null;
  /** Per-lesson learning records (store computeLessonLearningRecord). */
  records: LearningRecord[];
  /** Overrides profile.availableMinutes. */
  budget?: TimeBudgetMinutes;
  /** Student answers for exam / portfolio / application checklists. */
  checklist?: Record<string, 'met' | 'gap'>;
  /** Admission data (defaults to the shipped registry); only verified paths are used. */
  admissionRegistry?: AdmissionRegistry;
  /** Phase 60: per-subject diagnostic history */
  diagnostic?: DiagnosticData | null;
}

export interface NextStepGoalInput {
  title: string;
  progressPercent: number;
  targetDate?: string;
}

export interface NextStepParams {
  lessons: Lesson[];
  sessions?: StudySession[];
  learningSessionsHistory?: LearningSession[];
  activeLearningSession?: LearningSession | null;
  overdueReviews?: ReviewItem[];
  dueTodayReviews?: ReviewItem[];
  knowledgeGaps?: KnowledgeGap[];
  goals?: NextStepGoalInput[];
  referenceDate?: Date;
  route?: NextStepRouteContext;
}

export interface NextStep {
  kind: NextStepKind;
  rule: NextStepRule;
  /** TIME — minutes the step should take (adaptive mode). */
  minutes?: number;
  /** OUTCOME — what the student gains (adaptive mode). */
  outcome?: string;
  /** Time-based plan for study steps (adaptive mode). */
  plan?: LearningPlan;
  /** Primary CTA label — always the same single button on Home. */
  ctaLabel: 'เริ่มขั้นต่อไป';
  /** Route the CTA leads to. */
  href: string;
  /** When true the UI should confirm a learning resource before starting. */
  requiresResourceConfirmation: boolean;
  lessonId?: string;
  reviewItemId?: string;
  /** วันนี้ควรทำอะไร */
  todayAction: string;
  /** ทำไมจึงควรทำสิ่งนั้น */
  reason: string;
  /** ตอนนี้อยู่ตรงไหน */
  current: { label: string; detail: string; progressPercent: number };
  /** เป้าหมายคืออะไร */
  goal: { label: string; detail: string };
  /** ยังขาดอะไร */
  missing: string[];
  /** Phase 42A: the curriculum lesson behind this step, when one is linked. */
  curriculum?: NextStepCurriculumInfo;
  /** Phase 60: which subject the pathway chose, and what else it could be */
  pathway?: {
    subjectId: CurriculumSubjectId;
    alternatives: { lessonId: string; title: string; subjectId: CurriculumSubjectId; reason: string }[];
    suggestDiagnostic: boolean;
  };
}

export interface NextStepCurriculumInfo {
  lessonId: string;
  title: string;
  /** Goal → Subject → Topic → Lesson */
  path: string;
  estimatedMinutes: number;
  learningOutcomes: string[];
  missingPrerequisiteTitles: string[];
  /** Phase 42B: best curated resource for this lesson (what to learn with, and why). */
  recommendedResource?: {
    id: string;
    title: string;
    provider: string;
    estimatedMinutes: number;
    whyV2USelected: string;
    /** Where to find it (shown when no checked link exists). */
    locator: string;
    /** Only true when the registry holds a verified URL. */
    url?: string;
  };
}

export const NEXT_STEP_CTA_LABEL = 'เริ่มขั้นต่อไป' as const;

/** `preferredResourceId`: the resource the time plan actually starts with, so the
 *  recommendation shown on Home matches the plan. */
function curriculumInfoFor(cLesson: CurriculumLesson, lessons: Lesson[], preferredResourceId?: string): NextStepCurriculumInfo {
  const topic = CURRICULUM.topics.find((t) => t.id === cLesson.topicId);
  const subject = CURRICULUM.subjects.find((x) => x.id === cLesson.subjectId);
  const ranked = getResourcesForLesson(cLesson.id);
  const r = ranked.find((x) => x.id === preferredResourceId) ?? ranked[0];
  return {
    lessonId: cLesson.id,
    title: cLesson.title,
    path: [CURRICULUM.pathway.title, subject?.title, topic?.title, cLesson.title].filter(Boolean).join(' → '),
    estimatedMinutes: cLesson.estimatedMinutes,
    learningOutcomes: cLesson.learningOutcomes,
    missingPrerequisiteTitles: getMissingPrerequisites(cLesson, lessons).map((l) => l.title),
    recommendedResource: r
      ? {
          id: r.id,
          title: r.title,
          provider: r.provider,
          estimatedMinutes: r.estimatedMinutes,
          whyV2USelected: r.whyV2USelected,
          locator: r.locator,
          ...(r.url && (r.status === 'active' || r.status === 'verified') ? { url: r.url } : {}),
        }
      : undefined,
  };
}

/**
 * The route used by adaptive mode. Exported so the Roadmap builds on the
 * exact same route instead of re-deriving it.
 */
export function buildNextStepRoute(params: NextStepParams): StudentRoute | null {
  const ctx = params.route;
  if (!ctx) return null;
  return buildStudentRoute({
    profile: ctx.profile,
    storeLessons: params.lessons ?? [],
    readiness: createSkillReadinessProvider(ctx.records, params.referenceDate ?? new Date()),
    checklist: ctx.checklist,
    admissionRegistry: ctx.admissionRegistry,
  });
}

export function getNextStep(params: NextStepParams): NextStep {
  const {
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    activeLearningSession = null,
    overdueReviews = [],
    dueTodayReviews = [],
    knowledgeGaps = [],
    goals = [],
    referenceDate = new Date(),
  } = params;

  // ── Where am I ────────────────────────────────────────────────────────
  const roadmap = getDashboardRoadmapStatus({ lessons });
  const completedCount = lessons.filter((l) => l.status === 'COMPLETED').length;
  const overallPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const current = {
    label: `เดือนที่ ${roadmap.currentMonth} จาก 6`,
    detail: `เรียนจบแล้ว ${completedCount}/${lessons.length} บท · ความพร้อมโดยรวม ${overallPercent}%`,
    progressPercent: overallPercent,
  };

  // ── Target ────────────────────────────────────────────────────────────
  const primaryGoal = goals.find((g) => g.progressPercent < 100) || goals[0];
  const goal = primaryGoal
    ? {
        label: primaryGoal.title,
        detail: `ทำได้แล้ว ${Math.round(primaryGoal.progressPercent)}%${primaryGoal.targetDate ? ` · ภายใน ${primaryGoal.targetDate}` : ''}`,
      }
    : {
        label: 'เข้ามหาวิทยาลัยที่คุณต้องการ',
        detail: `ทำตามเส้นทางให้ครบ · ${roadmap.monthTitle}`,
      };

  // ── What is missing ───────────────────────────────────────────────────
  const missing: string[] = [];
  const remainingInMonth = roadmap.totalLessonsCount - roadmap.completedLessonsCount;
  if (remainingInMonth > 0) {
    missing.push(`อีก ${remainingInMonth} บทในเดือนที่ ${roadmap.currentMonth}`);
  }
  if (overdueReviews.length > 0) {
    missing.push(`${overdueReviews.length} เรื่องที่เลยเวลาทบทวน`);
  }
  const weakSpots = knowledgeGaps.filter((g) => g.severity === 'critical' || g.severity === 'moderate');
  if (weakSpots.length > 0) {
    missing.push(`${weakSpots.length} เรื่องที่ยังไม่แม่น`);
  }

  // ── Adaptive mode: answer the Home questions from the student's route ──
  const routeCtx = params.route;
  const route = buildNextStepRoute({ ...params, lessons, referenceDate });
  const budget = routeCtx?.budget ?? route?.profile.availableMinutes;
  const weakSkill = routeCtx ? getWeakestSkill({ storeLessons: lessons, records: routeCtx.records, referenceDate }) : undefined;

  let base = { ctaLabel: NEXT_STEP_CTA_LABEL, current, goal, missing };
  if (route) {
    const idx = route.steps.findIndex((x) => x.requirement.id === route.currentRequirementId);
    const at = idx >= 0 ? route.steps[idx] : undefined;
    const subjectSteps = route.steps.filter((x) => x.readinessPercent !== undefined);
    const overall = subjectSteps.length
      ? Math.round(subjectSteps.reduce((sum, x) => sum + Math.min(100, ((x.readinessPercent ?? 0) / (x.targetPercent || 100)) * 100), 0) / subjectSteps.length)
      : 0;
    const routeMissing: string[] = [];
    route.steps
      .filter((x) => x.readinessPercent !== undefined && x.status !== 'done')
      .forEach((x) => routeMissing.push(`${x.requirement.title} ยังขาดอีก ${Math.max(0, (x.targetPercent ?? 0) - (x.readinessPercent ?? 0))}%`));
    if (overdueReviews.length > 0) routeMissing.push(`${overdueReviews.length} เรื่องที่เลยเวลาทบทวน`);
    if (weakSkill) routeMissing.push(`ทักษะที่ต้องทบทวน: ${weakSkill.skill.title}`);
    const remainingStages = route.steps.filter((x) => x.requirement.kind !== 'subject' && x.status !== 'done').length;
    if (remainingStages > 0) routeMissing.push(`อีก ${remainingStages} ขั้น: สอบ · Portfolio · สมัคร`);
    base = {
      ...base,
      current: {
        label: at ? `ขั้นที่ ${idx + 1}/${route.steps.length}: ${at.requirement.title}` : `ผ่านแล้ว ${route.completedCount}/${route.steps.length} ขั้น`,
        detail:
          at?.readinessPercent !== undefined
            ? `ความพร้อม ${at.readinessPercent}% จากเป้าหมาย ${at.targetPercent}% · ${route.program.title}`
            : `${route.profile.educationLevel} · ${route.program.title}`,
        progressPercent: overall,
      },
      goal: {
        label: `${route.target.faculty} · ${route.target.title}`,
        detail: (() => {
          const h = resolvePlanningHorizon(route.profile);
          const horizonText = h.isDefault ? route.horizon : `คุณตั้งเป้าหมายไว้ใน ${h.months} เดือน`;
          return `${horizonText} · ผ่านแล้ว ${route.completedCount}/${route.steps.length} ขั้น`;
        })(),
      },
      missing: routeMissing,
    };
  }

  // 1. Continue an unfinished live session
  if (
    activeLearningSession &&
    activeLearningSession.status !== 'completed' &&
    activeLearningSession.status !== 'abandoned'
  ) {
    const lesson = lessons.find((l) => l.id === activeLearningSession.lessonId);
    if (lesson) {
      return {
        ...base,
        kind: 'continue',
        rule: 'unfinished-study',
        outcome: route ? 'เรียนบทนี้จบและพร้อมทำแบบทดสอบ' : undefined,
        href: learningHubPathFor(lesson, lessons, activeLearningSession.curriculumLessonId) ?? `/study/${lesson.id}`,
        requiresResourceConfirmation: false,
        lessonId: lesson.id,
        todayAction: `เรียนต่อ: ${lesson.title}`,
        reason: 'คุณเริ่มเรียนบทนี้ค้างไว้ ทำต่อให้จบตอนที่ยังจำได้ดีจะคุ้มเวลาที่สุด',
      };
    }
  }

  // 2. Overdue reviews come before new material
  if (overdueReviews.length > 0) {
    const item = [...overdueReviews].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0];
    return {
      ...base,
      kind: 'review',
      rule: 'overdue-review',
      minutes: route ? 15 : undefined,
      outcome: route ? 'จำเรื่องนี้ได้แม่นขึ้น และพร้อมเรียนเรื่องถัดไป' : undefined,
      href: `/review/${item.id}`,
      requiresResourceConfirmation: false,
      lessonId: item.lessonId,
      reviewItemId: item.id,
      todayAction: `ทบทวน: ${item.topic}`,
      reason: 'เรื่องนี้เลยเวลาทบทวนแล้ว ทบทวนตามจังหวะที่เหมาะสมตอนนี้ช่วยไม่ให้ลืม ก่อนเรียนเรื่องใหม่',
    };
  }

  // 3. Weak skill (studied but not solid) before moving on
  if (route && weakSkill && weakSkill.studyLessonIds[0]) {
    const studyId = weakSkill.studyLessonIds[0];
    const cLesson = weakSkill.lessonIds.map((id) => getCurriculumLesson(id)).find((l): l is CurriculumLesson => !!l);
    const why =
      weakSkill.reason === 'low-quiz'
        ? 'คะแนนแบบทดสอบเรื่องนี้ยังไม่ผ่าน'
        : weakSkill.reason === 'check-confused'
          ? 'เช็กความเข้าใจครั้งล่าสุดพบว่าเรื่องนี้ยังสับสน'
        : weakSkill.reason === 'overdue-review'
          ? 'ถึงเวลาทบทวนเรื่องนี้แล้ว'
          : 'เรื่องนี้ยังไม่แม่น';
    return {
      ...base,
      kind: 'strengthen',
      rule: 'weak-skill',
      minutes: Math.min(budget ?? 30, 30),
      outcome: `${weakSkill.skill.title}ได้มั่นใจขึ้น`,
      href: cLesson ? `/learn/curriculum/${cLesson.id}` : `/lessons/${studyId}`,
      requiresResourceConfirmation: false,
      lessonId: studyId,
      todayAction: `ทบทวนจุดที่ยังไม่แม่น: ${weakSkill.skill.title}`,
      reason: `${why} และเป็นทักษะที่ต้องใช้ต่อในเส้นทางไป${route.target.title}`,
      curriculum: cLesson ? curriculumInfoFor(cLesson, lessons) : undefined,
    };
  }

  // 4. Next lesson on the pathway — Phase 60: chosen ACROSS subjects by the gap
  //    engine (diagnostic + learning evidence + prerequisites + target), not
  //    "first unfinished requirement" (which always meant Math).
  if (route) {
    const pathParams = {
      storeLessons: lessons,
      records: routeCtx!.records,
      diagnostic: routeCtx!.diagnostic,
      referenceDate,
      profile: route.profile,
      budget: budget ?? route.profile.availableMinutes,
    };
    const pick = recommendPathway(pathParams);
    if (pick) {
      // Phase 50: inside the chosen subject, keep the personal plan's priority order when it names a lesson that is ready to learn
      const subjectReq = route.steps.find((x) => x.requirement.subjectId === pick.subjectId)?.requirement.id;
      const plan = computePlan({
        route,
        storeLessons: lessons,
        records: routeCtx!.records,
        referenceDate,
        dailyMinutes: budget ?? route.profile.availableMinutes,
        horizon: resolvePlanningHorizon(route.profile),
      });
      const preferredId = (plan.work.get(subjectReq ?? '') ?? []).find((i) => i.kind === 'study')?.curriculumLessonId;
      const gaps = computeLessonGaps(pathParams).gaps.filter((g) => g.state === 'gap');
      const pickIsReview = gaps.find((g) => g.lesson.id === pick.lesson.id)?.missingSkills.some((m) => m.status === 'needs-review');
      const preferred = pickIsReview ? undefined : gaps.find((g) => g.lesson.id === preferredId && g.lesson.subjectId === pick.subjectId)?.lesson;
      const cLesson = preferred ?? pick.lesson;
      const study = findStudyLesson(cLesson, lessons);
      if (study) {
        const minutes: TimeBudgetMinutes = budget ?? route.profile.availableMinutes;
        const lplan = buildLearningPlan(cLesson.id, minutes);
        return {
          ...base,
          kind: 'study',
          rule: 'route',
          minutes,
          outcome: cLesson.learningOutcomes.join(' · '),
          plan: lplan ?? undefined,
          href: `/learn/curriculum/${cLesson.id}`,
          requiresResourceConfirmation: true,
          lessonId: study.id,
          todayAction: `เรียน: ${cLesson.title}`,
          reason: pick.reasons.join(' และ'),
          curriculum: curriculumInfoFor(cLesson, lessons, lplan?.steps.find((x) => x.resourceId)?.resourceId),
          pathway: { subjectId: pick.subjectId, alternatives: pick.alternatives.map((a) => ({ lessonId: a.lesson.id, title: a.lesson.title, subjectId: a.lesson.subjectId, reason: a.reason })), suggestDiagnostic: pick.suggestDiagnostic },
        };
      }
    }
    // Fallback: the original per-requirement route step
    const rs = getRouteNextStep(route, lessons, budget);
    const cLesson = rs ? getCurriculumLesson(rs.curriculumLessonId) : undefined;
    if (rs && rs.studyLessonId && cLesson) {
      return {
        ...base,
        kind: 'study',
        rule: 'route',
        minutes: rs.budgetMinutes,
        outcome: rs.outcomes.join(' · '),
        plan: rs.plan ?? undefined,
        href: `/learn/curriculum/${cLesson.id}`,
        requiresResourceConfirmation: true,
        lessonId: rs.studyLessonId,
        todayAction: `เรียน: ${rs.curriculumLessonTitle}`,
        reason: rs.reason,
        curriculum: curriculumInfoFor(cLesson, lessons, rs.plan?.steps.find((x) => x.resourceId)?.resourceId),
      };
    }
  }

  // 5. Next lesson to study (general recommendation)
  const rec = getSmartDashboardRecommendation({ lessons, sessions, learningSessionsHistory, referenceDate });
  const allCompleted = lessons.length > 0 && lessons.every((l) => l.status === 'COMPLETED');
  if (rec && !allCompleted) {
    const ctx = resolveCurriculumStep(rec.lesson, lessons);
    const curriculum: NextStepCurriculumInfo | undefined = ctx ? curriculumInfoFor(ctx.lesson, lessons) : undefined;
    return {
      ...base,
      kind: 'study',
      rule: 'recommendation',
      minutes: budget,
      // Study flow still runs on the trackable store lesson
      href: ctx ? `/learn/curriculum/${ctx.lesson.id}` : `/lessons/${rec.lesson.id}`,
      requiresResourceConfirmation: true,
      lessonId: rec.lesson.id,
      todayAction: curriculum ? `เรียน: ${curriculum.title}` : `เรียน: ${rec.lesson.title}`,
      reason: curriculum
        ? `${rec.reasonDescription} · เรียนจบแล้วคุณจะ${curriculum.learningOutcomes[0]}`
        : rec.reasonDescription,
      curriculum,
    };
  }

  // 6. Everything completed → keep knowledge fresh
  if (dueTodayReviews.length > 0) {
    const item = dueTodayReviews[0];
    return {
      ...base,
      kind: 'review',
      href: `/review/${item.id}`,
      requiresResourceConfirmation: false,
      lessonId: item.lessonId,
      reviewItemId: item.id,
      todayAction: `ทบทวน: ${item.topic}`,
      reason: 'คุณเรียนครบแล้ว ทบทวนเรื่องที่ถึงรอบวันนี้เพื่อรักษาความพร้อม',
      rule: 'due-today-review',
    };
  }

  return {
    ...base,
    kind: 'empty',
    rule: 'nothing-pending',
    href: lessons.length > 0 ? '/review' : '/learn',
    requiresResourceConfirmation: false,
    todayAction: lessons.length > 0 ? 'ทบทวนเรื่องที่ยังไม่แม่น' : 'เลือกวิชาที่จะเริ่มเรียน',
    reason:
      lessons.length > 0
        ? 'ไม่มีบทที่ค้างแล้ว การทบทวนช่วยให้พร้อมสอบมากขึ้น'
        : 'ยังไม่มีบทเรียน เริ่มจากเลือกวิชาที่ต้องใช้สอบเข้ามหาวิทยาลัย',
  };
}
