/**
 * Test Suite: Phase 63 — Research verification pass
 * - Python claims: every quoted sentence must exist in the official text bundled with CPython
 * - Diagrams: drawn numbers must agree with the lesson's own examples
 * - Offline cross-checks for math/physics rules (sources could not be opened)
 * - Readiness is honest: READY only with opened sources + verified evidence
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { execPython, findPython, python } from './lib/crossPlatform.js';
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

console.log('=== Phase 63: Research verification pass ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const KS = K.LESSON_KNOWLEDGE;
const SRC = new Map(K.SOURCES.map((s) => [s.id, s]));
const get = (id) => K.getLessonKnowledge(id);

// Official Python text, read from the CPython version the sources cite (not from memory, not a newer release:
// later CPython versions reword a few docstrings, e.g. 3.13 writes "floating-point")
const CITED = [...new Set(K.SOURCES.filter((s) => s.id.startsWith('python-')).map((s) => s.title.match(/CPython (\d+\.\d+)/)?.[1]).filter(Boolean))];
const DOCS_PY = findPython({ version: CITED[0] });
const DOCS = DOCS_PY.cmd && JSON.parse(
  execPython(['-c', `
import json, builtins, sys, pydoc_data.topics as t
d = {'topic:' + k: v for k, v in t.topics.items()}
for n in ('input', 'print', 'int', 'range', 'len', 'str', 'float', 'type'):
    d['doc:' + n] = getattr(builtins, n).__doc__ or ''
d['version'] = sys.version.split()[0]
print(json.dumps(d))
`], { py: DOCS_PY })
);
const norm = (s) => s.replace(/\s+/g, ' ');

console.log('1. Python content against official documentation (opened locally)');
await test(`Every evidence quote exists verbatim in the Python ${DOCS?.version ?? CITED[0]} reference / docstrings`, () => {
  assert.strictEqual(CITED.length, 1, `Python sources must cite one CPython version, got ${CITED.join(', ')}`);
  assert(DOCS, `the sources cite CPython ${CITED[0]}, but no Python ${CITED[0]} is installed (${DOCS_PY.tried.join('; ')}). Quotes are verified against the cited version only: install Python ${CITED[0]} (Windows: py install ${CITED[0]}, or the python.org installer) or set V2U_PYTHON.`);
  let n = 0;
  for (const k of KS) for (const p of k.provenance) for (const e of p.evidence ?? []) {
    if (e.ref.startsWith('openstax:')) continue; // checked against the OpenStax source files (test-phase-66)
    assert(DOCS[e.ref] !== undefined, `${k.lessonId}: unknown reference ${e.ref}`);
    assert(norm(DOCS[e.ref]).includes(norm(e.quote)), `${k.lessonId}: "${e.quote}" not found in ${e.ref}`);
    n++;
  }
  assert(n >= 30, `only ${n} quotes`);
  console.log(`     (${n} quotes found in the official text)`);
});
await test('Every programming lesson cites opened official docs with evidence for its key rules', () => {
  const need = {
    'prog-py-variables': ['topic:binary', 'topic:assignment', 'doc:int'],
    'prog-py-io': ['doc:input', 'doc:print', 'topic:formatstrings'],
    'prog-ctrl-conditions': ['topic:if', 'topic:booleans', 'topic:comparisons'],
    'prog-ctrl-loops': ['doc:range', 'topic:while', 'topic:break', 'topic:for'],
    'prog-fn-functions': ['topic:return', 'topic:typesmapping', 'topic:typesseq-mutable'],
  };
  for (const [id, refs] of Object.entries(need)) {
    const have = new Set(get(id).provenance.flatMap((p) => (p.evidence ?? []).map((e) => e.ref)));
    for (const r of refs) assert(have.has(r), `${id} lacks evidence from ${r}`);
  }
});
await test('Doc behaviour also holds when executed (input returns str, range excludes stop, int truncates, / gives float)', () => {
  const out = execPython(['-c', 'print(type(input()).__name__, list(range(1,4)), int(-3.7), type(8/2).__name__, {"a":1}.get("b"))'], { py: PY, input: '5\n' }).trim();
  assert.strictEqual(out, "str [1, 2, 3] -3 float None");
});

console.log('\n2. Provenance and readiness are honest');
await test('Sources: "opened-local" only for documents actually read here; unopened URLs stay "search-indexed"', () => {
  for (const s of K.SOURCES) {
    if (s.verification === 'opened-local') assert(!s.foundUrl, `${s.id}: an opened-local source must not pretend to be a web page`);
    if (s.foundUrl) assert(['search-indexed', 'opened-repo'].includes(s.verification), s.id);
  }
});
await test('Claims backed only by unopened sources are not marked cross-checked', () => {
  for (const k of KS) for (const p of k.provenance) {
    const s = SRC.get(p.sourceId);
    if (!['opened-local', 'opened-repo'].includes(s.verification)) assert.strictEqual(p.crossChecked, false, `${k.lessonId}/${p.sourceId}`);
    if (p.crossChecked) assert((p.evidence ?? []).length > 0, `${k.lessonId}/${p.sourceId}: cross-checked without evidence`);
  }
});
await test('READY only when every source was opened, evidence exists, no limitation remains, and verification is recorded', () => {
  for (const k of KS) {
    const a = k.audit;
    if (a.readiness === 'READY') {
      assert(k.provenance.every((p) => ['opened-local', 'opened-repo'].includes(SRC.get(p.sourceId).verification)), `${k.lessonId}: READY with an unopened source`);
      assert(k.provenance.every((p) => (p.evidence ?? []).length > 0), `${k.lessonId}: READY without evidence`);
      assert.strictEqual(a.limitations.length, 0, `${k.lessonId}: READY but has limitations`);
      assert((a.verification ?? []).length > 0, k.lessonId);
    } else {
      assert(a.limitations.length > 0, `${k.lessonId}: not READY must say why`);
    }
  }
});
await test('Math and physics are NOT READY-claimed while their sources remain unopened', () => {
  for (const k of KS.filter((x) => !x.lessonId.startsWith('prog-'))) {
    if (k.provenance.every((p) => ['opened-local', 'opened-repo'].includes(SRC.get(p.sourceId).verification))) continue;
    assert.notStrictEqual(k.audit.readiness, 'READY', k.lessonId);
    assert(k.audit.limitations.some((l) => /ยังไม่ได้เปิดตรวจหน้าจริง|ยังเปิดไม่ได้/.test(l)), `${k.lessonId}: limitation must name the unopened sources`);
  }
});
await test('No external video is claimed as verified (YouTube could not be opened)', () => {
  for (const k of KS) assert.strictEqual(k.audit.externalResourcesVerified, 0, k.lessonId);
  const reg = read('src/resources/registry.ts');
  assert(!/status: 'verified'[\s\S]{0,40}checkedAt: '2026-10-03'/.test(reg), 'no new verified links today');
});

console.log('\n3. Diagrams agree with the lesson numbers');
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
await test('Required diagrams exist: graphs, triangles, vectors, force diagrams', () => {
  const kinds = new Set(KS.flatMap((k) => (k.diagrams ?? []).map((d) => d.kind)));
  for (const kd of ['graph', 'triangle', 'vectors', 'forces']) assert(kinds.has(kd), kd);
  for (const id of ['math-fn-linear', 'math-alg-linear-system', 'math-trig-ratios', 'phy-vec-vectors', 'phy-kin-1d', 'phy-dyn-newton']) assert((get(id).diagrams ?? []).length > 0, id);
});
await test('Graphs: every marked point lies on a drawn line; the system graph meets at the worked answer', () => {
  for (const k of KS) for (const d of (k.diagrams ?? []).filter((x) => x.kind === 'graph')) {
    for (const p of d.points ?? []) assert(d.lines.some((l) => near(l.m * p.x + l.c, p.y)), `${d.id}: ${p.label} is not on a line`);
  }
  const [l1, l2] = get('math-alg-linear-system').diagrams[0].lines;
  const x = (l2.c - l1.c) / (l1.m - l2.m), y = l1.m * x + l1.c;
  assert(near(x, 4) && near(y, 2), `intersection ${x}, ${y}`);
  assert(near(3 * x + 2 * y, 16) && near(x - y, 2), 'lines are the worked-example equations');
  const line = get('math-fn-linear').diagrams[0].lines[0];
  assert(line.m === 2 && line.c === 1, 'fn-linear graph = worked example y = 2x + 1');
});
await test('v–t graph: slope is the acceleration and the shaded area is the displacement in the label', () => {
  const d = get('phy-kin-1d').diagrams[0];
  const l = d.lines[0], s = d.shadeUnder;
  const area = 0.5 * ((l.m * s.x0 + l.c) + (l.m * s.x1 + l.c)) * (s.x1 - s.x0);
  assert(near(area, 16) && s.label.includes('16 m') && l.m === 2, `area ${area}`);
});
await test('Triangles: Pythagoras holds and tan θ = opposite/adjacent', () => {
  for (const k of KS) for (const d of (k.diagrams ?? []).filter((x) => x.kind === 'triangle')) {
    assert(near(d.opp ** 2 + d.adj ** 2, d.hyp ** 2, 1e-6), `${d.id} Pythagoras`);
    assert(near(Math.tan((d.angleDeg * Math.PI) / 180), d.opp / d.adj, 1e-3), `${d.id} angle`);
  }
});
await test('Vectors: drawn components and resultant match the worked examples', () => {
  const [c, r] = get('phy-vec-vectors').diagrams;
  const v = c.vectors[0];
  assert(near(Math.hypot(v.x, v.y), 10) && near(Math.atan2(v.y, v.x) * 180 / Math.PI, 30), 'F = 10 N at 30°');
  const R = r.vectors.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
  assert(near(Math.hypot(R.x, R.y), 5) && r.resultant.includes('5 m'));
});
await test('Force diagram: forces sum to the stated net force, giving the worked-example acceleration', () => {
  const d = get('phy-dyn-newton').diagrams[0];
  const sx = d.forces.reduce((n, f) => n + (f.dir === 'right' ? f.newtons : f.dir === 'left' ? -f.newtons : 0), 0);
  const sy = d.forces.reduce((n, f) => n + (f.dir === 'up' ? f.newtons : f.dir === 'down' ? -f.newtons : 0), 0);
  assert(sx === d.net.x && sy === d.net.y, `net ${sx}, ${sy}`);
  const m = Number(d.body.match(/[\d.]+/)[0]);
  assert(near(sx / m, 4) && near(m * 9.8, 49), 'a = 4 m/s², weight 49 N');
});
await test('Diagrams render as accessible SVG with title and description', () => {
  const src = read('src/components/learning/Diagrams.tsx');
  assert(src.includes('role="img"') && src.includes('<title') && src.includes('<desc') && src.includes('figcaption'));
  assert(read('src/components/learning/ReadingExperience.tsx').includes('<KnowledgeDiagrams'));
});

console.log('\n4. Offline cross-checks for math and physics rules');
await test('Fractional exponents: a^(m/n) = (ⁿ√a)^m = ⁿ√(a^m), and (a^(1/n))^n = a, for many a, m, n', () => {
  for (const a of [2, 3, 5, 8, 16, 27, 0.5, 10]) for (const n of [2, 3, 4, 5]) for (const m of [-3, -2, -1, 1, 2, 3]) {
    const v = a ** (m / n);
    assert(near(v, (a ** (1 / n)) ** m, 1e-9 * Math.max(1, v)) && near(v, (a ** m) ** (1 / n), 1e-9 * Math.max(1, v)), `${a}^(${m}/${n})`);
    assert(near((a ** (1 / n)) ** n, a, 1e-9 * a));
  }
});
await test('Exponent laws stated in the rules hold numerically', () => {
  for (const a of [2, 3, 0.5]) for (const m of [-2, 0, 1, 3]) for (const n of [-1, 2, 4]) {
    assert(near(a ** m * a ** n, a ** (m + n), 1e-9) && near(a ** m / a ** n, a ** (m - n), 1e-9) && near((a ** m) ** n, a ** (m * n), 1e-9));
  }
  assert(get('math-alg-exponents').rules.some((r) => r.statement.includes('a^(m/n) = (ⁿ√a)ᵐ')));
});
await test('Special-angle values in the trig rules match Math.sin / Math.cos / Math.tan', () => {
  const rad = (d) => (d * Math.PI) / 180;
  assert(near(Math.sin(rad(30)), 1 / 2) && near(Math.cos(rad(30)), Math.sqrt(3) / 2) && near(Math.tan(rad(30)), 1 / Math.sqrt(3)));
  assert(near(Math.sin(rad(45)), Math.SQRT2 / 2) && near(Math.cos(rad(45)), Math.SQRT2 / 2) && near(Math.tan(rad(45)), 1));
  assert(near(Math.sin(rad(60)), Math.sqrt(3) / 2) && near(Math.cos(rad(60)), 1 / 2) && near(Math.tan(rad(60)), Math.sqrt(3)));
  const st = get('math-trig-ratios').rules.find((r) => r.id === 'r-special').statement;
  for (const x of ['sin30° = 1/2', 'cos30° = √3/2', 'tan45° = 1', 'sin60° = √3/2', 'cos60° = 1/2', 'tan60° = √3']) assert(st.includes(x), x);
});
await test('Slope formula gives the same value whichever point is taken first', () => {
  const pts = [[1, 3], [4, 9], [-1, 4], [3, -4]];
  for (const [a, b] of [[0, 1], [2, 3]]) {
    const [p, q] = [pts[a], pts[b]];
    assert(near((q[1] - p[1]) / (q[0] - p[0]), (p[1] - q[1]) / (p[0] - q[0])));
  }
});
await test('Kinematics: the four constant-acceleration equations agree with each other (random u, a, t)', () => {
  for (let i = 0; i < 200; i++) {
    const u = (i % 17) - 8, a = ((i * 7) % 11) - 5, t = 0.5 + (i % 9);
    const v = u + a * t, s = u * t + 0.5 * a * t * t;
    assert(near(v * v, u * u + 2 * a * s, 1e-6), 'v² = u² + 2as');
    assert(near(s, ((u + v) * t) / 2, 1e-9), 's = (u + v)t/2');
  }
});
await test('Units: N = kg·m/s², km/h ÷ 3.6 = m/s, prefixes k m μ are 10³ 10⁻³ 10⁻⁶', () => {
  const dim = { kg: [1, 0, 0], m: [0, 1, 0], s: [0, 0, 1] };
  const N = [dim.kg[0] + dim.m[0] - 2 * dim.s[0], dim.kg[1] + dim.m[1] - 2 * dim.s[1], dim.kg[2] + dim.m[2] - 2 * dim.s[2]];
  assert.deepStrictEqual(N, [1, 1, -2]);
  assert(near(1000 / 3600, 1 / 3.6));
  const st = get('phy-vec-units').rules.find((r) => r.id === 'r-prefix').statement;
  for (const x of ['k = 10³', 'm = 10⁻³', 'μ = 10⁻⁶', 'M = 10⁶', 'G = 10⁹', 'n = 10⁻⁹', 'c = 10⁻²']) assert(st.includes(x), x);
});
await test('Newton: W = mg with g = 9.8 and ΣF = ma reproduce every physics verify value that uses them', () => {
  const k = get('phy-dyn-newton');
  const items = [...k.workedExamples, ...k.guided, ...k.independent, ...k.checks].filter((x) => x.verify?.kind === 'value');
  assert(items.length >= 10);
  for (const it of items) assert(near(Function(`return (${it.verify.expr})`)(), it.verify.expected, it.verify.tol ?? 1e-9), it.id);
});

const counts = { READY: 0, READY_WITH_LIMITATIONS: 0, NOT_READY: 0 };
for (const k of KS) counts[k.audit.readiness]++;
console.log(`\n     readiness: READY ${counts.READY} · READY WITH LIMITATIONS ${counts.READY_WITH_LIMITATIONS} · NOT READY ${counts.NOT_READY}`);
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
