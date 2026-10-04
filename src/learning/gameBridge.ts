/* =========================================================================
   V2U ⇄ Game boundary (Phase 64) — presentation-level contract ONLY.

     Lesson Knowledge → toGameContent() → GameContent → (Codex game, separate project)
       → GameEvidence → toPlayerActions() → existing player reducer → existing learning loop

   No game engine lives here and the learning engine is not changed: a game can
   only report attempts, and only attempts tied to an existing interactive step
   become the same 'answer' actions a learner produces in "เรียนกับ V2U".
   Mastery is never declared by a game.
   ========================================================================= */

import { getLessonKnowledge } from '../content/knowledge';
import type { KnowledgeCheck, KnowledgePractice, ReadinessStatus } from '../content/knowledge';
import type { PlayerAction } from '../interactive/engine';
import type { InteractiveLesson } from '../interactive/types';

export const GAME_CONTRACT_VERSION = 1;

export interface GameContent {
  contractVersion: typeof GAME_CONTRACT_VERSION;
  lessonId: string;
  skills: string[];
  readiness: ReadinessStatus;
  /** What the game may ask about — and what it must not */
  allowedKnowledge: string[];
  notYetAllowed: string[];
  concepts: { id: string; term: string; meaning: string; skillId: string }[];
  rules: { id: string; statement: string; skillId: string }[];
  /** Practice items with verified answers (the `verify` field is kept so a game can check answers itself) */
  practice: KnowledgePractice[];
  checks: KnowledgeCheck[];
  mistakes: { mistake: string; why: string; fix: string }[];
}

export interface GameAttempt {
  skillId: string;
  /** Existing interactive step this attempt answers (only these reach the learning loop) */
  stepId?: string;
  correct: boolean;
  usedHint?: boolean;
  revealed?: boolean;
}

export interface GameEvidence {
  contractVersion: typeof GAME_CONTRACT_VERSION;
  lessonId: string;
  source: string;
  attempts: GameAttempt[];
}

/** Build the content a game receives — straight from the knowledge layer, nothing added. */
export function toGameContent(lessonId: string): GameContent | undefined {
  const k = getLessonKnowledge(lessonId);
  if (!k) return undefined;
  return {
    contractVersion: GAME_CONTRACT_VERSION,
    lessonId,
    skills: k.skills,
    readiness: k.audit.readiness,
    allowedKnowledge: k.allowedKnowledge,
    notYetAllowed: k.notYetAllowed,
    concepts: k.concepts,
    rules: k.rules.map((r) => ({ id: r.id, statement: r.statement, skillId: r.skillId })),
    practice: [...k.guided, ...k.independent],
    checks: k.checks,
    mistakes: k.mistakes,
  };
}

/** Translate game evidence into the actions the existing player already understands.
 *  Attempts without a known step, with an unknown skill, or for another lesson are dropped. */
export function toPlayerActions(evidence: GameEvidence, lesson: InteractiveLesson): PlayerAction[] {
  if (evidence.contractVersion !== GAME_CONTRACT_VERSION || evidence.lessonId !== lesson.lessonId) return [];
  const skills = new Set(getLessonKnowledge(lesson.lessonId)?.skills ?? []);
  const actions: PlayerAction[] = [];
  for (const a of evidence.attempts) {
    const step = a.stepId ? lesson.steps.find((s) => s.id === a.stepId && s.interaction) : undefined;
    if (!step || !skills.has(a.skillId)) continue;
    if (a.usedHint) actions.push({ type: 'hint', stepId: step.id });
    actions.push(a.revealed ? { type: 'reveal', stepId: step.id } : { type: 'answer', stepId: step.id, correct: a.correct });
  }
  return actions;
}

/** Phase 69: game slot status. No Codex game is connected yet, so every lesson is NOT_AVAILABLE —
 *  never faked. When games ship, this reads their registry; nothing else changes. */
export type GameSlotStatus = 'NOT_AVAILABLE' | 'AVAILABLE' | 'LOADING' | 'COMPLETED' | 'ERROR';
export const CONNECTED_GAMES: readonly string[] = [];
export function getGameSlotStatus(lessonId: string): GameSlotStatus {
  return CONNECTED_GAMES.includes(lessonId) ? 'AVAILABLE' : 'NOT_AVAILABLE';
}
