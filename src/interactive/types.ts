/* =========================================================================
   V2U Interactive Learning (Phase 54) — data model
   -------------------------------------------------------------------------
   A lesson the learner DOES, not just reads:
     mission → steps (explain · show · ask · try · challenge) → final check
   Interactions are a closed union so math / programming / physics can each
   add their own kinds later without touching the player.
   ========================================================================= */

/** How the learner chose to study this sitting. */
export type LearningMode = 'read' | 'video' | 'v2u';

export interface ChoiceInteraction {
  kind: 'choice';
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Shown after a wrong answer (never punishing). */
  hint: string;
  /** WHY the right answer is right — shown once solved. */
  explanation: string;
}

export interface TypedInteraction {
  kind: 'typed';
  prompt: string;
  /** Label in front of the input, e.g. "x =" */
  inputLabel?: string;
  /** Accepted answers (compared after normalisation / numerically). */
  accept: string[];
  hint: string;
  /** Worked steps the learner can reveal after trying. */
  workedSteps: string[];
  explanation: string;
  /** Phase 56: targeted feedback for known wrong answers (what concept is missing). */
  wrongFeedback?: { answer: string; message: string }[];
}

/** Phase 56: fill the blank in a code template (programming). */
export interface CodeInteraction {
  kind: 'code';
  prompt: string;
  /** Code with exactly one "____" blank */
  template: string;
  /** Accepted fillings, compared after whitespace normalisation */
  accept: string[];
  hint: string;
  explanation: string;
  wrongFeedback?: { answer: string; message: string }[];
}

/** Phase 56: change variables, watch a known formula respond, then answer. */
export interface LabInteraction {
  kind: 'lab';
  prompt: string;
  /** Known relation computed in code (no eval) */
  formula: 'newton2';
  variables: { id: string; label: string; unit: string; min: number; max: number; step: number; initial: number }[];
  output: { label: string; unit: string };
  question: { prompt: string; choices: string[]; correctIndex: number; hint: string; explanation: string };
}

export interface OrderInteraction {
  kind: 'order';
  prompt: string;
  /** Items in the CORRECT order; the player shuffles them deterministically. */
  items: string[];
  hint: string;
  explanation: string;
}

/** For content whose answers can't be auto-checked: reveal, then self-assess honestly. */
export interface SelfCheckInteraction {
  kind: 'self';
  prompt: string;
  answer: string;
}

export type Interaction = ChoiceInteraction | TypedInteraction | OrderInteraction | SelfCheckInteraction | CodeInteraction | LabInteraction;

export type StepType = 'concept' | 'example' | 'think' | 'try' | 'challenge';

export interface InteractiveStep {
  id: string;
  type: StepType;
  title: string;
  /** Short teaching text (plain Thai). */
  body?: string;
  /** One highlighted idea to remember. */
  keyIdea?: string;
  /** Equation / code lines shown as a visual transformation. */
  visual?: { lines: string[]; caption?: string };
  interaction?: Interaction;
  /** Shown once the step is solved/revealed: the transformation, worked through. */
  afterVisual?: { lines: string[]; caption?: string };
  /** Skill this step trains (curriculum skill id). */
  skillId?: string;
}

export interface FinalCheckItem {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  skillId: string;
  /** Code shown with the question (programming) */
  code?: string;
  /** Phase 66: misconception behind a wrong choice, from the lesson's own mistakes */
  misconceptions?: { choice: number; mistake: string; fix: string }[];
}

export interface InteractiveLesson {
  lessonId: string;
  /** V2U original content this is built from (traceability). */
  contentId: string;
  source: 'authored' | 'generated';
  mission: { title: string; goal: string };
  steps: InteractiveStep[];
  finalCheck: FinalCheckItem[];
  /** Common mistakes (from the original) — used for "ควรทบทวน". */
  mistakes: string[];
  nextLessonId?: string;
  /** Phase 56: how the lesson is framed — chosen per subject, not one pattern for all */
  theme?:
    | { kind: 'mission'; title: string; lockLabel: string; unlockLabel: string }
    | { kind: 'battle'; enemy: string; hp: number }
    | { kind: 'lab'; title: string };
}

/* ── Learner state (pure, serialisable) ───────────────────────────────── */

export interface StepResult {
  attempts: number;
  solved: boolean;
  hintShown: boolean;
  /** Learner revealed the worked answer instead of solving. */
  revealed: boolean;
}

export interface PlayerState {
  stepIndex: number;
  results: Record<string, StepResult>;
  /** Final check answers: item id → chosen index */
  finalAnswers: Record<string, number>;
  finished: boolean;
}

export interface UnderstandingSummary {
  /** % correct in the final check */
  score: number;
  /** Skill titles answered correctly (and not only via reveal) */
  understood: string[];
  /** Skill titles with a wrong final-check answer */
  confused: string[];
  /** What to review: confused skills + matching common mistakes */
  review: string[];
  /** Learning outcomes the learner demonstrated */
  canDo: string[];
  /** Phase 61: practice evidence — interactive steps solved vs only revealed */
  practice: { total: number; solved: number; revealed: number };
}
