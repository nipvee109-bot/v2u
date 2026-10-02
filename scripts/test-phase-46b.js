/**
 * Test Suite: Phase 46B — Official Admission Source Foundation
 * All records are SYNTHETIC FIXTURES ("fixture-" ids). No real data.
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

console.log('=== Phase 46B: Official Admission Source Foundation ===\n');

const A = await jiti.import(path.join(root, 'src/admission/engine.ts'));
const F = await jiti.import(path.join(root, 'src/admission/importFormat.ts'));
const { ADMISSION_REGISTRY } = await jiti.import(path.join(root, 'src/admission/registry.ts'));

const NOW = new Date('2026-10-02T00:00:00Z');
const src = (id, patch = {}) => ({ sourceId: id, sourceType: 'admission-page', publisher: 'Fixture', title: `Fixture ${id}`, publishedAt: '2026-09-01', ...patch });
const verified = (id, patch = {}) => src(id, { url: `https://example.org/${id}`, checkedAt: '2026-10-01', status: 'verified', ...patch });
const registry = () => ({
  sources: [verified('fixture-src-a'), verified('fixture-src-b', { sourceType: 'tcas-official' }), src('fixture-src-draft', { status: 'unverified', notes: 'staging only' })],
  exams: [{ id: 'fixture-exam', code: 'FX', title: 'Fixture exam', subjectIds: ['math'] }],
  universities: [{ id: 'fixture-uni', name: 'Fixture U', sourceIds: ['fixture-src-a'] }],
  faculties: [{ id: 'fixture-fac', universityId: 'fixture-uni', name: 'Fixture F' }],
  majors: [{ id: 'fixture-major', facultyId: 'fixture-fac', name: 'Fixture M', routeTargetId: 'target-computer-engineering' }],
  paths: [
    {
      id: 'fixture-path-ok', majorId: 'fixture-major', round: 3, name: 'Fixture verified', admissionYear: '2570', quota: 10,
      eligibility: [{ kind: 'education-level', allowed: ['ปวช.3'] }, { kind: 'gpax-min', min: 2.75 }],
      requirements: [{ kind: 'subject', subjectId: 'math', minReadinessPercent: 70 }, { kind: 'exam', examId: 'fixture-exam', minScore: 30, weightPercent: 50 }, { kind: 'portfolio', items: ['a', 'b'] }],
      milestones: [{ id: 'fixture-ms-1', kind: 'registration', title: 'Register', date: '2027-03-01', dateStatus: 'tentative' }],
      sourceIds: ['fixture-src-a', 'fixture-src-b'],
    },
    {
      id: 'fixture-path-mixed', majorId: 'fixture-major', round: 1, name: 'Fixture mixed sources', admissionYear: '2570',
      eligibility: [], requirements: [{ kind: 'gpax', min: 3 }], milestones: [],
      sourceIds: ['fixture-src-a', 'fixture-src-draft'],
    },
  ],
});

console.log('1. Source model');
await test('Source supports id, type, publisher, title, url, dates, checkedAt, status, notes', () => {
  const t = read('src/admission/types.ts');
  for (const f of ['sourceId', 'sourceType', 'publisher', 'title', 'url?', 'publishedAt?', 'updatedAt?', 'checkedAt?', 'status', 'notes?']) assert(t.includes(f), f);
  for (const k of ['university-announcement', 'faculty-announcement', 'admission-page', 'tcas-official', 'exam-official']) assert(t.includes(`'${k}'`), k);
});
await test('Shipped registry: no sources, no data (nothing verified without a checked official source)', () => {
  assert.deepStrictEqual(ADMISSION_REGISTRY.sources, []);
  assert.deepStrictEqual(A.validateAdmissionRegistry(), []);
});

console.log('\n2. Validation');
await test('Valid fixture registry passes', () => {
  assert.deepStrictEqual(A.validateAdmissionRegistry(registry()), []);
});
const errsFor = (mutate) => { const r = registry(); mutate(r); return A.validateAdmissionRegistry(r).join('\n'); };
await test('Missing source', () => {
  assert(errsFor((r) => { r.paths[0].sourceIds = []; }).includes('path fixture-path-ok: missing source'));
  assert(errsFor((r) => { r.universities[0].sourceIds = ['fixture-src-nope']; }).includes('unknown source fixture-src-nope'));
});
await test('Invalid URL', () => {
  assert(errsFor((r) => { r.sources[0].url = 'ftp://x'; }).includes('invalid url'));
  assert(errsFor((r) => { r.sources[2].url = 'not a url'; }).includes('invalid url'));
});
await test('Verified source without URL / without verification date', () => {
  assert(errsFor((r) => { delete r.sources[0].url; }).includes('verified source without url'));
  assert(errsFor((r) => { delete r.sources[0].checkedAt; }).includes('verified source without verification date'));
  assert(errsFor((r) => { r.sources[0].checkedAt = '01/10/2026'; }).includes('invalid checkedAt'));
});
await test('Duplicate source ids and duplicate admission path ids', () => {
  assert(errsFor((r) => { r.sources.push(verified('fixture-src-a')); }).includes('duplicate source id: fixture-src-a'));
  assert(errsFor((r) => { r.paths.push({ ...r.paths[1] }); }).includes('duplicate id: fixture-path-mixed'));
});
await test('Broken references (faculty, major, exam, subject)', () => {
  const e = errsFor((r) => {
    r.faculties[0].universityId = 'x';
    r.paths[0].majorId = 'y';
    r.paths[0].requirements.push({ kind: 'exam', examId: 'z' }, { kind: 'subject', subjectId: 'chemistry', minReadinessPercent: 50 });
  });
  for (const s of ['unknown university x', 'unknown major y', 'unknown exam z', 'unknown subject chemistry']) assert(e.includes(s), s);
});
await test('Stale / unknown source metadata are reported as warnings (non-blocking)', () => {
  const r = registry();
  r.sources[0].checkedAt = '2024-01-01';
  delete r.sources[1].publishedAt;
  const w = A.getSourceWarnings(r, NOW).join('\n');
  assert(w.includes('fixture-src-a: stale'));
  assert(w.includes('fixture-src-b: unknown published/updated date'));
  assert.deepStrictEqual(A.validateAdmissionRegistry(r), [], 'warnings do not invalidate data');
});
await test('An unverified source may record a URL to check later, but never counts as verified', () => {
  const r = registry();
  r.sources[2].url = 'https://example.org/draft';
  assert.deepStrictEqual(A.validateAdmissionRegistry(r), []);
  assert.strictEqual(A.isBackedByVerifiedSources(['fixture-src-draft'], r), false);
});

console.log('\n3. Only verified paths drive recommendations');
await test('A path is verified only when ALL its sources are verified', () => {
  const r = registry();
  assert.strictEqual(A.isBackedByVerifiedSources(r.paths[0].sourceIds, r), true);
  assert.strictEqual(A.isBackedByVerifiedSources(r.paths[1].sourceIds, r), false);
  assert.strictEqual(A.isBackedByVerifiedSources([], r), false);
  assert.deepStrictEqual(A.getPathsForRouteTarget('target-computer-engineering', r).map((p) => p.id), ['fixture-path-ok']);
  const st = { educationLevel: 'ปวช.3', subjectReadiness: {}, readySkillIds: [] };
  assert.strictEqual(A.evaluateAdmissionPath(r.paths[1], st, r).recommendable, false);
});

console.log('\n4. Import format');
await test('Registry → bundle → registry roundtrip is lossless', () => {
  const r = registry();
  const bundle = F.registryToBundle(r, '2026-10-02T00:00:00.000Z');
  assert.strictEqual(bundle.format, 'v2u-admission');
  assert.strictEqual(bundle.formatVersion, 1);
  assert.strictEqual(bundle.requirements.length, 4);
  assert.strictEqual(bundle.eligibility.length, 2);
  assert(bundle.admissionPaths.every((p) => !('requirements' in p) && !('milestones' in p)), 'rows are flat');
  assert.deepStrictEqual(F.bundleToRegistry(JSON.parse(JSON.stringify(bundle))), JSON.parse(JSON.stringify(r)));
});
await test('parseAdmissionImport accepts a valid bundle and returns warnings', () => {
  const r = registry();
  delete r.sources[1].publishedAt;
  const res = F.parseAdmissionImport(JSON.stringify(F.registryToBundle(r)), NOW);
  assert.strictEqual(res.ok, true, res.errors.join());
  assert(res.warnings.some((w) => w.includes('unknown published/updated date')));
  assert.strictEqual(res.registry.paths.length, 2);
});
await test('parseAdmissionImport rejects bad JSON, wrong format/version, missing tables, orphan rows, invalid data', () => {
  assert.strictEqual(F.parseAdmissionImport('{').ok, false);
  const good = F.registryToBundle(registry());
  const bad = (patch) => F.parseAdmissionImport(JSON.stringify({ ...good, ...patch }));
  assert(bad({ format: 'other' }).errors[0].includes('unknown format'));
  assert(bad({ formatVersion: 2 }).errors[0].includes('unsupported formatVersion'));
  assert(bad({ milestones: undefined }).errors.some((e) => e.includes('milestones must be an array')));
  assert(bad({ requirements: [...good.requirements, { pathId: 'ghost', position: 0, kind: 'gpax', gpaxMin: 3 }] }).errors.some((e) => e.includes('unknown path ghost')));
  assert(bad({ requirements: [...good.requirements, { ...good.requirements[0] }] }).errors.some((e) => e.includes('duplicate position')));
  assert(bad({ sources: good.sources.map((s) => ({ ...s, url: undefined })) }).errors.some((e) => e.includes('verified source without url')));
});
await test('Import layer is pure and provider-agnostic', () => {
  const c = read('src/admission/importFormat.ts');
  assert(!/from ['"](react|@supabase\/|axios)|useStore|\bfetch\(/.test(c));
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
