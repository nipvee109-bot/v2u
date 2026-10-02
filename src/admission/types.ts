/* =========================================================================
   V2U Admission Domain (Phase 46A) — provider-agnostic data model
   -------------------------------------------------------------------------
   University → Faculty → Major → AdmissionPath (round)
     → Eligibility + AdmissionRequirements
         (RequiredSubject · RequiredSkill · Exam · Portfolio · GPAX · Other)
     → ApplicationMilestones

   Plain serialisable records with string ids: no database, no ORM, no
   network. A future backend (e.g. Supabase) can map 1:1 to these shapes.

   DATA RULE: no real-world admission data is shipped until it has a cited
   official source. Universities and AdmissionPaths reference AdmissionSource
   records by id; only paths whose sources are ALL verified may drive
   personalised recommendations.
   ========================================================================= */

import type { CurriculumSubjectId } from '../curriculum/types';
import type { EducationLevel } from '../route/types';

/* ── Official sources (Phase 46B) ───────────────────────────────────── */

export type SourceType =
  | 'university-announcement'
  | 'faculty-announcement'
  | 'admission-page'
  | 'tcas-official'
  | 'exam-official';

/**
 * - unverified: recorded for staging/reference; never drives recommendations
 * - verified:   the URL was actually opened and the content checked on checkedAt
 */
export type SourceVerificationStatus = 'unverified' | 'verified';

export interface AdmissionSource {
  sourceId: string;
  sourceType: SourceType;
  /** Issuing organisation, e.g. the university or the national admission body */
  publisher: string;
  title: string;
  /** Required when verified; never invented. */
  url?: string;
  /** ISO dates from the document itself, when it states them. */
  publishedAt?: string;
  updatedAt?: string;
  /** ISO date someone actually opened and checked the source. Required when verified. */
  checkedAt?: string;
  status: SourceVerificationStatus;
  notes?: string;
}

export interface Exam {
  id: string;
  /** Official short name, e.g. as written on the admission announcement */
  code: string;
  title: string;
  /** Curriculum subjects this exam measures (for gap mapping). */
  subjectIds: CurriculumSubjectId[];
  /** Score scale maximum, when known. */
  maxScore?: number;
}

export interface University {
  id: string;
  name: string;
  nameEn?: string;
  /** AdmissionSource ids backing this record. */
  sourceIds: string[];
}

export interface Faculty {
  id: string;
  universityId: string;
  name: string;
}

export interface Major {
  id: string;
  facultyId: string;
  name: string;
  /** Link to a V2U route target (src/route/data.ts), when one exists. */
  routeTargetId?: string;
}

export type EligibilityRule =
  | { kind: 'education-level'; allowed: EducationLevel[] }
  | { kind: 'gpax-min'; min: number }
  | { kind: 'other'; description: string };

export interface RequiredSubject {
  kind: 'subject';
  subjectId: CurriculumSubjectId;
  /** Readiness (0–100) V2U treats as "ready" for this path. */
  minReadinessPercent: number;
}

export interface RequiredSkill {
  kind: 'skill';
  skillId: string;
}

export interface ExamRequirement {
  kind: 'exam';
  examId: string;
  minScore?: number;
  /** Share of the composite score, when published. */
  weightPercent?: number;
}

export interface PortfolioRequirement {
  kind: 'portfolio';
  items: string[];
}

export interface GpaxRequirement {
  kind: 'gpax';
  min: number;
}

export interface OtherRequirement {
  kind: 'other';
  description: string;
}

export type AdmissionRequirement =
  | RequiredSubject
  | RequiredSkill
  | ExamRequirement
  | PortfolioRequirement
  | GpaxRequirement
  | OtherRequirement;

export type MilestoneKind = 'registration' | 'exam' | 'portfolio-submission' | 'interview' | 'announcement' | 'confirmation';

export interface ApplicationMilestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  /** ISO date (YYYY-MM-DD) when published. */
  date?: string;
  dateStatus: 'confirmed' | 'tentative' | 'unknown';
}

export interface AdmissionPath {
  id: string;
  majorId: string;
  /** e.g. TCAS round number; kept generic. */
  round: number;
  name: string;
  /** Academic/admission year the data applies to, e.g. "2570" */
  admissionYear: string;
  quota?: number;
  eligibility: EligibilityRule[];
  requirements: AdmissionRequirement[];
  milestones: ApplicationMilestone[];
  /** AdmissionSource ids; the path is verified only if all are verified. */
  sourceIds: string[];
}

export interface AdmissionRegistry {
  sources: AdmissionSource[];
  exams: Exam[];
  universities: University[];
  faculties: Faculty[];
  majors: Major[];
  paths: AdmissionPath[];
}

/* ── Student-entered admission facts (Phase 46C) ─────────────────────── */

/** A student's own answer for one checklist item. Absent key = ยังไม่ทราบ. */
export type ChecklistAnswer = 'met' | 'gap';

/**
 * What the student has told V2U. Nothing here is inferred: a value that was
 * never entered stays absent/null and evaluates as "unknown".
 */
export interface StudentAdmissionInputs {
  /** 0.00–4.00, or null when not entered */
  gpax: number | null;
  /** examId → score (only for exams in verified admission data) */
  examScores: Record<string, number>;
  /** `${requirementId}::${item}` → answer */
  checklist: Record<string, ChecklistAnswer>;
}

/* ── Evaluation results ─────────────────────────────────────────────── */

export interface StudentAdmissionState {
  educationLevel: EducationLevel;
  /** Subject readiness 0–100 (e.g. from the Skill Gap engine). */
  subjectReadiness: Partial<Record<CurriculumSubjectId, number>>;
  /** Skill ids the student has proven (status 'ready'). */
  readySkillIds: string[];
  /** Optional facts the student may enter later. */
  gpax?: number;
  examScores?: Record<string, number>;
  completedPortfolioItems?: string[];
}

export type RequirementCheck = 'met' | 'gap' | 'unknown';

export interface RequirementEvaluation {
  requirement: AdmissionRequirement;
  check: RequirementCheck;
  /** Plain-Thai explanation */
  detail: string;
}

export interface AdmissionPathEvaluation {
  pathId: string;
  eligible: boolean | 'unknown';
  eligibilityNotes: string[];
  requirements: RequirementEvaluation[];
  metCount: number;
  gapCount: number;
  unknownCount: number;
  /** Data must be verified before V2U recommends this path. */
  recommendable: boolean;
}
