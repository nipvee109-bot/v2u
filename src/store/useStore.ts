import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lesson, UnclearTopic } from '../types';
import { initialLessons } from '../data/initialData';

interface StoreState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  lessons: Lesson[];
  unclearTopics: UnclearTopic[];
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  addUnclearTopic: (topic: UnclearTopic) => void;
  updateUnclearTopic: (id: string, topic: Partial<UnclearTopic>) => void;
  deleteUnclearTopic: (id: string) => void;
  importData: (data: {lessons: Lesson[], unclearTopics: UnclearTopic[]}) => void;
  resetToInitial: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      lessons: initialLessons,
      unclearTopics: [],
      addLesson: (lesson) =>
        set((state) => ({ lessons: [...state.lessons, lesson] })),
      updateLesson: (id, updatedLesson) =>
        set((state) => ({
          lessons: state.lessons.map((lesson) => {
            if (lesson.id === id) {
              const merged = { ...lesson, ...updatedLesson };
              // Auto-set completedAt when status changes to COMPLETED
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
      importData: (data) => set({ lessons: data.lessons || [], unclearTopics: data.unclearTopics || [] }),
      resetToInitial: () => set({ lessons: initialLessons, unclearTopics: [] }),
    }),
    {
      name: 'engineering-study-hub-storage',
    }
  )
);
