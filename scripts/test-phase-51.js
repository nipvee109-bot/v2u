/**
 * Test Suite: Phase 51 — Real learning content + resource curation
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

const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const O = await jiti.import(path.join(root, 'src/content/originals.ts'));
const CE = await jiti.import(path.join(root, 'src/content/engine.ts'));
const S = await jiti.import(path.join(root, 'src/search/engine.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const RM = await jiti.import(path.join(root, 'src/roadmap/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

console.log('=== Phase 51: Real Learning Content + Resource Curation ===\n');

console.log('1. Every lesson has a usable path');
await test('All curriculum lessons (15 admission + 5 optional web) have a learning path with original, practice and check', () => {
  assert.strictEqual(C.lessons.length, 20);
  assert.strictEqual(C.lessons.filter((l) => l.subjectId !== 'web').length, 15);
  for (const l of C.lessons) {
    const p = CE.getLearningPath(l.id);
    assert(p, l.id);
    assert(p.original && p.original.lessonId === l.id, `${l.id} original`);
    assert(p.practiceExerciseId && C.exercises.some((x) => x.id === p.practiceExerciseId), `${l.id} practice`);
    assert(p.checkQuizId && C.quizzes.some((x) => x.id === p.checkQuizId), `${l.id} check`);
    // Web lessons have no curated external resource yet: they start from V2U's own content + the HTML builder
    if (l.subjectId !== 'web') assert(p.primary, `${l.id} primary`);
  }
});
await test('V2U originals: all 8 sections + traceability, validateOriginals() clean', () => {
  assert.deepStrictEqual(CE.validateOriginals(), []);
  for (const o of O.ORIGINAL_LESSONS) {
    assert.strictEqual(o.author, 'V2U');
    assert(o.contentId && o.version && o.createdAt && o.updatedAt && o.relatedLessonIds.length && o.relatedSkills.length, o.contentId);
  }
});
await test('Original fallback: a lesson with no external resources still gets a full plan', () => {
  const p = E.buildLearningPlan('math-alg-linear-eq', 30, []);
  assert(p);
  assert.strictEqual(p.totalMinutes, 30);
  assert(p.steps.some((s) => s.contentId), 'uses V2U original');
  assert(p.steps.every((s) => !s.resourceId));
});

console.log('\n2. Honest resources');
await test('No fake URLs: unverified never carries url/videoId; candidate URLs have search provenance', () => {
  for (const r of R) {
    if (r.status === 'unverified') assert(!r.url && !r.videoId, r.id);
    if (r.candidateUrl) {
      assert(/^https?:\/\//.test(r.candidateUrl), r.id);
      assert(r.urlProvenance && r.urlProvenance.query && r.urlProvenance.resultTitle && r.urlProvenance.foundAt, r.id);
      assert(!/example\.com|placeholder|xxx/i.test(r.candidateUrl), r.id);
    }
  }
  assert.deepStrictEqual(E.validateResources(), []);
});
await test('Verified/active resources carry verification metadata', () => {
  for (const r of R) if (r.status === 'verified' || r.status === 'active') assert(r.verification?.checkedAt && r.verification.method, r.id);
});
await test('Unverified is never treated as active (search result ≠ verified)', () => {
  for (const r of R) if (r.urlProvenance) assert.strictEqual(r.status, 'unverified', r.id);
});
await test('Deprecated resources are never recommended in any path or plan', () => {
  const dep = new Set(R.filter((r) => r.status === 'deprecated').map((r) => r.id));
  for (const l of C.lessons) {
    const p = CE.getLearningPath(l.id);
    for (const r of [p.primary, p.alternative, p.reading]) if (r) assert(!dep.has(r.id), l.id);
    for (const b of [15, 30, 60, 120]) for (const s of E.buildLearningPlan(l.id, b).steps) assert(!s.resourceId || !dep.has(s.resourceId));
  }
});
await test('Thai preferred within the same trust tier', () => {
  for (const l of C.lessons) {
    const list = E.getResourcesForLesson(l.id);
    for (let i = 1; i < list.length; i++)
      if (list[i].status === list[i - 1].status) assert(!(list[i].language === 'th' && list[i - 1].language !== 'th'), l.id);
  }
  // A lesson with a Thai clip gets it as primary when tiers are equal
  const p = CE.getLearningPath('math-alg-linear-eq');
  const top = E.getResourcesForLesson('math-alg-linear-eq')[0];
  if (top.status === 'unverified') assert.strictEqual(p.primary.language, 'th');
});

console.log('\n3. Time integration');
await test('Plans fill the budget exactly; partial use is labelled', () => {
  for (const l of C.lessons)
    for (const b of [15, 30, 60, 120]) {
      const p = E.buildLearningPlan(l.id, b);
      assert.strictEqual(p.totalMinutes, b, `${l.id} ${b}`);
      for (const s of p.steps) if (s.resourceId) {
        const r = R.find((x) => x.id === s.resourceId);
        if (r.estimatedMinutes > s.minutes) assert(s.partial === true && /ช่วง/.test(s.detail), `${l.id} ${b}`);
      }
    }
});
await test('30 min = clip/explanation + V2U summary + check; 60 adds practice; 120 adds deeper reading', () => {
  const k = (b) => E.buildLearningPlan('math-alg-linear-eq', b).steps;
  assert.deepStrictEqual(k(30).map((s) => s.kind), ['learn', 'example', 'check']);
  assert(k(30)[1].contentId);
  assert(k(60).some((s) => s.kind === 'practice'));
  assert(k(120).some((s) => s.kind === 'deepen') && k(120).some((s) => s.kind === 'recap'));
});
await test('describePlan shows the real breakdown, e.g. "… + สรุป V2U 7 + เช็ก 5 = 30 นาที"', () => {
  const d = CE.describePlan(E.buildLearningPlan('math-alg-linear-eq', 30));
  assert(/^คลิป \d+ \+ สรุป V2U \d+ \+ เช็ก 5 = 30 นาที$/.test(d), d);
  const n = [...d.matchAll(/ (\d+)(?= \+| =)/g)].map((m) => Number(m[1])); assert.strictEqual(n.reduce((a, b) => a + b, 0), 30, d);
});

console.log('\n4. Search');
await test('Search finds lessons, clips, reading and practice', () => {
  assert(S.searchCurated('สมการ').groups.lesson.length > 0);
  assert(S.searchCurated('สมการ').groups.video.length > 0);
  assert(S.searchCurated('หนังสือ').groups.reading.length > 0 || S.searchCurated('สสวท').groups.reading.length > 0);
  assert(S.searchCurated('ฝึก').groups.practice.length > 0);
  assert.strictEqual(S.searchCurated('').total, 0);
});
await test('External web results are separate and labelled', () => {
  const r = S.searchCurated('เวกเตอร์');
  assert(/นอก V2U/.test(r.external.label));
  for (const g of Object.values(r.groups)) for (const h of g) assert(h.href.startsWith('/'), 'curated hits stay in-app');
  assert(read('src/components/search/CuratedSearchResults.tsx').includes('data-external'));
});
await test('Search never returns deprecated resources', () => {
  const dep = new Set(R.filter((r) => r.status === 'deprecated').map((r) => r.id));
  for (const q of ['python', 'สมการ', 'ฟิสิกส์', 'khan', 'openstax']) for (const h of [...S.searchCurated(q).groups.video, ...S.searchCurated(q).groups.reading]) assert(!dep.has(h.id));
});

console.log('\n5. One plan everywhere');
const NOW = new Date('2026-10-02T12:00:00Z');
const PERSONA = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering' };
const fresh = initialLessons.map((l) => ({ ...l }));
const rec = (l) => ({ lessonId: l.id, subjectId: l.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED', confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0 });
const params = { lessons: fresh, referenceDate: NOW, route: { profile: { ...PERSONA, availableMinutes: 30 }, records: fresh.map(rec) } };
await test('Home/Route next step carries the plan; confirmation recommendation = plan’s first resource', () => {
  const step = NS.getNextStep(params);
  assert.strictEqual(step.kind, 'study');
  assert(step.plan && step.plan.totalMinutes === step.minutes);
  const first = step.plan.steps.find((s) => s.resourceId);
  if (first) assert.strictEqual(step.curriculum.recommendedResource.id, first.resourceId);
  assert.deepStrictEqual(RM.buildRoadmap(params).today, step, 'Roadmap today = same step');
});
await test('Confirmation modal renders describePlan from the same plan; Study Room shows the path', () => {
  assert(read('src/hooks/useStartNextStep.tsx').includes('plan={confirming?.plan}'));
  assert(read('src/components/study/ResourceConfirmationModal.tsx').includes('describePlan(plan)'));
  assert(read('src/pages/StudyRoom.tsx').includes('<LearningPathPanel'));
  assert(read('src/App.tsx').includes('/learn/curriculum/:lessonId'));
  const page = read('src/pages/CurriculumLessonPage.tsx');
  // Phase 54: modes live in the shared learning flow; the third mode is now “เรียนกับ V2U”
  assert(page.includes('<LessonLearning'));
  const modes = read('src/components/learning/meta.ts');
  for (const m of ['ดูคลิป', 'อ่าน', 'เรียนกับ V2U']) assert(modes.includes(m), m);
});
await test('Reading mode shows time, sections, summary, key terms, examples', () => {
  const v = read('src/components/learn/OriginalLessonView.tsx');
  for (const s of ['readingMinutes', 'summary', 'keyTerms', 'examples', 'ORIGINAL_SECTION_TITLES']) assert(v.includes(s), s);
});
await test('Post-study still goes to review (session credits curriculum lesson)', () => {
  const st = read('src/store/useStore.ts');
  assert(st.includes('creditCurriculumLesson(l, state.lessons, current.curriculumLessonId)'));
  assert(/nextReviewAt|reviewQueue/.test(st));
});

console.log('\n6. Backup');
await test('Backup keeps session resource refs and curriculum link', () => {
  const src = { id: 'r1', title: 'คลิป', type: 'youtube', url: 'https://www.youtube.com/watch?v=x' };
  const raw = {
    schemaVersion: I.CURRENT_SCHEMA_VERSION,
    lessons: fresh,
    learningSessionsHistory: [{ sessionId: 's1', lessonId: fresh[0].id, startedAt: NOW.toISOString(), accumulatedSeconds: 60, actualSeconds: 60, status: 'completed', lastHeartbeatAt: NOW.toISOString(), source: src, resourcesUsed: [src], plannedMinutes: 30, curriculumLessonId: 'math-alg-linear-eq' }],
  };
  const { payload } = I.migrateToLatestSchema(raw);
  const s = payload.learningSessionsHistory[0];
  assert.strictEqual(s.curriculumLessonId, 'math-alg-linear-eq');
  assert.strictEqual(s.plannedMinutes, 30);
  assert.deepStrictEqual(s.source, src);
  assert.strictEqual(s.resourcesUsed.length, 1);
});
await test('Old backups (v1 array, no Phase 51 fields) still import', () => {
  const { payload } = I.migrateToLatestSchema(fresh.slice(0, 3));
  assert.strictEqual(payload.lessons.length, 3);
  assert(Array.isArray(payload.learningSessionsHistory));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
