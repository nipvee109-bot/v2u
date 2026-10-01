/**
 * Test Suite: Phase 34 — Review Room & Spaced Repetition Engine
 */

import assert from 'node:assert';

function computeNextReviewDate(currentReviewCount, outcome) {
  let nextReviewCount = currentReviewCount;
  let intervalDays = 1;
  const now = new Date();

  switch (outcome) {
    case 'remembered': {
      nextReviewCount = currentReviewCount + 1;
      if (nextReviewCount === 1) intervalDays = 3;
      else if (nextReviewCount === 2) intervalDays = 7;
      else if (nextReviewCount === 3) intervalDays = 14;
      else intervalDays = 30;
      break;
    }
    case 'partially': {
      nextReviewCount = currentReviewCount + 1;
      if (nextReviewCount === 1) intervalDays = 1;
      else if (nextReviewCount === 2) intervalDays = 3;
      else if (nextReviewCount === 3) intervalDays = 7;
      else if (nextReviewCount === 4) intervalDays = 14;
      else intervalDays = 30;
      break;
    }
    case 'unsure': {
      nextReviewCount = Math.max(0, currentReviewCount - 1);
      intervalDays = currentReviewCount > 1 ? 3 : 1;
      break;
    }
    case 'forgot': {
      nextReviewCount = 0;
      intervalDays = 1;
      break;
    }
  }

  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    nextReviewAt: nextDate.toISOString(),
    nextReviewCount,
    intervalDays,
  };
}

console.log('=== Running Phase 34: Review Room & Spaced Repetition Tests ===\n');

// Test 1: Spaced expansion on 'remembered'
const r1 = computeNextReviewDate(0, 'remembered');
assert.strictEqual(r1.nextReviewCount, 1);
assert.strictEqual(r1.intervalDays, 3, 'First remembered review sets 3 day interval');

const r2 = computeNextReviewDate(1, 'remembered');
assert.strictEqual(r2.nextReviewCount, 2);
assert.strictEqual(r2.intervalDays, 7, 'Second remembered review sets 7 day interval');

const r3 = computeNextReviewDate(2, 'remembered');
assert.strictEqual(r3.nextReviewCount, 3);
assert.strictEqual(r3.intervalDays, 14, 'Third remembered review sets 14 day interval');

const r4 = computeNextReviewDate(3, 'remembered');
assert.strictEqual(r4.nextReviewCount, 4);
assert.strictEqual(r4.intervalDays, 30, 'Fourth remembered review sets 30 day interval');
console.log('✔ Test 1: Remembered outcomes expand spaced intervals accurately (3 -> 7 -> 14 -> 30 days)');

// Test 2: 'partially' outcome progression
const p1 = computeNextReviewDate(0, 'partially');
assert.strictEqual(p1.nextReviewCount, 1);
assert.strictEqual(p1.intervalDays, 1);

const p2 = computeNextReviewDate(1, 'partially');
assert.strictEqual(p2.nextReviewCount, 2);
assert.strictEqual(p2.intervalDays, 3);
console.log('✔ Test 2: Partially remembered outcomes progress with cautious intervals');

// Test 3: 'unsure' outcome penalizes streak
const u1 = computeNextReviewDate(3, 'unsure');
assert.strictEqual(u1.nextReviewCount, 2, 'Unsure decrements reviewCount');
assert.strictEqual(u1.intervalDays, 3);
console.log('✔ Test 3: Unsure outcomes step back review count gracefully');

// Test 4: 'forgot' outcome resets completely
const f1 = computeNextReviewDate(4, 'forgot');
assert.strictEqual(f1.nextReviewCount, 0, 'Forgot resets count to 0');
assert.strictEqual(f1.intervalDays, 1, 'Forgot schedules review for tomorrow (1 day)');
console.log('✔ Test 4: Forgot outcome resets streak to 0 and schedules next-day remediation');

// Test 5: Queue item status mapping
function determineQueueStatus(outcome) {
  return outcome === 'forgot' ? 'pending' : 'completed';
}
assert.strictEqual(determineQueueStatus('remembered'), 'completed');
assert.strictEqual(determineQueueStatus('partially'), 'completed');
assert.strictEqual(determineQueueStatus('unsure'), 'completed');
assert.strictEqual(determineQueueStatus('forgot'), 'pending', 'Forgot keeps queue status pending');
console.log('✔ Test 5: Review item status transitions correctly on completion vs forgot');

// Test 6: Virtual Review Item generation when opening by lesson ID
function resolveReviewRoomItem(paramId, reviewQueue, lessons) {
  const foundItem = reviewQueue.find((r) => r.id === paramId);
  if (foundItem) {
    const foundLesson = lessons.find((l) => l.id === foundItem.lessonId);
    return { reviewItem: foundItem, lesson: foundLesson || null };
  }
  const foundLesson = lessons.find((l) => l.id === paramId);
  if (foundLesson) {
    const existing = reviewQueue.find((r) => r.lessonId === foundLesson.id && r.status !== 'completed');
    if (existing) return { reviewItem: existing, lesson: foundLesson };
    return {
      reviewItem: {
        id: `virtual-${foundLesson.id}`,
        lessonId: foundLesson.id,
        topic: foundLesson.title,
        status: 'pending',
        priority: 'Medium',
        reviewCount: foundLesson.reviewCount || 0,
      },
      lesson: foundLesson,
    };
  }
  return { reviewItem: null, lesson: null };
}

const mockLessons = [{ id: 'les-py', title: 'Python Functions', reviewCount: 1 }];
const mockQueue = [{ id: 'rev-1', lessonId: 'les-py', status: 'pending' }];

// Resolve by reviewItemId
const res1 = resolveReviewRoomItem('rev-1', mockQueue, mockLessons);
assert.strictEqual(res1.reviewItem.id, 'rev-1');
assert.strictEqual(res1.lesson.id, 'les-py');

// Resolve by lessonId directly
const res2 = resolveReviewRoomItem('les-py', [], mockLessons);
assert(res2.reviewItem.id.startsWith('virtual-'));
assert.strictEqual(res2.lesson.id, 'les-py');
console.log('✔ Test 6: Direct navigation by reviewItemId or lessonId resolved seamlessly');

console.log('\nAll Phase 34 Review Room tests passed successfully!\n');
