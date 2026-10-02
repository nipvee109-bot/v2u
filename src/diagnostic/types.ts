/* =========================================================================
   V2U Diagnostic & Pathway (Phase 60) — domain types
   -------------------------------------------------------------------------
   Student → per-subject diagnostic → per-skill profile → gap → next step.
   Every diagnostic item measures ONE existing curriculum skill.
   ========================================================================= */

import type { CurriculumSubjectId } from '../curriculum/types';

/** basic = prerequisite-level · core = the skill as the lesson teaches it */
export type DiagnosticLevel = 'basic' | 'core';

export interface DiagnosticItem {
  id: string;
  subjectId: CurriculumSubjectId;
  /** Existing curriculum skill this item measures */
  skillId: string;
  /** Curriculum lesson that teaches the skill (first one in teaching order) */
  lessonId: string;
  level: DiagnosticLevel;
  prompt: string;
  /** Code shown above the prompt (programming), optional */
  code?: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

/** One sitting of one subject. Kept as history; the latest per subject is used. */
export interface DiagnosticAttempt {
  id: string;
  subjectId: CurriculumSubjectId;
  takenAt: string;
  /** itemId → chosen index; null = "ไม่แน่ใจ / ข้าม" (not counted as wrong) */
  answers: Record<string, number | null>;
}

export interface DiagnosticData {
  attempts: DiagnosticAttempt[];
  /** Subjects the learner chose to skip for now (can come back any time) */
  skippedSubjects: CurriculumSubjectId[];
}

export const EMPTY_DIAGNOSTIC: DiagnosticData = { attempts: [], skippedSubjects: [] };

/** Learner-facing status of a skill. */
export type ProfileStatus = 'ready' | 'developing' | 'needs-review' | 'not-assessed';

export const PROFILE_STATUS_LABEL: Record<ProfileStatus, string> = {
  ready: 'พร้อม',
  developing: 'กำลังพัฒนา',
  'needs-review': 'ต้องทบทวน',
  'not-assessed': 'ยังไม่ได้วัด',
};

export interface SkillProfileEntry {
  skillId: string;
  subjectId: CurriculumSubjectId;
  title: string;
  status: ProfileStatus;
  /** Where the status came from */
  source: 'diagnostic' | 'learning' | 'none';
  /** When that evidence was produced (ISO) */
  at?: string;
  /** Diagnostic detail: correct / answered for this skill */
  correct?: number;
  answered?: number;
}

export interface SubjectProfile {
  subjectId: CurriculumSubjectId;
  title: string;
  skills: SkillProfileEntry[];
  counts: Record<ProfileStatus, number>;
  /** Overall subject status shown to the learner (never a single % score) */
  status: ProfileStatus;
  /** Latest diagnostic sitting for this subject, if any */
  lastDiagnosticAt?: string;
  skipped: boolean;
}
