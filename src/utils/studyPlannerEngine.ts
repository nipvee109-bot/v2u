import { v4 as uuidv4 } from 'uuid';
import type {
  Lesson,
  SubjectId,
  StudySession,
  LearningSession,
  ReviewItem,
  Resource,
} from '../types';
import { SUBJECTS } from '../types';
import { getDashboardRoadmapStatus } from './dashboardUtils';

/* ==================================================
   Phase 25 — Smart Study Planner Engine
   
   Generates deterministic study plans based on:
   1. Overdue review items (highest priority)
   2. Unfinished / in-progress lessons
   3. Today's planned sessions not yet started
   4. Next roadmap lesson
   5. Subject balance (least-studied subjects get priority)
   ================================================== */

export type LearningType = 'learn' | 'review' | 'practice' | 'quiz' | 'watch' | 'read';

export interface StudyPlanItem {
  id: string;
  lessonId: string;
  title: string;
  subjectId: SubjectId;
  learningType: LearningType;
  durationMinutes: number;
  reason: string;
  resource?: Resource;
  priority: number; // 1 = highest
}

export interface SmartPlanParams {
  availableMinutes: number;
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  todayStr: string;
}

export function getLearningTypes(): { value: LearningType; label: string }[] {
  return [
    { value: 'learn', label: 'เรียนใหม่' },
    { value: 'review', label: 'ทบทวน' },
    { value: 'practice', label: 'ฝึกทำ' },
    { value: 'quiz', label: 'ทดสอบ' },
    { value: 'watch', label: 'ดูวิดีโอ' },
    { value: 'read', label: 'อ่าน' },
  ];
}

/**
 * Generates a deterministic study plan based on available time and current state.
 * Priority: overdue reviews > unfinished lessons > today's plan > roadmap next > subject balance
 */
export function generateSmartStudyPlan(params: SmartPlanParams): StudyPlanItem[] {
  const {
    availableMinutes,
    lessons,
    sessions,
    learningSessionsHistory,
    reviewQueue,
    todayStr,
  } = params;

  const plan: StudyPlanItem[] = [];
  let remainingMinutes = availableMinutes;
  const usedLessonIds = new Set<string>();

  // Helper: add a plan item if there's time remaining
  const addItem = (
    lesson: Lesson,
    type: LearningType,
    minutes: number,
    reason: string,
    priority: number
  ): boolean => {
    if (remainingMinutes <= 0 || usedLessonIds.has(lesson.id)) return false;
    const duration = Math.min(minutes, remainingMinutes);
    if (duration < 10) return false; // Skip items shorter than 10 minutes

    plan.push({
      id: uuidv4(),
      lessonId: lesson.id,
      title: lesson.title,
      subjectId: lesson.subjectId,
      learningType: type,
      durationMinutes: duration,
      reason,
      resource: lesson.resources?.[0],
      priority,
    });
    remainingMinutes -= duration;
    usedLessonIds.add(lesson.id);
    return true;
  };

  // 1. Overdue review items (highest priority)
  const overdueReviews = reviewQueue.filter(
    (r) => (r.status === 'overdue' || (r.status === 'pending' && r.nextReviewAt < todayStr))
  );

  for (const review of overdueReviews) {
    if (remainingMinutes <= 0) break;
    const lesson = lessons.find((l) => l.id === review.lessonId);
    if (lesson && !usedLessonIds.has(lesson.id)) {
      addItem(lesson, 'review', 30, 'ถึงกำหนดทบทวนวันนี้ (Spaced Repetition)', 1);
    }
  }

  // 2. Due-today review items
  const dueTodayReviews = reviewQueue.filter(
    (r) => r.status === 'pending' && r.nextReviewAt.startsWith(todayStr)
  );

  for (const review of dueTodayReviews) {
    if (remainingMinutes <= 0) break;
    const lesson = lessons.find((l) => l.id === review.lessonId);
    if (lesson && !usedLessonIds.has(lesson.id)) {
      addItem(lesson, 'review', 25, 'ถึงเวลาทบทวนตาม Spaced Repetition', 2);
    }
  }

  // 3. Unfinished (IN PROGRESS) lessons
  const inProgressLessons = lessons.filter((l) => l.status === 'IN PROGRESS');
  for (const lesson of inProgressLessons) {
    if (remainingMinutes <= 0) break;
    addItem(
      lesson,
      'learn',
      Math.max(30, Math.round(lesson.durationHours * 60 * 0.5)),
      'เป็นบทที่กำลังเรียนค้างอยู่',
      3
    );
  }

  // 4. Today's planned sessions not yet started
  const todayPlanned = sessions.filter(
    (s) => s.date === todayStr && s.status === 'planned'
  );
  for (const session of todayPlanned) {
    if (remainingMinutes <= 0) break;
    const lesson = session.lessonId
      ? lessons.find((l) => l.id === session.lessonId)
      : null;
    if (lesson && !usedLessonIds.has(lesson.id)) {
      addItem(
        lesson,
        session.type === 'review' ? 'review' : 'learn',
        session.plannedMinutes || 60,
        'มีแผนเรียนในวันนี้',
        4
      );
    }
  }

  // 5. Next roadmap lesson
  if (remainingMinutes > 0) {
    const roadmapStatus = getDashboardRoadmapStatus({ lessons });
    const activeMonthLessons = lessons.filter((l) => l.month === roadmapStatus.currentMonth);
    const nextRoadmapLesson = activeMonthLessons.find(
      (l) => l.status === 'NOT STARTED' && !usedLessonIds.has(l.id)
    );
    if (nextRoadmapLesson) {
      addItem(
        nextRoadmapLesson,
        'learn',
        Math.round(nextRoadmapLesson.durationHours * 60),
        `เป็นบทถัดไปใน Roadmap เดือนที่ ${roadmapStatus.currentMonth}`,
        5
      );
    }
  }

  // 6. Subject balance — pick from least-studied subjects
  if (remainingMinutes > 0) {
    const subjectStudyTime: Record<string, number> = {};
    for (const subjectId of Object.keys(SUBJECTS)) {
      const subjectSessions = learningSessionsHistory.filter(
        (s) => {
          const lesson = lessons.find((l) => l.id === s.lessonId);
          return lesson?.subjectId === subjectId && s.status === 'completed';
        }
      );
      subjectStudyTime[subjectId] = subjectSessions.reduce(
        (acc, s) => acc + s.actualSeconds,
        0
      );
    }

    const sortedSubjects = (Object.keys(SUBJECTS) as SubjectId[]).sort(
      (a, b) => (subjectStudyTime[a] || 0) - (subjectStudyTime[b] || 0)
    );

    for (const subjectId of sortedSubjects) {
      if (remainingMinutes <= 0) break;
      const nextLesson = lessons.find(
        (l) =>
          l.subjectId === subjectId &&
          l.status === 'NOT STARTED' &&
          !usedLessonIds.has(l.id)
      );
      if (nextLesson) {
        addItem(
          nextLesson,
          'learn',
          Math.min(45, remainingMinutes),
          `เสริมวิชา${SUBJECTS[subjectId].name} (เรียนน้อยสุด)`,
          6
        );
      }
    }
  }

  return plan;
}
