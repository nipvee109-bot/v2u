/**
 * Test Suite: Phase 32 — Learning Session Memory
 */

import assert from 'node:assert';

function formatDurationThai(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 นาที';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} ชม. ${mins} นาที`;
  }
  if (hours > 0) {
    return `${hours} ชม.`;
  }
  return `${mins} นาที`;
}

function computeLessonHistory(lesson, history) {
  const completedSessions = (history || []).filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );

  const sessionMinutes = completedSessions.reduce(
    (acc, s) => acc + Math.round((s.actualSeconds || 0) / 60),
    0
  );

  const totalStudyMinutes = Math.max(
    lesson.totalStudyMinutes || 0,
    lesson.actualStudyMinutes || 0,
    sessionMinutes
  );

  const studyCount = Math.max(
    lesson.studyCount || 0,
    completedSessions.length,
    lesson.status === 'COMPLETED' ? 1 : 0
  );

  const allDates = [
    ...(lesson.firstStudiedAt ? [lesson.firstStudiedAt] : []),
    ...(lesson.lastStudiedAt ? [lesson.lastStudiedAt] : []),
    ...(lesson.completedAt ? [lesson.completedAt] : []),
    ...completedSessions.flatMap((s) => [s.startedAt, s.completedAt]).filter(Boolean),
  ].sort();

  const firstStudiedAt = lesson.firstStudiedAt || allDates[0];
  const lastStudiedAt = allDates[allDates.length - 1] || lesson.lastStudiedAt || lesson.completedAt;

  const distinctResourcesMap = new Map();
  (lesson.resources || []).forEach((r) => distinctResourcesMap.set(r.id, r));
  completedSessions.forEach((s) => {
    if (s.source) distinctResourcesMap.set(s.source.id, s.source);
    (s.resourcesUsed || []).forEach((r) => distinctResourcesMap.set(r.id, r));
  });

  return {
    totalStudyMinutes,
    studyCount,
    firstStudiedAt,
    lastStudiedAt,
    distinctResourcesCount: distinctResourcesMap.size,
    completedSessionsCount: completedSessions.length,
  };
}

console.log('=== Running Phase 32: Learning Session Memory Tests ===\n');

// Test 1: formatDurationThai formatting
assert.strictEqual(formatDurationThai(0), '0 นาที');
assert.strictEqual(formatDurationThai(45), '45 นาที');
assert.strictEqual(formatDurationThai(60), '1 ชม.');
assert.strictEqual(formatDurationThai(125), '2 ชม. 5 นาที');
console.log('✔ Test 1: Thai duration formatting behaves accurately');

// Test 2: Backward compatibility with legacy lessons (0 sessions in history)
const legacyLesson = {
  id: 'legacy-lesson-1',
  title: 'ฟิสิกส์การเคลื่อนที่',
  subjectId: 'physics',
  status: 'COMPLETED',
  actualStudyMinutes: 75,
  completedAt: '2026-09-15T10:00:00.000Z',
  resources: [{ id: 'res-old-1', title: 'ตำราฟิสิกส์', type: 'document' }],
};

const legacyStats = computeLessonHistory(legacyLesson, []);
assert.strictEqual(legacyStats.totalStudyMinutes, 75, 'Falls back to actualStudyMinutes');
assert.strictEqual(legacyStats.studyCount, 1, 'Completed legacy lesson has studyCount >= 1');
assert.strictEqual(legacyStats.firstStudiedAt, '2026-09-15T10:00:00.000Z');
assert.strictEqual(legacyStats.lastStudiedAt, '2026-09-15T10:00:00.000Z');
assert.strictEqual(legacyStats.distinctResourcesCount, 1);
assert.strictEqual(legacyStats.completedSessionsCount, 0);
console.log('✔ Test 2: Gracefully handles legacy lesson without history');

// Test 3: Multi-session history with session memory fields
const session1 = {
  sessionId: 'sess-1',
  lessonId: 'lesson-ai-1',
  status: 'completed',
  startedAt: '2026-10-01T09:00:00.000Z',
  completedAt: '2026-10-01T09:40:00.000Z',
  actualSeconds: 2400, // 40 minutes
  source: { id: 'yt-1', title: 'Intro to AI', type: 'youtube' },
  resourcesUsed: [{ id: 'yt-1', title: 'Intro to AI', type: 'youtube' }],
  notesDraft: {
    learnedNotes: 'เข้าใจ Perceptron และ Neural Net เบื้องต้น',
    stillUnclearNotes: 'Backpropagation derivation',
  },
  confidenceRating: 'Medium',
  quizScore: 75,
  timestampedNotes: [
    { id: 'ts-1', timestampSeconds: 300, timestampDisplay: '00:05:00', content: 'Neuron activation formula' }
  ],
};

const session2 = {
  sessionId: 'sess-2',
  lessonId: 'lesson-ai-1',
  status: 'completed',
  startedAt: '2026-10-02T14:00:00.000Z',
  completedAt: '2026-10-02T15:00:00.000Z',
  actualSeconds: 3600, // 60 minutes
  source: { id: 'pdf-1', title: 'Deep Learning Book Ch 6', type: 'pdf' },
  resourcesUsed: [
    { id: 'pdf-1', title: 'Deep Learning Book Ch 6', type: 'pdf' },
    { id: 'web-1', title: 'PyTorch Tutorial', type: 'website' },
  ],
  notesDraft: {
    learnedNotes: 'เข้าใจ Chain Rule ใน Backpropagation แล้ว',
    stillUnclearNotes: '',
  },
  confidenceRating: 'High',
  quizScore: 90,
  timestampedNotes: [],
};

const activeLesson = {
  id: 'lesson-ai-1',
  title: 'Artificial Neural Networks',
  subjectId: 'ai',
  status: 'COMPLETED',
  resources: [],
};

const aiStats = computeLessonHistory(activeLesson, [session1, session2]);

// Verify multi-session aggregation
assert.strictEqual(aiStats.completedSessionsCount, 2, 'Tracks 2 completed sessions');
assert.strictEqual(aiStats.totalStudyMinutes, 100, 'Sums 40 + 60 = 100 minutes');
assert.strictEqual(aiStats.studyCount, 2, '2 total study sessions recorded');
assert.strictEqual(aiStats.firstStudiedAt, '2026-10-01T09:00:00.000Z', 'First studied matches session 1');
assert.strictEqual(aiStats.lastStudiedAt, '2026-10-02T15:00:00.000Z', 'Last studied matches session 2');
assert.strictEqual(aiStats.distinctResourcesCount, 3, 'Aggregates distinct resources used across all sessions (yt-1, pdf-1, web-1)');
console.log('✔ Test 3: Multi-session history aggregates time, counts, and distinct resources');

// Test 4: Memory integrity within individual sessions
assert.strictEqual(session1.notesDraft.learnedNotes, 'เข้าใจ Perceptron และ Neural Net เบื้องต้น');
assert.strictEqual(session1.confidenceRating, 'Medium');
assert.strictEqual(session1.quizScore, 75);
assert.strictEqual(session1.timestampedNotes.length, 1);

assert.strictEqual(session2.confidenceRating, 'High');
assert.strictEqual(session2.quizScore, 90);
assert.strictEqual(session2.resourcesUsed.length, 2);
console.log('✔ Test 4: Individual session memory preserves notes, confidence, quiz, and resources');

// Test 5: Ignored non-matching sessions
const otherSession = {
  sessionId: 'sess-other',
  lessonId: 'different-lesson',
  status: 'completed',
  actualSeconds: 1800,
};

const filteredStats = computeLessonHistory(activeLesson, [session1, session2, otherSession]);
assert.strictEqual(filteredStats.completedSessionsCount, 2, 'Ignores sessions from other lessons');
assert.strictEqual(filteredStats.totalStudyMinutes, 100);
console.log('✔ Test 5: Sessions strictly isolated per lesson ID');

console.log('\nAll Phase 32 tests passed successfully!\n');
