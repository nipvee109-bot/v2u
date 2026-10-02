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
   source. Every University and AdmissionPath carries a DataSource; only
   'verified' sources may drive recommendations.
   ========================================================================= */

import type { CurriculumSubjectId } from '../curriculum/types';
import type { EducationLevel } from '../route/types';

export type SourceStatus = 'unverified' | 'verified';

export interface DataSource {
  /** e.g. official admission announcement name */
  sourceName: string;
  /** Only when actually checked. */
  sourceUrl?: string;
  /** ISO date the source was read. Required when verified. */
  retrievedAt?: string;
  status: SourceStatus;
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
  source: DataSource;
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
  source: DataSource;
}

export interface AdmissionRegistry {
  exams: Exam[];
  universities: University[];
  faculties: Faculty[];
  majors: Major[];
  paths: AdmissionPath[];
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
