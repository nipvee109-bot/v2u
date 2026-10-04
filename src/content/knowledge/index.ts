/* Lesson knowledge index (Phase 62) — one entry per existing curriculum lesson. */

import type { FinalCheckItem } from '../../interactive/types';
import { MATH_KNOWLEDGE } from './math';
import { PHYSICS_KNOWLEDGE } from './physics';
import { PROGRAMMING_KNOWLEDGE } from './programming';
import type { LessonKnowledge, ReadinessStatus } from './types';

export * from './types';
export { SOURCES, getSource, REJECTED_SOURCES } from './sources';

export const LESSON_KNOWLEDGE: LessonKnowledge[] = [...MATH_KNOWLEDGE, ...PROGRAMMING_KNOWLEDGE, ...PHYSICS_KNOWLEDGE];

export const getLessonKnowledge = (lessonId: string) => LESSON_KNOWLEDGE.find((k) => k.lessonId === lessonId);

/** Knowledge checks in the shape the understanding check already uses. */
export function knowledgeFinalChecks(lessonId: string): FinalCheckItem[] {
  const k = getLessonKnowledge(lessonId);
  if (!k) return [];
  return k.checks.map((c) => ({
    id: `kc-${c.id}`,
    prompt: c.prompt,
    ...(c.code ? { code: c.code } : {}),
    choices: c.choices,
    correctIndex: c.correctIndex,
    explanation: c.explanation,
    skillId: c.skillId,
    ...(c.misconceptions?.length
      ? { misconceptions: c.misconceptions.map((m) => ({ choice: m.choice, mistake: k.mistakes[m.mistake].mistake, fix: k.mistakes[m.mistake].fix })) }
      : {}),
  }));
}

/** All practice for a lesson, in order: guided → independent (by level). */
export const knowledgePractice = (lessonId: string) => {
  const k = getLessonKnowledge(lessonId);
  return k ? [...k.guided, ...[...k.independent].sort((a, b) => a.level - b.level)] : [];
};

export function researchSummary() {
  const count = (r: ReadinessStatus) => LESSON_KNOWLEDGE.filter((k) => k.audit.readiness === r).length;
  return {
    lessons: LESSON_KNOWLEDGE.length,
    ready: count('READY'),
    readyWithLimitations: count('READY_WITH_LIMITATIONS'),
    notReady: count('NOT_READY'),
    practice: LESSON_KNOWLEDGE.reduce((n, k) => n + k.guided.length + k.independent.length + (k.debugging?.length ?? 0), 0),
    checks: LESSON_KNOWLEDGE.reduce((n, k) => n + k.checks.length, 0),
    workedExamples: LESSON_KNOWLEDGE.reduce((n, k) => n + k.workedExamples.length, 0),
  };
}
