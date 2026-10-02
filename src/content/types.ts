/* =========================================================================
   V2U Original Content (Phase 51) — lessons written by V2U itself
   -------------------------------------------------------------------------
   Every curriculum lesson has one original lesson, so a student always has
   something real to learn from even when no external link is checked.
   ========================================================================= */

export interface OriginalExample {
  problem: string;
  /** Worked solution, one line per step */
  steps: string[];
}

export interface OriginalTryIt {
  prompt: string;
  answer: string;
}

export interface OriginalLesson {
  contentId: string;
  /** Curriculum lesson this content teaches */
  lessonId: string;
  author: 'V2U';
  version: string;
  createdAt: string;
  updatedAt: string;
  relatedLessonIds: string[];
  relatedSkills: string[];
  /** Honest reading time for all sections */
  readingMinutes: number;
  /** 2–3 sentence summary */
  summary: string;
  keyTerms: { term: string; meaning: string }[];
  /** คืออะไร */
  what: string;
  /** ทำไมต้องรู้ */
  why: string;
  /** เข้าใจทีละขั้น */
  steps: string[];
  /** ตัวอย่าง */
  examples: OriginalExample[];
  /** จุดที่มักพลาด */
  mistakes: string[];
  /** ลองทำเอง */
  tryIt: OriginalTryIt[];
  /** เช็กความเข้าใจ */
  check: OriginalTryIt[];
  /** เรียนต่ออะไร */
  next: string;
  /* ── Phase 59 depth (see depth.ts) ── */
  /** สิ่งที่ต้องรู้ก่อน — plain words for the prerequisites */
  prereqNote?: string;
  /** อธิบายแบบง่าย — everyday picture of the idea */
  simple?: string;
  /** หลักคิด — the one way of thinking that makes the lesson work */
  principle?: string;
  /** แบบฝึก — practice on exactly what was taught */
  practice?: OriginalTryIt[];
  /** Programming: runnable code explained (does / why / what if) */
  code?: CodeExample[];
  errorExample?: { code: string; error: string; fix: string };
  /** Physics: formula, every variable with meaning and unit, and how they relate */
  formulas?: FormulaCard[];
}

export interface CodeExample {
  code: string;
  /** Exact stdout (verified by running the code in tests) */
  output: string;
  /** Input typed by the learner in this example, if any */
  stdin?: string;
  does: string;
  why: string;
  whatIf: string;
}

export interface FormulaCard {
  expr: string;
  vars: { symbol: string; meaning: string; unit: string }[];
  relation: string;
}

/** Depth layer written by V2U for an existing lesson. */
export interface LessonDepth {
  prereqNote: string;
  simple: string;
  principle: string;
  moreExamples?: OriginalExample[];
  moreMistakes?: string[];
  practice: OriginalTryIt[];
  code?: CodeExample[];
  errorExample?: { code: string; error: string; fix: string };
  formulas?: FormulaCard[];

}

export const ORIGINAL_SECTION_TITLES = {
  what: 'คืออะไร',
  why: 'ทำไมต้องรู้',
  steps: 'เข้าใจทีละขั้น',
  examples: 'ตัวอย่าง',
  mistakes: 'จุดที่มักพลาด',
  tryIt: 'ลองทำเอง',
  check: 'เช็กความเข้าใจ',
  next: 'เรียนต่ออะไร',
} as const;
