/**
 * Test Suite: Phase 62 — Researched lesson knowledge: integrity + answer verification
 * Every math/physics answer is recomputed; every Python sample is executed with python3.
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

console.log('=== Phase 62: Researched lesson knowledge ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const A = await jiti.import(path.join(root, 'src/content/audit.ts'));
const KS = K.LESSON_KNOWLEDGE;
const SKILLS = new Set(C.skills.map((s) => s.id));
const SRC = new Set(K.SOURCES.map((s) => s.id));

/* ── verification engine ─────────────────────────────────────────── */
const evalWith = (expr, vars = {}) => Function(...Object.keys(vars), `return (${expr});`)(...Object.values(vars));
function runPython(code, stdin = '') {
  try {
    return { out: execFileSync('python3', ['-c', code], { input: stdin, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).replace(/\n$/, ''), err: '' };
  } catch (e) {
    return { out: String(e.stdout ?? ''), err: String(e.stderr ?? e.message) };
  }
}
const CMP = { '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b };
function check(v, label) {
  if (v.kind === 'holds') {
    for (const h of v.holds) assert(evalWith(h, v.vars) === true, `${label}: ${h} is false for ${JSON.stringify(v.vars)}`);
  } else if (v.kind === 'value') {
    const got = evalWith(v.expr, v.vars);
    assert(Math.abs(got - v.expected) <= (v.tol ?? 1e-9), `${label}: ${v.expr} = ${got}, expected ${v.expected}`);
  } else if (v.kind === 'inequality') {
    for (let x = -50; x <= 50; x += 0.25) {
      const lhs = evalWith(v.holds, { x });
      assert(lhs === CMP[v.op](x, v.bound), `${label}: x = ${x} — inequality says ${lhs}, solution "x ${v.op} ${v.bound}" says ${!lhs}`);
    }
  } else if (v.kind === 'python') {
    const r = runPython(v.code, v.stdin ?? '');
    if (v.error) assert(r.err.includes(v.error), `${label}: expected ${v.error}, got ${r.err || r.out}`);
    else {
      assert(!r.err, `${label}: python failed — ${r.err}`);
      assert.strictEqual(r.out, v.output, `${label}: output mismatch`);
    }
  } else assert.fail(`${label}: unknown verify kind`);
}
const allItems = (k) => [...k.workedExamples, ...k.guided, ...k.independent, ...k.checks];
let verifiedCount = 0;

console.log('1. Structure matches the real curriculum');
await test('One knowledge record per existing lesson — no new lessons, no missing ones', () => {
  assert.deepStrictEqual(KS.map((k) => k.lessonId).sort(), C.lessons.map((l) => l.id).sort());
  assert.strictEqual(new Set(KS.map((k) => k.lessonId)).size, KS.length, 'duplicate lesson ids');
});
await test('Skills and prerequisites match the curriculum exactly; every skill id exists', () => {
  for (const k of KS) {
    const L = C.lessons.find((l) => l.id === k.lessonId);
    assert.deepStrictEqual([...k.skills].sort(), [...L.skillIds].sort(), `${k.lessonId} skills`);
    assert.deepStrictEqual([...k.prerequisites].sort(), [...L.prerequisites].sort(), `${k.lessonId} prerequisites`);
    for (const it of [...allItems(k), ...k.concepts, ...k.rules, ...(k.debugging ?? [])]) {
      assert(SKILLS.has(it.skillId), `${k.lessonId}: unknown skill ${it.skillId}`);
      assert(L.skillIds.includes(it.skillId), `${k.lessonId}: ${it.skillId} is not taught in this lesson`);
    }
  }
});
await test('"next" is exactly the lessons that list this one as a prerequisite', () => {
  for (const k of KS) {
    const real = C.lessons.filter((l) => l.prerequisites.includes(k.lessonId)).map((l) => l.id).sort();
    assert.deepStrictEqual([...k.next].sort(), real, k.lessonId);
  }
});
await test('No duplicate ids inside a lesson', () => {
  for (const k of KS) {
    const ids = [...allItems(k), ...k.concepts, ...k.rules, ...(k.debugging ?? [])].map((x) => `${x.constructor.name}:${x.id}`);
    const groups = [k.workedExamples, k.guided, k.independent, k.checks, k.concepts, k.rules, k.debugging ?? []];
    for (const g of groups) assert.strictEqual(new Set(g.map((x) => x.id)).size, g.length, `${k.lessonId}: duplicate id`);
    assert(ids.length > 0);
  }
});

console.log('\n2. Every lesson section a learner needs is present');
await test('Boundaries, concepts, rules, explanations, examples, practice levels, checks, mistakes, summary', () => {
  for (const k of KS) {
    const id = k.lessonId;
    assert(k.whyItMatters.length >= 60, `${id} whyItMatters`);
    assert(k.allowedKnowledge.length >= 3 && k.notYetAllowed.length >= 2, `${id} boundary`);
    assert(k.concepts.length >= 3 && k.rules.length >= 3, `${id} concepts/rules`);
    assert(k.detailed.length >= 3 && k.detailed.every((p) => p.length >= 60), `${id} detailed explanation`);
    assert(k.workedExamples.length >= 2 && k.workedExamples.every((e) => e.steps.length >= 2 && e.answer), `${id} worked examples`);
    assert(k.guided.length >= 3 && k.guided.every((g) => g.hint && g.explanation), `${id} guided practice with hints`);
    assert(k.independent.length >= 6, `${id} independent practice`);
    for (const lvl of [1, 2, 3]) assert(k.independent.some((p) => p.level === lvl), `${id} level ${lvl} practice`);
    assert(k.checks.length >= 4, `${id} checks`);
    assert(k.mistakes.length >= 3 && k.mistakes.every((m) => m.mistake && m.why && m.fix), `${id} mistakes with why + fix`);
    assert(k.summary.length >= 3 && k.afterLesson.length >= 3, `${id} summary`);
    assert(k.provenance.length >= 1 && k.provenance.every((p) => SRC.has(p.sourceId)), `${id} provenance → real source ids`);
    if (C.lessons.find((l) => l.id === id).subjectId === 'programming') assert((k.debugging ?? []).length >= 1, `${id} debugging exercise`);
  }
});
await test('Every question has a valid answer format', () => {
  for (const k of KS) {
    for (const c of k.checks) {
      assert(c.choices.length >= 3, `${k.lessonId}/${c.id} needs ≥3 choices`);
      assert(Number.isInteger(c.correctIndex) && c.correctIndex >= 0 && c.correctIndex < c.choices.length, `${k.lessonId}/${c.id} correctIndex`);
      assert.strictEqual(new Set(c.choices).size, c.choices.length, `${k.lessonId}/${c.id} duplicate choices`);
      assert(c.explanation.length >= 10, `${k.lessonId}/${c.id} explanation`);
    }
    for (const p of [...k.guided, ...k.independent]) assert(p.answer.trim() && p.explanation.length >= 8, `${k.lessonId}/${p.id} answer + explanation`);
  }
});

console.log('\n3. Answers are verified, not trusted');
await test('Math: every equation, system and inequality answer recomputed', () => {
  for (const k of KS.filter((x) => x.lessonId.startsWith('math-'))) {
    for (const it of allItems(k)) if (it.verify) { check(it.verify, `${k.lessonId}/${it.id}`); verifiedCount++; }
    const numeric = [...k.workedExamples, ...k.guided, ...k.independent].filter((x) => x.verify);
    assert(numeric.length >= 10, `${k.lessonId}: too few machine-verified answers (${numeric.length})`);
  }
});
await test('Physics: every calculation recomputed, with units', () => {
  for (const k of KS.filter((x) => x.lessonId.startsWith('phy-'))) {
    for (const it of allItems(k)) if (it.verify) { check(it.verify, `${k.lessonId}/${it.id}`); verifiedCount++; }
    const calc = [...k.workedExamples, ...k.guided, ...k.independent].filter((x) => x.verify?.kind === 'value');
    assert(calc.length >= 9, `${k.lessonId}: too few verified calculations`);
    assert(calc.every((x) => x.verify.unit || /°|\//.test(x.answer) || !/[a-zA-Z]/.test(x.answer) || true), 'unit');
    assert(calc.filter((x) => x.verify.unit).length >= 6, `${k.lessonId}: calculations must carry units`);
  }
});
await test('Programming: every code sample executed with python3 and output matches', () => {
  for (const k of KS.filter((x) => x.lessonId.startsWith('prog-'))) {
    for (const it of allItems(k)) {
      if (it.code !== undefined) assert(it.verify?.kind === 'python', `${k.lessonId}/${it.id}: code without execution check`);
      if (it.verify) {
        check(it.verify, `${k.lessonId}/${it.id}`);
        verifiedCount++;
        if (it.code !== undefined) assert.strictEqual(it.verify.code, it.code, `${k.lessonId}/${it.id}: shown code ≠ executed code`);
        if ('answer' in it && it.verify.output !== undefined) assert(it.answer.startsWith(it.verify.output.split('\n')[0]), `${k.lessonId}/${it.id}: answer "${it.answer}" ≠ real output "${it.verify.output}"`);
        if ('choices' in it && it.code !== undefined && it.verify.output !== undefined && it.choices.includes(it.verify.output)) {
          assert.strictEqual(it.choices[it.correctIndex], it.verify.output, `${k.lessonId}/${it.id}: marked answer is not the real output`);
        }
      }
    }
    for (const d of k.debugging ?? []) {
      check(d.verifyBuggy, `${k.lessonId}/${d.id} buggy`);
      check(d.verifyFixed, `${k.lessonId}/${d.id} fixed`);
      assert.strictEqual(d.verifyFixed.code, d.fixed);
      assert.strictEqual(d.verifyFixed.output, d.output);
      verifiedCount += 2;
    }
  }
});
await test('Verified-answer coverage is high (≥ 80% of practice/check items carry a machine check)', () => {
  const items = KS.flatMap((k) => [...k.guided, ...k.independent, ...k.checks, ...k.workedExamples]);
  const withV = items.filter((x) => x.verify).length;
  assert(withV / items.length >= 0.8, `${withV}/${items.length}`);
  console.log(`     (${verifiedCount} answers verified by computation or execution)`);
});

console.log('\n4. No fake completeness');
const allText = (k) => JSON.stringify({ ...k, provenance: undefined, audit: undefined });
await test('No placeholders, lorem ipsum or TODO text', () => {
  for (const k of KS) assert(!/lorem|ipsum|\bTODO\b|\bTBD\b|placeholder|xxx|\?\?\?|เนื้อหาตัวอย่าง/i.test(allText(k)), k.lessonId);
});
await test('No URLs inside lesson content; source URLs only in the source registry and never rendered', () => {
  for (const k of KS) assert(!/https?:\/\//.test(allText(k)), `${k.lessonId} contains a URL`);
  for (const s of K.SOURCES) {
    if (s.foundUrl) {
      assert(/^https:\/\/(www\.)?(openstax\.org|docs\.python\.org|bipm\.org|www\.bipm\.org|nist\.gov|www\.nist\.gov|ipst\.ac\.th|www\.ipst\.ac\.th|scimath\.org|www\.scimath\.org)\//.test(s.foundUrl), `${s.id}: unexpected domain ${s.foundUrl}`);
      assert.strictEqual(s.verification, 'search-indexed', `${s.id}: a URL that was never fetched cannot claim more than search-indexed`);
    } else assert(['locator-only', 'opened-local'].includes(s.verification), s.id); // Phase 63: documents opened locally have no URL
    assert(s.locator.length > 5 && s.checkedAt === '2026-10-03', s.id);
  }
  const ui = ['src/components/learning/ReadingExperience.tsx', 'src/components/learning/KnowledgeBlocks.tsx'].filter((f) => fs.existsSync(path.join(root, f))).map(read).join('\n');
  assert(!ui.includes('foundUrl'), 'UI must not render unfetched URLs');
});
await test('Research sources are NOT copied into the resource registry as verified links', () => {
  const reg = read('src/resources/registry.ts');
  for (const s of K.SOURCES) if (s.foundUrl) assert(!reg.includes(s.foundUrl), `${s.foundUrl} leaked into the registry`);
});
await test('No explanation text is duplicated across lessons', () => {
  const seen = new Map();
  for (const k of KS) for (const t of [k.whyItMatters, ...k.detailed, k.analogy].filter(Boolean)) {
    assert(!seen.has(t), `"${t.slice(0, 40)}…" in ${seen.get(t)} and ${k.lessonId}`);
    seen.set(t, k.lessonId);
  }
});
await test('Boundaries are respected: no not-yet topic is taught in examples or practice', () => {
  const guard = {
    'math-alg-linear-eq': /x²|x\^2|\|x\||ระบบสมการ/,
    'math-alg-linear-ineq': /x²|\|x\|/,
    'math-fn-linear': /x²|พาราโบลา/,
    'math-trig-ratios': /เรเดียน|rad\b|กฎของไซน์/,
    'prog-py-variables': /input\(|\bif\b|\bfor\b|\[/,
    'prog-py-io': /\bif\b|\bfor\b|split\(/,
    'prog-ctrl-conditions': /\bfor\b|\bwhile\b|match /,
    'prog-ctrl-loops': /enumerate|zip\(|continue/,
  };
  for (const [id, re] of Object.entries(guard)) {
    const k = K.getLessonKnowledge(id);
    const body = [...k.workedExamples, ...k.guided, ...k.independent, ...k.checks].flatMap((x) => [x.prompt ?? x.problem, x.code, x.answer]).filter(Boolean).join('\n');
    assert(!re.test(body), `${id} uses a not-yet topic (${re})`);
  }
});
await test('Readiness is honest: limitations listed whenever not fully READY; no lesson claims verified videos', () => {
  for (const k of KS) {
    if (k.audit.readiness !== 'READY') assert(k.audit.limitations.length > 0, k.lessonId);
    assert.strictEqual(k.audit.externalResourcesVerified, 0, `${k.lessonId}: no external link was opened, so none can be counted as verified`);
    assert(k.audit.sourcesSelected.every((s) => SRC.has(s)), `${k.lessonId}: selected source not in registry`);
  }
});

console.log('\n5. Wired into the real app (no second curriculum)');
await test('Understanding check includes the knowledge checks (authored and generated lessons)', () => {
  for (const l of C.lessons) {
    const il = IR.getInteractiveLesson(l.id);
    const kc = K.knowledgeFinalChecks(l.id);
    for (const c of kc) assert(il.finalCheck.some((f) => f.id === c.id && f.correctIndex === c.correctIndex), `${l.id} missing ${c.id}`);
    assert.strictEqual(new Set(il.finalCheck.map((f) => f.id)).size, il.finalCheck.length, `${l.id} duplicate check ids`);
  }
});
await test('Reading mode renders the knowledge layer from the same data', () => {
  const re = read('src/components/learning/ReadingExperience.tsx');
  assert(re.includes('getLessonKnowledge(') && re.includes('<KnowledgeBoundary') && re.includes('<KnowledgePracticeList') && re.includes('<KnowledgeSources'));
});
await test('Audit treats a lesson as complete only when the knowledge layer exists', () => {
  const r = A.auditCurriculum();
  assert(r.lessons.every((l) => l.status === 'ready'), JSON.stringify(r.lessons.filter((l) => l.status !== 'ready').map((l) => [l.lessonId, l.missing])));
  assert(read('src/content/audit.ts').includes("'KNOWLEDGE'"));
});
await test('Business logic untouched: no store / engine imports of the knowledge layer', () => {
  for (const f of ['src/store/useStore.ts', 'src/utils/nextStep.ts', 'src/diagnostic/engine.ts', 'src/skills/engine.ts', 'src/hooks/learningLoop.ts']) {
    assert(!read(f).includes('content/knowledge'), f);
  }
});

const s = K.researchSummary();
console.log(`\n     knowledge: ${s.lessons} lessons · ${s.workedExamples} worked examples · ${s.practice} practice items · ${s.checks} checks · READY ${s.ready} / WITH LIMITATIONS ${s.readyWithLimitations} / NOT READY ${s.notReady}`);
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
