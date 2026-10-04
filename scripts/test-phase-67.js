/**
 * Test Suite: Phase 67 — YouTube-first resources + subject expansion
 * - Only ACTIONABLE resources (verified real URL) reach learners; YouTube metadata rules
 * - Subjects come from one registry; no fixed three-subject assumptions
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



console.log('=== Phase 67: YouTube-first resources + subject expansion ===\n');
const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const V = await jiti.import(path.join(root, 'src/video/engine.ts'));
const RV = await jiti.import(path.join(root, 'src/resources/registryView.ts'));
const { YOUTUBE_CANDIDATES } = await jiti.import(path.join(root, 'src/resources/youtubeCandidates.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const SR = await jiti.import(path.join(root, 'src/subjects/registry.ts'));
const D = await jiti.import(path.join(root, 'src/diagnostic/engine.ts'));
const { asActionable } = await import('./lib/actionableFixture.js');
E.__setResourceRegistryForTests(); // the REAL registry

const base = R.find((r) => r.id === 'cr-khan-alg1-equations');
const verified = (patch = {}) => ({ ...base, status: 'verified', url: 'https://www.khanacademy.org/math/algebra', verification: { checkedAt: '2026-10-04', method: 'opened', note: 'n', httpStatus: 200, pageTitle: 'Algebra 1', titleMatches: true, coverageChecked: true, legalSource: true }, ...patch });

await test('classification: verified URL → ACTIONABLE; no URL → METADATA_ONLY; candidate → PENDING; failed check → BROKEN', () => {
  assert.strictEqual(E.classifyResource(verified()), 'ACTIONABLE');
  assert.strictEqual(E.classifyResource(base), 'METADATA_ONLY');
  assert.strictEqual(E.classifyResource({ ...base, candidateUrl: 'https://example.net/x' }), 'PENDING');
  assert.strictEqual(E.classifyResource(verified({ verification: { ...verified().verification, httpStatus: 404 } })), 'BROKEN');
  assert.strictEqual(E.classifyResource(verified({ url: 'javascript:alert(1)' })), 'PENDING');
  assert.strictEqual(E.classifyResource(verified({ url: 'http://insecure.example/x' })), 'PENDING');
});

await test('Khan Academy "Algebra 1: Solve equations & inequalities" has no URL → hidden from learners, kept internally', () => {
  assert.strictEqual(base.url, undefined);
  assert.strictEqual(E.classifyResource(base), 'METADATA_ONLY');
  for (const l of C.lessons) assert(!E.getResourcesForLesson(l.id).some((r) => r.id === base.id), l.id);
  assert(RV.registryRecords().some((r) => r.id === base.id), 'still in the internal registry view');
});

await test('real registry: learners see only ACTIONABLE resources everywhere (lesson, outcome, search, plan, videos)', () => {
  for (const l of C.lessons) {
    for (const r of E.getResourcesForLesson(l.id)) assert.strictEqual(E.classifyResource(r), 'ACTIONABLE', r.id);
    for (const v of V.getLessonVideos(l.id)) assert(v.source === 'own' || (v.checked && v.url), v.key);
    const plan = E.buildLearningPlan(l.id, 30);
    for (const s of plan.steps) if (s.resourceId) assert.strictEqual(E.classifyResource(R.find((r) => r.id === s.resourceId)), 'ACTIONABLE', `${l.id} plan`);
  }
  for (const r of E.getRecommendableResources()) assert.strictEqual(E.classifyResource(r), 'ACTIONABLE');
});

await test('no actionable resource → lessons still have a full path (V2U content), no dead cards', () => {
  for (const l of C.lessons) {
    const plan = E.buildLearningPlan(l.id, 60);
    assert(plan && plan.steps.length > 0 && plan.steps.reduce((n, s) => n + s.minutes, 0) === 60, l.id);
  }
  const vl = read('src/components/video/VideoLearning.tsx');
  assert(vl.includes('data-testid="no-videos"'));
});

await test('a verified resource is shown with its real link; YouTube embeds, other hosts fall back to "เปิดต้นทาง"', () => {
  const yt = verified({ id: 'fx-yt', type: 'video', url: 'https://www.youtube.com/watch?v=vnXIPsijIRc' });
  const web = verified({ id: 'fx-web', type: 'video', url: 'https://www.khanacademy.org/math/algebra' });
  const a = V.curatedToVideo(yt, 'math-alg-linear-eq');
  assert(a.embeddable && a.videoId === 'vnXIPsijIRc' && a.url === yt.url);
  const b = V.curatedToVideo(web, 'math-alg-linear-eq');
  assert(!b.embeddable && b.url === web.url, 'source-only fallback still has a real link');
  assert(read('src/components/video/UniversalVideoPlayer.tsx').includes('เปิดต้นทาง'));
  E.__setResourceRegistryForTests([yt, web, base]);
  const ids = E.getResourcesForLesson('math-alg-linear-eq').map((r) => r.id);
  assert(ids.includes('fx-yt') && ids.includes('fx-web') && !ids.includes(base.id));
  E.__setResourceRegistryForTests();
});

await test('YouTube schema: verified YouTube needs inspected content; summary/timestamps need inspection; validator clean', () => {
  const ytUrl = 'https://www.youtube.com/watch?v=vnXIPsijIRc';
  const v = verified({ id: 'fx-yt2', type: 'video', url: ytUrl });
  const err = (r) => E.validateResources([r], C).join('|');
  assert(err(v).includes('needs youtube metadata'));
  const meta = { videoId: 'vnXIPsijIRc', watchUrl: ytUrl, channel: 'x', embeddable: true, captions: 'official', actualContentInspected: false, checkedAt: '2026-10-04', review: { rank: 'GOOD_ALTERNATIVE', notes: 'n' } };
  assert(err({ ...v, youtube: meta }).includes('content inspected'));
  assert(err({ ...v, youtube: { ...meta, actualContentInspected: true, videoId: 'aaaaaaaaaaa' } }).includes('does not match'));
  assert(err({ ...base, type: 'video', youtube: { ...meta, summary: { teaches: 'x', needsFirst: '', keyIdeas: [], examples: [], formulas: [], commonMistakes: [], afterWatching: [], notCovered: [] } } }).includes('summary requires inspected'));
  assert(err({ ...base, type: 'video', youtube: { ...meta, chapters: [{ seconds: 30, title: 't', source: 'chapters' }] } }).includes('timestamps require'));
  assert(!/youtube|inspected|summary|timestamps/.test(err({ ...v, youtube: { ...meta, actualContentInspected: true } })));
  assert.deepStrictEqual(E.validateResources(), []);
});

await test('YouTube candidates: real watch URLs from search, all PENDING, uninspected, unranked, never learner-facing', () => {
  assert(YOUTUBE_CANDIDATES.length >= 30);
  const lessons = new Set(C.lessons.map((l) => l.id));
  for (const y of YOUTUBE_CANDIDATES) {
    assert(lessons.has(y.lessonId), y.lessonId);
    assert.match(y.videoId, /^[A-Za-z0-9_-]{11}$/);
    assert.strictEqual(y.watchUrl, `https://www.youtube.com/watch?v=${y.videoId}`);
    assert(y.status === 'PENDING' && y.actualContentInspected === false && y.transcriptStatus === 'UNKNOWN' && y.embedStatus === 'UNKNOWN' && y.summaryStatus === 'SUMMARY_PENDING' && y.channelConfirmed === false && y.provenance.query && y.candidateRank >= 1);
  }
  for (const l of C.lessons) assert(YOUTUBE_CANDIDATES.some((y) => y.lessonId === l.id), `${l.id} has a candidate`);
  const src = ['src/components', 'src/pages', 'src/video'].flatMap((d) => fs.readdirSync(path.join(root, d), { recursive: true }).map((f) => path.join(d, f))).filter((f) => /\.tsx?$/.test(f)).map(read).join('\n');
  assert(!src.includes('youtubeCandidates') && !src.includes('discovered'), 'backlog never imported by UI');
  for (const r of RV.registryRecords().filter((x) => x.id.startsWith('yt-'))) assert(r.verificationStatus === 'VERIFICATION_PENDING' && r.summaryStatus === 'SUMMARY_PENDING');
});

await test('user-prioritised candidates: rank first, PENDING, unresolved requests kept without any URL', async () => {
  const M = await jiti.import(path.join(root, 'src/resources/youtubeCandidates.ts'));
  const req = YOUTUBE_CANDIDATES.filter((y) => y.provenance.requestedBy === 'user');
  assert.strictEqual(req.length, 6);
  for (const y of req) assert.strictEqual(y.candidateRank, YOUTUBE_CANDIDATES.filter((x) => x.lessonId === y.lessonId && x.provenance.requestedBy === 'user').indexOf(y) + 1, y.videoId);
  for (const l of new Set(YOUTUBE_CANDIDATES.map((y) => y.lessonId))) {
    const ranks = YOUTUBE_CANDIDATES.filter((y) => y.lessonId === l).map((y) => y.candidateRank);
    assert.deepStrictEqual(ranks, ranks.map((_, i) => i + 1), l);
  }
  assert.strictEqual(new Set(YOUTUBE_CANDIDATES.map((y) => `${y.lessonId}:${y.videoId}`)).size, YOUTUBE_CANDIDATES.length, 'no duplicates');
  assert.strictEqual(M.UNRESOLVED_CANDIDATE_REQUESTS.length, 6);
  for (const u of M.UNRESOLVED_CANDIDATE_REQUESTS) {
    assert(!JSON.stringify(u).includes('http'), 'no URL for an unresolved request');
    assert(u.status === 'PENDING' && u.reason && u.searchQuery);
  }
});

await test('fixture sanity: selection logic still ranks Thai first and fills plans when links are verified', () => {
  E.__setResourceRegistryForTests(asActionable(R));
  const ranked = E.getResourcesForLesson('math-alg-linear-eq');
  assert(ranked.length > 1 && ranked[0].language === 'th');
  E.__setResourceRegistryForTests();
});

await test('subjects come from one registry: same three today, any number tomorrow', () => {
  assert.deepStrictEqual(D.SUBJECT_ORDER, ['math', 'physics', 'programming']);
  assert.strictEqual(D.SUBJECT_LABEL.physics, 'ฟิสิกส์');
  const five = [...C.subjects.map((s) => s.id), 'english', 'reasoning'];
  assert.deepStrictEqual(SR.activeSubjectIds(five), ['math', 'physics', 'programming'], 'proposed subjects stay hidden');
  const enabled = SR.SUBJECT_REGISTRY.map((s) => ({ ...s, status: 'active' }));
  assert.deepStrictEqual(SR.activeSubjectIds(five, enabled), ['math', 'physics', 'programming', 'english', 'reasoning']);
  assert.deepStrictEqual(SR.activeSubjectIds(['math'], enabled), ['math'], 'one subject works');
  assert.strictEqual(SR.subjectIdentity('chemistry').label, 'chemistry', 'unknown subject gets a neutral identity');
  for (const s of SR.SUBJECT_REGISTRY.filter((x) => x.status === 'proposed')) assert(!C.subjects.some((c) => c.id === s.id), `${s.id}: no curriculum added`);
});

await test('no fixed three-subject layout or list in subject screens', () => {
  assert(!read('src/diagnostic/engine.ts').includes("['math', 'physics', 'programming']"));
  for (const f of ['src/components/pathway/PathwayBits.tsx', 'src/pages/DiagnosticPage.tsx']) {
    const s = read(f);
    assert(s.includes('auto-fit'), f);
    assert(!/subjects\.map[\s\S]{0,40}/.test(s.split('lg:grid-cols-3')[1] ?? ''), `${f}: subject grid fixed to 3 columns`);
  }
  assert(read('src/components/v2u/tokens.ts').includes('subjectIdentity('));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
