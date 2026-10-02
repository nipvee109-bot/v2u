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

   Priority order (deterministic):
     1. Active / paused learning session    → continue it
     2. Overdue review items                → review first (memory is fading)
     3. Smart lesson recommendation          → study next lesson
        (incomplete lesson → today's plan → roadmap → fallback)
     4. Everything completed                 → review due today / general review
   ========================================================================= */

import type {
  Lesson,
  StudySession,
  LearningSession,
  ReviewItem,
  KnowledgeGap,
} from '../types';
import { getSmartDashboardRecommendation, getDashboardRoadmapStatus } from './dashboardUtils';
import { resolveCurriculumStep } from '../curriculum/engine';
import { getResourcesForLesson } from '../resources/engine';

export type NextStepKind = 'continue' | 'review' | 'study' | 'empty';

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
}

export interface NextStep {
  kind: NextStepKind;
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
  };
}

export const NEXT_STEP_CTA_LABEL = 'เริ่มขั้นต่อไป' as const;

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
        detail: `ทำตามเส้นทาง 6 เดือนให้ครบ · ${roadmap.monthTitle}`,
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

  const base = { ctaLabel: NEXT_STEP_CTA_LABEL, current, goal, missing };

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
        href: `/study/${lesson.id}`,
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
      href: `/review/${item.id}`,
      requiresResourceConfirmation: false,
      lessonId: item.lessonId,
      reviewItemId: item.id,
      todayAction: `ทบทวน: ${item.topic}`,
      reason: 'เรื่องนี้เลยเวลาทบทวนแล้ว ทบทวนตามจังหวะที่เหมาะสมตอนนี้ช่วยไม่ให้ลืม ก่อนเรียนเรื่องใหม่',
    };
  }

  // 3. Next lesson to study
  const rec = getSmartDashboardRecommendation({ lessons, sessions, learningSessionsHistory, referenceDate });
  const allCompleted = lessons.length > 0 && lessons.every((l) => l.status === 'COMPLETED');
  if (rec && !allCompleted) {
    const ctx = resolveCurriculumStep(rec.lesson, lessons);
    const curriculum: NextStepCurriculumInfo | undefined = ctx
      ? {
          lessonId: ctx.lesson.id,
          title: ctx.lesson.title,
          path: ctx.path,
          estimatedMinutes: ctx.lesson.estimatedMinutes,
          learningOutcomes: ctx.lesson.learningOutcomes,
          missingPrerequisiteTitles: ctx.missingPrerequisites.map((l) => l.title),
          recommendedResource: (() => {
            const r = getResourcesForLesson(ctx.lesson.id)[0];
            return r
              ? { id: r.id, title: r.title, provider: r.provider, estimatedMinutes: r.estimatedMinutes, whyV2USelected: r.whyV2USelected }
              : undefined;
          })(),
        }
      : undefined;
    return {
      ...base,
      kind: 'study',
      // Study flow still runs on the trackable store lesson
      href: `/lessons/${rec.lesson.id}`,
      requiresResourceConfirmation: true,
      lessonId: rec.lesson.id,
      todayAction: curriculum ? `เรียน: ${curriculum.title}` : `เรียน: ${rec.lesson.title}`,
      reason: curriculum
        ? `${rec.reasonDescription} · เรียนจบแล้วคุณจะ${curriculum.learningOutcomes[0]}`
        : rec.reasonDescription,
      curriculum,
    };
  }

  // 4. Everything completed → keep knowledge fresh
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
    };
  }

  return {
    ...base,
    kind: 'empty',
    href: lessons.length > 0 ? '/review' : '/learn',
    requiresResourceConfirmation: false,
    todayAction: lessons.length > 0 ? 'ทบทวนเรื่องที่ยังไม่แม่น' : 'เลือกวิชาที่จะเริ่มเรียน',
    reason:
      lessons.length > 0
        ? 'ไม่มีบทที่ค้างแล้ว การทบทวนช่วยให้พร้อมสอบมากขึ้น'
        : 'ยังไม่มีบทเรียน เริ่มจากเลือกวิชาที่ต้องใช้สอบเข้ามหาวิทยาลัย',
  };
}
