/** Phase 75: all-subject learning interaction audit + Python condition state panel.
 *  - docs/learning-interaction-matrix.md covers every curriculum lesson and skill (and invents none)
 *  - runBranches records each condition as written; the robot widgets render a state panel
 *  - boundaries: curriculum subjects and game registry unchanged */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

console.log('=== Phase 75: learning interaction matrix + Python state panel ===\n');
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const B = await jiti.import(path.join(root, 'src/interactive/studio/branchRunner.ts'));
const G = await jiti.import(path.join(root, 'src/learning/games/registry.ts'));
const W = await jiti.import(path.join(root, 'src/components/learning/studio/Widgets.tsx'));
const doc = fs.readFileSync(path.join(root, 'docs/learning-interaction-matrix.md'), 'utf-8');

await test('matrix covers every lesson with its skills', () => {
  for (const l of C.lessons) {
    assert(doc.includes(`**${l.id}**`), `lesson ${l.id} missing`);
    const block = doc.slice(doc.indexOf(`**${l.id}**`)).split('\n\n**')[0];
    for (const s of l.skillIds) assert(block.includes(s), `${l.id}: skill ${s} missing`);
  }
});

await test('matrix lesson ids all exist (no invented lessons)', () => {
  const ids = new Set(C.lessons.map((l) => l.id));
  const cited = [...doc.matchAll(/^\*\*([a-z0-9-]+)\*\*/gm)].map((m) => m[1]);
  assert.strictEqual(cited.length, C.lessons.length);
  for (const id of cited) assert(ids.has(id), `unknown lesson ${id}`);
});

await test('matrix independent challenges quote the lesson\'s own level-3 items', () => {
  for (const l of C.lessons) {
    const block = doc.slice(doc.indexOf(`**${l.id}**`)).split('\n\n**')[0];
    const lvl3 = K.getLessonKnowledge(l.id).independent.filter((i) => i.level === 3).map((i) => i.id);
    for (const id of lvl3) assert(block.includes(id), `${l.id}: ${id} not cited`);
  }
});

await test('curriculum still has only math / programming / physics', () => {
  assert.deepStrictEqual([...new Set(C.lessons.map((l) => l.subjectId))].sort(), ['math', 'physics', 'programming']);
  assert.strictEqual(C.lessons.length, 15);
});

await test('game registry unchanged: only Pixel Code Battle, PREPARING, no learning effects', () => {
  assert.deepStrictEqual(G.GAME_REGISTRY.map((g) => [g.gameId, g.status, g.learningEffectsActive, g.lessonIds.join()]), [['pixel-code-battle', 'PREPARING', false, 'prog-ctrl-conditions']]);
});

const we1 = K.getLessonKnowledge('prog-ctrl-conditions').workedExamples.find((e) => e.id === 'we-1').code;

await test('each test step records the condition as written and its substituted form', () => {
  for (const v of [95, 72, 40]) {
    const run = B.runBranches(B.withValue(we1, v));
    const lines = B.withValue(we1, v).split('\n');
    const tests = run.steps.filter((s) => s.kind === 'test');
    assert(tests.length >= 1);
    for (const s of tests) {
      const cond = lines[s.line].replace(/^(if|elif)\s+/, '').replace(/:\s*$/, '').replace(/\s+/g, ' ');
      assert.strictEqual(s.source, cond, `line ${s.line + 1}`);
      const [name] = s.source.split(' ');
      assert.strictEqual(s.note.split(' → ')[0], s.source.replace(name, String(v)));
      assert.match(s.note, /→ (True|False)$/);
    }
    for (const s of run.steps.filter((x) => x.kind !== 'test')) assert.strictEqual(s.source, undefined);
  }
});

await test('robot widgets render a labelled state panel (memory empty before Run)', () => {
  const out = renderToStaticMarkup(React.createElement(W.RobotRun, { code: we1, values: [95, 72, 40], onDone() {} }));
  assert.match(out, /data-testid="robot-state" role="group" aria-label="สิ่งที่ Python กำลังคิด"/);
  assert.match(out, /หน่วยความจำ/);
  assert.match(out, /ยังว่าง — กด Run/);
  const dbg = K.getLessonKnowledge('prog-ctrl-conditions').independent.concat(K.getLessonKnowledge('prog-ctrl-conditions').guided).find((p) => p.id === 'i-3');
  const out2 = renderToStaticMarkup(React.createElement(W.RobotDebug, { code: dbg.code, explanation: dbg.explanation, onDone() {} }));
  assert.match(out2, /data-testid="robot-state"/);
});

await test('state panel shows True/False as text, not colour alone', () => {
  const src = fs.readFileSync(path.join(root, 'src/components/learning/studio/Widgets.tsx'), 'utf-8');
  assert(src.includes("'True ✓ ทำทางนี้'") && src.includes("'False ✗ ข้ามทางนี้'"));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed) process.exitCode = 1;
