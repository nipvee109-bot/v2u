/* =========================================================================
   V2U Curriculum Foundation (Phase 42A) — pure query & validation helpers
   No React / store imports: reusable by tests and a future mobile app.
   ========================================================================= */

import type { Lesson } from '../types';
import type {
  Curriculum,
  CurriculumLesson,
  CurriculumSubjectId,
  CurriculumTopic,
} from './types';
import { CURRICULUM } from './data';
import { RESOURCE_REGISTRY } from '../resources/registry';
import type { CuratedResource } from '../resources/types';

/** Minutes outside this range are rejected by validateCurriculum(). */
export const MIN_LESSON_MINUTES = 10;
export const MAX_LESSON_MINUTES = 180;

export function getCurriculumLesson(id: string, curriculum: Curriculum = CURRICULUM): CurriculumLesson | undefined {
  return curriculum.lessons.find((l) => l.id === id);
}

export function getCurriculumTopic(id: string, curriculum: Curriculum = CURRICULUM): CurriculumTopic | undefined {
  return curriculum.topics.find((t) => t.id === id);
}

/** Lessons in teaching order: subject order → topic order → lesson order. */
export function getOrderedCurriculumLessons(curriculum: Curriculum = CURRICULUM): CurriculumLesson[] {
  const out: CurriculumLesson[] = [];
  for (const subject of curriculum.subjects) {
    for (const topicId of subject.topicIds) {
      const topic = getCurriculumTopic(topicId, curriculum);
      for (const lessonId of topic?.lessonIds ?? []) {
        const lesson = getCurriculumLesson(lessonId, curriculum);
        if (lesson) out.push(lesson);
      }
    }
  }
  return out;
}

/** The trackable store lesson (existing study flow) that covers a curriculum lesson. */
export function findStudyLesson(cLesson: CurriculumLesson, storeLessons: Lesson[]): Lesson | undefined {
  return storeLessons.find((l) => l.title === cLesson.studyLessonTitle && l.subjectId === cLesson.subjectId);
}

/** Curriculum lessons covered by a given store lesson, in teaching order. */
export function getCurriculumLessonsForStudyLesson(
  storeLesson: Pick<Lesson, 'title' | 'subjectId'>,
  curriculum: Curriculum = CURRICULUM
): CurriculumLesson[] {
  return getOrderedCurriculumLessons(curriculum).filter(
    (l) => l.studyLessonTitle === storeLesson.title && l.subjectId === storeLesson.subjectId
  );
}

/**
 * A curriculum lesson is complete when its linked study lesson is COMPLETED.
 * (Progress lives on store lessons; the curriculum itself holds no user state.)
 */
export function isCurriculumLessonCompleted(cLesson: CurriculumLesson, storeLessons: Lesson[]): boolean {
  const study = findStudyLesson(cLesson, storeLessons);
  if (!study) return false;
  // Phase 50: per-curriculum-lesson progress when tracked; legacy data keeps
  // the old meaning (a COMPLETED study lesson counts for all its curriculum lessons).
  if (Array.isArray(study.completedCurriculumLessonIds)) return study.completedCurriculumLessonIds.includes(cLesson.id);
  return study.status === 'COMPLETED';
}

/**
 * Which curriculum lesson a finished sitting should be credited to:
 * the one it was started for, else the first not-yet-done one in this study lesson.
 */
export function creditCurriculumLesson(
  storeLesson: Lesson,
  storeLessons: Lesson[],
  requestedId?: string,
  curriculum: Curriculum = CURRICULUM
): string[] | undefined {
  const inLesson = getCurriculumLessonsForStudyLesson(storeLesson, curriculum);
  if (inLesson.length === 0) return storeLesson.completedCurriculumLessonIds;
  // Legacy lesson already completed under the old rule: keep its meaning, do not rewrite.
  if (storeLesson.completedCurriculumLessonIds === undefined && storeLesson.status === 'COMPLETED') return undefined;
  const done = storeLesson.completedCurriculumLessonIds ?? [];
  const target =
    inLesson.find((l) => l.id === requestedId) ??
    inLesson.find((l) => !done.includes(l.id) && getMissingPrerequisites(l, storeLessons, curriculum).length === 0) ??
    inLesson.find((l) => !done.includes(l.id));
  if (!target) return done;
  return done.includes(target.id) ? done : [...done, target.id];
}

export function getMissingPrerequisites(
  cLesson: CurriculumLesson,
  storeLessons: Lesson[],
  curriculum: Curriculum = CURRICULUM
): CurriculumLesson[] {
  return cLesson.prerequisites
    .map((id) => getCurriculumLesson(id, curriculum))
    .filter((l): l is CurriculumLesson => !!l && l.studyLessonTitle !== cLesson.studyLessonTitle)
    .filter((l) => !isCurriculumLessonCompleted(l, storeLessons));
}

export interface CurriculumStepContext {
  lesson: CurriculumLesson;
  topic: CurriculumTopic;
  subjectTitle: string;
  /** e.g. "วิศวกรรมคอมพิวเตอร์ → คณิตศาสตร์ → พีชคณิต → สมการเชิงเส้นตัวแปรเดียว" */
  path: string;
  missingPrerequisites: CurriculumLesson[];
}

/**
 * Resolve which curriculum lesson the student should take inside a given
 * study lesson: the first one (teaching order) whose own prerequisites are met,
 * else the first one.
 */
export function resolveCurriculumStep(
  storeLesson: Lesson,
  storeLessons: Lesson[],
  curriculum: Curriculum = CURRICULUM
): CurriculumStepContext | null {
  const candidates = getCurriculumLessonsForStudyLesson(storeLesson, curriculum);
  if (candidates.length === 0) return null;
  const lesson = candidates.find((c) => getMissingPrerequisites(c, storeLessons, curriculum).length === 0) ?? candidates[0];
  const topic = getCurriculumTopic(lesson.topicId, curriculum);
  const subject = curriculum.subjects.find((s) => s.id === lesson.subjectId);
  if (!topic || !subject) return null;
  return {
    lesson,
    topic,
    subjectTitle: subject.title,
    path: [curriculum.pathway.title, subject.title, topic.title, lesson.title].join(' → '),
    missingPrerequisites: getMissingPrerequisites(lesson, storeLessons, curriculum),
  };
}

export interface SubjectReadiness {
  subjectId: CurriculumSubjectId;
  completedLessons: number;
  totalLessons: number;
  readinessPercent: number;
  targetReadinessPercent: number;
}

/** ความพร้อม per pathway requirement, based on completed curriculum lessons. */
export function getPathwayReadiness(storeLessons: Lesson[], curriculum: Curriculum = CURRICULUM): SubjectReadiness[] {
  return curriculum.pathway.requirements.map((req) => {
    const lessons = curriculum.lessons.filter((l) => l.subjectId === req.subjectId);
    const completed = lessons.filter((l) => isCurriculumLessonCompleted(l, storeLessons)).length;
    return {
      subjectId: req.subjectId,
      completedLessons: completed,
      totalLessons: lessons.length,
      readinessPercent: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
      targetReadinessPercent: req.targetReadinessPercent,
    };
  });
}

/* ── Integrity validation ─────────────────────────────────────────────── */

export function validateCurriculum(
  curriculum: Curriculum = CURRICULUM,
  registry: CuratedResource[] = RESOURCE_REGISTRY
): string[] {
  const errors: string[] = [];
  const allIds = [
    curriculum.pathway.id,
    ...curriculum.subjects.map((x) => x.id),
    ...curriculum.topics.map((x) => x.id),
    ...curriculum.lessons.map((x) => x.id),
    ...curriculum.skills.map((x) => x.id),
    ...curriculum.exercises.map((x) => x.id),
    ...curriculum.quizzes.map((x) => x.id),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) errors.push(`duplicate id: ${id}`);
    seen.add(id);
  }

  const subjectIds = new Set(curriculum.subjects.map((s) => s.id));
  const topicIds = new Set(curriculum.topics.map((t) => t.id));
  const lessonIds = new Set(curriculum.lessons.map((l) => l.id));
  const skillIds = new Set(curriculum.skills.map((s) => s.id));
  const exerciseIds = new Set(curriculum.exercises.map((e) => e.id));
  const quizIds = new Set(curriculum.quizzes.map((q) => q.id));
  const resourceIds = new Set(registry.map((r) => r.id));
  const ref = (set: Set<string>, id: string, where: string) => {
    if (!set.has(id)) errors.push(`${where} → unknown id ${id}`);
  };

  for (const req of curriculum.pathway.requirements) {
    ref(subjectIds, req.subjectId, 'pathway requirement');
    if (req.targetReadinessPercent < 0 || req.targetReadinessPercent > 100) errors.push(`requirement ${req.subjectId}: target out of range`);
  }
  for (const s of curriculum.subjects) {
    for (const t of s.topicIds) {
      ref(topicIds, t, `subject ${s.id}`);
      const topic = curriculum.topics.find((x) => x.id === t);
      if (topic && topic.subjectId !== s.id) errors.push(`topic ${t} listed under ${s.id} but belongs to ${topic.subjectId}`);
    }
  }
  for (const t of curriculum.topics) {
    ref(subjectIds, t.subjectId, `topic ${t.id}`);
    if (!curriculum.subjects.some((s) => s.topicIds.includes(t.id))) errors.push(`topic ${t.id} not listed by any subject`);
    for (const l of t.lessonIds) {
      ref(lessonIds, l, `topic ${t.id}`);
      const lesson = curriculum.lessons.find((x) => x.id === l);
      if (lesson && lesson.topicId !== t.id) errors.push(`lesson ${l} listed under ${t.id} but belongs to ${lesson.topicId}`);
    }
  }
  for (const l of curriculum.lessons) {
    const where = `lesson ${l.id}`;
    ref(subjectIds, l.subjectId, where);
    ref(topicIds, l.topicId, where);
    const topic = curriculum.topics.find((t) => t.id === l.topicId);
    if (topic && topic.subjectId !== l.subjectId) errors.push(`${where}: subject/topic mismatch`);
    if (!topic?.lessonIds.includes(l.id)) errors.push(`${where} not listed by its topic`);
    if (!Number.isInteger(l.estimatedMinutes) || l.estimatedMinutes < MIN_LESSON_MINUTES || l.estimatedMinutes > MAX_LESSON_MINUTES) {
      errors.push(`${where}: invalid estimatedMinutes ${l.estimatedMinutes}`);
    }
    if (l.learningOutcomes.length === 0) errors.push(`${where}: no learning outcomes`);
    if (l.skillIds.length === 0) errors.push(`${where}: no skills`);
    if (!l.studyLessonTitle) errors.push(`${where}: no studyLessonTitle`);
    l.prerequisites.forEach((p) => {
      ref(lessonIds, p, `${where} prerequisite`);
      if (p === l.id) errors.push(`${where}: prerequisite on itself`);
    });
    l.skillIds.forEach((s) => ref(skillIds, s, where));
    l.exerciseIds.forEach((e) => ref(exerciseIds, e, where));
    l.quizIds.forEach((q) => ref(quizIds, q, where));
    l.resourceIds.forEach((r) => {
      ref(resourceIds, r, where);
      const entry = registry.find((x) => x.id === r);
      if (entry && !entry.curriculumLessonIds.includes(l.id)) errors.push(`${where}: resource ${r} does not list this lesson`);
    });
  }
  for (const s of curriculum.skills) ref(subjectIds, s.subjectId, `skill ${s.id}`);
  for (const e of curriculum.exercises) {
    ref(lessonIds, e.lessonId, `exercise ${e.id}`);
    e.skillIds.forEach((s) => ref(skillIds, s, `exercise ${e.id}`));
    if (e.items.length === 0) errors.push(`exercise ${e.id}: empty`);
    if (!curriculum.lessons.find((l) => l.id === e.lessonId)?.exerciseIds.includes(e.id)) errors.push(`exercise ${e.id} not referenced by its lesson`);
  }
  for (const q of curriculum.quizzes) {
    ref(lessonIds, q.lessonId, `quiz ${q.id}`);
    if (q.questions.length === 0) errors.push(`quiz ${q.id}: empty`);
    q.questions.forEach((qq, i) => {
      ref(skillIds, qq.skillId, `quiz ${q.id} q${i + 1}`);
      if (qq.correctIndex < 0 || qq.correctIndex >= qq.choices.length) errors.push(`quiz ${q.id} q${i + 1}: correctIndex out of range`);
    });
    if (!curriculum.lessons.find((l) => l.id === q.lessonId)?.quizIds.includes(q.id)) errors.push(`quiz ${q.id} not referenced by its lesson`);
  }

  // Prerequisite cycle detection (DFS)
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`prerequisite cycle: ${[...trail, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const p of curriculum.lessons.find((l) => l.id === id)?.prerequisites ?? []) visit(p, [...trail, id]);
    state.set(id, 'done');
  };
  curriculum.lessons.forEach((l) => visit(l.id, []));

  return errors;
}

/** Phase 56: skill titles (as shown in an understanding check) → curriculum skill ids. Unknown titles are dropped. */
export function skillIdsForTitles(titles: string[], curriculum: Curriculum = CURRICULUM): string[] {
  return titles.map((t) => curriculum.skills.find((s) => s.title === t)?.id).filter((x): x is string => !!x);
}

/**
 * Learning Hub path for a store lesson, or null when the lesson is not part of the curriculum.
 * Prefers the curriculum lesson of an ongoing session, then the curriculum step the data maps to.
 */
export function learningHubPathFor(
  storeLesson: Lesson,
  storeLessons: Lesson[],
  sessionCurriculumLessonId?: string | null
): string | null {
  const candidates = getCurriculumLessonsForStudyLesson(storeLesson);
  if (candidates.length === 0) return null;
  const id =
    (sessionCurriculumLessonId && candidates.some((c) => c.id === sessionCurriculumLessonId) && sessionCurriculumLessonId) ||
    resolveCurriculumStep(storeLesson, storeLessons)?.lesson.id ||
    candidates[0].id;
  return `/learn/curriculum/${id}`;
}
