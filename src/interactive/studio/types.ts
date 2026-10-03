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
  | { kind: 'robot-debug'; practiceId: string; value: number };

export type StudioChunk =
  | { id: string; phase: StudioPhase; kind: 'hook'; tutor: string }
  | { id: string; phase: StudioPhase; kind: 'explain'; title: string; tutor?: string; concepts?: string[]; rules?: string[]; detailed?: number[]; analogy?: boolean; diagram?: string }
  | { id: string; phase: StudioPhase; kind: 'widget'; title: string; tutor: string; widget: StudioWidget }
  | { id: string; phase: StudioPhase; kind: 'step'; stepId: string; tutor?: string }
  | { id: string; phase: StudioPhase; kind: 'example'; exampleId: string; tutor?: string }
  | { id: string; phase: StudioPhase; kind: 'mistakes'; title: string; tutor?: string; stepId?: string }
  | { id: string; phase: StudioPhase; kind: 'summary'; tutor?: string }
  /** Knowledge practice (guided / independent), checked against the item's verified answer. Practice only — no mastery evidence. */
  | { id: string; phase: StudioPhase; kind: 'practice'; title: string; tutor?: string; practiceIds: string[] }
  /** Knowledge debugging case: buggy code → symptom → predict → fix (programming) */
  | { id: string; phase: StudioPhase; kind: 'debug'; title: string; tutor?: string; debugId: string };

export interface StudioScript {
  lessonId: string;
  subject: 'math' | 'physics' | 'programming';
  /** Teaching identity of this subject (design check) */
  principle: string;
  /** A = full interactive / game-like, B = interactive teaching, C = smart reading */
  experience: 'A' | 'B' | 'C';
  chunks: StudioChunk[];
}
