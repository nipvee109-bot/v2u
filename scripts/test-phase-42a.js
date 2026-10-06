/**
 * Test Suite: Phase 42A — V2U Curriculum Foundation
 * Integrity of the curriculum dataset + integration with getNextStep().
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

console.log('=== Phase 42A: V2U Curriculum Foundation ===\n');

const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const E = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { RESOURCE_REGISTRY } = await jiti.import(path.join(root, 'src/resources/registry.ts'));

console.log('1. Structure');
await test('Pathway is Computer Engineering with requirements for math, programming, physics', () => {
  assert.strictEqual(C.pathway.id, 'pathway-computer-engineering');
  assert.deepStrictEqual(C.pathway.requirements.map((r) => r.subjectId).sort(), ['math', 'physics', 'programming']);
});
await test('Admission subjects are Mathematics, Programming, Physics; Web is only an optional track', () => {
  assert.deepStrictEqual(C.subjects.map((s) => s.id), ['math', 'programming', 'physics', 'web']);
  // The pathway's admission requirements never include the optional track
  assert.deepStrictEqual([...new Set(C.pathway.requirements.map((r) => r.subjectId))].sort(), ['math', 'physics', 'programming']);
});
await test('Small but meaningful foundation (not hundreds of lessons)', () => {
  assert(C.lessons.length >= 10 && C.lessons.length <= 60, `lessons=${C.lessons.length}`);
  for (const s of C.subjects) assert(C.lessons.filter((l) => l.subjectId === s.id).length >= 3, `${s.id} too thin`);
});
await test('Every lesson has all required fields', () => {
  const fields = ['id', 'subjectId', 'topicId', 'title', 'description', 'level', 'estimatedMinutes', 'prerequisites',
    'learningOutcomes', 'skillIds', 'exerciseIds', 'quizIds', 'resourceIds'];
  for (const l of C.lessons) for (const f of fields) assert(f in l, `${l.id} missing ${f}`);
  for (const l of C.lessons) assert(['foundation', 'core', 'advanced'].includes(l.level), `${l.id} level`);
});

console.log('\n2. Integrity');
await test('validateCurriculum() reports no errors', () => {
  assert.deepStrictEqual(E.validateCurriculum(C), []);
});
await test('No duplicate IDs across all entity types', () => {
  const ids = [C.pathway.id, ...['subjects', 'topics', 'lessons', 'skills', 'exercises', 'quizzes'].flatMap((k) => C[k].map((x) => x.id))];
  assert.strictEqual(new Set(ids).size, ids.length);
});
await test('Every referenced subject/topic/lesson/skill/exercise/quiz/resource ID exists', () => {
  const has = (k, id) => C[k].some((x) => x.id === id);
  for (const t of C.topics) { assert(has('subjects', t.subjectId)); t.lessonIds.forEach((id) => assert(has('lessons', id), id)); }
  for (const s of C.subjects) s.topicIds.forEach((id) => assert(has('topics', id), id));
  for (const l of C.lessons) {
    assert(has('subjects', l.subjectId) && has('topics', l.topicId), l.id);
    l.skillIds.forEach((id) => assert(has('skills', id), `${l.id} skill ${id}`));
    l.exerciseIds.forEach((id) => assert(has('exercises', id), `${l.id} exercise ${id}`));
    l.quizIds.forEach((id) => assert(has('quizzes', id), `${l.id} quiz ${id}`));
    // Phase 42C: resources live in the single Resource Registry
    l.resourceIds.forEach((id) => assert(RESOURCE_REGISTRY.some((r) => r.id === id), `${l.id} resource ${id}`));
  }
  for (const e of C.exercises) { assert(has('lessons', e.lessonId)); e.skillIds.forEach((id) => assert(has('skills', id), id)); }
  for (const q of C.quizzes) { assert(has('lessons', q.lessonId)); q.questions.forEach((x) => assert(has('skills', x.skillId), x.skillId)); }
});
await test('Prerequisites reference valid lessons and contain no cycles', () => {
  for (const l of C.lessons) for (const p of l.prerequisites) {
    assert(C.lessons.some((x) => x.id === p), `${l.id} → ${p}`);
    assert.notStrictEqual(p, l.id);
  }
  const cyclic = { ...C, lessons: C.lessons.map((l) => (l.id === 'math-alg-linear-eq' ? { ...l, prerequisites: ['math-fn-linear'] } : l)) };
  assert(E.validateCurriculum(cyclic).some((e) => e.startsWith('prerequisite cycle')), 'validator must detect cycles');
});
await test('Estimated time is a valid integer in range', () => {
  for (const l of C.lessons) {
    assert(Number.isInteger(l.estimatedMinutes), l.id);
    assert(l.estimatedMinutes >= E.MIN_LESSON_MINUTES && l.estimatedMinutes <= E.MAX_LESSON_MINUTES, l.id);
  }
  const bad = { ...C, lessons: C.lessons.map((l, i) => (i === 0 ? { ...l, estimatedMinutes: 0 } : l)) };
  assert(E.validateCurriculum(bad).some((e) => e.includes('invalid estimatedMinutes')));
});
await test('Validator catches dangling references and duplicates', () => {
  const bad = { ...C, lessons: [...C.lessons, { ...C.lessons[0], skillIds: ['skill-nope'] }] };
  const errs = E.validateCurriculum(bad);
  assert(errs.some((e) => e.startsWith('duplicate id')));
  assert(errs.some((e) => e.includes('skill-nope')));
});
await test('Quiz answers point at a valid choice', () => {
  for (const q of C.quizzes) for (const x of q.questions) assert(x.correctIndex >= 0 && x.correctIndex < x.choices.length, q.id);
});
await test('Every curriculum lesson links to a real seed study lesson', () => {
  for (const l of C.lessons.filter((x) => x.subjectId !== 'web')) {
    assert(initialLessons.some((s) => s.title === l.studyLessonTitle && s.subjectId === l.subjectId), `${l.id} → "${l.studyLessonTitle}"`);
  }
  // Optional track: never seeded for new learners — its study lesson is added only when the learner works on it (ensureStudyLesson)
  assert(!initialLessons.some((s) => s.subjectId === 'web'));
});

console.log('\n3. Next Step integration');
const store = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
await test('getNextStep() points at an actual curriculum lesson and explains why', () => {
  const s = getNextStep({ lessons: store });
  assert.strictEqual(s.kind, 'study');
  assert(s.curriculum, 'curriculum info expected');
  assert(C.lessons.some((l) => l.id === s.curriculum.lessonId));
  assert(s.todayAction.includes(s.curriculum.title));
  assert(s.curriculum.path.startsWith('วิศวกรรมคอมพิวเตอร์ → '));
  assert(s.reason.length > 0 && s.curriculum.estimatedMinutes > 0);
  assert.strictEqual(s.href, `/learn/curriculum/${s.curriculum.lessonId}`, 'next step opens the Learning Hub (Phase 58)');
  assert(store.some((l) => l.id === s.lessonId));
});
await test('First step is the foundation lesson with no missing prerequisites', () => {
  const s = getNextStep({ lessons: store });
  assert.strictEqual(s.curriculum.lessonId, 'math-alg-linear-eq');
  assert.deepStrictEqual(s.curriculum.missingPrerequisiteTitles, []);
});
await test('Missing prerequisites from other study lessons are surfaced', () => {
  const vectors = store.find((l) => l.title === 'หน่วย และ เวกเตอร์');
  const ctx = E.resolveCurriculumStep(vectors, store);
  assert.strictEqual(ctx.lesson.id, 'phy-vec-units');
  const vecLesson = E.getCurriculumLesson('phy-vec-vectors');
  assert(E.getMissingPrerequisites(vecLesson, store).some((l) => l.id === 'math-trig-ratios'));
  const trigDone = store.map((l) => (l.title === 'ตรีโกณมิติ' ? { ...l, status: 'COMPLETED' } : l));
  assert(!E.getMissingPrerequisites(vecLesson, trigDone).some((l) => l.id === 'math-trig-ratios'));
});
await test('Unlinked store lessons still produce a valid step (backward compatible)', () => {
  const s = getNextStep({ lessons: [{ id: 'x', title: 'Custom', subjectId: 'ai', status: 'NOT STARTED', month: 1 }] });
  assert.strictEqual(s.kind, 'study');
  assert.strictEqual(s.curriculum, undefined);
  assert.strictEqual(s.todayAction, 'เรียน: Custom');
});
await test('Pathway readiness reflects completed study lessons', () => {
  const done = store.map((l) => (l.subjectId === 'math' ? { ...l, status: 'COMPLETED' } : l));
  const r = E.getPathwayReadiness(done);
  assert.strictEqual(r.find((x) => x.subjectId === 'math').readinessPercent, 100);
  assert.strictEqual(r.find((x) => x.subjectId === 'physics').readinessPercent, 0);
});

console.log('\n4. UI wiring');
await test('Learn hub links to /learn/curriculum and the route exists', () => {
  assert(read('src/pages/hubs/LearnHub.tsx').includes("'/learn/curriculum'"));
  assert(read('src/App.tsx').includes('<Route path="/learn/curriculum" element={<CurriculumPage />} />'));
});
await test('Primary navigation still has exactly 5 items', () => {
  const nav = read('src/components/navigation/primaryNav.ts');
  assert.strictEqual([...nav.matchAll(/\{\s*to: '/g)].length, 5);
});
await test('Home shows the curriculum path for the next step', () => {
  const home = read('src/pages/HomePage.tsx');
  assert(home.includes('step.curriculum.path') && home.includes('missingPrerequisiteTitles'));
  assert.strictEqual((home.match(/<button/g) || []).length, 1, 'still a single CTA');
});
await test('Curriculum layer is pure (no React/store) and not persisted', () => {
  for (const f of ['src/curriculum/types.ts', 'src/curriculum/data.ts', 'src/curriculum/engine.ts']) {
    assert(!/from 'react'|useStore/.test(read(f)), f);
  }
  assert(!read('src/store/useStore.ts').includes('CURRICULUM'), 'curriculum must not be stored in user state');
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
