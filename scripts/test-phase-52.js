/**
 * Test Suite: Phase 52 — Resource verification + UX/UI recovery
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

const { RESOURCE_REGISTRY: R } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const CE = await jiti.import(path.join(root, 'src/content/engine.ts'));

console.log('=== Phase 52: Resource Verification + UX/UI Recovery ===\n');

console.log('1. Verification');
const base = R.find((r) => r.status === 'unverified' && !r.candidateUrl);
const check = (patch) => E.validateResources([{ ...base, ...patch }], C).filter((e) => !e.includes('lesson') && !e.includes('outcome'));
const full = { checkedAt: '2026-10-02', method: 'HTTP GET', note: 'opened', httpStatus: 200, pageTitle: 'x', titleMatches: true, coverageChecked: true, legalSource: true };
await test('verified/active need ALL of: 2xx, page title, title match, coverage, legality', () => {
  assert.deepStrictEqual(check({ status: 'verified', url: 'https://example.org/a', verification: full }), []);
  for (const k of ['httpStatus', 'pageTitle', 'titleMatches', 'coverageChecked', 'legalSource']) {
    const v = { ...full };
    delete v[k];
    assert(check({ status: 'active', url: 'https://example.org/a', verification: v }).length > 0, k);
  }
  assert(check({ status: 'verified', url: 'https://example.org/a', verification: { ...full, httpStatus: 404 } }).length > 0);
});
await test('A search hit is not verification: candidate titles must match the resource', () => {
  const c = R.find((r) => r.candidateUrl);
  assert(E.validateResources([{ ...c, urlProvenance: { ...c.urlProvenance, resultTitle: 'โครงการสอนออนไลน์ - Project 14' } }], C).some((e) => e.includes('does not match')));
});
await test('Registry is honest: nothing verified without checks; validate clean', () => {
  assert.deepStrictEqual(E.validateResources(), []);
  for (const r of R) if (r.status === 'verified' || r.status === 'active') assert(r.verification?.titleMatches && r.verification.coverageChecked, r.id);
  assert(!R.some((r) => r.id === 'th-scimath-ebooks'), 'generic library page removed');
});
await test('Unchecked links are labelled "ยังไม่ได้ตรวจลิงก์" everywhere', () => {
  for (const r of R.filter((x) => x.status === 'unverified')) assert.strictEqual(E.linkStateLabel(r), 'ยังไม่ได้ตรวจลิงก์');
  assert(read('src/components/learn/ResourceLink.tsx').includes('ยังไม่ได้ตรวจลิงก์'));
});
await test('Link checker never edits the registry and treats network refusals as unchecked', () => {
  const s = read('scripts/verify-resources.mjs');
  assert(s.includes('x-deny-reason') && s.includes('unreachable'));
  assert(!/writeFileSync\([^)]*registry/.test(s));
});
await test('Every lesson still has a usable path after cleanup', () => {
  for (const l of C.lessons) assert(CE.getLearningPath(l.id)?.primary, l.id);
});

console.log('\n2. UX/UI');
const ui = read('src/components/ui/index.tsx');
await test('Reusable primitives exist', () => {
  for (const x of ['export function Screen', 'ScreenHeader', 'Section', 'Surface', 'ProgressBar', 'ProgressRing', 'Stat', 'Chip', 'ButtonLink', 'EmptyState', 'RowGroup', 'LoopStrip', 'PlanBar']) assert(ui.includes(x), x);
});
await test('Design tokens: brand palette, canvas, Thai typeface', () => {
  const css = read('src/index.css');
  assert(css.includes('--color-brand-600') && css.includes('--color-canvas') && css.includes('IBM Plex Sans Thai'));
  assert(read('index.html').includes('lang="th"'));
});
const SCREENS = {
  Home: 'src/pages/HomePage.tsx',
  Learn: 'src/pages/hubs/LearnHub.tsx',
  Curriculum: 'src/pages/CurriculumPage.tsx',
  Search: 'src/pages/SearchPage.tsx',
  Lesson: 'src/pages/CurriculumLessonPage.tsx',
  'Study Room': 'src/pages/StudyRoom.tsx',
  Review: 'src/pages/hubs/ReviewHub.tsx',
  Route: 'src/pages/hubs/RouteHub.tsx',
  Roadmap: 'src/pages/RoadmapPage.tsx',
  Me: 'src/pages/hubs/MeHub.tsx',
};
await test('All 10 screens use the shared primitives', () => {
  for (const [n, f] of Object.entries(SCREENS)) assert(/components\/ui'|HubLinkList'/.test(read(f)), n);
});
await test('No leftover dark "document" banners on main screens', () => {
  for (const [n, f] of Object.entries(SCREENS)) assert(!/from-slate-900|from-\[#0B1120\]|bg-slate-900 rounded-3xl/.test(read(f)), n);
});
await test('The V2U loop (วันนี้ → เรียน → เช็ก → ปรับขั้นถัดไป) is visible where it happens', () => {
  for (const f of [SCREENS.Home, SCREENS.Learn, SCREENS.Route, SCREENS.Lesson, SCREENS['Study Room']]) assert(read(f).includes('<LoopStrip'), f);
});
await test('Home: one primary CTA, today first, empty "missing" state designed', () => {
  const h = read(SCREENS.Home);
  assert.strictEqual((h.match(/<button/g) || []).length, 1);
  assert(h.indexOf('next-step-today') < h.indexOf('เส้นทางของคุณ'), 'today step comes before the journey summary');
  assert(h.includes('ไม่มีอะไรค้าง'));
});
await test('Review has a designed empty state with a way forward', () => {
  const r = read(SCREENS.Review);
  assert(r.includes('<EmptyState') && r.includes('<ButtonLink'));
});
await test('Exactly 5 primary nav items; touch targets ≥44px in nav and rows', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
  assert(read('src/components/BottomNav.tsx').includes('min-h-[44px]'));
  assert(ui.includes('min-h-[60px]') && ui.includes('min-h-[48px]'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
