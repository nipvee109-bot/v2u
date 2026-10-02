/* =========================================================================
   Interactive lesson registry (Phase 54)
   Authored lessons first; every other curriculum lesson gets a guided
   lesson GENERATED from its V2U original + curriculum quiz, so "เรียนกับ V2U"
   works everywhere without inventing content.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { getOriginalLesson } from '../content/originals';
import type { FinalCheckItem, InteractiveLesson, InteractiveStep } from './types';
import { LINEAR_EQUATION_LESSON } from './lessons/linearEquation';
import { CODE_BATTLE_LESSON } from './lessons/codeBattle';
import { NEWTON_LAB_LESSON } from './lessons/newtonLab';

export const AUTHORED_LESSONS: InteractiveLesson[] = [LINEAR_EQUATION_LESSON, CODE_BATTLE_LESSON, NEWTON_LAB_LESSON];

const nextOf = (lessonId: string) => {
  const order = CURRICULUM.topics.flatMap((t) => t.lessonIds);
  const i = order.indexOf(lessonId);
  return i >= 0 ? order[i + 1] : undefined;
};

/** Guided lesson built only from existing content (explain → examples → try → check). */
export function generateInteractiveLesson(lessonId: string): InteractiveLesson | undefined {
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  const o = getOriginalLesson(lessonId);
  if (!lesson || !o) return undefined;
  const skill = lesson.skillIds[0];
  const steps: InteractiveStep[] = [
    { id: 'what', type: 'concept', title: 'คืออะไร', body: o.what, keyIdea: o.summary, skillId: skill },
    { id: 'how', type: 'concept', title: 'เข้าใจทีละขั้น', body: o.why, visual: { lines: o.steps, caption: 'ลำดับที่ใช้ทุกครั้ง' }, skillId: skill },
    ...o.examples.map<InteractiveStep>((e, i) => ({
      id: `example-${i + 1}`,
      type: 'example',
      title: `ตัวอย่างที่ ${i + 1}`,
      visual: { lines: [e.problem] },
      afterVisual: { lines: e.steps },
      skillId: skill,
      interaction: { kind: 'self', prompt: 'ลองคิดวิธีทำในใจก่อน แล้วเปิดดูวิธีทำ', answer: e.steps.join(' → ') },
    })),
    ...o.tryIt.map<InteractiveStep>((t, i) => ({
      id: `try-${i + 1}`,
      type: i === o.tryIt.length - 1 ? 'challenge' : 'try',
      title: i === o.tryIt.length - 1 ? 'ภารกิจย่อย' : 'ลองทำเอง',
      visual: { lines: [t.prompt] },
      skillId: lesson.skillIds[i % lesson.skillIds.length],
      interaction: { kind: 'self', prompt: 'ทำบนกระดาษ แล้วเปิดเฉลยเพื่อตรวจ', answer: t.answer },
    })),
  ];
  const quiz = CURRICULUM.quizzes.find((q) => q.lessonId === lessonId);
  const finalCheck: FinalCheckItem[] = (quiz?.questions ?? []).map((q, i) => ({ id: `fc-${i + 1}`, ...q }));
  return {
    lessonId,
    contentId: o.contentId,
    source: 'generated',
    mission: { title: lesson.title, goal: lesson.learningOutcomes[0] ?? lesson.description },
    steps,
    finalCheck,
    mistakes: o.mistakes,
    nextLessonId: nextOf(lessonId),
  };
}

/** Authored lessons keep their own check, plus any curriculum quiz question they don't already ask. */
function withQuiz(l: InteractiveLesson): InteractiveLesson {
  const quiz = CURRICULUM.quizzes.find((q) => q.lessonId === l.lessonId)?.questions ?? [];
  const missing = quiz.filter((q) => !l.finalCheck.some((f) => f.prompt === q.prompt));
  if (missing.length === 0) return l;
  return { ...l, finalCheck: [...l.finalCheck, ...missing.map((q, i) => ({ id: `fc-q${l.finalCheck.length + i + 1}`, ...q }))] };
}
const AUTHORED_WITH_QUIZ = AUTHORED_LESSONS.map(withQuiz);

export function getInteractiveLesson(lessonId: string): InteractiveLesson | undefined {
  return AUTHORED_WITH_QUIZ.find((l) => l.lessonId === lessonId) ?? generateInteractiveLesson(lessonId);
}

export function validateInteractiveLessons(): string[] {
  const errors: string[] = [];
  const skills = new Set(CURRICULUM.skills.map((s) => s.id));
  for (const l of CURRICULUM.lessons) {
    const il = getInteractiveLesson(l.id);
    if (!il) {
      errors.push(`${l.id}: no interactive lesson`);
      continue;
    }
    if (il.steps.length < 2) errors.push(`${l.id}: too few steps`);
    if (il.finalCheck.length < 1) errors.push(`${l.id}: no final check`);
    const ids = new Set<string>();
    for (const s of il.steps) {
      if (ids.has(s.id)) errors.push(`${l.id}: duplicate step ${s.id}`);
      ids.add(s.id);
      if (s.skillId && !skills.has(s.skillId)) errors.push(`${l.id}: unknown skill ${s.skillId}`);
      const i = s.interaction;
      if (i?.kind === 'choice' && (i.correctIndex < 0 || i.correctIndex >= i.choices.length)) errors.push(`${l.id}/${s.id}: bad correctIndex`);
      if ((i?.kind === 'typed' || i?.kind === 'code') && i.accept.length === 0) errors.push(`${l.id}/${s.id}: no accepted answer`);
      if (i?.kind === 'code' && (i.template.match(/____/g) || []).length !== 1) errors.push(`${l.id}/${s.id}: code needs exactly one blank`);
      if (i?.kind === 'lab' && (i.question.correctIndex < 0 || i.question.correctIndex >= i.question.choices.length)) errors.push(`${l.id}/${s.id}: bad lab question`);
    }
    for (const f of il.finalCheck) {
      if (!skills.has(f.skillId)) errors.push(`${l.id}/${f.id}: unknown skill`);
      if (f.correctIndex < 0 || f.correctIndex >= f.choices.length) errors.push(`${l.id}/${f.id}: bad correctIndex`);
    }
  }
  return errors;
}
