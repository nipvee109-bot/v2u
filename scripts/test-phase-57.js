/**
 * Test Suite: Phase 57 — Embedded video learning + voice notes
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

const YT = await jiti.import(path.join(root, 'src/video/youtube.ts'));
const V = await jiti.import(path.join(root, 'src/video/engine.ts'));
const SP = await jiti.import(path.join(root, 'src/notes/speech.ts'));
const N = await jiti.import(path.join(root, 'src/notes/engine.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const VL = read('src/components/video/VideoLearning.tsx');
const NP = read('src/components/video/NotesPanel.tsx');
const HOOK = read('src/notes/useSpeechToText.ts');
const LSYS = 'math-alg-linear-system';

console.log('=== Phase 57: Embedded Video + Voice Notes ===\n');

console.log('1. Embedded video');
await test('1. YouTube URL → videoId parsing is strict', () => {
  const ok = { 'https://www.youtube.com/watch?v=vnXIPsijIRc': 'vnXIPsijIRc', 'https://youtu.be/qfBl4MLwebU': 'qfBl4MLwebU', 'https://www.youtube.com/embed/YquvV_KTbYE?start=3': 'YquvV_KTbYE', 'https://m.youtube.com/watch?v=RvWgjH99IT4&t=5': 'RvWgjH99IT4', 'https://www.youtube.com/shorts/-eXNHrJwR-A': '-eXNHrJwR-A' };
  for (const [u, id] of Object.entries(ok)) assert.strictEqual(YT.parseYouTubeVideoId(u), id, u);
  for (const bad of ['', 'not a url', 'https://proj14.ipst.ac.th/m3/x', 'https://evil.com/watch?v=vnXIPsijIRc', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=vnXIPsijIRc<script>', 'javascript:alert(1)', 'https://www.youtube.com/channel/UC-liZGyaPd97IQL7fbDDQUg', 'https://youtube.com.evil.net/watch?v=vnXIPsijIRc'])
    assert.strictEqual(YT.parseYouTubeVideoId(bad), null, bad);
  assert(read('src/components/study/YouTubePlayer.tsx').includes('const videoId = parseYouTubeVideoId(url);'));
});
await test('2. Valid YouTube → embeddable video item (real upload found by search, provenance kept)', () => {
  const seq = V.getLessonVideoSequence(LSYS);
  const v = seq.find((x) => x.resourceId === 'th-p14-m3-linear-system-solve-1');
  assert(v.embeddable && v.videoId === 'vnXIPsijIRc' && v.embedUrl === 'https://www.youtube.com/watch?v=vnXIPsijIRc');
  const r = R.find((x) => x.id === v.resourceId);
  assert(r.videoProvenance.resultTitle.includes('การแก้ระบบสมการเชิงเส้นสองตัวแปร ตอนที่ 1'));
  assert(VL.includes("'embedded-video'") && VL.includes('media={v.media}'));
});
await test('3 + 24. No video selected → no iframe: entry/pick/clip list render no player', () => {
  const before = VL.slice(0, VL.indexOf('/* ── Workspace'));
  assert(!/<YouTubePlayer|<UniversalVideoPlayer|<iframe/.test(before));
  assert.strictEqual((VL.match(/<UniversalVideoPlayer/g) || []).length, 1);
  assert(VL.indexOf('<UniversalVideoPlayer') > VL.indexOf('/* ── Workspace'));
});
await test('4. Non-YouTube resource → fallback "คลิปนี้ยังไม่สามารถเล่นใน V2U ได้" + เปิดต้นทาง', () => {
  const v = V.getLessonVideoSequence('math-alg-linear-eq').find((x) => x.resourceId === 'th-p14-m1-linear-eq-solve-2');
  assert(!v.embeddable && !v.videoId && !v.embedUrl, 'proj14 page is not a YouTube embed');
  const UP = read('src/components/video/UniversalVideoPlayer.tsx');
  assert(UP.includes('data-testid="video-fallback"') && UP.includes('แหล่งนี้ยังไม่สามารถเล่นใน V2U ได้') && UP.includes('OPEN_SOURCE'));
});
await test('5. Invalid videoId → fallback; registry rejects invalid/non-YouTube candidate videos', () => {
  assert.strictEqual(V.ownToVideo({ id: 'x', type: 'youtube', title: 't', url: 'https://www.youtube.com/watch?v=bad' }, LSYS).embeddable, false);
  assert.strictEqual(V.ownToVideo({ id: 'y', type: 'youtube', title: 't', url: 'https://youtu.be/vnXIPsijIRc' }, LSYS).embeddable, true);
  const base = R.find((x) => x.id === 'th-p14-m3-linear-system-solve-1');
  const err = (patch) => E.validateResources([{ ...base, ...patch }], C).join('|');
  assert(err({ candidateVideoUrl: 'https://vimeo.com/123' }).includes('valid video id'));
  assert(err({ candidateVideoUrl: 'https://www.youtube.com/watch?v=xx' }).includes('valid video id'));
  assert(err({ videoProvenance: undefined }).includes('needs search provenance'));
  assert(err({ videoProvenance: { ...base.videoProvenance, resultTitle: 'สรุปทุกสิ่งที่ต้องรู้' } }).includes('does not match'));
  assert.deepStrictEqual(E.validateResources(), []);
});
await test('Embedding never changes status: embedded clips stay unverified + labelled', () => {
  for (const r of R.filter((x) => x.candidateVideoUrl)) {
    assert.strictEqual(r.status, 'unverified', r.id);
    const v = V.curatedToVideo(r, r.curriculumLessonIds[0]);
    assert(v.embeddable && !v.checked && !v.url && v.linkState === 'ยังไม่ได้ตรวจลิงก์', r.id);
  }
  assert(VL.includes('{v.linkState}') && VL.includes('เล่นผ่านเครื่องเล่นทางการของ'));
});
await test('6–7. Watched + skip preserved (unchanged Phase 55/56 behaviour)', () => {
  const s = useStore.getState();
  s.setVideoProgress(LSYS, 'curated:th-p14-m3-linear-system-solve-1', { state: 'watched' });
  s.setVideoProgress(LSYS, 'curated:th-p14-m3-linear-system-solve-1', { skipped: true });
  const p = useStore.getState().learningNotes.videoProgress[`${LSYS}|curated:th-p14-m3-linear-system-solve-1`];
  assert(p.state === 'watched' && p.skipped === true);
  const r = V.getRecommendedVideo({ lessonId: LSYS, storeLessons: useStore.getState().lessons, skippedKeys: ['curated:th-p14-m3-linear-system-solve-1'] });
  assert.notStrictEqual(r.video.key, 'curated:th-p14-m3-linear-system-solve-1');
  assert(VL.includes('ข้ามคลิป →') && VL.includes('ดูอีกครั้ง'));
});

console.log('\n2. Voice notes');
await test('9. Supported: SpeechRecognition / webkitSpeechRecognition detected; th-TH', () => {
  class Fake {}
  assert.strictEqual(SP.getRecognitionCtor({ webkitSpeechRecognition: Fake }), Fake);
  assert.strictEqual(SP.getRecognitionCtor({ SpeechRecognition: Fake }), Fake);
  assert.strictEqual(SP.SPEECH_LANG, 'th-TH');
  assert(HOOK.includes('r.lang = SPEECH_LANG;'));
});
await test('10. Unsupported: clear message, typing still works', () => {
  assert.strictEqual(SP.getRecognitionCtor({}), null);
  assert.strictEqual(SP.speechReducer('unsupported', { type: 'start' }), 'unsupported');
  assert(SP.SPEECH_MESSAGE.unsupported.includes('เบราว์เซอร์นี้ยังไม่รองรับการพิมพ์ด้วยเสียง'));
  assert(NP.includes("speech.state === 'unsupported'"));
});
await test('11. Microphone starts only after a click (no auto-start)', () => {
  const mount = HOOK.slice(0, HOOK.indexOf('const start = useCallback'));
  assert(!/new Ctor\(|\.start\(\)/.test(mount), 'nothing starts on mount');
  assert(!/useEffect\([^)]*start\(/.test(HOOK));
  assert(NP.includes('onClick={listening ? speech.stop : speech.start}'));
});
await test('12–13. listening → stop → processing → idle; errors handled', () => {
  let s = SP.speechReducer('idle', { type: 'start' });
  assert.strictEqual(s, 'listening');
  s = SP.speechReducer(s, { type: 'stop' });
  assert.strictEqual(s, 'processing');
  assert.strictEqual(SP.speechReducer(s, { type: 'ended' }), 'idle');
  assert.strictEqual(SP.speechReducer('listening', { type: 'error', code: 'not-allowed' }), 'error');
  assert.strictEqual(SP.speechReducer('error', { type: 'ended' }), 'error');
  assert.strictEqual(SP.speechReducer('listening', { type: 'error', code: 'no-speech' }), 'idle', 'silence is not a mic failure');
  assert(SP.SPEECH_MESSAGE.error.includes('ไม่สามารถใช้ไมโครโฟนได้') && SP.SPEECH_MESSAGE.listening.includes('กำลังฟัง'));
});
await test('14–15. Transcript goes into the note box and stays editable', () => {
  assert.strictEqual(SP.appendTranscript('', ' ผมยังไม่เข้าใจว่าทำไมต้องย้ายสี่ไปอีกฝั่ง '), 'ผมยังไม่เข้าใจว่าทำไมต้องย้ายสี่ไปอีกฝั่ง');
  assert.strictEqual(SP.appendTranscript('ข้อ 1', 'ย้ายข้าง'), 'ข้อ 1 ย้ายข้าง');
  assert.strictEqual(SP.appendTranscript('พิมพ์ไว้ ', 'ต่อ'), 'พิมพ์ไว้ ต่อ');
  assert.strictEqual(SP.appendTranscript('เดิม', '   '), 'เดิม');
  assert(NP.includes('useSpeechToText((t) => setText((cur) => appendTranscript(cur, t)))'), 'same textarea the learner types in');
});
await test('16. Note category preserved: a spoken note is saved under the selected type', () => {
  const n = useStore.getState().addStudyNote({ lessonId: LSYS, type: 'unclear', text: SP.appendTranscript('', 'ผมยังไม่เข้าใจว่าทำไมต้องย้ายสี่ไปอีกฝั่ง') });
  assert.strictEqual(useStore.getState().learningNotes.notes.find((x) => x.id === n.id).type, 'unclear');
});
await test('17. No raw audio is captured or stored', async () => {
  for (const f of ['src/notes/speech.ts', 'src/notes/useSpeechToText.ts', 'src/components/video/NotesPanel.tsx']) {
    const src = read(f);
    assert(!/MediaRecorder|getUserMedia|AudioContext|new Blob|createObjectURL/.test(src), f);
  }
  await new Promise((r) => setTimeout(r, 350));
  assert(!/audio|blob:|webm|\.wav/i.test(mem.get('engineering-study-hub-storage') ?? ''));
  const sanitized = N.sanitizeNotesData({ notes: [{ id: 'a', lessonId: LSYS, type: 'note', text: 't', audio: 'data:audio/webm;base64,AAA' }] });
  assert.strictEqual(sanitized.notes[0].audio, undefined, 'unknown fields (e.g. audio) are dropped from backups');
});
await test('Accessibility: aria-label, aria-pressed, live status text (not colour only), ≥44px', () => {
  assert(NP.includes("aria-label={listening ? 'หยุดฟัง' : 'พูดแทนพิมพ์'}") && NP.includes('aria-pressed={listening}'));
  assert(NP.includes('role="status" aria-live="polite"') && NP.includes('กำลังฟัง...'));
  assert(NP.includes('<span>🔴 หยุด</span>') && NP.includes('<span>พูดแทนพิมพ์</span>'), 'text label in both states');
  assert(NP.includes('inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4'));
  assert(NP.includes('focus-visible:ring-4'));
});

console.log('\n3. Learning state');
const studyLesson = useStore.getState().lessons.find((l) => l.title.includes('สมการ'));
await test('18. Voice does not change mastery or completion', () => {
  const before = JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.quizScore, l.status, l.completedCurriculumLessonIds]));
  useStore.getState().addStudyNote({ lessonId: LSYS, type: 'understood', text: SP.appendTranscript('', 'เข้าใจแล้วครับ อธิบายได้') });
  assert.strictEqual(JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.quizScore, l.status, l.completedCurriculumLessonIds])), before);
  assert(NP.includes('การพูดไม่ใช่การเช็กความเข้าใจ'));
});
await test('19. Understanding check still controls mastery (finish flow records the check, not notes)', () => {
  const s = useStore.getState();
  s.startLearningSession({ lessonId: studyLesson.id, curriculumLessonId: LSYS, plannedMinutes: 30 });
  s.recordUnderstandingCheck({ score: 50, understood: [], confused: ['แก้ระบบสมการ'] });
  useStore.getState().finishLearningSession(30, 50, 'Low');
  const l = useStore.getState().lessons.find((x) => x.id === studyLesson.id);
  assert.strictEqual(l.quizScore, 50);
  assert(read('src/components/learning/LessonLearning.tsx').includes("state: s.score >= 70 && s.confused.length === 0 ? 'done' : 'checked'"));
});
await test('20. Summary does not hallucinate (only my notes + check; insufficient → says so)', () => {
  assert(N.buildPersonalSummary({ lessonId: 'phy-vec-units', notes: [] }).startsWith('ยังไม่มีข้อมูลเพียงพอสำหรับสรุป'));
  const s = N.buildPersonalSummary({ lessonId: LSYS, notes: useStore.getState().learningNotes.notes });
  assert(s.includes('ผมยังไม่เข้าใจว่าทำไมต้องย้ายสี่ไปอีกฝั่ง'));
  assert(!/transcript|คำบรรยายคลิป/i.test(read('src/notes/engine.ts')), 'no third-party transcripts');
});
await test('21. Review receives the spoken "ยังไม่เข้าใจ" note as a personal signal', () => {
  const sig = N.getUnclearSignals(useStore.getState().learningNotes.notes);
  const g = sig.find((x) => x.lessonId === LSYS);
  assert(g && g.notes.some((n) => n.text.includes('ย้ายสี่ไปอีกฝั่ง')));
});
await test('8. Notes persistence (existing key; backup carries the text notes)', async () => {
  await new Promise((r) => setTimeout(r, 350));
  const saved = JSON.parse(mem.get('engineering-study-hub-storage'));
  assert(saved.state.learningNotes.notes.some((n) => n.text.includes('ย้ายสี่ไปอีกฝั่ง')));
  const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
  const payload = I.createExportPayload({ ...useStore.getState() });
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  assert(payload.learningNotes.notes.some((n) => n.text.includes('ย้ายสี่ไปอีกฝั่ง')));
});

console.log('\n4. Layout');
await test('22–23. Desktop video | notes, mobile video then notes (voice inside notes)', () => {
  const ws = VL.slice(VL.indexOf('/* ── Workspace'));
  assert(ws.indexOf('<YouTubePlayer') < ws.indexOf('<NotesPanel'));
  assert(ws.includes('grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @5xl:grid-cols-[minmax(0,1fr)_360px]'));
  assert(NP.indexOf('data-testid="voice-notes"') > NP.indexOf('<textarea'));
});
await test('Phase 56 modes and formats still present', () => {
  const meta = read('src/components/learning/meta.ts');
  for (const m of ['อ่านกับ V2U', 'ดูคลิป', 'เรียนกับ V2U']) assert(meta.includes(m));
  for (const f of ['src/interactive/lessons/linearEquation.ts', 'src/interactive/lessons/codeBattle.ts', 'src/interactive/lessons/newtonLab.ts']) assert(fs.existsSync(path.join(root, f)));
  assert.strictEqual([...read('src/components/learning/meta.ts').matchAll(/\{ id: '[a-z]+', label:/g)].length, 8, 'reading has 8 sections');
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
