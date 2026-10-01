import {
  format,
  addDays,
  startOfWeek,
} from 'date-fns';
import type {
  Lesson,
  StudySession,
  OnboardingPreferences,
  GeneratedPlanSessionPreview,
  StudyGoal,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export const DAY_NAMES_TH = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

export const TIME_SLOT_TIMES: Record<
  OnboardingPreferences['preferredTimeSlot'],
  { start: string; end: string }
> = {
  morning: { start: '09:00', end: '11:00' },
  afternoon: { start: '14:00', end: '16:00' },
  evening: { start: '19:30', end: '21:30' },
};

/**
 * Determines whether the onboarding modal/wizard should show automatically.
 * Rule:
 * 1. If hasCompletedOnboarding is true -> DO NOT SHOW
 * 2. If user already has completed lessons or recorded sessions -> DO NOT SHOW (protect existing users)
 * 3. Only show for fresh/new users without existing study progress.
 */
export function shouldShowOnboarding(params: {
  hasCompletedOnboarding?: boolean;
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: unknown[];
}): boolean {
  const {
    hasCompletedOnboarding = false,
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
  } = params;

  if (hasCompletedOnboarding) return false;

  const hasCompletedLessons = lessons.some((l) => l.status === 'COMPLETED');
  const hasCompletedSessions = sessions.some((s) => s.status === 'completed');
  const hasHistory = learningSessionsHistory.length > 0;

  // If user has any completed history, they are an existing user
  if (hasCompletedLessons || hasCompletedSessions || hasHistory) {
    return false;
  }

  return true;
}

/**
 * Deterministically generates a first week plan based on user preferences.
 */
export function generateFirstWeekPlan(params: {
  preferences: OnboardingPreferences;
  lessons: Lesson[];
  referenceDate?: Date;
}): GeneratedPlanSessionPreview[] {
  const { preferences, lessons, referenceDate = new Date() } = params;
  const {
    selectedSubjects = ['math', 'programming', 'physics', 'tgat3'],
    preferredDays = [1, 3, 5, 6], // Mon, Wed, Fri, Sat
    weeklyTargetHours = 12,
    preferredTimeSlot = 'evening',
  } = preferences;

  if (selectedSubjects.length === 0 || preferredDays.length === 0) {
    return [];
  }

  // Calculate session duration in minutes:
  // e.g. 12 hours across 4 days = 3 hours per day (or 120 mins if capped)
  const totalMinutes = weeklyTargetHours * 60;
  const minutesPerSession = Math.max(
    60,
    Math.min(180, Math.round(totalMinutes / preferredDays.length))
  );

  const slotTimes = TIME_SLOT_TIMES[preferredTimeSlot] || TIME_SLOT_TIMES.evening;

  // Filter available candidate lessons from Month 1 matching selected subjects
  const candidateLessons = lessons.filter(
    (l) => l.month === 1 && selectedSubjects.includes(l.subjectId)
  );

  // If none in Month 1, fallback to any lessons in selected subjects
  const lessonPool = candidateLessons.length > 0
    ? candidateLessons
    : lessons.filter((l) => selectedSubjects.includes(l.subjectId));

  // Determine starting week (start from today or tomorrow)
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
  const generated: GeneratedPlanSessionPreview[] = [];

  // Sort preferred days: Monday (1) to Sunday (0 -> 7 for display)
  const sortedDays = [...preferredDays].sort((a, b) => {
    const normA = a === 0 ? 7 : a;
    const normB = b === 0 ? 7 : b;
    return normA - normB;
  });

  sortedDays.forEach((dayNum, index) => {
    // Calculate the actual calendar date for this day in the upcoming week
    // date-fns startOfWeek with weekStartsOn: 1 means:
    // day 1 (Mon) is offset 0, day 2 (Tue) is offset 1, ..., day 0 (Sun) is offset 6
    const offset = dayNum === 0 ? 6 : dayNum - 1;
    const sessionDate = addDays(weekStart, offset);
    const dateStr = format(sessionDate, 'yyyy-MM-dd');

    // Pick subject and lesson cyclically
    const targetSubject = selectedSubjects[index % selectedSubjects.length];
    const matchingLessons = lessonPool.filter((l) => l.subjectId === targetSubject);
    const targetLesson =
      matchingLessons[Math.floor(index / selectedSubjects.length) % matchingLessons.length] ||
      lessonPool[index % lessonPool.length] ||
      lessons[0];

    // Compute end time based on start time + minutesPerSession
    const [startH, startM] = slotTimes.start.split(':').map(Number);
    const endMinutesTotal = startH * 60 + startM + minutesPerSession;
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    generated.push({
      id: `init-plan-${dayNum}-${index}`,
      date: dateStr,
      dayOfWeek: dayNum,
      dayLabel: DAY_NAMES_TH[dayNum] || `วัน ${dayNum}`,
      startTime: slotTimes.start,
      endTime: endTimeStr,
      plannedMinutes: minutesPerSession,
      subjectId: targetSubject,
      lessonId: targetLesson ? targetLesson.id : '',
      lessonTitle: targetLesson ? targetLesson.title : 'ศึกษาเนื้อหาตามแผน',
    });
  });

  return generated;
}

/**
 * Builds the first 6-month goal model from onboarding setup.
 */
export function buildOnboardingMainGoal(preferences: OnboardingPreferences): StudyGoal {
  const nowStr = format(new Date(), 'yyyy-MM-dd');
  const targetDateStr = format(addDays(new Date(), 180), 'yyyy-MM-dd');

  return {
    id: `goal-main-${uuidv4().substring(0, 8)}`,
    title: preferences.mainGoalTitle || 'สอบติดวิศวกรรมศาสตร์ตามเป้าหมาย 6 เดือน',
    description: `เป้าหมายใหญ่ 6 เดือน: โฟกัส ${preferences.selectedSubjects.length} วิชาหลัก (${preferences.weeklyTargetHours} ชม./สัปดาห์)`,
    type: 'study_hours',
    scope: 'six_month',
    targetValue: preferences.weeklyTargetHours * 24, // 24 weeks in 6 months
    currentValue: 0,
    unit: 'ชั่วโมง',
    startDate: nowStr,
    targetDate: targetDateStr,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
}
