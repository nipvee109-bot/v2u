// Automated test suite for Phase 13 Study Goal System
import assert from 'node:assert';

// Standalone mirror of calculateGoalProgress for pure validation
function calculateGoalProgress(goal, {
  lessons = [],
  learningSessionsHistory = [],
  sessions = [],
  reviewQueue = [],
  todayStr = '2026-10-01'
}) {
  const startDayStr = goal.startDate.includes('T') ? goal.startDate.split('T')[0] : goal.startDate;
  const targetDayStr = goal.targetDate.includes('T') ? goal.targetDate.split('T')[0] : goal.targetDate;

  const todayTime = new Date(todayStr).getTime();
  const targetTime = new Date(targetDayStr).getTime();
  const remainingDays = Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));

  let currentValue = 0;
  let recentActivityText;

  switch (goal.type) {
    case 'study_hours': {
      const completedLearning = learningSessionsHistory.filter((s) => {
        if (s.status !== 'completed' || !s.completedAt) return false;
        const d = s.completedAt.split('T')[0];
        if (d < startDayStr || d > targetDayStr) return false;
        if (goal.subjectId) {
          const l = lessons.find((les) => les.id === s.lessonId);
          return l?.subjectId === goal.subjectId;
        }
        return true;
      });

      const completedPlanner = sessions.filter((s) => {
        if (s.status !== 'completed') return false;
        const d = s.completedAt ? s.completedAt.split('T')[0] : s.date;
        if (d < startDayStr || d > targetDayStr) return false;
        if (goal.subjectId && s.subjectId !== goal.subjectId) return false;
        const alreadyInLearning = completedLearning.some(ls => ls.plannedSessionId === s.id);
        return !alreadyInLearning;
      });

      const minutesLearning = completedLearning.reduce((acc, s) => acc + Math.round((s.actualSeconds || 0) / 60), 0);
      const minutesPlanner = completedPlanner.reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes || 0), 0);
      const totalMinutes = minutesLearning + minutesPlanner;

      currentValue = Math.round((totalMinutes / 60) * 10) / 10;
      break;
    }

    case 'lessons_completed': {
      const completed = lessons.filter((l) => {
        if (l.status !== 'COMPLETED' || !l.completedAt) return false;
        const d = l.completedAt.split('T')[0];
        if (d < startDayStr || d > targetDayStr) return false;
        if (goal.subjectId && l.subjectId !== goal.subjectId) return false;
        return true;
      });
      currentValue = completed.length;
      break;
    }

    case 'subject_milestones': {
      const completed = lessons.filter((l) => {
        if (l.status !== 'COMPLETED' || !l.completedAt) return false;
        if (goal.subjectId && l.subjectId !== goal.subjectId) return false;
        if (goal.scope !== 'six_month') {
          const d = l.completedAt.split('T')[0];
          if (d < startDayStr || d > targetDayStr) return false;
        }
        return true;
      });
      currentValue = completed.length;
      break;
    }

    case 'review_consistency': {
      const reviewedItems = reviewQueue.filter((r) => {
        if (!r.lastReviewedAt) return false;
        const d = r.lastReviewedAt.split('T')[0];
        return d >= startDayStr && d <= targetDayStr;
      });
      const reviewSessions = sessions.filter((s) => {
        if (s.type !== 'review' || s.status !== 'completed') return false;
        const d = s.completedAt ? s.completedAt.split('T')[0] : s.date;
        return d >= startDayStr && d <= targetDayStr;
      });
      currentValue = reviewedItems.length + reviewSessions.length;
      break;
    }

    case 'quiz_target': {
      const allAttempts = [];
      lessons.forEach((l) => {
        if (goal.subjectId && l.subjectId !== goal.subjectId) return;
        (l.quizAttempts || []).forEach((a) => {
          const d = a.timestamp.split('T')[0];
          if (d >= startDayStr && d <= targetDayStr) allAttempts.push(a.score);
        });
      });
      if (goal.unit === '%') {
        currentValue = allAttempts.length > 0
          ? Math.round(allAttempts.reduce((a, b) => a + b, 0) / allAttempts.length)
          : 0;
      } else {
        currentValue = allAttempts.filter((score) => score >= 70).length;
      }
      break;
    }

    case 'custom':
    default: {
      currentValue = goal.customProgress ?? goal.currentValue ?? 0;
      break;
    }
  }

  // Progress percentage with QA zero values
  let progressPercent = 0;
  if (goal.targetValue > 0) {
    progressPercent = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));
  } else {
    progressPercent = currentValue > 0 ? 100 : 0;
  }

  const remainingValue = Math.max(0, Math.round((goal.targetValue - currentValue) * 10) / 10);

  // Status with QA completed & expired goals
  let status = 'in_progress';
  if (goal.targetValue > 0 && currentValue >= goal.targetValue) {
    status = 'completed';
  } else if (todayStr > targetDayStr) {
    status = 'expired';
  } else {
    status = 'in_progress';
  }

  return {
    currentValue,
    progressPercent,
    remainingValue,
    remainingDays,
    status,
  };
}

// ─────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────
console.log('Running Phase 13 Study Goal System Test Suite...\n');

let passedTests = 0;

// Test 1: Study hours auto-progress from real learning records
{
  const goal = {
    id: 'g1',
    title: 'Daily Study 2h',
    type: 'study_hours',
    scope: 'daily',
    targetValue: 2,
    currentValue: 0,
    unit: 'ชม.',
    startDate: '2026-10-01',
    targetDate: '2026-10-01',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    learningSessionsHistory: [
      {
        sessionId: 's1',
        lessonId: 'l1',
        status: 'completed',
        actualSeconds: 5400, // 90 mins = 1.5h
        completedAt: '2026-10-01T14:00:00.000Z',
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 1.5, 'Should calculate 1.5 study hours');
  assert.strictEqual(progress.progressPercent, 75, 'Progress should be 75%');
  assert.strictEqual(progress.remainingValue, 0.5, 'Remaining value should be 0.5h');
  assert.strictEqual(progress.status, 'in_progress', 'Status should be in_progress');
  console.log('PASS Test 1: Study hours auto-progress calculated accurately');
  passedTests++;
}

// Test 2: Lessons completed goal auto-progress
{
  const goal = {
    id: 'g2',
    title: 'Weekly 3 Lessons',
    type: 'lessons_completed',
    scope: 'weekly',
    targetValue: 3,
    currentValue: 0,
    unit: 'บท',
    startDate: '2026-09-28',
    targetDate: '2026-10-04',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    lessons: [
      { id: 'l1', status: 'COMPLETED', completedAt: '2026-09-29T10:00:00.000Z' },
      { id: 'l2', status: 'COMPLETED', completedAt: '2026-10-01T12:00:00.000Z' },
      { id: 'l3', status: 'NOT STARTED' },
      { id: 'l4', status: 'COMPLETED', completedAt: '2026-09-20T10:00:00.000Z' }, // outside range!
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 2, 'Should only count 2 lessons completed in range');
  assert.strictEqual(progress.progressPercent, 67, 'Progress should be 67%');
  assert.strictEqual(progress.remainingValue, 1, 'Remaining should be 1 lesson');
  console.log('PASS Test 2: Lessons completed goal calculated within date range');
  passedTests++;
}

// Test 3: Subject milestone goal (filtered by subject)
{
  const goal = {
    id: 'g3',
    title: 'Python 2 Lessons',
    type: 'subject_milestones',
    subjectId: 'programming',
    scope: 'monthly',
    targetValue: 2,
    currentValue: 0,
    unit: 'บท',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    lessons: [
      { id: 'l1', subjectId: 'programming', status: 'COMPLETED', completedAt: '2026-10-01T10:00:00.000Z' },
      { id: 'l2', subjectId: 'math', status: 'COMPLETED', completedAt: '2026-10-01T11:00:00.000Z' }, // different subject!
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 1, 'Should only count programming lessons');
  assert.strictEqual(progress.progressPercent, 50, 'Progress should be 50%');
  console.log('PASS Test 3: Subject milestone goal filtered by subjectId');
  passedTests++;
}

// Test 4: Review consistency goal
{
  const goal = {
    id: 'g4',
    title: 'Review 4 times',
    type: 'review_consistency',
    scope: 'weekly',
    targetValue: 4,
    currentValue: 0,
    unit: 'รอบ',
    startDate: '2026-09-28',
    targetDate: '2026-10-04',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    reviewQueue: [
      { id: 'r1', lastReviewedAt: '2026-09-29T10:00:00.000Z' },
      { id: 'r2', lastReviewedAt: '2026-10-01T08:00:00.000Z' },
    ],
    sessions: [
      { id: 's1', type: 'review', status: 'completed', completedAt: '2026-10-01T15:00:00.000Z' },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 3, 'Should count 3 review events');
  assert.strictEqual(progress.progressPercent, 75);
  console.log('PASS Test 4: Review consistency goal auto-calculated from reviews & sessions');
  passedTests++;
}

// Test 5: Quiz target goal (average score)
{
  const goal = {
    id: 'g5',
    title: 'Average Quiz 80%',
    type: 'quiz_target',
    scope: 'monthly',
    targetValue: 80,
    currentValue: 0,
    unit: '%',
    startDate: '2026-10-01',
    targetDate: '2026-10-31',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    lessons: [
      {
        id: 'l1',
        quizAttempts: [
          { score: 80, timestamp: '2026-10-01T09:00:00.000Z' },
          { score: 90, timestamp: '2026-10-01T16:00:00.000Z' },
        ],
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 85, 'Average score should be 85%');
  assert.strictEqual(progress.status, 'completed', 'Score 85% >= target 80% should mark goal completed');
  console.log('PASS Test 5: Quiz target goal average score calculation and auto-completion');
  passedTests++;
}

// Test 6: QA Edge Case - Completed goal transitions
{
  const goal = {
    id: 'g6',
    title: 'Completed Goal Test',
    type: 'study_hours',
    scope: 'daily',
    targetValue: 2,
    currentValue: 0,
    unit: 'ชม.',
    startDate: '2026-10-01',
    targetDate: '2026-10-01',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    learningSessionsHistory: [
      {
        sessionId: 's1',
        status: 'completed',
        actualSeconds: 7200, // 120 mins = 2h
        completedAt: '2026-10-01T18:00:00.000Z',
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 2);
  assert.strictEqual(progress.progressPercent, 100);
  assert.strictEqual(progress.remainingValue, 0);
  assert.strictEqual(progress.status, 'completed', 'Should be completed when target is met');
  console.log('PASS Test 6: QA Completed goal transition verified');
  passedTests++;
}

// Test 7: QA Edge Case - Expired goal
{
  const goal = {
    id: 'g7',
    title: 'Expired Yesterday Goal',
    type: 'study_hours',
    scope: 'daily',
    targetValue: 4,
    currentValue: 0,
    unit: 'ชม.',
    startDate: '2026-09-30',
    targetDate: '2026-09-30', // Yesterday!
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goal, {
    learningSessionsHistory: [
      {
        sessionId: 's1',
        status: 'completed',
        actualSeconds: 3600, // 1h (target was 4h)
        completedAt: '2026-09-30T10:00:00.000Z',
      },
    ],
    todayStr: '2026-10-01', // Today is past deadline
  });

  assert.strictEqual(progress.currentValue, 1);
  assert.strictEqual(progress.status, 'expired', 'Should be expired when past deadline and target not met');
  assert.ok(progress.remainingDays < 0, 'Remaining days should be negative for expired goal');
  console.log('PASS Test 7: QA Expired goal transition verified');
  passedTests++;
}

// Test 8: QA Edge Case - Zero values (no division by zero)
{
  const goalZeroTarget = {
    id: 'g8',
    title: 'Zero Target Goal',
    type: 'custom',
    scope: 'daily',
    targetValue: 0,
    currentValue: 0,
    unit: 'ชม.',
    startDate: '2026-10-01',
    targetDate: '2026-10-01',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(goalZeroTarget, { todayStr: '2026-10-01' });
  assert.strictEqual(progress.progressPercent, 0, 'Zero target should not produce NaN or error');
  assert.strictEqual(progress.remainingValue, 0);
  console.log('PASS Test 8: QA Zero values handled safely');
  passedTests++;
}

// Test 9: QA Edge Case - Date edge cases (startDate === targetDate and future goal)
{
  const futureGoal = {
    id: 'g9',
    title: 'Future Goal',
    type: 'study_hours',
    scope: 'weekly',
    targetValue: 10,
    currentValue: 0,
    unit: 'ชม.',
    startDate: '2026-10-10',
    targetDate: '2026-10-17',
    status: 'in_progress',
  };

  const progress = calculateGoalProgress(futureGoal, {
    learningSessionsHistory: [
      {
        sessionId: 's1',
        status: 'completed',
        actualSeconds: 7200,
        completedAt: '2026-10-01T12:00:00.000Z', // Today (before future goal starts)
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(progress.currentValue, 0, 'Should not count sessions before future goal start');
  assert.strictEqual(progress.status, 'in_progress');
  assert.strictEqual(progress.remainingDays, 16);
  console.log('PASS Test 9: QA Future date range edge cases handled properly');
  passedTests++;
}

console.log(`\nAll ${passedTests} test cases passed successfully!`);
