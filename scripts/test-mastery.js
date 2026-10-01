// Automated test cases for Phase 11 Mastery Calculation
import assert from 'node:assert';

// Standalone mirror of calculateDeterministicMasteryScore for pure deterministic testing
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

  if (status === 'NOT STARTED' && totalStudyMinutes === 0 && quizBestScore === undefined && reviewCount === 0) {
    return 0;
  }

  const hasSevereBlocker = lastReviewOutcome === 'forgot' || (unclearTopicsCount > 1 && confidence === 'Low');

  // Level 4 (อธิบายและประยุกต์ได้)
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

  // Level 3 (ทำโจทย์/ใช้งานได้)
  if (
    status === 'COMPLETED' &&
    ((quizBestScore !== undefined && quizBestScore >= 70) ||
     (quizBestScore !== undefined && quizBestScore >= 60 && reviewCount >= 1 && lastReviewOutcome !== 'forgot')) &&
    confidence !== 'Low' &&
    !hasSevereBlocker
  ) {
    return 3;
  }

  // Level 2 (อธิบายพื้นฐานได้)
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

  // Level 1 (พอรู้ว่าคืออะไร)
  return 1;
}

console.log('--- Running Deterministic Mastery Formula Tests ---');

// Case 1: Brand new lesson
const case1 = calculateDeterministicMasteryScore({
  status: 'NOT STARTED',
  totalStudyMinutes: 0,
  confidence: 'Low',
  reviewCount: 0,
});
assert.strictEqual(case1, 0, 'Case 1 Failed: Unstarted lesson must be Level 0');
console.log('✓ Case 1 Passed: Unstarted lesson = Level 0 (ยังไม่เรียน)');

// Case 2: In-progress lesson, brief reading
const case2 = calculateDeterministicMasteryScore({
  status: 'IN PROGRESS',
  totalStudyMinutes: 15,
  confidence: 'Low',
  reviewCount: 0,
});
assert.strictEqual(case2, 1, 'Case 2 Failed: Brief in-progress reading must be Level 1');
console.log('✓ Case 2 Passed: Started study, low confidence = Level 1 (พอรู้ว่าคืออะไร)');

// Case 3: Completed lesson, but no quiz and low confidence
const case3 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 30,
  confidence: 'Low',
  reviewCount: 0,
  hasLearnedNotes: false,
});
assert.strictEqual(case3, 1, 'Case 3 Failed: Completed without validation must be Level 1');
console.log('✓ Case 3 Passed: Completed without quiz/notes/confidence = Level 1 (Separates Completion from Mastery)');

// Case 4: Completed lesson with 55% quiz score
const case4 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 60,
  quizBestScore: 55,
  confidence: 'Medium',
  reviewCount: 0,
});
assert.strictEqual(case4, 2, 'Case 4 Failed: Quiz 55% must be Level 2');
console.log('✓ Case 4 Passed: Quiz 55% + Medium confidence = Level 2 (อธิบายพื้นฐานได้)');

// Case 5: Completed lesson with 75% quiz score
const case5 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 90,
  quizBestScore: 75,
  quizLatestScore: 75,
  confidence: 'Medium',
  reviewCount: 0,
});
assert.strictEqual(case5, 3, 'Case 5 Failed: Quiz 75% must be Level 3');
console.log('✓ Case 5 Passed: Quiz 75% + Medium confidence = Level 3 (ทำโจทย์/ใช้งานได้)');

// Case 6: Completed lesson with 65% quiz score BUT passed review (remembered)
const case6 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 90,
  quizBestScore: 65,
  confidence: 'Medium',
  reviewCount: 1,
  lastReviewOutcome: 'remembered',
});
assert.strictEqual(case6, 3, 'Case 6 Failed: Quiz 65% + remembered review must advance to Level 3');
console.log('✓ Case 6 Passed: Quiz 65% + review remembered = Level 3 (ทำโจทย์/ใช้งานได้)');

// Case 7: High quiz 90% without reviews or notes
const case7 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 60,
  quizBestScore: 90,
  confidence: 'High',
  reviewCount: 0, // No spaced review verified yet
  hasLearnedNotes: false,
});
assert.strictEqual(case7, 3, 'Case 7 Failed: 90% without verified review retention cannot be Level 4');
console.log('✓ Case 7 Passed: Quiz 90% but no spaced review yet = Level 3 (Retention not yet verified)');

// Case 8: Mastered (Level 4)
const case8 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 120,
  quizBestScore: 92,
  quizLatestScore: 88,
  confidence: 'High',
  reviewCount: 2,
  lastReviewOutcome: 'remembered',
  hasLearnedNotes: true,
  unclearTopicsCount: 0,
});
assert.strictEqual(case8, 4, 'Case 8 Failed: High quiz + verified review + notes + confidence must be Level 4');
console.log('✓ Case 8 Passed: Quiz 92% + review verified + notes + high confidence = Level 4 (อธิบายและประยุกต์ได้)');

// Case 9: High score, but forgot on recent review
const case9 = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 120,
  quizBestScore: 95,
  confidence: 'High',
  reviewCount: 1,
  lastReviewOutcome: 'forgot', // Blocker!
  hasLearnedNotes: true,
});
assert.notStrictEqual(case9, 4, 'Case 9 Failed: Cannot be Level 4 if forgot on review');
assert.notStrictEqual(case9, 3, 'Case 9 Failed: Cannot be Level 3 if forgot on review');
console.log(`✓ Case 9 Passed: High quiz but forgot on recent review = downgraded to Level ${case9}`);

// Case 10: In-progress with 45+ mins and Medium confidence
const case10 = calculateDeterministicMasteryScore({
  status: 'IN PROGRESS',
  totalStudyMinutes: 50,
  confidence: 'Medium',
  reviewCount: 0,
});
assert.strictEqual(case10, 2, 'Case 10 Failed: In-progress with 50 mins and Medium confidence must be Level 2');
console.log('✓ Case 10 Passed: In-progress substantial study = Level 2 (อธิบายพื้นฐานได้)');

console.log('--- ALL 10 TEST CASES PASSED SUCCESSFULLY ---');
