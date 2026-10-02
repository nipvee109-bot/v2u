/**
 * Test Suite: Phase 45B — Backup / Profile Persistence
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
const jiti = createJiti(import.meta.url);

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}\n     ${err.message}`);
    failed++;
  }
}

console.log('=== Phase 45B: Backup / Profile Persistence ===\n');

const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { initialLessons, initialWeeklyGoal } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const profile = { educationLevel: 'ปวช.2', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 60 };
const lessons = initialLessons.slice(0, 3).map((l, i) => ({
  ...l,
  status: i === 0 ? 'COMPLETED' : 'NOT STARTED',
  masteryScore: i === 0 ? 3 : 0,
  quizScore: i === 0 ? 85 : undefined,
  nextReviewAt: i === 0 ? '2026-10-10T00:00:00.000Z' : undefined,
}));
const state = {
  lessons,
  sessions: [{ id: 's1', title: 'เรียนคณิต', subjectId: 'math', date: '2026-10-01', startTime: '19:00', endTime: '20:00', status: 'completed', lessonId: lessons[0].id }],
  learningSessionsHistory: [{ sessionId: 'ls1', lessonId: lessons[0].id, status: 'completed', startedAt: '2026-10-01T12:00:00Z', actualSeconds: 1800 }],
  unclearTopics: [],
  weeklyGoal: initialWeeklyGoal,
  reviewQueue: [{ id: 'r1', lessonId: lessons[0].id, topic: lessons[0].title, createdAt: '2026-10-01T00:00:00Z', nextReviewAt: '2026-10-04T00:00:00Z', reviewCount: 0, status: 'pending', reason: 'scheduled', priority: 'Medium' }],
  goals: [],
  resources: [],
  hasCompletedOnboarding: true,
  studentProfile: profile,
};
const roundtrip = (payload) => I.validateAndParseImport(JSON.stringify(payload));
const v4Like = (payload) => {
  const { studentProfile: _drop, ...rest } = payload;
  const old = { ...rest, schemaVersion: 4, checksum: '' };
  old.checksum = I.computePayloadChecksum(old);
  return old;
};

console.log('1. Export');
await test('Export is schema v5 and includes studentProfile', () => {
  const p = I.createExportPayload(state);
  assert.strictEqual(I.CURRENT_SCHEMA_VERSION, 5);
  assert.strictEqual(p.schemaVersion, 5);
  assert.deepStrictEqual(p.studentProfile, profile);
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(p))), 'valid');
});
await test('Export keeps progress, readiness, review state and study history', () => {
  const p = JSON.parse(JSON.stringify(I.createExportPayload(state)));
  assert.strictEqual(p.lessons[0].status, 'COMPLETED');
  assert.strictEqual(p.lessons[0].masteryScore, 3);
  assert.strictEqual(p.lessons[0].quizScore, 85);
  assert.strictEqual(p.reviewQueue.length, 1);
  assert.strictEqual(p.learningSessionsHistory.length, 1);
  assert.strictEqual(p.sessions.length, 1);
});
await test('Export without a profile records null (not invented values)', () => {
  assert.strictEqual(I.createExportPayload({ ...state, studentProfile: null }).studentProfile, null);
});

console.log('\n2. Import');
await test('Import restores studentProfile together with learning data', () => {
  const r = roundtrip(I.createExportPayload(state));
  assert.strictEqual(r.isValid, true, r.errors.join());
  assert.deepStrictEqual(r.migratedPayload.studentProfile, profile);
  assert.strictEqual(r.migratedPayload.lessons[0].status, 'COMPLETED');
  assert.strictEqual(r.migratedPayload.lessons[0].masteryScore, 3);
  assert.strictEqual(r.migratedPayload.reviewQueue.length, 1);
});
await test('Imported profile values are normalised (invalid values repaired)', () => {
  const p = I.createExportPayload(state);
  const bad = { ...p, studentProfile: { ...profile, availableMinutes: 45, programId: 'nope' } };
  bad.checksum = I.computePayloadChecksum(bad);
  const r = roundtrip(bad);
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.migratedPayload.studentProfile.availableMinutes, 30);
  assert.strictEqual(r.migratedPayload.studentProfile.programId, 'other');
});
await test('Old v4 export without studentProfile still imports', () => {
  const r = roundtrip(v4Like(I.createExportPayload(state)));
  assert.strictEqual(r.isValid, true, r.errors.join());
  assert.strictEqual(r.detectedVersion, 4);
  assert.strictEqual(r.migratedPayload.schemaVersion, 5);
  assert.strictEqual(r.migratedPayload.studentProfile, null);
  assert(r.warnings.some((w) => w.includes('ไม่มีข้อมูลเส้นทาง')));
  assert.strictEqual(r.migratedPayload.lessons.length, 3);
});
await test('v1 / v2 / v3 shapes without checksum still import', () => {
  assert.strictEqual(roundtrip(lessons).isValid, true);
  assert.strictEqual(roundtrip({ lessons, sessions: state.sessions }).isValid, true);
  assert.strictEqual(roundtrip({ lessons, goals: [] }).isValid, true);
});
await test('Merge: imported profile wins; missing imported profile keeps the existing one', () => {
  const current = I.createExportPayload(state);
  const other = { ...profile, educationLevel: 'ปวส.1' };
  assert.strictEqual(I.mergePayloadWithExisting(current, { ...current, studentProfile: other }).studentProfile.educationLevel, 'ปวส.1');
  assert.deepStrictEqual(I.mergePayloadWithExisting(current, { ...current, studentProfile: null }).studentProfile, profile);
});

console.log('\n3. Checksum');
await test('Invalid checksum is rejected (v5 tampered profile)', () => {
  const p = JSON.parse(JSON.stringify(I.createExportPayload(state)));
  p.studentProfile.targetId = 'target-other';
  const r = roundtrip(p);
  assert.strictEqual(r.isValid, false);
  assert(r.errors[0].includes('checksum'));
  assert.strictEqual(r.migratedPayload, undefined);
});
await test('Invalid checksum is rejected (v5 / v4 tampered data or bogus value)', () => {
  const p = JSON.parse(JSON.stringify(I.createExportPayload(state)));
  p.reviewQueue = [];
  assert.strictEqual(roundtrip(p).isValid, false);
  const v4 = v4Like(I.createExportPayload(state));
  v4.lessons = v4.lessons.slice(0, 1);
  assert.strictEqual(roundtrip(v4).isValid, false);
  assert.strictEqual(roundtrip({ ...I.createExportPayload(state), checksum: 'hash-deadbeef' }).isValid, false);
});
await test('v4 checksum formula unchanged (old files keep verifying)', () => {
  const v4 = v4Like(I.createExportPayload(state));
  assert.strictEqual(I.verifyPayloadChecksum(v4), 'valid');
  assert.strictEqual(I.verifyPayloadChecksum({ schemaVersion: 3, checksum: 'x' }), 'missing');
});

console.log('\n4. Wiring');
await test('Settings exports and imports/restores studentProfile', () => {
  const s = read('src/pages/Settings.tsx');
  assert(s.includes('      studentProfile,\n    });'), 'export passes studentProfile');
  assert(s.includes('studentProfile: finalPayload.studentProfile'), 'import restores it');
  assert(s.includes('studentProfile: p.studentProfile'), 'snapshot restore restores it');
});
await test('Store importData restores a provided profile and keeps the current one otherwise', () => {
  const store = read('src/store/useStore.ts');
  assert(store.includes('...(data.studentProfile ? { studentProfile: data.studentProfile } : {})'));
  assert(store.includes("name: 'engineering-study-hub-storage'"));
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
