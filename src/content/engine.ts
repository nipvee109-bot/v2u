/* =========================================================================
   V2U Learning Path (Phase 51)
   -------------------------------------------------------------------------
   One usable path per curriculum lesson:
     primary (Thai clip first) → alternative → reading → V2U original
     → practice (exercise) → check (quiz) → next lesson
   Trust order active > verified > unverified is kept by getResourcesForLesson;
   deprecated resources never appear.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { getResourcesForLesson } from '../resources/engine';
import type { CuratedResource, LearningPlan, LearningPlanStep } from '../resources/types';
import { ORIGINAL_LESSONS, getOriginalLesson } from './originals';
import type { OriginalLesson } from './types';

export interface LearningPath {
  lessonId: string;
  primary?: CuratedResource;
  alternative?: CuratedResource;
  reading?: CuratedResource;
  original: OriginalLesson;
  practiceExerciseId?: string;
  checkQuizId?: string;
  nextLessonId?: string;
}

const isReading = (r: CuratedResource) => r.type !== 'video' && r.type !== 'course';

export function getLearningPath(lessonId: string): LearningPath | null {
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  const original = getOriginalLesson(lessonId);
  if (!lesson || !original) return null;
  const ranked = getResourcesForLesson(lessonId);
  const tierOf = (r: CuratedResource) => ({ active: 3, verified: 2, unverified: 1, deprecated: 0 })[r.status];
  // Primary: best tier; inside it Thai video, then any video, then anything explanatory
  const topTier = ranked.length ? tierOf(ranked[0]) : 0;
  const pool = ranked.filter((r) => tierOf(r) === topTier);
  const primary =
    pool.find((r) => r.type === 'video' && r.language === 'th') ??
    pool.find((r) => r.type === 'video') ??
    pool.find((r) => r.role === 'explanation') ??
    ranked[0];
  const alternative = ranked.find((r) => r.id !== primary?.id && r.role !== 'reference' && (r.type === 'video' || r.type === 'course'));
  const reading = ranked.find((r) => r.id !== primary?.id && r.id !== alternative?.id && isReading(r));
  const order = CURRICULUM.topics.flatMap((t) => t.lessonIds);
  const idx = order.indexOf(lessonId);
  return {
    lessonId,
    primary,
    alternative,
    reading,
    original,
    practiceExerciseId: lesson.exerciseIds[0],
    checkQuizId: lesson.quizIds[0],
    nextLessonId: idx >= 0 ? order[idx + 1] : undefined,
  };
}

/** Short Thai label for a plan step, e.g. "คลิป", "สรุป V2U", "เช็ก". */
export function stepShortLabel(step: LearningPlanStep, resources: CuratedResource[] = []): string {
  if (step.contentId) return 'สรุป V2U';
  if (step.resourceId) {
    const r = resources.find((x) => x.id === step.resourceId);
    const t = r?.type;
    return t === 'video' || t === 'course' ? 'คลิป' : 'อ่าน';
  }
  if (step.kind === 'practice') return 'ฝึก';
  if (step.kind === 'check') return 'เช็ก';
  if (step.kind === 'recap') return 'ทบทวน';
  return 'อ่าน';
}

/** "คลิป 18 + สรุป V2U 7 + เช็ก 5 = 30" — the same plan Home/Route/Roadmap/Study Room use. */
export function describePlan(plan: LearningPlan): string {
  const resources = getResourcesForLesson(plan.curriculumLessonId);
  const parts = plan.steps.map((s) => `${stepShortLabel(s, resources)} ${s.minutes}${s.partial ? ' (บางช่วง)' : ''}`);
  return `${parts.join(' + ')} = ${plan.totalMinutes} นาที`;
}

export function validateOriginals(): string[] {
  const errors: string[] = [];
  const ids = new Set(CURRICULUM.lessons.map((l) => l.id));
  const skills = new Set(CURRICULUM.skills.map((s) => s.id));
  for (const l of CURRICULUM.lessons) if (!getOriginalLesson(l.id)) errors.push(`${l.id}: no V2U original`);
  for (const o of ORIGINAL_LESSONS) {
    if (!ids.has(o.lessonId)) errors.push(`${o.contentId}: unknown lesson`);
    for (const r of o.relatedLessonIds) if (!ids.has(r)) errors.push(`${o.contentId}: unknown related ${r}`);
    for (const s of o.relatedSkills) if (!skills.has(s)) errors.push(`${o.contentId}: unknown skill ${s}`);
    if (o.author !== 'V2U' || !o.version || !/^\d{4}-\d{2}-\d{2}$/.test(o.createdAt) || !/^\d{4}-\d{2}-\d{2}$/.test(o.updatedAt))
      errors.push(`${o.contentId}: traceability`);
    if (!o.what || !o.why || !o.steps.length || !o.examples.length || !o.mistakes.length || !o.tryIt.length || !o.check.length || !o.next)
      errors.push(`${o.contentId}: missing section`);
  }
  return errors;
}
