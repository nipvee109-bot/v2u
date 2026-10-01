// Automated QA test script for Phase 18 - Study Onboarding
import assert from 'assert';
import {
  format,
  addDays,
  startOfWeek,
} from 'date-fns';

console.log('--- RUNNING PHASE 18 STUDY ONBOARDING QA TESTS ---');

const DAY_NAMES_TH = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

const TIME_SLOT_TIMES = {
  morning: { start: '09:00', end: '11:00' },
  afternoon: { start: '14:00', end: '16:00' },
  evening: { start: '19:30', end: '21:30' },
};

function shouldShowOnboarding(params) {
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

  if (hasCompletedLessons || hasCompletedSessions || hasHistory) {
    return false;
  }

  return true;
}

function generateFirstWeekPlan(params) {
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

  const totalMinutes = weeklyTargetHours * 60;
  const minutesPerSession = Math.max(
    60,
    Math.min(180, Math.round(totalMinutes / preferredDays.length))
  );

  const slotTimes = TIME_SLOT_TIMES[preferredTimeSlot] || TIME_SLOT_TIMES.evening;

  const candidateLessons = lessons.filter(
    (l) => l.month === 1 && selectedSubjects.includes(l.subjectId)
  );

  const lessonPool = candidateLessons.length > 0
    ? candidateLessons
    : lessons.filter((l) => selectedSubjects.includes(l.subjectId));

  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const generated = [];

  const sortedDays = [...preferredDays].sort((a, b) => {
    const normA = a === 0 ? 7 : a;
    const normB = b === 0 ? 7 : b;
    return normA - normB;
  });

  sortedDays.forEach((dayNum, index) => {
    const offset = dayNum === 0 ? 6 : dayNum - 1;
    const sessionDate = addDays(weekStart, offset);
    const dateStr = format(sessionDate, 'yyyy-MM-dd');

    const targetSubject = selectedSubjects[index % selectedSubjects.length];
    const matchingLessons = lessonPool.filter((l) => l.subjectId === targetSubject);
    const targetLesson =
      matchingLessons[Math.floor(index / selectedSubjects.length) % matchingLessons.length] ||
      lessonPool[index % lessonPool.length] ||
      lessons[0];

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

function buildOnboardingMainGoal(preferences) {
  const nowStr = format(new Date(), 'yyyy-MM-dd');
  const targetDateStr = format(addDays(new Date(), 180), 'yyyy-MM-dd');

  return {
    id: 'goal-main-test',
    title: preferences.mainGoalTitle || 'สอบติดวิศวกรรมศาสตร์ตามเป้าหมาย 6 เดือน',
    description: `เป้าหมายใหญ่ 6 เดือน: โฟกัส ${preferences.selectedSubjects.length} วิชาหลัก (${preferences.weeklyTargetHours} ชม./สัปดาห์)`,
    type: 'study_hours',
    scope: 'six_month',
    targetValue: preferences.weeklyTargetHours * 24,
    currentValue: 0,
    unit: 'ชั่วโมง',
    startDate: nowStr,
    targetDate: targetDateStr,
    status: 'in_progress',
  };
}

const mockLessons = [
  {
    id: 'l-m1-1',
    title: 'Linear Algebra and Equations',
    subjectId: 'math',
    status: 'NOT STARTED',
    month: 1,
    week: 1,
    durationHours: 1.5,
  },
  {
    id: 'l-m1-2',
    title: 'Python Variables and Loops',
    subjectId: 'programming',
    status: 'NOT STARTED',
    month: 1,
    week: 1,
    durationHours: 2.0,
  },
  {
    id: 'l-m1-3',
    title: 'Newton Laws of Motion',
    subjectId: 'physics',
    status: 'NOT STARTED',
    month: 1,
    week: 2,
    durationHours: 2.0,
  },
  {
    id: 'l-m1-4',
    title: 'TGAT 3 Logical Thinking',
    subjectId: 'tgat3',
    status: 'NOT STARTED',
    month: 1,
    week: 2,
    durationHours: 1.0,
  },
];

// -------------------------------------------------------------
// Test 1: New User Detection
// -------------------------------------------------------------
console.log('Test 1: New user detection');
const isNewUser = shouldShowOnboarding({
  hasCompletedOnboarding: false,
  lessons: mockLessons,
  sessions: [],
  learningSessionsHistory: [],
});
assert.strictEqual(isNewUser, true, 'New user without study progress must see onboarding');
console.log('  ✓ Fresh user correctly detected and prompted');

// -------------------------------------------------------------
// Test 2: Existing User Protection (Never force onboarding)
// -------------------------------------------------------------
console.log('Test 2: Existing user protection (Never force onboarding)');
// Case A: User has completed a lesson
const existingUserWithLesson = shouldShowOnboarding({
  hasCompletedOnboarding: false,
  lessons: [{ ...mockLessons[0], status: 'COMPLETED' }],
  sessions: [],
  learningSessionsHistory: [],
});
assert.strictEqual(existingUserWithLesson, false, 'Existing user with completed lesson must NOT be forced');

// Case B: User has completed a planner session
const existingUserWithSession = shouldShowOnboarding({
  hasCompletedOnboarding: false,
  lessons: mockLessons,
  sessions: [{ id: 's-1', status: 'completed' }],
  learningSessionsHistory: [],
});
assert.strictEqual(existingUserWithSession, false, 'Existing user with completed session must NOT be forced');

// Case C: User has study session history
const existingUserWithHistory = shouldShowOnboarding({
  hasCompletedOnboarding: false,
  lessons: mockLessons,
  sessions: [],
  learningSessionsHistory: [{ sessionId: 'ls-1', status: 'completed' }],
});
assert.strictEqual(existingUserWithHistory, false, 'Existing user with learning history must NOT be forced');
console.log('  ✓ Existing users with any historical progress are never forced to onboard');

// -------------------------------------------------------------
// Test 3: Skip Functionality
// -------------------------------------------------------------
console.log('Test 3: Skip functionality');
const skippedUser = shouldShowOnboarding({
  hasCompletedOnboarding: true, // Marked as skipped or completed
  lessons: mockLessons,
  sessions: [],
  learningSessionsHistory: [],
});
assert.strictEqual(skippedUser, false, 'Skipped user must not be shown onboarding');
console.log('  ✓ Skipping successfully suppresses onboarding modal');

// -------------------------------------------------------------
// Test 4: Step 1-4 Preferences & First Week Plan Generation (Step 5)
// -------------------------------------------------------------
console.log('Test 4: First week plan generation from user preferences');
const preferences = {
  mainGoalTitle: 'สอบติดวิศวกรรมคอมพิวเตอร์ จุฬาฯ',
  selectedSubjects: ['math', 'programming', 'physics', 'tgat3'],
  weeklyTargetHours: 12,
  preferredDays: [1, 3, 5, 6], // Mon, Wed, Fri, Sat (4 days)
  preferredTimeSlot: 'evening',
};

const generatedPlan = generateFirstWeekPlan({
  preferences,
  lessons: mockLessons,
  referenceDate: new Date('2026-10-01T12:00:00Z'),
});

assert.strictEqual(generatedPlan.length, 4, 'Must generate exactly 4 sessions for 4 preferred days');
assert.strictEqual(generatedPlan[0].startTime, TIME_SLOT_TIMES.evening.start);
assert.strictEqual(generatedPlan[0].plannedMinutes, 180); // 12 hours / 4 days = 3 hours (180 mins)
assert.strictEqual(preferences.selectedSubjects.includes(generatedPlan[0].subjectId), true);
console.log(`  ✓ Generated 4 sessions evenly distributed in evening slot (${generatedPlan[0].plannedMinutes} mins each)`);

// -------------------------------------------------------------
// Test 5: Step 6 First Study Session Connection
// -------------------------------------------------------------
console.log('Test 5: Step 6 First study session connection');
const firstSession = generatedPlan[0];
assert.strictEqual(Boolean(firstSession.lessonId), true, 'First session must link to a valid lesson');
assert.strictEqual(firstSession.lessonId, mockLessons[0].id, 'First session connects to earliest Month 1 lesson');
console.log(`  ✓ First study session accurately connects to lesson '${firstSession.lessonTitle}'`);

// -------------------------------------------------------------
// Test 6: 6-Month Main Goal Creation
// -------------------------------------------------------------
console.log('Test 6: Main 6-month goal model creation');
const mainGoal = buildOnboardingMainGoal(preferences);
assert.strictEqual(mainGoal.title, preferences.mainGoalTitle);
assert.strictEqual(mainGoal.scope, 'six_month');
assert.strictEqual(mainGoal.type, 'study_hours');
assert.strictEqual(mainGoal.targetValue, 12 * 24); // 288 hours in 24 weeks
assert.strictEqual(mainGoal.status, 'in_progress');
console.log(`  ✓ 6-Month study goal generated: target ${mainGoal.targetValue} hrs over 6 months`);

console.log('\n======================================================');
console.log('ALL 6 STUDY ONBOARDING TEST SUITES PASSED (100% SUCCESS)');
console.log('======================================================\n');
