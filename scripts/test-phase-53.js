/**
 * Test Suite: Phase 53 — Desktop web UX + responsive layout
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');

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

console.log('=== Phase 53: Desktop Web UX + Responsive Layout ===\n');

console.log('1. One navigation per form factor, same 5 destinations');
const sidebar = read('src/components/navigation/DesktopSidebar.tsx');
const layout = read('src/components/Layout.tsx');
await test('Desktop ≥1024: sidebar from PRIMARY_NAV', () => {
  assert(sidebar.includes('PRIMARY_NAV.map') && sidebar.includes('hidden lg:flex') && sidebar.includes('aria-label="เมนูหลัก"'));
  assert(layout.includes('<DesktopSidebar />'));
});
await test('Tablet 768–1023: top nav only; phone <768: bottom nav only', () => {
  assert(read('src/components/navigation/TopNav.tsx').includes('hidden md:block lg:hidden'));
  assert(read('src/components/BottomNav.tsx').includes('md:hidden'));
});
await test('Still exactly 5 primary destinations; no new menu items', () => {
  assert.strictEqual([...read('src/components/navigation/primaryNav.ts').matchAll(/\{\s*to: '/g)].length, 5);
  assert(!/to="\/(?!search|review|$)[a-z]/.test(sidebar.replace(/to=\{item\.to\}/g, '')), 'sidebar adds no extra destinations');
});
await test('Sidebar keeps the one next step in view (same source of truth)', () => {
  assert(sidebar.includes('useNextStep()') && sidebar.includes('step.todayAction'));
});

console.log('\n2. Each screen has its own desktop layout');
const SCREENS = {
  Home: ['src/pages/HomePage.tsx', /md:grid-cols-2 xl:grid-cols-3/], // V2U design: full-width hero, then a card grid
  Learn: ['src/pages/hubs/LearnHub.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/],
  Review: ['src/pages/hubs/ReviewHub.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/],
  Route: ['src/pages/hubs/RouteHub.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_380px\]/],
  Roadmap: ['src/pages/RoadmapPage.tsx', /lg:grid-cols-6/],
  Me: ['src/pages/hubs/MeHub.tsx', /lg:grid-cols-2/],
  Curriculum: ['src/pages/CurriculumPage.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/],
  Search: ['src/pages/SearchPage.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/],
  Lesson: ['src/pages/CurriculumLessonPage.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/],
  'Study Room': ['src/pages/StudyRoom.tsx', /lg:grid-cols-\[minmax\(0,1fr\)_360px\]/],
};
for (const [name, [file, re]] of Object.entries(SCREENS)) {
  await test(`${name}: dedicated desktop grid + sensible max-width`, () => {
    const s = read(file);
    assert(re.test(s), 'desktop grid');
    assert(/max-w-(6xl|5xl|\[1600px\])/.test(s), 'max-width');
  });
}
await test('Home desktop: next step + missing | route + time + progress (aside)', () => {
  const h = read('src/pages/HomePage.tsx');
  // V2U design: the hero (next step) comes first, then the route card
  assert(h.indexOf('next-step-today') < h.indexOf('<aside') && h.indexOf('เส้นทางของคุณ') > h.indexOf('<aside'));
});
await test('Mobile reading order preserved via order-* + contents (Phase 52 UI kept)', () => {
  for (const f of ['src/pages/hubs/LearnHub.tsx', 'src/pages/hubs/RouteHub.tsx', 'src/pages/CurriculumPage.tsx']) {
    const s = read(f);
    assert(s.includes('contents lg:') && s.includes('order-1 lg:order-none'), f);
  }
});
await test('Lesson desktop separates content | plan, progress, CTA', () => {
  const s = read('src/pages/CurriculumLessonPage.tsx');
  assert(s.includes('aria-label="แผน ความคืบหน้า และเริ่มเรียน"') && s.includes('ความคืบหน้าของบทนี้') && s.includes('เริ่มเรียนตามแผน'));
});
await test('Study Room: viewer takes all remaining width; notes panel fixed', () => {
  const s = read('src/pages/StudyRoom.tsx');
  assert(s.includes('max-w-[1600px]') && !s.includes('lg:col-span-7'));
});
await test('Route: months become a horizontal timeline on desktop', () => {
  assert(read('src/pages/hubs/RouteHub.tsx').includes('lg:flex lg:gap-2 lg:space-y-0 lg:overflow-x-auto'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
