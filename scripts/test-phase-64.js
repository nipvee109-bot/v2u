/**
 * Test Suite: Phase 64 — Signature teaching experience
 * - Studio scripts only point at existing knowledge / authored steps
 * - Robot branch tracer matches python3; game boundary maps only to existing steps
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { execPython, python } from './lib/crossPlatform.js';
const PY = python(); // py -3 on Windows, then python, then python3 (never the Store alias)
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

console.log('=== Phase 64: Signature teaching experience ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { STUDIO_SCRIPTS, getStudioScript } = await jiti.import(path.join(root, 'src/interactive/studio/scripts.ts'));
const { runBranches, withValue, swapFirstTwoBranches } = await jiti.import(path.join(root, 'src/interactive/studio/branchRunner.ts'));
const { AUTHORED_LESSONS } = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const B = await jiti.import(path.join(root, 'src/learning/gameBridge.ts'));
const E = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const lessonOf = (id) => AUTHORED_LESSONS.find((l) => l.lessonId === id);

await test('three reference scripts: math, physics, programming — each with its teaching principle', () => {
  assert.deepStrictEqual(STUDIO_SCRIPTS.map((s) => s.subject).sort(), ['math', 'physics', 'programming']);
  assert.strictEqual(getStudioScript('math-alg-linear-eq').principle, 'ทำให้เรื่องยากมองเห็นได้');
  assert.strictEqual(getStudioScript('phy-dyn-newton').principle, 'ทำให้สูตรทดลองได้');
  assert.strictEqual(getStudioScript('prog-ctrl-conditions').principle, 'ทำให้โค้ดมีชีวิต');
});

await test('every id a script points at exists in the knowledge layer or the authored lesson (no invented content)', () => {
  for (const s of STUDIO_SCRIPTS) {
    const k = K.getLessonKnowledge(s.lessonId);
    const l = lessonOf(s.lessonId);
    assert(k && l, s.lessonId);
    const step = (id) => assert(l.steps.some((x) => x.id === id), `${s.lessonId} step ${id}`);
    for (const c of s.chunks) {
      if (c.kind === 'step') step(c.stepId);
      if (c.kind === 'mistakes') { assert(k.mistakes.length > 0); if (c.stepId) step(c.stepId); }
      if (c.kind === 'example') assert(k.workedExamples.some((e) => e.id === c.exampleId), c.exampleId);
      if (c.kind === 'explain') {
        for (const id of c.concepts ?? []) assert(k.concepts.some((x) => x.id === id), id);
        for (const id of c.rules ?? []) assert(k.rules.some((x) => x.id === id), id);
        for (const i of c.detailed ?? []) assert(k.detailed[i], `detailed ${i}`);
        if (c.analogy) assert(k.analogy);
        if (c.diagram) assert(k.diagrams?.some((d) => d.id === c.diagram), c.diagram);
      }
      if (c.kind === 'widget') {
        const w = c.widget;
        if ('stepId' in w) step(w.stepId);
        if (w.kind === 'cart-lab') assert.strictEqual(l.steps.find((x) => x.id === w.stepId).interaction.kind, 'lab');
        if (w.kind === 'balance') assert(/^\d*x\s*[+−-]\s*\d+\s*=\s*\d+$/.test(l.steps.find((x) => x.id === w.stepId).visual.lines[0]));
        if (w.kind === 'robot-run') assert(w.codeFrom.exampleId ? k.workedExamples.find((e) => e.id === w.codeFrom.exampleId)?.code : [...k.guided, ...k.independent].find((p) => p.id === w.codeFrom.practiceId)?.code);
        if (w.kind === 'robot-debug') assert([...k.guided, ...k.independent].find((p) => p.id === w.practiceId)?.code);
      }
    }
  }
});

await test('every authored question step is taught in the studio (evidence for the check is unchanged)', () => {
  for (const s of STUDIO_SCRIPTS) {
    const used = new Set(s.chunks.flatMap((c) => [c.stepId, c.widget?.stepId].filter(Boolean)));
    for (const st of lessonOf(s.lessonId).steps) if (st.interaction) assert(used.has(st.id), `${s.lessonId}: ${st.id}`);
  }
});

await test('progress phases: understand → try → practice, in order, ending with a summary', () => {
  const rank = { understand: 0, try: 1, practice: 2 };
  for (const s of STUDIO_SCRIPTS) {
    const r = s.chunks.map((c) => rank[c.phase]);
    assert.deepStrictEqual(r, [...r].sort((a, b) => a - b), s.lessonId);
    assert.strictEqual(s.chunks[0].kind, 'hook');
    assert.strictEqual(s.chunks.at(-1).kind, 'summary');
    assert.strictEqual(new Set(s.chunks.map((c) => c.id)).size, s.chunks.length);
  }
});

await test('tutor lines are short, have no links and do not mention future topics', () => {
  for (const s of STUDIO_SCRIPTS) {
    const k = K.getLessonKnowledge(s.lessonId);
    for (const c of s.chunks) {
      if (!c.tutor) continue;
      assert(c.tutor.length <= 140, c.tutor);
      assert(!/https?:|www\./.test(c.tutor), c.tutor);
      for (const n of k.notYetAllowed) assert(!c.tutor.includes(n), `${c.id}: ${n}`);
    }
  }
});

// The robot's trace must say exactly what Python says
const k = K.getLessonKnowledge('prog-ctrl-conditions');
const we1 = k.workedExamples.find((e) => e.id === 'we-1').code;
const i3 = [...k.guided, ...k.independent].find((p) => p.id === 'i-3').code;
const py = (code) => execPython(['-c', code], { py: PY }).replace(/\n$/, '');
await test('branch runner output = python3 output (worked example, many values)', () => {
  for (const v of [-5, 0, 40, 69, 70, 71, 72, 79, 80, 81, 95, 100]) assert.strictEqual(runBranches(withValue(we1, v)).output, py(withValue(we1, v)), `score ${v}`);
});
await test('debug sample: buggy prints the knowledge answer, swapped order prints the fixed result (python3)', () => {
  assert.strictEqual(runBranches(i3).output, py(i3));
  assert.strictEqual(runBranches(i3).output, 'ผ่าน');
  const fixed = swapFirstTwoBranches(i3);
  for (const v of [30, 50, 79, 80, 95]) assert.strictEqual(runBranches(withValue(fixed, v)).output, py(withValue(fixed, v)), `fixed ${v}`);
  assert.strictEqual(runBranches(fixed).output, 'ดี');
});
await test('branch trace: decided line is the first true test; later branches are skipped', () => {
  const r = runBranches(withValue(we1, 95));
  assert.strictEqual(r.branch, 0);
  assert(r.steps.some((s) => s.kind === 'skip'));
  assert.strictEqual(runBranches(withValue(we1, 40)).branch, 2);
  assert.throws(() => runBranches('for i in range(3):\n    print(i)'));
});

await test('game boundary: content comes from knowledge; evidence only maps to existing steps', () => {
  const c = B.toGameContent('prog-ctrl-conditions');
  assert.strictEqual(c.contractVersion, B.GAME_CONTRACT_VERSION);
  assert.deepStrictEqual(c.notYetAllowed, k.notYetAllowed);
  const l = lessonOf('prog-ctrl-conditions');
  const skill = k.skills[0];
  const acts = B.toPlayerActions({ contractVersion: 1, lessonId: l.lessonId, source: 't', attempts: [
    { skillId: skill, stepId: 'predict', correct: true, usedHint: true },
    { skillId: skill, stepId: 'nope', correct: true },
    { skillId: 'skill-unknown', stepId: 'predict', correct: true },
    { skillId: skill, correct: true },
  ] }, l);
  assert.deepStrictEqual(acts, [{ type: 'hint', stepId: 'predict' }, { type: 'answer', stepId: 'predict', correct: true }]);
  assert.deepStrictEqual(B.toPlayerActions({ contractVersion: 1, lessonId: 'other', source: 't', attempts: [{ skillId: skill, stepId: 'predict', correct: true }] }, l), []);
  assert.strictEqual(B.toGameContent('nope'), undefined);
});

await test('a game cannot finish a lesson: actions never include finish/final', () => {
  const l = lessonOf('math-alg-linear-eq');
  const s = K.getLessonKnowledge(l.lessonId).skills[0];
  const acts = B.toPlayerActions({ contractVersion: 1, lessonId: l.lessonId, source: 't', attempts: l.steps.filter((x) => x.interaction).map((x) => ({ skillId: s, stepId: x.id, correct: true })) }, l);
  assert(acts.every((a) => a.type === 'answer' || a.type === 'hint' || a.type === 'reveal'));
  let st = E.initialPlayerState();
  for (const a of acts) st = E.playerReducer(st, a);
  assert.strictEqual(st.finished, false);
});

await test('business logic does not depend on the studio or the game boundary', () => {
  const dirs = ['src/lib', 'src/store', 'src/engine', 'src/utils', 'src/services'].filter((d) => fs.existsSync(path.join(root, d)));
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of dirs.flatMap(walk).concat(['src/interactive/engine.ts', 'src/interactive/usePlayer.ts'])) {
    const src = read(f);
    assert(!/studio|gameBridge/.test(src.match(/^import .*$/gm)?.join('\n') ?? ''), f);
  }
});

await test('v2u mode: studio for scripted lessons, InteractivePlayer for every other lesson; modes unchanged', () => {
  const src = read('src/components/learning/LessonLearning.tsx');
  assert(src.includes('<InteractivePlayer'));
  assert(src.includes('<TeachingStudio'));
  assert(src.includes('getStudioScript(curriculumLessonId)'));
  assert(src.includes("const ORDER: LearningMode[] = ['read', 'video', 'v2u'];"));
});

await test('studio UI: resume key, 4 progress phases, six adaptive options, reduced motion, no XP', () => {
  const st = read('src/components/learning/studio/TeachingStudio.tsx');
  const tu = read('src/components/learning/studio/Tutor.tsx');
  const wi = read('src/components/learning/studio/Widgets.tsx');
  assert(st.includes('v2u-studio:'));
  for (const p of ['เข้าใจแนวคิด', 'ลองทำ', 'ฝึกใช้', 'เช็กความเข้าใจ']) assert(st.includes(p), p);
  for (const o of ['อธิบายให้ง่ายกว่านี้', 'ดูเป็นภาพ', 'ดูตัวอย่าง', 'ขอคำใบ้', 'ลองอีกวิธี', 'กลับไปแนวคิดก่อนหน้า']) assert(tu.includes(o), o);
  assert(wi.includes('prefers-reduced-motion'));
  for (const f of [st, tu, wi]) assert(!/\bXP\b|leaderboard|mastered|finish'/i.test(f));
  assert(!/type: 'finish'|type: 'final'/.test(st + tu + wi));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
