/**
 * Test Suite: Phase 43 — V2U Route Engine
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

console.log('=== Phase 43: V2U Route Engine ===\n');

const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const RD = await jiti.import(path.join(root, 'src/route/data.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const fresh = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const complete = (lessons, pred) => lessons.map((l) => (pred(l) ? { ...l, status: 'COMPLETED' } : l));
const completeCurriculum = (lessons, cIds) => {
  const titles = new Set(cIds.map((id) => CE.getCurriculumLesson(id).studyLessonTitle));
  return complete(lessons, (l) => titles.has(l.title));
};
const profile = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 };

console.log('1. Domain data');
await test('Route data validates (ids, dependencies only point backwards, checklists)', () => {
  assert.deepStrictEqual(RE.validateRouteData(C), []);
});
await test('Computer Engineering route order: math → physics → programming → exams → portfolio → application', () => {
  const t = RE.getRouteTarget('target-computer-engineering');
  assert.deepStrictEqual(t.requirementIds.map((id) => RE.getRouteRequirement(id).title),
    ['พื้นฐานคณิตศาสตร์', 'ฟิสิกส์', 'Programming', 'ข้อสอบ / การสอบ', 'Portfolio', 'การสมัครมหาวิทยาลัย']);
});
await test('Digital Business Technology is a supported starting program', () => {
  const p = RE.getVocationalProgram('digital-business-technology');
  assert(p.title.includes('Digital Business Technology'));
  assert.deepStrictEqual(p.strengths, ['programming']);
});
await test('Profile normalisation repairs missing/invalid values', () => {
  assert.deepStrictEqual(RE.normalizeStudentProfile(null), RD.DEFAULT_STUDENT_PROFILE);
  const p = RE.normalizeStudentProfile({ educationLevel: 'ม.6', programId: 'nope', availableMinutes: 45 });
  assert.strictEqual(p.educationLevel, 'ปวช.3');
  assert.strictEqual(p.programId, 'other');
  assert.strictEqual(p.availableMinutes, 30);
});

console.log('\n2. Route building');
await test('Fresh student: current requirement is math; later stages locked', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: fresh });
  assert.strictEqual(r.currentRequirementId, 'req-math');
  const st = Object.fromEntries(r.steps.map((s) => [s.requirement.id, s.status]));
  assert.strictEqual(st['req-exams'], 'locked');
  assert.strictEqual(st['req-application'], 'locked');
  assert.strictEqual(r.completedCount, 0);
  assert(r.horizon.includes('ปีสุดท้าย'));
});
await test('Program strengths are surfaced as a note', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: fresh });
  assert.strictEqual(r.steps.find((s) => s.requirement.id === 'req-programming').note, 'ต่อยอดจากสายที่เรียนมา');
  assert.strictEqual(r.steps.find((s) => s.requirement.id === 'req-math').note, undefined);
});
await test('Math done → physics becomes current (deterministic progression)', () => {
  const lessons = complete(fresh, (l) => l.subjectId === 'math');
  const r = RE.buildStudentRoute({ profile, storeLessons: lessons });
  assert.strictEqual(r.steps[0].status, 'done');
  assert.strictEqual(r.currentRequirementId, 'req-physics');
});
await test('All subjects done → exams & portfolio unlock, current is exams', () => {
  const lessons = complete(fresh, (l) => ['math', 'physics', 'programming'].includes(l.subjectId));
  const r = RE.buildStudentRoute({ profile, storeLessons: lessons });
  const st = Object.fromEntries(r.steps.map((s) => [s.requirement.id, s.status]));
  assert.strictEqual(st['req-exams'], 'not-started');
  assert.strictEqual(st['req-portfolio'], 'not-started');
  assert.strictEqual(st['req-application'], 'locked');
  assert.strictEqual(r.currentRequirementId, 'req-exams');
  assert.strictEqual(RE.getRouteNextStep(r, lessons), null, 'no lesson step once subjects are done');
});
await test('Readiness provider is pluggable (used by the Skill Gap engine)', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: fresh, readiness: () => 100 });
  assert(r.steps.filter((s) => s.requirement.kind === 'subject').every((s) => s.status === 'done'));
});
await test('Same input → same output', () => {
  assert.deepStrictEqual(RE.buildStudentRoute({ profile, storeLessons: fresh }), RE.buildStudentRoute({ profile, storeLessons: fresh }));
});

console.log("\n3. Today's next step");
await test('Fresh: first math lesson, with reason, time, outcomes, plan and study lesson link', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: fresh });
  const n = RE.getRouteNextStep(r, fresh);
  assert.strictEqual(n.curriculumLessonId, 'math-alg-linear-eq');
  assert.strictEqual(n.budgetMinutes, 30);
  assert.strictEqual(n.plan.totalMinutes, 30);
  assert(n.reason.includes('เป็นพื้นฐานของ'), n.reason);
  assert(n.reason.includes('ยังขาดอีก') && n.reason.includes('วิศวกรรมคอมพิวเตอร์'), n.reason);
  assert(n.outcomes.length > 0);
  assert(fresh.some((l) => l.id === n.studyLessonId));
});
await test('Plan adapts to available time (15/30/60/120)', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: fresh });
  for (const m of [15, 30, 60, 120]) assert.strictEqual(RE.getRouteNextStep(r, fresh, m).plan.totalMinutes, m);
  const r60 = RE.buildStudentRoute({ profile: { ...profile, availableMinutes: 60 }, storeLessons: fresh });
  assert.strictEqual(RE.getRouteNextStep(r60, fresh).budgetMinutes, 60);
});
await test('Prerequisite gap: kinematics routes back to linear equations first', () => {
  // math at target via a stub provider, but no math lesson actually completed.
  // Completing "หน่วย และ เวกเตอร์" covers phy-vec-units + phy-vec-vectors,
  // so the next physics lesson is phy-kin-1d, which needs math-alg-linear-eq.
  const lessons = completeCurriculum(fresh, ['phy-vec-units']);
  const r = RE.buildStudentRoute({
    profile,
    storeLessons: lessons,
    readiness: (subjectId) => (subjectId === 'math' ? 100 : 10),
  });
  assert.strictEqual(r.currentRequirementId, 'req-physics');
  const n = RE.getRouteNextStep(r, lessons);
  assert.strictEqual(n.curriculumLessonId, 'math-alg-linear-eq');
  assert(n.reason.includes('ต้องปูพื้นเรื่องนี้ก่อนเรียน') && n.reason.includes('การเคลื่อนที่แนวตรง'), n.reason);
});

console.log('\n4. Wiring');
await test('Store persists studentProfile under the unchanged storage key', () => {
  const store = read('src/store/useStore.ts');
  assert(store.includes('studentProfile: StudentProfile | null;') && store.includes('setStudentProfile'));
  assert(store.includes("name: 'engineering-study-hub-storage'"));
});
await test('Route hub renders start, target, today step, time picker and stages', () => {
  const hub = read('src/pages/hubs/RouteHub.tsx');
  for (const s of ['buildStudentRoute(', 'getRouteNextStep(', 'จุดเริ่มต้นของคุณ', 'วันนี้ควรทำอะไร', '<TimeBudgetPicker', 'เริ่มขั้นต่อไป', 'เหตุผล']) {
    assert(hub.includes(s), s);
  }
});
await test('Route domain is pure (no React / store)', () => {
  for (const f of ['src/route/types.ts', 'src/route/data.ts', 'src/route/engine.ts']) assert(!/from 'react'|useStore/.test(read(f)), f);
});
await test('Primary navigation still exactly 5 items', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
