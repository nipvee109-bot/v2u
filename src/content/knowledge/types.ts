/* =========================================================================
   V2U Lesson Knowledge (Phase 62) — researched, structured, game-ready.
   -------------------------------------------------------------------------
   One record per EXISTING curriculum lesson (ids from src/curriculum/data.ts).
   Reading, "เรียนกับ V2U", the understanding check — and later games — all
   read the same data. Every answer carries a machine check (`verify`) that
   the test suite runs, so no answer is trusted on wording alone.
   ========================================================================= */

/** Machine-checkable proof that an answer is right (run by scripts/test-phase-62.js). */
export type Verify =
  /** Every expression must be true with these variable values (equations, systems). */
  | { kind: 'holds'; vars: Record<string, number>; holds: string[] }
  /** `expr` (may use vars) must equal `expected` within `tol` (default 1e-9). */
  | { kind: 'value'; expr: string; expected: number; tol?: number; vars?: Record<string, number>; unit?: string }
  /** The inequality `holds` (in x) must be true exactly when x `op` bound. */
  | { kind: 'inequality'; holds: string; op: '<' | '>' | '<=' | '>='; bound: number }
  /** Python code; stdout must equal `output` exactly (or stderr must contain `error`). */
  | { kind: 'python'; code: string; stdin?: string; output?: string; error?: string };

export type PracticeLevel = 1 | 2 | 3;

export interface KnowledgePractice {
  id: string;
  skillId: string;
  level: PracticeLevel;
  prompt: string;
  /** Code shown with the prompt (programming) */
  code?: string;
  /** Final answer exactly as the learner should see it */
  answer: string;
  /** Why this is the answer — the reasoning, not just the result */
  explanation: string;
  /** Guided practice only: a nudge before revealing */
  hint?: string;
  verify?: Verify;
}

export interface KnowledgeCheck {
  id: string;
  skillId: string;
  prompt: string;
  code?: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  verify?: Verify;
}

export interface KnowledgeExample {
  id: string;
  skillId: string;
  problem: string;
  code?: string;
  steps: string[];
  answer: string;
  verify?: Verify;
}

export interface KnowledgeMistake {
  mistake: string;
  /** Why learners make it */
  why: string;
  /** How to fix it */
  fix: string;
}

export interface KnowledgeRule {
  id: string;
  name: string;
  /** Rule / formula / syntax as written */
  statement: string;
  /** What each symbol means, when there are symbols */
  notation?: string;
  skillId: string;
}

export interface KnowledgeDebug {
  id: string;
  skillId: string;
  /** Code with the bug */
  buggy: string;
  /** What Python reports (or what goes wrong) */
  symptom: string;
  fixed: string;
  /** Output of the fixed code */
  output: string;
  explanation: string;
  verifyBuggy: Verify;
  verifyFixed: Verify;
}

export type ReadinessStatus = 'READY' | 'READY_WITH_LIMITATIONS' | 'NOT_READY';

export interface LessonResearchAudit {
  sourcesFound: string[];
  sourcesSelected: string[];
  sourcesRejected: { source: string; reason: string }[];
  knowledgeCovered: string[];
  knowledgeMissing: string[];
  externalResourcesVerified: number;
  limitations: string[];
  readiness: ReadinessStatus;
}

export interface LessonKnowledge {
  lessonId: string;
  /** Curriculum skill ids taught here (must match the lesson's skillIds) */
  skills: string[];
  /** Curriculum lesson ids (must match the lesson's prerequisites) */
  prerequisites: string[];
  whyItMatters: string;
  allowedKnowledge: string[];
  notYetAllowed: string[];
  concepts: { id: string; term: string; meaning: string; skillId: string }[];
  rules: KnowledgeRule[];
  /** Detailed explanation, one paragraph per item */
  detailed: string[];
  /** Everyday picture of the idea */
  analogy?: string;
  workedExamples: KnowledgeExample[];
  guided: KnowledgePractice[];
  independent: KnowledgePractice[];
  debugging?: KnowledgeDebug[];
  checks: KnowledgeCheck[];
  mistakes: KnowledgeMistake[];
  summary: string[];
  afterLesson: string[];
  /** Curriculum lesson ids that build on this one */
  next: string[];
  /** Source ids from SOURCES, with the claims each one backs */
  provenance: { sourceId: string; usedFor: string; crossChecked: boolean }[];
  audit: LessonResearchAudit;
}

export type SourceVerification =
  /** URL returned by a web search on the check date; the page itself was not opened */
  | 'search-indexed'
  /** No URL kept — locate by title/locator only */
  | 'locator-only';

export interface KnowledgeSource {
  id: string;
  title: string;
  publisher: string;
  type: 'curriculum' | 'textbook' | 'documentation' | 'standard' | 'reference';
  language: 'th' | 'en';
  /** Exactly as returned by search. NOT shown as a link in the app (never fetched). */
  foundUrl?: string;
  /** Where to find it without a link */
  locator: string;
  authoritative: boolean;
  checkedAt: string;
  verification: SourceVerification;
  notes: string;
}
