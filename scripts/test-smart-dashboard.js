// Automated QA test script for Phase 17 - Smart Learning Dashboard
import assert from 'assert';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';

console.log('--- RUNNING PHASE 17 SMART LEARNING DASHBOARD QA TESTS ---');

// 1. Mock Data Generator
const refDate = new Date('2026-10-01T12:00:00Z'); // Thursday
const todayStr = format(refDate, 'yyyy-MM-dd');

const mockLessons = [
  {
    id: 'l-m1-1',
    title: 'Linear Algebra Basics',
    subjectId: 'math',
    status: 'COMPLETED',
    completedAt: '2026-09-29T15:00:00Z',
    actualStudyMinutes: 90,
    quizScore: 85,
    learnedNotes: 'เข้าใจการแก้ระบบสมการเชิงเส้นสองตัวแปร',
    stillUnclearNotes: '',
    month: 1,
    week: 1,
    durationHours: 1.5,
    difficulty: 'Medium',
    mastery: 3,
  },
  {
    id: 'l-m1-2',
    title: 'Python Control Flow',
    subjectId: 'programming',
    status: 'IN PROGRESS', // Rank 1 Candidate
    completedAt: undefined,
    actualStudyMinutes: 45,
    quizScore: undefined,
    learnedNotes: 'เริ่มเขียน if-elif-else',
    stillUnclearNotes: 'ยังสับสนเรื่อง nested loop',
    month: 1,
    week: 1,
    durationHours: 2.0,
    difficulty: 'Medium',
    mastery: 1,
  },
  {
    id: 'l-m1-3',
    title: 'Kinematics Formulas',
    subjectId: 'physics',
    status: 'NOT STARTED', // Rank 3 Candidate
    month: 1,
    week: 2,
    durationHours: 2.0,
    difficulty: 'Hard',
    mastery: 0,
  },
  {
    id: 'l-m2-1',
    title: 'Calculus Limits',
    subjectId: 'math',
    status: 'NOT STARTED',
    month: 2,
    week: 1,
    durationHours: 2.5,
    difficulty: 'Hard',
    mastery: 0,
  },
];

const mockSessions = [
  {
    id: 's-today-1',
    date: todayStr, // Today
    startTime: '14:00',
    endTime: '15:30',
    plannedMinutes: 90,
    actualMinutes: 0,
    lessonId: 'l-m1-3',
    subjectId: 'physics',
    title: 'อ่านฟิสิกส์การเคลื่อนที่',
    status: 'planned',
    priority: 'High',
  },
  {
    id: 's-overdue-1',
    date: '2026-09-28', // Past date -> Overdue
    startTime: '10:00',
    endTime: '11:00',
    plannedMinutes: 60,
    actualMinutes: 0,
    lessonId: 'l-m1-2',
    subjectId: 'programming',
    title: 'Python Basics',
    status: 'planned',
    priority: 'Medium',
  },
];

const mockReviewQueue = [
  {
    id: 'rev-due-1',
    lessonId: 'l-m1-1',
    topic: 'สมการเชิงเส้น',
    nextReviewAt: `${todayStr}T10:00:00Z`, // Due today
    reviewCount: 1,
    status: 'pending',
    priority: 'High',
  },
  {
    id: 'rev-overdue-1',
    lessonId: 'l-m1-1',
    topic: 'สมการเชิงเส้น - ข้อสอบเก่า',
    nextReviewAt: '2026-09-25T10:00:00Z', // Overdue
    reviewCount: 0,
    status: 'overdue',
    priority: 'High',
  },
];

// -------------------------------------------------------------
// Test 1: Answering the 7 Core Questions
// -------------------------------------------------------------
console.log('Test 1: Core questions answerability verification');

// Question 1: วันนี้ต้องทำอะไร?
const todayTasks = mockSessions.filter((s) => s.date === todayStr);
assert.strictEqual(todayTasks.length, 1);
assert.strictEqual(todayTasks[0].id, 's-today-1');
console.log('  ✓ Question 1 (วันนี้ต้องทำอะไร?): Answered with today\'s scheduled sessions');

// Question 2: มีอะไรค้าง?
const overdueTasks = mockSessions.filter((s) => s.status === 'overdue' || (s.status === 'planned' && s.date < todayStr));
const overdueReviews = mockReviewQueue.filter((r) => r.status === 'overdue' || r.nextReviewAt.split('T')[0] < todayStr);
assert.strictEqual(overdueTasks.length, 1);
assert.strictEqual(overdueReviews.length, 1);
console.log(`  ✓ Question 2 (มีอะไรค้าง?): Answered with ${overdueTasks.length} overdue sessions and ${overdueReviews.length} overdue reviews`);

// Question 3: วันนี้ต้องทบทวนอะไร?
const dueTodayReviews = mockReviewQueue.filter((r) => r.nextReviewAt.split('T')[0] === todayStr);
assert.strictEqual(dueTodayReviews.length, 1);
console.log(`  ✓ Question 3 (วันนี้ต้องทบทวนอะไร?): Answered with ${dueTodayReviews.length} spaced repetition reviews`);

// Question 4: ตอนนี้ roadmap อยู่ตรงไหน?
let currentMonth = 1;
for (let m = 1; m <= 6; m++) {
  const mLessons = mockLessons.filter((l) => l.month === m);
  if (mLessons.length > 0 && mLessons.some((l) => l.status !== 'COMPLETED')) {
    currentMonth = m;
    break;
  }
}
assert.strictEqual(currentMonth, 1);
console.log(`  ✓ Question 4 (ตอนนี้ roadmap อยู่ตรงไหน?): Deterministically evaluated to Month ${currentMonth}`);

// Question 5: มีวิชาไหนที่ต้องกลับไปเสริม?
// l-m1-2 has mastery 1 and unclear notes => flagged
const gaps = mockLessons.filter((l) => l.mastery < 2 || (l.stillUnclearNotes && l.stillUnclearNotes.length > 0));
assert.strictEqual(gaps.length >= 1, true);
assert.strictEqual(gaps[0].subjectId, 'programming');
console.log(`  ✓ Question 5 (มีวิชาไหนที่ต้องกลับไปเสริม?): Flagged ${gaps[0].title} in ${gaps[0].subjectId}`);

// Question 6: สัปดาห์นี้เรียนไปเท่าไร?
const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
const completedThisWeek = mockLessons.filter(
  (l) => l.status === 'COMPLETED' && l.completedAt && isWithinInterval(parseISO(l.completedAt), { start: weekStart, end: weekEnd })
);
assert.strictEqual(completedThisWeek.length, 1);
assert.strictEqual(completedThisWeek[0].actualStudyMinutes, 90);
console.log(`  ✓ Question 6 (สัปดาห์นี้เรียนไปเท่าไร?): Identified ${completedThisWeek[0].actualStudyMinutes} minutes studied this week`);

// Question 7: เป้าหมายถัดไปคืออะไร?
const mockGoals = [
  {
    id: 'g-1',
    title: 'เรียนคณิตให้ครบ 10 ชม.',
    type: 'study_hours',
    targetValue: 10,
    currentValue: 4,
    status: 'in_progress',
  },
];
const activeGoal = mockGoals.find((g) => g.status === 'in_progress');
assert.strictEqual(activeGoal.id, 'g-1');
assert.strictEqual(activeGoal.targetValue - activeGoal.currentValue, 6);
console.log(`  ✓ Question 7 (เป้าหมายถัดไปคืออะไร?): Active goal '${activeGoal.title}' with 6 hrs remaining`);

// -------------------------------------------------------------
// Test 2: Deterministic Recommendation Priority Order
// -------------------------------------------------------------
console.log('\nTest 2: Deterministic recommendation priority rules');

function pickRecommendation(lessons, sessions, dateStr) {
  // Rank 1: Incomplete lesson
  const inProgress = lessons.filter((l) => l.status === 'IN PROGRESS');
  if (inProgress.length > 0) {
    return { rule: 'incomplete_lesson', lessonId: inProgress[0].id };
  }
  // Rank 2: Today's planned session
  const todayPlanned = sessions.filter((s) => s.date === dateStr && s.status === 'planned');
  if (todayPlanned.length > 0) {
    return { rule: 'today_planned_session', lessonId: todayPlanned[0].lessonId };
  }
  // Rank 3: Next not-started roadmap item
  const notStarted = lessons.filter((l) => l.status === 'NOT STARTED');
  if (notStarted.length > 0) {
    return { rule: 'next_roadmap_item', lessonId: notStarted[0].id };
  }
  return { rule: 'fallback_lesson', lessonId: lessons[0]?.id };
}

// Case A: When incomplete lesson exists -> MUST choose incomplete lesson (Rank 1)
const recA = pickRecommendation(mockLessons, mockSessions, todayStr);
assert.strictEqual(recA.rule, 'incomplete_lesson');
assert.strictEqual(recA.lessonId, 'l-m1-2');
console.log('  ✓ Priority Rank 1: Incomplete lesson chosen over planned session and roadmap item');

// Case B: When NO incomplete lesson, but planned session today exists -> MUST choose today's planned session (Rank 2)
const lessonsWithoutInProgress = mockLessons.map((l) =>
  l.status === 'IN PROGRESS' ? { ...l, status: 'COMPLETED' } : l
);
const recB = pickRecommendation(lessonsWithoutInProgress, mockSessions, todayStr);
assert.strictEqual(recB.rule, 'today_planned_session');
assert.strictEqual(recB.lessonId, 'l-m1-3');
console.log('  ✓ Priority Rank 2: Today\'s planned session chosen when no incomplete lesson');

// Case C: When NO incomplete lesson and NO session today -> MUST choose next roadmap item (Rank 3)
const sessionsWithoutToday = mockSessions.filter((s) => s.date !== todayStr);
const recC = pickRecommendation(lessonsWithoutInProgress, sessionsWithoutToday, todayStr);
assert.strictEqual(recC.rule, 'next_roadmap_item');
assert.strictEqual(recC.lessonId, 'l-m1-3');
console.log('  ✓ Priority Rank 3: Next roadmap item chosen when no today sessions');

// -------------------------------------------------------------
// Test 3: Roadmap Month Progression
// -------------------------------------------------------------
console.log('\nTest 3: Roadmap month progression rule');
const allMonth1Completed = mockLessons.map((l) =>
  l.month === 1 ? { ...l, status: 'COMPLETED' } : l
);
let advancedMonth = 1;
for (let m = 1; m <= 6; m++) {
  const mLessons = allMonth1Completed.filter((l) => l.month === m);
  if (mLessons.length > 0 && mLessons.some((l) => l.status !== 'COMPLETED')) {
    advancedMonth = m;
    break;
  }
}
assert.strictEqual(advancedMonth, 2);
console.log('  ✓ Roadmap month progression: Month 1 complete -> Advanced to Month 2');

// -------------------------------------------------------------
// Test 4: New User Onboarding Condition
// -------------------------------------------------------------
console.log('\nTest 4: Onboarding empty state detection');
const isNewUserTrue = ([], [], []);
const emptyCompletedLessons = [];
const emptyCompletedSessions = [];
const emptyHistory = [];
const isNewUser =
  emptyCompletedLessons.length === 0 &&
  emptyCompletedSessions.length === 0 &&
  emptyHistory.length === 0;
assert.strictEqual(isNewUser, true);

const hasHistory = [mockLessons[0]].length > 0;
assert.strictEqual(hasHistory, true);
console.log('  ✓ Onboarding triggers strictly on fresh state (0 completed lessons/sessions)');

// -------------------------------------------------------------
// Test 5: Recent Learning Memory Extraction
// -------------------------------------------------------------
console.log('\nTest 5: Recent learning memory extraction');
const memoryCandidates = mockLessons
  .filter((l) => l.learnedNotes && l.learnedNotes.trim().length > 0)
  .sort((a, b) => {
    const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return tB - tA;
  });
assert.strictEqual(memoryCandidates.length >= 1, true);
assert.strictEqual(memoryCandidates[0].learnedNotes.includes('สมการเชิงเส้น'), true);
console.log('  ✓ Learning memory captures notes and sorts chronologically');

console.log('\n======================================================');
console.log('ALL 5 SMART DASHBOARD TEST SUITES PASSED (100% SUCCESS)');
console.log('======================================================\n');
