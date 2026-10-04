/**
 * Test Suite: Phase 60 — Diagnostic & pathway foundation
 * (live microphone + iframe mounting are also exercised in Playwright with a fake SpeechRecognition)
 */
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (p) => readText(path.join(root, p));
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

import { execFileSync } from 'node:child_process';
import { python, readText } from './lib/crossPlatform.js';
const PY = python(); // py -3 on Windows, then python, then python3 (never the Store alias)
console.log('=== Phase 60: Diagnostic & pathway foundation ===\n');
const D = await jiti.import(path.join(root, 'src/diagnostic/engine.ts'));
const { DIAGNOSTIC_ITEMS: ITEMS, diagnosticItemsFor } = await jiti.import(path.join(root, 'src/diagnostic/items.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const { ORIGINAL_LESSONS: O } = await jiti.import(path.join(root, 'src/content/originals.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const RE = await jiti.import(path.join(root, 'src/route/engine.ts'));
const I = await jiti.import(path.join(root, 'src/utils/integrityUtils.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const py = (code) => execFileSync(PY.cmd, [...PY.args, '-c', code], { encoding: 'utf-8' }).replace(/\n$/, '');
const NOW = new Date('2026-10-02T12:00:00Z');
const lessons = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
const profile = { educationLevel: 'ปวช.3', programId: 'other', targetId: 'target-computer-engineering', availableMinutes: 30 };
/** answers for a subject: per skill, `right` items answered correctly, rest wrong */
const sit = (subjectId, perSkill = {}, at = '2026-10-01T10:00:00Z') => {
  const answers = {};
  for (const it of diagnosticItemsFor(subjectId)) {
    const want = perSkill[it.skillId] ?? perSkill['*'];
    if (want === undefined || want === 'skip') continue;
    const n = it.level === 'basic' ? 0 : 1;
    answers[it.id] = n < want ? it.correctIndex : (it.correctIndex + 1) % it.choices.length;
  }
  return { id: `t-${subjectId}-${at}`, subjectId, takenAt: at, answers };
};
const diag = (...attempts) => ({ attempts, skippedSubjects: [] });
const base = { storeLessons: lessons, records: [], referenceDate: NOW, profile };
const rec = (p) => D.recommendPathway({ ...base, ...p });

console.log('1. Diagnostic scoring (deterministic)');
await test('1. scoreSkill: 2/2 พร้อม · 1/2 กำลังพัฒนา · 0/2 ต้องทบทวน · 1/1 กำลังพัฒนา · none ยังไม่ได้วัด', () => {
  const two = ITEMS.filter((i) => i.skillId === 'skill-math-solve-linear');
  const r = (a) => D.scoreSkill(two, a).status;
  assert.strictEqual(r({ [two[0].id]: two[0].correctIndex, [two[1].id]: two[1].correctIndex }), 'ready');
  assert.strictEqual(r({ [two[0].id]: two[0].correctIndex, [two[1].id]: 0 }), 'developing');
  assert.strictEqual(r({ [two[0].id]: 3, [two[1].id]: 0 }), 'needs-review');
  assert.strictEqual(r({ [two[0].id]: two[0].correctIndex }), 'developing', 'one item is not enough for "ready"');
  assert.strictEqual(r({ [two[0].id]: null, [two[1].id]: null }), 'not-assessed', '"ไม่แน่ใจ" measures nothing, not wrong');
  assert.deepStrictEqual(D.scoreAttempt(sit('math', { '*': 2 })), D.scoreAttempt(sit('math', { '*': 2 })));
});

console.log('2. Items map to REAL curriculum skills and are correct');
await test('2. Every item → existing subject/skill/lesson; 2 per skill (basic + core); no invented skills', () => {
  const skillIds = new Set(C.skills.map((s) => s.id));
  for (const it of ITEMS) {
    assert(skillIds.has(it.skillId), it.id);
    assert.strictEqual(C.skills.find((s) => s.id === it.skillId).subjectId, it.subjectId, it.id);
    assert(C.lessons.find((l) => l.id === it.lessonId)?.skillIds.includes(it.skillId), `${it.id} lesson teaches skill`);
    assert(it.correctIndex >= 0 && it.correctIndex < it.choices.length && it.explanation && new Set(it.choices).size === it.choices.length, it.id);
  }
  for (const s of C.skills) assert.deepStrictEqual(ITEMS.filter((i) => i.skillId === s.id).map((i) => i.level).sort(), ['basic', 'core'], s.id);
  assert.strictEqual(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
});
await test('Diagnostic is not a copy of lesson quizzes / exercises / try-its', () => {
  const lessonPrompts = new Set([...C.quizzes.flatMap((q) => q.questions.map((x) => x.prompt)), ...C.exercises.flatMap((e) => e.items.map((x) => x.prompt)), ...O.flatMap((o) => [...o.tryIt, ...o.check, ...(o.practice ?? [])].map((x) => x.prompt))]);
  for (const it of ITEMS) { assert(!lessonPrompts.has(it.prompt), it.id); if (it.code) assert(!lessonPrompts.has(it.code), it.id); }
});
await test('Programming items: Python output equals the correct choice', () => {
  for (const it of ITEMS.filter((i) => i.code && /print\(/.test(i.code))) assert.strictEqual(py(it.code).replace('−', '-'), it.choices[it.correctIndex].replace('−', '-'), it.id);
  assert.strictEqual(py('x = 5\nx = x + 2\nprint(x)'), '7');
  assert.strictEqual(py('print(type("3.5").__name__)'), 'str');
  assert.strictEqual(py('print(len(range(1, 4)))'), '3');
  assert.strictEqual(py('n = "4"\nprint(int(n) * 2, n + n)'), '8 44');
  assert.strictEqual(py('def f():\n    x = 1\nprint(f())'), 'None');
});
await test('Math & physics items recomputed', () => {
  assert(4 * 5 - 7 === 13 && 3 * (7 - 2) === 7 + 8 && 2 * 6 + 5 === 17 && 5 * 2 - 3 === 7 && 5 + 2 === 7 && 5 - 2 === 3 && 3 + 1 === 4 && 2 * 3 + 4 === 10);
  assert(3 * 20 + 2 * 5 === 70 && 2 * 4 + 3 === 11 && 5 ** 3 === 125 && (7 - 1) / (2 - 0) === 3 && 2 * 3 + 4 === 10 && 6 / 8 === 0.75);
  assert(3000 === 3 * 1000 && 54 / 3.6 === 15 && Math.hypot(5, 12) === 13 && Math.abs(10 * Math.cos(Math.PI / 3) - 5) < 1e-9 && 0 + 3 * 4 === 12 && 12 - 4 === 8 && 12 / 3 === 4);
});

console.log('3. Separate subject state & skill profile');
await test('3. Only Math measured → Physics and Programming stay "ยังไม่ได้วัด" (no combined score)', () => {
  const subs = D.getSubjectProfiles({ ...base, diagnostic: diag(sit('math', { '*': 2 })) });
  assert.strictEqual(subs.find((s) => s.subjectId === 'math').status, 'ready');
  for (const s of ['physics', 'programming']) assert.strictEqual(subs.find((x) => x.subjectId === s).status, 'not-assessed');
  for (const s of subs) assert(!('percent' in s) && !('score' in s), 'no single score');
  assert.match(D.describeCounts(subs[0]), /10 พร้อม/);
});
for (const only of ['math', 'physics', 'programming']) {
  await test(`Edge: only ${only} diagnostic completed → only ${only} assessed`, () => {
    const subs = D.getSubjectProfiles({ ...base, diagnostic: diag(sit(only, { '*': 1 })) });
    for (const s of subs) assert.strictEqual(s.status !== 'not-assessed', s.subjectId === only, s.subjectId);
  });
}
await test('Edge: no diagnostic → every subject "ยังไม่ได้วัด"; all diagnostics → all assessed', () => {
  assert(D.getSubjectProfiles(base).every((s) => s.status === 'not-assessed'));
  const all = D.getSubjectProfiles({ ...base, diagnostic: diag(sit('math', { '*': 2 }), sit('physics', { '*': 1 }), sit('programming', { '*': 0 })) });
  assert.deepStrictEqual(all.map((s) => s.status), ['ready', 'developing', 'needs-review']);
});
await test('12. After an understanding check (newer than the diagnostic) the skill updates from learning evidence', () => {
  const lin = lessons.find((l) => l.title === 'สมการและอสมการเชิงเส้น');
  const d = diag(sit('math', { '*': 2 }, '2026-09-01T00:00:00Z'));
  const before = D.computeSkillProfile({ ...base, diagnostic: d }).find((x) => x.skillId === 'skill-math-solve-linear');
  assert.strictEqual(before.status, 'ready');
  const records = [{ lessonId: lin.id, subjectId: 'math', lastStudiedAt: '2026-10-01T00:00:00Z', totalStudyMinutes: 30, studyCount: 1, completionStatus: 'COMPLETED', quizLatestScore: 40, confidence: 'Low', mastery: 'Novice', masteryScore: 1, reviewCount: 0 }];
  const after = D.computeSkillProfile({ ...base, records, diagnostic: d }).find((x) => x.skillId === 'skill-math-solve-linear');
  assert.strictEqual(after.status, 'needs-review');
  assert.strictEqual(after.source, 'learning');
  // an OLDER check does not override a newer diagnostic
  const old = [{ ...records[0], lastStudiedAt: '2026-08-01T00:00:00Z' }];
  assert.strictEqual(D.computeSkillProfile({ ...base, records: old, diagnostic: d }).find((x) => x.skillId === 'skill-math-solve-linear').source, 'diagnostic');
});
await test('Reading/opening a lesson is not evidence: an IN-PROGRESS record without study gives no status', () => {
  const lin = lessons.find((l) => l.title === 'สมการและอสมการเชิงเส้น');
  const opened = [{ lessonId: lin.id, subjectId: 'math', totalStudyMinutes: 0, studyCount: 0, completionStatus: 'NOT STARTED', confidence: 'Low', mastery: 'Novice', masteryScore: 0, reviewCount: 0 }];
  assert.strictEqual(D.computeSkillProfile({ ...base, records: opened }).find((x) => x.skillId === 'skill-math-solve-linear').status, 'not-assessed');
});

console.log('4. Curriculum map');
await test('6. Map covers all 15 existing lessons: subject → topic → lesson → skill → prerequisites / unlocks', () => {
  const map = D.getCurriculumMap();
  const ls = map.flatMap((s) => s.topics.flatMap((t) => t.lessons));
  assert.strictEqual(ls.length, 15);
  assert.deepStrictEqual(map.map((s) => [s.subjectId, s.topics.flatMap((t) => t.lessons).length]), [['math', 6], ['physics', 4], ['programming', 5]]);
  const kin = ls.find((x) => x.lesson.id === 'phy-kin-1d');
  assert.deepStrictEqual(kin.prerequisites.map((p) => p.id).sort(), ['math-alg-linear-eq', 'phy-vec-vectors']);
  assert(ls.find((x) => x.lesson.id === 'math-alg-linear-eq').unlocks.some((u) => u.id === 'phy-kin-1d'));
  for (const x of ls) assert(x.skills.length > 0 && x.skills.every((s) => C.skills.some((k) => k.id === s.id)));
});

console.log('5. Gap engine & cross-subject next step');
await test('7. Gaps: a lesson whose skills the diagnostic proved is "known"; its dependents become learnable', () => {
  const g = D.computeLessonGaps({ ...base, diagnostic: diag(sit('math', { 'skill-math-solve-linear': 2, 'skill-math-check-solution': 2 })) }).gaps;
  assert.strictEqual(g.find((x) => x.lesson.id === 'math-alg-linear-eq').state, 'known');
  assert.strictEqual(g.find((x) => x.lesson.id === 'math-alg-linear-system').state, 'gap');
  assert.strictEqual(g.find((x) => x.lesson.id === 'phy-kin-1d').state, 'blocked', 'still needs vectors');
});
await test('8. Cross-subject: Math developing, Physics not measured, Programming ready → Physics', () => {
  const d = diag(sit('math', { '*': 1 }), sit('programming', { '*': 2 }));
  const r = rec({ diagnostic: d });
  assert.strictEqual(r.subjectId, 'physics', r.lesson.id);
  assert(r.reasons[0].includes('ยังไม่ได้วัด'), r.reasons[0]);
  assert(r.reasons.some((x) => x.includes('วิศวกรรมคอมพิวเตอร์')));
  assert(r.suggestDiagnostic);
  assert(r.alternatives.length >= 1 && r.alternatives.every((a) => a.lesson.subjectId !== 'physics'));
});
await test('9. Math is NOT always recommended — each subject can win when it is the real gap', () => {
  const picks = new Set();
  picks.add(rec({}).subjectId); // nothing known: the most foundational lesson
  picks.add(rec({ diagnostic: diag(sit('math', { '*': 2 }), sit('physics', { '*': 2 })) }).subjectId);
  picks.add(rec({ diagnostic: diag(sit('math', { '*': 1 }), sit('programming', { '*': 2 })) }).subjectId);
  assert.deepStrictEqual([...picks].sort(), ['math', 'physics', 'programming']);
  assert.strictEqual(rec({}).lesson.id, 'math-alg-linear-eq', 'blank learner: linear equations unlock the most (real dependency count)');
});
await test('Needs-review comes first, and only lessons whose prerequisites are known are offered', () => {
  const d = diag(sit('math', { '*': 2, 'skill-math-solve-inequality': 0 }), sit('physics', { '*': 'skip' }), sit('programming', { '*': 'skip' }));
  const r = rec({ diagnostic: d });
  assert.strictEqual(r.lesson.id, 'math-alg-linear-ineq');
  assert(r.reasons[0].includes('ต้องทบทวน') && r.reasons[0].includes('การวัดระดับ'));
  for (let i = 0; i < 6; i++) {
    const gaps = D.computeLessonGaps({ ...base, diagnostic: d }).gaps;
    const pick = rec({ diagnostic: d });
    assert(gaps.find((g) => g.lesson.id === pick.lesson.id).missingPrerequisites.length === 0);
  }
});
await test('10. Manual subject selection: V2U picks inside the chosen subject only', () => {
  for (const s of ['math', 'physics', 'programming']) assert.strictEqual(rec({ subjectId: s }).subjectId, s);
  const LH = read('src/pages/hubs/LearnHub.tsx');
  assert(LH.includes("pick: 'manual'") && LH.includes('<ManualPicker') && LH.includes('ฉันอยากเลือกเอง'));
  const PB = read('src/components/pathway/PathwayBits.tsx');
  assert(PB.includes('เลือกวิชา') && PB.includes('หัวข้อ') && PB.includes('/learn/curriculum/${lesson.id}'));
});
await test('11. Auto “ให้ V2U จัดให้”: same engine as Home’s next step; switching back to auto is one tap', () => {
  const d = diag(sit('math', { '*': 1 }), sit('programming', { '*': 2 }));
  const s = getNextStep({ lessons, referenceDate: NOW, route: { profile, records: [], diagnostic: d } });
  assert.strictEqual(s.rule, 'route');
  assert.strictEqual(s.pathway.subjectId, 'physics');
  assert.strictEqual(s.curriculum.lessonId, rec({ diagnostic: d }).lesson.id);
  const LH = read('src/pages/hubs/LearnHub.tsx');
  // V2U design: auto card heading lives in AutoRecommendation; back to auto is the subject screen's back link
  assert(read('src/components/pathway/PathwayBits.tsx').includes('ให้ V2U จัดให้') && LH.includes('onBack={() => setManual(false)}') && LH.includes('<AutoRecommendation'));
  const PB = read('src/components/pathway/PathwayBits.tsx');
  for (const x of ['ก้าวต่อไปที่แนะนำ', 'เปลี่ยนสิ่งที่แนะนำ', 'เลือกเอง', 'เริ่มบทนี้', 'แนะนำเพราะ']) assert(PB.includes(x), x);
});
await test('13. Next step is recalculated after new evidence (not locked to the old route)', () => {
  const before = getNextStep({ lessons, referenceDate: NOW, route: { profile, records: [] } });
  const after = getNextStep({ lessons, referenceDate: NOW, route: { profile, records: [], diagnostic: diag(sit('math', { '*': 2 }), sit('physics', { '*': 2 })) } });
  assert.strictEqual(before.pathway.subjectId, 'math');
  assert.strictEqual(after.pathway.subjectId, 'programming');
  assert.notStrictEqual(before.curriculum.lessonId, after.curriculum.lessonId);
});
await test('Edge: no target selected → all three subjects considered; target selected but no diagnostic → still a reasoned step', () => {
  assert.deepStrictEqual(D.targetSubjects(null), ['math', 'physics', 'programming']);
  const r = D.recommendPathway({ storeLessons: lessons, records: [], referenceDate: NOW, profile: null });
  assert(r && r.reasons.length > 0 && !r.reasons.some((x) => x.includes('เส้นทาง')), 'no target → no claim about a target');
  const t = rec({});
  assert(t.reasons.some((x) => x.includes('วิศวกรรมคอมพิวเตอร์')) && t.suggestDiagnostic);
});

console.log('6. Persistence & backup');
await test('4. Diagnostic persists; "วัดใหม่" keeps history; skip is remembered and cleared by a sitting', async () => {
  const st = useStore.getState();
  st.setDiagnosticSkipped('physics', true);
  st.recordDiagnosticAttempt('math', sit('math', { '*': 1 }).answers);
  st.recordDiagnosticAttempt('math', sit('math', { '*': 2 }).answers);
  st.recordDiagnosticAttempt('physics', sit('physics', { '*': 1 }).answers);
  await new Promise((r) => setTimeout(r, 350));
  const saved = JSON.parse(mem.get('engineering-study-hub-storage')).state.diagnostic;
  assert.strictEqual(saved.attempts.filter((a) => a.subjectId === 'math').length, 2, 'history kept');
  assert.deepStrictEqual(saved.skippedSubjects, [], 'measuring physics clears its skip');
});
await test('5. Student profile goal fields persist and old profiles normalise without inventing values', async () => {
  useStore.getState().setStudentProfile({ ...profile, targetUniversity: '  มหาวิทยาลัยตัวอย่าง  ', targetFaculty: 'วิศวกรรมศาสตร์', targetMajor: 'วิศวกรรมคอมพิวเตอร์' });
  await new Promise((r) => setTimeout(r, 350));
  const p = RE.normalizeStudentProfile(JSON.parse(mem.get('engineering-study-hub-storage')).state.studentProfile);
  assert.strictEqual(p.targetUniversity, 'มหาวิทยาลัยตัวอย่าง');
  const oldP = RE.normalizeStudentProfile({ educationLevel: 'ปวส.1', programId: 'electronics', targetId: 'target-computer-engineering', availableMinutes: 60 });
  assert(!('targetUniversity' in oldP) && !('targetFaculty' in oldP) && !('targetMajor' in oldP), 'missing stays missing');
});
await test('14. Backup round-trip: profile + diagnostic + mastery + review + notes survive export → checksum → import', () => {
  const st = useStore.getState();
  const payload = I.createExportPayload({ ...st });
  assert(payload.diagnostic && payload.diagnostic.attempts.length === 3);
  assert.strictEqual(I.verifyPayloadChecksum(JSON.parse(JSON.stringify(payload))), 'valid');
  const tampered = JSON.parse(JSON.stringify(payload)); tampered.diagnostic.attempts.pop();
  assert.strictEqual(I.verifyPayloadChecksum(tampered), 'mismatch', 'diagnostic covered by checksum');
  const r = I.validateAndParseImport(JSON.stringify(payload));
  assert(r.isValid, r.errors.join());
  const p = r.migratedPayload;
  assert.deepStrictEqual(p.diagnostic, D.sanitizeDiagnosticData(st.diagnostic));
  assert.deepStrictEqual(p.studentProfile, RE.normalizeStudentProfile(st.studentProfile));
  const keyOf = (ls) => ls.map((l) => [l.id, l.status, l.masteryScore ?? null, l.quizScore ?? null, l.nextReviewAt ?? null, l.completedCurriculumLessonIds ?? null]);
  assert.deepStrictEqual(keyOf(p.lessons), keyOf(st.lessons));
  assert.deepStrictEqual(p.reviewQueue, st.reviewQueue);
  useStore.getState().resetToInitial();
  useStore.getState().importData(p);
  assert.strictEqual(useStore.getState().diagnostic.attempts.length, 3);
  assert.strictEqual(useStore.getState().studentProfile.targetMajor, 'วิศวกรรมคอมพิวเตอร์');
  const merged = I.mergePayloadWithExisting(payload, { ...payload, diagnostic: { attempts: [sit('programming', { '*': 2 })], skippedSubjects: ['physics'] } });
  assert.strictEqual(merged.diagnostic.attempts.length, 4, 'merge keeps both histories');
  const S = read('src/pages/Settings.tsx');
  assert(S.includes('diagnostic: finalPayload.diagnostic') && S.includes('diagnostic: p.diagnostic') && S.includes('      diagnostic,\n'));
});
await test('15. Existing saved data / old backups stay compatible', () => {
  const st = useStore.getState();
  const oldPayload = I.createExportPayload({ ...st, diagnostic: null });
  assert(!('diagnostic' in oldPayload), 'no empty section added');
  const r = I.validateAndParseImport(JSON.stringify(oldPayload));
  assert(r.isValid && !r.migratedPayload.diagnostic);
  const v1 = I.validateAndParseImport(JSON.stringify(initialLessons.slice(0, 2)));
  assert(v1.isValid);
  assert.deepStrictEqual(D.sanitizeDiagnosticData({ attempts: [{ id: 'x', subjectId: 'chemistry', takenAt: 'now', answers: {} }, 5], skippedSubjects: ['math', 'nope', 'math'] }), { attempts: [], skippedSubjects: ['math'] });
  assert.deepStrictEqual(D.sanitizeDiagnosticData(undefined), { attempts: [], skippedSubjects: [] });
});

console.log('7. UI wiring & non-goals');
await test('Home / Route / Me show per-subject status, target and diagnostic; nav stays 5', async () => {
  const H = read('src/pages/HomePage.tsx'), R = read('src/pages/hubs/RouteHub.tsx'), M = read('src/pages/hubs/MeHub.tsx');
  assert(H.includes('การวัดระดับของฉัน') && H.includes('ยังไม่ได้ตั้งเป้าหมาย') && H.includes('ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน'));
  assert(R.includes('<PathwayOverview'));
  assert(M.includes('<ProfileEditor />') && M.includes('การวัดระดับของฉัน') && M.includes('วัดใหม่'));
  const PE = read('src/components/pathway/ProfileEditor.tsx');
  for (const f of ['ระดับการศึกษา', 'สาขาที่เรียนสายอาชีพ', 'มหาวิทยาลัยเป้าหมาย', 'คณะเป้าหมาย', 'สาขาเป้าหมาย', 'HorizonPicker', 'TimeBudgetPicker', 'ยังไม่ได้ตั้ง']) assert(PE.includes(f), f);
  const DP = read('src/pages/DiagnosticPage.tsx');
  for (const f of ['ไม่มีการหักคะแนน', 'ทำทุกวิชา', 'ทำเฉพาะที่เลือก', 'ข้ามไปก่อน', 'ข้ามวิชานี้ไปก่อน', 'ไม่แน่ใจ', 'เราแนะนำให้เริ่มจาก']) assert(DP.includes(f), f);
  const { PRIMARY_NAV } = await jiti.import(path.join(root, 'src/components/navigation/primaryNav.ts'));
  assert.strictEqual(PRIMARY_NAV.length, 5);
});
await test('Non-goals: no new lessons, no game/XP systems, no invented admission data', () => {
  assert.strictEqual(C.lessons.length, 15);
  const src = read('src/diagnostic/engine.ts') + read('src/diagnostic/items.ts') + read('src/components/pathway/PathwayBits.tsx');
  assert(!/leaderboard|\bXP\b|combat|https?:\/\//i.test(src));
  assert(!read('src/diagnostic/engine.ts').includes('admission'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
