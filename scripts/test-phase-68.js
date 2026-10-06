/**
 * Test Suite: Phase 68 — Learnable without video
 * - Candidate counts reconciled; video content never fabricated
 * - Targeted wrong-answer feedback, tutor summary, independent learnability
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
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



console.log('=== Phase 68: Learnable without video ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const PC = await jiti.import(path.join(root, 'src/interactive/studio/practiceCheck.ts'));
const W = await jiti.import(path.join(root, 'src/interactive/studio/wrongAnswer.ts'));
const A = await jiti.import(path.join(root, 'src/content/lessonAudit.ts'));
const RV = await jiti.import(path.join(root, 'src/resources/registryView.ts'));
const YC = await jiti.import(path.join(root, 'src/resources/youtubeCandidates.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const items = K.LESSON_KNOWLEDGE.flatMap((k) => [...k.guided, ...k.independent].map((p) => ({ k, p })));

await test('candidate counts reconciled: 6 user-requested videos (not 7), 50 backlog, 53 unique pending overall', () => {
  const req = YC.YOUTUBE_CANDIDATES.filter((y) => y.provenance.requestedBy === 'user');
  assert.strictEqual(new Set(req.map((y) => y.videoId)).size, 6);
  assert.strictEqual(new Set(YC.YOUTUBE_CANDIDATES.map((y) => y.videoId)).size, YC.YOUTUBE_CANDIDATES.length);
  assert.strictEqual(RV.pendingVideoIds().length, 53);
  const ids = RV.registryRecords().map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'no duplicate records');
  assert(!ids.includes('yt-math-alg-linear-system-vnXIPsijIRc'), 'vnXIPsijIRc listed once (under its registry record)');
  assert(YC.YOUTUBE_CANDIDATES.every((y) => y.status === 'PENDING' && !y.actualContentInspected && y.summaryStatus === 'SUMMARY_PENDING'));
});

await test('every lesson is independently learnable without video; video stays non-blocking', () => {
  const all = A.auditAllLessons();
  assert.strictEqual(all.length, 20); // 15 admission + 5 optional web
  for (const a of all) {
    assert(a.independentlyLearnable, a.lessonId);
    assert.notStrictEqual(a.video, 'VERIFIED');
    assert.notStrictEqual(a.overall, 'READY');
  }
});

await test('wrong-answer diagnosis: the verified answer never triggers it; known error patterns do', () => {
  globalThis.DOMParser = new JSDOM('').window.DOMParser; // HTML practice is checked on a real DOM
  const right = (v) => v.kind === 'html' ? { html: v.html } : v.kind === 'holds' ? Object.fromEntries(Object.entries(v.vars).map(([a, b]) => [a, String(b)])) : v.kind === 'value' ? { v: String(v.expected) } : v.kind === 'inequality' ? { op: v.op, bound: String(v.bound) } : { out: v.output };
  let flips = 0, signs = 0;
  for (const { k, p } of items) {
    if (!p.verify || PC.practiceFields(p).length === 0) continue;
    assert.strictEqual(PC.checkPractice(p, right(p.verify)), 'correct', `${k.lessonId} ${p.id}`);
    if (p.verify.kind === 'inequality') {
      const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[p.verify.op];
      const m = W.diagnoseWrong(p, { op: flip, bound: String(p.verify.bound) });
      assert(m && m.includes('กลับทิศ'), `${p.id} flip`); flips++;
    }
    if (p.verify.kind === 'value' && p.verify.expected !== 0) {
      const inp = { v: String(-p.verify.expected) };
      if (PC.checkPractice(p, inp) === 'wrong') { assert((W.diagnoseWrong(p, inp) ?? '').includes('เครื่องหมาย'), `${k.lessonId} ${p.id} sign`); signs++; }
    }
  }
  assert(flips >= 9 && signs >= 30, `${flips} ${signs}`);
});

await test('wrong-answer diagnosis: swapped variables and python output patterns', () => {
  const sys = K.getLessonKnowledge('math-alg-linear-system').guided[0];
  const [a, b] = Object.keys(sys.verify.vars);
  assert((W.diagnoseWrong(sys, { [a]: String(sys.verify.vars[b]), [b]: String(sys.verify.vars[a]) }) ?? '').includes('สลับ'));
  const py = { id: 't', skillId: 's', level: 1, prompt: '', answer: '', explanation: '', verify: { kind: 'python', code: '', output: 'hi\nthere' } };
  assert(W.diagnoseWrong(py, { out: 'hi there' }) === undefined || W.diagnoseWrong(py, { out: 'hithere' }).includes('บรรทัด'));
  assert(W.diagnoseWrong({ ...py, verify: { ...py.verify, output: 'hi' } }, { out: '"hi"' }).includes('คำพูด'));
  assert(W.diagnoseWrong({ ...py, verify: { ...py.verify, output: '4.0' } }, { out: '4' }).includes('float'));
  assert(read('src/components/learning/studio/TeachingStudio.tsx').includes('practice-diagnosis'));
});

await test('tutor: summary option uses the lesson summary; simpler shows the analogy too', () => {
  const tu = read('src/components/learning/studio/Tutor.tsx');
  for (const x of ['สรุปสั้น ๆ', 'help-summary', 'k.summary.map', 'นึกภาพแบบนี้']) assert(tu.includes(x), x);
});

await test('post-video schema: quiz / suitability / summary / timestamps rejected without inspected content; skills must be the lesson’s', () => {
  const base = R.find((r) => r.id === 'cr-khan-alg1-equations');
  const meta = { videoId: 'vnXIPsijIRc', watchUrl: 'https://www.youtube.com/watch?v=vnXIPsijIRc', channel: 'x', embeddable: true, captions: 'unknown', actualContentInspected: false, checkedAt: '2026-10-05', review: { rank: 'GOOD_ALTERNATIVE', notes: '' } };
  const q = { skillId: 'skill-math-solve-linear', prompt: 'p', choices: ['a', 'b'], correctIndex: 0, explanation: 'e' };
  const err = (y) => E.validateResources([{ ...base, type: 'video', youtube: y }], C).join('|');
  assert(err({ ...meta, postVideoQuiz: [q] }).includes('require inspected'));
  assert(err({ ...meta, suitability: ['REVIEW'] }).includes('require inspected'));
  assert(err({ ...meta, actualContentInspected: true, postVideoQuiz: [{ ...q, skillId: 'skill-phy-newton' }] }).includes('outside the lesson'));
  assert(!err({ ...meta, actualContentInspected: true, postVideoQuiz: [q] }).includes('post-video'));
  for (const r of R) assert(!r.youtube, `${r.id}: no video-derived content exists yet`);
});

await test('post-video flow ends in the lesson’s own understanding check (knowledge-based, not video trivia)', () => {
  const ll = read('src/components/learning/LessonLearning.tsx');
  assert(ll.includes("onToCheck={() => setStage('check')}") && ll.includes('<VideoLearning'));
  for (const k of K.LESSON_KNOWLEDGE) for (const c of k.checks) assert(!/นาที|ผู้สอน|ในคลิป|วิดีโอ/.test(c.prompt), `${k.lessonId}/${c.id} looks like video trivia`);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
