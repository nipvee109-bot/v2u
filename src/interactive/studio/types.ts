/* =========================================================================
   V2U Teaching Studio (Phase 64) — "เรียนกับ V2U" as short teaching chunks.
   A studio SCRIPT only points at existing data:
     · knowledge ids (concepts, rules, workedExamples, diagrams, mistakes) from src/content/knowledge
     · interactive step ids from the lesson's authored InteractiveLesson
   It adds tutor phrasing and order — never new curriculum. Tests check every id.
   ========================================================================= */

/** Progress the learner sees: เข้าใจแนวคิด → ลองทำ → ฝึกใช้ → (เช็กความเข้าใจ = existing check) */
export type StudioPhase = 'understand' | 'try' | 'practice';

export type StudioWidget =
  /** Math: balance model for an existing step's "ax + b = c" */
  | { kind: 'balance'; stepId: string }
  /** Physics: cart experiment for an existing lab step; `vary` is what the learner must change */
  | { kind: 'cart-lab'; stepId: string; vary: 'force' | 'mass' }
  /** Programming: run an existing knowledge code sample and watch the robot follow the branch */
  | { kind: 'robot-run'; codeFrom: { exampleId?: string; practiceId?: string }; values: number[] }
  /** Programming: debug an existing buggy sample by reordering its branches */
  | { kind: 'robot-debug'; practiceId: string; value: number }
  /* ── Phase 69 teaching patterns (all data comes from the lesson's knowledge) ── */
  /** STEP_ORDERING: put a worked example's own steps back in order */
  | { kind: 'order-steps'; exampleId: string }
  /** MISSING_STEP: one step of a worked example is hidden; pick it among the lesson's real steps */
  | { kind: 'missing-step'; exampleId: string; index: number }
  /** VISUAL_REASONING (systems): try (x, y) pairs and see each equation become true/false */
  | { kind: 'pair-check'; exampleId: string; eqs: [number, number, number][] }
  /** PREDICT_OBSERVE_EXPLAIN on a number line: multiply both sides of a < b by c */
  | { kind: 'number-line'; a: number; b: number }
  /** VISUAL_REASONING (exponents): factors as blocks for aᵐ·aⁿ and aᵐ ÷ aⁿ */
  | { kind: 'exponent-blocks'; base: number }
  /** GRAPH_EXPLORER: move m and c until y = mx + c passes the example's two points */
  | { kind: 'line-graph'; exampleId: string; points: [number, number][] }
  /** VISUAL_REASONING (trig): label opposite / adjacent / hypotenuse for the marked angle */
  | { kind: 'triangle-sides'; exampleId: string; opp: number; adj: number; hyp: number }
  /** PREDICT_OBSERVE_EXPLAIN (units): predict bigger/smaller, then convert with factors */
  | { kind: 'unit-ladder'; exampleId: string; value: number; from: 'km/h'; to: 'm/s' }
  /** VARIABLE_EXPLORER (vectors): magnitude + angle → components */
  | { kind: 'vector-explorer'; exampleId: string; magnitude: number; angle: number }
  /** VARIABLE_EXPLORER + GRAPH_EXPLORER (kinematics): u, a, t → motion + v–t graph */
  | { kind: 'motion-explorer'; exampleId: string; u: number; a: number; t: number }
  /** CODE_TRACE (+ predict): step through a python3-generated trace */
  | { kind: 'code-trace'; traceId: string; mode: 'memory' | 'loop' | 'io' | 'call'; predictStep?: number }
  /** Web: HTML Live Web Builder for an authored `html` step (code ↔ live page) */
  | { kind: 'html-builder'; stepId: string };

export type StudioChunk =
  | { id: string; phase: StudioPhase; kind: 'hook'; tutor: string }
  | { id: string; phase: StudioPhase; kind: 'explain'; title: string; tutor?: string; concepts?: string[]; rules?: string[]; detailed?: number[]; analogy?: boolean; diagram?: string }
  | { id: string; phase: StudioPhase; kind: 'widget'; title: string; tutor: string; widget: StudioWidget }
  | { id: string; phase: StudioPhase; kind: 'step'; stepId: string; tutor?: string }
  | { id: string; phase: StudioPhase; kind: 'example'; exampleId: string; tutor?: string }
  /** FIND_THE_MISTAKE: the lesson's own mistakes — match each mistake to its fix (interactive) */
  | { id: string; phase: StudioPhase; kind: 'mistakes'; title: string; tutor?: string; stepId?: string }
  | { id: string; phase: StudioPhase; kind: 'summary'; tutor?: string }
  /** Knowledge practice (guided / independent), checked against the item's verified answer. Practice only — no mastery evidence. */
  | { id: string; phase: StudioPhase; kind: 'practice'; title: string; tutor?: string; practiceIds: string[] }
  /** Knowledge debugging case: buggy code → symptom → predict → fix (programming) */
  | { id: string; phase: StudioPhase; kind: 'debug'; title: string; tutor?: string; debugId: string };

export interface StudioScript {
  lessonId: string;
  subject: 'math' | 'physics' | 'programming' | 'web';
  /** Teaching identity of this subject (design check) */
  principle: string;
  /** A = full interactive / game-like, B = interactive teaching, C = smart reading */
  experience: 'A' | 'B' | 'C';
  chunks: StudioChunk[];
}
