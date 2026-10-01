import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, UnclearTopic, StudySession, WeeklyGoal, LearningSession, Resource } from '../types';
import { initialLessons, initialSessions, initialWeeklyGoal, createInitialSessions } from '../data/initialData';

export function computeSessionElapsedSeconds(session: LearningSession): number {
  if (session.status === 'completed' || session.status === 'abandoned') {
    return session.actualSeconds;
  }
  if (session.status === 'paused') {
    return session.accumulatedSeconds;
  }
  // status === 'active'
  const activeStart = new Date(session.resumedAt || session.startedAt).getTime();
  const now = Date.now();
  const deltaSeconds = Math.max(0, Math.floor((now - activeStart) / 1000));
  return session.accumulatedSeconds + deltaSeconds;
}

interface StoreState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  lessons: Lesson[];
  unclearTopics: UnclearTopic[];
  sessions: StudySession[];
  weeklyGoal: WeeklyGoal;
  
  // Learning Session Engine State
  activeLearningSession: LearningSession | null;
  learningSessionsHistory: LearningSession[];
  
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

  // Learning Session Engine Actions
  startLearningSession: (params: {
    lessonId: string;
    plannedSessionId?: string;
    source?: Resource;
  }) => LearningSession;
  pauseLearningSession: () => void;
  resumeLearningSession: () => void;
  updateLearningSessionDraft: (draft: Partial<NonNullable<LearningSession['notesDraft']>>) => void;
  finishLearningSession: (actualStudyMinutes?: number, quizScore?: number) => void;
  abandonLearningSession: () => void;
  recoverLearningSession: (confirmedMinutes?: number) => void;
  heartbeatLearningSession: () => void;

  // Import / Export / Reset
  importData: (data: {
    lessons: Lesson[];
    unclearTopics: UnclearTopic[];
    sessions?: StudySession[];
    weeklyGoal?: WeeklyGoal;
    learningSessionsHistory?: LearningSession[];
  }) => void;
  resetToInitial: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      lessons: initialLessons,
      unclearTopics: [],
      sessions: initialSessions,
      weeklyGoal: initialWeeklyGoal,
      activeLearningSession: null,
      learningSessionsHistory: [],

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

      // Learning Session Engine Actions
      startLearningSession: ({ lessonId, plannedSessionId, source }) => {
        const now = new Date().toISOString();
        const newSession: LearningSession = {
          sessionId: uuidv4(),
          plannedSessionId,
          lessonId,
          startedAt: now,
          accumulatedSeconds: 0,
          actualSeconds: 0,
          source,
          status: 'active',
          lastHeartbeatAt: now,
        };

        // Also mark lesson as IN PROGRESS
        set((state) => ({
          activeLearningSession: newSession,
          lessons: state.lessons.map((l) =>
            l.id === lessonId ? { ...l, status: 'IN PROGRESS' } : l
          ),
          sessions: plannedSessionId
            ? (state.sessions || []).map((s) =>
                s.id === plannedSessionId ? { ...s, status: 'in_progress' } : s
              )
            : state.sessions,
        }));

        return newSession;
      },

      pauseLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'active') return;

        const now = new Date().toISOString();
        const activeStart = new Date(current.resumedAt || current.startedAt).getTime();
        const deltaSeconds = Math.max(0, Math.floor((Date.now() - activeStart) / 1000));
        const accumulated = current.accumulatedSeconds + deltaSeconds;

        const updated: LearningSession = {
          ...current,
          status: 'paused',
          pausedAt: now,
          accumulatedSeconds: accumulated,
          actualSeconds: accumulated,
          lastHeartbeatAt: now,
        };

        set({ activeLearningSession: updated });
      },

      resumeLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'paused') return;

        const now = new Date().toISOString();
        const updated: LearningSession = {
          ...current,
          status: 'active',
          resumedAt: now,
          pausedAt: undefined,
          lastHeartbeatAt: now,
        };

        set({ activeLearningSession: updated });
      },

      updateLearningSessionDraft: (draft) => {
        const current = get().activeLearningSession;
        if (!current) return;

        set({
          activeLearningSession: {
            ...current,
            notesDraft: { ...(current.notesDraft || {}), ...draft },
            lastHeartbeatAt: new Date().toISOString(),
          },
        });
      },

      finishLearningSession: (actualStudyMinutes, quizScore) => {
        const current = get().activeLearningSession;
        if (!current) return;

        const now = new Date().toISOString();
        const finalSeconds = computeSessionElapsedSeconds(current);
        const calculatedMinutes = actualStudyMinutes ?? Math.max(1, Math.round(finalSeconds / 60));

        const completedSession: LearningSession = {
          ...current,
          status: 'completed',
          completedAt: now,
          actualSeconds: finalSeconds,
          lastHeartbeatAt: now,
        };

        // Update the lesson
        set((state) => ({
          activeLearningSession: null,
          learningSessionsHistory: [completedSession, ...(state.learningSessionsHistory || [])],
          lessons: state.lessons.map((l) => {
            if (l.id === current.lessonId) {
              return {
                ...l,
                status: 'COMPLETED',
                completedAt: now,
                actualStudyMinutes: calculatedMinutes,
                quizScore: quizScore ?? l.quizScore,
                learnedNotes: current.notesDraft?.learnedNotes ?? l.learnedNotes,
                stillUnclearNotes: current.notesDraft?.stillUnclearNotes ?? l.stillUnclearNotes,
                reviewNotes: current.notesDraft?.reviewNotes ?? l.reviewNotes,
              };
            }
            return l;
          }),
          // Also complete planner session if linked
          sessions: current.plannedSessionId
            ? (state.sessions || []).map((s) =>
                s.id === current.plannedSessionId
                  ? {
                      ...s,
                      status: 'completed',
                      actualMinutes: calculatedMinutes,
                      completedAt: now,
                    }
                  : s
              )
            : state.sessions,
        }));
      },

      abandonLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current) return;

        const abandoned: LearningSession = {
          ...current,
          status: 'abandoned',
          lastHeartbeatAt: new Date().toISOString(),
        };

        set((state) => ({
          activeLearningSession: null,
          learningSessionsHistory: [abandoned, ...(state.learningSessionsHistory || [])],
        }));
      },

      recoverLearningSession: (confirmedMinutes) => {
        const current = get().activeLearningSession;
        if (!current) return;

        if (confirmedMinutes !== undefined) {
          // User confirmed session is finished with specified minutes
          get().finishLearningSession(confirmedMinutes);
        } else {
          // User chooses to continue learning
          const now = new Date().toISOString();
          set({
            activeLearningSession: {
              ...current,
              status: 'active',
              resumedAt: now,
              pausedAt: undefined,
              lastHeartbeatAt: now,
            },
          });
        }
      },

      heartbeatLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'active') return;

        set({
          activeLearningSession: {
            ...current,
            actualSeconds: computeSessionElapsedSeconds(current),
            lastHeartbeatAt: new Date().toISOString(),
          },
        });
      },

      // Backward compatible import
      importData: (data) =>
        set({
          lessons: data.lessons || [],
          unclearTopics: data.unclearTopics || [],
          sessions: data.sessions || initialSessions,
          weeklyGoal: data.weeklyGoal || initialWeeklyGoal,
          learningSessionsHistory: data.learningSessionsHistory || [],
        }),
      resetToInitial: () =>
        set({
          lessons: initialLessons,
          unclearTopics: [],
          sessions: createInitialSessions(),
          weeklyGoal: initialWeeklyGoal,
          activeLearningSession: null,
          learningSessionsHistory: [],
        }),
    }),
    {
      name: 'engineering-study-hub-storage',
    }
  )
);
