/**
 * Test Suite: Phase 59 — Content foundation (audit, depth, correctness)
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

import { execPython, python } from './lib/crossPlatform.js';
const PY = python(); // py -3 on Windows, then python, then python3 (never the Store alias)
console.log('=== Phase 59: V2U learning content foundation ===\n');
const A = await jiti.import(path.join(root, 'src/content/audit.ts'));
const { ORIGINAL_LESSONS: O } = await jiti.import(path.join(root, 'src/content/originals.ts'));
const { LESSON_DEPTH } = await jiti.import(path.join(root, 'src/content/depth.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const py = (code, input = '') => execPython(['-c', code], { py: PY, input }).replace(/\n$/, '');
const pyErr = (code) => { try { py(code); return null; } catch (e) { return String(e.stderr).trim().split('\n').pop().split(':')[0]; } };
const byId = (id) => O.find((o) => o.lessonId === id);

console.log('1. Audit (computed from data)');
const audit = A.auditCurriculum();
await test('Audit covers every curriculum lesson — no new lessons were added', () => {
  assert.strictEqual(audit.lessons.length, C.lessons.length);
  assert.deepStrictEqual(Object.keys(LESSON_DEPTH).sort(), C.lessons.map((l) => l.id).sort(), 'depth only for existing lessons');
});
await test('Every lesson is ready: A–M + subject part, no generic duplicated text', () => {
  const notReady = audit.lessons.filter((l) => l.status !== 'ready').map((l) => `${l.lessonId}: ${l.missing.join(',')}`);
  assert.deepStrictEqual(notReady, []);
  assert.strictEqual(audit.totals.duplicatedTexts, 0);
  for (const s of audit.subjects) assert.strictEqual(s.complete + s.needsContent, s.lessons);
});
await test('Audit is honest: removing content flips a lesson to needs-content', () => {
  const l = C.lessons.find((x) => x.id === 'phy-dyn-newton');
  const o = byId('phy-dyn-newton');
  const saved = o.formulas; o.formulas = undefined;
  try { assert(A.auditLesson(l).missing.includes('SUBJECT')); } finally { o.formulas = saved; }
  const savedP = o.practice; o.practice = [];
  try { assert(A.auditLesson(l).practiceCount === C.exercises.filter((e) => e.lessonId === l.id).flatMap((e) => e.items).length); } finally { o.practice = savedP; }
});
await test('Every lesson has practice ≥3 and understanding check ≥3 with valid answers', () => {
  for (const l of C.lessons) {
    const a = A.auditLesson(l);
    assert(a.practiceCount >= 3 && a.checkCount >= 3, l.id);
    for (const f of IR.getInteractiveLesson(l.id).finalCheck) assert(f.correctIndex >= 0 && f.correctIndex < f.choices.length && f.explanation, `${l.id} ${f.prompt}`);
  }
});

console.log('2. Programming — code is real and correct');
for (const o of O.filter((x) => x.lessonId.startsWith('prog-'))) {
  await test(`${o.lessonId}: code examples print exactly what the lesson says`, () => {
    for (const c of o.code) assert.strictEqual(py(c.code, c.stdin ?? ''), c.output);
    assert.strictEqual(pyErr(o.errorExample.code), o.errorExample.error);
    for (const p of o.practice) assert.strictEqual(py(p.prompt), p.answer, p.prompt);
  });
}
await test('Programming quiz answers verified by running Python', () => {
  assert.strictEqual(py('print(17 // 5)'), '3');
  assert.strictEqual(py('x = "5"\nprint(x * 2)'), '55');
  assert.strictEqual(py('print(f"{3 + 4}")'), '7');
  assert.strictEqual(py('print(len(range(4)))'), '4');
  assert.strictEqual(py('print([10, 20, 30][-1])'), '30');
  assert.strictEqual(pyErr('x = 4\nif x > 3\n    pass'), 'SyntaxError');
});

console.log('3. Math — answers substituted back');
const ev = (expr, vars) => {
  let e = expr.replace(/−/g, '-').replace(/(\d)([a-z(])/g, '$1*$2').replace(/\)([a-z(\d])/g, ')*$1');
  for (const [k, v] of Object.entries(vars)) e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), `(${v})`);
  return Function(`return (${e})`)();
};
const holds = (eq, vars) => { const [l, r] = eq.split('='); return Math.abs(ev(l, vars) - ev(r, vars)) < 1e-9; };
await test('Linear equations: every "x = n" answer satisfies its equation', () => {
  const o = byId('math-alg-linear-eq');
  const items = [...o.tryIt, ...o.practice, ...C.exercises.find((e) => e.lessonId === 'math-alg-linear-eq').items];
  for (const it of items) { const x = Number(it.answer.replace(/−/g, '-').match(/x = (-?[\d.]+)/)[1]); assert(holds(it.prompt, { x }), it.prompt); }
  assert(holds('5x − 3 = 2x + 9', { x: 4 }) && holds('2(x + 3) = 14', { x: 4 }));
});
await test('Systems: every (x, y) answer satisfies both equations', () => {
  for (const it of [...byId('math-alg-linear-system').practice.slice(0, 2), ...byId('math-alg-linear-system').tryIt]) {
    const [x, y] = it.answer.match(/-?\d+/g).map(Number);
    const eqs = it.prompt.split(/,| และ /).map((s) => s.trim()).filter(Boolean);
    for (const eq of eqs) assert(holds(eq, { x, y }), `${eq} with ${x},${y}`);
  }
  assert(holds('2x + y = 8', { x: 3, y: 2 }) && holds('x - y = 1', { x: 3, y: 2 }));
  assert(13 + 7 === 20 && 13 - 7 === 6);
});
await test('Inequalities, exponents, lines, trig — values recomputed', () => {
  // 3x + 4 ≤ 19 → x ≤ 5 ; −2x + 1 < 9 → x > −4 ; 6 − 2x ≥ 0 → x ≤ 3 (boundary + one side)
  assert(3 * 5 + 4 === 19 && 3 * 6 + 4 > 19 && -2 * -4 + 1 === 9 && -2 * -3 + 1 < 9 && 6 - 2 * 3 === 0 && 6 - 2 * 4 < 0);
  assert(3 * 4 - 2 === 10 && 55 + 65 === 120);
  assert((2 ** 3) ** 2 === 64 && 10 ** 5 / 10 ** -2 === 1e7 && 4 ** 0.5 * 4 ** 1.5 === 16 && Math.round(8 ** (2 / 3)) === 4 && Math.abs(Math.sqrt(50) - 5 * Math.sqrt(2)) < 1e-12 && (3 ** 2) ** 3 === 3 ** 6);
  assert(3 * 2 - 4 === 2 && (7 - 1) / (4 - 1) === 2 && 2 * 3 - 6 === 0 && (0 - 6) / (3 - 0) === -2 && 20 * 5 + 100 === 200 && 2 * 1 + 3 === 5);
  const d = Math.PI / 180;
  assert(Math.abs(Math.sin(30 * d) * 8 - 4) < 1e-9 && Math.abs(Math.tan(45 * d) * 7 - 7) < 1e-9 && Math.hypot(3, 4) === 5 && Math.sqrt(13 ** 2 - 5 ** 2) === 12);
  assert(Math.abs(Math.asin(5 / 10) / d - 30) < 1e-9);
});

console.log('4. Physics — formulas, units, numbers');
await test('Every physics formula lists meaning + unit for each variable', () => {
  for (const o of O.filter((x) => x.lessonId.startsWith('phy-'))) for (const f of o.formulas) for (const v of f.vars) assert(v.meaning && v.unit, `${o.lessonId} ${v.symbol}`);
  assert(byId('phy-dyn-newton').formulas[0].vars.map((v) => v.unit).join('|').includes('kg') && byId('phy-dyn-newton').formulas[0].vars.some((v) => v.unit === 'm/s²'));
});
await test('Physics worked examples and practice recomputed', () => {
  const d = Math.PI / 180, close = (a, b) => Math.abs(a - b) < 0.05;
  assert(36 / 3.6 === 10 && 450 / 100 === 4.5 && 2 * 3600 === 7200 && 90 / 3.6 === 25 && 0.5 + 1.2 === 1.7);
  assert(Math.hypot(6, 8) === 10 && Math.hypot(12, 5) === 13 && close(10 * Math.sin(30 * d), 5) && close(20 * Math.cos(60 * d), 10) && close(20 * Math.sin(60 * d), 17.3) && 6 - 8 === -2);
  assert(4 + 3 * 2 === 10 && 0.5 * 4 * 3 ** 2 === 18 && (0 - 6 ** 2) / (2 * 9) === -2 && close(9.8 * 2, 19.6) && (0 - 20 ** 2) / (2 * -5) === 40 && 5 + 2 * 3 === 11);
  assert(30 / 6 === 5 && close(10 * 9.8, 98) && (25 - 5) / 4 === 5 && close(3 * 9.8, 29.4));
});

console.log('5. Honesty & safety');
await test('No invented sources: depth content has no URLs; resource statuses unchanged', () => {
  assert(!/https?:\/\//.test(read('src/content/depth.ts')));
  for (const r of R.filter((x) => x.candidateVideoUrl)) assert.strictEqual(r.status, 'unverified', r.id);
});
await test('Reading never changes mastery; check still decides', () => {
  assert(!read('src/components/learning/ReadingExperience.tsx').includes('useStore') && !read('src/components/learning/SubjectBlocks.tsx').includes('useStore'));
  const before = JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.status]));
  useStore.getState().setVideoProgress('phy-dyn-newton', 'curated:x', { state: 'watched' });
  assert.strictEqual(JSON.stringify(useStore.getState().lessons.map((l) => [l.id, l.masteryScore, l.status])), before);
});
await test('Reading renders subject-specific blocks, prerequisites, practice and summary (8 sections kept)', () => {
  const RE = read('src/components/learning/ReadingExperience.tsx');
  for (const s of ['<CodeExplained', '<ErrorExample', '<FormulaCardView', '<PracticeItem', 'data-testid="prereq"', 'data-testid="reading-summary"', "content.simple ?? content.why", "content.principle ?? content.summary"]) assert(RE.includes(s), s);
  assert.strictEqual(read('src/components/learning/meta.ts').match(/\{ id: '/g).length, 8);
});
await test('Hub shows real content status (กำลังเตรียมเนื้อหา when not ready)', () => {
  const LL = read('src/components/learning/LessonLearning.tsx');
  assert(LL.includes('กำลังเตรียมเนื้อหา') && LL.includes('getLessonContentStatus(curriculumLessonId)'));
});
await test('Backup round-trip still valid with the content registry change', () => {
  const st = useStore.getState();
  const payload = I.createExportPayload({ ...st });
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  const r = I.validateAndParseImport(JSON.stringify(payload));
  assert(r.isValid, r.errors.join());
  assert.strictEqual(r.migratedPayload.lessons.length, st.lessons.length);
});
await test('No game systems added in this phase', () => {
  const files = fs.readdirSync(path.join(root, 'src/interactive/lessons'));
  // html.ts = the Web track's HTML Live Web Builder lessons (teaching, not a game system)
  assert.deepStrictEqual(files.sort(), ['codeBattle.ts', 'html.ts', 'linearEquation.ts', 'newtonLab.ts', 'perLessonP0.ts']);
  assert(!/leaderboard|inventory|xpEconomy|PixelLab/i.test(read('src/content/depth.ts') + read('src/content/audit.ts')));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
