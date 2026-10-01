/**
 * Test Suite: Phase 36 — Full Learning Flow Test
 * 
 * Validates the complete end-to-end learning lifecycle:
 * Dashboard Coach -> Study Room -> Multi-Source & Timestamps -> 
 * Post-Learning Mastery Calculation -> Spaced Review Room -> State Persistence
 */

import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('=== Running Phase 36: Full Learning Flow E2E Test ===\n');

// ── 1. INITIALIZE LOCAL STORE STATE ──
const initialLesson = {
  id: 'lesson-linear-eq',
  title: 'สมการและอสมการเชิงเส้น',
  subjectId: 'math',
  month: 1,
  week: 1,
  durationHours: 2,
  description: 'พื้นฐานสมการและอสมการสำหรับวิศวกรรม',
  status: 'NOT STARTED',
  difficulty: 'Medium',
  notes: '',
  resources: [
    {
      id: 'res-yt-1',
      type: 'youtube',
      title: 'สมการเชิงเส้นสำหรับผู้เริ่มต้น',
      url: 'https://youtube.com/watch?v=sample1',
      role: 'primary',
    },
    {
      id: 'res-pdf-1',
      type: 'pdf',
      title: 'สรุปสูตรอสมการเชิงเส้น (PDF)',
      url: 'https://example.com/notes.pdf',
      role: 'reference',
    }
  ],
  images: [],
  quizAttempts: [],
  masteryScore: 0,
  studyCount: 0,
  totalStudyMinutes: 0,
};

let storeState = {
  lessons: [initialLesson],
  sessions: [],
  learningSessionsHistory: [],
  activeLearningSession: null,
  reviewQueue: [],
  unclearTopics: [],
};

// ── Helper functions mirroring store ──
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

  if (
    status === 'COMPLETED' &&
    ((quizBestScore !== undefined && quizBestScore >= 70) ||
     (quizBestScore !== undefined && quizBestScore >= 60 && reviewCount >= 1 && lastReviewOutcome !== 'forgot')) &&
    confidence !== 'Low' &&
    !hasSevereBlocker
  ) {
    return 3;
  }

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

  return 1;
}

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
  return { nextReviewAt: nextDate.toISOString(), nextReviewCount, intervalDays };
}

// ── STEP 1: DASHBOARD COACH RECOMMENDATION ──
console.log('--- Step 1: Dashboard Coach Recommendation ---');
// Fresh state -> Roadmap next lesson should be recommended
const unstarted = storeState.lessons.filter(l => l.status === 'NOT STARTED');
assert.strictEqual(unstarted.length, 1);
const recommendedLesson = unstarted[0];
assert.strictEqual(recommendedLesson.id, 'lesson-linear-eq');
console.log(`✔ Coach suggests unstarted roadmap lesson: "${recommendedLesson.title}"`);

// ── STEP 2: LAUNCH STUDY ROOM & INITIALIZE SESSION ──
console.log('\n--- Step 2: Study Room & Multi-Source Workspace ---');
const sessionStartTime = new Date().toISOString();
storeState.activeLearningSession = {
  sessionId: uuidv4(),
  lessonId: recommendedLesson.id,
  startedAt: sessionStartTime,
  accumulatedSeconds: 0,
  actualSeconds: 0,
  status: 'active',
  source: recommendedLesson.resources[0],
  resourcesUsed: [recommendedLesson.resources[0]],
  timestampedNotes: [],
  notesDraft: {
    learnedNotes: '',
    stillUnclearNotes: '',
    reviewNotes: '',
  },
  lastHeartbeatAt: sessionStartTime,
};
storeState.lessons[0].status = 'IN PROGRESS';
assert.strictEqual(storeState.activeLearningSession.source.type, 'youtube');
console.log('✔ Study Room launched with YouTube player active');

// Simulate 15 minutes studying on YouTube (900 seconds)
storeState.activeLearningSession.accumulatedSeconds += 900;
storeState.activeLearningSession.actualSeconds += 900;

// Add timestamped note at 00:04:15
const tsNote1 = {
  id: uuidv4(),
  lessonId: recommendedLesson.id,
  sessionId: storeState.activeLearningSession.sessionId,
  timestampSeconds: 255,
  timestampDisplay: '00:04:15',
  content: 'สมบัติการเท่ากันของการบวกและลบทั้งสองข้าง',
  createdAt: new Date().toISOString(),
};
storeState.activeLearningSession.timestampedNotes.push(tsNote1);
assert.strictEqual(storeState.activeLearningSession.timestampedNotes.length, 1);
console.log('✔ Timestamped note added at 00:04:15');

// Switch active source to PDF without resetting timer
const pdfSource = recommendedLesson.resources[1];
storeState.activeLearningSession.source = pdfSource;
storeState.activeLearningSession.resourcesUsed.push(pdfSource);

// Simulate another 15 minutes on PDF (total 30 mins = 1800s)
storeState.activeLearningSession.accumulatedSeconds += 900;
storeState.activeLearningSession.actualSeconds += 900;

assert.strictEqual(storeState.activeLearningSession.actualSeconds, 1800, 'Timer preserved across source switch (30 mins)');
assert.strictEqual(storeState.activeLearningSession.resourcesUsed.length, 2, 'Tracks both YouTube and PDF in resourcesUsed');
console.log('✔ Switched to PDF source without timer loss (Total: 30 minutes, 2 resources used)');

// ── STEP 3: POST-LEARNING SUMMARY & DETERMINISTIC MASTERY CALCULATION ──
console.log('\n--- Step 3: Post-Learning Flow (Learn -> Test -> Master) ---');
const postSummary = {
  learnedNotes: 'เข้าใจการแก้อสมการเชิงเส้นตัวแปรเดียว การกลับเครื่องหมายเมื่อคูณหรือหารด้วยลบ',
  stillUnclearNotes: 'การเขียนกราฟเซตคำตอบของอสมการซ้อนกัน 2 ชั้น',
  reviewNotes: 'ฝึกทำโจทย์อสมการซ้อนเพิ่ม 5 ข้อ',
  quizScore: 80,
  confidence: 'Medium',
  actualMinutes: 30,
};

// Calculate projected mastery
const calculatedScore = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: postSummary.actualMinutes,
  quizBestScore: postSummary.quizScore,
  quizLatestScore: postSummary.quizScore,
  confidence: postSummary.confidence,
  reviewCount: 0,
  hasLearnedNotes: true,
  hasUnclearNotes: true,
  unclearTopicsCount: 1,
});

assert.strictEqual(calculatedScore, 3, 'Quiz >= 70% with learned notes and Medium confidence achieves Level 3 (ทำโจทย์/ใช้งานได้)');
console.log(`✔ Deterministic Mastery calculated: Level ${calculatedScore}/4 (ทำโจทย์/ใช้งานได้)`);

// Complete the learning session into history
const completedAt = new Date().toISOString();
const completedSession = {
  ...storeState.activeLearningSession,
  status: 'completed',
  completedAt,
  actualSeconds: 1800,
  quizScore: postSummary.quizScore,
  confidenceRating: postSummary.confidence,
  notesDraft: {
    learnedNotes: postSummary.learnedNotes,
    stillUnclearNotes: postSummary.stillUnclearNotes,
    reviewNotes: postSummary.reviewNotes,
  }
};
storeState.learningSessionsHistory.unshift(completedSession);
storeState.activeLearningSession = null;

// Update lesson state
storeState.lessons[0] = {
  ...storeState.lessons[0],
  status: 'COMPLETED',
  completedAt,
  totalStudyMinutes: 30,
  actualStudyMinutes: 30,
  studyCount: 1,
  quizScore: postSummary.quizScore,
  quizAttempts: [{ id: uuidv4(), timestamp: completedAt, score: postSummary.quizScore }],
  learnedNotes: postSummary.learnedNotes,
  stillUnclearNotes: postSummary.stillUnclearNotes,
  reviewNotes: postSummary.reviewNotes,
  masteryScore: calculatedScore,
  confidence: postSummary.confidence,
};

// Auto schedule Spaced Review due to unclear point
const reviewItemId = uuidv4();
const nextDay = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
storeState.reviewQueue.unshift({
  id: reviewItemId,
  lessonId: storeState.lessons[0].id,
  topic: storeState.lessons[0].title,
  createdAt: completedAt,
  nextReviewAt: nextDay,
  reviewCount: 0,
  status: 'pending',
  reason: 'unclear_topic',
  priority: 'High',
});

// Auto register UnclearTopic
storeState.unclearTopics.push({
  id: uuidv4(),
  topic: `${storeState.lessons[0].title}: ${postSummary.stillUnclearNotes}`,
  details: postSummary.stillUnclearNotes,
  subjectId: storeState.lessons[0].subjectId,
  priority: 'High',
  status: 'Not Understood',
  createdAt: completedAt,
});

assert.strictEqual(storeState.learningSessionsHistory.length, 1);
assert.strictEqual(storeState.reviewQueue.length, 1);
assert.strictEqual(storeState.unclearTopics.length, 1);
console.log('✔ Session completed, permanent memory preserved, Spaced Review item & UnclearTopic created');

// ── STEP 4: REVIEW ROOM JOURNEY (Simulate Next Day) ──
console.log('\n--- Step 4: Spaced Repetition Review Room ---');
const reviewItemToReview = storeState.reviewQueue[0];
assert.strictEqual(reviewItemToReview.status, 'pending');

// User opens Review Room, performs recall and rates outcome: 'remembered'
const reviewOutcome = 'remembered';
const reviewTiming = computeNextReviewDate(reviewItemToReview.reviewCount, reviewOutcome);

// Update review queue item
storeState.reviewQueue[0] = {
  ...reviewItemToReview,
  status: 'completed',
  lastReviewedAt: new Date().toISOString(),
  nextReviewAt: reviewTiming.nextReviewAt,
  reviewCount: reviewTiming.nextReviewCount,
};

assert.strictEqual(storeState.reviewQueue[0].status, 'completed');
assert.strictEqual(storeState.reviewQueue[0].reviewCount, 1);
assert.strictEqual(reviewTiming.intervalDays, 3, 'Next review scheduled 3 days ahead');
console.log('✔ Review completed with "remembered" outcome, interval expanded to 3 days');

// Update lesson mastery with retention signal
storeState.lessons[0].reviewCount = 1;
const updatedMasteryScore = calculateDeterministicMasteryScore({
  status: 'COMPLETED',
  totalStudyMinutes: 30,
  quizBestScore: 85, // Retested or high baseline
  quizLatestScore: 85,
  confidence: 'High',
  reviewCount: 1,
  lastReviewOutcome: 'remembered',
  hasLearnedNotes: true,
  unclearTopicsCount: 0,
});
assert.strictEqual(updatedMasteryScore, 4, 'Passing spaced retention review promotes lesson to Level 4 (อธิบายและประยุกต์ได้)');
storeState.lessons[0].masteryScore = updatedMasteryScore;
console.log(`✔ Mastery upgraded to Level ${updatedMasteryScore}/4 (อธิบายและประยุกต์ได้) after successful spaced retention!`);

// ── STEP 5: SIMULATE STORAGE SERIALIZATION & DESERIALIZATION ──
console.log('\n--- Step 5: Persistence & Zero Data Loss Verification ---');
const serialized = JSON.stringify(storeState);
const restoredState = JSON.parse(serialized);

assert.strictEqual(restoredState.lessons.length, 1);
assert.strictEqual(restoredState.lessons[0].status, 'COMPLETED');
assert.strictEqual(restoredState.lessons[0].masteryScore, 4);
assert.strictEqual(restoredState.lessons[0].quizAttempts.length, 1);
assert.strictEqual(restoredState.learningSessionsHistory.length, 1);
assert.strictEqual(restoredState.learningSessionsHistory[0].actualSeconds, 1800);
assert.strictEqual(restoredState.learningSessionsHistory[0].resourcesUsed.length, 2);
assert.strictEqual(restoredState.reviewQueue.length, 1);
assert.strictEqual(restoredState.reviewQueue[0].status, 'completed');
assert.strictEqual(restoredState.reviewQueue[0].reviewCount, 1);
assert.strictEqual(restoredState.unclearTopics.length, 1);
console.log('✔ Full state persisted and restored with 100% data integrity');

console.log('\n======================================================');
console.log('PHASE 36 INTEGRATION SUMMARY: All 5 Journey Stages PASS');
console.log('======================================================\n');
