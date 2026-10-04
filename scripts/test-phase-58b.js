/**
 * Test Suite: Phase 58b — Universal video player (safe embed only)
 * (live microphone + iframe mounting are also exercised in Playwright with a fake SpeechRecognition)
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

console.log('=== Phase 58b: Universal video player — safe embed only ===\n');
const M = await jiti.import(path.join(root, 'src/video/media.ts'));
const YT = await jiti.import(path.join(root, 'src/video/youtube.ts'));
const V = await jiti.import(path.join(root, 'src/video/engine.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const UP = read('src/components/video/UniversalVideoPlayer.tsx');
const VL = read('src/components/video/VideoLearning.tsx');
const NP = read('src/components/video/NotesPanel.tsx');
const r = (u, o) => M.resolveMedia(u, o);

console.log('1. YouTube');
await test('1. YouTube valid → official embed URL built from the id', () => {
  const m = r('https://www.youtube.com/watch?v=vnXIPsijIRc');
  assert(m.embedAllowed && m.provider === 'youtube' && m.videoId === 'vnXIPsijIRc' && m.embedUrl === 'https://www.youtube.com/embed/vnXIPsijIRc' && m.mediaType === 'iframe');
});
await test('2. YouTube invalid id → no embed, never guessed', () => {
  for (const u of ['https://www.youtube.com/watch?v=short', 'https://www.youtube.com/watch?v=vnXIPsijIRcX', 'https://www.youtube.com/channel/UC-liZGyaPd97IQL7fbDDQUg', 'https://youtube.com.evil.net/watch?v=vnXIPsijIRc']) {
    const m = r(u); assert(!m.embedAllowed && !m.embedUrl && !m.videoId, u);
  }
});
await test('3. YouTube watch URL (extra params ignored)', () => assert.strictEqual(r('https://m.youtube.com/watch?v=RvWgjH99IT4&t=5').embedUrl, 'https://www.youtube.com/embed/RvWgjH99IT4'));
await test('4. YouTube short URL', () => assert.strictEqual(r('https://youtu.be/qfBl4MLwebU').embedUrl, 'https://www.youtube.com/embed/qfBl4MLwebU'));
await test('5. YouTube embed URL (youtube-nocookie)', () => assert.strictEqual(r('https://www.youtube-nocookie.com/embed/YquvV_KTbYE').embedUrl, 'https://www.youtube.com/embed/YquvV_KTbYE'));
await test('6. YouTube blocked embed (101/150/100) → fallback', () => {
  for (const code of [101, 150, 100]) {
    assert.deepStrictEqual(YT.parseYouTubeMessage('https://www.youtube.com', JSON.stringify({ event: 'onError', info: code })), { error: code });
    assert(M.isYouTubeBlockingError(code));
  }
  assert.strictEqual(YT.parseYouTubeMessage('https://evil.com', JSON.stringify({ event: 'onError', info: 150 })), null, 'only YouTube origin');
  assert(UP.includes('isYouTubeBlockingError(info.error)) setFailed(true)') && UP.includes('cause="error"'));
  assert(UP.includes('คลิปนี้ไม่สามารถเล่นใน V2U ได้'));
});

console.log('2. Vimeo & official providers');
await test('7. Vimeo valid → player.vimeo.com/video/ID', () => {
  assert.strictEqual(r('https://vimeo.com/76979871').embedUrl, 'https://player.vimeo.com/video/76979871');
  assert.strictEqual(r('https://player.vimeo.com/video/76979871').embedUrl, 'https://player.vimeo.com/video/76979871');
});
await test('8. Vimeo invalid → fallback, no guessed id', () => {
  for (const u of ['https://vimeo.com/channels/staffpicks', 'https://vimeo.com/abc', 'https://vimeo.com/123']) { const m = r(u); assert(!m.embedAllowed && !m.embedUrl, u); }
  assert(M.parseVimeoError('https://player.vimeo.com', '{"event":"error"}') && !M.parseVimeoError('https://evil.com', '{"event":"error"}'));
});
await test('9. Allowed official provider (allowlist with docs) → official embed', () => {
  const m = r('https://www.dailymotion.com/video/x8abcd1');
  assert(m.embedAllowed && m.provider === 'official-embed' && m.embedUrl === 'https://www.dailymotion.com/embed/video/x8abcd1');
  for (const p of M.OFFICIAL_EMBED_PROVIDERS) assert(p.docs.startsWith('https://'), p.id);
});
await test('10. Unknown provider rejected', () => {
  const m = r('https://videos.example.com/watch/123');
  assert(!m.embedAllowed && m.mediaType === 'link' && !m.embedUrl);
});

console.log('3. Direct video');
await test('11. Direct mp4 on an allowed host → HTML5 <video>, controls, no autoplay', () => {
  const m = r('https://media.v2u.test/clips/a.mp4', { directHosts: ['media.v2u.test'] });
  assert(m.embedAllowed && m.mediaType === 'video' && m.mime === 'video/mp4' && !m.embedUrl);
  assert(UP.includes('<video') && UP.includes('controls') && !/autoPlay|autoplay=1/.test(UP));
});
await test('12. Direct webm (and unsupported format → fallback, unknown host → fallback)', () => {
  assert.strictEqual(r('https://media.v2u.test/b.webm', { directHosts: ['media.v2u.test'] }).mime, 'video/webm');
  assert(!r('https://media.v2u.test/b.webm', { directHosts: ['media.v2u.test'], canPlay: () => false }).embedAllowed);
  assert(!r('https://cdn.other.com/b.mp4').embedAllowed, 'direct host must be allowlisted');
  assert(UP.includes("canPlayType(media.mime) === ''"));
});
await test('13. Ordinary webpage (Project 14) → "แหล่งนี้ยังไม่สามารถเล่นใน V2U ได้" + เปิดต้นทาง', () => {
  const m = r('https://proj14.ipst.ac.th/m3/lesson/123');
  assert(!m.embedAllowed && m.provider === 'webpage' && m.sourceUrl);
  assert(UP.includes('แหล่งนี้ยังไม่สามารถเล่นใน V2U ได้'));
});

console.log('4. Security');
await test('14. Arbitrary iframe rejected: only built URLs on allowlisted hosts', () => {
  assert(!M.isSafeFrameSrc('https://evil.com/embed/x') && !M.isSafeFrameSrc('javascript:alert(1)') && !M.isSafeFrameSrc('https://www.youtube.com.evil.net/embed/x'));
  assert(M.isSafeFrameSrc('https://www.youtube.com/embed/vnXIPsijIRc'));
  assert(UP.includes('if (!isSafeFrameSrc(src))'));
  assert((UP.match(/<iframe/g) || []).length === 1 && UP.includes('src={src}'));
  // iframe src never comes from a query parameter of the user URL
  assert(!r('https://www.youtube.com/watch?v=vnXIPsijIRc&embed=https://evil.com').embedUrl.includes('evil'));
  for (const u of ['javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'blob:https://x.com/1', 'file:///c/a.mp4', 'https://user:pw@www.youtube.com/watch?v=vnXIPsijIRc'])
    assert(!r(u).embedAllowed && !r(u).sourceUrl, u);
});
await test('15. HTTP rejected (https only for external media)', () => {
  const m = r('http://www.youtube.com/watch?v=vnXIPsijIRc');
  assert(!m.embedAllowed && m.reason === 'http');
  assert(!r('http://media.v2u.test/a.mp4', { directHosts: ['media.v2u.test'] }).embedAllowed);
});

console.log('5. Workspace');
await test('16. No player before choice (entry / pick render no player)', () => {
  const before = VL.slice(0, VL.indexOf('/* ── Workspace'));
  assert(!/<UniversalVideoPlayer|<iframe|<video/.test(before));
});
await test('17. Player after choice (one UniversalVideoPlayer, in the workspace)', () => {
  assert.strictEqual((VL.match(/<UniversalVideoPlayer/g) || []).length, 1);
  assert(VL.indexOf('<UniversalVideoPlayer') > VL.indexOf('/* ── Workspace') && VL.includes('media={v.media}'));
});
await test('18. Fallback after provider error (YouTube error, Vimeo error, <video> error)', () => {
  assert(UP.includes('if (failed) return <MediaFallback') && UP.includes('onError={() => setFailed(true)}'));
});
await test('19. Notes persistence (same store key, notes untouched by the player)', async () => {
  useStore.getState().addStudyNote({ lessonId: 'math-alg-linear-system', type: 'trick', text: 'คูณให้สัมประสิทธิ์เท่ากันก่อน' });
  await new Promise((res) => setTimeout(res, 350));
  const saved = JSON.parse(mem.get('engineering-study-hub-storage'));
  assert(saved.state.learningNotes.notes.some((n) => n.text.includes('สัมประสิทธิ์')));
  assert(!UP.includes('useStore'), 'the player never writes learner data');
});
await test('20. Voice notes kept (th-TH, no raw audio)', () => {
  assert(VL.includes('<NotesPanel') && NP.includes('พูดแทนพิมพ์') && NP.includes('data-testid="voice-notes"'));
  const SP = read('src/notes/speech.ts') + read('src/notes/useSpeechToText.ts');
  assert(SP.includes("'th-TH'") && !/MediaRecorder|getUserMedia/.test(SP + UP));
});
await test('21. Mastery unchanged by watching; embedding never verifies a resource', () => {
  const before = JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.status]));
  useStore.getState().setVideoProgress('math-alg-linear-system', 'curated:th-p14-m3-linear-system-solve-1', { state: 'watched' });
  assert.strictEqual(JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.status])), before);
  for (const res of R.filter((x) => x.candidateVideoUrl)) {
    const v = V.curatedToVideo(res, res.curriculumLessonIds[0]);
    assert(v.embeddable && res.status === 'unverified' && !v.checked, res.id);
  }
  assert(!/status:\s*'verified'/.test(read('src/video/media.ts') + UP));
});
await test('22. Responsive: video/notes split only when wide, stacked otherwise; ≥44px controls', () => {
  assert(VL.includes('@3xl:grid-cols-[minmax(0,1fr)_300px]') && UP.includes('aspect-video w-full') && UP.includes('min-h-[44px]'));
});

console.log('6. Recommendation & existing flows');
await test('embedCapability: recommendation prefers clips that play in V2U; labels differ', () => {
  const rec = V.getRecommendedVideo({ lessonId: 'math-alg-linear-system', storeLessons: useStore.getState().lessons });
  assert(rec && rec.video.embeddable && rec.reasons.includes('เล่นใน V2U ได้ จดโน้ตข้างคลิปได้เลย'));
  assert.notStrictEqual(M.PLAY_IN_V2U, M.OPEN_SOURCE);
  assert(VL.includes('capabilityLabel(v.media)'));
});
await test('23. Phase 56 flow intact (3 modes, hub, understanding check)', () => {
  const meta = read('src/components/learning/meta.ts');
  for (const t of ["'อ่านกับ V2U'", "'ดูคลิป'", "'เรียนกับ V2U'"]) assert(meta.includes(t));
  assert(read('src/hooks/useStartNextStep.tsx').includes('/learn/curriculum/${step.curriculum.lessonId}?from=next'));
});
await test('24. Phase 57 flow intact (YouTube parser strict, notes beside video)', () => {
  assert.strictEqual(YT.parseYouTubeVideoId('https://evil.com/watch?v=vnXIPsijIRc'), null);
  const ws = VL.slice(VL.indexOf('/* ── Workspace'));
  assert(ws.indexOf('<UniversalVideoPlayer') < ws.indexOf('<NotesPanel'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
