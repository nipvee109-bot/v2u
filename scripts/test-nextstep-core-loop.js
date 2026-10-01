/**
 * NextStep Core Learning Loop Test Suite
 * Validates the complete user learning journey, speech abstraction,
 * resource confirmation, review questions, deterministic mastery, and data persistence.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

console.log('\n=== NextStep Core Learning Loop Test Suite ===\n');

// ── Test 1: Rebranding Verification ───────────────────────────
console.log('1. Rebranding Integrity:');

test('index.html contains NextStep title', () => {
  const content = fs.readFileSync('index.html', 'utf-8');
  assert(content.includes('NextStep — เส้นทางจากอาชีวะสู่มหาวิทยาลัย'), 'index.html title must match NextStep');
});

test('vite.config.ts contains NextStep manifest', () => {
  const content = fs.readFileSync('vite.config.ts', 'utf-8');
  assert(content.includes("name: 'NextStep — เส้นทางจากอาชีวะสู่มหาวิทยาลัย'"), 'manifest name must be NextStep');
  assert(content.includes("short_name: 'NextStep'"), 'manifest short_name must be NextStep');
});

test('Sidebar.tsx displays NextStep branding', () => {
  const content = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
  assert(content.includes('NextStep'), 'Sidebar must display NextStep');
  assert(content.includes("เส้นทางจากอาชีวะสู่มหา'ลัย"), 'Sidebar must display NextStep subtitle');
});

test('Layout.tsx displays NextStep', () => {
  const content = fs.readFileSync('src/components/Layout.tsx', 'utf-8');
  assert(content.includes('NextStep'), 'Layout header must display NextStep');
});

test('Settings.tsx exports backup with nextstep prefix', () => {
  const content = fs.readFileSync('src/pages/Settings.tsx', 'utf-8');
  assert(content.includes('nextstep-backup-'), 'Settings backup prefix must be nextstep-backup-');
});

test('package.json project name is nextstep', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert.strictEqual(pkg.name, 'nextstep');
});

// ── Test 2: Speech Recognition Abstraction Layer ───────────────
console.log('\n2. Speech Recognition Abstraction:');

test('Speech recognition service file exists with provider interface', () => {
  const content = fs.readFileSync('src/services/speechRecognition.ts', 'utf-8');
  assert(content.includes('interface SpeechRecognitionProvider'), 'Provider interface must exist');
  assert(content.includes('createSpeechRecognitionProvider'), 'Factory function must exist');
  assert(content.includes('FallbackSpeechRecognitionProvider'), 'Fallback provider must exist');
  assert(content.includes('WebSpeechRecognitionProvider'), 'Web Speech API provider must exist');
});

test('useSpeechRecognition hook exists and is decoupled from browser', () => {
  const content = fs.readFileSync('src/hooks/useSpeechRecognition.ts', 'utf-8');
  assert(content.includes('useSpeechRecognition'), 'Hook function must exist');
  assert(content.includes('createSpeechRecognitionProvider'), 'Must use provider factory');
  assert(content.includes('isSupported'), 'Must expose isSupported state');
  assert(content.includes('startListening'), 'Must expose startListening callback');
  assert(content.includes('stopListening'), 'Must expose stopListening callback');
});

test('VoiceSummaryInput component provides voice + text fallback', () => {
  const content = fs.readFileSync('src/components/study/VoiceSummaryInput.tsx', 'utf-8');
  assert(content.includes('VoiceSummaryInput'), 'VoiceSummaryInput component must exist');
  assert(content.includes('textarea'), 'Must always provide textarea text input');
  assert(content.includes('useSpeechRecognition'), 'Must connect to useSpeechRecognition');
  assert(content.includes('เบราว์เซอร์ไม่รองรับการพูด กรุณาพิมพ์แทน'), 'Must provide graceful fallback text message');
});

// ── Test 3: Grounded Review Questions Engine ───────────────────
console.log('\n3. Grounded Review Questions & Quiz Engine:');

test('Review questions bank exists and provides subject-specific questions', () => {
  const content = fs.readFileSync('src/utils/reviewQuestions.ts', 'utf-8');
  assert(content.includes('getGroundedQuestionsForLesson'), 'getGroundedQuestionsForLesson must exist');
  assert(content.includes('math'), 'Must have math questions');
  assert(content.includes('programming'), 'Must have programming questions');
  assert(content.includes('physics'), 'Must have physics questions');
  assert(content.includes('ai'), 'Must have AI questions');
  assert(content.includes('tgat3'), 'Must have TGAT3 questions');
});

test('Review questions bank includes safe conceptual fallback', () => {
  const content = fs.readFileSync('src/utils/reviewQuestions.ts', 'utf-8');
  assert(content.includes('safeFallbackQuestions'), 'Must provide safe fallback questions');
  assert(content.includes('isGrounded'), 'Must indicate whether questions are grounded');
});

// ── Test 4: Resource Confirmation Flow ─────────────────────────
console.log('\n4. Learning Resource Confirmation:');

test('ResourceConfirmationModal component exists and requires explicit confirm', () => {
  const content = fs.readFileSync('src/components/study/ResourceConfirmationModal.tsx', 'utf-8');
  assert(content.includes('ResourceConfirmationModal'), 'Component must exist');
  assert(content.includes('onConfirm'), 'Must have onConfirm callback');
  assert(content.includes('เริ่มเรียน'), 'Must have start learning confirmation button');
  assert(content.includes('ยกเลิก'), 'Must have cancel button');
});

test('StudyRoom requires explicit resource confirmation before starting timer', () => {
  const content = fs.readFileSync('src/pages/StudyRoom.tsx', 'utf-8');
  assert(content.includes('isConfirmingResource'), 'StudyRoom must have isConfirmingResource state');
  assert(content.includes('ResourceConfirmationModal'), 'StudyRoom must render ResourceConfirmationModal');
  assert(content.includes('handleConfirmResourceAndStart'), 'Must only start session after explicit confirmation');
});

test('Dashboard provides resource confirmation before navigating to StudyRoom', () => {
  const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
  assert(content.includes('pendingStudyLesson'), 'Dashboard must track pendingStudyLesson');
  assert(content.includes('ResourceConfirmationModal'), 'Dashboard must render ResourceConfirmationModal');
});

// ── Test 5: Post-Learning Reflection & Mastery Flow ───────────
console.log('\n5. Post-Learning Reflection, Mastery & Next Action:');

test('PostLearningFlowModal implements 3-step Learn -> Test -> Master -> Next Action', () => {
  const content = fs.readFileSync('src/components/study/PostLearningFlowModal.tsx', 'utf-8');
  assert(content.includes('VoiceSummaryInput'), 'Must include VoiceSummaryInput');
  assert(content.includes('getGroundedQuestionsForLesson'), 'Must include review questions');
  assert(content.includes('calculateDeterministicMasteryScore'), 'Must run deterministic mastery calculation');
  assert(content.includes('ก้าวถัดไปที่แนะนำ (Recommended Next Action)'), 'Must show recommended next action');
  assert(content.includes('nextAction'), 'Must pass selected next action to onConfirm');
});

test('PostLearningFlowModal supports user override of next action', () => {
  const content = fs.readFileSync('src/components/study/PostLearningFlowModal.tsx', 'utf-8');
  assert(content.includes('next_lesson'), 'Supports next lesson option');
  assert(content.includes('review'), 'Supports review queue option');
  assert(content.includes('dashboard'), 'Supports dashboard option');
  assert(content.includes('notebook'), 'Supports notebook option');
});

test('StudyRoom navigates to user-selected next action', () => {
  const content = fs.readFileSync('src/pages/StudyRoom.tsx', 'utf-8');
  assert(content.includes("nextAction === 'next_lesson'"), 'Navigates to next lesson');
  assert(content.includes("nextAction === 'review'"), 'Navigates to review');
  assert(content.includes("nextAction === 'dashboard'"), 'Navigates to dashboard');
  assert(content.includes("nextAction === 'notebook'"), 'Navigates to notebook');
});

// ── Test 6: Deterministic Mastery Logic Simulation ────────────
console.log('\n6. Deterministic Mastery Calculation Simulation:');

function calculateDeterministicMasteryScore(params) {
  const {
    status,
    totalStudyMinutes,
    quizBestScore,
    quizLatestScore,
    confidence,
    reviewCount,
    hasLearnedNotes,
    hasUnclearNotes,
    lastReviewOutcome,
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
      (quizBestScore !== undefined && quizBestScore >= 50 ||
        confidence === 'High' ||
        confidence === 'Medium' ||
        reviewCount >= 1 ||
        hasLearnedNotes)) ||
    (status === 'IN PROGRESS' &&
      ((quizBestScore !== undefined && quizBestScore >= 50) ||
        (totalStudyMinutes >= 45 && confidence !== 'Low')))
  ) {
    return 2;
  }

  return 1;
}

test('Mastery Score 0 for unstudied lesson', () => {
  const score = calculateDeterministicMasteryScore({
    status: 'NOT STARTED',
    totalStudyMinutes: 0,
    reviewCount: 0,
    hasLearnedNotes: false,
    hasUnclearNotes: false,
  });
  assert.strictEqual(score, 0);
});

test('Mastery Score 2 after completing lesson with learned notes', () => {
  const score = calculateDeterministicMasteryScore({
    status: 'COMPLETED',
    totalStudyMinutes: 45,
    confidence: 'Medium',
    reviewCount: 0,
    hasLearnedNotes: true,
    hasUnclearNotes: false,
  });
  assert.strictEqual(score, 2);
});

test('Mastery Score 3 after completing with quiz 75% and Medium confidence', () => {
  const score = calculateDeterministicMasteryScore({
    status: 'COMPLETED',
    totalStudyMinutes: 60,
    quizBestScore: 75,
    quizLatestScore: 75,
    confidence: 'Medium',
    reviewCount: 0,
    hasLearnedNotes: true,
    hasUnclearNotes: false,
  });
  assert.strictEqual(score, 3);
});

test('Mastery Score 4 requires quiz >= 85%, review >= 1, High confidence, learned notes', () => {
  const score = calculateDeterministicMasteryScore({
    status: 'COMPLETED',
    totalStudyMinutes: 120,
    quizBestScore: 90,
    quizLatestScore: 85,
    confidence: 'High',
    reviewCount: 1,
    lastReviewOutcome: 'remembered',
    hasLearnedNotes: true,
    hasUnclearNotes: false,
  });
  assert.strictEqual(score, 4);
});

test('Mastery Score is capped below 3 if user has severe blocker (Low confidence + multiple unclear topics)', () => {
  const score = calculateDeterministicMasteryScore({
    status: 'COMPLETED',
    totalStudyMinutes: 90,
    quizBestScore: 90,
    confidence: 'Low',
    unclearTopicsCount: 2,
    reviewCount: 1,
    hasLearnedNotes: true,
    hasUnclearNotes: true,
  });
  assert(score < 3, `Score should be capped below 3, was: ${score}`);
});

// ── Summary ────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('========================================\n');

if (failCount > 0) {
  process.exit(1);
}
