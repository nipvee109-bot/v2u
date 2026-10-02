/* V2U personal study notes (Phase 55) */

export type NoteType = 'understood' | 'trick' | 'unclear' | 'important' | 'note';

export interface StudyNote {
  id: string;
  /** Curriculum lesson the note was written for */
  lessonId: string;
  type: NoteType;
  text: string;
  /** Video the learner was watching (VideoItem.key), if any */
  videoKey?: string;
  /** Only set when the player actually reported the time */
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalSummary {
  lessonId: string;
  /** The learner's (possibly edited) summary text */
  text: string;
  /** true once the learner changed V2U's draft */
  edited: boolean;
  updatedAt: string;
}

export interface VideoProgress {
  state: 'not-started' | 'learning' | 'watched' | 'checked' | 'done';
  /** Self-report after watching — never proof of understanding */
  reflection?: 'not-yet' | 'somewhat' | 'understood' | 'can-teach';
  /** Phase 56: the learner chose to skip this clip (never counts as watched or understood) */
  skipped?: boolean;
  updatedAt: string;
}

/** Everything notes-related that lives in the store and in backups. */
export interface LearningNotesData {
  notes: StudyNote[];
  summaries: Record<string, PersonalSummary>;
  /** key = `${lessonId}|${videoKey}` */
  videoProgress: Record<string, VideoProgress>;
}
