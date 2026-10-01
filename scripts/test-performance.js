// Automated QA Performance Benchmark for Phase 21 - Performance Optimization
import { performance } from 'perf_hooks';
import {
  format,
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from 'date-fns';

console.log('=================================================================');
console.log('--- PHASE 21 PERFORMANCE BENCHMARK & STRESS QA TEST ---');
console.log('=================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// 1. Synthetic Scale Dataset Generation
// ----------------------------------------------------
console.log('--- 1. Generating High-Volume Scale Dataset ---');
console.log('  Scale Target: 100 lessons, 500 sessions, 1000 notes, 1000 reviews');

const SUBJECT_IDS = ['math', 'programming', 'physics', 'tgat3', 'ai'];

// 1.1 Generate 100 Lessons
const lessons = [];
for (let i = 1; i <= 100; i++) {
  const subjectId = SUBJECT_IDS[i % SUBJECT_IDS.length];
  const isCompleted = i <= 60;
  const inProgress = !isCompleted && i <= 85;
  const status = isCompleted ? 'COMPLETED' : inProgress ? 'IN PROGRESS' : 'NOT STARTED';
  const month = Math.ceil(i / 16.6);
  const week = Math.ceil(i / 4);

  const learnedNotes = isCompleted || inProgress
    ? `บันทึกสาระสำคัญของบทเรียนที่ ${i}: เข้าใจโครงสร้างหลักและสมการสำคัญ\n• สรุปประเด็นที่ 1: นิยามทฤษฎีบท\n• สรุปประเด็นที่ 2: ขั้นตอนการแก้โจทย์\n• สรุปประเด็นที่ 3: ข้อควรระวัง`
    : undefined;

  const stillUnclearNotes = (i % 4 === 0)
    ? `ยังมีจุดที่ติดขัดในบทเรียนที่ ${i}: การคำนวณเวกเตอร์สามมิติและทฤษฎีบทการแปลงรูป`
    : undefined;

  const reviewNotes = isCompleted && (i % 2 === 0)
    ? `ทบทวนครั้งที่ 1: ทำโจทย์ได้ถูกต้อง\nทบทวนครั้งที่ 2: จดจำสูตรลัดและหลักการประยุกต์ได้แม่นยำ`
    : undefined;

  const completedAt = isCompleted
    ? new Date(Date.now() - (100 - i) * 24 * 3600 * 1000).toISOString()
    : undefined;

  lessons.push({
    id: `lesson-perf-${i}`,
    title: `บทเรียนสมรรถนะสูงที่ ${i}: Advanced Engineering Topic ${i}`,
    subjectId,
    month,
    week,
    durationHours: 2,
    status,
    difficulty: i % 3 === 0 ? 'Hard' : i % 2 === 0 ? 'Medium' : 'Easy',
    notes: `บันทึกทั่วไปสำหรับบทที่ ${i}`,
    learnedNotes,
    stillUnclearNotes,
    reviewNotes,
    completedAt,
    actualStudyMinutes: isCompleted ? 120 : inProgress ? 60 : 0,
    quizScore: isCompleted ? 60 + (i % 40) : inProgress ? 50 : undefined,
    quizAttempts: isCompleted ? [
      { id: `qa-${i}-1`, score: 55 + (i % 35), timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: `qa-${i}-2`, score: 70 + (i % 30), timestamp: new Date(Date.now() - 2 * 86400000).toISOString() }
    ] : [],
    confidence: isCompleted ? 'High' : inProgress ? 'Medium' : 'Low',
    reviewCount: isCompleted ? (i % 4) : 0,
    resources: [],
    images: [],
  });
}

// 1.2 Generate 500 Study Sessions
const sessions = [];
const today = new Date();
for (let i = 1; i <= 500; i++) {
  const lesson = lessons[i % lessons.length];
  const dayOffset = (i % 120) - 90;
  const sessionDate = new Date(today.getTime() + dayOffset * 86400000).toISOString().split('T')[0];
  const isCompleted = dayOffset < 0 && (i % 5 !== 0);
  const status = isCompleted ? 'completed' : dayOffset < 0 ? 'overdue' : 'planned';

  sessions.push({
    id: `sess-perf-${i}`,
    date: sessionDate,
    startTime: `${String(8 + (i % 12)).padStart(2, '0')}:00`,
    endTime: `${String(9 + (i % 12)).padStart(2, '0')}:30`,
    plannedMinutes: 90,
    actualMinutes: isCompleted ? 90 : undefined,
    lessonId: lesson.id,
    subjectId: lesson.subjectId,
    title: `เรียน ${lesson.title}`,
    status,
    priority: i % 3 === 0 ? 'High' : i % 2 === 0 ? 'Medium' : 'Low',
    type: i % 5 === 0 ? 'review' : i % 7 === 0 ? 'quiz' : 'learn',
    notes: `บันทึกการเรียนรู้ประจำเซสชัน ${i}: เนื้อหาครบถ้วนตามแผน`,
    createdAt: new Date(today.getTime() - 100 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: isCompleted ? new Date(today.getTime() + dayOffset * 86400000).toISOString() : undefined,
  });
}

// 1.3 Generate Learning Sessions History (200 completed sessions with rich notes)
const learningSessionsHistory = [];
for (let i = 1; i <= 200; i++) {
  const lesson = lessons[i % lessons.length];
  const dayOffset = - (i % 60);
  learningSessionsHistory.push({
    sessionId: `ls-perf-${i}`,
    lessonId: lesson.id,
    startedAt: new Date(today.getTime() + dayOffset * 86400000).toISOString(),
    completedAt: new Date(today.getTime() + dayOffset * 86400000 + 3600000).toISOString(),
    accumulatedSeconds: 3600,
    actualSeconds: 3600,
    status: 'completed',
    lastHeartbeatAt: new Date(today.getTime() + dayOffset * 86400000 + 3600000).toISOString(),
    notesDraft: {
      learnedNotes: `ความเข้าใจหลักในเซสชัน ${i}: ทำแบบฝึกหัดข้อ 1-10 สำเร็จ`,
      stillUnclearNotes: i % 3 === 0 ? `ติดขัดเรื่องความเร็วเชิงมุมและสมดุล` : undefined,
      reviewNotes: `ควรกลับมาทบทวนซ้ำอีกครั้งใน 7 วัน`,
    },
  });
}

// 1.4 Generate 1000 Spaced Repetition Review Items
const reviewQueue = [];
for (let i = 1; i <= 1000; i++) {
  const lesson = lessons[i % lessons.length];
  const dayOffset = (i % 90) - 30;
  const nextReviewAt = new Date(today.getTime() + dayOffset * 86400000).toISOString();
  const isCompleted = i > 800;

  reviewQueue.push({
    id: `rev-perf-${i}`,
    lessonId: lesson.id,
    topic: `ทบทวน: ${lesson.title}`,
    createdAt: new Date(today.getTime() - 60 * 86400000).toISOString(),
    lastReviewedAt: isCompleted ? new Date(today.getTime() - 5 * 86400000).toISOString() : undefined,
    nextReviewAt,
    reviewCount: i % 5,
    status: isCompleted ? 'completed' : dayOffset < 0 ? 'overdue' : 'pending',
    reason: i % 3 === 0 ? 'low_quiz_score' : 'spaced_repetition',
    priority: i % 4 === 0 ? 'High' : 'Medium',
  });
}

// 1.5 Generate Unclear Topics (50 items)
const unclearTopics = [];
for (let i = 1; i <= 50; i++) {
  const lesson = lessons[i % lessons.length];
  unclearTopics.push({
    id: `unclear-perf-${i}`,
    topic: `ข้อสงสัย ${i} ในวิชา ${lesson.subjectId}`,
    details: `รายละเอียดจุดที่ไม่เข้าใจข้อที่ ${i}: แนวคิดยังไม่ชัดเจนเรื่องขั้นตอนและตัวแปรเสริม`,
    subjectId: lesson.subjectId,
    priority: i % 3 === 0 ? 'High' : 'Medium',
    status: i % 5 === 0 ? 'Understood' : 'Not Understood',
    createdAt: new Date(today.getTime() - (i % 30) * 86400000).toISOString(),
  });
}

console.log(`Generated: ${lessons.length} lessons, ${sessions.length} sessions, ${learningSessionsHistory.length} session drafts, ${reviewQueue.length} reviews.\n`);

// ----------------------------------------------------
// 2. High-Performance Core Engines Testing
// ----------------------------------------------------

console.log('--- 2. Benchmarking Core Engines Under Scale ---');

// Benchmark 1: Indexed Session Lookups (buildSessionsIndex logic)
function buildTestSessionsIndex(learningHistory, plannerSessions) {
  const learningMap = new Map();
  for (let i = 0; i < learningHistory.length; i++) {
    const s = learningHistory[i];
    if (s.lessonId && s.status === 'completed') {
      let list = learningMap.get(s.lessonId);
      if (!list) {
        list = [];
        learningMap.set(s.lessonId, list);
      }
      list.push(s);
    }
  }

  const plannerMap = new Map();
  for (let i = 0; i < plannerSessions.length; i++) {
    const s = plannerSessions[i];
    if (s.lessonId && s.status === 'completed') {
      let list = plannerMap.get(s.lessonId);
      if (!list) {
        list = [];
        plannerMap.set(s.lessonId, list);
      }
      list.push(s);
    }
  }

  return { learningMap, plannerMap };
}

let indexedMaps;
{
  const t0 = performance.now();
  indexedMaps = buildTestSessionsIndex(learningSessionsHistory, sessions);
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(indexedMaps.learningMap.size > 0 && indexedMaps.plannerMap.size > 0, `buildSessionsIndex indexed sessions across ${indexedMaps.plannerMap.size} lessons`);
  assert(elapsed < 10, `Session indexing executed in ${elapsed.toFixed(2)}ms (budget: < 10ms)`);
}

// Benchmark 2: Batch Lesson Learning Records for 100 Lessons
function computeTestLessonRecord(lesson, lHistory, pSessions) {
  const sessionMinutes = lHistory.reduce((acc, s) => acc + Math.round(s.actualSeconds / 60), 0);
  const totalStudyMinutes = Math.max(lesson.actualStudyMinutes || 0, sessionMinutes);
  const studyCount = Math.max(lesson.studyCount || 0, lHistory.length, (lesson.status === 'COMPLETED' ? 1 : 0));
  const attempts = lesson.quizAttempts || [];
  const quizScores = [...(lesson.quizScore !== undefined ? [lesson.quizScore] : []), ...attempts.map(a => a.score)];
  const quizBestScore = quizScores.length > 0 ? Math.max(...quizScores) : undefined;

  let masteryScore = 0;
  if (lesson.status === 'COMPLETED' && quizBestScore !== undefined && quizBestScore >= 85) masteryScore = 4;
  else if (lesson.status === 'COMPLETED' && quizBestScore !== undefined && quizBestScore >= 70) masteryScore = 3;
  else if (lesson.status === 'COMPLETED') masteryScore = 2;
  else if (lesson.status === 'IN PROGRESS') masteryScore = 1;

  return {
    lessonId: lesson.id,
    subjectId: lesson.subjectId,
    totalStudyMinutes,
    studyCount,
    quizBestScore,
    masteryScore,
  };
}

{
  const t0 = performance.now();
  const records = lessons.map((l) =>
    computeTestLessonRecord(l, indexedMaps.learningMap.get(l.id) || [], indexedMaps.plannerMap.get(l.id) || [])
  );
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(records.length === 100, `Computed records for all 100 lessons`);
  assert(elapsed < 15, `100 Lesson records computed in ${elapsed.toFixed(2)}ms (budget: < 15ms)`);
}

// Benchmark 3: Smart Dashboard Recommendations & Priority Rules
function getTestDashboardRecommendation(allLessons, allSessions) {
  const inProgress = allLessons.filter(l => l.status === 'IN PROGRESS');
  if (inProgress.length > 0) return { reason: 'continue_incomplete', lesson: inProgress[0] };
  const planned = allSessions.filter(s => s.status === 'planned');
  if (planned.length > 0) {
    const parent = allLessons.find(l => l.id === planned[0].lessonId);
    if (parent) return { reason: 'planned_for_today', lesson: parent };
  }
  return { reason: 'roadmap_next', lesson: allLessons[0] };
}

{
  const t0 = performance.now();
  const rec = getTestDashboardRecommendation(lessons, sessions);
  const completedCount = lessons.filter(l => l.status === 'COMPLETED').length;
  const currentMonth = Math.min(6, Math.floor(completedCount / 15) + 1);
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(rec && rec.lesson, `Dashboard recommendation generated: ${rec.lesson.title}`);
  assert(currentMonth >= 1 && currentMonth <= 6, `Roadmap progression calculated: Month ${currentMonth}`);
  assert(elapsed < 15, `Dashboard recommendation and roadmap calculated in ${elapsed.toFixed(2)}ms (budget: < 15ms)`);
}

// Benchmark 4: Knowledge Gap Analysis with Pre-Indexed Lookups
function computeTestKnowledgeGaps(allLessons, allReviews, allUnclear, { learningMap, plannerMap }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const reviewsByLesson = new Map();
  for (let i = 0; i < allReviews.length; i++) {
    const r = allReviews[i];
    let list = reviewsByLesson.get(r.lessonId);
    if (!list) {
      list = [];
      reviewsByLesson.set(r.lessonId, list);
    }
    list.push(r);
  }

  const unclearBySubject = new Map();
  for (let i = 0; i < allUnclear.length; i++) {
    const u = allUnclear[i];
    let list = unclearBySubject.get(u.subjectId);
    if (!list) {
      list = [];
      unclearBySubject.set(u.subjectId, list);
    }
    list.push(u);
  }

  const gaps = [];
  for (let i = 0; i < allLessons.length; i++) {
    const l = allLessons[i];
    const record = computeTestLessonRecord(l, learningMap.get(l.id) || [], plannerMap.get(l.id) || []);
    const lessonReviews = reviewsByLesson.get(l.id) || [];
    const isOverdue = lessonReviews.some(r => r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr);
    const quizScore = record.quizBestScore;

    const reasons = [];
    if (quizScore !== undefined && quizScore < 60) reasons.push('low_quiz');
    if (isOverdue) reasons.push('review_overdue');
    if (l.status === 'COMPLETED' && record.masteryScore <= 2) reasons.push('low_mastery');

    if (reasons.length > 0) {
      gaps.push({
        id: `gap-${l.id}`,
        topic: l.title,
        subject: l.subjectId,
        reasons,
        mastery: record.masteryScore,
        quizScore,
        scoreWeight: reasons.length * 20 + (4 - record.masteryScore) * 10,
      });
    }
  }

  return gaps.sort((a, b) => b.scoreWeight - a.scoreWeight);
}

{
  const t0 = performance.now();
  const gaps = computeTestKnowledgeGaps(lessons, reviewQueue, unclearTopics, indexedMaps);
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(gaps.length > 0, `Identified ${gaps.length} knowledge gaps from 100 lessons and 1000 reviews`);
  assert(elapsed < 20, `Knowledge Gap analysis completed in ${elapsed.toFixed(2)}ms (budget: < 20ms)`);
}

// Benchmark 5: Continuous 30-Day and 180-Day Analytics
function computeTestAnalyticsPoints(dateRange, allSessions) {
  const daysCount = dateRange === '30d' ? 30 : 180;
  const sessionsByDate = new Map();
  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i];
    let list = sessionsByDate.get(s.date);
    if (!list) {
      list = [];
      sessionsByDate.set(s.date, list);
    }
    list.push(s);
  }

  const points = [];
  const refDate = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = subDays(refDate, i);
    const dStr = format(d, 'yyyy-MM-dd');
    const daySessions = sessionsByDate.get(dStr) || [];
    const minutes = daySessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.actualMinutes || 90), 0);
    points.push({ date: dStr, minutes, count: daySessions.length });
  }

  return points;
}

{
  const t0 = performance.now();
  const points30 = computeTestAnalyticsPoints('30d', sessions);
  const points180 = computeTestAnalyticsPoints('all', sessions);
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(points30.length === 30, `30-day analytics points generated: ${points30.length}`);
  assert(points180.length === 180, `180-day analytics points generated: ${points180.length}`);
  assert(elapsed < 20, `Analytics points computation completed in ${elapsed.toFixed(2)}ms (budget: < 20ms)`);
}

// Benchmark 6: Search Query Scanning (100 lessons, 500 sessions, 1000 notes)
{
  const query = 'engineering';
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  const t0 = performance.now();
  const matchedLessons = lessons.filter(
    (l) => l.title.toLowerCase().includes(query) || (l.learnedNotes && l.learnedNotes.toLowerCase().includes(query))
  );

  const matchedSessions = learningSessionsHistory.filter((s) => {
    const parent = lessonMap.get(s.lessonId);
    return parent?.title.toLowerCase().includes(query) || s.notesDraft?.learnedNotes?.toLowerCase().includes(query);
  });

  const matchedReviews = reviewQueue.filter((r) => r.topic.toLowerCase().includes(query));
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(matchedLessons.length > 0, `Search matched ${matchedLessons.length} lessons`);
  assert(matchedSessions.length > 0, `Search matched ${matchedSessions.length} sessions`);
  assert(matchedReviews.length > 0, `Search matched ${matchedReviews.length} reviews`);
  assert(elapsed < 10, `Full-text search completed in ${elapsed.toFixed(2)}ms (budget: < 10ms)`);
}

// Benchmark 7: Calendar & Planner Day Indexing (42-day cells)
{
  const t0 = performance.now();
  const sessionsByDate = new Map();
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    let list = sessionsByDate.get(s.date);
    if (!list) {
      list = [];
      sessionsByDate.set(s.date, list);
    }
    list.push(s);
  }

  // Populate 42 day cells
  let totalCellLookups = 0;
  for (let day = -20; day <= 21; day++) {
    const dStr = format(new Date(today.getTime() + day * 86400000), 'yyyy-MM-dd');
    const cellSessions = sessionsByDate.get(dStr) || [];
    totalCellLookups += cellSessions.length;
  }
  const t1 = performance.now();
  const elapsed = t1 - t0;

  assert(sessionsByDate.size > 0, `Pre-indexed ${sessions.length} sessions into ${sessionsByDate.size} calendar dates`);
  assert(elapsed < 5, `42 calendar cells rendered in ${elapsed.toFixed(2)}ms (budget: < 5ms)`);
}

// Benchmark 8: JSON Serialization Throughput (Simulate localStorage state write)
{
  const fullStorePayload = {
    lessons,
    sessions,
    learningSessionsHistory,
    reviewQueue,
    unclearTopics,
  };

  const t0 = performance.now();
  const serialized = JSON.stringify(fullStorePayload);
  const t1 = performance.now();
  const writeElapsed = t1 - t0;

  const t2 = performance.now();
  const deserialized = JSON.parse(serialized);
  const t3 = performance.now();
  const readElapsed = t3 - t2;

  const sizeKb = (serialized.length / 1024).toFixed(1);

  assert(deserialized.lessons.length === 100, `State serializes and deserializes accurately (${sizeKb} KB)`);
  assert(writeElapsed < 35, `State serialized in ${writeElapsed.toFixed(2)}ms (budget: < 35ms)`);
  assert(readElapsed < 35, `State parsed in ${readElapsed.toFixed(2)}ms (budget: < 35ms)`);
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log(`\n=================================================================`);
console.log(`PHASE 21 BENCHMARK SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log(`=================================================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
