/**
 * Test Suite: Phase 42C — Resource Consolidation & Verification
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { relPosix } from './lib/crossPlatform.js';
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

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}
const srcFiles = walk(path.join(root, 'src')).map((f) => [relPosix(root, f), fs.readFileSync(f, 'utf-8')]);

console.log('=== Phase 42C: Resource Consolidation & Verification ===\n');

const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

console.log('1. One authoritative registry');
await test('Exactly one registry module; old pool file and curriculum.resources removed', () => {
  assert(!fs.existsSync(path.join(root, 'src/resources/data.ts')), 'src/resources/data.ts must be gone');
  assert(!('resources' in C), 'CURRICULUM.resources must be gone');
  const definers = srcFiles.filter(([, c]) => /export const \w+\s*:\s*CuratedResource\[\]\s*=/.test(c)).map(([f]) => f);
  assert.deepStrictEqual(definers, ['src/resources/registry.ts']);
  assert(!srcFiles.some(([, c]) => /CURATED_RESOURCES|CurriculumResource\b/.test(c)), 'no references to the old systems');
});
await test('Resource Engine reads only the consolidated registry', () => {
  const eng = read('src/resources/engine.ts');
  assert(eng.includes("import { RESOURCE_REGISTRY } from './registry';"));
  // the resource registry is imported as '../resources/registry' or, inside src/resources, './registry'
  const importers = srcFiles
    .filter(([f, c]) => c.includes("resources/registry'") || (f.startsWith('src/resources/') && c.includes("from './registry'")))
    .map(([f]) => f)
    .sort();
  assert.deepStrictEqual(importers, ['src/curriculum/engine.ts', 'src/resources/engine.ts']);
});
await test('Registry and curriculum both validate cleanly', () => {
  assert.deepStrictEqual(E.validateResources(R, C), []);
  assert.deepStrictEqual(CE.validateCurriculum(C, R), []);
});

console.log('\n2. Mappings');
await test('Every curriculum lesson resolves recommendable resources', () => {
  for (const l of C.lessons) assert(E.getResourcesForLesson(l.id).length > 0, l.id);
});
await test('Lesson.resourceIds and resource.curriculumLessonIds agree in both directions', () => {
  for (const l of C.lessons) for (const id of l.resourceIds) assert(R.find((r) => r.id === id).curriculumLessonIds.includes(l.id), `${l.id}→${id}`);
  for (const r of R) for (const id of r.curriculumLessonIds) assert(C.lessons.find((l) => l.id === id).resourceIds.includes(r.id), `${r.id}→${id}`);
});
await test('Old Phase 42A resource ids still resolve and point at current replacements', () => {
  for (const id of ['res-math-textbook-m4', 'res-math-textbook-m5', 'res-python-tutorial', 'res-physics-textbook-m4']) {
    const r = E.getResourceById(id);
    assert(r, id);
    assert.strictEqual(r.status, 'deprecated');
    const next = E.resolveCurrentResources(id);
    assert(next.length > 0 && next.every((x) => x.status !== 'deprecated'), `${id} replacements`);
  }
});

console.log('\n3. Status rules');
await test('Statuses are only unverified / verified / active / deprecated', () => {
  for (const r of R) assert(['unverified', 'verified', 'active', 'deprecated'].includes(r.status), r.id);
});
await test('Unverified resources need no URL and carry none (no invented URLs)', () => {
  for (const r of R.filter((x) => x.status === 'unverified')) {
    assert.strictEqual(r.url, undefined, r.id);
    assert.strictEqual(r.videoId, undefined, r.id);
    assert.strictEqual(r.verification, undefined, r.id);
    assert(r.locator.trim().length > 0, r.id);
  }
  assert(R.every((r) => r.url === undefined), 'no URL may be stored until it has actually been verified');
});
await test('Active / verified resources must have valid source metadata', () => {
  for (const r of R.filter((x) => x.status === 'active' || x.status === 'verified')) {
    assert(r.url && /^https?:\/\//.test(r.url) && r.verification?.checkedAt && r.verification?.method && r.verification?.note, r.id);
  }
  const base = R.find((r) => r.status === 'unverified');
  const errs = (patch) => E.validateResources([{ ...base, ...patch }], C);
  assert(errs({ status: 'active' }).some((e) => e.includes('need a verified url')));
  assert(errs({ status: 'verified', url: 'https://example.org/x' }).some((e) => e.includes('record what was verified')));
  assert.deepStrictEqual(errs({ status: 'active', url: 'https://example.org/x', verification: { checkedAt: '2026-10-02', method: 'HTTP 200', note: 'heading matched', httpStatus: 200, pageTitle: 'p', titleMatches: true, coverageChecked: true, legalSource: true } }), []);
  assert(errs({ verification: { checkedAt: '2026-10-02', method: 'x', note: 'y' } }).some((e) => e.includes('must not carry a verification')));
});
await test('Deprecated resources are never recommended', () => {
  const deprecated = new Set(R.filter((r) => r.status === 'deprecated').map((r) => r.id));
  assert(deprecated.size >= 4);
  for (const l of C.lessons) {
    assert(!E.getResourcesForLesson(l.id).some((r) => deprecated.has(r.id)), l.id);
    for (const m of [15, 30, 60, 120]) {
      assert(!E.buildLearningPlan(l.id, m).steps.some((s) => s.resourceId && deprecated.has(s.resourceId)), `${l.id} ${m}`);
    }
  }
  assert(!E.getResourcesForOutcome('math-alg-linear-eq#o1').some((r) => deprecated.has(r.id)));
});
await test('Active/verified entries outrank unverified ones', () => {
  const lesson = 'math-alg-linear-eq';
  const fake = R.map((r) => (r.id === 'cr-openstax-college-algebra-ch2'
    ? { ...r, status: 'active', url: 'https://example.org/x', verification: { checkedAt: '2026-10-02', method: 't', note: 't', httpStatus: 200, pageTitle: 't', titleMatches: true, coverageChecked: true, legalSource: true } } : r));
  assert.strictEqual(E.getResourcesForLesson(lesson, fake)[0].id, 'cr-openstax-college-algebra-ch2');
});
await test('Only deprecated entries may be superseded, and only by live entries', () => {
  const base = R.find((r) => r.status === 'unverified');
  assert(E.validateResources([{ ...base, supersededBy: ['x'] }], C).some((e) => e.includes('only deprecated')));
});

console.log('\n4. Integration');
await test('Next Step still resolves a recommended (non-deprecated) resource', () => {
  const s = getNextStep({ lessons: initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' })) });
  const rr = s.curriculum.recommendedResource;
  assert(rr && E.getResourceById(rr.id).status !== 'deprecated');
});
await test('Curriculum page labels unverified links honestly', () => {
  assert(read('src/pages/CurriculumPage.tsx').includes('ยังไม่ได้ตรวจลิงก์'));
});
await test('Study Room / resource confirmation (user library) untouched', () => {
  const rc = read('src/components/study/ResourceConfirmationModal.tsx');
  assert(rc.includes('onConfirm') && !rc.includes('RESOURCE_REGISTRY'));
  assert(read('src/pages/StudyRoom.tsx').includes('handleConfirmResourceAndStart'));
});
await test('npm test runs the full suite', () => {
  assert.strictEqual(JSON.parse(read('package.json')).scripts.test, 'node scripts/run-all-tests.js');
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
