import {
  format,
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  eachDayOfInterval,
  isWeekend,
  isToday,
} from 'date-fns';
import { th } from 'date-fns/locale';
import type {
  Lesson,
  StudySession,
  LearningSession,
  ReviewItem,
  SubjectId,
  AnalyticsDateRange,
  LearningAnalyticsReport,
  DailyStudyPoint,
  QuizTrendPoint,
  SubjectAllocationItem,
  PlannedVsActualPoint,
  MasteryDistributionStats,
  MasteryScore,
} from '../types';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import { computeLessonLearningRecord } from '../store/useStore';

export interface ComputeAnalyticsParams {
  dateRange: AnalyticsDateRange;
  referenceDate?: Date;
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
}

const ALL_SUBJECTS: SubjectId[] = ['math', 'programming', 'physics', 'tgat3', 'ai'];

export function computeLearningAnalytics(params: ComputeAnalyticsParams): LearningAnalyticsReport {
  const {
    dateRange,
    referenceDate = new Date(),
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    reviewQueue = [],
  } = params;

  const now = endOfDay(referenceDate);

  // 1. Determine start and end dates based on filter
  let startDate: Date;
  if (dateRange === '7d') {
    startDate = startOfDay(subDays(referenceDate, 6));
  } else if (dateRange === '30d') {
    startDate = startOfDay(subDays(referenceDate, 29));
  } else if (dateRange === '90d') {
    startDate = startOfDay(subDays(referenceDate, 89));
  } else {
    // 'all' - 180 days (6 months roadmap span)
    startDate = startOfDay(subDays(referenceDate, 179));
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(now, 'yyyy-MM-dd');
  const interval = { start: startDate, end: now };

  // Generate continuous daily points for the entire interval
  const calendarDays = eachDayOfInterval(interval);
  const totalDays = calendarDays.length;

  // Track daily aggregated study data
  const dayDataMap = new Map<
    string,
    {
      minutes: number;
      sessionsCount: number;
      lessonsCompletedCount: number;
      subjects: Set<SubjectId>;
      details: {
        id: string;
        title: string;
        subjectId: SubjectId;
        minutes: number;
        type: 'session' | 'lesson';
      }[];
      plannedMinutes: number;
      actualMinutes: number;
    }
  >();

  calendarDays.forEach((d) => {
    const key = format(d, 'yyyy-MM-dd');
    dayDataMap.set(key, {
      minutes: 0,
      sessionsCount: 0,
      lessonsCompletedCount: 0,
      subjects: new Set<SubjectId>(),
      details: [],
      plannedMinutes: 0,
      actualMinutes: 0,
    });
  });

  const handledPlannedIds = new Set<string>();
  const handledLessonDates = new Set<string>();

  // A. Aggregate Learning Sessions History
  learningSessionsHistory.forEach((ls) => {
    if (ls.status === 'completed' && ls.completedAt) {
      try {
        const completedDate = parseISO(ls.completedAt);
        if (isWithinInterval(completedDate, interval)) {
          const dateKey = format(completedDate, 'yyyy-MM-dd');
          const dayEntry = dayDataMap.get(dateKey);
          if (dayEntry) {
            const mins = Math.max(1, Math.round(ls.actualSeconds / 60));
            dayEntry.minutes += mins;
            dayEntry.actualMinutes += mins;
            dayEntry.sessionsCount += 1;

            if (ls.plannedSessionId) {
              handledPlannedIds.add(ls.plannedSessionId);
            }
            if (ls.lessonId) {
              handledLessonDates.add(`${ls.lessonId}_${dateKey}`);
            }

            const parentLesson = lessons.find((l) => l.id === ls.lessonId);
            const subId: SubjectId = parentLesson?.subjectId || 'programming';
            dayEntry.subjects.add(subId);
            dayEntry.details.push({
              id: `ls-${ls.sessionId}`,
              title: ls.source?.title || parentLesson?.title || 'เซสชันการเรียนรู้',
              subjectId: subId,
              minutes: mins,
              type: 'session',
            });
          }
        }
      } catch {}
    }
  });

  // B. Aggregate Planner Sessions
  sessions.forEach((s) => {
    if (s.date >= startDateStr && s.date <= endDateStr) {
      const dayEntry = dayDataMap.get(s.date);
      if (dayEntry) {
        dayEntry.plannedMinutes += s.plannedMinutes || 60;

        if (s.status === 'completed') {
          if (!handledPlannedIds.has(s.id)) {
            const mins = s.actualMinutes || s.plannedMinutes || 60;
            dayEntry.minutes += mins;
            dayEntry.actualMinutes += mins;
            dayEntry.sessionsCount += 1;
            dayEntry.subjects.add(s.subjectId);

            if (s.lessonId) {
              handledLessonDates.add(`${s.lessonId}_${s.date}`);
            }

            dayEntry.details.push({
              id: `s-${s.id}`,
              title: s.title,
              subjectId: s.subjectId,
              minutes: mins,
              type: 'session',
            });
          }
        }
      }
    }
  });

  // C. Aggregate Lessons Completed
  let lessonsCompletedCount = 0;
  lessons.forEach((l) => {
    if (l.status === 'COMPLETED' && l.completedAt) {
      try {
        const completedDate = parseISO(l.completedAt);
        if (isWithinInterval(completedDate, interval)) {
          lessonsCompletedCount += 1;
          const dateKey = format(completedDate, 'yyyy-MM-dd');
          const dayEntry = dayDataMap.get(dateKey);
          if (dayEntry) {
            dayEntry.lessonsCompletedCount += 1;
            dayEntry.subjects.add(l.subjectId);

            const recordKey = `${l.id}_${dateKey}`;
            if (!handledLessonDates.has(recordKey) && l.actualStudyMinutes) {
              dayEntry.minutes += l.actualStudyMinutes;
              dayEntry.actualMinutes += l.actualStudyMinutes;
              dayEntry.details.push({
                id: `l-${l.id}`,
                title: l.title,
                subjectId: l.subjectId,
                minutes: l.actualStudyMinutes,
                type: 'lesson',
              });
            }
          }
        }
      } catch {}
    }
  });

  // 2. Build Daily Study Points & Planned vs Actual Points
  const dailyStudyPoints: DailyStudyPoint[] = [];
  const plannedVsActualPoints: PlannedVsActualPoint[] = [];
  let totalStudyMinutes = 0;
  let activeStudyDaysCount = 0;
  let totalPlannedMinutes = 0;
  let totalActualMinutes = 0;

  calendarDays.forEach((d) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const dayEntry = dayDataMap.get(dateKey) || {
      minutes: 0,
      sessionsCount: 0,
      lessonsCompletedCount: 0,
      subjects: new Set<SubjectId>(),
      details: [],
      plannedMinutes: 0,
      actualMinutes: 0,
    };

    totalStudyMinutes += dayEntry.minutes;
    totalPlannedMinutes += dayEntry.plannedMinutes;
    totalActualMinutes += dayEntry.actualMinutes;

    if (dayEntry.minutes > 0) {
      activeStudyDaysCount += 1;
    }

    const dayHours = +(dayEntry.minutes / 60).toFixed(1);
    const dayLabel = format(d, 'EEE d MMM', { locale: th });
    const dayOfWeek = format(d, 'EEE', { locale: th });

    dailyStudyPoints.push({
      date: dateKey,
      label: dayLabel,
      dayOfWeek,
      hours: dayHours,
      minutes: dayEntry.minutes,
      sessionsCount: dayEntry.sessionsCount,
      lessonsCompletedCount: dayEntry.lessonsCompletedCount,
      isWeekend: isWeekend(d),
      isToday: isToday(d),
      subjectsStudied: Array.from(dayEntry.subjects),
      details: dayEntry.details,
    });

    const plannedH = +(dayEntry.plannedMinutes / 60).toFixed(1);
    const actualH = +(dayEntry.actualMinutes / 60).toFixed(1);
    const adherence =
      dayEntry.plannedMinutes > 0
        ? Math.min(100, Math.round((dayEntry.actualMinutes / dayEntry.plannedMinutes) * 100))
        : dayEntry.actualMinutes > 0
        ? 100
        : 0;

    plannedVsActualPoints.push({
      date: dateKey,
      label: format(d, 'd/MM'),
      plannedMinutes: dayEntry.plannedMinutes,
      actualMinutes: dayEntry.actualMinutes,
      plannedHours: plannedH,
      actualHours: actualH,
      adherencePercent: adherence,
    });
  });

  const totalStudyHours = +(totalStudyMinutes / 60).toFixed(1);
  const averageDailyStudyHours = totalDays > 0 ? +(totalStudyHours / totalDays).toFixed(1) : 0;
  const averageDailyActiveHours =
    activeStudyDaysCount > 0 ? +(totalStudyHours / activeStudyDaysCount).toFixed(1) : 0;

  // 3. Weekly Study & Comparison
  const last7Days = dailyStudyPoints.slice(-7);
  const weeklyStudyMinutes = last7Days.reduce((acc, p) => acc + p.minutes, 0);
  const weeklyStudyHours = +(weeklyStudyMinutes / 60).toFixed(1);

  const prev7Days = dailyStudyPoints.slice(-14, -7);
  const prevWeeklyStudyMinutes = prev7Days.reduce((acc, p) => acc + p.minutes, 0);
  const weeklyHoursChangePercent =
    prevWeeklyStudyMinutes > 0
      ? Math.round(((weeklyStudyMinutes - prevWeeklyStudyMinutes) / prevWeeklyStudyMinutes) * 100)
      : undefined;

  // 4. Monthly Study & Comparison
  const last30Days = dailyStudyPoints.slice(-30);
  const monthlyStudyMinutes = last30Days.reduce((acc, p) => acc + p.minutes, 0);
  const monthlyStudyHours = +(monthlyStudyMinutes / 60).toFixed(1);

  const prev30Days = dailyStudyPoints.slice(-60, -30);
  const prevMonthlyStudyMinutes = prev30Days.reduce((acc, p) => acc + p.minutes, 0);
  const monthlyHoursChangePercent =
    prevMonthlyStudyMinutes > 0
      ? Math.round(((monthlyStudyMinutes - prevMonthlyStudyMinutes) / prevMonthlyStudyMinutes) * 100)
      : undefined;

  // 5. Quiz Score Trend
  const quizTrendPoints: QuizTrendPoint[] = [];
  lessons.forEach((l) => {
    if (l.quizAttempts && l.quizAttempts.length > 0) {
      l.quizAttempts.forEach((qa) => {
        try {
          const attemptDate = parseISO(qa.timestamp);
          if (isWithinInterval(attemptDate, interval)) {
            quizTrendPoints.push({
              id: qa.id,
              date: qa.timestamp,
              label: format(attemptDate, 'd MMM', { locale: th }),
              score: qa.score,
              lessonId: l.id,
              lessonTitle: l.title,
              subjectId: l.subjectId,
              notes: qa.notes,
            });
          }
        } catch {}
      });
    } else if (l.status === 'COMPLETED' && l.completedAt && l.quizScore !== undefined) {
      try {
        const attemptDate = parseISO(l.completedAt);
        if (isWithinInterval(attemptDate, interval)) {
          quizTrendPoints.push({
            id: `l-quiz-${l.id}`,
            date: l.completedAt,
            label: format(attemptDate, 'd MMM', { locale: th }),
            score: l.quizScore,
            lessonId: l.id,
            lessonTitle: l.title,
            subjectId: l.subjectId,
          });
        }
      } catch {}
    }
  });

  // Sort chronological
  quizTrendPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const quizScores = quizTrendPoints.map((q) => q.score);
  const quizScoreAverage =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : undefined;

  // Compute trend delta if at least 2 attempts
  let quizScoreChangePercent: number | undefined = undefined;
  if (quizScores.length >= 2) {
    const half = Math.floor(quizScores.length / 2);
    const firstHalfAvg = quizScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = quizScores.slice(half).reduce((a, b) => a + b, 0) / (quizScores.length - half);
    quizScoreChangePercent = Math.round(secondHalfAvg - firstHalfAvg);
  }

  // 6. Review Completion Rate
  const reviewsCompletedInInterval = reviewQueue.filter((r) => {
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
  const reviewsTotalDueCount = reviewsCompletedInInterval + reviewsOverdueCount;
  const reviewCompletionRate =
    reviewsTotalDueCount > 0
      ? Math.round((reviewsCompletedInInterval / reviewsTotalDueCount) * 100)
      : 100;

  // 7. Subject Allocation Breakdown
  const subjectStudyMap: Record<
    SubjectId,
    { minutes: number; lessonsCount: number; sessionsCount: number; quizScores: number[] }
  > = {
    math: { minutes: 0, lessonsCount: 0, sessionsCount: 0, quizScores: [] },
    programming: { minutes: 0, lessonsCount: 0, sessionsCount: 0, quizScores: [] },
    physics: { minutes: 0, lessonsCount: 0, sessionsCount: 0, quizScores: [] },
    tgat3: { minutes: 0, lessonsCount: 0, sessionsCount: 0, quizScores: [] },
    ai: { minutes: 0, lessonsCount: 0, sessionsCount: 0, quizScores: [] },
  };

  dailyStudyPoints.forEach((p) => {
    p.details.forEach((item) => {
      if (subjectStudyMap[item.subjectId]) {
        subjectStudyMap[item.subjectId].minutes += item.minutes;
        if (item.type === 'session') subjectStudyMap[item.subjectId].sessionsCount += 1;
        if (item.type === 'lesson') subjectStudyMap[item.subjectId].lessonsCount += 1;
      }
    });
  });

  quizTrendPoints.forEach((q) => {
    if (subjectStudyMap[q.subjectId]) {
      subjectStudyMap[q.subjectId].quizScores.push(q.score);
    }
  });

  const subjectAllocation: SubjectAllocationItem[] = ALL_SUBJECTS.map((subId) => {
    const data = subjectStudyMap[subId];
    const subHours = +(data.minutes / 60).toFixed(1);
    const percentage =
      totalStudyMinutes > 0 ? Math.round((data.minutes / totalStudyMinutes) * 100) : 0;
    const avgQ =
      data.quizScores.length > 0
        ? Math.round(data.quizScores.reduce((a, b) => a + b, 0) / data.quizScores.length)
        : undefined;

    return {
      subjectId: subId,
      name: SUBJECTS[subId]?.name || subId,
      color: SUBJECTS[subId]?.color || 'bg-blue-500',
      hours: subHours,
      minutes: data.minutes,
      percentage,
      lessonsCount: data.lessonsCount,
      sessionsCount: data.sessionsCount,
      avgQuizScore: avgQ,
    };
  });

  // 8. Mastery Distribution
  const masteryScoreCountMap: Record<MasteryScore, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  lessons.forEach((l) => {
    const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
    const score = (record.masteryScore ?? 0) as MasteryScore;
    masteryScoreCountMap[score] = (masteryScoreCountMap[score] || 0) + 1;
  });

  const totalLessonsCount = lessons.length;
  const masteryDistribution: MasteryDistributionStats[] = ([0, 1, 2, 3, 4] as MasteryScore[]).map(
    (score) => {
      const count = masteryScoreCountMap[score] || 0;
      const pct = totalLessonsCount > 0 ? Math.round((count / totalLessonsCount) * 100) : 0;
      const info = MASTERY_SCALE[score];
      return {
        score,
        level: score === 4 ? 'Mastered' : score === 3 ? 'Proficient' : score === 2 ? 'Familiar' : 'Novice',
        title: info.title,
        count,
        percentage: pct,
        badgeClass: info.badgeClass,
        barColor: info.barColor,
      };
    }
  );

  // 9. Planned vs Actual Summary
  const totalPlannedHours = +(totalPlannedMinutes / 60).toFixed(1);
  const totalActualHours = +(totalActualMinutes / 60).toFixed(1);
  const overallAdherencePercent =
    totalPlannedMinutes > 0
      ? Math.min(100, Math.round((totalActualMinutes / totalPlannedMinutes) * 100))
      : totalActualMinutes > 0
      ? 100
      : 0;

  return {
    dateRange,
    startDate: startDateStr,
    endDate: endDateStr,
    totalDays,
    activeStudyDaysCount,
    totalStudyHours,
    totalStudyMinutes,
    averageDailyStudyHours,
    averageDailyActiveHours,
    weeklyStudyHours,
    weeklyHoursChangePercent,
    monthlyStudyHours,
    monthlyHoursChangePercent,
    lessonsCompletedCount,
    quizScoreAverage,
    quizScoreChangePercent,
    reviewCompletionRate,
    reviewsCompletedCount: reviewsCompletedInInterval,
    reviewsTotalDueCount,
    masteryDistribution,
    subjectAllocation,
    plannedVsActual: {
      totalPlannedHours,
      totalActualHours,
      adherencePercent: overallAdherencePercent,
    },
    dailyStudyPoints,
    quizTrendPoints,
    plannedVsActualPoints,
  };
}
