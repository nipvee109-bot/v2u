import type { Course, CourseModule, CourseItem } from '../types';

export interface CourseProgressStats {
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  totalMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  isCompleted: boolean;
}

/**
 * Computes exact aggregate progress stats for a Course
 */
export function computeCourseProgress(course: Course): CourseProgressStats {
  let totalItems = 0;
  let completedItems = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;

  if (course && Array.isArray(course.modules)) {
    for (const mod of course.modules) {
      if (Array.isArray(mod.items)) {
        for (const item of mod.items) {
          totalItems++;
          const duration = Number(item.durationMinutes) || 0;
          totalMinutes += duration;
          if (item.completed) {
            completedItems++;
            completedMinutes += duration;
          }
        }
      }
    }
  }

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  return {
    totalItems,
    completedItems,
    progressPercent,
    totalMinutes,
    completedMinutes,
    remainingMinutes,
    isCompleted,
  };
}

/**
 * Generates an initial Course structure from a YouTube playlist or outline
 */
export function buildCourseFromOutline(params: {
  id?: string;
  title: string;
  description: string;
  provider: string;
  subjectId: Course['subjectId'];
  sourceUrl?: string;
  modules: {
    title: string;
    items: {
      title: string;
      durationMinutes?: number;
      sourceUrl?: string;
      lessonId?: string;
    }[];
  }[];
}): Course {
  const courseId = params.id || `course-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedModules: CourseModule[] = params.modules.map((m, mIdx) => {
    const moduleId = `mod-${courseId}-${mIdx + 1}`;
    const items: CourseItem[] = m.items.map((it, itIdx) => ({
      id: `item-${courseId}-${mIdx + 1}-${itIdx + 1}`,
      title: it.title,
      durationMinutes: it.durationMinutes || 45,
      sourceUrl: it.sourceUrl,
      lessonId: it.lessonId,
      completed: false,
      order: itIdx + 1,
    }));

    return {
      id: moduleId,
      title: m.title,
      order: mIdx + 1,
      items,
    };
  });

  return {
    id: courseId,
    title: params.title,
    description: params.description,
    provider: params.provider || 'Self-Paced',
    subjectId: params.subjectId,
    sourceUrl: params.sourceUrl,
    modules: formattedModules,
    createdAt: now,
    updatedAt: now,
  };
}
