/**
 * Test Suite: Phase 48 — Progress & Readiness
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

console.log('=== Phase 48: Progress & Readiness ===\n');

const RD = await jiti.import(path.join(root, 'src/readiness/engine.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const RM = await jiti.import(path.join(root, 'src/roadmap/engine.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const NOW = new Date('2026-10-02T12:00:00Z');
const fresh = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const rec = (lesson, patch = {}) => ({
  lessonId: lesson.id, subjectId: lesson.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED',
  confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch,
});
const blank = (L) => L.map((l) => rec(l));
const solid = { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-12-01T00:00:00Z' };
const profile = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };
const params = (lessons, records, extra = {}) => ({ lessons, referenceDate: NOW, route: { profile, records }, ...extra });
const withSubjects = (subjects, patch = solid) => {
  const L = fresh.map((l) => (subjects.includes(l.subjectId) ? { ...l, status: 'COMPLETED' } : l));
  const R = blank(L).map((r) => (subjects.includes(L.find((l) => l.id === r.lessonId).subjectId) ? { ...r, ...patch } : r));
  return [L, R];
};

console.log('1. Vocabulary & rules');
await test('Four plain-Thai statuses shared with the Skill Gap engine', () => {
  assert.deepStrictEqual(RD.READINESS_LABEL, { ready: 'พร้อม', developing: 'กำลังพัฒนา', 'needs-review': 'ต้องทบทวน', 'not-learned': 'ยังไม่ได้เรียน' });
});
await test('Subject status rules are deterministic', () => {
  const c = (r, d, n, x) => ({ ready: r, developing: d, 'needs-review': n, 'not-learned': x });
  assert.strictEqual(RD.subjectStatus(c(0, 0, 0, 5), false), 'not-learned');
  assert.strictEqual(RD.subjectStatus(c(3, 1, 1, 0), true), 'needs-review', 'needs-review wins even when target met');
  assert.strictEqual(RD.subjectStatus(c(4, 1, 0, 0), true), 'ready');
  assert.strictEqual(RD.subjectStatus(c(1, 1, 0, 3), false), 'developing');
});
await test('Overall: needs-review > developing; ready only if every subject ready', () => {
  assert.strictEqual(RD.overallStatus(['ready', 'needs-review']), 'needs-review');
  assert.strictEqual(RD.overallStatus(['ready', 'developing']), 'developing');
  assert.strictEqual(RD.overallStatus(['ready', 'ready', 'ready']), 'ready');
  assert.strictEqual(RD.overallStatus(['not-learned', 'not-learned']), 'not-learned');
  assert.strictEqual(RD.overallStatus(['not-learned', 'developing']), 'developing');
});

console.log('\n2. Summary from real learning state');
await test('Fresh student: ยังไม่ได้เรียน everywhere, counts not percentages', () => {
  const s = RD.getReadinessSummary(params(fresh, blank(fresh)));
  assert.strictEqual(s.overall, 'not-learned');
  assert.deepStrictEqual(s.subjects.map((x) => x.title), ['พื้นฐานคณิตศาสตร์', 'ฟิสิกส์', 'Programming']);
  assert(s.subjects.every((x) => x.readySkills === 0 && x.completedLessons === 0 && x.totalSkills > 0));
  assert(!JSON.stringify(s).includes('Percent'), 'summary exposes counts, not percentages');
});
await test('Opening/completing lessons is not readiness: completed but unproven → not ready', () => {
  const [L, R] = withSubjects(['math'], { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 2, nextReviewAt: '2026-12-01T00:00:00Z' });
  const math = RD.getReadinessSummary(params(L, R)).subjects[0];
  assert.strictEqual(math.completedLessons, math.totalLessons);
  assert.strictEqual(math.readySkills, 0);
  assert.strictEqual(math.status, 'developing');
  assert.strictEqual(math.meetsTarget, false);
});
await test('Proven subject → พร้อม; weak skill → ต้องทบทวน with headline naming it', () => {
  const [L, R] = withSubjects(['math']);
  const ok = RD.getReadinessSummary(params(L, R));
  assert.strictEqual(ok.subjects[0].status, 'ready');
  assert.strictEqual(ok.subjects[0].readySkills, ok.subjects[0].totalSkills);
  const weak = R.map((r) => (r.lessonId === L.find((l) => l.title === 'ตรีโกณมิติ').id ? { ...r, quizLatestScore: 20 } : r));
  const s = RD.getReadinessSummary(params(L, weak));
  assert.strictEqual(s.subjects[0].status, 'needs-review');
  assert.strictEqual(s.overall, 'needs-review');
  assert(s.headline.includes('พื้นฐานคณิตศาสตร์'));
});
await test('All required subjects proven → overall พร้อม', () => {
  const [L, R] = withSubjects(['math', 'physics', 'programming']);
  const s = RD.getReadinessSummary(params(L, R));
  assert.strictEqual(s.overall, 'ready');
  assert.strictEqual(s.route.stagesDone, 3);
  assert.strictEqual(s.roadmap.subjectWeeksNeeded, 0);
});

console.log('\n3. Consistency with the other engines');
await test('Route / roadmap numbers match their engines exactly', () => {
  const [L, R] = withSubjects(['math']);
  const p = params(L, R);
  const s = RD.getReadinessSummary(p);
  const route = NS.buildNextStepRoute(p);
  const rm = RM.buildRoadmap(p);
  assert.strictEqual(s.route.stagesDone, route.completedCount);
  assert.strictEqual(s.route.currentStageTitle, route.steps.find((x) => x.requirement.id === route.currentRequirementId).requirement.title);
  assert.strictEqual(s.roadmap.subjectWeeksNeeded, rm.subjectWeeksNeeded);
  s.subjects.forEach((x) => assert.strictEqual(x.meetsTarget, route.steps.find((st) => st.requirement.subjectId === x.subjectId).status === 'done'));
});
await test('Admission: only student answers and VERIFIED paths (none shipped)', () => {
  const s = RD.getReadinessSummary({ ...params(fresh, blank(fresh)), admissionInputs: { gpax: null, examScores: {}, checklist: { 'req-exams::TGAT': 'met' } } });
  assert.strictEqual(s.admission.gpaxKnown, false);
  assert.strictEqual(s.admission.met, 1);
  assert.deepStrictEqual(s.admission.paths, []);
  // checklist answers reach route only via route context; summary counts reflect the route
});

console.log('\n4. UI');
await test('ฉัน shows "ตอนนี้ฉันพร้อมแค่ไหน?" from the shared inputs', () => {
  const card = read('src/components/ReadinessCard.tsx');
  assert(card.includes('ตอนนี้ฉันพร้อมแค่ไหน?') && card.includes('useReadiness()') && card.includes('READINESS_LABEL'));
  assert(read('src/hooks/useNextStep.ts').includes('getReadinessSummary({ ...params, admissionInputs })'));
  assert(read('src/pages/hubs/MeHub.tsx').includes('<ReadinessCard />'));
});
await test('No misleading "ความพร้อม x%" derived from lesson completion on ฉัน', () => {
  assert(!read('src/pages/hubs/MeHub.tsx').includes('ความพร้อมโดยรวม ${'));
});
await test('No internal algorithm jargon in readiness UI text', () => {
  const t = read('src/components/ReadinessCard.tsx') + read('src/readiness/engine.ts').split('\n').filter((l) => l.includes("'") && !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
  for (const j of ['mastery', 'Mastery', 'spaced', 'Ebbinghaus', 'algorithm']) assert(!t.includes(`'${j}`) && !t.includes(`>${j}`), j);
});
await test('Readiness domain is pure', () => {
  assert(!/from ['"]react|useStore/.test(read('src/readiness/engine.ts')));
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
