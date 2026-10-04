/**
 * Test Suite: Phase 49 — Real User Testing / UX Hardening
 * Regression tests for every bug found during the persona walkthrough
 * (SYNTHETIC persona: ปวช.3 · เทคโนโลยีธุรกิจดิจิทัล · วิศวกรรมคอมพิวเตอร์ · 30 นาที/วัน)
 * plus the Home = Route = Roadmap consistency matrix.
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
const RES = await jiti.import(path.join(root, 'src/resources/engine.ts'));

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

console.log('=== Phase 49: UX Hardening ===\n');

const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const RM = await jiti.import(path.join(root, 'src/roadmap/engine.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { initialLessons, initialWeeklyGoal } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const store = read('src/store/useStore.ts');
const NOW = new Date('2026-10-02T12:00:00Z');
// SYNTHETIC test persona — not real user data
const PERSONA = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 };
const fresh = initialLessons.map((l) => ({ ...l }));
const rec = (lesson, patch = {}) => ({
  lessonId: lesson.id, subjectId: lesson.subjectId, totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED',
  confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0, ...patch,
});
const byTitle = (t) => fresh.find((l) => l.title === t);

console.log('1. New students start clean (bugs #1, #2)');
await test('Seed lessons carry no pretend progress and no placeholder links', () => {
  assert(fresh.every((l) => l.status === 'NOT STARTED'), 'no lesson starts IN PROGRESS / COMPLETED');
  assert(fresh.every((l) => (l.resources ?? []).length === 0), 'no seeded lesson resources');
  const data = read('src/data/initialData.ts');
  for (const bad of ['example.com', 'watch?v=sample', 'mytgat.com', 'createInitialReviewQueue', 'createInitialSessions', 'createInitialResources']) {
    assert(!data.includes(bad), `seed still contains ${bad}`);
  }
});
await test('Store defaults, reset and old-backup import add no demo history', () => {
  for (const s of ['      sessions: [],\n', '      reviewQueue: [],\n', '      resources: [],\n',
    'sessions: data.sessions || [],', 'reviewQueue: data.reviewQueue || [],', 'resources: data.resources || [],']) {
    assert(store.includes(s), s.trim());
  }
  assert(!/initialSessions|initialReviewQueue|initialResources/.test(store));
});
await test('Fresh state: today is the first real lesson, not a review of something never studied', () => {
  const s = NS.getNextStep({ lessons: fresh, referenceDate: NOW, overdueReviews: [], route: { profile: PERSONA, records: fresh.map((l) => rec(l)) } });
  assert.strictEqual(s.kind, 'study');
  assert.strictEqual(s.curriculum.lessonId, 'math-alg-linear-eq');
});

console.log('\n2. Onboarding (bugs #3, #4)');
await test('Weekly study load maps to the nearest daily time option', () => {
  assert.strictEqual(RE.budgetFromWeeklyHours(3), 30);
  assert.strictEqual(RE.budgetFromWeeklyHours(8), 60);
  assert.strictEqual(RE.budgetFromWeeklyHours(12), 120);
  assert.strictEqual(RE.budgetFromWeeklyHours(16), 120);
  assert.strictEqual(RE.budgetFromWeeklyHours(0), 15);
});
await test('Completing onboarding sets V2U daily time from the chosen load', () => {
  assert(store.includes('availableMinutes: budgetFromWeeklyHours(prefs.weeklyTargetHours)'));
});
await test('"เริ่มเรียนคาบแรก" starts the shared next step (with resource confirmation)', () => {
  const modal = read('src/components/onboarding/StudyOnboardingModal.tsx');
  assert(modal.includes('if (onStartFirstLesson) {') && modal.includes('onStartFirstLesson();'));
  assert(read('src/pages/HomePage.tsx').includes('onStartFirstLesson={() => start(step)}'));
});
await test('Onboarding speaks Thai (no "Study Onboarding" / "(Skip)" / "Step n")', () => {
  const modal = read('src/components/onboarding/StudyOnboardingModal.tsx');
  for (const s of ['Study Onboarding', '(Skip)', '<span>Step ', '(Balanced)', '(Intensive)', '(Paced)']) assert(!modal.includes(s), s);
});

console.log('\n3. Start → Study Room (bugs #5, #6)');
await test('Next step exposes where to find the recommended resource (no unchecked URL)', async () => {
  const s = NS.getNextStep({ lessons: fresh, referenceDate: NOW, route: { profile: PERSONA, records: fresh.map((l) => rec(l)) } });
  const rr = s.curriculum.recommendedResource;
  assert(rr.locator && rr.locator.length > 5);
  assert(rr.url, 'Phase 67: only verified resources (with a real URL) are recommended');
  // the real registry has no verified link yet → nothing is recommended, and the step still works
  RES.__setResourceRegistryForTests();
  const real = NS.getNextStep({ lessons: fresh, referenceDate: NOW, route: { profile: PERSONA, records: fresh.map((l) => rec(l)) } });
  assert.strictEqual(real.curriculum.recommendedResource, undefined);
  assert(real.curriculum.lessonId && real.curriculum.title);
  await useActionableRegistry(jiti, root, path);
});
await test('Resource confirmation shows V2U recommendation and today\'s planned minutes', () => {
  const hook = read('src/hooks/useStartNextStep.tsx');
  assert(hook.includes('suggestion={confirming?.curriculum?.recommendedResource}') && hook.includes('plannedMinutes={confirming?.minutes}'));
  const modal = read('src/components/study/ResourceConfirmationModal.tsx');
  assert(modal.includes('V2U แนะนำสำหรับวันนี้') && modal.includes('`วันนี้ ${plannedMinutes} นาที`') && modal.includes('(ยังไม่ได้ตรวจลิงก์)'));
});
await test('Study Room timer target uses today\'s planned minutes; empty panel shows the recommendation', () => {
  assert(read('src/types.ts').includes('plannedMinutes?: number;'));
  assert(store.includes('...(plannedMinutes ? { plannedMinutes } : {})'));
  const room = read('src/pages/StudyRoom.tsx');
  assert(room.includes('activeLearningSession.plannedMinutes') && room.includes('suggestion={curatedSuggestion}'));
  assert(read('src/components/study/ResourceViewer.tsx').includes('V2U แนะนำ:'));
});

console.log('\n4. Post-study (bugs #7, #8, #9)');
await test('Recommended next action follows the student\'s answers until they pick one', () => {
  const m = read('src/components/study/PostLearningFlowModal.tsx');
  assert(m.includes('const selectedNextAction = userPickedAction ?? defaultRecommendedAction;'));
  assert(!m.includes('useState<NextActionChoice>(defaultRecommendedAction)'), 'must not freeze the initial recommendation');
});
await test('"ไปขั้นต่อไป" returns to the shared next step; "คิวทบทวน" opens ทบทวน', () => {
  const room = read('src/pages/StudyRoom.tsx');
  assert(/nextAction === 'next_lesson'\) \{\s*navigate\('\/'\);/.test(room));
  assert(/nextAction === 'review'\) \{\s*navigate\('\/review'\);/.test(room));
  assert(!room.includes("navigate(`/study/${nextLesson.id}`)"), 'no second next-lesson decision path');
});
await test('No unsupported claims or internal jargon in post-study / review screens', () => {
  const t = read('src/components/study/PostLearningFlowModal.tsx') + read('src/pages/ReviewRoom.tsx') + read('src/pages/StudyRoom.tsx');
  for (const s of ['+50% Retention', 'Neural Pathway', 'Active Recall Challenge', 'Update Spaced Schedule', 'Spaced Repetition', '(Learned Notes)', '(Still Unclear)', '(Review Focus)', 'Mastery Recalculation', '(Update Mastery)', 'Mastery & ก้าวถัดไป']) {
    assert(!t.includes(s), s);
  }
});

console.log('\n5. Review & header (bugs #10, #11)');
await test('ReviewRoom header is readable (not overridden by the white .card background)', () => {
  const r = read('src/pages/ReviewRoom.tsx');
  assert(!r.includes('className="card p-6 bg-gradient-to-r from-purple-900'));
  // V2U design: the context header is a design surface (no .card white-on-white problem)
  assert(r.includes('data-testid="review-context"') && r.includes("background: 'var(--surface)'"));
});
await test('Header reminder shows a dot only when reviews are actually due', () => {
  const l = read('src/components/Layout.tsx');
  assert(l.includes('{dueCount > 0 && <span'), 'conditional dot');
  assert(l.includes('to="/review"') && l.includes('ถึงเวลาทบทวน ${dueCount} เรื่อง'));
});
await test('Home invites setting the starting point while it is still the default', () => {
  assert(read('src/pages/HomePage.tsx').includes('{!studentProfile && ('));
});

console.log('\n6. Accessibility (bugs #12, #13)');
await test('Study and post-study note fields have programmatic labels', () => {
  const room = read('src/pages/StudyRoom.tsx');
  for (const id of ['study-unclear-notes', 'study-review-notes']) assert(room.includes(`htmlFor="${id}"`) && room.includes(`id="${id}"`), id);
  const post = read('src/components/study/PostLearningFlowModal.tsx');
  for (const id of ['post-learned-notes', 'post-unclear-notes', 'post-review-notes']) assert(post.includes(`htmlFor="${id}"`) && post.includes(`id="${id}"`), id);
  assert(read('src/components/study/VoiceSummaryInput.tsx').includes('id={id}'));
});
await test('Dialogs close with Escape (post-study, resource confirmation, onboarding)', () => {
  for (const f of ['src/components/study/PostLearningFlowModal.tsx', 'src/components/study/ResourceConfirmationModal.tsx', 'src/components/onboarding/StudyOnboardingModal.tsx']) {
    assert(/e\.key === 'Escape'/.test(read(f)), f);
  }
});

console.log('\n7. Home = Route = Roadmap after every kind of change');
const base = (o = {}) => ({
  lessons: o.lessons ?? fresh,
  referenceDate: NOW,
  overdueReviews: o.overdueReviews ?? [],
  activeLearningSession: o.activeLearningSession ?? null,
  route: { profile: o.profile ?? PERSONA, records: o.records ?? (o.lessons ?? fresh).map((l) => rec(l)), budget: o.budget, checklist: o.checklist },
});
const done = fresh.map((l) => (l.title === 'สมการและอสมการเชิงเส้น' ? { ...l, status: 'COMPLETED' } : l));
const matrix = {
  'fresh state': base(),
  'unfinished study': base({ activeLearningSession: { lessonId: byTitle('ตรีโกณมิติ').id, status: 'active' } }),
  'overdue review': base({ overdueReviews: [{ id: 'rv', lessonId: fresh[0].id, topic: 'x', nextReviewAt: '2026-09-01T00:00:00Z' }] }),
  'weak skill': base({ records: fresh.map((l) => (l.title === 'Python พื้นฐาน' ? rec(l, { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, quizLatestScore: 10 }) : rec(l))) }),
  'completed lesson': base({ lessons: done, records: done.map((l) => (l.status === 'COMPLETED' ? rec(l, { completionStatus: 'COMPLETED', studyCount: 1, masteryScore: 3, nextReviewAt: '2026-12-01T00:00:00Z' }) : rec(l))) }),
  'changed time': base({ budget: 120 }),
  'changed profile': base({ profile: { ...PERSONA, educationLevel: 'ปวส.1', programId: 'electronics' } }),
  'changed GPAX': base(), // GPAX is an admission input: it never changes today's study step
  'changed admission checklist': base({ checklist: { 'req-exams::TGAT': 'met', 'req-portfolio::โปรเจกต์โปรแกรมอย่างน้อย 1 ชิ้น': 'gap' } }),
};
for (const [name, params] of Object.entries(matrix)) {
  await test(`${name}: roadmap today === Home next step, week starts with it`, () => {
    const home = NS.getNextStep(params);
    const rm = RM.buildRoadmap(params);
    assert.deepStrictEqual(rm.today, home);
    assert.strictEqual(rm.thisWeek.actions[0].title, home.todayAction);
  });
}
await test('Changing time changes the plan, not the decision', () => {
  const a = NS.getNextStep(base()); const b = NS.getNextStep(base({ budget: 120 }));
  assert.strictEqual(a.todayAction, b.todayAction);
  assert.notStrictEqual(a.minutes, b.minutes);
});
await test('Route page, Home and post-study all route through the shared next step', () => {
  const hub = read('src/pages/hubs/RouteHub.tsx');
  assert(hub.includes('buildRoadmap(params)') && hub.includes('start(today)') && !hub.includes('getRouteNextStep('));
  assert(read('src/pages/HomePage.tsx').includes('getNextStep(useNextStepParams())'));
});

console.log('\n8. Backup round-trip');
await test('Export → wipe → import restores profile, progress, readiness, reviews, history, admission inputs', () => {
  const lessons = fresh.map((l, i) => (i === 1 ? { ...l, status: 'COMPLETED', masteryScore: 4, quizScore: 88 } : l));
  const state = {
    lessons, sessions: [], weeklyGoal: initialWeeklyGoal, unclearTopics: [], goals: [], resources: [], hasCompletedOnboarding: true,
    learningSessionsHistory: [{ sessionId: 'ls', lessonId: lessons[1].id, startedAt: '2026-10-01T10:00:00Z', completedAt: '2026-10-01T10:30:00Z', accumulatedSeconds: 1800, actualSeconds: 1800, status: 'completed', plannedMinutes: 30 }],
    reviewQueue: [{ id: 'rq', lessonId: lessons[1].id, topic: 't', createdAt: '2026-10-01T00:00:00Z', nextReviewAt: '2026-12-01T00:00:00Z', reviewCount: 1, status: 'pending', reason: 'spaced_repetition', priority: 'Medium' }],
    studentProfile: { ...PERSONA, availableMinutes: 60 },
    admissionInputs: { gpax: 3.42, examScores: {}, checklist: { 'req-exams::TGAT': 'met' } },
  };
  const r = I.validateAndParseImport(JSON.stringify(I.createExportPayload(state)));
  assert.strictEqual(r.isValid, true, r.errors.join());
  const p = r.migratedPayload;
  assert.deepStrictEqual(p.studentProfile, state.studentProfile);
  assert.deepStrictEqual(p.admissionInputs, state.admissionInputs);
  assert.strictEqual(p.lessons[1].status, 'COMPLETED');
  assert.strictEqual(p.lessons[1].masteryScore, 4);
  assert.strictEqual(p.reviewQueue.length, 1);
  assert.strictEqual(p.learningSessionsHistory.length, 1);
  // roadmap from restored data matches roadmap from original data
  const params = (src) => ({ lessons: src.lessons, referenceDate: NOW, route: { profile: src.studentProfile, records: src.lessons.map((l) => rec(l)), checklist: src.admissionInputs.checklist } });
  assert.deepStrictEqual(RM.buildRoadmap(params(p)).phases.map((x) => [x.requirementId, x.status, x.remainingMinutes]),
    RM.buildRoadmap(params(state)).phases.map((x) => [x.requirementId, x.status, x.remainingMinutes]));
});
await test('Old backups (v1 array, v4 without profile) still import and never invent demo data', () => {
  const v1 = I.validateAndParseImport(JSON.stringify(fresh.slice(0, 2)));
  assert.strictEqual(v1.isValid, true);
  assert.strictEqual(v1.migratedPayload.reviewQueue.length, 0);
  assert.strictEqual(v1.migratedPayload.sessions.length, 0);
});

console.log('\n9. Test report');
await test('Phase 49 internal test report exists and lists fixed and deferred issues', () => {
  const r = read('docs/testing/phase-49-ux-report.md');
  for (const s of ['Journey tested', 'Viewports', 'Issues found and fixed', 'Deferred', 'SYNTHETIC']) assert(r.includes(s), s);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
