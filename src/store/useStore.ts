import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, UnclearTopic, StudySession, WeeklyGoal } from '../types';
import { initialLessons, initialSessions, initialWeeklyGoal, createInitialSessions } from '../data/initialData';

interface StoreState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  lessons: Lesson[];
  unclearTopics: UnclearTopic[];
  sessions: StudySession[];
  weeklyGoal: WeeklyGoal;
  
  // Lesson actions
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  
  // Unclear Topic actions
  addUnclearTopic: (topic: UnclearTopic) => void;
  updateUnclearTopic: (id: string, topic: Partial<UnclearTopic>) => void;
  deleteUnclearTopic: (id: string) => void;
  
  // Study Planner Session actions
  addSession: (session: StudySession) => void;
  updateSession: (id: string, session: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  rescheduleSession: (id: string, newDate: string, startTime?: string, endTime?: string) => void;
  completeSession: (id: string, actualMinutes?: number) => void;
  skipSession: (id: string) => void;
  splitSession: (id: string) => void;
  setWeeklyGoal: (goal: Partial<WeeklyGoal>) => void;

  // Import / Export / Reset
  importData: (data: {
    lessons: Lesson[];
    unclearTopics: UnclearTopic[];
    sessions?: StudySession[];
    weeklyGoal?: WeeklyGoal;
  }) => void;
  resetToInitial: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      lessons: initialLessons,
      unclearTopics: [],
      sessions: initialSessions,
      weeklyGoal: initialWeeklyGoal,

      // Lesson Actions
      addLesson: (lesson) =>
        set((state) => ({ lessons: [...state.lessons, lesson] })),
      updateLesson: (id, updatedLesson) =>
        set((state) => ({
          lessons: state.lessons.map((lesson) => {
            if (lesson.id === id) {
              const merged = { ...lesson, ...updatedLesson };
              if (updatedLesson.status === 'COMPLETED' && lesson.status !== 'COMPLETED' && !merged.completedAt) {
                merged.completedAt = new Date().toISOString();
              }
              return merged;
            }
            return lesson;
          }),
        })),
      deleteLesson: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((lesson) => lesson.id !== id),
        })),

      // Unclear Topic Actions
      addUnclearTopic: (topic) => 
        set((state) => ({ unclearTopics: [...state.unclearTopics, topic] })),
      updateUnclearTopic: (id, updatedTopic) =>
        set((state) => ({
          unclearTopics: state.unclearTopics.map((topic) =>
            topic.id === id ? { ...topic, ...updatedTopic } : topic
          ),
        })),
      deleteUnclearTopic: (id) =>
        set((state) => ({
          unclearTopics: state.unclearTopics.filter((topic) => topic.id !== id),
        })),

      // Study Planner Session Actions
      addSession: (session) =>
        set((state) => ({ sessions: [...(state.sessions || []), session] })),
      updateSession: (id, updatedSession) =>
        set((state) => ({
          sessions: (state.sessions || []).map((session) =>
            session.id === id ? { ...session, ...updatedSession, updatedAt: new Date().toISOString() } : session
          ),
        })),
      deleteSession: (id) =>
        set((state) => ({
          sessions: (state.sessions || []).filter((session) => session.id !== id),
        })),
      rescheduleSession: (id, newDate, startTime, endTime) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) => {
            if (s.id !== id) return s;
            const updated: StudySession = {
              ...s,
              date: newDate,
              status: 'planned',
              updatedAt: new Date().toISOString(),
            };
            if (startTime) updated.startTime = startTime;
            if (endTime) updated.endTime = endTime;
            return updated;
          }),
        })),
      completeSession: (id, actualMinutes) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) => {
            if (s.id !== id) return s;
            const completedAt = new Date().toISOString();
            return {
              ...s,
              status: 'completed',
              actualMinutes: actualMinutes ?? s.plannedMinutes,
              completedAt,
              updatedAt: completedAt,
            };
          }),
        })),
      skipSession: (id) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) =>
            s.id === id ? { ...s, status: 'skipped', updatedAt: new Date().toISOString() } : s
          ),
        })),
      splitSession: (id) =>
        set((state) => {
          const session = (state.sessions || []).find((s) => s.id === id);
          if (!session || session.plannedMinutes <= 30) return state;

          const halfMinutes = Math.floor(session.plannedMinutes / 2);
          const [startH, startM] = session.startTime.split(':').map(Number);
          const startTotal = (startH || 0) * 60 + (startM || 0);
          const midTotal = startTotal + halfMinutes;
          const midH = Math.floor(midTotal / 60) % 24;
          const midM = midTotal % 60;
          const midTime = `${midH.toString().padStart(2, '0')}:${midM.toString().padStart(2, '0')}`;

          const part1: StudySession = {
            ...session,
            title: `${session.title} (Part 1)`,
            endTime: midTime,
            plannedMinutes: halfMinutes,
            updatedAt: new Date().toISOString(),
          };

          const part2: StudySession = {
            ...session,
            id: uuidv4(),
            title: `${session.title} (Part 2)`,
            startTime: midTime,
            endTime: session.endTime,
            plannedMinutes: session.plannedMinutes - halfMinutes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            sessions: state.sessions.map((s) => (s.id === id ? part1 : s)).concat(part2),
          };
        }),
      setWeeklyGoal: (goal) =>
        set((state) => ({
          weeklyGoal: { ...(state.weeklyGoal || initialWeeklyGoal), ...goal },
        })),

      // Backward compatible import
      importData: (data) =>
        set({
          lessons: data.lessons || [],
          unclearTopics: data.unclearTopics || [],
          sessions: data.sessions || initialSessions,
          weeklyGoal: data.weeklyGoal || initialWeeklyGoal,
        }),
      resetToInitial: () =>
        set({
          lessons: initialLessons,
          unclearTopics: [],
          sessions: createInitialSessions(),
          weeklyGoal: initialWeeklyGoal,
        }),
    }),
    {
      name: 'engineering-study-hub-storage',
    }
  )
);
