import { useMemo } from 'react';
import { useStore, computeLessonLearningRecord } from '../store/useStore';
import type { LearningRecord } from '../types';

/** Per-lesson learning records from the store, for the pure V2U engines. */
export function useLearningRecords(): LearningRecord[] {
  const lessons = useStore((s) => s.lessons);
  const learningSessionsHistory = useStore((s) => s.learningSessionsHistory);
  const sessions = useStore((s) => s.sessions);
  return useMemo(
    () => lessons.map((l) => computeLessonLearningRecord(l, learningSessionsHistory ?? [], sessions ?? [])),
    [lessons, learningSessionsHistory, sessions]
  );
}
