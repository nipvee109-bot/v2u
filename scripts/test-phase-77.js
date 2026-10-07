/** Phase 77: P0 per-lesson learning mechanics, wave 1 (docs/per-lesson-learning-mechanics.md).
 *  - phy-kin-1d  Motion over time: predict → RUN → actual vs predicted; changed parameters; goals; equation choice
 *  - phy-vec-units  Cancellation tiles: orientation decides the units; the number only after the units match
 *  - math-alg-linear-system  Substitution machine + Story → Model translator with meaning-based feedback
 *  - prog-py-io  Be-the-user console: interpreter cross-checked against real python3
 *  - self-rated steps replaced by machine-checked attempts in THESE four lessons only
 *  - lesson count, proposed curriculum, admission readiness, Diagnostic and Next Step unchanged */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { execPython } from './lib/crossPlatform.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
globalThis.React = React; // jiti compiles JSX with the classic runtime
const jiti = createJiti(import.meta.url, { jsx: true });
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (err) { console.log(`  ❌ ${name}\n     ${err.message}`); failed++; }
}

console.log('=== Phase 77: P0 per-lesson learning mechanics (wave 1) ===\n');
const KIN = await jiti.import(path.join(root, 'src/interactive/mechanics/kinematics.ts'));
const U = await jiti.import(path.join(root, 'src/interactive/mechanics/units.ts'));
const LS = await jiti.import(path.join(root, 'src/interactive/mechanics/linearSystem.ts'));
const PY = await jiti.import(path.join(root, 'src/interactive/mechanics/pyConsole.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const IE = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const S = await jiti.import(path.join(root, 'src/interactive/studio/scripts.ts'));
const DP = await jiti.import(path.join(root, 'src/interactive/studio/depth.ts'));
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const SR = await jiti.import(path.join(root, 'src/subjects/registry.ts'));
const { DIAGNOSTIC_ITEMS } = await jiti.import(path.join(root, 'src/diagnostic/items.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const M = {
  MotionLab: (await jiti.import(path.join(root, 'src/components/learning/mechanics/MotionLab.tsx'))).MotionLab,
  UnitTiles: (await jiti.import(path.join(root, 'src/components/learning/mechanics/UnitTiles.tsx'))).UnitTiles,
  Substitution: (await jiti.import(path.join(root, 'src/components/learning/mechanics/Substitution.tsx'))).Substitution,
  StoryModel: (await jiti.import(path.join(root, 'src/components/learning/mechanics/StoryModel.tsx'))).StoryModel,
  PyConsole: (await jiti.import(path.join(root, 'src/components/learning/mechanics/PyConsole.tsx'))).PyConsole,
};

const P0 = ['phy-kin-1d', 'phy-vec-units', 'math-alg-linear-system', 'prog-py-io'];
const lesson = (id) => IR.getInteractiveLesson(id);
const step = (id, sid) => lesson(id).steps.find((s) => s.id === sid).interaction;
const ex = (id, eid) => K.getLessonKnowledge(id).workedExamples.find((e) => e.id === eid);

console.log('1. phy-kin-1d — Motion over time');
await test('position/time follows s = ut + ½at²; braking stops and never reverses', () => {
  assert.deepStrictEqual(KIN.marksUntil(4, 0, 3).map((m) => m.x), [0, 4, 8, 12]);
  assert.deepStrictEqual(KIN.marksUntil(0, 2, 4).map((m) => m.x), [0, 1, 4, 9, 16]);
  assert.deepStrictEqual(KIN.spacings(KIN.marksUntil(0, 2, 4)), [1, 3, 5, 7], 'growing spacing = visible acceleration');
  const stop = KIN.motionAt(20, -4, 9);
  assert.strictEqual(stop.x, 50); assert.strictEqual(stop.v, 0); assert(stop.stopped);
  assert.strictEqual(KIN.motionAt(20, -4, 5).x, KIN.motionAt(20, -4, 8).x, 'stays at the stop line');
});
await test('a wrong prediction shows the prediction next to the actual position', () => {
  const r = KIN.judgePrediction(8, 10, 0.5, [4, 4]);
  assert(!r.ok && r.message.includes('คุณคาดไว้: 8 m') && r.message.includes('รถอยู่จริง: 10 m'));
  assert(KIN.judgePrediction(9.9, 10, 0.5, []).ok);
  assert(KIN.judgePrediction(6, 9, 0.5, [1, 3, 5]).message.includes('ไกลขึ้น'), 'speeding hint uses the growing spacing');
});
await test('lesson predictions are reachable: each asked second has a real position on the track', () => {
  for (const sid of ['steady', 'speeding']) {
    const i = step('phy-kin-1d', sid);
    assert(i.mode === 'predict' && i.predictAt.length >= 2);
    for (const t of i.predictAt) { assert(t > i.shownUntil); assert(KIN.motionAt(i.u, i.a, t).x <= i.trackMax, `${sid} t=${t} on the track`); }
  }
});
await test('changing parameters changes the outcome; goals are reachable with the lesson sliders', () => {
  const flag = step('phy-kin-1d', 'flag');
  const grid = (r) => { const out = []; for (let v = r[0]; v <= r[1] + 1e-9; v += r[2]) out.push(+v.toFixed(3)); return out; };
  const wins = grid(flag.controls.u).flatMap((u) => grid(flag.controls.a).filter((a) => KIN.judgeGoal(flag.goal, u, a, flag.tol).ok).map((a) => [u, a]));
  assert(wins.length >= 3, 'several (u, a) pairs reach the flag');
  for (const [u, a] of wins) assert(Math.abs(KIN.motionAt(u, a, 5).x - 50) <= flag.tol);
  assert(!KIN.judgeGoal(flag.goal, 5, 0, flag.tol).ok && KIN.judgeGoal(flag.goal, 5, 0, flag.tol).message.includes('ยังไม่ถึงธง'));
  const brake = step('phy-kin-1d', 'brake');
  const ok = grid(brake.controls.a).filter((a) => KIN.judgeGoal(brake.goal, brake.u, a, brake.tol).ok);
  assert.deepStrictEqual(ok, [-4], 'only a = −4 stops at 50 m');
  assert(KIN.judgeGoal(brake.goal, brake.u, 1, brake.tol).message.includes('เร่งขึ้น'), 'positive a: the car speeds up instead of braking');
  const k2 = ex('phy-kin-1d', 'we-2');
  assert(k2.problem.includes(`${brake.u} m/s`) && k2.problem.includes('4 m/s²') && k2.answer.startsWith(`s = ${brake.goal.x} m`));
});
await test('equation choice: only equations whose variables are all known/asked are usable; answer matches', () => {
  const e = step('phy-kin-1d', 'pick-equation').equation;
  const use = KIN.usableEquations(Object.keys(e.known), e.unknown).map((x) => x.ruleId);
  assert.deepStrictEqual(use, ['r-2']);
  assert.strictEqual(e.known.u * e.answer + 0.5 * e.known.a * e.answer ** 2, e.known.s);
  assert.deepStrictEqual(KIN.usableEquations(['u', 'a', 't'], 'v').map((x) => x.ruleId), ['r-1']);
});

console.log('\n2. phy-vec-units — Cancellation tiles');
const unitsFor = (sid, placed) => { const i = step('phy-vec-units', sid); return U.evaluateUnits(i.value, i.from, i.to, i.tiles, placed); };
await test('correct orientation cancels the units and gives the worked-example number', () => {
  const combos = [false, true].flatMap((fk) => [false, true].map((fh) => unitsFor('kmh-ms', [{ id: 'km-m', flipped: fk }, { id: 'h-s', flipped: fh }])));
  assert.strictEqual(combos.filter((x) => x.matches).length, 1, 'exactly one orientation pair cancels');
  const good = combos.find((x) => x.matches);
  assert.strictEqual(+good.value.toFixed(9), 20);
  assert(good.occurrences.filter((o) => o.unit === 'km' || o.unit === 'h').every((o) => o.cancelled));
  assert.strictEqual(step('phy-vec-units', 'kmh-ms').answer, 20);
  assert(ex('phy-vec-units', 'we-1').problem.includes('72') && ex('phy-vec-units', 'we-1').answer === '20 m/s');
});
await test('wrong orientation leaves unmatched units (km²/m) and gives orientation feedback', () => {
  const i = step('phy-vec-units', 'kmh-ms');
  const tries = [false, true].map((f) => U.evaluateUnits(i.value, i.from, i.to, i.tiles, [{ id: 'km-m', flipped: f }]));
  const bad = tries.find((x) => x.remainingText.includes('km²'));
  assert(bad && !bad.matches, 'km on the same side twice → km²');
  assert(bad.remainingText.includes('km²/') && bad.remainingText.includes('m'), bad.remainingText);
  const fb = U.unitFeedback(bad, i.to);
  assert(fb.includes('km') && fb.includes('ผิดด้าน'), fb);
  const decoy = U.evaluateUnits(i.value, i.from, i.to, i.tiles, [{ id: 'min-s', flipped: true }]);
  assert(!decoy.matches && U.unitFeedback(decoy, i.to).includes('ไม่มี min'), 'an unrelated factor is named as unrelated');
});
await test('the number exists only after a valid cancellation; decoy tile never matches', () => {
  for (const sid of ['kg-g', 'kmh-ms', 'ms-kmh']) {
    const i = step('phy-vec-units', sid);
    assert(!U.evaluateUnits(i.value, i.from, i.to, i.tiles, []).matches, `${sid}: nothing placed = no number`);
    const ids = i.tiles.map((t) => t.id);
    let found = 0;
    for (let mask = 0; mask < 1 << (ids.length * 2); mask++) {
      const placed = ids.flatMap((id, k) => ((mask >> (2 * k)) & 1 ? [{ id, flipped: !!((mask >> (2 * k + 1)) & 1) }] : []));
      const r = U.evaluateUnits(i.value, i.from, i.to, i.tiles, placed);
      if (r.matches) { found++; assert(Math.abs(r.value - i.answer) < 1e-9, `${sid}: ${r.value}`); assert(!placed.some((p) => p.id === 'min-s'), 'decoy tile cannot be part of a match'); }
    }
    assert(found >= 1, `${sid} solvable`);
  }
  const src = read('src/components/learning/mechanics/UnitTiles.tsx');
  assert(/ev\.matches/.test(src), 'UI gates the number on matches');
  assert.strictEqual(step('phy-vec-units', 'ms-kmh').answer, 54);
  assert(ex('phy-vec-units', 'we-2').answer === '750 g' && step('phy-vec-units', 'kg-g').answer === 750);
});

console.log('\n3. math-alg-linear-system — Substitution machine + Story → Model');
await test('substitution replaces x only (x = y + 2) and leaves one unknown; answer = worked example 1', () => {
  const i = step('math-alg-linear-system', 'substitute');
  const sub = LS.rearrangeForX(i.relation);
  assert.strictEqual(sub.text, 'x = y + 2');
  const t = LS.substitutedText(i.target, sub);
  assert(t.includes('(y + 2)') && !/x/.test(t), t);
  assert.deepStrictEqual(LS.solveSubstituted(i.target, sub), { x: 4, y: 2 });
  assert(LS.holds(i.relation, 4, 2) && LS.holds(i.target, 4, 2));
  const e1 = ex('math-alg-linear-system', 'we-1');
  assert(e1.problem.includes('3x + 2y = 16') && e1.problem.includes('x − y = 2'));
  const src = read('src/components/learning/mechanics/Substitution.tsx');
  assert(src.includes("t.kind !== 'x'"), 'tapping y is refused with feedback');
});
await test('story rows: valid mapping passes; wrong mappings explain what the equation MEANS', () => {
  const i = step('math-alg-linear-system', 'tickets');
  const [count, money] = i.rows;
  assert(LS.checkStoryRow(count, { a: 'one', b: 'one', c: 'n20' }, i.chips, i.names, i.kindOfStory).ok);
  assert(LS.checkStoryRow(money, { a: 'p60', b: 'p40', c: 'm1040' }, i.chips, i.names, i.kindOfStory).ok);
  const swap = LS.checkStoryRow(money, { a: 'p40', b: 'p60', c: 'm1040' }, i.chips, i.names, i.kindOfStory);
  assert(!swap.ok && swap.message.startsWith('สมการนี้หมายความว่า') && swap.message.includes('แต่โจทย์บอกว่า'), swap.message);
  const mixed = LS.checkStoryRow(money, { a: 'one', b: 'p40', c: 'm1040' }, i.chips, i.names, i.kindOfStory);
  assert(!mixed.ok && mixed.message.includes('“จำนวน” กับ “เงิน”'), mixed.message);
  const total = LS.checkStoryRow(count, { a: 'one', b: 'one', c: 'm1040' }, i.chips, i.names, i.kindOfStory);
  assert(!total.ok && total.message.includes('สมการนี้หมายความว่า'), total.message);
  for (const r of i.rows) assert(LS.holds(r.expect, i.solution.x, i.solution.y));
  assert.notStrictEqual(i.solution.x, i.solution.y, 'asymmetric answer: a swapped naming is really tested');
  assert.deepStrictEqual(i.phrases.filter((p) => p.is !== 'given').map((p) => p.is).sort(), ['x', 'y']);
  const n = step('math-alg-linear-system', 'numbers');
  const wrong = LS.checkStoryRow(n.rows.find((r) => r.id === 'diff'), { a: 'one', b: 'one', c: 'c6' }, n.chips, n.names, n.kindOfStory);
  assert(!wrong.ok && wrong.message.includes('สมการนี้หมายความว่า สองจำนวนบวกกันได้ 6') && wrong.message.includes('แต่โจทย์บอกว่า'), wrong.message);
  for (const r of n.rows) assert(LS.holds(r.expect, n.solution.x, n.solution.y));
});
await test('naming the unknowns the other way round is accepted (model is swapped, not marked wrong)', () => {
  const src = read('src/components/learning/mechanics/StoryModel.tsx');
  assert(src.includes("px?.is === 'y' && py?.is === 'x'") && src.includes('setSwapped(true)'));
  const i = step('math-alg-linear-system', 'tickets');
  const swappedRows = i.rows.map((r) => ({ a: r.expect.b, b: r.expect.a, c: r.expect.c }));
  for (const r of swappedRows) assert(LS.holds(r, i.solution.y, i.solution.x));
});

console.log('\n4. prog-py-io — Be the user');
await test('input is stored as str; int() converts "16" → 16; numeric op on str fails like Python', () => {
  const bad = PY.runConsole('age = input("อายุ: ")\nprint(age + 1)', ['16']);
  assert.deepStrictEqual(bad.vars.age, { t: 'str', v: '16' });
  assert.strictEqual(bad.error, 'TypeError: can only concatenate str (not "int") to str');
  assert.strictEqual(bad.errorLine, 2);
  const good = PY.runConsole('age = int(input("อายุ: "))\nprint(age + 1)', ['16']);
  assert.deepStrictEqual(good.vars.age, { t: 'int', v: 16n });
  const conv = good.events.find((e) => e.kind === 'convert');
  assert(conv && conv.fn === 'int' && conv.from.t === 'str' && conv.from.v === '16' && conv.to.t === 'int');
  assert.strictEqual(good.stdout, 'อายุ: 17\n');
  const wait = PY.runConsole('age = int(input("อายุ: "))\nprint(age + 1)', []);
  assert(!wait.done && wait.waitingFor.prompt === 'อายุ: ' && wait.waitingFor.line === 1);
});
const pyPrograms = () => {
  const out = [];
  for (const s of lesson('prog-py-io').steps) {
    const i = s.interaction;
    out.push(i.program, ...(i.fixes ?? []).map((f) => f.program));
  }
  return [...new Set(out)];
};
await test('interpreter = real python3 for every lesson program × many inputs (stdout + error)', () => {
  const inputs = ['16', ' 16 ', '-3', '+7', '1_000', '๑๖', 'abc', '', '5', '3.5', 'สมชาย', '0', '007'];
  let n = 0;
  for (const prog of pyPrograms()) {
    for (const inp of inputs) {
      let stdout, err;
      try { stdout = execPython(['-c', prog], { input: `${inp}\n` }); }
      catch (e) { stdout = e.stdout; err = e.stderr.trim().split('\n').at(-1); }
      const r = PY.runConsole(prog, [inp]);
      assert.strictEqual(r.stdout, stdout, `${JSON.stringify(prog)} ← ${JSON.stringify(inp)}`);
      assert.strictEqual(r.error, err, `${JSON.stringify(prog)} ← ${JSON.stringify(inp)} error`);
      n++;
    }
  }
  assert(n >= 70, `${n} cases`);
});
await test('output reflects the input; prediction choices match what the program really prints', () => {
  const g = step('prog-py-io', 'greet');
  assert(PY.runConsole(g.program, ['มะลิ']).stdout.endsWith('สวัสดี มะลิ\n'));
  const d = step('prog-py-io', 'double');
  for (const p of d.predictions) {
    const r = PY.runConsole(d.program, [p.input]);
    const shown = r.events.filter((e) => e.kind === 'print').map((e) => e.text).join(' / ');
    assert.strictEqual(p.choices[p.correctIndex], shown);
    assert.strictEqual(p.choices.filter((c) => c === shown).length, 1);
  }
});
await test('fixes: only the correct fixes run without error AND give the intended output', () => {
  for (const sid of ['age', 'fstring']) {
    const i = step('prog-py-io', sid);
    const before = PY.runConsole(i.program, ['16']);
    assert(sid === 'age' ? before.error : before.stdout.includes('{age + 1}'), `${sid}: the starting program is visibly wrong`);
    for (const f of i.fixes) {
      const r = PY.runConsole(f.program, ['16']);
      const intended = !r.error && r.stdout.includes('17') && !r.stdout.includes('{');
      assert.strictEqual(intended, f.correct, `${sid}: ${f.label}`);
    }
  }
  const src = read('src/components/learning/mechanics/PyConsole.tsx');
  assert(src.includes("startsWith('ValueError')"), 'a non-number typed by the user is explained, not counted as a code mistake');
  assert(!/\beval\(|new Function/.test(read('src/interactive/mechanics/pyConsole.ts')), 'no eval of learner code');
});

console.log('\n5. Lessons, scripts and evidence');
await test('four lessons are authored, valid, machine-checked (no self-rated steps), all steps in their scripts', () => {
  assert.deepStrictEqual(IR.validateInteractiveLessons(), []);
  let replaced = 0;
  for (const id of P0) {
    const l = lesson(id);
    assert.strictEqual(l.source, 'authored', id);
    assert(!l.steps.some((s) => s.interaction?.kind === 'self'), `${id}: no self-rated step`);
    assert(l.steps.every((s) => s.interaction && s.interaction.kind !== 'self'), `${id}: every step is checked`);
    replaced += IR.generateInteractiveLesson(id).steps.filter((s) => s.interaction?.kind === 'self').length;
    const sc = S.getStudioScript(id);
    assert(S.STUDIO_SCRIPTS.includes(sc), `${id}: hand-authored script`);
    const used = sc.chunks.filter((c) => c.kind === 'step').map((c) => c.stepId);
    assert.deepStrictEqual([...used].sort(), l.steps.map((s) => s.id).sort(), `${id}: every step played once`);
    assert.strictEqual(sc.chunks[0].kind, 'hook'); assert.strictEqual(sc.chunks.at(-1).kind, 'summary');
    const order = ['understand', 'try', 'practice'];
    for (let k = 1; k < sc.chunks.length; k++) assert(order.indexOf(sc.chunks[k].phase) >= order.indexOf(sc.chunks[k - 1].phase), `${id}: phases in order`);
    assert(sc.chunks.findIndex((c) => c.kind === 'step' || c.kind === 'widget') < sc.chunks.findIndex((c) => c.kind === 'explain'), `${id}: experience before explanation`);
    assert(sc.chunks.find((c) => c.kind === 'practice').practiceIds.length >= 3, `${id}: independent practice`);
    const plan = DP.DEPTH_PLANS.find((p) => p.lessonId === id);
    assert(plan.after === 'REFERENCE_COMPLETE' && plan.inserts.length === 0, `${id}: depth plan`);
  }
  assert.strictEqual(replaced, 14, 'self-rated steps replaced');
  // guided steps use their own numbers, so the independent practice is a genuinely new situation
  const kin = step('phy-kin-1d', 'pick-equation').equation; const num = step('math-alg-linear-system', 'numbers');
  assert(!K.getLessonKnowledge('phy-kin-1d').independent.some((p) => p.prompt.includes(String(kin.known.s) + ' m') && p.prompt.includes(String(kin.known.a) + ' m/s²')));
  assert(!K.getLessonKnowledge('math-alg-linear-system').independent.some((p) => p.prompt.includes(String(num.rows[0].expect.c)) && p.prompt.includes(String(num.rows[1].expect.c))));
  // other lessons untouched: everything else that was generated is still generated
  for (const l of C.lessons.filter((x) => !P0.includes(x.id))) {
    const a = IR.AUTHORED_LESSONS.find((x) => x.lessonId === l.id);
    if (!a) assert.strictEqual(lesson(l.id).source, 'generated', l.id);
  }
});
await test('evidence: mechanics only answer/hint/reveal; practice summary counts them; no mastery/review/next step', () => {
  const l = lesson('prog-py-io');
  let st = IE.initialPlayerState();
  st = IE.playerReducer(st, { type: 'answer', stepId: 'age', correct: false });
  st = IE.playerReducer(st, { type: 'answer', stepId: 'age', correct: true });
  st = IE.playerReducer(st, { type: 'reveal', stepId: 'fstring' });
  const sum = IE.summarize(l, st);
  assert.deepStrictEqual(sum.practice, { total: 4, solved: 1, revealed: 1 });
  for (const f of ['mastery', 'masteryScore', 'nextReview', 'nextStep']) assert(!(f in sum), f);
  for (const f of fs.readdirSync(path.join(root, 'src/components/learning/mechanics'))) {
    const s = read(`src/components/learning/mechanics/${f}`).replace(/\/\*[\s\S]*?\*\//g, '');
    assert(!/\buseStore\b|\bmastery\b|nextReview|\bnextStep\b|diagnostic/i.test(s), `${f} never touches learner state`);
    assert(!/\bXP\b|coins?\b|streak/i.test(s), `${f}: no XP/coins/streaks`);
  }
});
await test('SSR smoke: every P0 step renders its mechanic with labels and text state', () => {
  const comp = { motion: M.MotionLab, units: M.UnitTiles, substitute: M.Substitution, story: M.StoryModel, console: M.PyConsole };
  for (const id of P0) for (const s of lesson(id).steps) {
    const html = renderToStaticMarkup(React.createElement(comp[s.interaction.kind], { interaction: s.interaction, result: IE.EMPTY_RESULT, onAnswer() {}, onHint() {}, onReveal() {} }));
    assert(html.length > 200 && html.includes(s.interaction.prompt.slice(0, 12)), `${id}/${s.id}`);
    assert(/aria-label=|<label|<legend/.test(html), `${id}/${s.id}: labelled controls`);
  }
  const tsx = read('src/components/learning/studio/TeachingStudio.tsx') + read('src/components/learning/InteractivePlayer.tsx');
  for (const n of Object.values(comp)) assert(tsx.includes(`<${n.name}`), n.name);
});

console.log('\n6. Boundaries — nothing else moves');
await test('lesson count unchanged (20); proposed curriculum inactive; Diagnostic items unchanged', () => {
  assert.strictEqual(C.lessons.length, 20);
  for (const s of SR.SUBJECT_REGISTRY.filter((x) => x.status === 'proposed')) assert(!C.subjects.some((c) => c.id === s.id), `${s.id} inactive`);
  assert(!C.lessons.some((l) => /^(web-css|web-js|sql|net)/.test(l.id)));
  assert(!fs.readdirSync(path.join(root, 'src/interactive/lessons')).some((f) => /css|js\.ts|sql|network/i.test(f)));
  const dsrc = read('src/diagnostic/items.ts') + read('src/diagnostic/engine.ts');
  assert(!/perLessonP0|mechanics\//.test(dsrc), 'Diagnostic does not read the mechanics');
  assert(DIAGNOSTIC_ITEMS.length > 0);
});
await test('admission readiness and Next Step do not read mechanics; same inputs → same outputs', () => {
  const base = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
  assert.deepStrictEqual(CE.getPathwayReadiness(base), CE.getPathwayReadiness(structuredClone(base)));
  assert.strictEqual(getNextStep({ lessons: base }).todayAction, getNextStep({ lessons: structuredClone(base) }).todayAction);
  for (const f of ['src/curriculum/engine.ts', 'src/utils/nextStep.ts', 'src/store/useStore.ts']) assert(!/mechanics\/|perLessonP0/.test(read(f)), f);
  assert(!/mechanics|perLessonP0/.test(fs.readdirSync(path.join(root, 'src')).join(' ')));
});
await test('Game Lab untouched; no new dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  assert(!Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((d) => /pyodide|brython|skulpt/i.test(d)));
  for (const f of fs.readdirSync(path.join(root, 'src/components/learning/mechanics'))) assert(!/game|battle/i.test(read(`src/components/learning/mechanics/${f}`).replace(/\/\*[\s\S]*?\*\//g, '')), f);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
process.exit(failed ? 1 : 0);
