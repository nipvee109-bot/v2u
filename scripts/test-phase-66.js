/**
 * Test Suite: Phase 66 — Source & video verification
 * - OpenStax sources opened from the publisher repositories; evidence quotes pinned to commits
 * - Misconception metadata from lesson mistakes; discovered backlog never verified
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



console.log('=== Phase 66: Source & video verification ===\n');
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const { getInteractiveLesson } = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const RV = await jiti.import(path.join(root, 'src/resources/registryView.ts'));
const { DISCOVERED_RESOURCES } = await jiti.import(path.join(root, 'src/resources/discovered.ts'));
const A = await jiti.import(path.join(root, 'src/content/lessonAudit.ts'));
const KS = K.LESSON_KNOWLEDGE;
const SRC = new Map(K.SOURCES.map((s) => [s.id, s]));

await test('opened-repo sources: official OpenStax repository, pinned commit, opened sections listed', () => {
  const opened = K.SOURCES.filter((s) => s.verification === 'opened-repo');
  assert(opened.length >= 13, `${opened.length}`);
  for (const s of opened) {
    assert.match(s.repo.url, /^https:\/\/github\.com\/openstax\/osbooks-[a-z-]+$/);
    assert.match(s.repo.commit, /^[0-9a-f]{40}$/);
    assert(s.repo.modules.length > 0 && s.repo.modules.every((m) => /^m\d+$/.test(m.id) && m.section && m.title), s.id);
    assert.strictEqual(s.publisher, 'OpenStax (Rice University)');
  }
});

await test('every evidence quote for an opened-repo source points at a module that was opened', () => {
  let n = 0;
  for (const k of KS) for (const p of k.provenance) {
    const s = SRC.get(p.sourceId);
    for (const e of p.evidence ?? []) {
      if (!e.ref.startsWith('openstax:')) continue;
      assert.strictEqual(s.verification, 'opened-repo', `${k.lessonId}: openstax evidence on ${s.id}`);
      assert(s.repo.modules.some((m) => `openstax:${m.id}` === e.ref), `${k.lessonId}: ${e.ref} not in ${s.id}`);
      assert(e.quote.length >= 8 && e.claim.length > 0);
      n++;
    }
    if (s.verification === 'opened-repo') assert(p.crossChecked && (p.evidence ?? []).length > 0, `${k.lessonId}/${s.id}: opened but no evidence`);
  }
  assert(n >= 50, `${n} quotes`);
});

// The full verbatim check needs the publisher files (network to github.com, or OPENSTAX_DIR)
const dir = process.env.OPENSTAX_DIR;
await test(dir ? 'every OpenStax quote exists verbatim in the publisher source files (pinned commits)' : 'OpenStax verbatim check skipped (set OPENSTAX_DIR or run scripts/research/verify-openstax.mjs)', () => {
  if (!dir) return;
  const out = execFileSync('node', [path.join(root, 'scripts/research/verify-openstax.mjs')], { env: { ...process.env, OPENSTAX_DIR: dir }, encoding: 'utf-8' });
  assert(/0 missing/.test(out), out);
});

await test('every math and physics lesson now has opened textbook evidence; Thai curriculum stays pending', () => {
  for (const k of KS.filter((x) => !x.lessonId.startsWith('prog-'))) {
    assert(k.provenance.some((p) => SRC.get(p.sourceId).verification === 'opened-repo'), k.lessonId);
    const thai = k.provenance.filter((p) => p.sourceId.startsWith('ipst-'));
    for (const p of thai) assert.notStrictEqual(SRC.get(p.sourceId).verification, 'opened-repo');
    if (thai.length) assert.notStrictEqual(k.audit.readiness, 'READY', `${k.lessonId}: Thai alignment unverified`);
  }
});

await test('misconception metadata: only real wrong choices, only this lesson’s mistakes', () => {
  let n = 0;
  for (const k of KS) for (const c of k.checks) for (const m of c.misconceptions ?? []) {
    assert.notStrictEqual(m.choice, c.correctIndex, `${k.lessonId}/${c.id}: correct choice marked as misconception`);
    assert(m.choice >= 0 && m.choice < c.choices.length);
    assert(k.mistakes[m.mistake], `${k.lessonId}/${c.id}: mistake ${m.mistake}`);
    n++;
  }
  assert(n >= 15, `${n}`);
});

await test('misconceptions reach the understanding check (with mistake + fix text)', () => {
  const l = getInteractiveLesson('phy-vec-units');
  const item = l.finalCheck.find((f) => f.misconceptions?.length);
  assert(item);
  const k = K.getLessonKnowledge('phy-vec-units');
  assert(k.mistakes.some((m) => m.mistake === item.misconceptions[0].mistake && m.fix === item.misconceptions[0].fix));
  assert(read('src/components/learning/UnderstandingCheck.tsx').includes('check-misconception'));
});

await test('discovered backlog: never VERIFIED, never in the learner registry, URL from the publisher README', () => {
  for (const d of DISCOVERED_RESOURCES) {
    const r = RV.discoveredToRecord(d);
    assert.strictEqual(r.verificationStatus, 'VERIFICATION_PENDING');
    assert.strictEqual(r.actualContentInspected, false);
    assert.match(d.url, /^https:\/\/phet\.colorado\.edu\/en\/simulation\/[a-z-]+$/);
    assert(/@ [0-9a-f]{40}/.test(d.contentInspected));
    assert(d.limitations.length > 0);
  }
  assert(!read('src/resources/registry.ts').includes('phet.colorado.edu'));
  assert(RV.registryRecords().length > DISCOVERED_RESOURCES.length);
});

await test('no video is claimed: 0 verified videos, every video summary pending, no timestamps added', () => {
  for (const r of RV.registryRecords()) {
    if (r.type === 'video') { assert.notStrictEqual(r.verificationStatus, 'VERIFIED'); assert.strictEqual(r.summaryStatus, 'SUMMARY_PENDING'); }
  }
  for (const a of A.auditAllLessons()) assert.notStrictEqual(a.video, 'VERIFIED');
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
