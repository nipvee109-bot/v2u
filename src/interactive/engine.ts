/* =========================================================================
   V2U Interactive Learning Engine (Phase 54) — pure logic, no React
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import type {
  ChoiceInteraction,
  FinalCheckItem,
  InteractiveLesson,
  OrderInteraction,
  PlayerState,
  StepResult,
  TypedInteraction,
  UnderstandingSummary,
} from './types';

/* ── Answer checking ──────────────────────────────────────────────────── */

/** "x = 5", " X=5 ", "５", "−3" → comparable form. */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')
    .replace(/^[a-z]=/, '');
}

function toNumber(s: string): number | undefined {
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = Number(frac[2]);
    return d === 0 ? undefined : Number(frac[1]) / d;
  }
  return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : undefined;
}

export function checkTyped(i: TypedInteraction, input: string): boolean {
  const a = normalizeAnswer(input);
  if (!a) return false;
  return i.accept.some((acc) => {
    const b = normalizeAnswer(acc);
    if (a === b) return true;
    const na = toNumber(a);
    const nb = toNumber(b);
    return na !== undefined && nb !== undefined && Math.abs(na - nb) < 1e-9;
  });
}

export function checkChoice(i: ChoiceInteraction | FinalCheckItem, index: number): boolean {
  return index === i.correctIndex;
}

export function checkOrder(i: OrderInteraction, order: string[]): boolean {
  return order.length === i.items.length && order.every((x, k) => x === i.items[k]);
}

/** Deterministic shuffle (so tests and re-renders are stable) that never returns the solved order. */
export function scrambled<T>(items: T[], seed = 7): T[] {
  if (items.length < 2) return [...items];
  const out = [...items];
  let s = seed;
  for (let k = out.length - 1; k > 0; k--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  if (out.every((x, k) => x === items[k])) out.push(out.shift()!);
  return out;
}

/* ── Player state ─────────────────────────────────────────────────────── */

export const EMPTY_RESULT: StepResult = { attempts: 0, solved: false, hintShown: false, revealed: false };

export function initialPlayerState(): PlayerState {
  return { stepIndex: 0, results: {}, finalAnswers: {}, finished: false };
}

export type PlayerAction =
  | { type: 'answer'; stepId: string; correct: boolean }
  | { type: 'hint'; stepId: string }
  | { type: 'reveal'; stepId: string }
  | { type: 'go'; index: number }
  | { type: 'final'; itemId: string; choice: number }
  | { type: 'finish' }
  /** Retake the check after reviewing — keeps step progress */
  | { type: 'recheck' }
  | { type: 'restart' };

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  const r = (id: string) => state.results[id] ?? EMPTY_RESULT;
  switch (action.type) {
    case 'answer': {
      const prev = r(action.stepId);
      if (prev.solved) return state;
      const next: StepResult = {
        ...prev,
        attempts: prev.attempts + 1,
        solved: action.correct,
        // A wrong answer always earns a hint — learning, not punishment
        hintShown: prev.hintShown || !action.correct,
      };
      return { ...state, results: { ...state.results, [action.stepId]: next } };
    }
    case 'hint':
      return { ...state, results: { ...state.results, [action.stepId]: { ...r(action.stepId), hintShown: true } } };
    case 'reveal':
      return { ...state, results: { ...state.results, [action.stepId]: { ...r(action.stepId), revealed: true, hintShown: true } } };
    case 'go':
      return { ...state, stepIndex: Math.max(0, action.index) };
    case 'final':
      if (state.finished) return state;
      return { ...state, finalAnswers: { ...state.finalAnswers, [action.itemId]: action.choice } };
    case 'finish':
      return { ...state, finished: true };
    case 'recheck':
      return { ...state, finalAnswers: {}, finished: false };
    case 'restart':
      return initialPlayerState();
  }
}

/** A step may be left once it was solved, revealed, or has nothing to answer. */
export function canContinue(lesson: InteractiveLesson, state: PlayerState, stepIndex: number): boolean {
  const step = lesson.steps[stepIndex];
  if (!step?.interaction) return true;
  const res = state.results[step.id] ?? EMPTY_RESULT;
  return res.solved || res.revealed;
}

export function stepsDone(lesson: InteractiveLesson, state: PlayerState): number {
  return lesson.steps.filter((s, i) => i < state.stepIndex || (s.interaction && (state.results[s.id]?.solved || state.results[s.id]?.revealed))).length;
}

/* ── Understanding summary (never claims mastery from opening a lesson) ── */

const skillTitle = (id: string) => CURRICULUM.skills.find((s) => s.id === id)?.title ?? id;

export function summarize(lesson: InteractiveLesson, state: PlayerState): UnderstandingSummary {
  const items = lesson.finalCheck;
  const answered = items.filter((it) => state.finalAnswers[it.id] !== undefined);
  const correct = answered.filter((it) => checkChoice(it, state.finalAnswers[it.id]));
  const score = items.length ? Math.round((correct.length / items.length) * 100) : 0;

  const bySkill = new Map<string, { right: number; wrong: number }>();
  for (const it of items) {
    const v = bySkill.get(it.skillId) ?? { right: 0, wrong: 0 };
    if (state.finalAnswers[it.id] === undefined || !checkChoice(it, state.finalAnswers[it.id])) v.wrong++;
    else v.right++;
    bySkill.set(it.skillId, v);
  }
  // A skill also counts as shaky if its practice step was only revealed
  const revealedSkills = new Set(
    lesson.steps.filter((s) => s.skillId && state.results[s.id]?.revealed && !state.results[s.id]?.solved).map((s) => s.skillId!)
  );
  const understood: string[] = [];
  const confused: string[] = [];
  for (const [id, v] of bySkill) {
    if (v.wrong === 0 && !revealedSkills.has(id)) understood.push(skillTitle(id));
    else confused.push(skillTitle(id));
  }
  for (const id of revealedSkills) if (!bySkill.has(id)) confused.push(skillTitle(id));

  // Outcomes are only claimed when every check was right — opening or watching is not understanding
  const lessonDef = CURRICULUM.lessons.find((l) => l.id === lesson.lessonId);
  const canDo = items.length > 0 && score === 100 && confused.length === 0 ? lessonDef?.learningOutcomes ?? [] : [];
  const review = [
    ...confused.map((c) => `ทักษะ: ${c}`),
    ...(confused.length > 0 ? lesson.mistakes.slice(0, 2).map((m) => `จุดที่มักพลาด: ${m}`) : []),
  ];
  return { score, understood, confused, review, canDo };
}

/** Text for the existing "ยังไม่เข้าใจ" note, so the review engine picks it up. */
export function unclearNoteFrom(summary: UnderstandingSummary): string {
  return summary.confused.length ? `ยังสับสน: ${summary.confused.join(', ')}` : '';
}
