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

/* ── Diagrams (Phase 63): drawn from data, checked against the lesson's numbers ── */
export type Diagram =
  | {
      kind: 'graph';
      id: string;
      title: string;
      xLabel: string;
      yLabel: string;
      xRange: [number, number];
      yRange: [number, number];
      /** Straight lines y = m·x + c (optionally only between x0 and x1) */
      lines: { m: number; c: number; label: string; x0?: number; x1?: number; /** x where the label is printed */ labelAt?: number }[];
      points?: { x: number; y: number; label: string }[];
      /** Shade the area under the first line between x0 and x1 (v–t graphs) */
      shadeUnder?: { x0: number; x1: number; label: string };
      caption: string;
    }
  | {
      kind: 'triangle';
      id: string;
      title: string;
      /** The marked angle θ (degrees), at the bottom-left corner */
      angleDeg: number;
      opp: number;
      adj: number;
      hyp: number;
      /** Text printed on each side (may be a symbol or a value) */
      labels: { opp: string; adj: string; hyp: string };
      caption: string;
    }
  | {
      kind: 'vectors';
      id: string;
      title: string;
      unit: string;
      vectors: { x: number; y: number; label: string }[];
      /** Draw the resultant of all vectors */
      resultant?: string;
      /** Draw x/y components of the first vector */
      components?: boolean;
      caption: string;
    }
  | {
      kind: 'forces';
      id: string;
      title: string;
      body: string;
      forces: { dir: 'up' | 'down' | 'left' | 'right'; label: string; newtons: number }[];
      /** Net force expected from the forces (checked) */
      net: { x: number; y: number };
      caption: string;
    };

/** A sentence of an official document that supports a claim (checked by the test suite). */
export interface Evidence {
  /** 'topic:<name>' (Python Language/Library Reference bundled with CPython) or 'doc:<builtin>' (docstring) */
  ref: string;
  quote: string;
  claim: string;
}

export interface LessonResearchAudit {
  sourcesFound: string[];
  sourcesSelected: string[];
  sourcesRejected: { source: string; reason: string }[];
  knowledgeCovered: string[];
  knowledgeMissing: string[];
  externalResourcesVerified: number;
  limitations: string[];
  /** Missing extras that do not block learning (e.g. no external video) */
  nonBlocking?: string[];
  /** How claims were checked in the verification pass */
  verification?: string[];
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
  provenance: { sourceId: string; usedFor: string; crossChecked: boolean; evidence?: Evidence[] }[];
  /** Phase 63: diagrams for graphs, triangles, vectors and forces */
  diagrams?: Diagram[];
  audit: LessonResearchAudit;
}

export type SourceVerification =
  /** Official document text actually opened and read in this environment (bundled with the installed software) */
  | 'opened-local'
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
