import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
  isWithinInterval,
  isBefore,
  getWeek,
} from 'date-fns';
import type {
  Lesson,
  StudySession,
  LearningSession,
  ReviewItem,
  UnclearTopic,
  StudyGoal,
  WeeklyGoal,
  SubjectId,
  WeeklyReviewReport,
  WeeklySubjectSummary,
  WeeklyReviewSummary,
  WeeklyMemoryItem,
  WeeklyStudiedItem,
  Milestone,
} from '../types';
import { SIX_MONTH_ROADMAP } from '../data/roadmapData';

export interface ComputeWeeklyReviewParams {
  targetDate?: Date | string;
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  unclearTopics: UnclearTopic[];
  goals: StudyGoal[];
  weeklyGoal?: WeeklyGoal;
}

const ALL_SUBJECTS: SubjectId[] = ['math', 'programming', 'physics', 'tgat3', 'ai'];

export function computeWeeklyReview(params: ComputeWeeklyReviewParams): WeeklyReviewReport {
  const {
    targetDate = new Date(),
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    reviewQueue = [],
    unclearTopics = [],
    goals = [],
    weeklyGoal,
  } = params;

  const currentWeekDate = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekEnd, 7);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });

  // 1. Calculate Studied Items and Study Time
  const studiedItems: WeeklyStudiedItem[] = [];
  const handledPlannedSessionIds = new Set<string>();
  const handledLessonIds = new Set<string>();

  let totalStudyMinutes = 0;
  let totalSessionsCount = 0;

  // A. Completed Learning Sessions from history
  learningSessionsHistory.forEach((ls) => {
    if (ls.status === 'completed' && ls.completedAt) {
      try {
        const completedDate = parseISO(ls.completedAt);
        if (isWithinInterval(completedDate, { start: weekStart, end: weekEnd })) {
          const mins = Math.max(1, Math.round(ls.actualSeconds / 60));
          totalStudyMinutes += mins;
          totalSessionsCount += 1;

          if (ls.plannedSessionId) {
            handledPlannedSessionIds.add(ls.plannedSessionId);
          }
          if (ls.lessonId) {
            handledLessonIds.add(ls.lessonId);
          }

          const lesson = lessons.find((l) => l.id === ls.lessonId);
          studiedItems.push({
            id: `ls-${ls.sessionId}`,
            title: ls.source?.title || lesson?.title || 'เซสชันการเรียนรู้',
            subjectId: lesson?.subjectId || 'programming',
            date: ls.completedAt,
            durationMinutes: mins,
            type: 'session',
            status: 'เสร็จสิ้น',
          });
        }
      } catch {
        // Safe date parse ignore
      }
    }
  });

  // B. Completed Planner Sessions (avoiding duplicates if session was linked)
  sessions.forEach((s) => {
    if (s.date >= weekStartStr && s.date <= weekEndStr && s.status === 'completed') {
      if (!handledPlannedSessionIds.has(s.id)) {
        const mins = s.actualMinutes || s.plannedMinutes || 60;
        totalStudyMinutes += mins;
        totalSessionsCount += 1;

        if (s.lessonId) {
          handledLessonIds.add(s.lessonId);
        }

        studiedItems.push({
          id: `ps-${s.id}`,
          title: s.title,
          subjectId: s.subjectId,
          date: `${s.date}T${s.startTime || '12:00'}:00`,
          durationMinutes: mins,
          type: 'session',
          status: 'เสร็จสิ้น',
        });
      }
    }
  });

  // C. Lessons completed in this week
  const completedLessonsInWeek: Lesson[] = [];
  lessons.forEach((l) => {
    if (l.status === 'COMPLETED' && l.completedAt) {
      try {
        const compDate = parseISO(l.completedAt);
        if (isWithinInterval(compDate, { start: weekStart, end: weekEnd })) {
          completedLessonsInWeek.push(l);

          // If not captured in sessions above, add study time from lesson
          if (!handledLessonIds.has(l.id) && l.actualStudyMinutes) {
            totalStudyMinutes += l.actualStudyMinutes;
          }

          studiedItems.push({
            id: `lesson-${l.id}`,
            title: l.title,
            subjectId: l.subjectId,
            date: l.completedAt,
            durationMinutes: l.actualStudyMinutes || (l.durationHours ? l.durationHours * 60 : 60),
            type: 'lesson',
            status: 'เรียนจบ',
            quizScore: l.quizScore,
          });
        }
      } catch {
        // Safe parse
      }
    }
  });

  const totalStudyHours = +(totalStudyMinutes / 60).toFixed(1);
  const studyTimeVsTargetPercent = weeklyGoal?.targetHours
    ? Math.min(100, Math.round((totalStudyHours / weeklyGoal.targetHours) * 100))
    : undefined;

  // 2. Quiz attempts & Average Quiz Score in this week
  const weekQuizScores: number[] = [];
  lessons.forEach((l) => {
    if (l.quizAttempts && l.quizAttempts.length > 0) {
      l.quizAttempts.forEach((qa) => {
        try {
          const qaDate = parseISO(qa.timestamp);
          if (isWithinInterval(qaDate, { start: weekStart, end: weekEnd })) {
            weekQuizScores.push(qa.score);
          }
        } catch {
          // Ignore
        }
      });
    } else if (l.status === 'COMPLETED' && l.completedAt && l.quizScore !== undefined) {
      try {
        const compDate = parseISO(l.completedAt);
        if (isWithinInterval(compDate, { start: weekStart, end: weekEnd })) {
          weekQuizScores.push(l.quizScore);
        }
      } catch {
        // Ignore
      }
    }
  });

  const quizAttemptsCount = weekQuizScores.length;
  const averageQuizScore =
    quizAttemptsCount > 0
      ? +(weekQuizScores.reduce((a, b) => a + b, 0) / quizAttemptsCount).toFixed(1)
      : undefined;

  // 3. Reviews Completed and Overdue
  const reviewsCompleted = reviewQueue.filter((r) => {
    if (r.status === 'completed' && r.lastReviewedAt) {
      try {
        return isWithinInterval(parseISO(r.lastReviewedAt), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  const reviewsOverdue = reviewQueue.filter((r) => {
    if (r.status === 'overdue') return true;
    if (r.status === 'pending') {
      try {
        return isBefore(parseISO(r.nextReviewAt), new Date());
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  // 4. Subject Breakdown
  const subjectBreakdown = {} as Record<SubjectId, WeeklySubjectSummary>;
  ALL_SUBJECTS.forEach((subId) => {
    const subItems = studiedItems.filter((i) => i.subjectId === subId);
    const subStudyMins = subItems.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const subCompletedLessons = completedLessonsInWeek.filter((l) => l.subjectId === subId).length;
    const subSessions = subItems.filter((i) => i.type === 'session').length;

    const subQuizScores: number[] = [];
    lessons
      .filter((l) => l.subjectId === subId)
      .forEach((l) => {
        if (l.quizAttempts && l.quizAttempts.length > 0) {
          l.quizAttempts.forEach((qa) => {
            try {
              if (isWithinInterval(parseISO(qa.timestamp), { start: weekStart, end: weekEnd })) {
                subQuizScores.push(qa.score);
              }
            } catch {}
          });
        } else if (l.status === 'COMPLETED' && l.completedAt && l.quizScore !== undefined) {
          try {
            if (isWithinInterval(parseISO(l.completedAt), { start: weekStart, end: weekEnd })) {
              subQuizScores.push(l.quizScore);
            }
          } catch {}
        }
      });

    const subAvgQuiz =
      subQuizScores.length > 0
        ? +(subQuizScores.reduce((a, b) => a + b, 0) / subQuizScores.length).toFixed(1)
        : undefined;

    subjectBreakdown[subId] = {
      subjectId: subId,
      studyMinutes: subStudyMins,
      studyHours: +(subStudyMins / 60).toFixed(1),
      sessionsCount: subSessions,
      completedLessonsCount: subCompletedLessons,
      quizAttemptsCount: subQuizScores.length,
      averageQuizScore: subAvgQuiz,
    };
  });

  // 5. Learning Memory (What I learned & What is unclear)
  const learnedNotesList: WeeklyMemoryItem[] = [];
  const handledNoteLessonIds = new Set<string>();

  // Add notes from completed lessons
  completedLessonsInWeek.forEach((l) => {
    if (l.learnedNotes && l.learnedNotes.trim().length > 0) {
      handledNoteLessonIds.add(l.id);
      learnedNotesList.push({
        id: `note-lesson-${l.id}`,
        lessonId: l.id,
        lessonTitle: l.title,
        subjectId: l.subjectId,
        learnedNotes: l.learnedNotes.trim(),
        date: l.completedAt || weekEndStr,
      });
    }
  });

  // Add notes from learning sessions in this week
  learningSessionsHistory.forEach((ls) => {
    if (
      ls.completedAt &&
      isWithinInterval(parseISO(ls.completedAt), { start: weekStart, end: weekEnd })
    ) {
      if (ls.notesDraft?.learnedNotes && ls.notesDraft.learnedNotes.trim().length > 0) {
        if (!handledNoteLessonIds.has(ls.lessonId)) {
          handledNoteLessonIds.add(ls.lessonId);
          const parent = lessons.find((l) => l.id === ls.lessonId);
          learnedNotesList.push({
            id: `note-ls-${ls.sessionId}`,
            lessonId: ls.lessonId,
            lessonTitle: parent?.title || 'เซสชันการเรียน',
            subjectId: parent?.subjectId || 'math',
            learnedNotes: ls.notesDraft.learnedNotes.trim(),
            date: ls.completedAt,
          });
        }
      }
    }
  });

  // Fallback: If no learned notes generated this week, extract from recently studied lessons with notes
  if (learnedNotesList.length === 0) {
    lessons
      .filter((l) => l.learnedNotes && l.learnedNotes.trim().length > 0)
      .slice(0, 3)
      .forEach((l) => {
        learnedNotesList.push({
          id: `note-prev-${l.id}`,
          lessonId: l.id,
          lessonTitle: l.title,
          subjectId: l.subjectId,
          learnedNotes: l.learnedNotes!.trim(),
          date: l.lastStudiedAt || l.completedAt || weekStartStr,
        });
      });
  }

  // Unclear Topics: Active topics or topics created this week
  const unclearTopicsList = unclearTopics
    .filter((t) => {
      if (t.status !== 'Understood') return true;
      try {
        return isWithinInterval(parseISO(t.createdAt), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  // 6. Next Week Plan (Deterministic Data Aggregation)
  // A. Unfinished Lessons (In Progress)
  const unfinishedLessons = lessons.filter((l) => l.status === 'IN PROGRESS');

  // B. Upcoming Lessons (Next in curriculum)
  const currentMonth = lessons.find((l) => l.status === 'IN PROGRESS')?.month || 1;
  const upcomingLessons = lessons
    .filter((l) => l.month === currentMonth && l.status === 'NOT STARTED')
    .slice(0, 4);

  // C. Review Due Items for Next Week
  const reviewDueItems = reviewQueue
    .filter((r) => {
      if (r.status === 'overdue') return true;
      try {
        const nextDate = parseISO(r.nextReviewAt);
        return (
          isWithinInterval(nextDate, { start: nextWeekStart, end: nextWeekEnd }) ||
          isBefore(nextDate, nextWeekStart)
        );
      } catch {
        return false;
      }
    })
    .slice(0, 5);

  // D. Milestones for Current/Upcoming Month
  const allMilestones: Milestone[] = SIX_MONTH_ROADMAP.flatMap((m) => m.milestones);
  const currentMonthInfo = SIX_MONTH_ROADMAP.find((m) => m.month === currentMonth);
  const milestones: Milestone[] = currentMonthInfo?.milestones || allMilestones.slice(0, 4);

  // E. Goals due soon
  const goalsDueSoon = goals
    .filter((g) => {
      if (g.status !== 'in_progress') return false;
      const targetD = parseISO(g.targetDate);
      return isBefore(targetD, addDays(nextWeekEnd, 14));
    })
    .slice(0, 3);

  const summary: WeeklyReviewSummary = {
    weekStartDate: weekStartStr,
    weekEndDate: weekEndStr,
    weekNumber,
    totalStudyMinutes,
    totalStudyHours,
    sessionsCount: totalSessionsCount,
    completedLessonsCount: completedLessonsInWeek.length,
    completedLessons: completedLessonsInWeek,
    quizAttemptsCount,
    averageQuizScore,
    reviewsCompletedCount: reviewsCompleted,
    reviewsOverdueCount: reviewsOverdue,
    studyTimeVsTargetPercent,
  };

  return {
    weekStartDate: weekStartStr,
    weekEndDate: weekEndStr,
    weekNumber,
    summary,
    subjectBreakdown,
    studiedItems,
    learnedNotesList,
    unclearTopicsList,
    nextWeekPlan: {
      unfinishedLessons,
      upcomingLessons,
      reviewDueItems,
      milestones,
      goalsDueSoon,
    },
  };
}

/**
 * Generates plain text export summary suitable for copying to clipboard
 */
export function generateWeeklyReviewClipboardText(report: WeeklyReviewReport): string {
  const { summary, subjectBreakdown, learnedNotesList, unclearTopicsList, nextWeekPlan } = report;

  const lines: string[] = [
    `📊 สรุปการเรียนรายสัปดาห์ (Weekly Learning Review)`,
    `ช่วงเวลา: ${summary.weekStartDate} ถึง ${summary.weekEndDate} (สัปดาห์ที่ ${summary.weekNumber})`,
    `========================================`,
    `⏱️ เวลาเรียนรวม: ${summary.totalStudyHours} ชั่วโมง (${summary.totalStudyMinutes} นาที)`,
    `📚 เซสชันการเรียน: ${summary.sessionsCount} เซสชัน`,
    `✅ บทเรียนที่จบ: ${summary.completedLessonsCount} บท`,
    `🎯 คะแนน Quiz เฉลี่ย: ${summary.averageQuizScore !== undefined ? summary.averageQuizScore + '%' : 'ไม่มีแบบทดสอบ'}`,
    `🔄 ทบทวนสำเร็จ: ${summary.reviewsCompletedCount} ครั้ง | ค้างทบทวน: ${summary.reviewsOverdueCount} เรื่อง`,
    ``,
    `📌 เวลาเรียนแยกตามวิชา (Subject Breakdown):`,
  ];

  Object.values(subjectBreakdown).forEach((sub) => {
    if (sub.studyMinutes > 0 || sub.completedLessonsCount > 0) {
      lines.push(
        `- ${sub.subjectId.toUpperCase()}: ${sub.studyHours} ชม. | จบ ${sub.completedLessonsCount} บท | Quiz: ${sub.averageQuizScore !== undefined ? sub.averageQuizScore + '%' : '-'}`
      );
    }
  });

  lines.push(``, `💡 เข้าใจอะไรเพิ่มในสัปดาห์นี้ (What I Learned):`);
  if (learnedNotesList.length > 0) {
    learnedNotesList.forEach((n) => {
      lines.push(`- [${n.lessonTitle}] ${n.learnedNotes}`);
    });
  } else {
    lines.push(`- ยังไม่มีบันทึกสรุปความรู้ใหม่ในสัปดาห์นี้`);
  }

  lines.push(``, `❓ สิ่งที่ยังไม่เข้าใจ (What's Still Unclear):`);
  if (unclearTopicsList.length > 0) {
    unclearTopicsList.forEach((u) => {
      lines.push(`- [${u.priority}] ${u.topic}: ${u.details}`);
    });
  } else {
    lines.push(`- ไม่มีหัวข้อที่ติดขัด ทุกเรื่องผ่านเกณฑ์ความเข้าใจ`);
  }

  lines.push(``, `🚀 แผนสัปดาห์หน้า (Next Week Action Plan):`);
  if (nextWeekPlan.unfinishedLessons.length > 0) {
    lines.push(`- เคลียร์บทเรียนค้าง: ${nextWeekPlan.unfinishedLessons.map((l) => l.title).join(', ')}`);
  }
  if (nextWeekPlan.upcomingLessons.length > 0) {
    lines.push(`- บทเรียนถัดไป: ${nextWeekPlan.upcomingLessons.map((l) => l.title).join(', ')}`);
  }
  if (nextWeekPlan.reviewDueItems.length > 0) {
    lines.push(`- ทบทวนตามกำหนด: ${nextWeekPlan.reviewDueItems.map((r) => r.topic).join(', ')}`);
  }

  return lines.join('\n');
}
