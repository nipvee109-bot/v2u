/**
 * Test Suite: Phase 47 — Real Roadmap Foundation
 * Admission records used here are SYNTHETIC FIXTURES ("fixture-" ids).
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

console.log('=== Phase 47: Real Roadmap Foundation ===\n');

const RM = await jiti.import(path.join(root, 'src/roadmap/engine.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const NOW = new Date('2026-10-02T12:00:00Z');
const fresh = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const byTitle = (lessons, t) => lessons.find((l) => l.title === t);
const rec = (lesson, patch = {}) => ({
  lessonId: lesson.id, subjectId: lesson.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED',
  confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch,
});
const blank = (lessons) => lessons.map((l) => rec(l));
const solid = { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2026-12-01T00:00:00Z' };
const profile = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };
const params = (o = {}) => ({
  lessons: o.lessons ?? fresh,
  referenceDate: NOW,
  overdueReviews: o.overdueReviews ?? [],
  activeLearningSession: o.activeLearningSession ?? null,
  route: { profile: o.profile ?? profile, records: o.records ?? blank(o.lessons ?? fresh), budget: o.budget, admissionRegistry: o.admissionRegistry },
});
const completeSubject = (subjectId, lessons = fresh, records) => {
  const L = lessons.map((l) => (l.subjectId === subjectId ? { ...l, status: 'COMPLETED' } : l));
  const R = (records ?? blank(L)).map((r) => (L.find((l) => l.id === r.lessonId).subjectId === subjectId ? { ...r, ...solid } : r));
  return { lessons: L, records: R };
};

console.log('1. Structure');
await test('6-month horizon split into 6 months covering 26 weeks without gaps', () => {
  const rm = RM.buildRoadmap(params());
  assert.strictEqual(rm.months.length, 6);
  assert.strictEqual(rm.months[0].startWeek, 1);
  assert.strictEqual(rm.months[5].endWeek, 26);
  for (let i = 1; i < 6; i++) assert.strictEqual(rm.months[i].startWeek, rm.months[i - 1].endWeek + 1);
  assert(rm.months[0].isCurrent && rm.months.filter((m) => m.isCurrent).length === 1);
});
await test('Generic CE roadmap: math → physics → programming → exams → portfolio → application', () => {
  const rm = RM.buildRoadmap(params());
  assert.deepStrictEqual(rm.phases.map((p) => p.title), ['พื้นฐานคณิตศาสตร์', 'ฟิสิกส์', 'Programming', 'ข้อสอบ / การสอบ', 'Portfolio', 'การสมัครมหาวิทยาลัย']);
  assert.deepStrictEqual(rm.basis, { kind: 'generic' });
  const [math, phy, prog] = rm.phases;
  assert(math.startWeek === 1 && phy.startWeek === math.endWeek + 1 && prog.startWeek === phy.endWeek + 1, 'subject phases sequential');
  assert(rm.phases.slice(3).every((p) => p.openEnded && p.remainingMinutes === undefined), 'no fake durations for exam/portfolio/application');
});
await test('Remaining minutes come from curriculum estimates (no invented precision)', () => {
  const rm = RM.buildRoadmap(params());
  const mathMinutes = C.lessons.filter((l) => l.subjectId === 'math').reduce((s, l) => s + l.estimatedMinutes, 0);
  assert.strictEqual(rm.phases[0].remainingMinutes, mathMinutes);
  assert.strictEqual(rm.weeklyMinutes, 30 * RM.STUDY_DAYS_PER_WEEK);
});

console.log('\n2. Ordering & progress');
await test('Across the whole roadmap, every prerequisite is scheduled before the lesson that needs it', () => {
  const rm = RM.buildRoadmap(params());
  const ids = rm.phases.flatMap((p) => p.work.map((w) => w.curriculumLessonId).filter(Boolean));
  assert.strictEqual(new Set(ids).size, ids.length, 'no lesson scheduled twice');
  for (const id of ids) for (const pre of CE.getCurriculumLesson(id).prerequisites) {
    if (ids.includes(pre)) assert(ids.indexOf(pre) < ids.indexOf(id), `${pre} before ${id}`);
  }
});
await test('Prerequisite gap: math proven but its lessons not done → physics phase pulls them in first', () => {
  // Records say math is proven (skills ready) but the trackable math lessons are not completed
  const R = blank(fresh).map((r) => (fresh.find((l) => l.id === r.lessonId).subjectId === 'math' ? { ...r, ...solid } : r));
  const rm = RM.buildRoadmap(params({ records: R }));
  assert.strictEqual(rm.phases[0].status, 'done');
  const phyIds = rm.phases.find((p) => p.requirementId === 'req-physics').work.map((w) => w.curriculumLessonId);
  assert(phyIds.includes('math-trig-ratios') && phyIds.includes('math-alg-linear-eq'), phyIds.join(','));
  assert(phyIds.indexOf('math-trig-ratios') < phyIds.indexOf('phy-vec-vectors'));
  assert(phyIds.indexOf('math-alg-linear-eq') < phyIds.indexOf('phy-kin-1d'));
});
await test('Completed + proven subject → phase done with no remaining work', () => {
  const { lessons, records } = completeSubject('math');
  const rm = RM.buildRoadmap(params({ lessons, records }));
  const math = rm.phases[0];
  assert.strictEqual(math.status, 'done');
  assert.deepStrictEqual(math.work, []);
  assert.strictEqual(math.startWeek, undefined);
  assert.strictEqual(rm.currentPhaseId, 'req-physics');
});
await test('Opened/completed lessons without proof are NOT treated as done (skill gaps become work)', () => {
  const L = fresh.map((l) => (l.subjectId === 'math' ? { ...l, status: 'COMPLETED' } : l));
  const R = blank(L).map((r) => (L.find((l) => l.id === r.lessonId).subjectId === 'math'
    ? { ...r, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 1 } : r));
  const rm = RM.buildRoadmap(params({ lessons: L, records: R }));
  const math = rm.phases[0];
  assert.notStrictEqual(math.status, 'done');
  assert(math.work.length > 0 && math.work.every((w) => w.kind === 'strengthen'), 'remaining work is strengthening, not new lessons');
  assert(math.work.every((w) => w.minutes === RM.STRENGTHEN_MINUTES));
});
await test('Roadmap changes when progress changes', () => {
  const before = RM.buildRoadmap(params());
  const { lessons, records } = completeSubject('math');
  const after = RM.buildRoadmap(params({ lessons, records }));
  assert.notDeepStrictEqual(before.phases.map((p) => p.status), after.phases.map((p) => p.status));
  assert(after.subjectWeeksNeeded < before.subjectWeeksNeeded);
});

console.log('\n3. Time adaptation');
await test('More daily time → fewer weeks; capacity respects 15/30/60/120', () => {
  const weeks = [15, 30, 60, 120].map((m) => RM.buildRoadmap(params({ budget: m })).subjectWeeksNeeded);
  for (let i = 1; i < weeks.length; i++) assert(weeks[i] <= weeks[i - 1], weeks.join(','));
  assert(weeks[0] > weeks[3]);
  for (const m of [15, 30, 60, 120]) {
    const rm = RM.buildRoadmap(params({ budget: m }));
    assert.strictEqual(rm.thisWeek.budgetMinutes, m * RM.STUDY_DAYS_PER_WEEK);
    assert(rm.thisWeek.plannedMinutes <= rm.thisWeek.budgetMinutes || rm.thisWeek.actions.length === 1);
    assert.strictEqual(rm.today.minutes, m, 'today fits the daily time');
  }
});
await test('Too little time is reported honestly (fitsInHorizon=false) instead of compressing', () => {
  const rm = RM.buildRoadmap(params({ budget: 15 }));
  assert.strictEqual(rm.fitsInHorizon, rm.subjectWeeksNeeded <= 26);
});

console.log('\n4. Today = Home = Route (single source of truth)');
const scenarios = {
  fresh: params(),
  overdueReview: params({ overdueReviews: [{ id: 'rv', lessonId: fresh[0].id, topic: 'x', nextReviewAt: '2026-09-01T00:00:00Z' }] }),
  activeSession: params({ activeLearningSession: { lessonId: byTitle(fresh, 'ตรีโกณมิติ').id, status: 'active' } }),
  weakSkill: params({ records: blank(fresh).map((r) => (r.lessonId === byTitle(fresh, 'Python พื้นฐาน').id ? { ...r, completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, quizLatestScore: 10 } : r)) }),
  mathDone: params(completeSubject('math')),
  twoHours: params({ budget: 120 }),
};
await test('Roadmap.today is exactly getNextStep() in every scenario', () => {
  for (const [name, p] of Object.entries(scenarios)) assert.deepStrictEqual(RM.buildRoadmap(p).today, NS.getNextStep(p), name);
});
await test("This week's first action is today's action", () => {
  for (const [name, p] of Object.entries(scenarios)) {
    const rm = RM.buildRoadmap(p);
    assert.strictEqual(rm.thisWeek.actions[0].title, rm.today.todayAction, name);
    assert.strictEqual(rm.thisWeek.actions[0].studyLessonId, rm.today.lessonId, name);
  }
});
await test('Roadmap route is the same route Next Step uses', () => {
  for (const [name, p] of Object.entries(scenarios)) {
    const route = NS.buildNextStepRoute(p);
    assert.deepStrictEqual(RM.buildRoadmap(p).phases.map((x) => [x.requirementId, x.status]), route.steps.map((s) => [s.requirement.id, s.status]), name);
  }
});
await test('Home, เส้นทาง and the roadmap read the same inputs (no parallel decision paths)', () => {
  const home = read('src/pages/HomePage.tsx');
  const hub = read('src/pages/hubs/RouteHub.tsx');
  assert(home.includes('getNextStep(useNextStepParams())'));
  assert(hub.includes('const params = useNextStepParams();') && hub.includes('buildRoadmap(params)') && hub.includes('roadmap.today'));
  assert(!hub.includes('getRouteNextStep('), 'route page must not compute its own next step');
  assert(hub.includes('start(today)') && home.includes('start(step)'), 'same start behaviour');
});

console.log('\n5. Admission integration');
const verifiedSrc = { sourceId: 'fixture-src', sourceType: 'admission-page', publisher: 'Fixture', title: 'Fixture', url: 'https://example.org/f', publishedAt: '2026-09-01', checkedAt: '2026-10-01', status: 'verified' };
const registry = (status) => ({
  sources: [{ ...verifiedSrc, status, ...(status === 'unverified' ? { checkedAt: undefined } : {}) }],
  exams: [{ id: 'fixture-exam', code: 'FX', title: 'Fixture', subjectIds: ['math'] }],
  universities: [{ id: 'fixture-u', name: 'U', sourceIds: ['fixture-src'] }],
  faculties: [{ id: 'fixture-f', universityId: 'fixture-u', name: 'F' }],
  majors: [{ id: 'fixture-m', facultyId: 'fixture-f', name: 'M', routeTargetId: 'target-computer-engineering' }],
  paths: [{
    id: 'fixture-path', majorId: 'fixture-m', round: 2, name: 'Fixture path', admissionYear: '2570', eligibility: [],
    requirements: [{ kind: 'subject', subjectId: 'math', minReadinessPercent: 50 }, { kind: 'subject', subjectId: 'programming', minReadinessPercent: 40 }, { kind: 'exam', examId: 'fixture-exam' }],
    milestones: [], sourceIds: ['fixture-src'],
  }],
});
await test('Verified admission path replaces the generic route (its subjects and targets)', () => {
  const rm = RM.buildRoadmap(params({ admissionRegistry: registry('verified') }));
  assert.deepStrictEqual(rm.basis, { kind: 'admission-path', pathId: 'fixture-path', pathName: 'Fixture path' });
  assert.deepStrictEqual(rm.phases.map((p) => p.kind), ['subject', 'subject', 'exam', 'application']);
  assert.deepStrictEqual(rm.phases.slice(0, 2).map((p) => p.targetPercent), [50, 40]);
  assert(!rm.phases.some((p) => p.title === 'ฟิสิกส์'), 'physics not required by this path');
  assert.deepStrictEqual(rm.today, NS.getNextStep(params({ admissionRegistry: registry('verified') })));
});
await test('Unverified admission path is ignored (generic route, identical recommendation)', () => {
  const p = params({ admissionRegistry: registry('unverified') });
  const rm = RM.buildRoadmap(p);
  assert.deepStrictEqual(rm.basis, { kind: 'generic' });
  assert.deepStrictEqual(rm.today, NS.getNextStep(params()));
  assert.deepStrictEqual(rm.phases.map((x) => x.requirementId), RM.buildRoadmap(params()).phases.map((x) => x.requirementId));
});
await test('No invented dates: roadmap carries weeks, never calendar dates', () => {
  const json = JSON.stringify(RM.buildRoadmap(params()));
  assert(!/\d{4}-\d{2}-\d{2}/.test(json.replace(/"nextReviewAt":"[^"]*"/g, '')), 'no ISO dates in roadmap');
});

console.log('\n6. Architecture');
await test('Roadmap domain is pure and consumes route / skills / curriculum / next step', () => {
  const eng = read('src/roadmap/engine.ts');
  assert(!/from ['"]react|useStore/.test(eng));
  for (const m of ["from '../utils/nextStep'", "from '../skills/engine'", "from '../curriculum/engine'"]) assert(eng.includes(m), m);
  assert(!/function buildStudentRoute|function getSkillGaps/.test(eng), 'does not re-implement route or skill gap');
});
await test('Primary navigation still exactly 5 items', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
