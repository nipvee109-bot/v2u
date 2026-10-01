export type SubjectId = 'math' | 'programming' | 'physics' | 'tgat3' | 'ai';

export interface Resource {
  id: string;
  type: 'youtube' | 'website' | 'image' | 'document' | 'other';
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface Lesson {
  id: string;
  title: string;
  subjectId: SubjectId;
  month: number;
  week: number;
  date?: string; 
  durationHours: number;
  description?: string;
  status: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  notes: string;
  learnedNotes?: string;
  stillUnclearNotes?: string;
  reviewNotes?: string;
  completedAt?: string;
  actualStudyMinutes?: number;
  quizScore?: number;
  resources: Resource[];
  images: string[];
}

export interface UnclearTopic {
  id: string;
  topic: string;
  details: string;
  subjectId: SubjectId;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Not Understood' | 'Reviewing' | 'Understood';
  createdAt: string;
}

export interface SubjectInfo {
  id: SubjectId;
  name: string;
  color: string;
}

export const SUBJECTS: Record<SubjectId, SubjectInfo> = {
  math: { id: 'math', name: 'คณิตศาสตร์', color: 'bg-math' },
  programming: { id: 'programming', name: 'Programming / Python', color: 'bg-programming' },
  physics: { id: 'physics', name: 'ฟิสิกส์', color: 'bg-physics' },
  tgat3: { id: 'tgat3', name: 'TGAT 3', color: 'bg-tgat' },
  ai: { id: 'ai', name: 'AI / Machine Learning', color: 'bg-ai' },
};

/* ==================================================
   Study Planner & Smart Weekly Planner Models
   ================================================== */

export type StudySessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped' | 'overdue';

export type StudySessionType = 'learn' | 'review' | 'quiz' | 'practice' | 'exam';

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  plannedMinutes: number;
  actualMinutes?: number;
  lessonId?: string;
  subjectId: SubjectId;
  title: string;
  status: StudySessionStatus;
  priority: 'Low' | 'Medium' | 'High';
  type: StudySessionType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WeeklyGoal {
  targetHours: number;
  targetLessons: number;
  targetReviews: number;
}

/* ==================================================
   Six Month Roadmap Engine Models
   ================================================== */

export interface Milestone {
  id: string;
  month: number;
  title: string;
  description: string;
  targetDate?: string;
  subjectId: SubjectId;
  lessonKeywords?: string[];
}

export interface MonthRoadmapInfo {
  month: number;
  title: string;
  subtitle: string;
  description: string;
  targetHours: number;
  focusSubjects: SubjectId[];
  milestones: Milestone[];
}

/* ==================================================
   Learning Session Engine Models (Source of Truth)
   ================================================== */

export interface LearningSession {
  sessionId: string;
  plannedSessionId?: string;
  lessonId: string;
  startedAt: string; // ISO timestamp
  pausedAt?: string; // ISO timestamp
  resumedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  accumulatedSeconds: number;
  actualSeconds: number;
  source?: Resource;
  notesDraft?: {
    learnedNotes?: string;
    stillUnclearNotes?: string;
    reviewNotes?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  lastHeartbeatAt: string;
}

