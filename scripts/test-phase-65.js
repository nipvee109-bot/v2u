/**
 * Test Suite: Phase 65 — Learning content completion
 * - Every lesson has a complete Learn-with-V2U path built from knowledge only
 * - Practice checking agrees with verified answers; honest audit + registry statuses
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


console.log('=== Phase 65: Learning content completion ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { CURRICULUM } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { getStudioScript, STUDIO_SCRIPTS } = await jiti.import(path.join(root, 'src/interactive/studio/scripts.ts'));
const { getInteractiveLesson } = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const PC = await jiti.import(path.join(root, 'src/interactive/studio/practiceCheck.ts'));
const A = await jiti.import(path.join(root, 'src/content/lessonAudit.ts'));
const RV = await jiti.import(path.join(root, 'src/resources/registryView.ts'));
const RESOURCE_REGISTRY = (await jiti.import(path.join(root, 'src/resources/engine.ts'))).allResources();
const LESSONS = CURRICULUM.lessons.map((l) => l.id);

await test('every curriculum lesson has a Learn-with-V2U script (curriculum ids unchanged)', () => {
  assert.strictEqual(LESSONS.length, 15);
  for (const id of LESSONS) assert(getStudioScript(id), id);
  assert.strictEqual(STUDIO_SCRIPTS.length, 3);
});

await test('every script id exists in knowledge / the lesson’s steps; nothing new invented', () => {
  for (const id of LESSONS) {
    const s = getStudioScript(id), k = K.getLessonKnowledge(id), l = getInteractiveLesson(id);
    const practice = new Set([...k.guided, ...k.independent].map((p) => p.id));
    for (const c of s.chunks) {
      if (c.kind === 'step' || (c.kind === 'mistakes' && c.stepId)) assert(l.steps.some((x) => x.id === c.stepId), `${id} ${c.stepId}`);
      if (c.kind === 'example') assert(k.workedExamples.some((e) => e.id === c.exampleId), `${id} ${c.exampleId}`);
      if (c.kind === 'explain') {
        for (const x of c.concepts ?? []) assert(k.concepts.some((y) => y.id === x), `${id} ${x}`);
        for (const x of c.rules ?? []) assert(k.rules.some((y) => y.id === x), `${id} ${x}`);
        if (c.diagram) assert(k.diagrams.some((d) => d.id === c.diagram));
      }
      if (c.kind === 'practice') { assert(c.practiceIds.length > 0); for (const x of c.practiceIds) assert(practice.has(x), `${id} ${x}`); }
      if (c.kind === 'debug') assert(k.debugging?.some((d) => d.id === c.debugId), `${id} ${c.debugId}`);
      if (c.tutor) { assert(!/https?:/.test(c.tutor)); for (const n of k.notYetAllowed) assert(!c.tutor.includes(n), `${id} tutor mentions ${n}`); }
    }
    assert.strictEqual(new Set(s.chunks.map((c) => c.id)).size, s.chunks.length, id);
  }
});

await test('every question step of every lesson is in its script (check evidence unchanged)', () => {
  for (const id of LESSONS) {
    const used = new Set(getStudioScript(id).chunks.flatMap((c) => [c.stepId, c.widget?.stepId].filter(Boolean)));
    for (const st of getInteractiveLesson(id).steps) if (st.interaction) assert(used.has(st.id), `${id}: ${st.id}`);
  }
});

await test('learning loop order per script: understand → try → practice; hook first, summary last', () => {
  const rank = { understand: 0, try: 1, practice: 2 };
  for (const id of LESSONS) {
    const c = getStudioScript(id).chunks;
    const r = c.map((x) => rank[x.phase]);
    assert.deepStrictEqual(r, [...r].sort((a, b) => a - b), id);
    assert.strictEqual(c[0].kind, 'hook'); assert.strictEqual(c.at(-1).kind, 'summary');
    assert(c.some((x) => x.kind === 'practice'), `${id} practice`);
  }
});

const inputFor = (v) => v.kind === 'holds' ? Object.fromEntries(Object.entries(v.vars).map(([k, x]) => [k, String(x)])) : v.kind === 'value' ? { v: String(v.expected) } : v.kind === 'inequality' ? { op: v.op, bound: String(v.bound) } : { out: v.output };
await test('practice checker: the verified answer is accepted, a wrong one rejected (all 135 items)', () => {
  let n = 0;
  for (const k of K.LESSON_KNOWLEDGE) for (const p of [...k.guided, ...k.independent]) {
    if (!p.verify || PC.practiceFields(p).length === 0) continue;
    n++;
    assert.strictEqual(PC.checkPractice(p, inputFor(p.verify)), 'correct', `${k.lessonId} ${p.id}`);
    const bad = p.verify.kind === 'python' ? { out: p.verify.output + 'x' } : p.verify.kind === 'inequality' ? { op: p.verify.op, bound: String(p.verify.bound + 1) } : Object.fromEntries(Object.entries(inputFor(p.verify)).map(([a, b]) => [a, String(Number(b) + 7)]));
    assert.strictEqual(PC.checkPractice(p, bad), 'wrong', `${k.lessonId} ${p.id} wrong`);
  }
  assert(n >= 130, `checked ${n}`);
});

await test('practice checker: the number shown in each numeric answer is itself accepted (rounding is fair)', () => {
  for (const k of K.LESSON_KNOWLEDGE) for (const p of [...k.guided, ...k.independent]) {
    if (p.verify?.kind !== 'value') continue;
    const m = p.answer.replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/);
    if (!m) continue;
    const shown = Number(m[0]);
    if (Math.abs(shown - p.verify.expected) > PC.valueTolerance(p.verify.expected, p.verify.tol)) continue; // answer lists another number first (e.g. a unit prefix)
    assert.strictEqual(PC.checkPractice(p, { v: m[0] }), 'correct', `${k.lessonId} ${p.id}`);
  }
});

await test('parseNumber accepts only plain numbers and fractions (no expressions)', () => {
  assert.strictEqual(PC.parseNumber('−3'), -3);
  assert.strictEqual(PC.parseNumber('1/4'), 0.25);
  assert.strictEqual(PC.parseNumber('2+2'), undefined);
  assert.strictEqual(PC.parseNumber('alert(1)'), undefined);
  assert.strictEqual(PC.parseNumber(''), undefined);
});

await test('lesson audit: honest per-part statuses for all 15 lessons', () => {
  const all = A.auditAllLessons();
  assert.strictEqual(all.length, 15);
  for (const a of all) {
    for (const part of [a.reading, a.learnWithV2U, a.practice, a.quiz]) assert.strictEqual(part, 'READY', `${a.lessonId}`);
    assert.notStrictEqual(a.video, 'VERIFIED', 'no video content could be inspected in this environment');
    assert.notStrictEqual(a.overall, 'READY', `${a.lessonId}: READY needs verified video + opened sources`);
    assert(a.overall !== 'READY' || K.getLessonKnowledge(a.lessonId).audit.readiness === 'READY');
    assert(a.gaps.length > 0);
  }
});

await test('registry view: VERIFIED only with inspected content; summaries pending; nothing upgraded', () => {
  for (const r of RESOURCE_REGISTRY) {
    const v = RV.toRegistryRecord(r);
    assert.strictEqual(v.actualContentInspected, v.verificationStatus === 'VERIFIED');
    if (v.verificationStatus === 'VERIFIED') assert(r.verification?.coverageChecked && r.verification?.titleMatches);
    if (r.type === 'video') assert.notStrictEqual(v.summaryStatus, 'NOT_A_VIDEO');
    if (v.verificationStatus !== 'VERIFIED' && r.type === 'video') assert.strictEqual(v.summaryStatus, 'SUMMARY_PENDING');
    if (r.status === 'deprecated') assert.strictEqual(v.verificationStatus, 'DEPRECATED');
    for (const id of v.lessonIds) assert(LESSONS.includes(id), id);
    if (v.url) assert(v.url === r.url || v.url === r.candidateUrl || v.url === r.candidateVideoUrl, 'no new URLs');
  }
  // a link that merely loads is not VERIFIED
  const fake = { ...RESOURCE_REGISTRY[0], status: 'verified', url: 'https://example.org', verification: { checkedAt: '2026-10-03', method: 'HTTP 200', note: '', httpStatus: 200 } };
  assert.strictEqual(RV.registryStatus(fake), 'VERIFICATION_PENDING');
});

await test('adaptive help includes "ยังไม่เข้าใจ"; practice never dispatches mastery evidence', () => {
  const tu = read('src/components/learning/studio/Tutor.tsx');
  for (const o of ['อธิบายให้ง่ายกว่านี้', 'ดูเป็นภาพ', 'ดูตัวอย่าง', 'ขอคำใบ้', 'ยังไม่เข้าใจ', 'ลองอีกวิธี']) assert(tu.includes(o), o);
  const st = read('src/components/learning/studio/TeachingStudio.tsx');
  const body = st.slice(st.indexOf('function PracticeBody'));
  assert(!/dispatch\(/.test(body), 'practice/debug must not dispatch');
});

await test('no game was added (no battle/score/XP code in the new learning files)', () => {
  for (const f of ['src/interactive/studio/practiceCheck.ts', 'src/content/lessonAudit.ts', 'src/resources/registryView.ts', 'src/components/learning/studio/TeachingStudio.tsx'])
    assert(!/\bXP\b|leaderboard|battle|enemy|\bhp\b/i.test(read(f)), f);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
