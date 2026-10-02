/**
 * Test Suite: Phase 58 — Legacy Study Room removed from main flow
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

console.log('=== Phase 58: Learning Hub is the main flow ===\n');

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

const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { initialWeeklyGoal } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { PRIMARY_NAV } = await jiti.import(path.join(root, 'src/components/navigation/primaryNav.ts'));
const layout = read('src/components/Layout.tsx');
const app = read('src/App.tsx');
const legacy = read('src/pages/legacy/LegacyLessonRoute.tsx');
const linear = byTitle('สมการและอสมการเชิงเส้น');

console.log('1. Green header chip');
await test('1. Green chip no longer links to /lessons/:id', () => {
  assert(!layout.includes('to={`/lessons/${activeLesson.id}`}'));
  assert(layout.includes('to={activeHref}') && layout.includes('กลับไปเรียนบทนี้'));
});
await test('2. Green chip resolves to the Learning Hub of the session lesson', () => {
  assert(layout.includes('learningHubPathFor(activeLesson, lessons, activeLearningSession?.curriculumLessonId)'));
  assert.strictEqual(CE.learningHubPathFor(linear, lessons, 'math-alg-linear-eq'), '/learn/curriculum/math-alg-linear-eq');
  // a session curriculum id that does not belong to this lesson is ignored, never invented
  const p = CE.learningHubPathFor(linear, lessons, 'not-a-lesson');
  assert(p.startsWith('/learn/curriculum/') && CE.getCurriculumLessonsForStudyLesson(linear).some((c) => p.endsWith(c.id)));
});

console.log('2. Start next step');
await test('3. เริ่มขั้นต่อไป goes to the Learning Hub (route, weak skill, unfinished)', () => {
  assert.strictEqual(step().href, '/learn/curriculum/math-alg-linear-eq');
  assert(step({}, { records: weakPython }).href.startsWith('/learn/curriculum/'));
  const cont = step({ activeLearningSession: { lessonId: linear.id, status: 'paused', curriculumLessonId: 'math-alg-linear-eq' } });
  assert.strictEqual(cont.href, '/learn/curriculum/math-alg-linear-eq');
  const hook = read('src/hooks/useStartNextStep.tsx');
  assert(hook.includes('navigate(`/learn/curriculum/${step.curriculum.lessonId}?from=next'));
});

console.log('3. Legacy deep links');
await test('4. Curriculum /lessons/:id redirects to the Learning Hub', () => {
  assert(app.includes('<Route path="/lessons/:id" element={<LegacyLessonRoute />} />'));
  assert(legacy.includes('<Navigate to={hub} replace />') && legacy.includes('learningHubPathFor('));
  assert.strictEqual(CE.learningHubPathFor(linear, lessons), '/learn/curriculum/math-alg-linear-eq');
});
await test('5. Timer page is not a main destination', () => {
  assert(!PRIMARY_NAV.some((n) => /lessons|study/.test(n.to)));
  for (const f of ['src/pages/hubs/LearnHub.tsx', 'src/pages/hubs/ReviewHub.tsx', 'src/components/Layout.tsx', 'src/pages/CurriculumLessonPage.tsx', 'src/pages/CurriculumPage.tsx']) {
    const s = read(f);
    assert(!/to[=:] ?\{?`\/lessons\/\$\{(activeLesson|studyLesson|liveLesson)\.id\}`/.test(s), `${f} still links to the legacy page`);
  }
});
await test('12. Legacy deep links are never blank: non-curriculum ids still render a page', () => {
  assert(legacy.includes('<LessonDetail />') && legacy.includes('<Suspense'));
  assert(app.includes('path="/study/:id"') && app.includes('path="/study-room/:id"'), 'routes are kept');
  const fake = { id: 'x', title: 'ไม่ได้อยู่ในหลักสูตร', subjectId: 'math' };
  assert.strictEqual(CE.learningHubPathFor(fake, lessons), null);
});

console.log('4. Learning Hub and navigation kept');
await test('6. The 3 learning modes are still there', () => {
  const meta = read('src/components/learning/meta.ts');
  for (const t of ["'อ่านกับ V2U'", "'ดูคลิป'", "'เรียนกับ V2U'"]) assert(meta.includes(t));
});
await test('7. Exactly 5 nav items', () => assert.strictEqual(PRIMARY_NAV.length, 5));

console.log('5. Data logic preserved');
const store = read('src/store/useStore.ts');
await test('8. Progress kept: finishing still hands off to the recorder', () => {
  assert(read('src/pages/CurriculumLessonPage.tsx').includes('navigate(`/study/${studyLesson.id}?finish=1`)'));
  assert(read('src/pages/StudyRoom.tsx').includes('{finishOpen && ('));
  for (const s of ['finishLearningSession', 'learningSessionsHistory', 'completedCurriculumLessonIds']) assert(store.includes(s), s);
});
await test('9. Mastery kept', () => assert(store.includes('masteryScore') && store.includes('scoreToMasteryLevel')));
await test('10. Review queue kept', () => assert(store.includes('reviewQueue') && store.includes('getDueReviewItems')));
await test('11. Backup export → import round-trip still works', () => {
  const ls = lessons.map((l, i) => (i === 1 ? { ...l, status: 'COMPLETED', masteryScore: 4 } : l));
  const state = { lessons: ls, sessions: [], weeklyGoal: initialWeeklyGoal, unclearTopics: [], goals: [], resources: [], hasCompletedOnboarding: true,
    reviewQueue: [{ id: 'rq', lessonId: ls[1].id, topic: 't', createdAt: '2026-10-01T00:00:00Z', nextReviewAt: '2026-12-01T00:00:00Z', reviewCount: 1, status: 'pending', reason: 'spaced_repetition', priority: 'Medium' }],
    learningSessionsHistory: [] };
  const r = I.validateAndParseImport(JSON.stringify(I.createExportPayload(state)));
  assert.strictEqual(r.isValid, true, r.errors.join());
  assert.strictEqual(r.migratedPayload.lessons[1].masteryScore, 4);
  assert.strictEqual(r.migratedPayload.reviewQueue.length, 1);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
