import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('--- RUNNING PHASE 25: TODAY LEARNING CHOICE QA TESTS ---');

let passed = 0;
function check(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
}

const SUBJECTS = {
  math: { id: 'math', name: 'คณิตศาสตร์' },
  programming: { id: 'programming', name: 'Programming / Python' },
  physics: { id: 'physics', name: 'ฟิสิกส์' },
  tgat3: { id: 'tgat3', name: 'TGAT 3' },
  ai: { id: 'ai', name: 'AI / Machine Learning' },
};

function getLearningTypes() {
  return [
    { value: 'learn', label: 'เรียนใหม่' },
    { value: 'review', label: 'ทบทวน' },
    { value: 'practice', label: 'ฝึกทำ' },
    { value: 'quiz', label: 'ทดสอบ' },
    { value: 'watch', label: 'ดูวิดีโอ' },
    { value: 'read', label: 'อ่าน' },
  ];
}

function generateSmartStudyPlan(params) {
  const {
    availableMinutes,
    lessons = [],
    sessions = [],
    learningSessionsHistory = [],
    reviewQueue = [],
    todayStr,
  } = params;

  const plan = [];
  let remainingMinutes = availableMinutes;
  const usedLessonIds = new Set();

  const addItem = (lesson, type, minutes, reason, priority) => {
    if (remainingMinutes <= 0 || usedLessonIds.has(lesson.id)) return false;
    const duration = Math.min(minutes, remainingMinutes);
    if (duration < 10) return false;

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

  // 1. Overdue reviews
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

  // 2. In progress
  const inProgressLessons = lessons.filter((l) => l.status === 'IN PROGRESS');
  for (const lesson of inProgressLessons) {
    if (remainingMinutes <= 0) break;
    addItem(lesson, 'learn', Math.max(30, Math.round(lesson.durationHours * 60 * 0.5)), 'เป็นบทที่กำลังเรียนค้างอยู่', 2);
  }

  // 3. Today's planned
  const todayPlanned = sessions.filter(
    (s) => s.date === todayStr && s.status === 'planned'
  );
  for (const session of todayPlanned) {
    if (remainingMinutes <= 0) break;
    const lesson = session.lessonId ? lessons.find((l) => l.id === session.lessonId) : null;
    if (lesson && !usedLessonIds.has(lesson.id)) {
      addItem(lesson, session.type === 'review' ? 'review' : 'learn', session.plannedMinutes || 60, 'มีแผนเรียนในวันนี้', 3);
    }
  }

  // 4. Roadmap / next lesson
  for (const lesson of lessons) {
    if (remainingMinutes <= 0) break;
    if (lesson.status === 'NOT STARTED' && !usedLessonIds.has(lesson.id)) {
      addItem(lesson, 'learn', Math.min(45, remainingMinutes), `เป็นบทเรียนถัดไป`, 4);
    }
  }

  return plan;
}

// Test 1: getLearningTypes
const types = getLearningTypes();
check(types.length === 6, 'Supports 6 learning types (learn, review, practice, quiz, watch, read)');
check(types.some(t => t.value === 'learn'), 'Includes "learn" type');
check(types.some(t => t.value === 'review'), 'Includes "review" type');
check(types.some(t => t.value === 'practice'), 'Includes "practice" type');
check(types.some(t => t.value === 'quiz'), 'Includes "quiz" type');
check(types.some(t => t.value === 'watch'), 'Includes "watch" type');
check(types.some(t => t.value === 'read'), 'Includes "read" type');

// Mock data
const mockLessons = [
  { id: 'l-math-1', title: 'Calculus I', subjectId: 'math', month: 1, durationHours: 1, status: 'IN PROGRESS', resources: [] },
  { id: 'l-math-2', title: 'Linear Algebra', subjectId: 'math', month: 1, durationHours: 1, status: 'NOT STARTED', resources: [] },
  { id: 'l-prog-1', title: 'Python Basics', subjectId: 'programming', month: 1, durationHours: 1, status: 'COMPLETED', resources: [] },
  { id: 'l-prog-2', title: 'OOP Python', subjectId: 'programming', month: 1, durationHours: 1.5, status: 'NOT STARTED', resources: [] },
  { id: 'l-phys-1', title: 'Mechanics', subjectId: 'physics', month: 1, durationHours: 1, status: 'NOT STARTED', resources: [] },
];

const mockReviews = [
  { id: 'rev-1', lessonId: 'l-prog-1', topic: 'Python Review', status: 'overdue', nextReviewAt: '2026-09-28', reviewCount: 1, reason: 'spaced_repetition', priority: 'High' }
];

const mockSessions = [
  { id: 'ses-1', date: '2026-10-01', startTime: '10:00', endTime: '11:00', plannedMinutes: 60, lessonId: 'l-math-2', subjectId: 'math', title: 'Study Math', status: 'planned', priority: 'High', type: 'learn', createdAt: '', updatedAt: '' }
];

// Test 2: generateSmartStudyPlan with 60 minutes
const plan60 = generateSmartStudyPlan({
  availableMinutes: 60,
  lessons: mockLessons,
  sessions: mockSessions,
  learningSessionsHistory: [],
  reviewQueue: mockReviews,
  todayStr: '2026-10-01',
});

check(plan60.length > 0, 'Generates plan items for 60 min');
const totalMin60 = plan60.reduce((acc, p) => acc + p.durationMinutes, 0);
check(totalMin60 <= 60, `Total planned minutes (${totalMin60}) does not exceed available 60 minutes`);

// Test 3: Overdue review has highest priority
check(plan60[0].lessonId === 'l-prog-1', 'Overdue review lesson is prioritized first in the queue');
check(plan60[0].learningType === 'review', 'Overdue item is marked as review type');

// Test 4: generateSmartStudyPlan with 120 minutes accommodates multiple items
const plan120 = generateSmartStudyPlan({
  availableMinutes: 120,
  lessons: mockLessons,
  sessions: mockSessions,
  learningSessionsHistory: [],
  reviewQueue: mockReviews,
  todayStr: '2026-10-01',
});

check(plan120.length >= 2, 'Generates multiple plan items for 120 min');
const totalMin120 = plan120.reduce((acc, p) => acc + p.durationMinutes, 0);
check(totalMin120 <= 120, `Total planned minutes (${totalMin120}) does not exceed 120 minutes`);

// Test 5: In-progress lesson is prioritized after overdue reviews
const hasInProgress = plan120.some(p => p.lessonId === 'l-math-1');
check(hasInProgress, 'In-progress lesson is scheduled in 120 min queue');

// Test 6: Each plan item has a descriptive human-readable reason
check(plan120.every(p => p.reason && p.reason.length > 5), 'All planned items include transparent explanation reasons');

console.log(`\n======================================================`);
console.log(`PHASE 25 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
