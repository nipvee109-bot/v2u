import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import type {
  Lesson,
  StudySession,
  LearningSession,
  ReviewItem,
  SubjectId,
  ConfidenceLevel,
  MasteryScore,
} from '../types';
import { SIX_MONTH_ROADMAP } from '../data/roadmapData';
import { computeLessonLearningRecord } from '../store/useStore';

/* =========================================================================
   Phase 17 — Smart Dashboard Deterministic Rule Engine
   
   RULE DOCUMENTATION (ไม่มีคะแนนลับ ทุกกฎตรวจสอบและทำนายผลได้ 100%):
   
   1. Recommendation Priority Order:
      Rank 1 (INCOMPLETE): บทเรียนที่ติดสถานะ 'IN PROGRESS' หรือมี LearningSession ที่ยังเรียนค้างอยู่
      Rank 2 (TODAY_PLANNED): เซสชันใน Planner ที่กำหนดไว้ในวันนี้ (date === today) และยังไม่ได้ทำ (status === 'planned')
      Rank 3 (NEXT_ROADMAP): บทเรียนแรกที่มีสถานะ 'NOT STARTED' ในเดือนปัจจุบันของ Roadmap (Month 1 -> Month 6)
      Rank 4 (FALLBACK): บทเรียนแรกสุดในระบบที่ยังไม่เสร็จ
      
   2. Current Active Roadmap Month Rule:
      - ตรวจสอบเดือน 1 ถึง 6
      - เดือนปัจจุบัน คือ เดือนแรกสุดที่มีบทเรียนค้างอยู่ (ยังไม่ 'COMPLETED')
      - หากเรียนจบครบทุกเดือน จะเป็นเดือนที่ 6 (สถานะ Completed)
      
   3. Overdue & Urgent Action Rule:
      - มี Session ที่วันที่ < today และสถานะยังเป็น 'planned'
      - หรือมี Spaced Review ที่ status === 'overdue' หรือ nextReviewAt < today
      
   4. Onboarding Trigger Rule:
      - ผู้ใช้ยังไม่มีบทเรียนที่ COMPLETED (0)
      - และไม่มี sessions ที่บันทึกไว้ (0)
      - และไม่มีประวัติ learning sessions (0)
   ========================================================================= */

export type RecommendationSourceRule =
  | 'incomplete_lesson'
  | 'today_planned_session'
  | 'next_roadmap_item'
  | 'fallback_lesson';

export interface SmartRecommendation {
  lesson: Lesson;
  rule: RecommendationSourceRule;
  reasonTitle: string;
  reasonDescription: string;
  badgeLabel: string;
  badgeColor: string;
  plannedSession?: StudySession;
  activeLearningSession?: LearningSession;
}

export interface RoadmapStatusSummary {
  currentMonth: number;
  monthTitle: string;
  monthSubtitle: string;
  targetHours: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  isAllCompleted: boolean;
  activeMilestones: {
    id: string;
    title: string;
    description: string;
    subjectId: SubjectId;
    isCompleted: boolean;
    progressPercent: number;
  }[];
}

export interface DashboardWeeklySummary {
  studyHours: number;
  studyMinutes: number;
  sessionsCount: number;
  completedLessonsCount: number;
  quizAttemptsCount: number;
  averageQuizScore?: number;
  reviewsCompletedCount: number;
  reviewsOverdueCount: number;
  targetWeeklyHours: number;
  weeklyProgressPercent: number;
}

export interface RecentMemoryTakeaway {
  lessonId: string;
  lessonTitle: string;
  subjectId: SubjectId;
  completedAt?: string;
  learnedNotes: string;
  stillUnclearNotes?: string;
  quizScore?: number;
  confidence?: ConfidenceLevel;
  masteryScore: MasteryScore;
}

/**
 * Deterministic picker for what the user should learn next.
 */
export function getSmartDashboardRecommendation(params: {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  referenceDate?: Date;
}): SmartRecommendation | null {
  const {
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    referenceDate = new Date(),
  } = params;

  if (lessons.length === 0) return null;

  const todayStr = format(referenceDate, 'yyyy-MM-dd');

  // Rule 1: Check for IN PROGRESS lessons (Incomplete work)
  const inProgressLessons = lessons.filter((l) => l.status === 'IN PROGRESS');
  if (inProgressLessons.length > 0) {
    // Pick the one with the most recent learning session or the first one
    const targetLesson = inProgressLessons[0];
    const activeLs = learningSessionsHistory.find(
      (ls) => ls.lessonId === targetLesson.id && (ls.status === 'active' || ls.status === 'paused')
    );

    return {
      lesson: targetLesson,
      rule: 'incomplete_lesson',
      reasonTitle: 'กำลังเรียนค้างอยู่ (Incomplete Lesson)',
      reasonDescription: 'คุณเริ่มเรียนบทนี้ไว้แล้วแต่ยังไม่จบ ทำต่อให้สำเร็จเพื่ออัปเดตความรู้',
      badgeLabel: 'เรียนต่อจากเดิม',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      activeLearningSession: activeLs,
    };
  }

  // Rule 2: Check for Today's Scheduled Sessions in Planner
  const todayPlanned = sessions
    .filter((s) => s.date === todayStr && s.status === 'planned')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  if (todayPlanned.length > 0) {
    const nextSession = todayPlanned[0];
    // Find matching lesson if linked, or matching subject
    let matchedLesson = nextSession.lessonId
      ? lessons.find((l) => l.id === nextSession.lessonId)
      : null;

    if (!matchedLesson) {
      // Find first incomplete lesson in that subject
      matchedLesson =
        lessons.find(
          (l) => l.subjectId === nextSession.subjectId && l.status !== 'COMPLETED'
        ) || lessons.find((l) => l.subjectId === nextSession.subjectId) || lessons[0];
    }

    if (matchedLesson) {
      return {
        lesson: matchedLesson,
        rule: 'today_planned_session',
        reasonTitle: 'ตามตารางเรียนที่วางไว้ (Today\'s Schedule)',
        reasonDescription: `ถึงเวลาเรียน ${nextSession.title} ตามตารางเวลา ${nextSession.startTime} - ${nextSession.endTime}`,
        badgeLabel: 'ตามแผนวันนี้',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        plannedSession: nextSession,
      };
    }
  }

  // Rule 3: Check Next Roadmap Item (Earliest incomplete in active month)
  const roadmapStatus = getDashboardRoadmapStatus({ lessons });
  const activeMonthLessons = lessons.filter((l) => l.month === roadmapStatus.currentMonth);
  const nextNotStartedInMonth = activeMonthLessons.find((l) => l.status === 'NOT STARTED');

  if (nextNotStartedInMonth) {
    return {
      lesson: nextNotStartedInMonth,
      rule: 'next_roadmap_item',
      reasonTitle: `บทถัดไปตาม Roadmap เดือนที่ ${roadmapStatus.currentMonth}`,
      reasonDescription: `ก้าวสำคัญสู่เป้าหมาย 6 เดือน: ${roadmapStatus.monthTitle}`,
      badgeLabel: 'Roadmap ถัดไป',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }

  // Rule 4: Fallback to earliest incomplete lesson across all months
  const anyIncomplete = lessons.find((l) => l.status !== 'COMPLETED');
  if (anyIncomplete) {
    return {
      lesson: anyIncomplete,
      rule: 'fallback_lesson',
      reasonTitle: `บทเรียนที่ค้างในเดือนที่ ${anyIncomplete.month}`,
      reasonDescription: 'เก็บบทเรียนที่ยังไม่ผ่านเพื่อเตรียมพร้อมสำหรับบทถัดไป',
      badgeLabel: 'แนะนำตามลำดับ',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  }

  // All completed: return first lesson for review
  return {
    lesson: lessons[0],
    rule: 'fallback_lesson',
    reasonTitle: 'ทบทวนเนื้อหาพื้นฐาน',
    reasonDescription: 'คุณเรียนจบครบทุกบทแล้ว แนะนำทบทวนเนื้อหาสำคัญเพื่อความชำนาญขั้นสูงสุด',
    badgeLabel: 'ทบทวนเพื่อความเชี่ยวชาญ',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
}

/**
 * Computes current active month in the 6-month roadmap deterministically.
 */
export function getDashboardRoadmapStatus(params: { lessons: Lesson[] }): RoadmapStatusSummary {
  const { lessons = [] } = params;

  let currentMonth = 1;
  for (let m = 1; m <= 6; m++) {
    const monthLessons = lessons.filter((l) => l.month === m);
    if (monthLessons.length > 0 && monthLessons.some((l) => l.status !== 'COMPLETED')) {
      currentMonth = m;
      break;
    }
    if (m === 6) {
      currentMonth = 6;
    }
  }

  const monthConfig = SIX_MONTH_ROADMAP.find((m) => m.month === currentMonth) || SIX_MONTH_ROADMAP[0];
  const activeMonthLessons = lessons.filter((l) => l.month === currentMonth);
  const completedCount = activeMonthLessons.filter((l) => l.status === 'COMPLETED').length;
  const totalCount = activeMonthLessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllCompleted = lessons.length > 0 && lessons.every((l) => l.status === 'COMPLETED');

  // Compute milestones for active month
  const activeMilestones = (monthConfig.milestones || []).map((ms) => {
    const matched = activeMonthLessons.filter((l) => {
      if (l.subjectId !== ms.subjectId) return false;
      if (!ms.lessonKeywords || ms.lessonKeywords.length === 0) return true;
      const text = `${l.title} ${l.description || ''}`.toLowerCase();
      return ms.lessonKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });

    const mTotal = matched.length > 0 ? matched.length : 1;
    const mCompleted = matched.filter((l) => l.status === 'COMPLETED').length;
    const mPercent = Math.round((mCompleted / mTotal) * 100);

    return {
      id: ms.id,
      title: ms.title,
      description: ms.description,
      subjectId: ms.subjectId,
      isCompleted: mPercent === 100,
      progressPercent: mPercent,
    };
  });

  return {
    currentMonth,
    monthTitle: monthConfig.title,
    monthSubtitle: monthConfig.subtitle,
    targetHours: monthConfig.targetHours,
    completedLessonsCount: completedCount,
    totalLessonsCount: totalCount,
    progressPercent,
    isAllCompleted,
    activeMilestones,
  };
}

/**
 * Computes deterministic weekly snapshot for the Dashboard.
 */
export function getDashboardWeeklySummary(params: {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  referenceDate?: Date;
  targetWeeklyHours?: number;
}): DashboardWeeklySummary {
  const {
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    reviewQueue = [],
    referenceDate = new Date(),
    targetWeeklyHours = 12,
  } = params;

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const interval = { start: weekStart, end: weekEnd };
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  let totalMinutes = 0;
  let sessionsCount = 0;
  const handledPlannedIds = new Set<string>();

  // A. Learning Sessions this week
  learningSessionsHistory.forEach((ls) => {
    if (ls.status === 'completed' && ls.completedAt) {
      try {
        const d = parseISO(ls.completedAt);
        if (isWithinInterval(d, interval)) {
          const mins = Math.max(1, Math.round(ls.actualSeconds / 60));
          totalMinutes += mins;
          sessionsCount += 1;
          if (ls.plannedSessionId) handledPlannedIds.add(ls.plannedSessionId);
        }
      } catch {}
    }
  });

  // B. Planner Sessions this week
  sessions.forEach((s) => {
    if (s.date >= weekStartStr && s.date <= weekEndStr && s.status === 'completed') {
      if (!handledPlannedIds.has(s.id)) {
        totalMinutes += s.actualMinutes || s.plannedMinutes || 60;
        sessionsCount += 1;
      }
    }
  });

  // C. Lessons completed this week
  const completedLessonsThisWeek = lessons.filter((l) => {
    if (l.status === 'COMPLETED' && l.completedAt) {
      try {
        return isWithinInterval(parseISO(l.completedAt), interval);
      } catch {
        return false;
      }
    }
    return false;
  });

  // D. Quizzes completed this week
  const quizScores: number[] = [];
  lessons.forEach((l) => {
    if (l.quizAttempts && l.quizAttempts.length > 0) {
      l.quizAttempts.forEach((qa) => {
        try {
          if (isWithinInterval(parseISO(qa.timestamp), interval)) {
            quizScores.push(qa.score);
          }
        } catch {}
      });
    } else if (l.status === 'COMPLETED' && l.completedAt && l.quizScore !== undefined) {
      try {
        if (isWithinInterval(parseISO(l.completedAt), interval)) {
          quizScores.push(l.quizScore);
        }
      } catch {}
    }
  });

  const averageQuizScore =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : undefined;

  // E. Spaced reviews completed this week
  const reviewsCompletedCount = reviewQueue.filter((r) => {
    if (r.status === 'completed' && r.lastReviewedAt) {
      try {
        return isWithinInterval(parseISO(r.lastReviewedAt), interval);
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  const reviewsOverdueCount = reviewQueue.filter((r) => r.status === 'overdue').length;

  const studyHours = +(totalMinutes / 60).toFixed(1);
  const targetMinutes = targetWeeklyHours * 60;
  const weeklyProgressPercent =
    targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;

  return {
    studyHours,
    studyMinutes: totalMinutes,
    sessionsCount,
    completedLessonsCount: completedLessonsThisWeek.length,
    quizAttemptsCount: quizScores.length,
    averageQuizScore,
    reviewsCompletedCount,
    reviewsOverdueCount,
    targetWeeklyHours,
    weeklyProgressPercent,
  };
}

/**
 * Returns recent learning memory entries (What I learned, confidence, mastery).
 */
export function getRecentLearningMemory(params: {
  lessons: Lesson[];
  learningSessionsHistory?: LearningSession[];
  sessions?: StudySession[];
  limit?: number;
}): RecentMemoryTakeaway[] {
  const {
    lessons = [],
    learningSessionsHistory = [],
    sessions = [],
    limit = 3,
  } = params;

  // Find lessons with notes or completed lessons
  const candidates = lessons
    .filter((l) => (l.learnedNotes && l.learnedNotes.trim().length > 0) || l.status === 'COMPLETED')
    .sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    });

  return candidates.slice(0, limit).map((l) => {
    const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
    return {
      lessonId: l.id,
      lessonTitle: l.title,
      subjectId: l.subjectId,
      completedAt: l.completedAt,
      learnedNotes: l.learnedNotes || 'ทำความเข้าใจทฤษฎีและแนวคิดหลักเรียบร้อยแล้ว',
      stillUnclearNotes: l.stillUnclearNotes,
      quizScore: l.quizScore,
      confidence: l.confidence,
      masteryScore: (record.masteryScore ?? 0) as MasteryScore,
    };
  });
}

/**
 * Determines whether user has zero study history and should see the Onboarding Guide.
 */
export function checkIsNewUserOnboarding(params: {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
}): boolean {
  const { lessons = [], sessions = [], learningSessionsHistory = [] } = params;
  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED');
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const completedHistory = learningSessionsHistory.filter((ls) => ls.status === 'completed');

  return (
    completedLessons.length === 0 &&
    completedSessions.length === 0 &&
    completedHistory.length === 0
  );
}
