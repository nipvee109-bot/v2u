/* V2UGameEvidenceAdapter (Phase 70): GameEvidence 1.1 → a READ-ONLY interpretation.
   It is a pure function: no store, no mastery, no review, no next step. It only says what
   the evidence would mean. Learning effects stay OFF until a registered game passes a real
   integration test (GameRegistry.learningEffectsActive). */

import { CURRICULUM } from '../../curriculum/data';
import { validateGameEvidence } from './contracts';
import type { GameEvidence } from './contracts';
import { GAME_REGISTRY } from './registry';

export interface EvidenceInterpretation {
  accepted: boolean;
  problems: string[];
  gameId?: string;
  lessonId?: string;
  /** Plain description of practice done in the game, per skill (never a mastery value) */
  practice: { skillId: string; attempts: number; correct: number; hintsUsed: number; accuracy: number }[];
  completed: boolean;
  /** What the evidence is allowed to change right now — all false in this phase */
  effects: { mastery: false; skillStatus: false; review: false; nextStep: false; diagnostic: false };
  learningEffectsActive: false;
}

const NONE = { mastery: false, skillStatus: false, review: false, nextStep: false, diagnostic: false } as const;

export function interpretGameEvidence(raw: unknown): EvidenceInterpretation {
  const problems = validateGameEvidence(raw);
  const base = { practice: [], completed: false, effects: NONE, learningEffectsActive: false as const };
  if (problems.length) return { accepted: false, problems, ...base };
  const ev = raw as GameEvidence;
  const game = GAME_REGISTRY.find((g) => g.gameId === ev.gameId);
  if (!game) return { accepted: false, problems: [`unregistered game ${ev.gameId}`], ...base };
  if (!game.lessonIds.includes(ev.lessonId)) return { accepted: false, problems: [`${ev.gameId} is not registered for ${ev.lessonId}`], ...base };
  const lesson = CURRICULUM.lessons.find((l) => l.id === ev.lessonId);
  const unknown = ev.skillEvidence.filter((s) => !lesson?.skillIds.includes(s.skillId)).map((s) => s.skillId);
  if (unknown.length) return { accepted: false, problems: [`skills outside the lesson: ${unknown.join(', ')}`], ...base };
  return {
    accepted: true,
    problems: [],
    gameId: ev.gameId,
    lessonId: ev.lessonId,
    practice: ev.skillEvidence.map((s) => ({ ...s, accuracy: s.attempts ? s.correct / s.attempts : 0 })),
    completed: ev.completed,
    effects: NONE,
    learningEffectsActive: false,
  };
}
