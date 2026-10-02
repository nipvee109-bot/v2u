/**
 * Test Suite: Phase 50 — Dynamic Personalized Roadmap
 * Persona and data are SYNTHETIC fixtures.
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

console.log('=== Phase 50: Dynamic Personalized Roadmap ===\n');

const RM = await jiti.import(path.join(root, 'src/roadmap/engine.ts'));
const PL = await jiti.import(path.join(root, 'src/roadmap/plan.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const SG = await jiti.import(path.join(root, 'src/skills/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { initialLessons, initialWeeklyGoal } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));

const NOW = new Date('2026-10-02T12:00:00Z');
const PERSONA = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering' };
const fresh = initialLessons.map((l) => ({ ...l }));
const rec = (l, patch = {}) => ({ lessonId: l.id, subjectId: l.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED', confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch });
const proven = (l) => rec(l, { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 4, nextReviewAt: '2027-01-01T00:00:00Z' });
const withSubjectDone = (subject) => {
  const L = fresh.map((l) => (l.subjectId === subject ? { ...l, status: 'COMPLETED' } : l));
  return { lessons: L, records: L.map((l) => (l.subjectId === subject ? proven(l) : rec(l))) };
};
const P = ({ minutes = 30, months, preset = true, lessons = fresh, records, extra = {} } = {}) => ({
  lessons,
  referenceDate: NOW,
  ...extra,
  route: {
    profile: { ...PERSONA, availableMinutes: minutes, ...(months ? { planningHorizon: { months, preset } } : {}) },
    records: records ?? lessons.map((l) => rec(l)),
  },
});
const totalMinutes = C.lessons.reduce((s, l) => s + l.estimatedMinutes, 0);

console.log('1. Horizon model');
await test('Profile horizon: presets and custom, validated; absent = default (not "chosen")', () => {
  assert.deepStrictEqual(RE.resolvePlanningHorizon({}), { months: 6, isDefault: true, preset: true });
  assert.deepStrictEqual(RE.resolvePlanningHorizon({ planningHorizon: { months: 9, preset: true } }), { months: 9, isDefault: false, preset: true });
  assert.deepStrictEqual(RE.resolvePlanningHorizon({ planningHorizon: { months: 7, preset: false } }), { months: 7, isDefault: false, preset: false });
  for (const bad of [{ months: 0, preset: true }, { months: 25, preset: false }, { months: 2.5, preset: false }, { months: 6 }, 'x']) {
    assert.strictEqual(RE.isValidPlanningHorizon(bad), false, JSON.stringify(bad));
    assert.strictEqual('planningHorizon' in RE.normalizeStudentProfile({ planningHorizon: bad }), false);
  }
  assert.strictEqual(RE.normalizeStudentProfile({ availableMinutes: 30 }).availableMinutes, 30, 'daily time is a separate field');
});

console.log('\n2. Plans for 3 / 6 / 9 / 12 months and custom (1)');
for (const m of [3, 6, 9, 12]) {
  await test(`${m}-month plan: ${m} months, horizon weeks, fit computed`, () => {
    const rm = RM.buildRoadmap(P({ months: m }));
    assert.strictEqual(rm.months.length, m);
    assert.strictEqual(rm.horizonWeeks, PL.monthsToWeeks(m));
    assert.strictEqual(rm.months[rm.months.length - 1].endWeek, rm.horizonWeeks);
    assert.strictEqual(rm.horizon.isDefault, false);
    assert.strictEqual(rm.fit.targetWeeks, rm.horizonWeeks);
    for (let i = 1; i < rm.months.length; i++) assert.strictEqual(rm.months[i].startWeek, rm.months[i - 1].endWeek + 1);
  });
}
await test('Custom duration (e.g. 4 and 18 months) works; no horizon chosen → default labelled as default', () => {
  assert.strictEqual(RM.buildRoadmap(P({ months: 4, preset: false })).months.length, 4);
  assert.strictEqual(RM.buildRoadmap(P({ months: 18, preset: false })).months.length, 18);
  const d = RM.buildRoadmap(P());
  assert.deepStrictEqual(d.horizon, { months: 6, isDefault: true, preset: true });
});

console.log('\n3. Time fit (honest, not compressed)');
await test('Different daily times change the estimate (15 > 30 > 60 > 120 weeks)', () => {
  const w = [15, 30, 60, 120].map((m) => RM.buildRoadmap(P({ minutes: m, months: 6 })).fit.estimatedWeeks);
  for (let i = 1; i < w.length; i++) assert(w[i] < w[i - 1], w.join(','));
  assert.strictEqual(w[0], Math.ceil(totalMinutes / (15 * PL.STUDY_DAYS_PER_WEEK)));
});
await test('Insufficient time → "over": work beyond the horizon listed, suggestions given, nothing silently squeezed', () => {
  const rm = RM.buildRoadmap(P({ minutes: 15, months: 1, preset: false }));
  assert.strictEqual(rm.fit.status, 'over');
  assert(rm.beyondHorizon.length > 0);
  assert(rm.fit.estimatedWeeks > rm.horizonWeeks, 'estimate is not compressed to fit');
  assert(rm.fit.suggestedDailyMinutes > 15);
  assert(rm.fit.suggestedMonths > 1);
  assert.strictEqual(rm.prioritized, true);
});
await test('Enough time → fits/roomy, no prioritising, nothing beyond the horizon', () => {
  const rm = RM.buildRoadmap(P({ minutes: 120, months: 9 }));
  assert(['fits', 'roomy'].includes(rm.fit.status));
  assert.strictEqual(rm.prioritized, false);
  assert.deepStrictEqual(rm.beyondHorizon, []);
});
await test('Estimate is a month range, never a guaranteed date', () => {
  const rm = RM.buildRoadmap(P({ minutes: 15, months: 6 }));
  assert(rm.fit.estimatedMonths.min <= rm.fit.estimatedMonths.max);
  const hub = read('src/pages/hubs/RouteHub.tsx');
  assert(hub.includes('(ยังไม่รวมการเตรียมสอบและ Portfolio)'));
  for (const bad of ['พร้อมแน่นอน', 'รับประกัน']) assert(!hub.includes(bad), bad);
});

console.log('\n4. Personalisation changes the actual plan (cases A–E)');
const A = RM.buildRoadmap(P({ minutes: 30, months: 3 }));
const B = RM.buildRoadmap(P({ minutes: 30, months: 6 }));
const strongMath = withSubjectDone('math');
const Cc = RM.buildRoadmap(P({ minutes: 60, months: 6, ...strongMath }));
const D = RM.buildRoadmap(P({ minutes: 120, months: 9 }));
const E = RM.buildRoadmap(P({ minutes: 30, months: 1, preset: false }));
const Tight = RM.buildRoadmap(P({ minutes: 15, months: 3 }));
await test('A (3 mo) vs B (6 mo) at 30 min: different horizon, share and month layout', () => {
  assert.notStrictEqual(A.horizonWeeks, B.horizonWeeks);
  assert.notStrictEqual(A.months.length, B.months.length);
  assert(A.fit.estimatedWeeks / A.horizonWeeks > B.fit.estimatedWeeks / B.horizonWeeks);
});
await test('C (stronger math): math phase done, physics starts in week 1, today moves to physics', () => {
  assert.strictEqual(Cc.phases[0].status, 'done');
  assert.strictEqual(Cc.phases[1].startWeek, 1);
  assert.strictEqual(Cc.today.curriculum.lessonId, 'phy-vec-units');
  assert(Cc.fit.estimatedWeeks < B.fit.estimatedWeeks);
});
await test('D (120 min, 9 mo): subjects finish early, exam prep starts sooner than in B', () => {
  const examStart = (rm) => rm.phases.find((p) => p.requirementId === 'req-exams').startWeek;
  assert(examStart(D) < examStart(B));
});
await test('E (custom 1 mo) and short-time plans reorder work: important topics first', () => {
  for (const rm of [E, Tight]) {
    assert.strictEqual(rm.prioritized, true, rm.fit.status);
    const order = rm.phases[0].work.map((w) => w.curriculumLessonId);
    const normal = B.phases[0].work.map((w) => w.curriculumLessonId);
    assert.notDeepStrictEqual(order, normal, 'order must actually change');
    // trig (needed by physics) comes before the less-depended-on system/inequality lessons
    assert(order.indexOf('math-trig-ratios') < order.indexOf('math-alg-linear-ineq'));
  }
});
await test('Priority order still respects every prerequisite', () => {
  for (const rm of [E, Tight]) {
    const ids = rm.phases.flatMap((p) => p.work.map((w) => w.curriculumLessonId).filter(Boolean));
    for (const id of ids) for (const pre of CE.getCurriculumLesson(id).prerequisites) {
      if (ids.includes(pre)) assert(ids.indexOf(pre) < ids.indexOf(id), `${pre} before ${id}`);
    }
  }
});
await test('Weak vs strong prerequisite: missing math is pulled before physics; proven math is not', () => {
  // weak: physics current via skill readiness of math but math lessons not completed
  const recs = fresh.map((l) => (l.subjectId === 'math' ? proven(l) : rec(l)));
  const weak = RM.buildRoadmap(P({ months: 6, records: recs }));
  const phyWeak = weak.phases.find((p) => p.requirementId === 'req-physics').work.map((w) => w.curriculumLessonId);
  assert(phyWeak.includes('math-trig-ratios'));
  const phyStrong = Cc.phases.find((p) => p.requirementId === 'req-physics').work.map((w) => w.curriculumLessonId);
  assert(!phyStrong.some((id) => id.startsWith('math-')));
});

console.log('\n5. Changes after progress');
await test('Changing duration after progress keeps progress and only re-plans', () => {
  const p3 = RM.buildRoadmap(P({ months: 3, ...strongMath }));
  const p12 = RM.buildRoadmap(P({ months: 12, ...strongMath }));
  assert.deepStrictEqual(p3.phases.map((x) => x.status), p12.phases.map((x) => x.status), 'progress/readiness unchanged');
  assert.strictEqual(p3.fit.remainingMinutes, p12.fit.remainingMinutes);
  assert.notStrictEqual(p3.horizonWeeks, p12.horizonWeeks);
});
await test('Changing daily time after progress keeps progress and changes the estimate', () => {
  const a = RM.buildRoadmap(P({ minutes: 30, months: 6, ...strongMath }));
  const b = RM.buildRoadmap(P({ minutes: 120, months: 6, ...strongMath }));
  assert.deepStrictEqual(a.phases.map((x) => x.status), b.phases.map((x) => x.status));
  assert(b.fit.estimatedWeeks < a.fit.estimatedWeeks);
});
await test('Changing the horizon never touches learning data (store setter only patches the profile)', () => {
  const store = read('src/store/useStore.ts');
  assert(store.includes('studentProfile: { ...(state.studentProfile ?? DEFAULT_STUDENT_PROFILE), ...patch },'));
  assert(read('src/pages/hubs/RouteHub.tsx').includes('setStudentProfile({ planningHorizon: h })'));
});

console.log('\n6. Home == Route == Roadmap today');
const matrix = {
  'default horizon': P(),
  '3 months': P({ months: 3 }),
  'custom 1 month, 15 min (over)': P({ minutes: 15, months: 1, preset: false }),
  '12 months, 120 min': P({ minutes: 120, months: 12 }),
  'after progress': P({ months: 6, ...strongMath }),
  'overdue review + tight': P({ minutes: 15, months: 3, extra: { overdueReviews: [{ id: 'rv', lessonId: fresh[0].id, topic: 'x', nextReviewAt: '2026-09-01T00:00:00Z' }] } }),
};
for (const [name, params] of Object.entries(matrix)) {
  await test(`${name}: roadmap.today === getNextStep(); week starts with it`, () => {
    const rm = RM.buildRoadmap(params);
    assert.deepStrictEqual(rm.today, NS.getNextStep(params));
    assert.strictEqual(rm.thisWeek.actions[0].title, rm.today.todayAction);
  });
}
await test("Today follows the plan's priority order when time is short (no second engine)", () => {
  // math lessons 1 done → normal next = system; prioritised next = exponents/trig chain
  const L = fresh.map((l) => l);
  const linearDone = L.map((l) => (l.title === 'สมการและอสมการเชิงเส้น' ? { ...l, status: 'COMPLETED', completedCurriculumLessonIds: ['math-alg-linear-eq'] } : l));
  const records = linearDone.map((l) => rec(l));
  const roomy = NS.getNextStep(P({ minutes: 120, months: 12, lessons: linearDone, records }));
  const tight = NS.getNextStep(P({ minutes: 15, months: 2, preset: false, lessons: linearDone, records }));
  assert.strictEqual(roomy.curriculum.lessonId, 'math-alg-linear-system');
  assert.notStrictEqual(tight.curriculum.lessonId, 'math-alg-linear-system');
  assert.strictEqual(tight.curriculum.lessonId, RM.buildRoadmap(P({ minutes: 15, months: 2, preset: false, lessons: linearDone, records })).thisWeek.actions[0].curriculumLessonId);
});

console.log('\n7. Curriculum progress (no false progress)');
await test('Tracked study lesson credits only the curriculum lesson actually studied', () => {
  const study = { ...fresh.find((l) => l.title === 'สมการและอสมการเชิงเส้น'), status: 'COMPLETED', completedCurriculumLessonIds: ['math-alg-linear-eq'] };
  const L = fresh.map((l) => (l.id === study.id ? study : l));
  assert.strictEqual(CE.isCurriculumLessonCompleted(CE.getCurriculumLesson('math-alg-linear-eq'), L), true);
  assert.strictEqual(CE.isCurriculumLessonCompleted(CE.getCurriculumLesson('math-alg-linear-system'), L), false);
  assert.strictEqual(CE.isCurriculumLessonCompleted(CE.getCurriculumLesson('math-alg-linear-ineq'), L), false);
});
await test('Legacy data (no tracking field) keeps its old meaning — nothing rewritten', () => {
  const study = { ...fresh.find((l) => l.title === 'สมการและอสมการเชิงเส้น'), status: 'COMPLETED' };
  const L = fresh.map((l) => (l.id === study.id ? study : l));
  for (const id of ['math-alg-linear-eq', 'math-alg-linear-system', 'math-alg-linear-ineq']) assert.strictEqual(CE.isCurriculumLessonCompleted(CE.getCurriculumLesson(id), L), true);
  assert.strictEqual(CE.creditCurriculumLesson(study, L, 'math-alg-linear-system'), undefined, 'legacy completed lesson is not converted');
});
await test('Credit: requested lesson, else first ready one; accumulates', () => {
  const study = { ...fresh.find((l) => l.title === 'สมการและอสมการเชิงเส้น') };
  assert.deepStrictEqual(CE.creditCurriculumLesson(study, fresh, 'math-alg-linear-ineq'), ['math-alg-linear-ineq']);
  assert.deepStrictEqual(CE.creditCurriculumLesson(study, fresh), ['math-alg-linear-eq']);
  const after = { ...study, status: 'COMPLETED', completedCurriculumLessonIds: ['math-alg-linear-eq'] };
  assert.deepStrictEqual(CE.creditCurriculumLesson(after, fresh), ['math-alg-linear-eq', 'math-alg-linear-system']);
});
await test('Skills of an un-studied sibling curriculum lesson stay "ยังไม่ได้เรียน"', () => {
  const study = { ...fresh.find((l) => l.title === 'สมการและอสมการเชิงเส้น'), status: 'COMPLETED', completedCurriculumLessonIds: ['math-alg-linear-eq'] };
  const L = fresh.map((l) => (l.id === study.id ? study : l));
  const R = L.map((l) => (l.id === study.id ? proven(l) : rec(l)));
  const g = SG.getSkillGaps({ storeLessons: L, records: R, referenceDate: NOW });
  assert.strictEqual(g.find((x) => x.skill.id === 'skill-math-solve-linear').status, 'ready');
  assert.strictEqual(g.find((x) => x.skill.id === 'skill-math-linear-system').status, 'not-learned');
  assert.strictEqual(g.find((x) => x.skill.id === 'skill-math-solve-inequality').status, 'not-learned');
});
await test('Sessions carry the curriculum lesson from the shared next step; finishing credits it', () => {
  assert(read('src/hooks/useStartNextStep.tsx').includes('confirming?.curriculum?.lessonId'));
  const store = read('src/store/useStore.ts');
  assert(store.includes('creditCurriculumLesson(l, state.lessons, current.curriculumLessonId)'));
  assert(store.includes('...(curriculumLessonId ? { curriculumLessonId } : {})'));
});

console.log('\n8. Backup');
const baseState = {
  lessons: fresh.map((l, i) => (i === 0 ? { ...l, status: 'COMPLETED', masteryScore: 3, completedCurriculumLessonIds: ['math-alg-linear-eq'] } : l)),
  sessions: [], weeklyGoal: initialWeeklyGoal, unclearTopics: [], goals: [], resources: [], hasCompletedOnboarding: true,
  learningSessionsHistory: [{ sessionId: 'ls', lessonId: fresh[0].id, startedAt: '2026-10-01T10:00:00Z', completedAt: '2026-10-01T10:30:00Z', accumulatedSeconds: 1800, actualSeconds: 1800, status: 'completed', curriculumLessonId: 'math-alg-linear-eq' }],
  reviewQueue: [{ id: 'rq', lessonId: fresh[0].id, topic: 't', createdAt: '2026-10-01T00:00:00Z', nextReviewAt: '2026-12-01T00:00:00Z', reviewCount: 1, status: 'pending', reason: 'spaced_repetition', priority: 'Medium' }],
  admissionInputs: { gpax: 3.2, examScores: {}, checklist: { 'req-exams::TGAT': 'met' } },
};
await test('Export/import preserves planningHorizon, daily time, per-curriculum progress and the plan', () => {
  const profile = { ...PERSONA, availableMinutes: 60, planningHorizon: { months: 9, preset: false } };
  const r = I.validateAndParseImport(JSON.stringify(I.createExportPayload({ ...baseState, studentProfile: profile })));
  assert.strictEqual(r.isValid, true, r.errors.join());
  const p = r.migratedPayload;
  assert.deepStrictEqual(p.studentProfile, profile);
  assert.deepStrictEqual(p.lessons[0].completedCurriculumLessonIds, ['math-alg-linear-eq']);
  assert.deepStrictEqual(p.admissionInputs, baseState.admissionInputs);
  assert.strictEqual(p.reviewQueue.length, 1);
  assert.strictEqual(p.learningSessionsHistory.length, 1);
  const plan = (src) => RM.buildRoadmap({ lessons: src.lessons, referenceDate: NOW, route: { profile: src.studentProfile, records: src.lessons.map((l) => rec(l)) } });
  const a = plan({ ...baseState, studentProfile: profile }); const b = plan(p);
  assert.deepStrictEqual([b.horizonWeeks, b.fit, b.phases.map((x) => x.status)], [a.horizonWeeks, a.fit, a.phases.map((x) => x.status)]);
});
await test('Tampering with the horizon breaks the checksum', () => {
  const profile = { ...PERSONA, availableMinutes: 60, planningHorizon: { months: 9, preset: true } };
  const p = JSON.parse(JSON.stringify(I.createExportPayload({ ...baseState, studentProfile: profile })));
  p.studentProfile.planningHorizon.months = 3;
  assert.strictEqual(I.validateAndParseImport(JSON.stringify(p)).isValid, false);
});
await test('Old backup without planningHorizon imports; horizon stays unchosen (default only for planning)', () => {
  const profile = { ...PERSONA, availableMinutes: 30 };
  const r = I.validateAndParseImport(JSON.stringify(I.createExportPayload({ ...baseState, studentProfile: profile })));
  assert.strictEqual(r.isValid, true);
  assert.strictEqual('planningHorizon' in r.migratedPayload.studentProfile, false, 'not silently set to 6 months');
  assert.strictEqual(RE.resolvePlanningHorizon(r.migratedPayload.studentProfile).isDefault, true);
  // older lessons without completedCurriculumLessonIds keep legacy meaning
  const v1 = I.validateAndParseImport(JSON.stringify([{ ...fresh[0], status: 'COMPLETED' }]));
  assert.strictEqual('completedCurriculumLessonIds' in v1.migratedPayload.lessons[0], false);
});

console.log('\n9. UI wording');
await test('No fixed "6 เดือน" framing in the roadmap, Home or onboarding', () => {
  const t = read('src/pages/hubs/RouteHub.tsx') + read('src/components/onboarding/StudyOnboardingModal.tsx') + read('src/pages/HomePage.tsx');
  for (const s of ['ภาพรวม 6 เดือน', 'เป้าหมายหลัก 6 เดือน', 'ใน 6 เดือนนี้', 'แผน 6 เดือน', 'เกิน 6 เดือน']) assert(!t.includes(s), s);
  const hub = read('src/pages/hubs/RouteHub.tsx');
  for (const s of ['ภาพรวมเส้นทางของคุณ', 'คุณตั้งเป้าหมายไว้ใน', 'แผนนี้สามารถเดินตามเวลาที่คุณตั้งไว้ได้', 'อาจไม่พอสำหรับสิ่งที่ยังต้องเตรียม', 'ยังไม่ได้ตั้งระยะเวลา', '<HorizonPicker']) assert(hub.includes(s), s);
});
await test('Horizon picker offers presets + custom and onboarding saves only an explicit choice', () => {
  const hp = read('src/components/HorizonPicker.tsx');
  assert(hp.includes('HORIZON_PRESET_MONTHS.map') && hp.includes('กำหนดเอง'));
  const ob = read('src/components/onboarding/StudyOnboardingModal.tsx');
  assert(ob.includes('if (planningHorizon) setStudentProfile({ planningHorizon });'));
});
await test('Primary navigation still exactly 5 items', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
