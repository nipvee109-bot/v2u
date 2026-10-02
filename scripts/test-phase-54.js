/**
 * Test Suite: Phase 54 — Interactive V2U learning experience
 * (browser behaviour — no YouTube before "ดูคลิป", layouts, overflow — is also
 *  exercised by the Playwright sweep; here we pin the logic and the structure)
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

// The persisted store needs storage; give it an in-memory one
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };

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

const E = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const R = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { ORIGINAL_LESSONS } = await jiti.import(path.join(root, 'src/content/originals.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));

const LL = read('src/components/learning/LessonLearning.tsx');
const META = read('src/components/learning/meta.ts');
const STUDY = read('src/pages/StudyRoom.tsx');
const PAGE = read('src/pages/CurriculumLessonPage.tsx');
const lesson = R.getInteractiveLesson('math-alg-linear-eq');
const step = (id) => lesson.steps.find((s) => s.id === id);

console.log('=== Phase 54: Interactive V2U Learning Experience ===\n');

console.log('1. Mode selection');
await test('1. Mode selection renders first ("วันนี้คุณอยากเรียนแบบไหน?") when no mode is chosen', () => {
  assert(LL.includes('คุณอยากเรียนเรื่องนี้แบบไหน?') && LL.includes('if (!mode) {'));
  assert(!/mode: Mode = .*\? 'video'/.test(PAGE), 'lesson page must not default to a mode');
});
await test('2. Three modes with the specified titles and descriptions', () => {
  // Phase 56 wording: อ่านกับ V2U / ดูคลิป / เรียนกับ V2U
  for (const x of ['อ่านกับ V2U', 'สรุปให้เข้าใจง่าย แต่เจาะลึก ไม่ต้องอ่านยาว', 'ดูคลิป', 'เรียนจากวิดีโอที่ V2U คัดตามลำดับ', 'เรียนกับ V2U', 'เรียนผ่านภารกิจ เกม การทดลอง และกิจกรรมแบบ Interactive']) assert(META.includes(x), x);
  assert(LL.includes("const ORDER: LearningMode[] = ['read', 'video', 'v2u'];"));
});
await test('3. No external video before choosing: the picker renders no viewer, Study Room gates the workspace', () => {
  const picker = LL.slice(LL.indexOf('if (!mode) {'), LL.indexOf('/* ── Explicit mode switch'));
  assert(!/VideoLearning|<iframe|ResourceViewer|YouTube/i.test(picker), 'picker must not render video');
  // Phase 55: the video branch is V2U's video workflow; the legacy viewer is only for non-curriculum lessons
  assert(STUDY.includes(') : (\n            videoWorkspace\n          )}'), 'legacy workspace only without a curriculum lesson');
  assert.strictEqual((STUDY.match(/<ResourceViewer/g) || []).length, 1);
  assert(STUDY.indexOf('<ResourceViewer') > STUDY.indexOf('const videoWorkspace = ('));
});
await test('4. The player is rendered only after a clip is chosen, with outcomes, external label and a check CTA', () => {
  const VL = read('src/components/video/VideoLearning.tsx');
  const videoBranch = LL.slice(LL.indexOf("} else {\n    // ดูคลิป"), LL.indexOf('return (\n    <div className="space-y-5" data-learning-mode'));
  assert(videoBranch.includes('<VideoLearning'));
  // the only player lives in the workspace, after the entry / pick / reflect early returns
  assert.strictEqual((VL.match(/<YouTubePlayer/g) || []).length, 1);
  assert(VL.indexOf('<YouTubePlayer') > VL.indexOf("/* ── Workspace: video + notes"));
  for (const x of ['ดูคลิปนี้เพื่อ', 'แหล่งภายนอก', 'ลองเช็กความเข้าใจ', 'ดูคลิปอย่างเดียวยังไม่ได้แปลว่าเข้าใจ']) assert(VL.includes(x), x);
});

console.log('\n2. Modes');
await test('5. Reading mode: hero, section nav, concept cards, examples, mistakes, mini checks, progress, CTA', () => {
  const r = read('src/components/learning/ReadingExperience.tsx');
  // Phase 56: 8 short sections (labels live in meta.ts)
  const meta = read('src/components/learning/meta.ts');
  for (const x of ['สิ่งที่ต้องเข้าใจ', 'หลักคิด', 'อธิบายแบบง่าย', 'ตัวอย่าง', 'วิธีคิดทีละขั้น', 'จุดที่มักพลาด', 'ลองทำ', 'เช็กความเข้าใจ']) assert(meta.includes(x), x);
  for (const x of ['อ่านจบแล้วจะ', 'หัวข้อในบท', 'อ่านแล้ว', 'วิธีทำ', 'ตรวจคำตอบ', 'ไปเช็กความเข้าใจ', 'IntersectionObserver']) assert(r.includes(x), x);
});
await test('6. V2U mode: every curriculum lesson has an interactive lesson (authored or generated from existing content)', () => {
  assert.deepStrictEqual(R.validateInteractiveLessons(), []);
  assert.strictEqual(lesson.source, 'authored');
  for (const l of C.lessons) assert(R.getInteractiveLesson(l.id), l.id);
  const gen = R.getInteractiveLesson('phy-kin-1d'); // phy-dyn-newton became an authored lab in Phase 56
  assert.strictEqual(gen.source, 'generated');
  const o = ORIGINAL_LESSONS.find((x) => x.lessonId === 'phy-kin-1d');
  assert(gen.steps.some((s) => s.interaction?.kind === 'self' && s.interaction.answer === o.tryIt[0].answer), 'generated from the original');
});
await test('7. Video mode exists in the shared flow and the Study Room keeps the curated resources', () => {
  assert(LL.includes('data-testid="video-mode"'));
  assert(STUDY.includes('<LearningPathPanel'));
});
await test('First interactive lesson uses only existing V2U content (examples, try-its, check, quiz)', () => {
  const o = ORIGINAL_LESSONS.find((x) => x.lessonId === 'math-alg-linear-eq');
  assert(step('first-move').visual.lines[0] === o.examples[0].problem);
  assert(step('order-brackets').visual.lines[0] === o.examples[1].problem);
  assert.deepStrictEqual(step('order-brackets').interaction.items.slice(0, 3), o.examples[1].steps.slice(0, 3));
  assert(step('try-1').visual.lines[0] === o.tryIt[0].prompt && `x = ${step('try-1').interaction.accept[0]}` === o.tryIt[0].answer);
  assert(step('try-2').visual.lines[0] === o.tryIt[1].prompt && `x = ${step('try-2').interaction.accept[0]}` === o.tryIt[1].answer);
  const quiz = C.quizzes.find((q) => q.lessonId === 'math-alg-linear-eq').questions;
  for (const q of quiz) assert(lesson.finalCheck.some((f) => f.prompt === q.prompt && f.choices[f.correctIndex] === q.choices[q.correctIndex]));
  assert(lesson.finalCheck.some((f) => f.prompt === o.check[0].prompt && `x = ${f.choices[f.correctIndex]}` === o.check[0].answer));
});

console.log('\n3. Interactions');
await test('8. Multiple choice — correct answer solves the step', () => {
  const i = step('variable').interaction;
  assert(E.checkChoice(i, 0));
  let st = E.playerReducer(E.initialPlayerState(), { type: 'answer', stepId: 'variable', correct: true });
  assert(st.results.variable.solved && st.results.variable.attempts === 1 && E.canContinue(lesson, st, lesson.steps.findIndex((x) => x.id === 'variable')));
});
await test('9. Multiple choice — wrong answer does not solve, does not punish, blocks continue', () => {
  assert(!E.checkChoice(step('variable').interaction, 1));
  const st = E.playerReducer(E.initialPlayerState(), { type: 'answer', stepId: 'variable', correct: false });
  assert(!st.results.variable.solved && !E.canContinue(lesson, st, lesson.steps.findIndex((x) => x.id === 'variable')));
});
await test('10. Hint appears automatically after a wrong answer (and on request)', () => {
  let st = E.playerReducer(E.initialPlayerState(), { type: 'answer', stepId: 'variable', correct: false });
  assert(st.results.variable.hintShown);
  st = E.playerReducer(E.initialPlayerState(), { type: 'hint', stepId: 'try-1' });
  assert(st.results['try-1'].hintShown);
  for (const s of lesson.steps) if (s.interaction && s.interaction.kind !== 'self') assert(s.interaction.hint.length > 5, s.id);
});
await test('11. Typed answer: tolerant of spacing, "x =", full-width digits, fractions; rejects wrong', () => {
  const i = step('try-1').interaction;
  for (const a of ['5', ' x = 5 ', '５', '5.0', '10/2', 'X=5']) assert(E.checkTyped(i, a), a);
  for (const a of ['', '4', '-5', 'five', '5x']) assert(!E.checkTyped(i, a), a);
  assert(E.checkTyped(step('try-2').interaction, '16'));
});
await test('12. Retry: wrong then right counts attempts and solves; reveal lets the learner go on but is remembered', () => {
  let st = E.initialPlayerState();
  st = E.playerReducer(st, { type: 'answer', stepId: 'try-1', correct: false });
  st = E.playerReducer(st, { type: 'answer', stepId: 'try-1', correct: true });
  assert.strictEqual(st.results['try-1'].attempts, 2);
  assert(st.results['try-1'].solved);
  st = E.playerReducer(st, { type: 'answer', stepId: 'try-1', correct: false });
  assert(st.results['try-1'].solved, 'a solved step stays solved');
  let r = E.playerReducer(E.initialPlayerState(), { type: 'reveal', stepId: 'try-2' });
  assert(r.results['try-2'].revealed && E.canContinue(lesson, r, lesson.steps.findIndex((s) => s.id === 'try-2')));
});
await test('Order interaction: scrambled start is never already solved; correct order checks true', () => {
  const i = step('order-brackets').interaction;
  assert(!E.checkOrder(i, E.scrambled(i.items)));
  assert(E.checkOrder(i, i.items));
});

console.log('\n4. Check, completion, integration');
const answerAll = (wrongIds = []) => {
  let st = E.initialPlayerState();
  for (const f of lesson.finalCheck) st = E.playerReducer(st, { type: 'final', itemId: f.id, choice: wrongIds.includes(f.id) ? (f.correctIndex + 1) % f.choices.length : f.correctIndex });
  return E.playerReducer(st, { type: 'finish' });
};
await test('13. Completion: all right → understood + can-do; nothing to review', () => {
  const s = E.summarize(lesson, answerAll());
  assert.strictEqual(s.score, 100);
  assert(s.understood.length > 0 && s.canDo.length > 0 && s.confused.length === 0 && s.review.length === 0);
  const done = read('src/components/learning/UnderstandingCheck.tsx');
  for (const x of ['เรียบร้อย', 'คุณผ่านภารกิจ', '✓ สิ่งที่เข้าใจ', '✓ สิ่งที่ทำได้', '△ ควรทบทวน', 'ทบทวนจุดที่ยังไม่เข้าใจ']) assert(done.includes(x), x);
});
await test('14. Final check: a wrong answer → that skill is "ยังสับสน", review lists it, no mastery claimed', () => {
  const s = E.summarize(lesson, answerAll(['fc-2']));
  assert.strictEqual(s.score, 75);
  assert(s.confused.includes('ตรวจคำตอบ'));
  assert(s.review.some((x) => x.includes('ตรวจคำตอบ')));
  assert.deepStrictEqual(s.canDo, [], 'outcomes are not claimed without a full check');
  // Revealing a practice step also marks its skill as shaky
  let st = E.playerReducer(answerAll(), { type: 'reveal', stepId: 'spot-mistake' });
  assert(E.summarize(lesson, st).confused.includes('ตรวจคำตอบ'));
  // Opening the lesson with nothing answered is 0%, never "understood"
  const none = E.summarize(lesson, E.initialPlayerState());
  assert(none.score === 0 && none.understood.length === 0);
});
await test('Recheck after review keeps step progress but clears the check', () => {
  let st = E.playerReducer(answerAll(['fc-1']), { type: 'answer', stepId: 'variable', correct: true });
  st = E.playerReducer(st, { type: 'recheck' });
  assert(!st.finished && Object.keys(st.finalAnswers).length === 0 && st.results.variable.solved);
});

const s0 = useStore.getState();
const studyLesson = s0.lessons.find((l) => l.title.includes('สมการ'));
await test('15. Selected mode is persisted on the study session', () => {
  useStore.getState().startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: 'math-alg-linear-eq', plannedMinutes: 30 });
  useStore.getState().setLearningMode('v2u');
  assert.strictEqual(useStore.getState().activeLearningSession.learningMode, 'v2u');
  useStore.getState().recordUnderstandingCheck({ score: 75, understood: ['แก้สมการเชิงเส้น'], confused: ['ตรวจคำตอบ'] });
  useStore.getState().updateLearningSessionDraft({ stillUnclearNotes: E.unclearNoteFrom({ confused: ['ตรวจคำตอบ'] }) });
  assert.strictEqual(useStore.getState().activeLearningSession.understandingCheck.score, 75);
});
await test('16–17. Mastery + review: finishing records quiz score, credits ONLY this curriculum lesson, queues a review', () => {
  useStore.getState().finishLearningSession(30, 75, 'Medium');
  const st = useStore.getState();
  const h = st.learningSessionsHistory[0];
  assert(h.learningMode === 'v2u' && h.understandingCheck.confused[0] === 'ตรวจคำตอบ');
  const l = st.lessons.find((x) => x.id === studyLesson.id);
  assert.strictEqual(l.quizScore, 75);
  assert.deepStrictEqual(l.completedCurriculumLessonIds, ['math-alg-linear-eq']);
  const rv = st.reviewQueue.find((r) => r.lessonId === studyLesson.id && r.status !== 'completed');
  assert(rv && rv.reason === 'unclear_topic', 'confused skills go to the review queue');
  assert(PAGE.includes('?finish=1') && STUDY.includes("searchParams.get('finish') === '1'"), 'lesson page hands off to the same finish flow');
  assert(read('src/components/study/PostLearningFlowModal.tsx').includes('initialQuizScore'));
});
await test('18. Next step follows the check: confused skill → strengthen it; full understanding → move on', () => {
  const st = useStore.getState();
  const recs = (lessons) => lessons.map((l) => ({ lessonId: l.id, subjectId: l.subjectId, totalStudyMinutes: l.totalStudyMinutes || 0, studyCount: l.studyCount || 0, completionStatus: l.status, confidence: l.confidence || 'Low', mastery: 'Novice', masteryScore: l.masteryScore ?? 0, quizBestScore: l.quizScore, reviewCount: 0, nextReviewAt: l.nextReviewAt }));
  const profile = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 };
  const next = (lessons) => NS.getNextStep({ lessons, sessions: st.sessions, learningSessionsHistory: st.learningSessionsHistory, referenceDate: new Date(), route: { profile, records: recs(lessons), budget: 30 } });
  const confused = next(st.lessons);
  assert.strictEqual(confused.kind, 'strengthen', `${confused.kind} ${confused.rule}`);
  assert(confused.todayAction.includes('ตรวจคำตอบ'), confused.todayAction);
  const clear = st.lessons.map((l) => (l.id === studyLesson.id ? { ...l, quizScore: 100, quizAttempts: [{ id: 'q', timestamp: new Date().toISOString(), score: 100 }], stillUnclearNotes: '', masteryScore: 4 } : l));
  const moved = next(clear);
  assert(moved.curriculum?.lessonId !== 'math-alg-linear-eq', `should move on, got ${moved.kind} ${moved.curriculum?.lessonId}`);
  assert(!read('src/interactive/engine.ts').includes('useStore'), 'engine is pure — no second progress store');
});
await test('19. Old study history still imports; new fields survive a backup round-trip', () => {
  const old = I.migrateToLatestSchema({ schemaVersion: 4, lessons: s0.lessons, learningSessionsHistory: [{ sessionId: 's', lessonId: studyLesson.id, startedAt: '2026-09-01T00:00:00Z', status: 'completed', accumulatedSeconds: 60, actualSeconds: 60, lastHeartbeatAt: '2026-09-01T00:00:00Z' }] });
  assert.strictEqual(old.payload.learningSessionsHistory[0].learningMode, undefined);
  const now = I.migrateToLatestSchema({ schemaVersion: 5, lessons: s0.lessons, learningSessionsHistory: useStore.getState().learningSessionsHistory });
  const h = now.payload.learningSessionsHistory[0];
  assert(h.learningMode === 'v2u' && h.understandingCheck.score === 75);
  const bad = I.migrateToLatestSchema({ schemaVersion: 5, lessons: [], learningSessionsHistory: [{ sessionId: 'x', lessonId: 'y', learningMode: 'tiktok' }] });
  assert.strictEqual(bad.payload.learningSessionsHistory[0].learningMode, undefined, 'unknown modes are dropped');
});

console.log('\n5. Layout');
await test('20. Mobile: one primary action at a time; touch targets ≥44px; no floating CTA once a mode is chosen', () => {
  const q = read('src/components/learning/Questions.tsx');
  assert(q.includes('min-h-[52px]') && !/min-h-\[(3\d|4[0-3])px\]/.test(q));
  assert(PAGE.includes("className={mode ? '' : 'fixed inset-x-0"));
});
await test('21. Desktop: player uses width (container query) with a progress/context side panel', () => {
  const p = read('src/components/learning/InteractivePlayer.tsx');
  assert(p.includes('@container') && p.includes('@3xl:grid-cols-[minmax(0,1fr)_240px]') && p.includes('aria-label="ภารกิจนี้"'));
  assert(LL.includes('md:grid-cols-3'), 'mode cards side by side from tablet up');
});
await test('22. No horizontal overflow risks: long Thai text wraps (break-words) in all learning components', () => {
  for (const f of ['Questions.tsx', 'InteractivePlayer.tsx', 'UnderstandingCheck.tsx', 'ReadingExperience.tsx', 'LessonLearning.tsx']) {
    assert(read(`src/components/learning/${f}`).includes('break-words'), f);
  }
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
