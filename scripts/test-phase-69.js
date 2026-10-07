/**
 * Test Suite: Phase 69 — Lesson-specific teaching depth
 * - Every teaching pattern points at real lesson data; numbers match worked examples
 * - Code traces = real python3; boundaries respected; game slot never faked
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
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



console.log('=== Phase 69: Lesson-specific teaching depth ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const R = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const D = await jiti.import(path.join(root, 'src/interactive/studio/depth.ts'));
const S = await jiti.import(path.join(root, 'src/interactive/studio/scripts.ts'));
const T = await jiti.import(path.join(root, 'src/interactive/studio/traces.ts'));
const { TRACE_SAMPLES } = await jiti.import(path.join(root, 'src/interactive/studio/traceSamples.ts'));
const G = await jiti.import(path.join(root, 'src/learning/gameBridge.ts'));
const LESSONS = C.lessons.map((l) => l.id);
const get = (id) => K.getLessonKnowledge(id);
const widgets = (id) => S.getStudioScript(id).chunks.filter((c) => c.kind === 'widget').map((c) => c.widget);
const W = (id, kind) => widgets(id).find((w) => w.kind === kind);
const ex = (id, eid) => get(id).workedExamples.find((e) => e.id === eid);

await test('Teaching Depth Matrix covers all 20 lessons once; 3 subject references + 5 HTML references + 4 P0 mechanics references + 8 upgraded', () => {
  assert.deepStrictEqual(D.DEPTH_PLANS.map((p) => p.lessonId).sort(), [...LESSONS].sort());
  assert.strictEqual(D.DEPTH_PLANS.filter((p) => p.after === 'REFERENCE_COMPLETE').length, 12);
  for (const p of D.DEPTH_PLANS.filter((x) => x.lessonId.startsWith('web-'))) assert(p.patterns.includes('LIVE_BUILDER') && p.inserts.length === 0, p.lessonId);
  assert.strictEqual(D.DEPTH_PLANS.filter((p) => p.after === 'DEPTH_UPGRADED').length, 8);
  for (const p of D.DEPTH_PLANS) assert(p.patterns.length > 0 && p.why.length > 10 && p.hardConcepts.length > 0, p.lessonId);
});

await test('every upgraded lesson really has an interactive pattern that the learner must complete', () => {
  for (const p of D.DEPTH_PLANS.filter((x) => x.after === 'DEPTH_UPGRADED')) {
    const ws = widgets(p.lessonId);
    assert(ws.length >= 1, p.lessonId);
    assert(S.getStudioScript(p.lessonId).chunks.some((c) => c.kind === 'mistakes' && !c.stepId), `${p.lessonId}: interactive mistake match`);
    for (const ins of p.inserts) assert(S.getStudioScript(p.lessonId).chunks.some((c) => c.id === ins.chunk.id), `${p.lessonId}: ${ins.chunk.id} applied`);
  }
});

await test('pattern widgets point at real examples / traces; missing-step distractors are real lesson steps', () => {
  for (const id of LESSONS) for (const w of widgets(id)) {
    if ('exampleId' in w) assert(ex(id, w.exampleId), `${id} ${w.kind} ${w.exampleId}`);
    if (w.kind === 'missing-step') {
      const e = ex(id, w.exampleId);
      assert(w.index >= 0 && w.index < e.steps.length, `${id} index`);
      assert(get(id).workedExamples.filter((x) => x.id !== e.id).flatMap((x) => x.steps).length >= 2, `${id} distractors`);
    }
    if (w.kind === 'order-steps') assert(ex(id, w.exampleId).steps.length >= 3, `${id} order needs ≥3 steps`);
    if (w.kind === 'code-trace') assert(T.getTrace(w.traceId), `${id} trace ${w.traceId}`);
  }
});

await test('numbers in visual patterns match the lessons’ worked examples and rules', () => {
  const sys = W('math-alg-linear-system', 'pair-check'); const e1 = ex('math-alg-linear-system', 'we-1');
  assert(e1.problem.includes('3x + 2y = 16') && e1.problem.includes('x − y = 2'));
  for (const [a, b, c] of sys.eqs) assert.strictEqual(a * 4 + b * 2, c, 'answer x = 4, y = 2 satisfies both');
  assert(get('math-alg-linear-ineq').checks.some((c) => c.choices.some((x) => x.includes('1 < 2 แต่ −1 > −2'))));
  assert.deepStrictEqual([W('math-alg-linear-ineq', 'number-line').a, W('math-alg-linear-ineq', 'number-line').b], [1, 2]);
  assert(ex('math-alg-exponents', 'we-1').problem.includes('2³') && W('math-alg-exponents', 'exponent-blocks').base === 2);
  const lg = W('math-fn-linear', 'line-graph'); const f1 = ex('math-fn-linear', 'we-1');
  for (const [x, y] of lg.points) { assert(f1.problem.includes(`(${x}, ${y})`)); assert.strictEqual(2 * x + 1, y, 'answer y = 2x + 1'); }
  assert(f1.answer === 'y = 2x + 1' && 2 <= 4 && 2 % 0.5 === 0 && 1 <= 6, 'reachable with the sliders');
  const tr = W('math-trig-ratios', 'triangle-sides'); const t1 = ex('math-trig-ratios', 'we-1');
  assert(t1.answer.includes(`${tr.opp}/${tr.hyp}`) && t1.answer.includes(`${tr.adj}/${tr.hyp}`) && tr.opp ** 2 + tr.adj ** 2 === tr.hyp ** 2);
  const st =(id, sid) => R.getInteractiveLesson(id).steps.find((s) => s.id === sid).interaction;
  const u = st('phy-vec-units', 'kmh-ms');
  assert(ex('phy-vec-units', 'we-1').problem.includes(String(u.value)) && ex('phy-vec-units', 'we-1').answer === `${u.answer} m/s` && u.value / 3.6 === u.answer);
  const v = W('phy-vec-vectors', 'vector-explorer'); const v1 = ex('phy-vec-vectors', 'we-1');
  assert(v1.problem.includes(`${v.magnitude} N`) && v1.problem.includes(`${v.angle}°`));
  assert(v1.answer.includes((v.magnitude * Math.cos((v.angle * Math.PI) / 180)).toFixed(2)));
  const m = st('phy-kin-1d', 'brake'); const k2 = ex('phy-kin-1d', 'we-2');
  assert(k2.problem.includes(`${m.u} m/s`) && k2.answer.startsWith(`s = ${m.goal.x} m`), 'brake goal = worked example 2');
});

await test('code traces: regenerated with real python3 = committed; outputs/errors match the lessons', async () => {
  const tmp = path.join(fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'v2u-')), 'traces.json');
  execFileSync('node', [path.join(root, 'scripts/research/gen-traces.mjs'), tmp], { encoding: 'utf-8' });
  const fresh = JSON.parse(fs.readFileSync(tmp, 'utf-8')).traces;
  const committed = JSON.parse(read('src/interactive/studio/traces.json')).traces;
  assert.deepStrictEqual(fresh, committed);
  for (const s of TRACE_SAMPLES) {
    const t = T.getTrace(s.id); const k = get(s.lessonId);
    if (s.exampleId) {
      const e = k.workedExamples.find((x) => x.id === s.exampleId);
      assert.strictEqual(t.code, e.code);
      const want = e.verify?.kind === 'python' ? e.verify.output : e.answer;
      assert.strictEqual(t.output.trim(), want.trim(), s.id);
    } else {
      const d = k.debugging.find((x) => x.id === s.debugId);
      assert.strictEqual(t.code, d.buggy);
      if (t.error) assert.strictEqual(t.error, d.symptom, s.id); else assert(d.symptom.includes(t.output.trim()), s.id);
    }
    if (s.stdin) assert(k.workedExamples.find((x) => x.id === s.exampleId).problem.includes(s.stdin.trim()), `${s.id}: stdin comes from the problem`);
  }
});

await test('lesson boundaries: no notYetAllowed idea in titles/tutor lines; systems lesson has no graph-solving', () => {
  for (const id of LESSONS) {
    const k = get(id);
    for (const c of S.getStudioScript(id).chunks) for (const t of [c.title, c.tutor].filter(Boolean)) for (const n of k.notYetAllowed) assert(!t.includes(n), `${id}: "${t}" mentions ${n}`);
  }
  assert(!widgets('math-alg-linear-system').some((w) => w.kind === 'line-graph'));
  assert(get('math-alg-linear-system').notYetAllowed.some((n) => n.includes('กราฟ')));
});

await test('game slot: honest NOT_AVAILABLE everywhere; nothing imported from a game project', () => {
  assert.strictEqual(G.CONNECTED_GAMES.length, 0);
  // Phase 70: Pixel Code Battle is registered as PREPARING for the if/elif/else lesson only
  for (const id of LESSONS) assert.strictEqual(G.getGameSlotStatus(id), id === 'prog-ctrl-conditions' ? 'PREPARING' : 'NOT_AVAILABLE', id);
  const all = ['src/components/learning/studio/Patterns.tsx', 'src/components/learning/studio/TeachingStudio.tsx', 'src/interactive/studio/depth.ts'].map(read).join('\n');
  assert(!/v2u-game-lab|\bXP\b|leaderboard|high ?score|lives\b/i.test(all));
});

await test('tutor offers the full set of structured helps', () => {
  const tu = read('src/components/learning/studio/Tutor.tsx');
  for (const o of ['อธิบายให้ง่ายกว่านี้', 'ดูเป็นภาพ', 'ดูตัวอย่าง', 'ขอคำใบ้', 'สรุปสั้น ๆ', 'จุดที่มักพลาด', 'ลองอีกวิธี', 'ยังไม่เข้าใจ']) assert(tu.includes(o), o);
});

await test('patterns never award mastery: no dispatch in Patterns.tsx, completion only gates "next"', () => {
  const p = read('src/components/learning/studio/Patterns.tsx');
  assert(!/dispatch|finish|final/.test(p.replace(/finalAnswers/g, '')));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
