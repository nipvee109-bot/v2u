/**
 * Test Suite: Phase 70 — Game integration adapters (prepared, not activated)
 * - GameContent 1.1 built only from V2U knowledge for the real if/elif/else lesson
 * - GameEvidence 1.1 interpreted read-only: no mastery, review or next-step mutation
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



console.log('=== Phase 70: Game integration adapters ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const CT = await jiti.import(path.join(root, 'src/learning/games/contracts.ts'));
const CA = await jiti.import(path.join(root, 'src/learning/games/contentAdapter.ts'));
const EA = await jiti.import(path.join(root, 'src/learning/games/evidenceAdapter.ts'));
const RG = await jiti.import(path.join(root, 'src/learning/games/registry.ts'));
const LID = 'prog-ctrl-conditions';
const { content: GC, excluded } = CA.buildGameContent('pixel-code-battle', LID);
const k = K.getLessonKnowledge(LID);
const lesson = C.lessons.find((l) => l.id === LID);

await test('the real if/elif/else lesson exists once and is the only registered game lesson', () => {
  assert.strictEqual(C.lessons.filter((l) => /if \/ elif \/ else/.test(l.title)).map((l) => l.id).join(), LID);
  assert.deepStrictEqual(RG.GAME_REGISTRY.flatMap((g) => g.lessonIds), [LID]);
  assert.throws(() => CA.buildGameContent('pixel-code-battle', 'prog-ctrl-loops'));
  assert.throws(() => CA.buildGameContent('unknown-game', LID));
});

await test('GameContent 1.1 validates', () => {
  assert.deepStrictEqual(CT.validateGameContent(GC), []);
  assert.strictEqual(GC.contract, 'v2u.game-content');
  assert.strictEqual(GC.version, '1.1');
  assert.strictEqual(GC.lessonId, LID);
  assert.strictEqual(GC.subjectId, lesson.subjectId);
  assert.strictEqual(GC.topicId, lesson.topicId);
});

await test('every field comes from existing knowledge / curriculum (no duplicated curriculum)', () => {
  assert.deepStrictEqual(GC.objectives, lesson.learningOutcomes);
  assert.strictEqual(GC.teaching.missionObjective, lesson.learningOutcomes[0]);
  assert.deepStrictEqual(GC.boundary.allowedKnowledge, k.allowedKnowledge);
  assert.deepStrictEqual(GC.boundary.notYetAllowed, k.notYetAllowed);
  assert.deepStrictEqual(GC.teaching.commonMistakes, k.mistakes);
  assert.deepStrictEqual(GC.teaching.summary, k.summary);
  assert.deepStrictEqual(GC.teaching.concepts, k.concepts);
  for (const p of GC.teaching.predictions) {
    const src = [...k.guided, ...k.independent].find((x) => x.id === p.sourceId);
    assert(src && src.code === p.code && src.verify.output === p.expectedOutput && src.explanation === p.explanation, p.sourceId);
    assert(p.hints.focus === (src.hint ?? null));
    assert(k.rules.some((r) => p.hints.concept === `${r.name}: ${r.statement}`));
    assert.deepStrictEqual(p.hints.guided.steps, k.workedExamples.find((e) => e.id === p.hints.guided.exampleId).steps);
  }
  for (const d of GC.teaching.debugging) {
    const src = k.debugging.find((x) => x.id === d.sourceId);
    assert(src.buggy === d.brokenCode && src.fixed === d.fixedCode && src.output === d.expectedOutput && src.explanation === d.explanation);
  }
  for (const s of GC.teaching.starterCode) assert.strictEqual(s.code, k.workedExamples.find((e) => e.id === s.sourceId).code);
  assert.strictEqual(GC.teaching.predictions.length + excluded.length, k.guided.length + k.independent.length);
  // the game module never needs the knowledge layer: only the adapter imports it
  const imports = (f) => (read(f).match(/^import .*$/gm) ?? []).join('\n');
  assert(!/content\/knowledge/.test(imports('src/learning/games/contracts.ts')));
  assert(!/content\/knowledge/.test(imports('src/learning/games/registry.ts')));
  assert(!/content\/knowledge/.test(imports('src/learning/games/evidenceAdapter.ts')));
});

await test('every skillId exists and belongs to the lesson', () => {
  const all = new Set(C.skills.map((s) => s.id));
  for (const s of GC.skills) assert(all.has(s.id) && lesson.skillIds.includes(s.id));
  for (const x of [...GC.teaching.predictions, ...GC.teaching.debugging, ...GC.teaching.starterCode, ...GC.teaching.concepts, ...GC.teaching.rules]) assert(lesson.skillIds.includes(x.skillId), x.sourceId ?? x.id);
});

await test('allowedKnowledge respected / notYetAllowed excluded (no loops, try, match, one-line conditional, functions, lists, dicts, classes)', () => {
  const code = [...GC.teaching.predictions.map((p) => p.code), ...GC.teaching.debugging.flatMap((d) => [d.brokenCode, d.fixedCode]), ...GC.teaching.starterCode.map((s) => s.code)];
  for (const c of code) {
    assert(!/\b(for|while|try|except|match|case|def|class|lambda|import)\b/.test(c), c);
    assert(!/\[|\{/.test(c), `list/dict in ${c}`);
    assert(!/\S+ if .+ else /.test(c), `one-line conditional in ${c}`);
    assert(/\bif\b|\bprint\b/.test(c));
  }
  const text = JSON.stringify(GC.teaching) + JSON.stringify(GC.narration);
  for (const n of ['การวนซ้ำ', 'try / except', 'match / case']) assert(!JSON.stringify(GC.teaching.predictions).includes(n), n);
  assert(text.length > 0);
});

await test('expected outputs are what real python3 prints (predictions, starter code, fixed debug code)', () => {
  const run = (c) => execPython(['-c', c], { py: PY }).replace(/\n$/, '');
  for (const p of GC.teaching.predictions) assert.strictEqual(run(p.code), p.expectedOutput, p.sourceId);
  for (const s of GC.teaching.starterCode) assert.strictEqual(run(s.code), s.expectedOutput, s.sourceId);
  for (const d of GC.teaching.debugging) {
    assert.strictEqual(run(d.fixedCode), d.expectedOutput);
    assert.throws(() => execPython(['-c', d.brokenCode], { py: PY, stdio: 'pipe' }), 'broken code really fails');
  }
});

await test('Thai learner-facing metadata is valid; Python keywords stay untranslated', () => {
  const thai = /[฀-๿]/;
  for (const v of Object.values(GC.narration)) assert(thai.test(v), v);
  assert(GC.narration.conditionFalse.includes('False') && GC.narration.conditionFalse.includes('elif'));
  assert(GC.narration.conditionTrue.includes('True'));
  for (const t of [GC.title, GC.teaching.missionObjective, ...GC.teaching.summary]) assert(thai.test(t), t);
  // keywords inside code are exactly Python
  for (const p of GC.teaching.predictions) for (const kw of ['if', 'elif', 'else', 'print', 'True', 'False', 'and', 'or', 'not']) {
    const src = [...k.guided, ...k.independent].find((x) => x.id === p.sourceId).code;
    assert.strictEqual((p.code.match(new RegExp(`\\b${kw}\\b`, 'g')) ?? []).length, (src.match(new RegExp(`\\b${kw}\\b`, 'g')) ?? []).length);
  }
  assert(!/ถ้า\s*\(|อื่นๆ:|พิมพ์\(/.test(GC.teaching.predictions.map((p) => p.code).join('\n')), 'no translated keywords in code');
});

await test('missing data is reported, not fabricated', () => {
  assert(GC.missing.some((m) => m.startsWith('hint level 2')));
  const noHint = [...k.guided, ...k.independent].filter((p) => !p.hint).map((p) => p.id);
  for (const id of noHint) assert.strictEqual(GC.teaching.predictions.find((p) => p.sourceId === id).hints.focus, null);
  assert(GC.missing.some((m) => m.startsWith('debugging cases')));
  assert(GC.missing.some((m) => m.startsWith('supportedActions')));
});

await test('game availability: PREPARING for this lesson only; never inferred from the subject', () => {
  assert.strictEqual(RG.getLessonGameAvailability(LID), 'PREPARING');
  for (const l of C.lessons) if (l.id !== LID) assert.strictEqual(RG.getLessonGameAvailability(l.id), 'NOT_AVAILABLE', l.id);
  for (const g of RG.GAME_REGISTRY) assert.strictEqual(g.learningEffectsActive, false);
  assert(RG.GAME_REGISTRY.every((g) => g.status !== 'AVAILABLE'));
  const p = read('src/components/learning/studio/Patterns.tsx');
  assert(p.includes("PREPARING") && !/<iframe|<button[^>]*เล่น/.test(p.slice(p.indexOf('export function GameSlot'))), 'slot never offers play');
});

const ev = (patch = {}) => ({ contract: 'v2u.game-evidence', version: '1.1', gameId: 'pixel-code-battle', lessonId: LID, sessionId: 's-1', duration: 300, completed: true, attempts: 6, correct: 5, hintsUsed: 1, retries: 1, skillEvidence: [{ skillId: 'skill-prog-conditions', attempts: 6, correct: 5, hintsUsed: 1 }], ...patch });

await test('GameEvidence 1.1 validates; bad or over-reaching evidence is rejected', () => {
  assert.deepStrictEqual(CT.validateGameEvidence(ev()), []);
  assert(CT.validateGameEvidence(ev({ correct: 9 })).length);
  assert(CT.validateGameEvidence(ev({ version: '1.0' })).length);
  assert(CT.validateGameEvidence(ev({ duration: -1 })).length);
  for (const f of ['mastery', 'review', 'nextStep', 'diagnostic', 'skillStatus']) assert(CT.validateGameEvidence(ev({ [f]: 1 })).some((x) => x.includes('forbidden')), f);
  assert(CT.validateGameEvidence(ev({ skillEvidence: [{ skillId: 'skill-prog-conditions', attempts: 1, correct: 1, hintsUsed: 0, mastery: 1 }] })).some((x) => x.includes('forbidden')));
  assert.strictEqual(EA.interpretGameEvidence(ev({ gameId: 'other' })).accepted, false);
  assert.strictEqual(EA.interpretGameEvidence(ev({ lessonId: 'prog-ctrl-loops' })).accepted, false);
  assert.strictEqual(EA.interpretGameEvidence(ev({ skillEvidence: [{ skillId: 'skill-math-solve-linear', attempts: 1, correct: 1, hintsUsed: 0 }] })).accepted, false);
});

await test('evidence adapter does NOT mutate mastery, review or next step (pure + no learning-state imports)', async () => {
  const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
  const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
  const snap = () => JSON.stringify(useStore.getState(), (k2, v) => (typeof v === 'function' ? undefined : v));
  const before = snap();
  assert(before.includes('lessons'), 'real store snapshot');
  const lsBefore = JSON.stringify({ ...mem });
  const r = EA.interpretGameEvidence(deepFreeze(ev()));
  assert(r.accepted && r.learningEffectsActive === false);
  assert.deepStrictEqual(r.effects, { mastery: false, skillStatus: false, review: false, nextStep: false, diagnostic: false });
  assert.deepStrictEqual(r.practice, [{ skillId: 'skill-prog-conditions', attempts: 6, correct: 5, hintsUsed: 1, accuracy: 5 / 6 }]);
  assert.strictEqual(snap(), before, 'store (mastery, review, lessons, profile) unchanged');
  assert.strictEqual(JSON.stringify({ ...mem }), lsBefore, 'storage unchanged');
  const src = ['src/learning/games/evidenceAdapter.ts', 'src/learning/games/contracts.ts', 'src/learning/games/registry.ts', 'src/learning/games/contentAdapter.ts'].map(read).join('\n');
  const imports = (src.match(/^import .*$/gm) ?? []).join('\n');
  for (const bad of ['store', 'mastery', 'skillEngine', 'review', 'nextStep', 'diagnostic', 'pathway', 'localStorage']) assert(!imports.includes(bad), `imports ${bad}`);
  assert(!/localStorage|setState|dispatch\(/.test(src));
});

await test('learning engines do not depend on the game layer', () => {
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of ['src/store', 'src/utils', 'src/diagnostic', 'src/route'].filter((d) => fs.existsSync(path.join(root, d))).flatMap(walk).filter((f) => /\.tsx?$/.test(f)))
    assert(!/learning\/games|gameBridge/.test((read(f).match(/^import .*$/gm) ?? []).join('\n')), f);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
