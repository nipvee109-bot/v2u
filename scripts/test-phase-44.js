/**
 * Test Suite: Phase 44 — V2U Skill Gap Engine
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

console.log('=== Phase 44: V2U Skill Gap Engine ===\n');

const SG = await jiti.import(path.join(root, 'src/skills/engine.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const NOW = new Date('2026-10-02T12:00:00Z');
const lessons = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const byTitle = (t) => lessons.find((l) => l.title === t);
const rec = (lesson, patch = {}) => ({
  lessonId: lesson.id, subjectId: lesson.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED',
  confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch,
});
const blank = lessons.map((l) => rec(l));
const withRecord = (title, patch) => blank.map((r) => (r.lessonId === byTitle(title).id ? { ...r, ...patch } : r));
const statusOf = (records, skillId) => SG.getSkillGaps({ storeLessons: lessons, records, referenceDate: NOW }).find((g) => g.skill.id === skillId);

console.log('1. Classification');
await test('Four plain-Thai statuses', () => {
  assert.deepStrictEqual(SG.SKILL_STATUS_LABEL, { ready: 'พร้อม', developing: 'กำลังพัฒนา', 'needs-review': 'ต้องทบทวน', 'not-learned': 'ยังไม่ได้เรียน' });
});
await test('Nothing studied → every skill "ยังไม่ได้เรียน"', () => {
  const gaps = SG.getSkillGaps({ storeLessons: lessons, records: blank, referenceDate: NOW });
  assert.strictEqual(gaps.length, C.skills.length);
  assert(gaps.every((g) => g.status === 'not-learned'));
});
await test('Completed + high readiness + review not due → พร้อม', () => {
  const r = withRecord('สมการและอสมการเชิงเส้น', { completionStatus: 'COMPLETED', studyCount: 2, masteryScore: 3, nextReviewAt: '2026-10-20T00:00:00Z', quizLatestScore: 85 });
  const g = statusOf(r, 'skill-math-solve-linear');
  assert.strictEqual(g.status, 'ready');
  assert.strictEqual(g.reason, 'proven');
});
await test('In progress → กำลังพัฒนา', () => {
  const r = withRecord('สมการและอสมการเชิงเส้น', { completionStatus: 'IN PROGRESS', studyCount: 1, masteryScore: 1 });
  assert.strictEqual(statusOf(r, 'skill-math-solve-linear').status, 'developing');
});
await test('Overdue review / failed quiz / weak completion → ต้องทบทวน (with reason)', () => {
  const base = { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3 };
  assert.strictEqual(statusOf(withRecord('สมการและอสมการเชิงเส้น', { ...base, nextReviewAt: '2026-09-01T00:00:00Z' }), 'skill-math-solve-linear').reason, 'overdue-review');
  assert.strictEqual(statusOf(withRecord('สมการและอสมการเชิงเส้น', { ...base, quizLatestScore: 40 }), 'skill-math-solve-linear').reason, 'low-quiz');
  assert.strictEqual(statusOf(withRecord('สมการและอสมการเชิงเส้น', { ...base, masteryScore: 1 }), 'skill-math-solve-linear').reason, 'low-readiness');
});
await test('Shared skill takes its weakest studied lesson', () => {
  // skill-math-graph-reading is taught in math-fn-linear and phy-kin-1d
  let r = withRecord('ฟังก์ชันและกราฟ', { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-11-01T00:00:00Z' });
  assert.strictEqual(statusOf(r, 'skill-math-graph-reading').status, 'ready');
  r = r.map((x) => (x.lessonId === byTitle('การเคลื่อนที่แนวตรง').id ? { ...x, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, quizLatestScore: 30 } : x));
  assert.strictEqual(statusOf(r, 'skill-math-graph-reading').status, 'needs-review');
});
await test('Deterministic for the same inputs and date', () => {
  const r = withRecord('ตรีโกณมิติ', { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 2 });
  assert.deepStrictEqual(SG.getSkillGaps({ storeLessons: lessons, records: r, referenceDate: NOW }), SG.getSkillGaps({ storeLessons: lessons, records: r, referenceDate: NOW }));
});

console.log('\n2. Requirements vs current');
await test('Subject readiness: weighted by skill status, counts add up', () => {
  const all = blank.map((x) => (lessons.find((l) => l.id === x.lessonId).subjectId === 'math'
    ? { ...x, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-12-01T00:00:00Z' } : x));
  const subjects = SG.getSubjectSkillGaps({ storeLessons: lessons, records: all, referenceDate: NOW });
  const math = subjects.find((s) => s.subjectId === 'math');
  assert.strictEqual(math.readinessPercent, 100);
  assert.strictEqual(Object.values(math.counts).reduce((a, b) => a + b, 0), C.skills.filter((s) => s.subjectId === 'math').length);
  assert.strictEqual(subjects.find((s) => s.subjectId === 'physics').readinessPercent, 0);
});
await test('Route uses skill readiness: completing lessons without proof is not enough', () => {
  const completed = lessons.map((l) => (l.subjectId === 'math' ? { ...l, status: 'COMPLETED' } : l));
  const weak = blank.map((x) => (lessons.find((l) => l.id === x.lessonId).subjectId === 'math'
    ? { ...x, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 2, nextReviewAt: '2026-12-01T00:00:00Z' } : x));
  const profile = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };
  const byCompletion = RE.buildStudentRoute({ profile, storeLessons: completed });
  const bySkill = RE.buildStudentRoute({ profile, storeLessons: completed, readiness: SG.createSkillReadinessProvider(weak, NOW) });
  assert.strictEqual(byCompletion.steps[0].status, 'done');
  assert.strictEqual(bySkill.steps[0].status, 'in-progress');
  assert.strictEqual(bySkill.steps[0].readinessPercent, 50);
});
await test('getWeakestSkill returns a needs-review skill (optionally per subject)', () => {
  const r = withRecord('Python พื้นฐาน', { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, quizLatestScore: 20 });
  const w = SG.getWeakestSkill({ storeLessons: lessons, records: r, referenceDate: NOW });
  assert.strictEqual(w.skill.subjectId, 'programming');
  assert.strictEqual(SG.getWeakestSkill({ storeLessons: lessons, records: r, referenceDate: NOW, subjectId: 'math' }), undefined);
});

console.log('\n3. Wiring & language');
await test('Route hub uses skill readiness and shows the four statuses', () => {
  const hub = read('src/pages/hubs/RouteHub.tsx');
  // Phase 47: the hub builds its route via buildNextStepRoute, which applies skill readiness
  assert(hub.includes('buildNextStepRoute(params)') && hub.includes('SKILL_STATUS_LABEL'));
  assert(read('src/utils/nextStep.ts').includes('readiness: createSkillReadinessProvider(ctx.records'));
});
await test('Review hub lists skills that need review', () => {
  assert(read('src/pages/hubs/ReviewHub.tsx').includes("g.status === 'needs-review'"));
});
await test('Engine reuses existing learning records (no duplicate readiness algorithm)', () => {
  const eng = read('src/skills/engine.ts');
  assert(!/from 'react'|useStore/.test(eng));
  assert(read('src/hooks/useLearningRecords.ts').includes('computeLessonLearningRecord'));
});
await test('No technical jargon in user-facing hub text', () => {
  for (const f of ['src/pages/hubs/RouteHub.tsx', 'src/pages/hubs/ReviewHub.tsx']) {
    const visible = read(f).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.includes('{/*'));
    for (const j of ['Ebbinghaus', 'spaced repetition', 'mastery', 'Mastery']) assert(!visible.some((l) => l.includes(`>${j}`) || l.includes(`'${j}`)), `${f}: ${j}`);
  }
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
