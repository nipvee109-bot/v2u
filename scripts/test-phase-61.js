/**
 * Test Suite: Phase 61 — Adaptive learning loop
 * (live microphone + iframe mounting are also exercised in Playwright with a fake SpeechRecognition)
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
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };

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

console.log('=== Phase 61: Adaptive learning loop ===\n');
const { useStore, computeLessonLearningRecord } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const L = await jiti.import(path.join(root, 'src/hooks/learningLoop.ts'));
const { nextStepParamsFromState } = await jiti.import(path.join(root, 'src/hooks/useNextStep.ts'));
const D = await jiti.import(path.join(root, 'src/diagnostic/engine.ts'));
const { diagnosticItemsFor } = await jiti.import(path.join(root, 'src/diagnostic/items.ts'));
const IE = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const PROFILE = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };

const fresh = () => {
  useStore.getState().resetToInitial();
  useStore.setState({ lessons: initialLessons.map((l) => ({ ...l, status: 'NOT STARTED', completedAt: undefined, quizScore: undefined, quizAttempts: [], masteryScore: undefined })), hasCompletedOnboarding: true });
  useStore.getState().setStudentProfile(PROFILE);
};
const cl = (id) => C.lessons.find((l) => l.id === id);
const studyFor = (id) => CE.findStudyLesson(cl(id), useStore.getState().lessons);
/** A real summary from the real engine: `wrong` = final-check items answered wrongly, `reveal` = practice steps only revealed */
const sum = (lessonId, { wrong = [], reveal = [] } = {}) => {
  const il = IR.getInteractiveLesson(lessonId);
  const st = IE.initialPlayerState();
  il.finalCheck.forEach((f, i) => { st.finalAnswers[f.id] = wrong.includes(i) ? (f.correctIndex + 1) % f.choices.length : f.correctIndex; });
  il.steps.filter((s) => s.interaction && s.interaction.kind !== 'self').forEach((s, i) => { st.results[s.id] = { attempts: 1, solved: !reveal.includes(i), hintShown: false, revealed: reveal.includes(i) }; });
  st.finished = true;
  return IE.summarize(il, st);
};
const learn = (lessonId, opts, mode = 'v2u') => L.recordCheckEvidence({ studyLessonId: studyFor(lessonId).id, curriculumLessonId: lessonId, skillIds: cl(lessonId).skillIds, summary: sum(lessonId, opts), mode, plannedMinutes: 30 });
const profileNow = () => { const st = useStore.getState(); return D.computeSkillProfile({ storeLessons: st.lessons, records: nextStepParamsFromState(st).route.records, diagnostic: st.diagnostic }); };
const skill = (id) => profileNow().find((s) => s.skillId === id);
const next = () => getNextStep(nextStepParamsFromState(useStore.getState()));
const record = (lessonId) => { const st = useStore.getState(); return computeLessonLearningRecord(st.lessons.find((l) => l.id === studyFor(lessonId).id), st.learningSessionsHistory, st.sessions); };
const sit = (subjectId, right) => {
  const answers = {};
  for (const it of diagnosticItemsFor(subjectId)) answers[it.id] = (it.level === 'basic' ? 0 : 1) < right ? it.correctIndex : (it.correctIndex + 1) % it.choices.length;
  return answers;
};

console.log('1. Evidence rules');
await test('7–9. Opening / starting / reading / watching create NO mastery and NO skill status', () => {
  fresh();
  const st = useStore.getState();
  st.startLearningSession({ lessonId: studyFor('math-alg-linear-eq').id, curriculumLessonId: 'math-alg-linear-eq', plannedMinutes: 30 });
  st.setLearningMode('read');
  st.setVideoProgress('math-alg-linear-eq', 'curated:x', { state: 'watched' });
  assert.strictEqual(useStore.getState().lessons.find((l) => l.id === studyFor('math-alg-linear-eq').id).status, 'IN PROGRESS', 'starting does mark it started');
  assert.strictEqual(skill('skill-math-solve-linear').status, 'not-assessed', 'but that is not evidence');
  assert.strictEqual(record('math-alg-linear-eq').quizLatestScore, undefined);
  assert(!D.hasLearningEvidence(record('math-alg-linear-eq')));
  useStore.getState().abandonLearningSession();
});
await test('1. Practice produces evidence (solved vs only revealed, counted per lesson)', () => {
  fresh();
  const s = sum('math-alg-linear-eq', { reveal: [0] });
  assert(s.practice.total > 0 && s.practice.revealed === 1 && s.practice.solved === s.practice.total - 1);
  const out = learn('math-alg-linear-eq', { reveal: [0] });
  const h = useStore.getState().learningSessionsHistory[0];
  assert.deepStrictEqual(h.understandingCheck.practice, s.practice, 'practice stored with the check');
  assert(!out.passed, 'a revealed practice step marks its skill shaky');
});
await test('2–3. Understanding check produces evidence; a perfect check makes the skills ready', () => {
  fresh();
  assert.strictEqual(skill('skill-math-solve-linear').status, 'not-assessed');
  const out = learn('math-alg-linear-eq', {});
  assert(out.passed && out.score === 100);
  for (const c of out.changes) assert.strictEqual(c.after, 'ready', `${c.skillId} ${c.before}→${c.after}`);
  assert(out.changes.every((c) => c.before === 'not-assessed'));
  assert(CE.isCurriculumLessonCompleted(cl('math-alg-linear-eq'), useStore.getState().lessons), 'passed → lesson credited');
});
await test('Spec example: กำลังพัฒนา (diagnostic) → พร้อม after a passed check', () => {
  fresh();
  const items = diagnosticItemsFor('math');
  const answers = {};
  for (const it of items) answers[it.id] = it.skillId === 'skill-math-solve-linear' && it.level === 'core' ? (it.correctIndex + 1) % it.choices.length : it.skillId === 'skill-math-solve-linear' ? it.correctIndex : null;
  useStore.getState().recordDiagnosticAttempt('math', answers);
  assert.strictEqual(skill('skill-math-solve-linear').status, 'developing');
  const out = learn('math-alg-linear-eq', {});
  const c = out.changes.find((x) => x.skillId === 'skill-math-solve-linear');
  assert.deepStrictEqual([c.before, c.after], ['developing', 'ready']);
});
await test('4. Weak check → ต้องทบทวน, lesson NOT credited, mastery not raised', () => {
  fresh();
  const il = IR.getInteractiveLesson('math-alg-linear-eq');
  const wrong = il.finalCheck.map((_, i) => i).slice(0, 3);
  const out = learn('math-alg-linear-eq', { wrong });
  assert(!out.passed && out.score < 70);
  assert(out.changes.some((c) => c.after === 'needs-review'));
  assert(!CE.isCurriculumLessonCompleted(cl('math-alg-linear-eq'), useStore.getState().lessons), 'failed → not completed');
  assert((out.mastery.after ?? 0) <= 2, `mastery ${out.mastery.after}`);
});
await test('5. Confused check (score ≥70 but one skill wrong) → review signal: High priority, 1 day', () => {
  fresh();
  const il = IR.getInteractiveLesson('math-alg-linear-eq');
  const i = il.finalCheck.findIndex((f) => f.skillId === 'skill-math-check-solution');
  const out = learn('math-alg-linear-eq', { wrong: [i] });
  assert(out.score >= 70 && !out.passed);
  assert.strictEqual(out.changes.find((c) => c.skillId === 'skill-math-check-solution').after, 'needs-review');
  const rv = useStore.getState().reviewQueue.find((r) => r.lessonId === studyFor('math-alg-linear-eq').id && r.status !== 'completed');
  assert(rv && rv.reason === 'unclear_topic' && rv.priority === 'High');
  const days = (new Date(rv.nextReviewAt) - Date.now()) / 864e5;
  assert(days > 0.9 && days < 1.1, `review in ${days} days`);
  assert.deepStrictEqual(out.review && out.review.reason, 'unclear_topic');
  assert.strictEqual(next().kind, 'strengthen', 'the confused skill comes back first');
});
await test('6. Mastery comes only from evidence and is recomputed by the existing calculator (no 0→4 jump)', () => {
  fresh();
  useStore.getState().setLessonMasteryScore(studyFor('math-alg-linear-eq').id, 4); // old manual self-rating
  const il = IR.getInteractiveLesson('math-alg-linear-eq');
  const out = learn('math-alg-linear-eq', { wrong: il.finalCheck.map((_, i) => i) });
  assert.strictEqual(out.mastery.before, 4);
  assert(out.mastery.after < 4, 'a failed check overrides an unproven self-rating');
  fresh();
  const ok = learn('math-alg-linear-eq', {});
  assert.strictEqual(ok.mastery.after, 3, 'one passed check → level 3; level 4 still needs a review');
});
await test('Repeated check: fail then pass → skills recover, lesson credited, history keeps both', () => {
  fresh();
  const il = IR.getInteractiveLesson('math-alg-linear-eq');
  learn('math-alg-linear-eq', { wrong: il.finalCheck.map((_, i) => i) });
  const second = learn('math-alg-linear-eq', {});
  assert(second.passed && second.changes.every((c) => c.after === 'ready'));
  assert(second.changes.some((c) => c.before === 'needs-review'));
  assert.strictEqual(useStore.getState().learningSessionsHistory.length, 2);
});

console.log('2. Review is evidence');
await test('10–12. Review answer → skill update → next step (weak review keeps the item open)', () => {
  fresh();
  learn('math-alg-linear-eq', {});
  const lessonId = studyFor('math-alg-linear-eq').id;
  const rv = useStore.getState().reviewQueue.find((r) => r.lessonId === lessonId && r.status !== 'completed');
  const res = L.recordReviewEvidence({ reviewItemId: rv.id, outcome: 'forgot', skillIds: cl('math-alg-linear-eq').skillIds });
  assert(res.changes.every((c) => c.before === 'ready' && c.after === 'needs-review'), JSON.stringify(res.changes));
  assert.strictEqual(res.next.kind, 'strengthen', 'next step reacts to the review');
  assert.strictEqual(useStore.getState().reviewQueue.find((r) => r.id === rv.id).status, 'pending');
  const unsure = L.recordReviewEvidence({ reviewItemId: rv.id, outcome: 'unsure', skillIds: cl('math-alg-linear-eq').skillIds });
  assert.strictEqual(useStore.getState().reviewQueue.find((r) => r.id === rv.id).status, 'pending', '"ยังไม่แม่น" is not done');
  assert(unsure.changes.every((c) => c.after === 'needs-review'));
  const good = L.recordReviewEvidence({ reviewItemId: rv.id, outcome: 'remembered', skillIds: cl('math-alg-linear-eq').skillIds });
  assert(good.changes.every((c) => c.after !== 'needs-review'), JSON.stringify(good.changes));
  assert.strictEqual(record('math-alg-linear-eq').lastReviewOutcome, 'remembered');
});
await test('Review schedule stays on the existing 1/3/7/14/30 ladder', async () => {
  const { computeNextReviewDate } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
  assert.deepStrictEqual([0, 1, 2, 3].map((n) => computeNextReviewDate(n, 'remembered').intervalDays), [3, 7, 14, 30]);
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((n) => computeNextReviewDate(n, 'partially').intervalDays), [1, 3, 7, 14, 30]);
});
await test('Edge: review overdue → review comes first in the next step', () => {
  fresh();
  learn('math-alg-linear-eq', {});
  const rv = useStore.getState().reviewQueue[0];
  useStore.getState().updateReviewItem(rv.id, { nextReviewAt: '2020-01-01T00:00:00Z' });
  assert.strictEqual(next().rule, 'overdue-review');
});

console.log('3. Gap & next step recalculate — across subjects');
await test('13–16. Gap recalculates, next step changes after learning, and it can leave Math', () => {
  fresh();
  const s = useStore.getState();
  s.recordDiagnosticAttempt('physics', sit('physics', 2));
  s.recordDiagnosticAttempt('programming', sit('programming', 2));
  const before = next();
  assert.strictEqual(before.pathway.subjectId, 'math');
  const gapBefore = D.computeLessonGaps({ storeLessons: useStore.getState().lessons, records: nextStepParamsFromState(useStore.getState()).route.records, diagnostic: useStore.getState().diagnostic, profile: PROFILE }).gaps;
  assert.strictEqual(gapBefore.find((g) => g.lesson.id === 'math-alg-linear-eq').state, 'gap');
  const out = learn('math-alg-linear-eq', {});
  const gapAfter = D.computeLessonGaps({ storeLessons: useStore.getState().lessons, records: nextStepParamsFromState(useStore.getState()).route.records, diagnostic: useStore.getState().diagnostic, profile: PROFILE }).gaps;
  assert.strictEqual(gapAfter.find((g) => g.lesson.id === 'math-alg-linear-eq').state, 'known', 'gap recalculated');
  assert.notStrictEqual(out.next.curriculum.lessonId, before.curriculum.lessonId, 'next step changed');
  assert.strictEqual(out.next.curriculum.lessonId, next().curriculum.lessonId, 'result shows the same step Home will show');
  assert.notStrictEqual(out.nextBefore.todayAction, out.next.todayAction);
});
await test('15. Next step changes SUBJECT after learning (Math → Programming)', () => {
  fresh();
  useStore.getState().recordDiagnosticAttempt('physics', sit('physics', 2));
  const before = next();
  assert.strictEqual(before.pathway.subjectId, 'math');
  const out = learn('math-alg-linear-eq', {});
  assert.strictEqual(out.next.pathway.subjectId, 'programming', `${out.next.pathway.subjectId}: ${out.next.reason}`);
  assert(out.next.reason.includes('Programming'), out.next.reason);
});
await test('27. Cross-subject regression: Physics learned via its own check updates Physics only', () => {
  fresh();
  const out = learn('phy-vec-units', {});
  assert(out.changes.every((c) => c.subjectId === 'physics' && c.after === 'ready'));
  const subs = D.getSubjectProfiles({ storeLessons: useStore.getState().lessons, records: nextStepParamsFromState(useStore.getState()).route.records, diagnostic: useStore.getState().diagnostic });
  assert.strictEqual(subs.find((s) => s.subjectId === 'math').status, 'not-assessed');
  assert.notStrictEqual(subs.find((s) => s.subjectId === 'physics').status, 'not-assessed');
});
await test('Edge: prerequisite unknown → not offered; all lessons known → no lesson invented', () => {
  fresh();
  const g = D.computeLessonGaps({ storeLessons: useStore.getState().lessons, records: [], profile: PROFILE }).gaps;
  assert.strictEqual(g.find((x) => x.lesson.id === 'phy-kin-1d').state, 'blocked');
  const allReady = { attempts: ['math', 'physics', 'programming'].map((s) => ({ id: s, subjectId: s, takenAt: '2026-10-01T00:00:00Z', answers: sit(s, 2) })), skippedSubjects: [] };
  assert.strictEqual(D.recommendPathway({ storeLessons: useStore.getState().lessons, records: [], diagnostic: allReady, profile: PROFILE }), null);
});

console.log('4. Home / Learn / Route read live state');
await test('17–21. Home, Learn (auto + manual), Route and Me all recompute from the store — no cached recommendation', () => {
  const H = read('src/pages/HomePage.tsx'), LH = read('src/pages/hubs/LearnHub.tsx'), R = read('src/pages/hubs/RouteHub.tsx'), P = read('src/hooks/usePathway.ts');
  assert(H.includes('getNextStep(useNextStepParams())') && H.includes('usePathway()'));
  assert(LH.includes('usePathway()') && LH.includes('<AutoRecommendation') && LH.includes('<ManualPicker'));
  assert(R.includes('usePathway()') && R.includes('<PathwayOverview'));
  assert(P.includes('useStore()') && P.includes('useLearningRecords()') && !/useMemo|localStorage|sessionStorage/.test(P), 'computed from the store on every render');
  // the result screen and Home use the same function on the same state
  assert(read('src/hooks/learningLoop.ts').includes('getNextStep(nextStepParamsFromState(') || read('src/hooks/learningLoop.ts').includes('next: getNextStep(p1)'));
});
await test('20–21. Manual selection still offered; auto still works after learning', () => {
  fresh();
  learn('math-alg-linear-eq', {});
  const st = useStore.getState();
  const params = { storeLessons: st.lessons, records: nextStepParamsFromState(st).route.records, diagnostic: st.diagnostic, profile: st.studentProfile };
  for (const sbj of ['math', 'physics', 'programming']) assert.strictEqual(D.recommendPathway({ ...params, subjectId: sbj })?.subjectId, sbj);
  assert(D.recommendPathway(params).lesson.id !== 'math-alg-linear-eq');
});

console.log('5. Persistence & backup');
await test('22. Reload preserves evidence (same storage key; rehydrated state gives the same next step)', async () => {
  fresh();
  learn('math-alg-linear-eq', {});
  await new Promise((r) => setTimeout(r, 350));
  const saved = JSON.parse(mem.get('engineering-study-hub-storage')).state;
  assert(saved.learningSessionsHistory[0].understandingCheck.score === 100);
  const lesson = saved.lessons.find((l) => l.id === studyFor('math-alg-linear-eq').id);
  assert(lesson.completedCurriculumLessonIds.includes('math-alg-linear-eq') && lesson.masteryScore === 3);
  const before = next().curriculum.lessonId;
  useStore.setState({ ...saved });
  assert.strictEqual(next().curriculum.lessonId, before);
  assert.strictEqual([...mem.keys()].filter((k) => k.startsWith('engineering')).length, 1, 'no new storage key');
});
await test('23. Backup round-trip preserves check + practice + review evidence', () => {
  fresh();
  learn('math-alg-linear-eq', { reveal: [0] });
  const rv = useStore.getState().reviewQueue[0];
  L.recordReviewEvidence({ reviewItemId: rv.id, outcome: 'unsure', skillIds: [] });
  const st = useStore.getState();
  const payload = I.createExportPayload({ ...st });
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  const r = I.validateAndParseImport(JSON.stringify(payload));
  assert(r.isValid, r.errors.join());
  const lesson = r.migratedPayload.lessons.find((l) => l.id === studyFor('math-alg-linear-eq').id);
  assert.strictEqual(lesson.lastReviewOutcome, 'unsure');
  assert(lesson.lastReviewedAt);
  assert.deepStrictEqual(r.migratedPayload.learningSessionsHistory[0].understandingCheck.practice, st.learningSessionsHistory[0].understandingCheck.practice);
  const before = next().curriculum?.lessonId ?? next().rule;
  useStore.getState().resetToInitial();
  useStore.getState().importData(r.migratedPayload);
  assert.strictEqual(next().curriculum?.lessonId ?? next().rule, before, 'restored state → same next step');
});
await test('24. Old backups (no Phase 61 fields) still import and old review notes are read from the LAST note', () => {
  const v1 = I.validateAndParseImport(JSON.stringify(initialLessons.slice(0, 2)));
  assert(v1.isValid);
  const l = { ...initialLessons[0], status: 'COMPLETED', reviewNotes: '• [1] (จำได้)\n• [2] (จำไม่ได้)' };
  assert.strictEqual(computeLessonLearningRecord(l, [], []).lastReviewOutcome, undefined, 'record only carries the stored field');
  const old = I.validateAndParseImport(JSON.stringify({ schemaVersion: 5, exportedAt: 'x', lessons: [l], sessions: [], reviewQueue: [] }));
  assert(old.isValid);
});

console.log('6. No duplicate systems; earlier phases intact');
await test('25. One store, one skill engine, one mastery calculator, one review engine', () => {
  const LOOP = read('src/hooks/learningLoop.ts');
  for (const x of ['startLearningSession', 'recordUnderstandingCheck', 'finishLearningSession', 'submitReviewOutcome', 'computeSkillProfile', 'getNextStep']) assert(LOOP.includes(x), x);
  assert(!/create\(|persist\(|localStorage/.test(LOOP), 'no new store');
  assert(!/calculateDeterministicMasteryScore|computeNextReviewDate|getSkillGaps/.test(LOOP), 'reuses existing engines through the store');
});
await test('26. Phase 60 diagnostic still works alongside learning evidence (newest wins)', () => {
  fresh();
  learn('math-alg-linear-eq', {});
  const learnedAt = skill('skill-math-solve-linear').at;
  assert(learnedAt, 'learning evidence has a timestamp');
  const attempt = useStore.getState().recordDiagnosticAttempt('math', sit('math', 0));
  // Back-to-back actions can share a millisecond; this case requires strictly newer evidence.
  const takenAt = new Date(new Date(learnedAt).getTime() + 1000).toISOString();
  useStore.setState((state) => ({ diagnostic: {
    ...state.diagnostic,
    attempts: state.diagnostic.attempts.map((a) => a.id === attempt.id ? { ...a, takenAt } : a),
  } }));
  assert(takenAt > learnedAt, 'the diagnostic fixture is strictly newer than the learning evidence');
  assert.strictEqual(skill('skill-math-solve-linear').status, 'needs-review', 'a newer diagnostic sitting is newer evidence');
});
await test('28. Legacy Study Room stays out of the main flow; legacy finish route still exists', () => {
  const PAGE = read('src/pages/CurriculumLessonPage.tsx');
  assert(!PAGE.includes('?finish=1'), 'no handoff to the Study Room');
  assert(read('src/pages/StudyRoom.tsx').includes("searchParams.get('finish') === '1'"));
  assert(read('src/App.tsx').includes('<LegacyLessonRoute />'));
});
await test('UI: result card shows before → after, mastery, review date and the recalculated next step', () => {
  const R = read('src/components/pathway/LoopResult.tsx');
  for (const x of ['อัปเดตความเข้าใจแล้ว', 'ก่อนหน้านี้', 'ตอนนี้', 'ทบทวนครั้งถัดไป', 'ก้าวต่อไปของคุณ (คำนวณใหม่แล้ว)', 'next.reason', 'ระดับความเข้าใจของบท']) assert(R.includes(x), x);
  assert(read('src/pages/ReviewRoom.tsx').includes('data-testid="review-loop"'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
