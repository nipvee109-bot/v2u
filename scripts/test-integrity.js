// Automated QA test script for Phase 19 - Data Integrity Hardening
import assert from 'assert';

console.log('--- RUNNING PHASE 19 DATA INTEGRITY HARDENING QA TESTS ---');

const CURRENT_SCHEMA_VERSION = 4;
const MAX_BACKUP_SNAPSHOTS = 5;

// Mock storage for snapshots
let mockLocalStorage = {};

function computePayloadChecksum(payload) {
  const str = `${payload.schemaVersion || 0}_${(payload.lessons || []).length}_${
    (payload.sessions || []).length
  }_${(payload.reviewQueue || []).length}_${(payload.goals || []).length}_${
    (payload.resources || []).length
  }`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

function detectSchemaVersion(raw) {
  if (Array.isArray(raw)) {
    return 1;
  }
  if (raw && typeof raw === 'object') {
    if (typeof raw.schemaVersion === 'number') {
      return raw.schemaVersion;
    }
    if (raw.goals || raw.resources) {
      return 3;
    }
    if (raw.sessions || raw.reviewQueue || raw.learningSessionsHistory) {
      return 2;
    }
    if (raw.lessons) {
      return 1;
    }
  }
  return 0;
}

function sanitizeLesson(raw, index) {
  const l = (raw && typeof raw === 'object' ? raw : {});
  const id = typeof l.id === 'string' && l.id.trim() ? l.id : `lesson-${index + 1}`;
  const title = typeof l.title === 'string' && l.title.trim() ? l.title : `บทเรียนที่ ${index + 1}`;
  const subjectId = ['math', 'programming', 'physics', 'tgat3', 'ai'].includes(l.subjectId)
    ? l.subjectId
    : 'programming';
  const status = ['NOT STARTED', 'IN PROGRESS', 'COMPLETED'].includes(l.status)
    ? l.status
    : 'NOT STARTED';
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(l.difficulty)
    ? l.difficulty
    : 'Medium';

  return {
    id,
    title,
    subjectId,
    status,
    difficulty,
    month: typeof l.month === 'number' ? l.month : 1,
    order: typeof l.order === 'number' ? l.order : index + 1,
    estimatedMinutes: typeof l.estimatedMinutes === 'number' ? l.estimatedMinutes : 60,
    actualStudyMinutes: typeof l.actualStudyMinutes === 'number' ? l.actualStudyMinutes : 0,
    notes: typeof l.notes === 'string' ? l.notes : '',
    learnedNotes: typeof l.learnedNotes === 'string' ? l.learnedNotes : '',
    stillUnclearNotes: typeof l.stillUnclearNotes === 'string' ? l.stillUnclearNotes : '',
    keyTakeaways: Array.isArray(l.keyTakeaways) ? l.keyTakeaways : [],
    quizAttempts: Array.isArray(l.quizAttempts) ? l.quizAttempts : [],
    quizScore: typeof l.quizScore === 'number' ? l.quizScore : undefined,
    mastery: typeof l.mastery === 'number' && l.mastery >= 0 && l.mastery <= 4 ? l.mastery : 0,
    confidence: ['Low', 'Medium', 'High'].includes(l.confidence) ? l.confidence : undefined,
    reviewCount: typeof l.reviewCount === 'number' ? l.reviewCount : 0,
    nextReviewAt: typeof l.nextReviewAt === 'string' ? l.nextReviewAt : undefined,
    resources: Array.isArray(l.resources) ? l.resources : [],
    tags: Array.isArray(l.tags) ? l.tags : [],
    completedAt: typeof l.completedAt === 'string' ? l.completedAt : undefined,
    lastStudiedAt: typeof l.lastStudiedAt === 'string' ? l.lastStudiedAt : undefined,
  };
}

function migrateToLatestSchema(raw) {
  const version = detectSchemaVersion(raw);
  const warnings = [];

  let lessons = [];
  let sessions = [];
  let learningSessionsHistory = [];
  let unclearTopics = [];
  let weeklyGoal = { targetHours: 12, targetLessons: 4, targetReviews: 3 };
  let reviewQueue = [];
  let goals = [];
  let resources = [];
  let hasCompletedOnboarding = false;

  if (version === 1) {
    warnings.push('แปลงข้อมูลจากเวอร์ชัน 1 (ดั้งเดิม) สู่เวอร์ชัน 4');
    const rawLessons = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.lessons) ? raw.lessons : []);
    lessons = rawLessons.map((l, i) => sanitizeLesson(l, i));
    reviewQueue = lessons
      .filter((l) => l.status === 'COMPLETED')
      .map((l, i) => ({
        id: `rev-${l.id}`,
        lessonId: l.id,
        topic: l.title,
        createdAt: l.completedAt || new Date().toISOString(),
        lastReviewedAt: l.lastStudiedAt || l.completedAt,
        nextReviewAt: l.nextReviewAt || new Date().toISOString(),
        reviewCount: l.reviewCount || 0,
        status: 'pending',
        priority: 'Medium',
        reason: 'Interval Spaced Repetition',
        intervalDays: 3,
      }));
  } else if (version === 2 || version === 3 || version === 4) {
    const obj = raw || {};
    lessons = Array.isArray(obj.lessons) ? obj.lessons.map((l, i) => sanitizeLesson(l, i)) : [];
    sessions = Array.isArray(obj.sessions) ? obj.sessions : [];
    learningSessionsHistory = Array.isArray(obj.learningSessionsHistory) ? obj.learningSessionsHistory : [];
    unclearTopics = Array.isArray(obj.unclearTopics) ? obj.unclearTopics : [];
    if (obj.weeklyGoal && typeof obj.weeklyGoal === 'object') {
      weeklyGoal = {
        targetHours: obj.weeklyGoal.targetHours || 12,
        targetLessons: obj.weeklyGoal.targetLessons || 4,
        targetReviews: obj.weeklyGoal.targetReviews || 3,
      };
    }
    reviewQueue = Array.isArray(obj.reviewQueue) ? obj.reviewQueue : [];
    goals = Array.isArray(obj.goals) ? obj.goals : [];
    resources = Array.isArray(obj.resources) ? obj.resources : [];
    hasCompletedOnboarding = !!obj.hasCompletedOnboarding;
  }

  const completedCount = lessons.filter((l) => l.status === 'COMPLETED').length;
  const totalMinutes = lessons.reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);

  const payload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    checksum: '',
    metadata: {
      totalLessons: lessons.length,
      completedLessons: completedCount,
      totalSessions: sessions.length,
      totalStudyMinutes: totalMinutes,
      exportedBy: 'Engineering Study Hub',
    },
    lessons,
    sessions,
    learningSessionsHistory,
    unclearTopics,
    weeklyGoal,
    reviewQueue,
    goals,
    resources,
    hasCompletedOnboarding,
  };

  payload.checksum = computePayloadChecksum(payload);
  return { payload, warnings, detectedVersion: version };
}

function validateAndParseImport(jsonString) {
  const errors = [];
  const warnings = [];
  const stats = {
    lessonsCount: 0,
    completedLessonsCount: 0,
    sessionsCount: 0,
    learningSessionsCount: 0,
    unclearTopicsCount: 0,
    notesCount: 0,
    reviewsCount: 0,
    goalsCount: 0,
    resourcesCount: 0,
  };

  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return {
      isValid: false,
      errors: ['ไฟล์ว่างเปล่า ไม่มีเนื้อหา JSON'],
      warnings: [],
      detectedVersion: 0,
      stats,
    };
  }

  let raw;
  try {
    raw = JSON.parse(jsonString);
  } catch (err) {
    return {
      isValid: false,
      errors: [`รูปแบบไฟล์ JSON ไม่ถูกต้อง (${err.message})`],
      warnings: [],
      detectedVersion: 0,
      stats,
    };
  }

  if (!raw || (typeof raw !== 'object' && !Array.isArray(raw))) {
    return {
      isValid: false,
      errors: ['โครงสร้างข้อมูลต้องเป็น Object หรือ Array'],
      warnings: [],
      detectedVersion: 0,
      stats,
    };
  }

  const { payload, warnings: migrationWarnings, detectedVersion } = migrateToLatestSchema(raw);
  warnings.push(...migrationWarnings);

  stats.lessonsCount = payload.lessons.length;
  stats.completedLessonsCount = payload.lessons.filter((l) => l.status === 'COMPLETED').length;
  stats.sessionsCount = payload.sessions.length;
  stats.learningSessionsCount = payload.learningSessionsHistory.length;
  stats.unclearTopicsCount = payload.unclearTopics.length;
  stats.notesCount = payload.lessons.filter((l) => l.learnedNotes || l.notes).length;
  stats.reviewsCount = payload.reviewQueue.length;
  stats.goalsCount = payload.goals.length;
  stats.resourcesCount = payload.resources.length;

  return {
    isValid: true,
    errors,
    warnings,
    detectedVersion,
    stats,
    migratedPayload: payload,
  };
}

function mergePayloadWithExisting(existing, imported) {
  const existingLessonIds = new Set(existing.lessons.map((l) => l.id));
  const mergedLessons = [
    ...existing.lessons.map((el) => {
      const match = imported.lessons.find((il) => il.id === el.id);
      if (!match) return el;
      return {
        ...el,
        ...match,
        actualStudyMinutes: Math.max(el.actualStudyMinutes || 0, match.actualStudyMinutes || 0),
      };
    }),
    ...imported.lessons.filter((il) => !existingLessonIds.has(il.id)),
  ];

  const existingSessionIds = new Set(existing.sessions.map((s) => s.id));
  const mergedSessions = [
    ...existing.sessions,
    ...imported.sessions.filter((s) => !existingSessionIds.has(s.id)),
  ];

  const existingReviewIds = new Set(existing.reviewQueue.map((r) => r.id));
  const mergedReviews = [
    ...existing.reviewQueue,
    ...imported.reviewQueue.filter((r) => !existingReviewIds.has(r.id)),
  ];

  const existingGoalIds = new Set(existing.goals.map((g) => g.id));
  const mergedGoals = [
    ...existing.goals,
    ...imported.goals.filter((g) => !existingGoalIds.has(g.id)),
  ];

  const existingResourceIds = new Set(existing.resources.map((r) => r.id));
  const mergedResources = [
    ...existing.resources,
    ...imported.resources.filter((r) => !existingResourceIds.has(r.id)),
  ];

  const completedCount = mergedLessons.filter((l) => l.status === 'COMPLETED').length;
  const totalMinutes = mergedLessons.reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);

  const merged = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    checksum: '',
    metadata: {
      totalLessons: mergedLessons.length,
      completedLessons: completedCount,
      totalSessions: mergedSessions.length,
      totalStudyMinutes: totalMinutes,
      exportedBy: 'Engineering Study Hub (Merged)',
    },
    lessons: mergedLessons,
    sessions: mergedSessions,
    learningSessionsHistory: existing.learningSessionsHistory,
    unclearTopics: existing.unclearTopics,
    weeklyGoal: imported.weeklyGoal || existing.weeklyGoal,
    reviewQueue: mergedReviews,
    goals: mergedGoals,
    resources: mergedResources,
    hasCompletedOnboarding: existing.hasCompletedOnboarding || imported.hasCompletedOnboarding,
  };
  merged.checksum = computePayloadChecksum(merged);
  return merged;
}

// Snapshot helpers with mock storage
function saveSnapshots(snapshots) {
  mockLocalStorage['snapshots'] = JSON.stringify(snapshots);
}
function loadSnapshots() {
  const raw = mockLocalStorage['snapshots'];
  return raw ? JSON.parse(raw) : [];
}

function createLocalBackupSnapshot(payload, reason, label) {
  const id = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const snapshot = {
    id,
    createdAt: new Date().toISOString(),
    reason,
    label: label || `Snapshot ${reason}`,
    stats: {
      lessonsCount: payload.lessons.length,
      completedLessonsCount: payload.lessons.filter((l) => l.status === 'COMPLETED').length,
    },
    payload,
  };

  const existing = loadSnapshots();
  const updated = [snapshot, ...existing].slice(0, MAX_BACKUP_SNAPSHOTS);
  saveSnapshots(updated);
  return snapshot;
}

// ==========================================
// TEST SUITE 1: Detect Schema Version
// ==========================================
console.log('\n--- 1. Testing Schema Detection ---');

const v1RawArray = [{ id: 'l1', title: 'Calculus' }];
assert.strictEqual(detectSchemaVersion(v1RawArray), 1, 'Array of lessons should be detected as v1');

const v1Object = { lessons: [{ id: 'l1' }] };
assert.strictEqual(detectSchemaVersion(v1Object), 1, 'Object with only lessons should be detected as v1');

const v2Object = { lessons: [], sessions: [], reviewQueue: [] };
assert.strictEqual(detectSchemaVersion(v2Object), 2, 'Object with sessions/reviews should be detected as v2');

const v3Object = { lessons: [], goals: [], resources: [] };
assert.strictEqual(detectSchemaVersion(v3Object), 3, 'Object with goals/resources should be detected as v3');

const v4Object = { schemaVersion: 4, lessons: [] };
assert.strictEqual(detectSchemaVersion(v4Object), 4, 'Explicit schemaVersion: 4 should be detected as v4');

console.log('✓ Schema detection correctly identified v1, v2, v3, and v4.');

// ==========================================
// TEST SUITE 2: Legacy v1 Migration to v4
// ==========================================
console.log('\n--- 2. Testing v1 Migration to v4 ---');

const legacyLessons = [
  { id: 'math-1', title: 'Calculus I', status: 'COMPLETED', completedAt: '2026-09-01T10:00:00Z' },
  { id: 'prog-1', title: 'Python Basics', status: 'IN PROGRESS' },
  { title: 'Incomplete object missing id' }, // partial missing id
];

const v1Result = migrateToLatestSchema(legacyLessons);
assert.strictEqual(v1Result.detectedVersion, 1);
assert.strictEqual(v1Result.payload.schemaVersion, 4);
assert.strictEqual(v1Result.payload.lessons.length, 3);
assert.strictEqual(v1Result.payload.lessons[0].id, 'math-1');
assert.strictEqual(v1Result.payload.lessons[2].id, 'lesson-3', 'Missing id was gracefully repaired');
assert.strictEqual(v1Result.payload.lessons[0].mastery, 0, 'Default mastery filled');
assert.ok(v1Result.payload.reviewQueue.length >= 1, 'Auto-created review queue item for completed lesson');
assert.ok(v1Result.payload.checksum.startsWith('hash-'), 'Checksum computed');

console.log('✓ Legacy v1 successfully migrated to v4 with repaired fields & review item auto-creation.');

// ==========================================
// TEST SUITE 3: Invalid & Corrupted JSON Handling
// ==========================================
console.log('\n--- 3. Testing Corrupt & Invalid JSON (Safe validation) ---');

// Syntax Error: unclosed JSON
const corruptJson = '{"schemaVersion": 4, "lessons": [{"id": "bad"';
const corruptRes = validateAndParseImport(corruptJson);
assert.strictEqual(corruptRes.isValid, false, 'Corrupted JSON must be invalid');
assert.ok(corruptRes.errors.length > 0, 'Error message must be present');
assert.ok(corruptRes.errors[0].includes('JSON'), 'Error mentions JSON');

// Empty string
const emptyRes = validateAndParseImport('');
assert.strictEqual(emptyRes.isValid, false, 'Empty string must be invalid');

// Primitive string instead of object/array
const primitiveRes = validateAndParseImport('"just a string"');
assert.strictEqual(primitiveRes.isValid, false, 'Primitive must be rejected');

console.log('✓ Corrupt/invalid inputs are handled safely without unhandled crashes.');

// ==========================================
// TEST SUITE 4: Partial and Empty Object Data
// ==========================================
console.log('\n--- 4. Testing Empty & Partial Object Handling ---');

const emptyObjectJson = '{}';
const emptyObjRes = validateAndParseImport(emptyObjectJson);
assert.strictEqual(emptyObjRes.isValid, true, 'Empty object is migrated gracefully to default payload');
assert.strictEqual(emptyObjRes.migratedPayload.schemaVersion, 4);
assert.strictEqual(emptyObjRes.migratedPayload.lessons.length, 0);

console.log('✓ Empty object gracefully handled and converted to valid v4 payload.');

// ==========================================
// TEST SUITE 5: Full v4 Roundtrip Validation & Stats
// ==========================================
console.log('\n--- 5. Testing Full v4 Roundtrip & Validation Stats ---');

const v4FullPayload = {
  schemaVersion: 4,
  exportedAt: new Date().toISOString(),
  appVersion: '1.0.0',
  checksum: 'mock',
  metadata: {
    totalLessons: 2,
    completedLessons: 1,
    totalSessions: 1,
    totalStudyMinutes: 90,
    exportedBy: 'Test',
  },
  lessons: [
    {
      id: 'math-diff',
      title: 'Differentiation',
      subjectId: 'math',
      status: 'COMPLETED',
      difficulty: 'Medium',
      month: 1,
      order: 1,
      actualStudyMinutes: 90,
      learnedNotes: 'Chain rule is key',
      quizAttempts: [{ id: 'q1', timestamp: '2026-09-02', score: 85 }],
      quizScore: 85,
      mastery: 3,
      confidence: 'High',
    },
    {
      id: 'prog-py',
      title: 'Python Functions',
      subjectId: 'programming',
      status: 'NOT STARTED',
      difficulty: 'Easy',
      month: 1,
      order: 2,
    },
  ],
  sessions: [
    { id: 's1', date: '2026-10-02', startTime: '09:00', endTime: '10:30', plannedMinutes: 90, status: 'completed' },
  ],
  learningSessionsHistory: [],
  unclearTopics: [],
  weeklyGoal: { targetHours: 14, targetLessons: 5, targetReviews: 4 },
  reviewQueue: [
    { id: 'rev-math-diff', lessonId: 'math-diff', topic: 'Differentiation', nextReviewAt: '2026-10-05', status: 'pending' },
  ],
  goals: [
    { id: 'g1', title: 'Complete Math in 6 months', type: 'subject_milestones', targetValue: 10, currentValue: 1 },
  ],
  resources: [
    { id: 'r1', title: '3Blue1Brown Calculus', url: 'https://youtube.com', type: 'youtube' },
  ],
  hasCompletedOnboarding: true,
};

const v4Json = JSON.stringify(v4FullPayload);
const parseRes = validateAndParseImport(v4Json);
assert.strictEqual(parseRes.isValid, true);
assert.strictEqual(parseRes.detectedVersion, 4);
assert.strictEqual(parseRes.stats.lessonsCount, 2);
assert.strictEqual(parseRes.stats.completedLessonsCount, 1);
assert.strictEqual(parseRes.stats.sessionsCount, 1);
assert.strictEqual(parseRes.stats.notesCount, 1);
assert.strictEqual(parseRes.stats.reviewsCount, 1);
assert.strictEqual(parseRes.stats.goalsCount, 1);
assert.strictEqual(parseRes.stats.resourcesCount, 1);

console.log('✓ Full v4 payload parsed and validation stats computed accurately.');

// ==========================================
// TEST SUITE 6: Merge vs Replace Logic
// ==========================================
console.log('\n--- 6. Testing Merge vs Replace Logic ---');

const existingData = {
  schemaVersion: 4,
  lessons: [
    { id: 'l1', title: 'Existing Lesson 1', status: 'IN PROGRESS', actualStudyMinutes: 40 },
    { id: 'l2', title: 'Existing Lesson 2', status: 'NOT STARTED', actualStudyMinutes: 0 },
  ],
  sessions: [{ id: 's1', title: 'Existing Session 1' }],
  learningSessionsHistory: [],
  unclearTopics: [],
  weeklyGoal: { targetHours: 10, targetLessons: 3, targetReviews: 2 },
  reviewQueue: [{ id: 'r1', lessonId: 'l1' }],
  goals: [{ id: 'g1', title: 'Goal 1' }],
  resources: [{ id: 'res1', title: 'Res 1' }],
  hasCompletedOnboarding: false,
};

const incomingData = {
  schemaVersion: 4,
  lessons: [
    { id: 'l1', title: 'Updated Lesson 1', status: 'COMPLETED', actualStudyMinutes: 75 }, // Update existing
    { id: 'l3', title: 'New Imported Lesson 3', status: 'COMPLETED', actualStudyMinutes: 50 }, // New lesson
  ],
  sessions: [
    { id: 's1', title: 'Duplicate Session 1' }, // Duplicate session ID
    { id: 's2', title: 'New Session 2' },
  ],
  learningSessionsHistory: [],
  unclearTopics: [],
  weeklyGoal: { targetHours: 15, targetLessons: 5, targetReviews: 4 },
  reviewQueue: [{ id: 'r2', lessonId: 'l3' }],
  goals: [{ id: 'g2', title: 'Goal 2' }],
  resources: [{ id: 'res2', title: 'Res 2' }],
  hasCompletedOnboarding: true,
};

const merged = mergePayloadWithExisting(existingData, incomingData);
assert.strictEqual(merged.lessons.length, 3, 'Merged lessons must have 3 items (l1, l2, l3)');
const mergedL1 = merged.lessons.find((l) => l.id === 'l1');
assert.strictEqual(mergedL1.actualStudyMinutes, 75, 'Merged l1 should have the higher study minutes');
assert.strictEqual(merged.sessions.length, 2, 'Duplicate session s1 deduplicated; s2 added');
assert.strictEqual(merged.goals.length, 2, 'Goals merged to 2 items');
assert.strictEqual(merged.resources.length, 2, 'Resources merged to 2 items');
assert.strictEqual(merged.hasCompletedOnboarding, true, 'hasCompletedOnboarding flag preserved');

console.log('✓ Merge logic accurately updates matching records and adds new ones without duplicates.');

// ==========================================
// TEST SUITE 7: Local Backup Snapshots & Rolling Limit (5 max)
// ==========================================
console.log('\n--- 7. Testing Local Backup Snapshots & Rolling Limit ---');

mockLocalStorage = {}; // Reset mock

// Create 7 snapshots to verify max 5 limit
for (let i = 1; i <= 7; i++) {
  createLocalBackupSnapshot(
    { lessons: [{ id: `l-${i}`, status: 'COMPLETED' }] },
    i % 2 === 0 ? 'auto_before_import' : 'auto_before_reset',
    `Snapshot ${i}`
  );
}

const storedSnapshots = loadSnapshots();
assert.strictEqual(storedSnapshots.length, 5, 'Must keep at most 5 rolling snapshots');
assert.strictEqual(storedSnapshots[0].label, 'Snapshot 7', 'Newest snapshot must be first');
assert.strictEqual(storedSnapshots[4].label, 'Snapshot 3', 'Oldest preserved snapshot is Snapshot 3');

console.log('✓ Local backup snapshots rolling limit (max 5) verified successfully.');

console.log('\n======================================================');
console.log('ALL PHASE 19 DATA INTEGRITY TESTS PASSED SUCCESSFULLY!');
console.log('======================================================');
