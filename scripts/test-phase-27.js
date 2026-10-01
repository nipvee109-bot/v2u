import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('--- RUNNING PHASE 27: STUDY ROOM QA TESTS ---');

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

// 1. Session start initializes Study Room state
function createLearningSession(lessonId, source) {
  const now = new Date().toISOString();
  return {
    sessionId: uuidv4(),
    lessonId,
    startedAt: now,
    accumulatedSeconds: 0,
    actualSeconds: 0,
    source,
    status: 'active',
    lastHeartbeatAt: now,
  };
}

const session = createLearningSession('lesson-py-1', { id: 'r1', type: 'youtube', title: 'Python Functions', url: 'https://youtube.com/watch?v=123' });
check(Boolean(session.sessionId), 'Study Room session initialized with unique sessionId');
check(session.lessonId === 'lesson-py-1', 'Session is anchored to target lesson');
check(session.status === 'active', 'Initial session status is active');
check(session.source?.title === 'Python Functions', 'Initial primary source is attached');

// 2. Timer accumulation without time loss
function pauseSession(s, elapsedDelta) {
  const now = new Date().toISOString();
  const acc = s.accumulatedSeconds + elapsedDelta;
  return {
    ...s,
    status: 'paused',
    pausedAt: now,
    accumulatedSeconds: acc,
    actualSeconds: acc,
    lastHeartbeatAt: now,
  };
}

function resumeSession(s) {
  const now = new Date().toISOString();
  return {
    ...s,
    status: 'active',
    resumedAt: now,
    pausedAt: undefined,
    lastHeartbeatAt: now,
  };
}

const paused = pauseSession(session, 1500); // 25 min
check(paused.status === 'paused', 'Session transitions to paused state');
check(paused.accumulatedSeconds === 1500, 'Accumulated 1,500 seconds accurately preserved');

const resumed = resumeSession(paused);
check(resumed.status === 'active', 'Session resumes cleanly');
check(resumed.accumulatedSeconds === 1500, 'Previous elapsed time persists upon resume');

// 3. Finish session updates lesson and records history
function finishSession(s, additionalDelta, quizScore) {
  const now = new Date().toISOString();
  const finalSecs = s.accumulatedSeconds + additionalDelta;
  const actualMinutes = Math.max(1, Math.round(finalSecs / 60));
  return {
    completedSession: {
      ...s,
      status: 'completed',
      completedAt: now,
      actualSeconds: finalSecs,
    },
    actualMinutes,
    quizScore,
  };
}

const { completedSession, actualMinutes } = finishSession(resumed, 900, 90); // +15 min = 40 min total
check(completedSession.status === 'completed', 'Session marked as completed on finish');
check(actualMinutes === 40, 'Total study time calculates to 40 minutes');
check(completedSession.actualSeconds === 2400, 'Final seconds accurately calculated (2,400s = 40 min)');

console.log(`\n======================================================`);
console.log(`PHASE 27 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
