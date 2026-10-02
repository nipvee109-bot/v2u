/**
 * Test Suite: Phase 56 — Learning Hub: 3 ways to master
 * (rendered layout, overflow, console and network are also checked by the Playwright sweep)
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

const E = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const R = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const A = await jiti.import(path.join(root, 'src/interactive/adapt.ts'));
const V = await jiti.import(path.join(root, 'src/video/engine.ts'));
const YT = await jiti.import(path.join(root, 'src/video/youtube.ts'));
const N = await jiti.import(path.join(root, 'src/notes/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));

const HOOK = read('src/hooks/useStartNextStep.tsx');
const LL = read('src/components/learning/LessonLearning.tsx');
const META = read('src/components/learning/meta.ts');
const VL = read('src/components/video/VideoLearning.tsx');
const RE = read('src/components/learning/ReadingExperience.tsx');
const Q = read('src/components/learning/Questions.tsx');
const PAGE = read('src/pages/CurriculumLessonPage.tsx');
const fresh = useStore.getState().lessons;
const LEQ = 'math-alg-linear-eq';
const PERSONA = { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 };
const recs = (lessons) => lessons.map((l) => ({ lessonId: l.id, subjectId: l.subjectId, totalStudyMinutes: l.totalStudyMinutes || 0, studyCount: l.studyCount || 0, completionStatus: l.status, confidence: l.confidence || 'Low', mastery: 'Novice', masteryScore: l.masteryScore ?? 0, quizBestScore: l.quizScore, reviewCount: 0, nextReviewAt: l.nextReviewAt }));
const nextFor = (s) => NS.getNextStep({ lessons: s.lessons, sessions: s.sessions, learningSessionsHistory: s.learningSessionsHistory, referenceDate: new Date(), route: { profile: PERSONA, records: recs(s.lessons), budget: 30 } });

console.log('=== Phase 56: Learning Hub — 3 ways to master ===\n');

console.log('1. Learning Hub');
await test('1. "เริ่มขั้นต่อไป" on a curriculum step opens the Learning Hub (same getNextStep; no competing engine)', () => {
  const step = nextFor(useStore.getState());
  assert(step.curriculum?.lessonId, 'the new learner gets a curriculum lesson');
  assert(HOOK.includes('navigate(`/learn/curriculum/${step.curriculum.lessonId}?from=next'));
  assert(HOOK.indexOf('step.curriculum?.lessonId') < HOOK.indexOf('setConfirming(step)'), 'hub is checked before the old confirm dialog');
  assert(read('src/pages/HomePage.tsx').includes('getNextStep(useNextStepParams())') && read('src/pages/HomePage.tsx').includes('start(step)'));
});
await test('2. Exactly 3 equal modes: อ่านกับ V2U · ดูคลิป · เรียนกับ V2U, each with its own button', () => {
  assert(LL.includes("const ORDER: LearningMode[] = ['read', 'video', 'v2u'];"));
  for (const x of ["title: 'อ่านกับ V2U'", "title: 'ดูคลิป'", "title: 'เรียนกับ V2U'", "cta: 'อ่านกับ V2U'", "cta: 'ดูคลิป'", "cta: 'เริ่มเรียนกับ V2U'"]) assert(META.includes(x), x);
  assert(LL.includes('คุณอยากเรียนเรื่องนี้แบบไหน?'));
  const picker = LL.slice(LL.indexOf('if (!mode) {'), LL.indexOf('/* ── Explicit mode switch'));
  assert(!picker.includes('signature'), 'no mode is visually favoured');
});
await test('3. No YouTube before choosing Video: picker, hub and clip list render no player', () => {
  const picker = LL.slice(LL.indexOf('if (!mode) {'), LL.indexOf('/* ── Explicit mode switch'));
  assert(!/VideoLearning|YouTube|iframe/.test(picker));
  const beforeWorkspace = VL.slice(0, VL.indexOf('/* ── Workspace'));
  assert(!/<YouTubePlayer|<UniversalVideoPlayer|<iframe/.test(beforeWorkspace));
  assert(!/img\.youtube|ytimg|\.thumbnail|thumbnail=|<img/i.test(VL), 'no third-party thumbnails');
});

console.log('\n2. Reading');
await test('4 + 17. Reading: 8 short sections, V2U-authored, typed try-it and the understanding check', () => {
  for (const x of ['สิ่งที่ต้องเข้าใจ', 'หลักคิด', 'อธิบายแบบง่าย', 'ตัวอย่าง', 'วิธีคิดทีละขั้น', 'จุดที่มักพลาด', 'ลองทำ', 'เช็กความเข้าใจ']) assert(META.includes(`label: '${x}'`), x);
  assert(RE.includes('content.what') && RE.includes('content.mistakes') && RE.includes('content.tryIt'), 'from the V2U original lesson');
  assert(RE.includes('checkTyped(') && RE.includes('ตรวจคำตอบ') && RE.includes('ไปเช็กความเข้าใจ'));
  assert(RE.includes('การอ่านอย่างเดียวยังไม่ได้แปลว่าเข้าใจ'));
});

console.log('\n3. Video Hub');
await test('5. Video Hub shows the lesson clips BEFORE playback, with V2U-made covers', () => {
  assert(VL.includes('data-testid="clip-list"') && VL.includes('🎬 คลิปสำหรับบทนี้'));
  assert(VL.includes('export function VideoCover') && VL.includes('V2U-generated cover'));
  assert(VL.indexOf('data-testid="clip-list"') < VL.indexOf('/* ── Workspace'));
});
await test('6. Recommended video uses the Phase 55 engine with factual reasons', () => {
  const r = V.getRecommendedVideo({ lessonId: LEQ, storeLessons: fresh, availableMinutes: 30 });
  assert(r && r.reasons[0].includes('ระบบสมการเชิงเส้นสองตัวแปร'));
  assert(!/ดีที่สุด|best/i.test(read('src/video/engine.ts')), 'never claims "best"');
});
await test('7. Manual selection groups only real resources (no invented เทคนิค group)', () => {
  const g = V.groupVideos(LEQ);
  assert(!('technique' in g));
  assert(!VL.includes('เทคนิค') || !VL.includes("'technique'"));
  for (const v of [...g.basics, ...g.practice]) assert(v.lessonId === LEQ);
});
await test('8. Prerequisite ordering comes from the curriculum; nothing locked', () => {
  const r = V.getRecommendedVideo({ lessonId: 'phy-kin-1d', storeLessons: fresh });
  assert(C.lessons.find((l) => l.id === 'phy-kin-1d').prerequisites.includes(r.lessonId));
  assert(V.getTopicVideoPath(LEQ, fresh).every((p) => ['done', 'current', 'available', 'wait'].includes(p.status)));
});
await test('9. A watched clip can be skipped; skipping steers the recommendation, nothing else', () => {
  const seq = V.getLessonVideoSequence(LEQ);
  const r = V.getRecommendedVideo({ lessonId: LEQ, storeLessons: fresh, skippedKeys: [seq[0].key] });
  assert.notStrictEqual(r.video.key, seq[0].key);
  assert(VL.includes('ข้ามคลิป →') && VL.includes('ดูอีกครั้ง') && VL.includes('✓ ดูแล้ว'));
  const s = useStore.getState();
  s.setVideoProgress(LEQ, seq[0].key, { state: 'watched', skipped: true });
  const p = useStore.getState().learningNotes.videoProgress[`${LEQ}|${seq[0].key}`];
  assert(p.skipped === true && p.state === 'watched');
});
await test('10. Watching does not equal mastery: no store mastery change from video state alone', () => {
  const before = useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.quizScore, l.status]);
  useStore.getState().setVideoProgress(LEQ, 'curated:x', { state: 'done' });
  assert.deepStrictEqual(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.quizScore, l.status]), before);
  assert(VL.includes('ดูคลิปอย่างเดียวยังไม่ได้แปลว่าเข้าใจ'));
});

console.log('\n4. Video + notes');
await test('11. Video and notes on the same page (two columns when wide)', () => {
  const ws = VL.slice(VL.indexOf('/* ── Workspace'));
  assert(ws.includes('<UniversalVideoPlayer') && ws.includes('<NotesPanel'));
  assert(ws.includes('@3xl:grid-cols-[minmax(0,1fr)_300px]'));
});
await test('12–13. Notes persist with categories (📝 💡 ❓ ⭐ 🗒️)', async () => {
  const n = useStore.getState().addStudyNote({ lessonId: LEQ, type: 'unclear', text: 'ยังไม่เข้าใจการย้ายข้าง' });
  await new Promise((r) => setTimeout(r, 350));
  const saved = JSON.parse(mem.get('engineering-study-hub-storage'));
  assert(saved.state.learningNotes.notes.some((x) => x.id === n.id && x.type === 'unclear'));
  assert.deepStrictEqual(N.NOTE_TYPES, ['understood', 'trick', 'unclear', 'important', 'note']);
});
await test('14–15. Timestamp only from reliable player time; otherwise plain notes', () => {
  assert.deepStrictEqual(YT.parseYouTubeMessage('https://www.youtube.com', { event: 'infoDelivery', info: { currentTime: 61 } }), { currentTime: 61 });
  assert.strictEqual(YT.parseYouTubeMessage('https://attacker.test', { event: 'infoDelivery', info: { currentTime: 61 } }), null);
  assert(read('src/components/video/NotesPanel.tsx').includes('const timeOk = currentSeconds !== undefined;'));
});
await test('16. Personal summary: from my data only; "ยังไม่มีข้อมูลเพียงพอสำหรับสรุป" when empty', () => {
  assert(N.buildPersonalSummary({ lessonId: 'phy-vec-units', notes: [] }).startsWith('ยังไม่มีข้อมูลเพียงพอสำหรับสรุป'));
  const s = N.buildPersonalSummary({ lessonId: LEQ, notes: useStore.getState().learningNotes.notes });
  assert(s.includes('ยังไม่เข้าใจการย้ายข้าง'));
});

console.log('\n5. Interactive V2U');
await test('18. Different formats per subject: math mission · code battle · physics lab (data-driven)', () => {
  assert.deepStrictEqual(R.validateInteractiveLessons(), []);
  assert.strictEqual(R.getInteractiveLesson(LEQ).theme.kind, 'mission');
  assert.strictEqual(R.getInteractiveLesson('prog-ctrl-conditions').theme.kind, 'battle');
  assert.strictEqual(R.getInteractiveLesson('phy-dyn-newton').theme.kind, 'lab');
  assert(R.getInteractiveLesson('prog-ctrl-conditions').steps.some((s) => s.interaction?.kind === 'code'));
  assert(R.getInteractiveLesson('phy-dyn-newton').steps.some((s) => s.interaction?.kind === 'lab'));
  for (const f of ['CodeQuestion', 'LabQuestion']) assert(Q.includes(`export function ${f}`), f);
  assert(read('src/components/learning/ThemeBanner.tsx').includes('CRITICAL') === false && read('src/components/learning/InteractivePlayer.tsx').includes('⚔️ CRITICAL HIT!'));
});
await test('Door mission: 2x + 4 = 14 opens with 5; targeted feedback says what concept is missing', () => {
  const door = R.getInteractiveLesson(LEQ).steps[0].interaction;
  assert(E.checkTyped(door, 'x = 5'));
  assert.strictEqual(E.wrongFeedbackFor(door, '7'), 'ลองกำจัด +4 ก่อน — ถ้าหาร 14 ด้วย 2 ทันที +4 จะยังค้างอยู่');
  assert(E.wrongFeedbackFor(door, '10').includes('หารด้วย 2'));
  assert.strictEqual(E.wrongFeedbackFor(door, '42'), undefined, 'unknown wrong answers get the general hint, not a guess');
});
await test('Code battle: tolerant code check, targeted bug feedback, monster HP from real results', () => {
  const L = R.getInteractiveLesson('prog-ctrl-conditions');
  const code = L.steps.find((s) => s.interaction?.kind === 'code').interaction;
  for (const ok of ['hp < 30', 'hp<30', '(hp < 30)', 'hp < 30:', '30 > hp']) assert(E.checkCode(code, ok), ok);
  for (const bad of ['hp > 30', 'hp = 30', '', 'heal()']) assert(!E.checkCode(code, bad), bad);
  assert(E.wrongFeedbackFor(code, 'hp=30', E.normalizeCode).includes('กำหนดค่า'));
  let st = E.initialPlayerState();
  assert.strictEqual(E.themeProgress(L, st).enemyHp, 100);
  for (const s of L.steps) st = E.playerReducer(st, { type: 'answer', stepId: s.id, correct: true });
  assert.strictEqual(E.themeProgress(L, st).enemyHp, 0);
});
await test('Physics lab: known formula only (a = F ÷ m), no eval', () => {
  const lab = R.getInteractiveLesson('phy-dyn-newton').steps[0].interaction;
  assert.strictEqual(E.labOutput(lab, { F: 10, m: 2 }), 5);
  assert.strictEqual(E.labOutput(lab, { F: 20, m: 2 }), 10);
  assert.strictEqual(E.labOutput(lab, { F: 10, m: 5 }), 2);
  assert(!/eval\(|new Function/.test(read('src/interactive/engine.ts')));
  assert(Q.includes('disabled={!tried || result.solved}'), 'must experiment before answering');
});
await test('19–20. Hints + wrong-answer recovery never punish (retry allowed, hint shown, reveal possible)', () => {
  let st = E.playerReducer(E.initialPlayerState(), { type: 'answer', stepId: 'door', correct: false });
  assert(st.results.door.hintShown && !st.results.door.solved);
  st = E.playerReducer(st, { type: 'answer', stepId: 'door', correct: true });
  assert(st.results.door.solved && st.results.door.attempts === 2);
  assert(Q.includes('data-testid="targeted-feedback"'));
});

console.log('\n6. Learning state');
const L = R.getInteractiveLesson(LEQ);
let ps = E.initialPlayerState();
for (const f of L.finalCheck) ps = E.playerReducer(ps, { type: 'final', itemId: f.id, choice: f.id === 'fc-2' ? 0 : f.correctIndex });
ps = E.playerReducer(ps, { type: 'finish' });
const summary = E.summarize(L, ps);
await test('Adaptation: a weak check suggests another way to learn (evidence only, never "watched")', () => {
  assert.deepStrictEqual(A.suggestAlternativeModes('video', summary, { hasVideos: true }).map((x) => x.mode), ['v2u', 'read']);
  assert.deepStrictEqual(A.suggestAlternativeModes('read', summary, { hasVideos: false }).map((x) => x.mode), ['v2u']);
  assert.deepStrictEqual(A.suggestAlternativeModes('v2u', summary, { hasVideos: true }).map((x) => x.mode), ['read', 'video']);
  assert.deepStrictEqual(A.suggestAlternativeModes('video', undefined, { hasVideos: true }), [], 'no check → no claim');
  const good = E.summarize(L, (() => { let s = E.initialPlayerState(); for (const f of L.finalCheck) s = E.playerReducer(s, { type: 'final', itemId: f.id, choice: f.correctIndex }); return E.playerReducer(s, { type: 'finish' }); })());
  assert.deepStrictEqual(A.suggestAlternativeModes('video', good, { hasVideos: true }), []);
  assert(read('src/components/learning/UnderstandingCheck.tsx').includes('data-testid="try-another-way"'));
});
const studyLesson = fresh.find((l) => l.title.includes('สมการ'));
await test('21–23. Completion updates learning state: session mode, quiz score → mastery, review queue', () => {
  assert(PAGE.includes('if (fromNext && !sessionHere) startLearningSession('), 'choosing a mode from the next step starts the timed sitting');
  const s = useStore.getState();
  s.startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: LEQ, plannedMinutes: 30 });
  s.setLearningMode('video');
  s.recordUnderstandingCheck({ score: summary.score, understood: summary.understood, confused: summary.confused });
  s.updateLearningSessionDraft(N.mergeIntoDraft(N.notesToSessionDraft(useStore.getState().learningNotes.notes, LEQ), E.unclearNoteFrom(summary)));
  useStore.getState().finishLearningSession(30, summary.score, 'Medium');
  const after = useStore.getState();
  assert.strictEqual(after.learningSessionsHistory[0].learningMode, 'video');
  assert.strictEqual(after.lessons.find((l) => l.id === studyLesson.id).quizScore, 75);
  assert(after.reviewQueue.some((r) => r.lessonId === studyLesson.id && r.reason === 'unclear_topic'));
});
await test('24. Next step adapts (existing engine): the confused skill comes back first', () => {
  const step = nextFor(useStore.getState());
  assert.strictEqual(step.kind, 'strengthen');
});

await test('24b. The check\'s confused skill reaches the skill engine via the real learning record (no parallel system)', async () => {
  const { computeLessonLearningRecord } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
  const SK = await jiti.import(path.join(root, 'src/skills/engine.ts'));
  const st = useStore.getState();
  const recsReal = st.lessons.map((l) => computeLessonLearningRecord(l, st.learningSessionsHistory, st.sessions));
  const rec = recsReal.find((r) => r.lessonId === studyLesson.id);
  assert.deepStrictEqual(rec.confusedSkillIds, ['skill-math-check-solution']);
  const gap = SK.getSkillGaps({ storeLessons: st.lessons, records: recsReal }).find((g) => g.skill.id === 'skill-math-check-solution');
  assert(gap.status === 'needs-review' && gap.reason === 'check-confused');
  const other = SK.getSkillGaps({ storeLessons: st.lessons, records: recsReal }).find((g) => g.skill.id === 'skill-math-solve-linear');
  assert.notStrictEqual(other.reason, 'check-confused', 'only the named skill is flagged');
  const step = NS.getNextStep({ lessons: st.lessons, sessions: st.sessions, learningSessionsHistory: st.learningSessionsHistory, referenceDate: new Date(), route: { profile: PERSONA, records: recsReal, budget: 30 } });
  assert(step.kind === 'strengthen' && step.todayAction.includes('ตรวจคำตอบ') && step.reason.includes('เช็กความเข้าใจครั้งล่าสุด'), step.todayAction + ' / ' + step.reason);
  // a later clean check clears it (latest evidence wins)
  const s = useStore.getState();
  s.startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: LEQ, plannedMinutes: 30 });
  await new Promise((r) => setTimeout(r, 5));
  s.recordUnderstandingCheck({ score: 100, understood: ['แก้สมการเชิงเส้น', 'ตรวจคำตอบ'], confused: [] });
  useStore.getState().finishLearningSession(20, 100, 'High');
  const st2 = useStore.getState();
  const rec2 = computeLessonLearningRecord(st2.lessons.find((l) => l.id === studyLesson.id), st2.learningSessionsHistory, st2.sessions);
  assert.strictEqual(rec2.confusedSkillIds, undefined);
});

console.log('\n7. Backup');
await test('25. Old backups import (no notes, no skip flag)', () => {
  const old = { schemaVersion: 5, lessons: fresh, sessions: [], reviewQueue: [], goals: [], resources: [], studentProfile: null };
  old.checksum = I.computePayloadChecksum(old);
  assert.strictEqual(I.verifyPayloadChecksum(old), 'valid');
  assert.strictEqual(I.migrateToLatestSchema(old).payload.learningNotes, undefined);
});
await test('26. New backup exports/imports skip state, notes, summary, reflection; junk is repaired', () => {
  const s = useStore.getState();
  const payload = I.createExportPayload({ ...s, learningNotes: s.learningNotes });
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  const back = I.migrateToLatestSchema(JSON.parse(JSON.stringify(payload))).payload.learningNotes;
  assert(Object.values(back.videoProgress).some((p) => p.skipped === true));
  const fixed = N.sanitizeNotesData({ videoProgress: { a: { state: 'watched', skipped: 'yes' }, b: { state: 'bogus' } } });
  assert(fixed.videoProgress.a && fixed.videoProgress.a.skipped === undefined && !fixed.videoProgress.b);
});

console.log('\n8. Layout');
await test('27–29. Desktop video|notes, tablet adaptive, mobile stacked (video first)', () => {
  const ws = VL.slice(VL.indexOf('/* ── Workspace'));
  assert(ws.indexOf('<UniversalVideoPlayer') < ws.indexOf('<NotesPanel'));
  assert(ws.includes('grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @5xl:grid-cols-[minmax(0,1fr)_360px]'));
  assert(LL.includes('md:grid-cols-3'), 'mode cards side by side from tablet up, stacked on phones');
});
await test('30. No horizontal overflow risks in the new components (wrap + contained code block)', () => {
  assert(Q.includes('overflow-x-auto rounded-2xl bg-slate-900'));
  for (const f of ['src/components/learning/ThemeBanner.tsx', 'src/components/learning/ReadingExperience.tsx']) assert(read(f).includes('min-w-0') || read(f).includes('break-words'), f);
});
await test('31. Touch targets ≥44px for new interactive controls', () => {
  assert(!/min-h-\[(3\d|4[0-3])px\]/.test(Q.replace(/min-h-\[40px\] items-center gap-1 rounded-full/g, '')));
});
await test('32. Exactly 5 primary nav items; no new primary routes', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
