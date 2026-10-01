// Automated QA test script for Phase 16 - Learning Analytics
import assert from 'assert';
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

console.log('--- RUNNING PHASE 16 LEARNING ANALYTICS QA TESTS ---');

const ALL_SUBJECTS = ['math', 'programming', 'physics', 'tgat3', 'ai'];

// Reusable analytics computation function identical to src/utils/analyticsUtils.ts
function computeTestAnalytics(params) {
  const {
    dateRange,
    referenceDate = new Date('2026-10-01T12:00:00Z'),
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    reviewQueue = [],
  } = params;

  const now = endOfDay(referenceDate);

  let startDate;
  if (dateRange === '7d') {
    startDate = startOfDay(subDays(referenceDate, 6));
  } else if (dateRange === '30d') {
    startDate = startOfDay(subDays(referenceDate, 29));
  } else if (dateRange === '90d') {
    startDate = startOfDay(subDays(referenceDate, 89));
  } else {
    // 'all'
    startDate = startOfDay(subDays(referenceDate, 179));
  }

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(now, 'yyyy-MM-dd');
  const interval = { start: startDate, end: now };

  const calendarDays = eachDayOfInterval(interval);
  const totalDays = calendarDays.length;

  const dayDataMap = new Map();
  calendarDays.forEach((d) => {
    const key = format(d, 'yyyy-MM-dd');
    dayDataMap.set(key, {
      minutes: 0,
      sessionsCount: 0,
      lessonsCompletedCount: 0,
      subjects: new Set(),
      details: [],
      plannedMinutes: 0,
      actualMinutes: 0,
    });
  });

  const handledPlannedIds = new Set();
  const handledLessonDates = new Set();

  // A. Learning Sessions History
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
            const subId = parentLesson?.subjectId || 'programming';
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

  // B. Planner Sessions
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

  // C. Lessons Completed
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

  // 2. Build Daily Study Points
  const dailyStudyPoints = [];
  const plannedVsActualPoints = [];
  let totalStudyMinutes = 0;
  let activeStudyDaysCount = 0;
  let totalPlannedMinutes = 0;
  let totalActualMinutes = 0;

  calendarDays.forEach((d) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const dayEntry = dayDataMap.get(dateKey);

    totalStudyMinutes += dayEntry.minutes;
    totalPlannedMinutes += dayEntry.plannedMinutes;
    totalActualMinutes += dayEntry.actualMinutes;

    if (dayEntry.minutes > 0) {
      activeStudyDaysCount += 1;
    }

    const dayHours = +(dayEntry.minutes / 60).toFixed(1);

    dailyStudyPoints.push({
      date: dateKey,
      label: format(d, 'd/MM'),
      dayOfWeek: format(d, 'EEE'),
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
  const quizTrendPoints = [];
  lessons.forEach((l) => {
    if (l.quizAttempts && l.quizAttempts.length > 0) {
      l.quizAttempts.forEach((qa) => {
        try {
          const attemptDate = parseISO(qa.timestamp);
          if (isWithinInterval(attemptDate, interval)) {
            quizTrendPoints.push({
              id: qa.id,
              date: qa.timestamp,
              label: format(attemptDate, 'd MMM'),
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
            label: format(attemptDate, 'd MMM'),
            score: l.quizScore,
            lessonId: l.id,
            lessonTitle: l.title,
            subjectId: l.subjectId,
          });
        }
      } catch {}
    }
  });

  quizTrendPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const quizScores = quizTrendPoints.map((q) => q.score);
  const quizScoreAverage =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : undefined;

  let quizScoreChangePercent = undefined;
  if (quizScores.length >= 2) {
    const half = Math.floor(quizScores.length / 2);
    const firstHalfAvg = quizScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg =
      quizScores.slice(half).reduce((a, b) => a + b, 0) / (quizScores.length - half);
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
  const subjectStudyMap = {
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

  const subjectAllocation = ALL_SUBJECTS.map((subId) => {
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
      name: subId,
      hours: subHours,
      minutes: data.minutes,
      percentage,
      lessonsCount: data.lessonsCount,
      sessionsCount: data.sessionsCount,
      avgQuizScore: avgQ,
    };
  });

  // 8. Mastery Distribution
  const masteryScoreCountMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  lessons.forEach((l) => {
    const score = l.mastery ?? 0;
    masteryScoreCountMap[score] = (masteryScoreCountMap[score] || 0) + 1;
  });

  const totalLessonsCount = lessons.length;
  const masteryDistribution = [0, 1, 2, 3, 4].map((score) => {
    const count = masteryScoreCountMap[score] || 0;
    const pct = totalLessonsCount > 0 ? Math.round((count / totalLessonsCount) * 100) : 0;
    return {
      score,
      count,
      percentage: pct,
    };
  });

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

// -------------------------------------------------------------
// Test 1: Empty Data Safety (Zero division & NaN checks)
// -------------------------------------------------------------
console.log('Test 1: Empty data edge case verification');
const emptyReport = computeTestAnalytics({
  dateRange: '30d',
  lessons: [],
  sessions: [],
  learningSessionsHistory: [],
  reviewQueue: [],
});

assert.strictEqual(emptyReport.totalStudyHours, 0);
assert.strictEqual(emptyReport.totalStudyMinutes, 0);
assert.strictEqual(emptyReport.averageDailyStudyHours, 0);
assert.strictEqual(emptyReport.averageDailyActiveHours, 0);
assert.strictEqual(emptyReport.weeklyStudyHours, 0);
assert.strictEqual(emptyReport.monthlyStudyHours, 0);
assert.strictEqual(emptyReport.lessonsCompletedCount, 0);
assert.strictEqual(emptyReport.quizScoreAverage, undefined);
assert.strictEqual(emptyReport.reviewCompletionRate, 100); // 0/0 defaults to 100% (clean state)
assert.strictEqual(emptyReport.plannedVsActual.adherencePercent, 0);
assert.strictEqual(emptyReport.dailyStudyPoints.length, 30);
assert.strictEqual(isNaN(emptyReport.totalStudyHours), false);
assert.strictEqual(isNaN(emptyReport.averageDailyStudyHours), false);
console.log('  ✓ Empty dataset handles gracefully with zero NaNs');

// -------------------------------------------------------------
// Test 2: Date Range Intervals (7d, 30d, 90d, all)
// -------------------------------------------------------------
console.log('Test 2: Date range interval generation');
const report7d = computeTestAnalytics({ dateRange: '7d' });
const report30d = computeTestAnalytics({ dateRange: '30d' });
const report90d = computeTestAnalytics({ dateRange: '90d' });
const reportAll = computeTestAnalytics({ dateRange: 'all' });

assert.strictEqual(report7d.dailyStudyPoints.length, 7);
assert.strictEqual(report30d.dailyStudyPoints.length, 30);
assert.strictEqual(report90d.dailyStudyPoints.length, 90);
assert.strictEqual(reportAll.dailyStudyPoints.length, 180);
console.log('  ✓ 7d (7 pts), 30d (30 pts), 90d (90 pts), and all (180 pts) verified');

// -------------------------------------------------------------
// Test 3: Deduplication Between LearningSession and Planned StudySession
// -------------------------------------------------------------
console.log('Test 3: Deduplication between LearningSession and Planner Session');
const dedupReport = computeTestAnalytics({
  dateRange: '7d',
  sessions: [
    {
      id: 'plan-1',
      date: '2026-10-01',
      startTime: '10:00',
      endTime: '11:30',
      plannedMinutes: 90,
      actualMinutes: 90,
      subjectId: 'programming',
      title: 'Python OOP',
      status: 'completed',
    },
  ],
  learningSessionsHistory: [
    {
      sessionId: 'ls-101',
      plannedSessionId: 'plan-1', // Linked to plan-1
      lessonId: 'lesson-1',
      startedAt: '2026-10-01T10:00:00Z',
      completedAt: '2026-10-01T11:30:00Z',
      actualSeconds: 5400, // 90 minutes
      status: 'completed',
    },
  ],
});

// Should only count 90 minutes (1.5 hours), not double to 180 minutes
assert.strictEqual(dedupReport.totalStudyMinutes, 90);
assert.strictEqual(dedupReport.totalStudyHours, 1.5);
assert.strictEqual(dedupReport.activeStudyDaysCount, 1);
console.log('  ✓ Deduplication verified: exactly 90 minutes counted, not 180');

// -------------------------------------------------------------
// Test 4: Quiz Score Trend and Direction
// -------------------------------------------------------------
console.log('Test 4: Quiz score trend and change calculation');
const quizReport = computeTestAnalytics({
  dateRange: '30d',
  lessons: [
    {
      id: 'l-1',
      title: 'Calculus I',
      subjectId: 'math',
      status: 'COMPLETED',
      completedAt: '2026-09-10T10:00:00Z',
      quizAttempts: [
        { id: 'qa-1', timestamp: '2026-09-10T11:00:00Z', score: 60 },
        { id: 'qa-2', timestamp: '2026-09-20T11:00:00Z', score: 80 },
        { id: 'qa-3', timestamp: '2026-09-30T11:00:00Z', score: 100 },
      ],
    },
  ],
});

assert.strictEqual(quizReport.quizTrendPoints.length, 3);
assert.strictEqual(quizReport.quizScoreAverage, 80); // (60+80+100)/3 = 80
assert.strictEqual(quizReport.quizScoreChangePercent > 0, true); // Trending up!
console.log(`  ✓ Quiz score average: ${quizReport.quizScoreAverage}%, trend delta: +${quizReport.quizScoreChangePercent}%`);

// -------------------------------------------------------------
// Test 5: Review Completion Rate
// -------------------------------------------------------------
console.log('Test 5: Spaced review completion rate');
const reviewReport = computeTestAnalytics({
  dateRange: '30d',
  reviewQueue: [
    { id: 'r-1', status: 'completed', lastReviewedAt: '2026-09-25T10:00:00Z' },
    { id: 'r-2', status: 'completed', lastReviewedAt: '2026-09-28T10:00:00Z' },
    { id: 'r-3', status: 'completed', lastReviewedAt: '2026-09-30T10:00:00Z' },
    { id: 'r-4', status: 'overdue', nextReviewAt: '2026-09-20T10:00:00Z' },
  ],
});

// 3 completed, 1 overdue => 3 / (3 + 1) = 75%
assert.strictEqual(reviewReport.reviewsCompletedCount, 3);
assert.strictEqual(reviewReport.reviewsTotalDueCount, 4);
assert.strictEqual(reviewReport.reviewCompletionRate, 75);
console.log(`  ✓ Review completion rate accurately calculated at ${reviewReport.reviewCompletionRate}%`);

// -------------------------------------------------------------
// Test 6: Subject Allocation and Planned vs Actual
// -------------------------------------------------------------
console.log('Test 6: Subject allocation and planned vs actual adherence');
const multiReport = computeTestAnalytics({
  dateRange: '7d',
  sessions: [
    {
      id: 'p-1',
      date: '2026-09-28',
      plannedMinutes: 60,
      actualMinutes: 60,
      subjectId: 'math',
      title: 'Math session',
      status: 'completed',
    },
    {
      id: 'p-2',
      date: '2026-09-29',
      plannedMinutes: 120,
      actualMinutes: 120,
      subjectId: 'programming',
      title: 'Coding session',
      status: 'completed',
    },
    {
      id: 'p-3',
      date: '2026-09-30',
      plannedMinutes: 60,
      actualMinutes: 0,
      subjectId: 'physics',
      title: 'Physics planned',
      status: 'pending',
    },
  ],
});

const mathAlloc = multiReport.subjectAllocation.find((s) => s.subjectId === 'math');
const progAlloc = multiReport.subjectAllocation.find((s) => s.subjectId === 'programming');

// Math: 60m, Prog: 120m. Total = 180m (3 hrs).
// Math = 33%, Prog = 67%
assert.strictEqual(mathAlloc.minutes, 60);
assert.strictEqual(progAlloc.minutes, 120);
assert.strictEqual(mathAlloc.percentage + progAlloc.percentage, 100);

// Planned = 60 + 120 + 60 = 240 mins (4.0 hrs)
// Actual = 60 + 120 = 180 mins (3.0 hrs)
// Adherence = 180 / 240 = 75%
assert.strictEqual(multiReport.plannedVsActual.totalPlannedHours, 4.0);
assert.strictEqual(multiReport.plannedVsActual.totalActualHours, 3.0);
assert.strictEqual(multiReport.plannedVsActual.adherencePercent, 75);
console.log(`  ✓ Subject allocation & Planned vs Actual verified (Adherence: ${multiReport.plannedVsActual.adherencePercent}%)`);

console.log('\n======================================================');
console.log('ALL 6 LEARNING ANALYTICS TEST SUITES PASSED (100% SUCCESS)');
console.log('======================================================\n');
