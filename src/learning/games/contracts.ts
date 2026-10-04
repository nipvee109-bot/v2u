/* =========================================================================
   V2U ⇄ Game contracts, version 1.1 (Phase 70).
   A game only ever sees GameContent 1.1 (never src/content/knowledge) and only
   ever returns GameEvidence 1.1. Mastery, skill status, review, next step and
   diagnostics are V2U's alone — the evidence type has no field for them, and the
   validator rejects any payload that tries to send them.
   ========================================================================= */

export const GAME_CONTENT_CONTRACT = 'v2u.game-content' as const;
export const GAME_EVIDENCE_CONTRACT = 'v2u.game-evidence' as const;
export const GAME_CONTRACT_VERSION_1_1 = '1.1' as const;

export interface HintLadder {
  /** 1 — conceptual guidance (a rule/concept of the lesson) */
  concept: string;
  /** 2 — focus the learner's attention (the item's own hint) — null when the lesson has none */
  focus: string | null;
  /** 3 — stronger guidance: how a worked example of the same idea was solved (never this item's answer) */
  guided: { exampleId: string; steps: string[] };
}

export interface GamePrediction {
  /** Source practice item id in V2U */
  sourceId: string;
  skillId: string;
  level: 1 | 2 | 3;
  prompt: string;
  /** Python code exactly as in the lesson (keywords untranslated) */
  code: string;
  /** Output verified by real python3 in the V2U test suite */
  expectedOutput: string;
  /** Why — shown after the learner answers (wrong or right) */
  explanation: string;
  hints: HintLadder;
}

export interface GameDebugCase {
  sourceId: string;
  skillId: string;
  brokenCode: string;
  /** What Python reports / what goes wrong */
  symptom: string;
  fixedCode: string;
  /** Expected behaviour once fixed (output of the fixed code) */
  expectedOutput: string;
  /** Why it was wrong and which concept fixes it */
  explanation: string;
}

export interface GameContent {
  contract: typeof GAME_CONTENT_CONTRACT;
  version: typeof GAME_CONTRACT_VERSION_1_1;
  gameId: string;
  lessonId: string;
  subjectId: string;
  topicId: string;
  /** Learner-facing language of the explanations (code stays Python) */
  language: 'th';
  title: string;
  skills: { id: string; title: string }[];
  /** Lesson learning outcomes (curriculum) */
  objectives: string[];
  prerequisites: { lessonId: string; title: string }[];
  readiness: 'READY' | 'READY_WITH_LIMITATIONS' | 'NOT_READY';
  boundary: { allowedKnowledge: string[]; notYetAllowed: string[] };
  teaching: {
    missionObjective: string;
    whyItMatters: string;
    concepts: { id: string; term: string; meaning: string; skillId: string }[];
    rules: { id: string; name: string; statement: string; skillId: string }[];
    /** Editable starting programs: the lesson's worked examples */
    starterCode: { sourceId: string; skillId: string; problem: string; code: string; expectedOutput: string; steps: string[] }[];
    predictions: GamePrediction[];
    debugging: GameDebugCase[];
    commonMistakes: { mistake: string; why: string; fix: string }[];
    summary: string[];
  };
  /** V2U teaching voice for narration the game shows during a trace (Thai; Python tokens untouched) */
  narration: Record<'conditionTrue' | 'conditionFalse' | 'skipped' | 'elseTaken' | 'printed', string>;
  /** Content the lesson does not provide — the game must not invent it */
  missing: string[];
}

export interface SkillEvidence {
  skillId: string;
  attempts: number;
  correct: number;
  hintsUsed: number;
}

export interface GameEvidence {
  contract: typeof GAME_EVIDENCE_CONTRACT;
  version: typeof GAME_CONTRACT_VERSION_1_1;
  gameId: string;
  lessonId: string;
  sessionId: string;
  /** Seconds */
  duration: number;
  completed: boolean;
  attempts: number;
  correct: number;
  hintsUsed: number;
  retries: number;
  skillEvidence: SkillEvidence[];
}

/** Fields a game may never send — V2U alone decides these. */
export const FORBIDDEN_EVIDENCE_FIELDS = ['mastery', 'masteryScore', 'skillStatus', 'status', 'review', 'reviewSchedule', 'nextReview', 'nextStep', 'diagnostic', 'diagnosticResult', 'score'] as const;

const isNonNegInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const str = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

export function validateGameContent(c: GameContent): string[] {
  const e: string[] = [];
  if (c.contract !== GAME_CONTENT_CONTRACT || c.version !== GAME_CONTRACT_VERSION_1_1) e.push('contract/version');
  for (const k of ['gameId', 'lessonId', 'subjectId', 'topicId', 'title'] as const) if (!str(c[k])) e.push(`missing ${k}`);
  if (c.language !== 'th') e.push('language');
  if (!c.skills.length) e.push('no skills');
  const skills = new Set(c.skills.map((s) => s.id));
  const t = c.teaching;
  if (!str(t.missionObjective)) e.push('missionObjective');
  for (const p of t.predictions) {
    if (!skills.has(p.skillId)) e.push(`prediction ${p.sourceId}: skill outside payload`);
    if (!str(p.code) || !str(p.expectedOutput) || !str(p.explanation)) e.push(`prediction ${p.sourceId}: incomplete`);
    if (!str(p.hints.concept) || !p.hints.guided.steps.length) e.push(`prediction ${p.sourceId}: hint ladder`);
    // hint 3 must not contain this item's answer (bare True/False is exempt: it appears in every explanation of a condition)
    const ans = p.expectedOutput.trim();
    if (!/^(True|False)$/.test(ans) && p.hints.guided.steps.some((s) => s.includes(ans))) e.push(`prediction ${p.sourceId}: hint 3 reveals the answer`);
  }
  for (const d of t.debugging) if (!skills.has(d.skillId) || !str(d.brokenCode) || !str(d.fixedCode)) e.push(`debug ${d.sourceId}`);
  for (const s of t.starterCode) if (!skills.has(s.skillId) || !str(s.code)) e.push(`starter ${s.sourceId}`);
  const ids = [...t.predictions.map((p) => p.sourceId), ...t.debugging.map((d) => d.sourceId), ...t.starterCode.map((s) => s.sourceId)];
  if (new Set(ids).size !== ids.length) e.push('duplicate source ids');
  return e;
}

export function validateGameEvidence(raw: unknown): string[] {
  const e: string[] = [];
  if (!raw || typeof raw !== 'object') return ['not an object'];
  const v = raw as Record<string, unknown>;
  if (v.contract !== GAME_EVIDENCE_CONTRACT || v.version !== GAME_CONTRACT_VERSION_1_1) e.push('contract/version');
  for (const k of ['gameId', 'lessonId', 'sessionId']) if (!str(v[k])) e.push(`missing ${k}`);
  if (typeof v.duration !== 'number' || !(v.duration >= 0) || !Number.isFinite(v.duration)) e.push('duration');
  if (typeof v.completed !== 'boolean') e.push('completed');
  for (const k of ['attempts', 'correct', 'hintsUsed', 'retries']) if (!isNonNegInt(v[k])) e.push(k);
  if (isNonNegInt(v.attempts) && isNonNegInt(v.correct) && (v.correct as number) > (v.attempts as number)) e.push('correct > attempts');
  if (!Array.isArray(v.skillEvidence)) e.push('skillEvidence');
  else
    for (const s of v.skillEvidence as Record<string, unknown>[]) {
      if (!s || !str(s.skillId) || !isNonNegInt(s.attempts) || !isNonNegInt(s.correct) || !isNonNegInt(s.hintsUsed) || (s.correct as number) > (s.attempts as number)) e.push('skillEvidence entry');
      for (const f of FORBIDDEN_EVIDENCE_FIELDS) if (s && f in s) e.push(`forbidden field skillEvidence.${f}`);
    }
  for (const f of FORBIDDEN_EVIDENCE_FIELDS) if (f in v) e.push(`forbidden field ${f}`);
  return e;
}
