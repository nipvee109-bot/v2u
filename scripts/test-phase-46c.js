/**
 * Test Suite: Phase 46C — Admission Profile Inputs
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

console.log('=== Phase 46C: Admission Profile Inputs ===\n');

const A = await jiti.import(path.join(root, 'src/admission/engine.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { initialLessons, initialWeeklyGoal } = await jiti.import(path.join(root, 'src/data/initialData.ts'));

const lessons = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const profile = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };
const k = A.checklistKey;

console.log('1. Inputs model');
await test('Three plain-Thai results: ผ่าน / ยังขาด / ยังไม่ทราบ', () => {
  assert.deepStrictEqual(A.CHECK_LABEL, { met: 'ผ่าน', gap: 'ยังขาด', unknown: 'ยังไม่ทราบ' });
});
await test('Empty by default — nothing inferred', () => {
  assert.deepStrictEqual(A.EMPTY_ADMISSION_INPUTS, { gpax: null, examScores: {}, checklist: {} });
  assert.deepStrictEqual(A.normalizeAdmissionInputs(undefined), A.EMPTY_ADMISSION_INPUTS);
});
await test('Normalisation drops invalid values instead of guessing', () => {
  const n = A.normalizeAdmissionInputs({ gpax: 4.5, examScores: { a: -1, b: 55, c: Number.NaN }, checklist: { x: 'met', y: 'maybe' } });
  assert.strictEqual(n.gpax, null);
  assert.deepStrictEqual(n.examScores, { b: 55 });
  assert.deepStrictEqual(n.checklist, { x: 'met' });
  assert.strictEqual(A.normalizeAdmissionInputs({ gpax: 3.256 }).gpax, 3.26);
  assert.strictEqual(A.isValidGpax(0) && A.isValidGpax(4) && !A.isValidGpax(4.01), true);
});

console.log('\n2. Route uses only what the student answered');
await test('Unanswered checklist items are "unknown"', () => {
  const r = RE.buildStudentRoute({ profile, storeLessons: lessons });
  const exams = r.steps.find((s) => s.requirement.id === 'req-exams');
  assert(exams.checklist.length > 0 && exams.checklist.every((c) => c.status === 'unknown'));
  assert.strictEqual(exams.status, 'locked');
});
await test('Answers drive stage status: some met → in progress, all met → done', () => {
  const ports = ['โปรเจกต์โปรแกรมอย่างน้อย 1 ชิ้น', 'ผลงาน/รางวัล/การแข่งขันจากสายอาชีพ', 'เรียงความแนะนำตัวและเหตุผลที่เลือกสาขา'];
  const progDone = lessons.map((l) => (l.subjectId === 'programming' ? { ...l, status: 'COMPLETED' } : l));
  const some = RE.buildStudentRoute({ profile, storeLessons: progDone, checklist: { [k('req-portfolio', ports[0])]: 'met', [k('req-portfolio', ports[1])]: 'gap' } });
  const p1 = some.steps.find((s) => s.requirement.id === 'req-portfolio');
  assert.strictEqual(p1.status, 'in-progress');
  assert.deepStrictEqual(p1.checklist.map((c) => c.status), ['met', 'gap', 'unknown']);
  const all = Object.fromEntries(ports.map((p) => [k('req-portfolio', p), 'met']));
  assert.strictEqual(RE.buildStudentRoute({ profile, storeLessons: lessons, checklist: all }).steps.find((s) => s.requirement.id === 'req-portfolio').status, 'done');
});
await test('Adaptive Next Step accepts checklist answers (route context)', () => {
  const s = getNextStep({ lessons, route: { profile, records: [], checklist: { [k('req-exams', 'TGAT')]: 'met' } } });
  assert.strictEqual(s.rule, 'route');
});

console.log('\n3. Admission evaluation from inputs');
await test('GPAX / exam scores flow into admission state only when entered', () => {
  const none = A.buildStudentAdmissionState(profile, [], [], {}, A.EMPTY_ADMISSION_INPUTS);
  assert(!('gpax' in none) && !('examScores' in none));
  const some = A.buildStudentAdmissionState(profile, [], [], {}, { gpax: 3.1, examScores: { 'fixture-exam': 50 }, checklist: {} });
  assert.strictEqual(some.gpax, 3.1);
  assert.deepStrictEqual(some.examScores, { 'fixture-exam': 50 });
});
await test('Fixture path: GPAX unknown → ยังไม่ทราบ; entered → ผ่าน / ยังขาด', () => {
  const path = { id: 'fixture-p', majorId: 'm', round: 1, name: 'fixture', admissionYear: '2570', eligibility: [], requirements: [{ kind: 'gpax', min: 2.5 }], milestones: [], sourceIds: [] };
  const ev = (inputs) => A.evaluateAdmissionPath(path, A.buildStudentAdmissionState(profile, [], [], {}, inputs)).requirements[0].check;
  assert.strictEqual(ev(A.EMPTY_ADMISSION_INPUTS), 'unknown');
  assert.strictEqual(ev({ gpax: 3, examScores: {}, checklist: {} }), 'met');
  assert.strictEqual(ev({ gpax: 2, examScores: {}, checklist: {} }), 'gap');
});

console.log('\n4. Persistence');
const base = {
  lessons: lessons.slice(0, 2), sessions: [], learningSessionsHistory: [], unclearTopics: [], weeklyGoal: initialWeeklyGoal,
  reviewQueue: [], goals: [], resources: [], hasCompletedOnboarding: true, studentProfile: profile,
};
const inputs = { gpax: 3.25, examScores: {}, checklist: { [k('req-exams', 'TGAT')]: 'met' } };
await test('Backup exports and re-imports admission inputs', () => {
  const p = I.createExportPayload({ ...base, admissionInputs: inputs });
  const r = I.validateAndParseImport(JSON.stringify(p));
  assert.strictEqual(r.isValid, true, r.errors.join());
  assert.deepStrictEqual(r.migratedPayload.admissionInputs, inputs);
});
await test('Tampering with admission inputs breaks the checksum', () => {
  const p = JSON.parse(JSON.stringify(I.createExportPayload({ ...base, admissionInputs: inputs })));
  p.admissionInputs.gpax = 4;
  assert.strictEqual(I.validateAndParseImport(JSON.stringify(p)).isValid, false);
});
await test('v5 files without admission inputs keep verifying and importing', () => {
  const p = I.createExportPayload(base);
  assert(!('admissionInputs' in p));
  const r = I.validateAndParseImport(JSON.stringify(p));
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.migratedPayload.admissionInputs, undefined);
});
await test('Store: inputs persisted, reset, and restored on import only when present', () => {
  const s = read('src/store/useStore.ts');
  for (const x of ['admissionInputs: EMPTY_ADMISSION_INPUTS', 'setGpax', 'setExamScore', 'setChecklistAnswer',
    '...(data.admissionInputs ? { admissionInputs: normalizeAdmissionInputs(data.admissionInputs) } : {})']) assert(s.includes(x), x);
  const settings = read('src/pages/Settings.tsx');
  assert(settings.includes('admissionInputs: finalPayload.admissionInputs') && settings.includes('admissionInputs: p.admissionInputs'));
});

console.log('\n5. UI');
await test('ฉัน shows "ข้อมูลของฉันตอนนี้เป็นอย่างไร?" with GPAX input and ผ่าน/ยังขาด/ยังไม่ทราบ summary', () => {
  const card = read('src/components/AdmissionStatusCard.tsx');
  assert(card.includes('ข้อมูลของฉันตอนนี้เป็นอย่างไร?') && card.includes('id="gpax-input"') && card.includes('CHECK_LABEL'));
  assert(card.includes('getPathsForRouteTarget('), 'uses verified admission paths only');
  assert(read('src/pages/hubs/MeHub.tsx').includes('<AdmissionStatusCard />'));
});
await test('เส้นทาง lets the student answer each checklist item', () => {
  const hub = read('src/pages/hubs/RouteHub.tsx');
  assert(hub.includes('<ChecklistAnswerControl') && hub.includes('setChecklistAnswer(c.key, answer)'));
  assert(read('src/hooks/useNextStep.ts').includes('checklist: admissionInputs?.checklist'), 'answers reach the shared route inputs');
});
await test('Primary navigation still exactly 5 items', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
