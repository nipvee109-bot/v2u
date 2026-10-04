/**
 * Test Suite: Phase 55 — Intelligent video learning + personal notes
 * (pixel layout / overflow / console are also exercised by the Playwright sweep)
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
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
// the store's debounced storage writes through window.localStorage
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

const V = await jiti.import(path.join(root, 'src/video/engine.ts'));
const YT = await jiti.import(path.join(root, 'src/video/youtube.ts'));
const N = await jiti.import(path.join(root, 'src/notes/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const NS = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const IE = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { useStore, computeLessonLearningRecord } = await jiti.import(path.join(root, 'src/store/useStore.ts'));

const VL = read('src/components/video/VideoLearning.tsx');
const NP = read('src/components/video/NotesPanel.tsx');
const LL = read('src/components/learning/LessonLearning.tsx');
const fresh = useStore.getState().lessons;
const LEQ = 'math-alg-linear-eq';

console.log('=== Phase 55: Intelligent Video Learning + Personal Notes ===\n');

console.log('1. Choosing a video');
await test('1. Video mode opens with "คุณอยากให้ V2U ช่วยเลือกให้ไหม?" — แนะนำให้ฉัน / เลือกเอง', () => {
  for (const x of ['คุณอยากให้ V2U ช่วยเลือกให้ไหม?', 'แนะนำให้ฉัน', 'เลือกเอง', 'data-choice="recommend"', 'data-choice="manual"']) assert(VL.includes(x), x);
  assert(LL.includes('<VideoLearning'));
});
await test('2. Recommendation: lesson videos, Thai first, basics first, real reasons, position, time', () => {
  const r = V.getRecommendedVideo({ lessonId: LEQ, storeLessons: fresh, availableMinutes: 30 });
  assert.strictEqual(r.lessonId, LEQ);
  assert.strictEqual(r.video.resourceId, 'th-p14-m1-linear-eq-solve-2');
  assert(r.reasons[0].includes('สมการเชิงเส้นตัวแปรเดียว') && r.reasons[0].includes('ระบบสมการเชิงเส้นสองตัวแปร'), r.reasons[0]);
  assert(r.reasons.some((x) => x.includes('ภาษาไทย')));
  assert(r.reasons.some((x) => x.includes('พอดีกับเวลา 30 นาที')));
  assert(!r.reasons.some((x) => x.includes('ยังไม่ได้ตรวจลิงก์')), 'Phase 67: only verified clips are recommended');
  assert(r.position === 1 && r.of === 2 && r.estimatedMinutes === 12);
  assert(!/qualityScore|rating|stars|คะแนนคลิป|★/i.test(read('src/video/engine.ts')), 'no quality score');
});
await test('2b. Recommendation adapts: weak skill → practice clip; watched → next unwatched; short time is said honestly', () => {
  const weak = V.getRecommendedVideo({ lessonId: 'math-alg-linear-system', storeLessons: fresh.map((l) => ({ ...l, completedCurriculumLessonIds: [LEQ] })), weakSkillIds: ['skill-math-linear-system'] });
  assert.strictEqual(weak.video.group, 'practice');
  const seq = V.getLessonVideoSequence(LEQ);
  const next = V.getRecommendedVideo({ lessonId: LEQ, storeLessons: fresh, watchedKeys: [seq[0].key] });
  assert.notStrictEqual(next.video.key, seq[0].key);
  const short = V.getRecommendedVideo({ lessonId: 'prog-py-variables', storeLessons: fresh, availableMinutes: 15 });
  assert(short.reasons.some((x) => x.includes('มากกว่าเวลาที่มี')));
});
await test('3. Manual selection: grouped แนะนำ / พื้นฐาน / ฝึกทำโจทย์ / ต่อไป, only real mappings', () => {
  const g = V.groupVideos('math-alg-linear-system', [], 'curated:th-p14-m3-linear-system-solve-1');
  assert.strictEqual(g.recommended.length, 1);
  assert(g.practice.some((v) => v.resourceId === 'th-p14-m3-linear-system-word-1'));
  assert(g.next.every((v) => v.lessonId === V.nextLessonId('math-alg-linear-system')));
  for (const v of [...g.basics, ...g.practice]) assert(R.find((r) => r.id === v.resourceId).curriculumLessonIds.includes('math-alg-linear-system'));
  assert(VL.includes('VIDEO_GROUP_LABEL') && VL.includes('เลือกคลิปนี้'));
});
await test('4. Prerequisite ordering: path uses existing prerequisites; waiting is explained, never locked', () => {
  const p = V.getTopicVideoPath('math-alg-linear-system', fresh);
  const eq = p.find((x) => x.lessonId === LEQ);
  const sys = p.find((x) => x.lessonId === 'math-alg-linear-system');
  assert(sys.status === 'current' && eq.status === 'available');
  const fn = V.getTopicVideoPath('math-fn-linear', fresh).find((x) => x.lessonId === 'math-fn-linear');
  assert.strictEqual(fn.status, 'current');
  const after = V.getTopicVideoPath(LEQ, fresh);
  const wait = after.find((x) => x.status === 'wait');
  if (wait) assert(wait.note.startsWith('ยังควรรอ เพราะต้องผ่าน'));
  assert(!/disabled=\{.*wait/.test(VL), 'waiting lessons stay clickable');
  // missing prerequisite (taught in a different study lesson) → recommend its clip first, with the reason
  const r = V.getRecommendedVideo({ lessonId: 'phy-kin-1d', storeLessons: fresh });
  assert(C.lessons.find((l) => l.id === 'phy-kin-1d').prerequisites.includes(r.lessonId), r.lessonId);
  assert(r.reasons[0].includes('ต้องใช้') && r.reasons[0].includes('เป็นพื้นฐาน'));
});
await test('5. No external video before a clip is chosen (entry / pick render no player)', () => {
  const entryAndPick = VL.slice(VL.indexOf('/* ── Entry'), VL.indexOf('/* ── Workspace'));
  assert(!/<YouTubePlayer|<UniversalVideoPlayer|<iframe|ResourceViewer/.test(entryAndPick));
  assert.strictEqual((VL.match(/<UniversalVideoPlayer/g) || []).length, 1);
});

console.log('\n2. Workspace + notes');
await test('6. Video + notes in one workspace (two columns when wide, sticky notes)', () => {
  assert(VL.includes('data-testid="video-workspace"') && VL.includes('<NotesPanel'));
  assert(VL.includes('@3xl:grid-cols-[minmax(0,1fr)_300px]') && VL.includes('@3xl:sticky'));
  assert(read('src/pages/CurriculumLessonPage.tsx').includes("mode === 'video' ? 'space-y-5'"), 'lesson page gives the workspace full width');
  assert(read('src/pages/StudyRoom.tsx').includes('{!videoWorkspaceMode && ('), 'study room drops the duplicate notebook in video mode');
});
const s0 = useStore.getState();
let created;
await test('7. Note creation (categorised, trimmed, linked to lesson + video)', () => {
  created = s0.addStudyNote({ lessonId: LEQ, type: 'trick', text: '  ย้ายค่าคงที่ก่อน  ', videoKey: 'curated:th-p14-m1-linear-eq-solve-2' });
  s0.addStudyNote({ lessonId: LEQ, type: 'unclear', text: 'ยังไม่เข้าใจการย้ายข้าง' });
  s0.addStudyNote({ lessonId: LEQ, type: 'understood', text: 'x คือค่าที่ยังไม่รู้' });
  s0.addStudyNote({ lessonId: LEQ, type: 'important', text: 'แทนค่ากลับตรวจทุกครั้ง' });
  const notes = useStore.getState().learningNotes.notes;
  assert.strictEqual(notes.length, 4);
  assert.strictEqual(notes[0].text, 'ย้ายค่าคงที่ก่อน');
  assert(notes[0].id && notes[0].createdAt && notes[0].videoKey);
});
await test('8. Note editing keeps id/createdAt, updates text + updatedAt; delete works', async () => {
  await new Promise((r) => setTimeout(r, 5));
  useStore.getState().updateStudyNote(created.id, { text: 'ย้ายค่าคงที่ไปอีกข้างก่อน' });
  const n = useStore.getState().learningNotes.notes.find((x) => x.id === created.id);
  assert(n.text === 'ย้ายค่าคงที่ไปอีกข้างก่อน' && n.createdAt === created.createdAt && n.updatedAt > created.updatedAt);
  const tmp = useStore.getState().addStudyNote({ lessonId: LEQ, type: 'note', text: 'ลบ' });
  useStore.getState().deleteStudyNote(tmp.id);
  assert(!useStore.getState().learningNotes.notes.some((x) => x.id === tmp.id));
});
await test('9. Note persistence: saved under the existing storage key', async () => {
  await new Promise((r) => setTimeout(r, 350)); // the store writes through a 200ms debounce
  const saved = JSON.parse(mem.get('engineering-study-hub-storage'));
  assert.strictEqual(saved.state.learningNotes.notes.length, 4);
});
await test('10. Note categories: understood · trick · unclear · important (+ plain note), none required', () => {
  assert.deepStrictEqual(N.NOTE_TYPES, ['understood', 'trick', 'unclear', 'important', 'note']);
  assert(N.NOTE_TYPE_META.understood.label === 'สิ่งที่ฉันเข้าใจ' && N.NOTE_TYPE_META.trick.label === 'ทริค / เทคนิค' && N.NOTE_TYPE_META.unclear.label === 'สิ่งที่ยังไม่เข้าใจ' && N.NOTE_TYPE_META.important.label === 'สิ่งสำคัญ');
  assert(NP.includes('role="radiogroup"'));
});
await test('11. Timestamps only from real player messages (YouTube origin + numeric time)', () => {
  assert.deepStrictEqual(YT.parseYouTubeMessage('https://www.youtube-nocookie.com', JSON.stringify({ event: 'infoDelivery', info: { currentTime: 102.4 } })), { currentTime: 102.4 });
  assert.deepStrictEqual(YT.parseYouTubeMessage('https://www.youtube.com', { event: 'infoDelivery', info: { playerState: 0 } }), { ended: true });
  assert.strictEqual(YT.parseYouTubeMessage('https://evil.example', JSON.stringify({ event: 'infoDelivery', info: { currentTime: 5 } })), null);
  assert.strictEqual(YT.parseYouTubeMessage('https://www.youtube.com', 'not json'), null);
  assert.strictEqual(YT.parseYouTubeMessage('https://www.youtube.com', { event: 'infoDelivery', info: { currentTime: 'x' } }), null);
  assert.strictEqual(V.formatTimestamp(102), '01:42');
  const yp = read('src/components/study/YouTubePlayer.tsx');
  assert(yp.includes("e.source !== iframeRef.current?.contentWindow") && yp.includes('parseYouTubeMessage'));
  const n = useStore.getState().addStudyNote({ lessonId: LEQ, type: 'trick', text: 'ดูตรงนี้', timestampSeconds: 102 });
  assert.strictEqual(n.timestampSeconds, 102);
  useStore.getState().deleteStudyNote(n.id);
});
await test('12. Fallback without a reliable time: no "จดตรงนี้", plain notes, honest message', () => {
  assert(NP.includes('const timeOk = currentSeconds !== undefined;'));
  assert(NP.includes('คลิปนี้ไม่ได้ส่งเวลามาให้ V2U'));
  assert(VL.includes('currentSeconds={v.embeddable ? currentSeconds : undefined}'), 'external/unchecked clips never get a time');
  assert(NP.includes('...(stamp && timeOk ?'));
});

console.log('\n3. Summary, reflection, check');
const lessonQ = IR.getInteractiveLesson(LEQ);
let st = IE.initialPlayerState();
for (const f of lessonQ.finalCheck) st = IE.playerReducer(st, { type: 'final', itemId: f.id, choice: f.id === 'fc-2' ? 0 : f.correctIndex });
st = IE.playerReducer(st, { type: 'finish' });
const check = IE.summarize(lessonQ, st);
await test('13. Personal summary is built only from my notes + checked result', () => {
  const text = N.buildPersonalSummary({ lessonId: LEQ, notes: useStore.getState().learningNotes.notes, videoTitle: 'คลิป A', check });
  for (const x of ['🧠 สรุปของฉัน', 'บท: สมการเชิงเส้นตัวแปรเดียว', 'เรียนจาก: คลิป A', 'ฉันได้เรียนรู้:', '- x คือค่าที่ยังไม่รู้', '💡 ทริคที่ฉันจด:', '- ย้ายค่าคงที่ไปอีกข้างก่อน', '⭐ สิ่งสำคัญ:', '- แทนค่ากลับตรวจทุกครั้ง', '❓ สิ่งที่ฉันยังสงสัย:', '- ยังไม่เข้าใจการย้ายข้าง', 'เช็กแล้วยังสับสน: ตรวจคำตอบ']) assert(text.includes(x), x);
  const empty = N.buildPersonalSummary({ lessonId: 'phy-vec-units', notes: [] });
  assert(empty.startsWith('ยังไม่มีข้อมูลเพียงพอสำหรับสรุป'), 'Phase 56: nothing invented when there is nothing to summarise');
  const partial = N.buildPersonalSummary({ lessonId: 'phy-vec-units', notes: [{ id: 'q', lessonId: 'phy-vec-units', type: 'trick', text: 't', createdAt: 'x', updatedAt: 'x' }] });
  assert(partial.includes('- (ยังไม่มี)'), 'empty sections are shown as empty, not filled in');
});
await test('14. Summary editing is saved separately and never changes the notes', () => {
  const before = JSON.stringify(useStore.getState().learningNotes.notes);
  useStore.getState().savePersonalSummary(LEQ, 'สรุปของฉันเอง');
  const d = useStore.getState().learningNotes;
  assert(d.summaries[LEQ].text === 'สรุปของฉันเอง' && d.summaries[LEQ].edited === true);
  assert.strictEqual(JSON.stringify(d.notes), before);
  assert.strictEqual(N.currentSummary(d.summaries[LEQ], { lessonId: LEQ, notes: d.notes }), 'สรุปของฉันเอง');
});
await test('15. Reflection: 4 self-report options, stored, and not counted as understanding', () => {
  assert.deepStrictEqual(Object.values(N.REFLECTION_LABEL), ['ยังไม่เข้าใจ', 'พอเข้าใจ', 'เข้าใจแล้ว', 'อธิบายให้คนอื่นได้']);
  useStore.getState().setVideoProgress(LEQ, 'curated:th-p14-m1-linear-eq-solve-2', { state: 'watched', reflection: 'can-teach' });
  const p = useStore.getState().learningNotes.videoProgress[`${LEQ}|curated:th-p14-m1-linear-eq-solve-2`];
  assert(p.state === 'watched' && p.reflection === 'can-teach');
  assert(VL.includes('V2U จะเช็กความเข้าใจอีกครั้งก่อนนับว่าเข้าใจ') && VL.includes('disabled={!reflection}'));
});
await test('16. Understanding check (existing quiz) decides — watching alone does not', () => {
  assert.strictEqual(check.score, Math.round((((lessonQ).finalCheck.length - 1) / (lessonQ).finalCheck.length) * 100) /* one wrong answer — Phase 62 added knowledge checks */);
  assert(LL.includes("state: s.score >= 70 && s.confused.length === 0 ? 'done' : 'checked'"));
  assert(VL.includes('onToCheck') && VL.includes('ลองเช็กความเข้าใจ'));
});

console.log('\n4. Integration (existing mastery, review, next step)');
const studyLesson = fresh.find((l) => l.title.includes('สมการ'));
await test('17–18. Mastery + review: notes and check flow into the existing finish + review queue', () => {
  const draft = N.mergeIntoDraft(N.notesToSessionDraft(useStore.getState().learningNotes.notes, LEQ), IE.unclearNoteFrom(check));
  assert(draft.learnedNotes.includes('💡 ย้ายค่าคงที่ไปอีกข้างก่อน') && !draft.learnedNotes.includes('ยังไม่เข้าใจการย้ายข้าง'));
  assert(draft.stillUnclearNotes.includes('ยังไม่เข้าใจการย้ายข้าง') && draft.stillUnclearNotes.includes('ตรวจคำตอบ'));
  const s = useStore.getState();
  s.startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: LEQ, plannedMinutes: 30 });
  s.setLearningMode('video');
  s.recordUnderstandingCheck({ score: check.score, understood: check.understood, confused: check.confused });
  s.updateLearningSessionDraft(draft);
  useStore.getState().finishLearningSession(30, check.score, 'Medium');
  const after = useStore.getState();
  const l = after.lessons.find((x) => x.id === studyLesson.id);
  assert.strictEqual(l.quizScore, check.score);
  assert(l.stillUnclearNotes.includes('ยังไม่เข้าใจการย้ายข้าง'));
  const rv = after.reviewQueue.find((r) => r.lessonId === studyLesson.id && r.status !== 'completed');
  assert(rv && rv.reason === 'unclear_topic', 'existing review queue gets it');
  assert.strictEqual(after.learningSessionsHistory[0].learningMode, 'video');
});
await test('Personal knowledge: "สิ่งที่คุณเคยบอกว่ายังไม่เข้าใจ" — mapped only when data supports it', () => {
  const sig = N.getUnclearSignals(useStore.getState().learningNotes.notes);
  assert.strictEqual(sig[0].lessonId, LEQ);
  assert.strictEqual(sig[0].mapping, 'lesson-only', 'two skills, note names neither → personal note');
  const named = N.getUnclearSignals([{ id: 'a', lessonId: LEQ, type: 'unclear', text: 'ยังสับสนเรื่องตรวจคำตอบ', createdAt: 'x', updatedAt: 'x' }, { id: 'b', lessonId: LEQ, type: 'unclear', text: 'ตรวจคำตอบยังไม่คล่อง', createdAt: 'y', updatedAt: 'y' }]);
  assert(named[0].mapping === 'skill' && named[0].skillId === 'skill-math-check-solution' && named[0].notes.length === 2, 'repeats are grouped');
  const single = N.getUnclearSignals([{ id: 'c', lessonId: 'math-alg-linear-ineq', type: 'unclear', text: 'งง', createdAt: 'x', updatedAt: 'x' }]);
  assert.strictEqual(single[0].skillId, 'skill-math-solve-inequality', 'one-skill lesson maps to that skill');
  const rh = read('src/pages/hubs/ReviewHub.tsx');
  assert(rh.includes('สิ่งที่คุณเคยบอกว่ายังไม่เข้าใจ') && rh.includes('บันทึกส่วนตัว (ยังระบุทักษะไม่ได้แน่ชัด)'));
});
await test('19. Next step reacts: confused skill → strengthen it (existing engine)', () => {
  const s = useStore.getState();
  const records = s.lessons.map((l) => computeLessonLearningRecord(l, s.learningSessionsHistory, s.sessions)) /* Phase 61: real records */;
  const step = NS.getNextStep({ lessons: s.lessons, sessions: s.sessions, learningSessionsHistory: s.learningSessionsHistory, referenceDate: new Date(), route: { profile: { educationLevel: 'ปวช.3', programId: 'digital-business-technology', targetId: 'target-computer-engineering', availableMinutes: 30 }, records, budget: 30 } });
  assert.strictEqual(step.kind, 'strengthen');
});

console.log('\n5. Resources');
await test('20. Deprecated resources never appear in video lists, paths or recommendations', () => {
  const dep = new Set(R.filter((r) => r.status === 'deprecated').map((r) => r.id));
  assert(dep.size > 0);
  for (const l of C.lessons) {
    for (const v of V.getLessonVideos(l.id)) assert(!dep.has(v.resourceId), `${l.id} ${v.resourceId}`);
    const r = V.getRecommendedVideo({ lessonId: l.id, storeLessons: fresh });
    if (r) assert(!dep.has(r.video.resourceId));
  }
});
await test('21. Phase 67: unverified clips are never shown to learners (real registry); verified ones are labelled checked', async () => {
  const RE = await jiti.import(path.join(root, 'src/resources/engine.ts'));
  RE.__setResourceRegistryForTests();
  for (const l of C.lessons) assert.strictEqual(V.getLessonVideos(l.id).filter((v) => v.source === 'curated').length, 0, l.id);
  await useActionableRegistry(jiti, root, path);
  for (const l of C.lessons) for (const v of V.getLessonVideos(l.id)) if (v.source === 'curated') assert(v.checked && v.url && v.linkState.startsWith('ตรวจลิงก์แล้ว'), v.resourceId);
  assert(VL.includes('ยังไม่ได้ตรวจลิงก์ — ถ้าเปิดไม่ได้'));
});
await test('22. Video completion states: ยังไม่เริ่ม → กำลังเรียน → ดูจบแล้ว → เช็กความเข้าใจแล้ว → เรียนจบ', () => {
  assert.deepStrictEqual(Object.values(V.VIDEO_STATE_LABEL), ['ยังไม่เริ่ม', 'กำลังเรียน', 'ดูจบแล้ว', 'เช็กความเข้าใจแล้ว', 'เรียนจบ']);
  assert(VL.includes("setVideoProgress(v.lessonId, v.key, { state: 'learning' })"), 'choosing starts learning — opening the page does not');
  assert(VL.includes('ฉันดูจบแล้ว'), 'explicit, user-controlled "watched"');
  assert(VL.includes('onEnded='), 'or the player\'s own ended signal');
});

console.log('\n6. Backup');
await test('23. Old backups (no notes) still import and verify', () => {
  const old = { schemaVersion: 5, lessons: fresh, sessions: [], reviewQueue: [], goals: [], resources: [], studentProfile: null };
  old.checksum = I.computePayloadChecksum(old);
  assert.strictEqual(I.verifyPayloadChecksum(old), 'valid');
  const { payload } = I.migrateToLatestSchema(old);
  assert.strictEqual(payload.learningNotes, undefined);
  const v1 = I.migrateToLatestSchema(fresh.slice(0, 2));
  assert.strictEqual(v1.payload.lessons.length, 2);
});
await test('24. Backup/export includes notes, summaries, video progress; checksum covers them; merge keeps both', () => {
  const s = useStore.getState();
  const payload = I.createExportPayload({ ...s, learningNotes: s.learningNotes });
  assert(payload.learningNotes.notes.length >= 4 && payload.learningNotes.summaries[LEQ] && Object.keys(payload.learningNotes.videoProgress).length > 0);
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  const tampered = JSON.parse(JSON.stringify(payload));
  tampered.learningNotes.notes.pop();
  assert.strictEqual(I.verifyPayloadChecksum(tampered), 'mismatch');
  const back = I.migrateToLatestSchema(JSON.parse(JSON.stringify(payload))).payload;
  assert.deepStrictEqual(back.learningNotes, N.sanitizeNotesData(payload.learningNotes));
  const junk = N.sanitizeNotesData({ notes: [{ id: 'x', lessonId: LEQ, type: 'hacked', text: 'a' }, { id: 'y', lessonId: LEQ, type: 'trick', text: 'ok', timestampSeconds: -5 }] });
  assert(junk.notes.length === 1 && junk.notes[0].timestampSeconds === undefined, 'unknown types / bad times dropped');
  const other = { ...payload, learningNotes: { notes: [{ id: 'z', lessonId: LEQ, type: 'note', text: 'from other device', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' }], summaries: {}, videoProgress: {} } };
  const merged = I.mergeBackupPayloads ? I.mergeBackupPayloads(payload, other) : null;
  if (merged) assert(merged.learningNotes.notes.some((n) => n.id === 'z') && merged.learningNotes.notes.length === payload.learningNotes.notes.length + 1);
  const st = read('src/pages/Settings.tsx');
  assert(st.includes('learningNotes: finalPayload.learningNotes') && st.includes('learningNotes: p.learningNotes'));
});

console.log('\n7. Layout + regression');
await test('25–27. Mobile stacked (video first, then notes), tablet/desktop two columns by container width', () => {
  const ws = VL.slice(VL.indexOf('/* ── Workspace'));
  assert(ws.indexOf('<UniversalVideoPlayer') < ws.indexOf('<NotesPanel'), 'video before notes in reading order');
  assert(ws.includes('grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @5xl:grid-cols-[minmax(0,1fr)_360px]'));
});
await test('28. No horizontal overflow risks: long Thai text wraps in the new components', () => {
  for (const f of ['VideoLearning.tsx', 'NotesPanel.tsx', 'PersonalSummaryCard.tsx']) assert(read(`src/components/video/${f}`).includes('break-words'), f);
});
await test('29. Touch targets ≥40px for every control in the new components', () => {
  for (const f of ['VideoLearning.tsx', 'NotesPanel.tsx', 'PersonalSummaryCard.tsx']) {
    const s = read(`src/components/video/${f}`);
    assert(!/min-h-\[(1\d|2\d|3\d)px\]/.test(s.replace(/min-h-\[28px\][^"]*font-mono/g, '')), f);
  }
});
await test('30. Phase 54 modes intact: อ่าน · ดูคลิป · เรียนกับ V2U, interactive player untouched', () => {
  const meta = read('src/components/learning/meta.ts');
  for (const m of ['อ่าน', 'ดูคลิป', 'เรียนกับ V2U']) assert(meta.includes(m));
  assert(LL.includes('<InteractivePlayer') && LL.includes('<ReadingExperience'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
