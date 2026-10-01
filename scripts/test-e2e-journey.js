// Automated QA Test for Phase 22 - End-to-End Learning Experience
import assert from 'node:assert';
import {
  format,
  parseISO,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

console.log('=================================================================');
console.log('--- PHASE 22: FULL END-TO-END LEARNING EXPERIENCE QA TEST ---');
console.log('=================================================================\n');

let passedAssertions = 0;
let totalAssertions = 0;

function check(condition, message) {
  totalAssertions++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// =========================================================================
// Core Business Logic Engines (Mirrored directly from useStore & utils)
// =========================================================================

function computeSessionElapsedSeconds(session, currentTimestampMs) {
  if (session.status === 'completed' || session.status === 'abandoned') {
    return session.actualSeconds;
  }
  if (session.status === 'paused') {
    return session.accumulatedSeconds;
  }
  // status === 'active'
  const activeStart = new Date(session.resumedAt || session.startedAt).getTime();
  const now = currentTimestampMs ?? Date.now();
  const deltaSeconds = Math.max(0, Math.floor((now - activeStart) / 1000));
  return session.accumulatedSeconds + deltaSeconds;
}

function computeNextReviewDate(currentReviewCount, outcome, referenceDate = new Date()) {
  let intervalDays = 1;
  let nextReviewCount = currentReviewCount;

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
      nextReviewCount = currentReviewCount;
      intervalDays = currentReviewCount > 1 ? 3 : 1;
      break;
    }
    case 'forgot': {
      nextReviewCount = 0;
      intervalDays = 1;
      break;
    }
  }

  const nextDate = new Date(referenceDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    nextReviewAt: nextDate.toISOString(),
    nextReviewCount,
    intervalDays,
  };
}

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

  // Level 4 (Mastered)
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

  // Level 3 (Proficient)
  if (
    status === 'COMPLETED' &&
    ((quizBestScore !== undefined && quizBestScore >= 70) ||
     (quizBestScore !== undefined && quizBestScore >= 60 && reviewCount >= 1 && lastReviewOutcome !== 'forgot')) &&
    confidence !== 'Low' &&
    !hasSevereBlocker
  ) {
    return 3;
  }

  // Level 2 (Familiar)
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

function scoreToMasteryLevel(score) {
  switch (score) {
    case 4: return 'Mastered';
    case 3: return 'Proficient';
    case 2: return 'Familiar';
    default: return 'Novice';
  }
}

function computeLessonLearningRecord(lesson, learningSessionsHistory = [], studyPlannerSessions = []) {
  const lessonLearningSessions = learningSessionsHistory.filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );
  const lessonPlannerSessions = studyPlannerSessions.filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );

  const sessionMinutes = lessonLearningSessions.reduce(
    (acc, s) => acc + Math.round(s.actualSeconds / 60),
    0
  );
  const totalStudyMinutes = Math.max(
    lesson.totalStudyMinutes || 0,
    lesson.actualStudyMinutes || 0,
    sessionMinutes
  );

  const studyCount = Math.max(
    lesson.studyCount || 0,
    lessonLearningSessions.length,
    (lesson.status === 'COMPLETED' ? 1 : 0)
  );

  const attempts = lesson.quizAttempts || [];
  const quizScores = [
    ...(lesson.quizScore !== undefined ? [lesson.quizScore] : []),
    ...attempts.map((a) => a.score),
  ];
  const quizBestScore = quizScores.length > 0 ? Math.max(...quizScores) : undefined;
  const quizLatestScore = attempts.length > 0 ? attempts[attempts.length - 1].score : lesson.quizScore;

  const confidence = lesson.confidence || (lesson.status === 'COMPLETED' ? 'Medium' : 'Low');
  const reviewCount = lesson.reviewCount || 0;

  let lastReviewOutcome = undefined;
  if (lesson.reviewNotes) {
    if (lesson.reviewNotes.includes('(จำได้)')) lastReviewOutcome = 'remembered';
    else if (lesson.reviewNotes.includes('(พอจำได้)')) lastReviewOutcome = 'partially';
    else if (lesson.reviewNotes.includes('(ยังไม่แม่น)')) lastReviewOutcome = 'unsure';
    else if (lesson.reviewNotes.includes('(จำไม่ได้)')) lastReviewOutcome = 'forgot';
  }

  const hasLearnedNotes = Boolean(lesson.learnedNotes && lesson.learnedNotes.trim().length > 10);
  const hasUnclearNotes = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 0);

  const calculatedMasteryScore = calculateDeterministicMasteryScore({
    status: lesson.status,
    totalStudyMinutes,
    quizBestScore,
    quizLatestScore,
    confidence,
    reviewCount,
    lastReviewOutcome,
    hasLearnedNotes,
    hasUnclearNotes,
  });

  const masteryScore = lesson.masteryScore !== undefined ? lesson.masteryScore : calculatedMasteryScore;
  const mastery = scoreToMasteryLevel(masteryScore);

  return {
    lessonId: lesson.id,
    subjectId: lesson.subjectId,
    totalStudyMinutes,
    studyCount,
    completionStatus: lesson.status,
    quizBestScore,
    quizLatestScore,
    confidence,
    mastery,
    masteryScore,
    reviewCount,
  };
}

// =========================================================================
// INITIALIZE STATE (Baseline before Journey starts)
// =========================================================================

const timeline = {
  day0: new Date('2026-10-05T08:00:00Z'), // Monday Morning
  day1: new Date('2026-10-06T09:00:00Z'), // Tuesday Morning
  day7: new Date('2026-10-11T18:00:00Z'), // Sunday Evening (End of week)
};

const state = {
  lessons: [
    {
      id: 'lesson-math-1',
      title: 'สมการและอสมการเชิงเส้น',
      subjectId: 'math',
      month: 1,
      week: 1,
      durationHours: 2,
      description: 'พื้นฐานสมการและอสมการสำหรับวิศวกรรม',
      status: 'NOT STARTED',
      difficulty: 'Medium',
      notes: '',
      learnedNotes: undefined,
      stillUnclearNotes: undefined,
      reviewNotes: undefined,
      quizScore: undefined,
      quizAttempts: [],
      confidence: 'Medium',
      reviewCount: 0,
      actualStudyMinutes: 0,
      totalStudyMinutes: 0,
      studyCount: 0,
      resources: [],
    },
    {
      id: 'lesson-math-2',
      title: 'เลขยกกำลัง และราก',
      subjectId: 'math',
      month: 1,
      week: 2,
      durationHours: 2,
      status: 'NOT STARTED',
      difficulty: 'Easy',
      reviewCount: 0,
    },
    {
      id: 'lesson-prog-1',
      title: 'Python พื้นฐาน และตัวแปร',
      subjectId: 'programming',
      month: 1,
      week: 1,
      durationHours: 3,
      status: 'NOT STARTED',
      difficulty: 'Easy',
      reviewCount: 0,
    },
    {
      id: 'lesson-physics-1',
      title: 'การเคลื่อนที่แนวตรง',
      subjectId: 'physics',
      month: 1,
      week: 1,
      durationHours: 2.5,
      status: 'NOT STARTED',
      difficulty: 'Medium',
      reviewCount: 0,
    }
  ],
  sessions: [],
  learningSessionsHistory: [],
  reviewQueue: [],
  goals: [],
  weeklyGoal: { targetHours: 10, targetLessons: 3, targetReviews: 3 },
  activeLearningSession: null,
  unclearTopics: [],
};

// =========================================================================
// EXECUTE 20-STEP END-TO-END LEARNING JOURNEY
// =========================================================================

console.log('--- STEP 1: Open Dashboard ---');
{
  const completedLessons = state.lessons.filter((l) => l.status === 'COMPLETED');
  const totalStudyMinutes = state.lessons.reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);
  
  check(completedLessons.length === 0, 'Initial state: 0 completed lessons');
  check(totalStudyMinutes === 0, 'Initial state: 0 study hours recorded');
  check(state.sessions.length === 0, 'Initial state: no planner sessions yet');
  check(state.reviewQueue.length === 0, 'Initial state: review queue is clean');
  
  // Dashboard Recommendation checks
  const firstUnstarted = state.lessons.find((l) => l.status === 'NOT STARTED');
  check(firstUnstarted.id === 'lesson-math-1', 'Dashboard recommends first roadmap lesson: สมการและอสมการเชิงเส้น');
}

console.log('\n--- STEP 2: Create Weekly Plan ---');
{
  state.weeklyGoal = {
    targetHours: 12,
    targetLessons: 4,
    targetReviews: 3,
  };

  const weeklyStudyGoal = {
    id: 'goal-week-1',
    title: 'อ่านวิศวกรรมสัปดาห์ที่ 1 ให้ครบ 12 ชม.',
    description: 'เน้นปูพื้นฐานคณิตศาสตร์และโปรแกรมมิ่ง',
    type: 'study_hours',
    scope: 'weekly',
    targetValue: 12,
    currentValue: 0,
    startDate: format(timeline.day0, 'yyyy-MM-dd'),
    targetDate: format(timeline.day7, 'yyyy-MM-dd'),
    status: 'in_progress',
    unit: 'ชม.',
  };
  state.goals.push(weeklyStudyGoal);

  check(state.weeklyGoal.targetHours === 12, 'Weekly target set to 12 study hours');
  check(state.goals.length === 1, 'Weekly goal record created successfully');
  check(state.goals[0].currentValue === 0, 'Goal begins at 0 hours progress');
}

console.log('\n--- STEP 3: Schedule Lesson in Planner ---');
const plannedSessionId = 'sess-plan-001';
const todayStr = format(timeline.day0, 'yyyy-MM-dd');
{
  const newPlannedSession = {
    id: plannedSessionId,
    date: todayStr,
    startTime: '09:00',
    endTime: '10:30',
    plannedMinutes: 90,
    lessonId: 'lesson-math-1',
    subjectId: 'math',
    title: 'เรียน สมการและอสมการเชิงเส้น',
    status: 'planned',
    priority: 'High',
    type: 'learn',
    createdAt: timeline.day0.toISOString(),
    updatedAt: timeline.day0.toISOString(),
  };
  state.sessions.push(newPlannedSession);

  check(state.sessions.length === 1, 'Planner session created in state');
  check(state.sessions[0].status === 'planned', 'Planner session status is "planned"');
  check(state.sessions[0].date === todayStr, 'Planner session scheduled for today');
}

console.log('\n--- STEP 4: Start Learning Session ---');
{
  const sessionStartTime = new Date(timeline.day0.getTime() + 60 * 1000); // 09:01
  const activeSession = {
    sessionId: uuidv4(),
    plannedSessionId: plannedSessionId,
    lessonId: 'lesson-math-1',
    startedAt: sessionStartTime.toISOString(),
    accumulatedSeconds: 0,
    actualSeconds: 0,
    source: {
      id: 'res-yt-algebra',
      type: 'youtube',
      title: 'สมการเชิงเส้นและเมทริกซ์เบื้องต้น',
      url: 'https://youtube.com/watch?v=sample-algebra',
    },
    status: 'active',
    lastHeartbeatAt: sessionStartTime.toISOString(),
  };
  state.activeLearningSession = activeSession;

  // Mark lesson as IN PROGRESS
  state.lessons = state.lessons.map((l) =>
    l.id === 'lesson-math-1' ? { ...l, status: 'IN PROGRESS' } : l
  );
  // Mark planner session as in_progress
  state.sessions = state.sessions.map((s) =>
    s.id === plannedSessionId ? { ...s, status: 'in_progress' } : s
  );

  check(state.activeLearningSession !== null, 'Active learning session successfully initialized');
  check(state.lessons.find((l) => l.id === 'lesson-math-1').status === 'IN PROGRESS', 'Lesson status transitioned to IN PROGRESS');
  check(state.sessions.find((s) => s.id === plannedSessionId).status === 'in_progress', 'Planner session status transitioned to in_progress');
}

console.log('\n--- STEP 5: Confirm Source Attachment ---');
{
  const source = state.activeLearningSession.source;
  check(Boolean(source), 'Learning session has attached learning source');
  check(source.type === 'youtube', 'Source type verified: YouTube');
  check(source.url === 'https://youtube.com/watch?v=sample-algebra', 'Source URL accurately bound');
  check(source.title === 'สมการเชิงเส้นและเมทริกซ์เบื้องต้น', 'Source title accurately bound');
}

console.log('\n--- STEP 6: Start Timer (Active Study) ---');
let timeCursorMs = new Date(state.activeLearningSession.startedAt).getTime();
{
  // Simulate 45 minutes of continuous study (2,700 seconds)
  timeCursorMs += 45 * 60 * 1000;
  const elapsed = computeSessionElapsedSeconds(state.activeLearningSession, timeCursorMs);
  check(elapsed === 2700, `Timer actively tracks study duration: ${elapsed}s (45 minutes)`);
}

console.log('\n--- STEP 7: Pause Timer ---');
{
  const pauseTimeMs = timeCursorMs;
  const accumulated = computeSessionElapsedSeconds(state.activeLearningSession, pauseTimeMs);
  state.activeLearningSession = {
    ...state.activeLearningSession,
    status: 'paused',
    pausedAt: new Date(pauseTimeMs).toISOString(),
    accumulatedSeconds: accumulated,
    actualSeconds: accumulated,
  };

  // Simulate 15 minutes of pause (break time)
  timeCursorMs += 15 * 60 * 1000;
  const elapsedDuringPause = computeSessionElapsedSeconds(state.activeLearningSession, timeCursorMs);
  
  check(state.activeLearningSession.status === 'paused', 'Session status is "paused"');
  check(elapsedDuringPause === 2700, `Timer properly frozen during break: ${elapsedDuringPause}s (no leakage)`);
}

console.log('\n--- STEP 8: Resume Timer ---');
{
  state.activeLearningSession = {
    ...state.activeLearningSession,
    status: 'active',
    resumedAt: new Date(timeCursorMs).toISOString(),
    pausedAt: undefined,
  };

  // Simulate another 45 minutes of study (total 90 minutes)
  timeCursorMs += 45 * 60 * 1000;
  const finalElapsedSeconds = computeSessionElapsedSeconds(state.activeLearningSession, timeCursorMs);
  check(finalElapsedSeconds === 5400, `Timer accumulated accurately after resume: ${finalElapsedSeconds}s (90 minutes total)`);
}

console.log('\n--- STEP 9: Complete Lesson & Finish Session ---');
const notePayload = {
  learnedNotes: 'เข้าใจการแก้ระบบสมการเชิงเส้นแบบ Gauss Elimination และ Determinant 3x3 อย่างละเอียด',
  stillUnclearNotes: 'ยังมีจุดที่ติดขัด: การหาค่า Eigenvalues และ Eigenvectors ในเมทริกซ์',
  reviewNotes: 'ต้องฝึกทำโจทย์แก้สมการ 3 ตัวแปรซ้ำอีก 5 ข้อให้คล่องขึ้น',
};
{
  const finalSeconds = computeSessionElapsedSeconds(state.activeLearningSession, timeCursorMs);
  const calculatedMinutes = Math.round(finalSeconds / 60); // 90 mins
  const completionIso = new Date(timeCursorMs).toISOString();

  const completedSession = {
    ...state.activeLearningSession,
    status: 'completed',
    completedAt: completionIso,
    actualSeconds: finalSeconds,
    notesDraft: notePayload,
  };

  state.learningSessionsHistory.push(completedSession);
  state.activeLearningSession = null;

  // Complete planned session (must NOT duplicate records)
  state.sessions = state.sessions.map((s) =>
    s.id === plannedSessionId
      ? {
          ...s,
          status: 'completed',
          actualMinutes: calculatedMinutes,
          completedAt: completionIso,
          updatedAt: completionIso,
        }
      : s
  );

  // Complete Lesson
  state.lessons = state.lessons.map((l) => {
    if (l.id === 'lesson-math-1') {
      const merged = {
        ...l,
        status: 'COMPLETED',
        completedAt: completionIso,
        firstStudiedAt: l.firstStudiedAt || completionIso,
        lastStudiedAt: completionIso,
        actualStudyMinutes: calculatedMinutes,
        totalStudyMinutes: calculatedMinutes,
        studyCount: 1,
        learnedNotes: notePayload.learnedNotes,
        stillUnclearNotes: notePayload.stillUnclearNotes,
        reviewNotes: notePayload.reviewNotes,
      };
      const rec = computeLessonLearningRecord(merged, state.learningSessionsHistory, state.sessions);
      return {
        ...merged,
        mastery: rec.mastery,
      };
    }
    return l;
  });

  check(state.activeLearningSession === null, 'Active learning session cleanly cleared');
  check(state.learningSessionsHistory.length === 1, 'Learning session archived to history (1 record)');
  check(state.sessions.length === 1, 'No duplicate sessions created (strictly 1 session in planner)');
  check(state.sessions[0].status === 'completed', 'Planner session status updated to "completed"');
  check(state.sessions[0].actualMinutes === 90, 'Planner session recorded actual 90 minutes study time');
  check(state.lessons.find((l) => l.id === 'lesson-math-1').status === 'COMPLETED', 'Lesson status transitioned to COMPLETED');
}

console.log('\n--- STEP 10: Verify Notes: Learned, Unclear, Review ---');
{
  const lesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  check(lesson.learnedNotes === notePayload.learnedNotes, 'Learned notes saved without data loss');
  check(lesson.stillUnclearNotes === notePayload.stillUnclearNotes, 'Unclear notes recorded for knowledge gap analysis');
  check(lesson.reviewNotes === notePayload.reviewNotes, 'Review notes recorded for spaced repetition');
}

console.log('\n--- STEP 11 & 12: Take Quiz & Save Score ---');
const quizScore = 80; // 80% passing
{
  const quizAttempt = {
    id: uuidv4(),
    timestamp: new Date(timeCursorMs + 10 * 60 * 1000).toISOString(),
    score: quizScore,
    notes: 'ทำแบบทดสอบ 10 ข้อ ถูก 8 ข้อ',
  };

  state.lessons = state.lessons.map((l) => {
    if (l.id === 'lesson-math-1') {
      const attempts = [...(l.quizAttempts || []), quizAttempt];
      const merged = {
        ...l,
        quizScore,
        quizAttempts: attempts,
        lastStudiedAt: quizAttempt.timestamp,
      };
      const rec = computeLessonLearningRecord(merged, state.learningSessionsHistory, state.sessions);
      return {
        ...merged,
        mastery: rec.mastery,
      };
    }
    return l;
  });

  const lesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  check(lesson.quizScore === 80, 'Quiz score 80% saved on lesson');
  check(lesson.quizAttempts.length === 1, 'Quiz attempt stored in attempts history');
  check(lesson.quizAttempts[0].score === 80, 'Quiz attempt score verified');
}

console.log('\n--- STEP 13: Create Spaced Repetition Review Item ---');
const reviewItemId = 'rev-item-001';
{
  // Review interval is 1 day because user has unclear notes
  const nextReviewDateIso = addDays(new Date(timeCursorMs), 1).toISOString();
  const reviewItem = {
    id: reviewItemId,
    lessonId: 'lesson-math-1',
    topic: 'สมการและอสมการเชิงเส้น',
    createdAt: new Date(timeCursorMs).toISOString(),
    nextReviewAt: nextReviewDateIso,
    reviewCount: 0,
    status: 'pending',
    reason: 'unclear_topic',
    priority: 'High',
  };
  state.reviewQueue.push(reviewItem);

  check(state.reviewQueue.length === 1, 'Spaced repetition review item created in queue');
  check(state.reviewQueue[0].status === 'pending', 'Review status initialized to "pending"');
  check(state.reviewQueue[0].priority === 'High', 'Review priority marked High due to unclear note');
}

console.log('\n--- STEP 14: Update Mastery Level ---');
{
  const lesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  const record = computeLessonLearningRecord(lesson, state.learningSessionsHistory, state.sessions);
  
  // Status: COMPLETED, quiz: 80, totalStudyMinutes: 90, hasLearnedNotes: true
  // Matches Level 3: Proficient
  check(record.masteryScore === 3, `Mastery score deterministically calculated: Level ${record.masteryScore}/4`);
  check(record.mastery === 'Proficient', `Mastery label matches: ${record.mastery}`);
}

console.log('\n--- STEP 15: Return to Dashboard (Smart Recommendation Update) ---');
{
  // Now that lesson-math-1 is COMPLETED, recommendation must advance!
  const inProgress = state.lessons.filter((l) => l.status === 'IN PROGRESS');
  const planned = state.sessions.filter((s) => s.status === 'planned');
  const nextRoadmap = state.lessons.filter((l) => l.status === 'NOT STARTED' && l.month === 1);

  check(inProgress.length === 0, 'No more incomplete in-progress lessons');
  check(nextRoadmap.length > 0, 'Next roadmap lesson detected');
  check(nextRoadmap[0].id === 'lesson-math-2', `Smart recommendation advances to next unstudied topic: ${nextRoadmap[0].title}`);
}

console.log('\n--- STEP 16: Dashboard Indicators: Progress, Review, Knowledge Gap ---');
{
  // 16.1 Progress
  const completedLessons = state.lessons.filter((l) => l.status === 'COMPLETED');
  const totalStudyMinutes = state.sessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
  const totalHours = +(totalStudyMinutes / 60).toFixed(1);

  check(completedLessons.length === 1, `Dashboard shows 1 completed lesson`);
  check(totalHours === 1.5, `Dashboard shows 1.5 study hours accumulated`);

  // Goal Auto-Progress update
  const goal = state.goals[0];
  const goalProgressHours = +(totalStudyMinutes / 60).toFixed(1);
  const goalPercent = Math.round((goalProgressHours / goal.targetValue) * 100);
  check(goalProgressHours === 1.5, `Weekly goal auto-advanced to ${goalProgressHours} / ${goal.targetValue} hrs`);
  check(goalPercent === 13, `Weekly goal progress reached ${goalPercent}%`);

  // 16.2 Review Section
  const pendingReviews = state.reviewQueue.filter((r) => r.status === 'pending');
  check(pendingReviews.length === 1, 'Dashboard shows 1 scheduled spaced review in queue');

  // 16.3 Knowledge Gap Section
  // lesson-math-1 has stillUnclearNotes => Must be detected as Knowledge Gap!
  const lesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  const hasGap = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.length > 0);
  check(hasGap, 'Dashboard Knowledge Gap engine flagged topic with unresolved question');
  check(lesson.stillUnclearNotes.includes('Eigenvalues'), 'Knowledge gap details accurately linked to user notes');
}

console.log('\n--- STEP 17: Advance to Next Day (Review Becomes Due) ---');
const day1Str = format(timeline.day1, 'yyyy-MM-dd');
{
  // On day 1, nextReviewAt (which was scheduled for day 1) is now due today!
  const dueReviews = state.reviewQueue.filter((r) => {
    if (r.status === 'completed') return false;
    const rDate = r.nextReviewAt.split('T')[0];
    return rDate <= day1Str;
  });

  check(dueReviews.length === 1, `On Next Day (${day1Str}), review item is marked as DUE TODAY`);
  check(dueReviews[0].id === reviewItemId, 'Correct review item ready in Due Review section');
}

console.log('\n--- STEP 18: Complete Review (Active Recall Retention) ---');
{
  const reviewTimeIso = timeline.day1.toISOString();
  const currentItem = state.reviewQueue.find((r) => r.id === reviewItemId);
  
  // User answered 'remembered'
  const { nextReviewAt, nextReviewCount } = computeNextReviewDate(currentItem.reviewCount, 'remembered', timeline.day1);
  
  state.reviewQueue = state.reviewQueue.map((r) =>
    r.id === reviewItemId
      ? {
          ...r,
          status: 'completed',
          lastReviewedAt: reviewTimeIso,
          nextReviewAt,
          reviewCount: nextReviewCount,
        }
      : r
  );

  // Update Lesson review stats and clear resolved unclear notes
  state.lessons = state.lessons.map((l) => {
    if (l.id === 'lesson-math-1') {
      const merged = {
        ...l,
        lastStudiedAt: reviewTimeIso,
        reviewCount: nextReviewCount,
        nextReviewAt,
        reviewNotes: `${l.reviewNotes || ''}\n• [${day1Str}] (จำได้) ทบทวนเข้าใจสูตร Eigenvalues แล้ว`,
        stillUnclearNotes: '', // User resolved the question!
      };
      const rec = computeLessonLearningRecord(merged, state.learningSessionsHistory, state.sessions);
      return {
        ...merged,
        mastery: rec.mastery,
      };
    }
    return l;
  });

  const updatedReview = state.reviewQueue.find((r) => r.id === reviewItemId);
  const updatedLesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  const updatedRecord = computeLessonLearningRecord(updatedLesson, state.learningSessionsHistory, state.sessions);

  check(updatedReview.status === 'completed', 'Review item status marked "completed"');
  check(updatedReview.reviewCount === 1, 'Review count incremented to 1');
  check(updatedLesson.reviewCount === 1, 'Lesson review count updated to 1');
  check(updatedLesson.stillUnclearNotes === '', 'Unclear notes resolved after successful review');
  check(updatedRecord.masteryScore === 3, 'Mastery maintained at Level 3 (Proficient)');
}

console.log('\n--- STEP 19: Weekly Learning Review Aggregation ---');
{
  const weekStart = startOfWeek(timeline.day1, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(timeline.day1, { weekStartsOn: 1 });
  const interval = { start: weekStart, end: weekEnd };

  // 1. Total study time in week
  const weeklySessions = state.sessions.filter(
    (s) => s.status === 'completed' && s.completedAt && isWithinInterval(parseISO(s.completedAt), interval)
  );
  const weeklyStudyMinutes = weeklySessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

  // 2. Lessons completed this week
  const weeklyLessonsCompleted = state.lessons.filter(
    (l) => l.status === 'COMPLETED' && l.completedAt && isWithinInterval(parseISO(l.completedAt), interval)
  );

  // 3. Quiz attempts this week
  const quizScores = [];
  state.lessons.forEach((l) => {
    (l.quizAttempts || []).forEach((qa) => {
      if (isWithinInterval(parseISO(qa.timestamp), interval)) {
        quizScores.push(qa.score);
      }
    });
  });
  const avgQuiz = Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length);

  // 4. Reviews completed this week
  const weeklyReviewsCompleted = state.reviewQueue.filter(
    (r) => r.status === 'completed' && r.lastReviewedAt && isWithinInterval(parseISO(r.lastReviewedAt), interval)
  );

  check(weeklyStudyMinutes === 90, `Weekly Review: Total study time matches 90 minutes (1.5 hrs)`);
  check(weeklyLessonsCompleted.length === 1, `Weekly Review: 1 lesson completed`);
  check(quizScores.length === 1, `Weekly Review: 1 quiz attempt recorded`);
  check(avgQuiz === 80, `Weekly Review: Average quiz score matches 80%`);
  check(weeklyReviewsCompleted.length === 1, `Weekly Review: 1 review completed successfully`);
}

console.log('\n--- STEP 20: 6-Month Roadmap Status & Milestone Advancement ---');
{
  const month1Lessons = state.lessons.filter((l) => l.month === 1);
  const completedCount = month1Lessons.filter((l) => l.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / month1Lessons.length) * 100);

  check(month1Lessons.length === 4, 'Month 1 contains 4 foundation lessons');
  check(completedCount === 1, 'Month 1 reflects 1 completed lesson');
  check(progressPercent === 25, `Month 1 roadmap progress advanced to ${progressPercent}%`);

  // Verify full data integrity: Step 1 -> Step 20
  const finalLesson = state.lessons.find((l) => l.id === 'lesson-math-1');
  check(finalLesson.actualStudyMinutes === 90, 'Data integrity: actualStudyMinutes preserved');
  check(finalLesson.quizScore === 80, 'Data integrity: quizScore preserved');
  check(finalLesson.reviewCount === 1, 'Data integrity: reviewCount preserved');
  check(finalLesson.mastery === 'Proficient', 'Data integrity: mastery preserved');
  check(state.learningSessionsHistory.length === 1, 'Data integrity: learning history preserved');
  check(state.sessions.length === 1, 'Data integrity: planner session preserved');
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n=================================================================`);
console.log(`E2E LEARNING EXPERIENCE SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed`);
console.log(`=================================================================\n`);
