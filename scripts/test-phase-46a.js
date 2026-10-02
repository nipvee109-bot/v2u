/**
 * Test Suite: Phase 46A — Admission Domain Foundation
 * All admission records below are SYNTHETIC TEST FIXTURES (ids prefixed
 * "fixture-"). No real university data is shipped or asserted.
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

console.log('=== Phase 46A: Admission Domain Foundation ===\n');

const A = await jiti.import(path.join(root, 'src/admission/engine.ts'));
const { ADMISSION_REGISTRY } = await jiti.import(path.join(root, 'src/admission/registry.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));

const verified = { sourceName: 'fixture source', sourceUrl: 'https://example.org/fixture', retrievedAt: '2026-10-01', status: 'verified' };
const fixture = () => ({
  exams: [{ id: 'fixture-exam-math', code: 'FX-MATH', title: 'Fixture math exam', subjectIds: ['math'], maxScore: 100 }],
  universities: [{ id: 'fixture-uni', name: 'Fixture University', source: verified }],
  faculties: [{ id: 'fixture-fac', universityId: 'fixture-uni', name: 'Fixture Faculty' }],
  majors: [{ id: 'fixture-major', facultyId: 'fixture-fac', name: 'Fixture Major', routeTargetId: 'target-computer-engineering' }],
  paths: [
    {
      id: 'fixture-path-r2', majorId: 'fixture-major', round: 2, name: 'Fixture round 2', admissionYear: '2570',
      eligibility: [{ kind: 'education-level', allowed: ['ปวช.3', 'ปวส.2'] }, { kind: 'gpax-min', min: 2.5 }],
      requirements: [
        { kind: 'subject', subjectId: 'math', minReadinessPercent: 70 },
        { kind: 'skill', skillId: 'skill-prog-loops' },
        { kind: 'exam', examId: 'fixture-exam-math', minScore: 40, weightPercent: 60 },
        { kind: 'portfolio', items: ['fixture project'] },
      ],
      milestones: [
        { id: 'm-reg', kind: 'registration', title: 'Fixture registration', date: '2026-11-01', dateStatus: 'tentative' },
        { id: 'm-ann', kind: 'announcement', title: 'Fixture announcement', dateStatus: 'unknown' },
      ],
      source: verified,
    },
    {
      id: 'fixture-path-r1', majorId: 'fixture-major', round: 1, name: 'Fixture round 1 (unverified)', admissionYear: '2570',
      eligibility: [], requirements: [{ kind: 'portfolio', items: ['fixture project'] }],
      milestones: [{ id: 'm1', kind: 'portfolio-submission', title: 'Fixture submission', date: '2026-10-15', dateStatus: 'confirmed' }],
      source: { sourceName: 'fixture note', status: 'unverified' },
    },
  ],
});
const state = (patch = {}) => ({
  educationLevel: 'ปวช.3',
  subjectReadiness: { math: 75, physics: 20, programming: 40 },
  readySkillIds: ['skill-prog-loops'],
  ...patch,
});

console.log('1. Shipped data');
await test('Shipped admission registry is empty — no invented university data', () => {
  for (const k of ['exams', 'universities', 'faculties', 'majors', 'paths']) assert.deepStrictEqual(ADMISSION_REGISTRY[k], [], k);
  assert.deepStrictEqual(A.validateAdmissionRegistry(), []);
});
await test('No route target has admission paths yet (UI stays on the generic route)', () => {
  assert.deepStrictEqual(A.getPathsForRouteTarget('target-computer-engineering'), []);
});

console.log('\n2. Validation');
await test('Well-formed fixture registry validates', () => {
  assert.deepStrictEqual(A.validateAdmissionRegistry(fixture()), []);
});
await test('Broken references, duplicates, bad dates/weights/sources are caught', () => {
  const f = fixture();
  f.faculties.push({ id: 'fixture-fac', universityId: 'nope', name: 'dup' });
  f.majors[0].routeTargetId = 'nope';
  f.paths[0].requirements.push({ kind: 'skill', skillId: 'skill-nope' }, { kind: 'exam', examId: 'fixture-exam-math', weightPercent: 60 });
  f.paths[0].milestones.push({ id: 'm-bad', kind: 'exam', title: 'x', dateStatus: 'confirmed' });
  f.paths[1].source = { sourceName: 'x', sourceUrl: 'https://example.org', status: 'unverified' };
  f.universities[0].source = { sourceName: 'x', status: 'verified' };
  const errs = A.validateAdmissionRegistry(f).join('\n');
  for (const s of ['duplicate id: fixture-fac', 'unknown university', 'unknown route target', 'unknown skill', 'weights exceed', 'needs an ISO date', 'unverified sources must not carry a url', 'verified sources need']) {
    assert(errs.includes(s), s);
  }
});

console.log('\n3. Evaluation');
await test('Eligibility: level rule, GPAX unknown vs. failing', () => {
  const p = fixture().paths[0];
  assert.strictEqual(A.checkEligibility(p, state({ gpax: 3.1 })).eligible, true);
  assert.strictEqual(A.checkEligibility(p, state()).eligible, 'unknown');
  assert.strictEqual(A.checkEligibility(p, state({ gpax: 2.0 })).eligible, false);
  assert.strictEqual(A.checkEligibility(p, state({ educationLevel: 'ปวช.2', gpax: 3.5 })).eligible, false);
});
await test('Requirements: met / gap / unknown are deterministic and explained in Thai', () => {
  const f = fixture();
  const e = A.evaluateAdmissionPath(f.paths[0], state(), f);
  assert.deepStrictEqual(e.requirements.map((r) => r.check), ['met', 'met', 'unknown', 'unknown']);
  assert.strictEqual(e.metCount, 2);
  assert.strictEqual(e.unknownCount, 2);
  const e2 = A.evaluateAdmissionPath(f.paths[0], state({ subjectReadiness: { math: 50 }, readySkillIds: [], examScores: { 'fixture-exam-math': 30 }, completedPortfolioItems: [] }), f);
  assert.deepStrictEqual(e2.requirements.map((r) => r.check), ['gap', 'gap', 'gap', 'gap']);
  assert(e2.requirements[0].detail.includes('ยังขาดอีก 20%'));
  assert.deepStrictEqual(A.evaluateAdmissionPath(f.paths[0], state(), f), e);
});
await test('Only verified paths are recommendable / returned by default', () => {
  const f = fixture();
  assert.strictEqual(A.evaluateAdmissionPath(f.paths[0], state(), f).recommendable, true);
  assert.strictEqual(A.evaluateAdmissionPath(f.paths[1], state(), f).recommendable, false);
  assert.deepStrictEqual(A.getPathsForRouteTarget('target-computer-engineering', f).map((p) => p.id), ['fixture-path-r2']);
  assert.deepStrictEqual(A.getPathsForRouteTarget('target-computer-engineering', f, { includeUnverified: true }).map((p) => p.id), ['fixture-path-r1', 'fixture-path-r2']);
});
await test('Student state builds from profile + Skill Gap output', () => {
  const s = A.buildStudentAdmissionState(
    { educationLevel: 'ปวส.2', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 },
    [{ subjectId: 'math', readinessPercent: 55, counts: {}, skills: [] }],
    [{ skill: { id: 'skill-math-slope' }, status: 'ready' }, { skill: { id: 'skill-math-trig-ratio' }, status: 'developing' }],
  );
  assert.deepStrictEqual(s, { educationLevel: 'ปวส.2', subjectReadiness: { math: 55 }, readySkillIds: ['skill-math-slope'] });
});

console.log('\n4. Bridges');
await test('Admission path converts to valid Route Engine requirements', () => {
  const f = fixture();
  const reqs = A.toRouteRequirements(f.paths[0], f);
  assert.deepStrictEqual(reqs.map((r) => r.kind), ['subject', 'exam', 'portfolio', 'application']);
  assert.strictEqual(reqs[0].title, 'คณิตศาสตร์');
  const ids = new Set(reqs.map((r) => r.id));
  reqs.forEach((r) => r.dependsOn.forEach((d) => assert(ids.has(d), d)));
  assert.deepStrictEqual(reqs[1].checklist, ['FX-MATH']);
  assert(reqs[3].dependsOn.includes(reqs[1].id) && reqs[3].dependsOn.includes(reqs[2].id));
});
await test('Upcoming milestones: dated, from today, soonest first', () => {
  const f = fixture();
  const up = A.getUpcomingMilestones(f.paths, new Date('2026-10-02T00:00:00Z'));
  assert.deepStrictEqual(up.map((x) => x.milestone.id), ['m1', 'm-reg']);
  assert.deepStrictEqual(A.getUpcomingMilestones(f.paths, new Date('2026-12-01T00:00:00Z')), []);
});

console.log('\n5. Architecture');
await test('Admission layer is pure and provider-agnostic (no React/store/network/backend SDK)', () => {
  for (const f of ['src/admission/types.ts', 'src/admission/registry.ts', 'src/admission/engine.ts']) {
    const c = read(f);
    assert(!/from ['"](react|@supabase\/|axios)|useStore|\bfetch\(/.test(c), f);
  }
});
await test('Existing route still validates and primary nav still 5 items', () => {
  assert.deepStrictEqual(RE.validateRouteData(), []);
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
