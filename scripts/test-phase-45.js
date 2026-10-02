/**
 * Test Suite: Phase 45 — V2U Adaptive Next Step
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

console.log('=== Phase 45: V2U Adaptive Next Step ===\n');

const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const NOW = new Date('2026-10-02T12:00:00Z');
const lessons = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const byTitle = (t) => lessons.find((l) => l.title === t);
const rec = (lesson, patch = {}) => ({
  lessonId: lesson.id, subjectId: lesson.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED',
  confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch,
});
const blank = lessons.map((l) => rec(l));
const profile = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 };
const weakPython = blank.map((r) => (r.lessonId === byTitle('Python พื้นฐาน').id
  ? { ...r, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, quizLatestScore: 20 } : r));
const overdue = [{ id: 'rv1', lessonId: byTitle('ตรีโกณมิติ').id, topic: 'ตรีโกณมิติ', nextReviewAt: '2026-09-01T00:00:00Z' }];
const step = (extra = {}, routeExtra = {}) =>
  getNextStep({ lessons, referenceDate: NOW, route: { profile, records: blank, ...routeExtra }, ...extra });

const assertExplained = (s) => {
  assert(s.todayAction && s.todayAction.length > 3, 'WHAT');
  assert(s.reason && s.reason.length > 10, 'WHY');
  assert(typeof s.minutes === 'number' && s.minutes > 0, 'TIME');
  assert(s.outcome && s.outcome.length > 3, 'OUTCOME');
  assert.strictEqual(s.ctaLabel, 'เริ่มขั้นต่อไป');
};

console.log('1. Deterministic priority');
await test('1st: unfinished study wins over everything', () => {
  const s = step({ activeLearningSession: { lessonId: byTitle('ตรีโกณมิติ').id, status: 'active' }, overdueReviews: overdue }, { records: weakPython });
  assert.strictEqual(s.rule, 'unfinished-study');
  assert(s.href.startsWith('/learn/curriculum/'), 'continue goes to the Learning Hub: ' + s.href);
});
await test('2nd: overdue review beats weak skill and new lessons', () => {
  const s = step({ overdueReviews: overdue }, { records: weakPython });
  assert.strictEqual(s.rule, 'overdue-review');
  assert.strictEqual(s.href, '/review/rv1');
  assertExplained(s);
});
await test('3rd: weak skill beats the next route lesson', () => {
  const s = step({}, { records: weakPython });
  assert.strictEqual(s.rule, 'weak-skill');
  assert.strictEqual(s.kind, 'strengthen');
  assert(s.href.startsWith('/learn/curriculum/'), 'weak skill opens the Learning Hub: ' + s.href);
  assert(s.reason.includes('คะแนนแบบทดสอบ'), s.reason);
  assertExplained(s);
});
await test('4th: route lesson — current requirement, with plan that fits available time', () => {
  const s = step();
  assert.strictEqual(s.rule, 'route');
  assert.strictEqual(s.curriculum.lessonId, 'math-alg-linear-eq');
  assert.strictEqual(s.href, '/learn/curriculum/math-alg-linear-eq');
  assert.strictEqual(s.requiresResourceConfirmation, true, 'still goes through resource confirmation');
  assert(s.reason.includes('เป็นพื้นฐานของ') && s.reason.includes('วิศวกรรมคอมพิวเตอร์'), s.reason);
  assertExplained(s);
});
await test('Recommended resource matches the resource the plan starts with', () => {
  for (const m of [15, 30, 60, 120]) {
    const s = step({}, { budget: m });
    assert.strictEqual(s.curriculum.recommendedResource.id, s.plan.steps.find((x) => x.resourceId).resourceId, `budget ${m}`);
  }
});
await test('Available time adapts the plan (15/30/60/120)', () => {
  for (const m of [15, 30, 60, 120]) {
    const s = step({}, { budget: m });
    assert.strictEqual(s.minutes, m);
    assert.strictEqual(s.plan.totalMinutes, m);
  }
  const s = getNextStep({ lessons, referenceDate: NOW, route: { profile: { ...profile, availableMinutes: 120 }, records: blank } });
  assert.strictEqual(s.minutes, 120);
});
await test('Prerequisite gap is respected via the route', () => {
  // Pretend math is proven by skills but its lessons are not completed; physics is current.
  const proven = blank.map((r) => (lessons.find((l) => l.id === r.lessonId).subjectId === 'math'
    ? { ...r, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-12-01T00:00:00Z' } : r));
  const done = lessons.map((l) => (l.title === 'หน่วย และ เวกเตอร์' ? { ...l, status: 'COMPLETED' } : l));
  const provenPlusPhysics = proven.map((r) => (r.lessonId === byTitle('หน่วย และ เวกเตอร์').id
    ? { ...r, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-12-01T00:00:00Z' } : r));
  const s = getNextStep({ lessons: done, referenceDate: NOW, route: { profile, records: provenPlusPhysics } });
  assert.strictEqual(s.rule, 'route');
  assert.strictEqual(s.curriculum.lessonId, 'math-alg-linear-eq', 'kinematics needs linear equations first');
  assert(s.reason.includes('ต้องปูพื้น'), s.reason);
});
await test('Same inputs → same step (deterministic)', () => {
  assert.deepStrictEqual(step({}, { records: weakPython }), step({}, { records: weakPython }));
});

console.log('\n2. Home answers');
await test('Current / goal / missing come from the route in adaptive mode', () => {
  const s = step();
  assert(s.current.label.startsWith('ขั้นที่ 1/6: พื้นฐานคณิตศาสตร์'), s.current.label);
  assert(s.current.detail.includes('Digital Business Technology'));
  assert.strictEqual(s.goal.label, 'คณะวิศวกรรมศาสตร์ · วิศวกรรมคอมพิวเตอร์');
  assert(s.missing.some((m) => m.includes('ยังขาดอีก')));
});
await test('Legacy mode (no route context) keeps Phase 41/42 behaviour', () => {
  const s = getNextStep({ lessons });
  assert.strictEqual(s.rule, 'recommendation');
  assert.strictEqual(s.minutes, undefined);
  assert(s.current.label.includes('เดือนที่'));
});
await test('Home uses adaptive mode and shows WHAT / WHY / TIME / OUTCOME with one CTA', () => {
  const home = read('src/pages/HomePage.tsx');
  // Phase 47: inputs live in the shared useNextStepParams hook
  assert(home.includes('getNextStep(useNextStepParams())'));
  assert(read('src/hooks/useNextStep.ts').includes('route: { profile: studentProfile, records, budget'));
  for (const x of [ 'step.todayAction', 'step.reason', 'step.minutes', 'step.outcome', '<TimeBudgetPicker']) {
    assert(home.includes(x), x);
  }
  assert.strictEqual((home.match(/<button/g) || []).length, 1);
});
await test('Plain Thai only in step text', () => {
  const s = JSON.stringify([step(), step({}, { records: weakPython }), step({ overdueReviews: overdue })]).toLowerCase();
  for (const j of ['mastery', 'spaced repetition', 'ebbinghaus', 'knowledge gap']) assert(!s.includes(j), j);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
