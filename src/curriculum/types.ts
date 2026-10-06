/* =========================================================================
   V2U Curriculum Foundation (Phase 42A) — data model
   -------------------------------------------------------------------------
   Goal → Pathway (University / Major) → Requirements → Subject → Topic
        → Lesson → Skill → Exercise / Quiz → Readiness

   The curriculum is static, versioned reference data. It is NOT persisted in
   the user store; user progress stays on the existing store `Lesson` records.
   A curriculum lesson links to a trackable study lesson via `studyLessonTitle`
   so the existing Core Learning Loop (Study Room, quiz, review) keeps working.
   ========================================================================= */

import type { SubjectId } from '../types';

export type CurriculumSubjectId = Extract<SubjectId, 'math' | 'programming' | 'physics' | 'web'>;

export type CurriculumLevel = 'foundation' | 'core' | 'advanced';

export interface CurriculumPathway {
  id: string;
  /** e.g. "วิศวกรรมคอมพิวเตอร์" */
  title: string;
  description: string;
  requirements: PathwayRequirement[];
}

export interface PathwayRequirement {
  subjectId: CurriculumSubjectId;
  /** Admission exam(s) this subject prepares for, e.g. "A-Level คณิตศาสตร์ประยุกต์ 1" */
  exams: string[];
  /** Readiness % (0–100) the student should reach before applying. */
  targetReadinessPercent: number;
  why: string;
}

export interface CurriculumSubject {
  id: CurriculumSubjectId;
  title: string;
  description: string;
  topicIds: string[];
}

export interface CurriculumTopic {
  id: string;
  subjectId: CurriculumSubjectId;
  title: string;
  description: string;
  /** Ordered lesson sequence inside the topic. */
  lessonIds: string[];
}

export interface CurriculumLesson {
  id: string;
  subjectId: CurriculumSubjectId;
  topicId: string;
  title: string;
  description: string;
  level: CurriculumLevel;
  estimatedMinutes: number;
  /** Curriculum lesson ids that should be learned first. */
  prerequisites: string[];
  learningOutcomes: string[];
  skillIds: string[];
  exerciseIds: string[];
  quizIds: string[];
  /** Ids in the Resource Registry (src/resources/registry.ts). */
  resourceIds: string[];
  /** Title of the trackable store lesson (existing study flow) that covers this lesson. */
  studyLessonTitle: string;
}

export interface CurriculumSkill {
  id: string;
  subjectId: CurriculumSubjectId;
  title: string;
  description: string;
}

export interface ExerciseItem {
  prompt: string;
  answer: string;
}

export interface CurriculumExercise {
  id: string;
  lessonId: string;
  title: string;
  skillIds: string[];
  items: ExerciseItem[];
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  skillId: string;
}

export interface CurriculumQuiz {
  id: string;
  lessonId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface Curriculum {
  version: string;
  pathway: CurriculumPathway;
  subjects: CurriculumSubject[];
  topics: CurriculumTopic[];
  lessons: CurriculumLesson[];
  skills: CurriculumSkill[];
  exercises: CurriculumExercise[];
  quizzes: CurriculumQuiz[];
}
