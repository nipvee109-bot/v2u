/**
 * Test Suite: Phase 33 — Learn → Test → Master Flow
 */

import assert from 'node:assert';

function calculateDeterministicMasteryScore(params) {
  const {
    status,
    totalStudyMinutes,
    quizBestScore,
    quizLatestScore,
    confidence,
    reviewCount,
    lastReviewOutcome,
    hasLearnedNotes = false,
    unclearTopicsCount = 0,
  } = params;

  // Signal 0: Has not started
  if (status === 'NOT STARTED' && totalStudyMinutes === 0 && quizBestScore === undefined && reviewCount === 0) {
    return 0;
  }

  // Blocker check
  const hasSevereBlocker = lastReviewOutcome === 'forgot' || (unclearTopicsCount > 1 && confidence === 'Low');

  // Level 4
  if (
    status === 'COMPLETED' &&
    quizBestScore !== undefined &&
    quizBestScore >= 85 &&
    (quizLatestScore === undefined || quizLatestScore >= 75) &&
    reviewCount >= 1 &&
    lastReviewOutcome !== 'forgot' &&
    lastReviewOutcome !== 'unsure' &&
    (confidence === 'High' || (confidence === 'Medium' && quizBestScore >= 90)) &&
    hasLearnedNotes &&
    !hasSevereBlocker
  ) {
    return 4;
  }

  // Level 3
  if (
    status === 'COMPLETED' &&
    ((quizBestScore !== undefined && quizBestScore >= 70) ||
     (quizBestScore !== undefined && quizBestScore >= 60 && reviewCount >= 1 && lastReviewOutcome !== 'forgot')) &&
    confidence !== 'Low' &&
    !hasSevereBlocker
  ) {
    return 3;
  }

  // Level 2
  if (
    (status === 'COMPLETED' &&
      ((quizBestScore !== undefined && quizBestScore >= 50) ||
       confidence !== 'Low' ||
       reviewCount >= 1 ||
       hasLearnedNotes)) ||
    (status === 'IN PROGRESS' && quizBestScore !== undefined && quizBestScore >= 50) ||
    (status === 'IN PROGRESS' && totalStudyMinutes >= 45 && confidence !== 'Low')
  ) {
    return 2;
  }

  // Level 1
  return 1;
}

function computePostLearningReviewSchedule(quizScore, stillUnclearNotes) {
  const isLowQuiz = quizScore !== undefined && quizScore < 70;
  const hasUnclear = Boolean(stillUnclearNotes && stillUnclearNotes.trim());

  let reason = 'spaced_repetition';
  let priority = 'Medium';
  let intervalDays = 3;

  if (isLowQuiz) {
    reason = 'low_quiz_score';
    priority = 'High';
    intervalDays = 1;
  } else if (hasUnclear) {
    reason = 'unclear_topic';
    priority = 'High';
    intervalDays = 1;
  } else if (quizScore !== undefined && quizScore >= 90) {
    intervalDays = 3;
  } else {
    intervalDays = 1;
  }

  return { reason, priority, intervalDays };
}

console.log('=== Running Phase 33: Learn → Test → Master Flow Tests ===\n');

// Test 1: Baseline not started = Level 0
const s0 = calculateDeterministicMasteryScore({
  status: 'NOT STARTED',
  totalStudyMinutes: 0,
  confidence: 'Low',
  reviewCount: 0,
});
assert.strictEqual(s0, 0, 'Unstarted lesson is Mastery Level 0');
console.log('✔ Test 1: Unstarted lesson begins at Mastery Level 0');

// Test 2: In-progress or completed with low confidence / no notes = Level 1
const s1 = calculateDeterministicMasteryScore({
  status: 'IN PROGRESS',
  totalStudyMinutes: 20,
  confidence: 'Low',
  reviewCount: 0,
});
assert.strictEqual(s1, 1, 'In-progress minimal study is Mastery Level 1');
console.log('✔ Test 2: Initial study progresses to Mastery Level 1');

// Test 3: Completed lesson with learned notes & medium confidence = Level 2
const s2 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 45,
  confidence: 'Medium',
  reviewCount: 0,
  hasLearnedNotes: true,
});
assert.strictEqual(s2, 2, 'Completed with summary notes and Medium confidence reaches Mastery Level 2');
console.log('✔ Test 3: Completed with summary notes reaches Mastery Level 2');

// Test 4: Completed with Quiz >= 70% & Medium confidence = Level 3
const s3 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 60,
  quizBestScore: 75,
  confidence: 'Medium',
  reviewCount: 0,
  hasLearnedNotes: true,
});
assert.strictEqual(s3, 3, 'Quiz >= 70% achieves Mastery Level 3');
console.log('✔ Test 4: Quiz >= 70% and confidence achieves Mastery Level 3');

// Test 5: Completed with Quiz >= 85%, reviewCount >= 1, High confidence, learned notes = Level 4
const s4 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 120,
  quizBestScore: 90,
  quizLatestScore: 90,
  confidence: 'High',
  reviewCount: 1,
  lastReviewOutcome: 'remembered',
  hasLearnedNotes: true,
});
assert.strictEqual(s4, 4, 'Full retention criteria achieves Mastery Level 4');
console.log('✔ Test 5: Verified spaced retention and high quiz achieves Mastery Level 4');

// Test 6: Severe blocker prevents Level 3/4
const sBlocked = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 90,
  quizBestScore: 85,
  confidence: 'Low',
  reviewCount: 1,
  lastReviewOutcome: 'forgot', // Blocker!
  hasLearnedNotes: true,
});
assert(sBlocked <= 2, 'Severe retention blocker limits mastery to <= 2');
console.log('✔ Test 6: Retention blocker prevents premature Mastery level promotion');

// Test 7: Automatic Spaced Review scheduling when unclear notes present
const schedUnclear = computePostLearningReviewSchedule(85, 'ยังงงเรื่อง recursion stack limit');
assert.strictEqual(schedUnclear.reason, 'unclear_topic');
assert.strictEqual(schedUnclear.priority, 'High');
assert.strictEqual(schedUnclear.intervalDays, 1);
console.log('✔ Test 7: Unclear notes automatically schedules next-day High priority review');

// Test 8: Automatic Spaced Review scheduling when quiz score is low (< 70%)
const schedLowQuiz = computePostLearningReviewSchedule(55, '');
assert.strictEqual(schedLowQuiz.reason, 'low_quiz_score');
assert.strictEqual(schedLowQuiz.priority, 'High');
assert.strictEqual(schedLowQuiz.intervalDays, 1);
console.log('✔ Test 8: Low quiz score schedules 1-day remediation review');

// Test 9: High score clean session schedules standard spaced repetition
const schedClean = computePostLearningReviewSchedule(95, '');
assert.strictEqual(schedClean.reason, 'spaced_repetition');
assert.strictEqual(schedClean.intervalDays, 3);
console.log('✔ Test 9: Clean mastery session schedules 3-day spaced repetition');

console.log('\nAll 9/9 Phase 33 tests passed successfully!\n');
