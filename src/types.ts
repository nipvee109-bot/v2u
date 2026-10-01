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
