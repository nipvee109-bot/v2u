/**
 * Test Suite: Phase 42B — V2U Resource Curation Foundation
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { useActionableRegistry } from './lib/actionableFixture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
const jiti = createJiti(import.meta.url);
// Phase 67: learners only see verified links; this suite tests selection logic on a verified fixture
await useActionableRegistry(jiti, root, path);

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

console.log('=== Phase 42B: V2U Resource Curation Foundation ===\n');

// Phase 42C: the curated pool was consolidated into the single Resource Registry
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const { TIME_BUDGETS } = await jiti.import(path.join(root, 'src/resources/types.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

console.log('1. Data model & dataset');
await test('Small, high-quality pool (not hundreds)', () => {
  assert(R.length >= 15 && R.length <= 60, `count=${R.length}`);
});
await test('Every resource has all required fields', () => {
  const fields = ['id', 'title', 'provider', 'type', 'estimatedMinutes', 'level', 'description', 'curriculumLessonIds',
    'coveredOutcomes', 'whyV2USelected', 'lastChecked', 'language', 'isFree', 'status'];
  for (const r of R) for (const f of fields) assert(r[f] !== undefined, `${r.id} missing ${f}`);
});
await test('Every one of the 15 curriculum lessons has at least one curated resource', () => {
  for (const l of C.lessons) assert(E.getResourcesForLesson(l.id).length > 0, l.id);
});
await test('Every lesson has an explanation-role resource', () => {
  for (const l of C.lessons) assert(E.getResourcesForLesson(l.id).some((r) => r.role === 'explanation'), l.id);
});
await test('No invented URLs: unverified resources carry no url / videoId', () => {
  for (const r of R) {
    if (r.status === 'unverified') {
      assert.strictEqual(r.url, undefined, `${r.id} has url`);
      assert.strictEqual(r.videoId, undefined, `${r.id} has videoId`);
      assert(r.locator.length > 10, `${r.id} needs a locator`);
    }
  }
});
await test('Trusted providers only', () => {
  const trusted = ['Khan Academy', 'OpenStax', 'Harvard', 'Python Software Foundation', 'สสวท.'];
  for (const r of R) assert(trusted.some((t) => r.provider.includes(t)), `${r.id}: ${r.provider}`);
});

console.log('\n2. Validation');
await test('validateResources() reports no errors', () => {
  assert.deepStrictEqual(E.validateResources(R, C), []);
});
await test('Unique resource IDs and no clash with curriculum IDs', () => {
  const ids = R.map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const cIds = new Set([...C.lessons, ...C.topics, ...C.skills, ...C.exercises, ...C.quizzes].map((x) => x.id));
  for (const id of ids) assert(!cIds.has(id), `${id} clashes`);
});
await test('Every referenced lesson and outcome exists', () => {
  const outcomes = E.getAllOutcomeIds(C);
  for (const r of R) {
    r.curriculumLessonIds.forEach((id) => assert(C.lessons.some((l) => l.id === id), `${r.id} → ${id}`));
    r.coveredOutcomes.forEach((o) => assert(outcomes.has(o), `${r.id} → ${o}`));
    r.coveredOutcomes.forEach((o) => assert(E.getOutcomeText(o, C), `${o} text`));
  }
});
const base = R[0];
const bad = (patch) => E.validateResources([{ ...base, ...patch }], C);
await test('Validator rejects duplicates', () => {
  assert(E.validateResources([base, base], C).some((e) => e.startsWith('duplicate resource id')));
});
await test('Validator rejects negative / invalid durations', () => {
  assert(bad({ estimatedMinutes: -5 }).some((e) => e.includes('negative')));
  assert(bad({ estimatedMinutes: 0 }).some((e) => e.includes('out of range')));
  assert(bad({ estimatedMinutes: Number.NaN }).some((e) => e.includes('invalid duration')));
});
await test('Validator rejects bad urls and misplaced videoId', () => {
  assert(bad({ status: 'active', url: 'not a url' }).some((e) => e.includes('invalid url')));
  assert(bad({ status: 'active', url: 'javascript:alert(1)' }).some((e) => e.includes('invalid url')));
  assert(bad({ url: 'https://example.org/x' }).some((e) => e.includes('unverified resources must not carry a url')));
  assert(bad({ type: 'book', videoId: 'abcdefghijk' }).some((e) => e.includes('videoId only allowed')));
  assert.deepStrictEqual(bad({ type: 'video', status: 'active', url: 'https://example.org/v', videoId: 'abcdefghijk', verification: { checkedAt: '2026-10-02', method: 'HTTP 200', note: 'title matched', httpStatus: 200, pageTitle: 'p', titleMatches: true, coverageChecked: true, legalSource: true } }), []);
});
await test('Validator rejects unknown lessons/outcomes and missing why/lastChecked/isFree', () => {
  assert(bad({ curriculumLessonIds: ['nope'] }).some((e) => e.includes('unknown lesson')));
  assert(bad({ coveredOutcomes: ['math-alg-linear-eq#o99'] }).some((e) => e.includes('unknown outcome')));
  assert(bad({ whyV2USelected: '' }).some((e) => e.includes('whyV2USelected')));
  assert(bad({ lastChecked: '' }).some((e) => e.includes('lastChecked')));
  assert(bad({ isFree: undefined }).some((e) => e.includes('isFree')));
});

console.log('\n3. Selection');
await test('getResourcesForLesson ranks by outcome coverage', () => {
  const list = E.getResourcesForLesson('math-alg-linear-eq');
  const lesson = C.lessons.find((l) => l.id === 'math-alg-linear-eq');
  // Phase 51: within one trust tier Thai comes first, then outcome coverage
  const groups = new Map();
  for (const r of list) { const k = `${r.status}|${r.language}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(E.scoreResourceForLesson(r, lesson)); }
  for (const scores of groups.values()) assert.deepStrictEqual(scores, [...scores].sort((a, b) => b - a));
});
await test('getResourcesForOutcome returns only resources covering it', () => {
  const list = E.getResourcesForOutcome('phy-vec-vectors#o2');
  assert(list.length >= 1 && list.every((r) => r.coveredOutcomes.includes('phy-vec-vectors#o2')));
});
await test('getBestResourcesForTime never exceeds the budget', () => {
  for (const l of C.lessons) for (const m of [15, 30, 60, 120]) {
    const total = E.getBestResourcesForTime(l.id, m).reduce((s, r) => s + r.estimatedMinutes, 0);
    assert(total <= m, `${l.id} ${m}`);
  }
});

console.log('\n4. Time-based learning plan');
await test('Four time options: 15, 30, 60, 120', () => {
  assert.deepStrictEqual(TIME_BUDGETS.map((b) => b.minutes), [15, 30, 60, 120]);
  assert.deepStrictEqual(TIME_BUDGETS.map((b) => b.label), ['15 นาที', '30 นาที', '1 ชั่วโมง', '2 ชั่วโมง']);
});
await test('Every lesson × budget produces a plan that fills the budget exactly', () => {
  for (const l of C.lessons) for (const m of [15, 30, 60, 120]) {
    const p = E.buildLearningPlan(l.id, m);
    assert(p, `${l.id} ${m}`);
    assert.strictEqual(p.totalMinutes, m, `${l.id} ${m} total=${p.totalMinutes}`);
    assert(p.steps.every((s) => s.minutes > 0), `${l.id} ${m} zero step`);
  }
});
await test('Plans are coherent sequences, not truncated lists', () => {
  const kinds = (m) => E.buildLearningPlan('math-alg-linear-eq', m).steps.map((s) => s.kind);
  assert.deepStrictEqual(kinds(15), ['learn', 'check']);
  assert.deepStrictEqual(kinds(30), ['learn', 'example', 'check']);
  assert.deepStrictEqual(kinds(60), ['learn', 'example', 'practice', 'recap']);
  assert.deepStrictEqual(kinds(120), ['learn', 'example', 'deepen', 'practice', 'check', 'recap']);
});
await test('Learn step uses an explanation; example uses a different resource', () => {
  for (const l of C.lessons) {
    const p = E.buildLearningPlan(l.id, 60);
    const learn = R.find((r) => r.id === p.steps[0].resourceId);
    assert.strictEqual(learn.role, 'explanation', l.id);
    const ex = p.steps.find((s) => s.kind === 'example');
    assert.notStrictEqual(ex.resourceId, learn.id, l.id);
  }
});
await test('Long resources are used partially, not dropped', () => {
  const p = E.buildLearningPlan('prog-py-variables', 15); // CS50 lecture is 60 min
  assert.strictEqual(p.steps[0].resourceId, 'cr-cs50p-lecture0');
  assert.strictEqual(p.steps[0].partial, true);
  assert.strictEqual(p.steps[0].minutes, 10);
});
await test('Practice / check steps use the curriculum exercise and quiz', () => {
  const lesson = C.lessons.find((l) => l.id === 'phy-kin-1d');
  const p = E.buildLearningPlan(lesson.id, 120);
  assert.strictEqual(p.steps.find((s) => s.kind === 'practice').exerciseId, lesson.exerciseIds[0]);
  assert.strictEqual(p.steps.find((s) => s.kind === 'check').quizId, lesson.quizIds[0]);
});
await test('Invalid lesson or budget returns null', () => {
  assert.strictEqual(E.buildLearningPlan('nope', 30), null);
  assert.strictEqual(E.buildLearningPlan('math-alg-linear-eq', 45), null);
});

console.log('\n5. Next Step & UI');
await test('getNextStep() exposes the recommended resource, time and outcomes', () => {
  const s = getNextStep({ lessons: initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' })) });
  assert.strictEqual(s.kind, 'study');
  const rr = s.curriculum.recommendedResource;
  assert(rr && rr.whyV2USelected && rr.estimatedMinutes > 0);
  assert.strictEqual(rr.id, E.getResourcesForLesson(s.curriculum.lessonId)[0].id);
  assert(s.curriculum.learningOutcomes.length > 0);
});
await test('Curriculum page shows time picker, resources, why, and plan; continues into existing study flow', () => {
  const page = read('src/pages/CurriculumPage.tsx');
  for (const s of ['แผนที่ V2U จัดให้', 'ทำไม V2U เลือก', 'TYPE_LABEL[r.type]', 'r.estimatedMinutes',
    'RESOURCE_LEVEL_LABEL[r.level]', 'buildLearningPlan(lesson.id, budget)', '<TimeBudgetPicker']) {
    assert(page.includes(s), `missing ${s}`);
  }
  // Phase 43: the time picker became a shared component
  const picker = read('src/components/TimeBudgetPicker.tsx');
  assert(picker.includes('คุณมีเวลาเท่าไหร่?') && picker.includes('role="radiogroup"'));
  assert(page.includes('to={`/learn/curriculum/${lesson.id}?mode=v2u`}'), 'final action stays in the Learning Hub (Phase 58)');
  assert(!page.includes('startLearningSession'), 'must not create a second study system');
});
await test('Home explains resource choice and outcomes; still one CTA', () => {
  const home = read('src/pages/HomePage.tsx');
  assert(home.includes('recommendedResource') && home.includes('whyV2USelected') && home.includes('learningOutcomes'));
  assert.strictEqual((home.match(/<button/g) || []).length, 1);
});
await test('Primary navigation still exactly 5 items; resource layer is pure', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
  for (const f of ['src/resources/types.ts', 'src/resources/registry.ts', 'src/resources/engine.ts']) {
    assert(!/from 'react'|useStore/.test(read(f)), f);
  }
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
