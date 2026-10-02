/**
 * Test Suite: Phase 41 — V2U UX Core / Navigation System
 *
 * 1. 5 primary routes (/, /learn, /review, /route, /me)
 * 2. Mobile BottomNav (5 items, used by Layout, no sidebar drawer)
 * 3. Legacy deep links + compatibility redirects
 * 4. Home "ก้าวต่อไปของคุณ" with a single primary CTA
 * 5. getNextStep() behaviour (real execution via jiti)
 * 6. V2U branding
 * 7. Storage key unchanged
 * 8. Phase 40 learning loop wiring still intact
 * 9. No broken internal links
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

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

console.log('=== Phase 41: V2U UX Core / Navigation System ===\n');

const app = read('src/App.tsx');
const routePaths = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);

// ── 1. Primary routes ────────────────────────────────────────────
console.log('1. Primary routes');
const PRIMARY = ['/', '/learn', '/review', '/route', '/me'];
await test('App defines all 5 primary routes', () => {
  for (const p of PRIMARY) assert(routePaths.includes(p), `missing route ${p}`);
});
await test('"/" renders HomePage (not the legacy Dashboard)', () => {
  assert(app.includes('<Route path="/" element={<HomePage />} />'));
});
await test('primaryNav config has exactly the 5 destinations in order', () => {
  const nav = read('src/components/navigation/primaryNav.ts');
  const tos = [...nav.matchAll(/\{\s*to: '([^']+)',\s*label: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  assert.deepStrictEqual(tos, [
    ['/', 'หน้าหลัก'],
    ['/learn', 'เรียน'],
    ['/review', 'ทบทวน'],
    ['/route', 'เส้นทาง'],
    ['/me', 'ฉัน'],
  ]);
});

// ── 2. Mobile BottomNav ──────────────────────────────────────────
console.log('\n2. Mobile BottomNav');
const bottomNav = read('src/components/BottomNav.tsx');
const layout = read('src/components/Layout.tsx');
await test('BottomNav renders PRIMARY_NAV, mobile only, 5 columns', () => {
  assert(bottomNav.includes('PRIMARY_NAV.map'));
  assert(bottomNav.includes('md:hidden'));
  assert(bottomNav.includes('grid-cols-5'));
  assert(bottomNav.includes('aria-current'));
});
await test('Layout mounts BottomNav and desktop TopNav', () => {
  assert(layout.includes('<BottomNav />'));
  assert(layout.includes('<TopNav />'));
});
await test('Layout no longer uses Sidebar drawer as primary navigation', () => {
  assert(!layout.includes('<Sidebar'), 'Sidebar must not be rendered by Layout');
  assert(!layout.includes('mobile-sidebar'), 'mobile drawer must be removed');
});
await test('Main content reserves space for BottomNav on mobile', () => {
  assert(layout.includes('pb-24') && layout.includes('md:pb-6'));
});
await test('Layout keeps skip link and main landmark', () => {
  assert(layout.includes('href="#main-content"'));
  assert(layout.includes('id="main-content"'));
});

// ── 3. Legacy deep links ─────────────────────────────────────────
console.log('\n3. Legacy compatibility');
const LEGACY = [
  '/search', '/planner', '/calendar', '/weekly-review', '/analytics', '/roadmap', '/goals',
  '/resources', '/subjects/:id', '/lessons/:id', '/study/:id', '/study-room/:id', '/review/:id',
  '/review-room/:id', '/not-understood', '/progress', '/settings', '/dashboard',
];
await test('All legacy deep links still routed', () => {
  for (const p of LEGACY) assert(routePaths.includes(p), `legacy route ${p} missing`);
});
await test('Compatibility redirects and catch-all exist', () => {
  for (const [from, to] of [['/home', '/'], ['/subjects', '/learn'], ['/review-room', '/review'], ['/profile', '/me'], ['*', '/']]) {
    assert(app.includes(`<Route path="${from}" element={<Navigate to="${to}" replace />} />`), `redirect ${from} → ${to}`);
  }
});
await test('Legacy pages grouped into hubs', () => {
  const learn = read('src/pages/hubs/LearnHub.tsx');
  const review = read('src/pages/hubs/ReviewHub.tsx');
  const route = read('src/pages/hubs/RouteHub.tsx');
  const me = read('src/pages/hubs/MeHub.tsx');
  for (const s of ['/subjects/', '/resources', '/search', '/dashboard', '/study/']) assert(learn.includes(s), `learn → ${s}`);
  for (const s of ['/review/', '/not-understood']) assert(review.includes(s), `review → ${s}`);
  for (const s of ['/roadmap', '/goals', '/planner']) assert(route.includes(s), `route → ${s}`);
  for (const s of ['/progress', '/analytics', '/weekly-review', '/settings']) assert(me.includes(s), `me → ${s}`);
});

// ── 4. Home ──────────────────────────────────────────────────────
console.log('\n4. Home — ก้าวต่อไปของคุณ');
const home = read('src/pages/HomePage.tsx');
await test('Home answers the 5 questions', () => {
  for (const s of ['ก้าวต่อไปของคุณ', 'ตอนนี้อยู่ตรงไหน', 'เป้าหมายคืออะไร', 'ยังขาดอะไร', 'วันนี้ควรทำอะไร', 'ทำไม']) {
    assert(home.includes(s), `missing "${s}"`);
  }
});
await test('Home has exactly one primary CTA button driven by getNextStep()', () => {
  assert(home.includes('getNextStep('));
  assert.strictEqual((home.match(/<button/g) || []).length, 1, 'Home must render a single button');
  assert(home.includes('{step.ctaLabel}'));
});
await test('Home keeps resource confirmation and onboarding', () => {
  // Phase 47: start behaviour moved to the shared useStartNextStep hook (also used by เส้นทาง)
  assert(home.includes('useStartNextStep()') && home.includes('{confirmModal}'));
  const startHook = read('src/hooks/useStartNextStep.tsx');
  assert(startHook.includes('ResourceConfirmationModal'));
  assert(startHook.includes('startLearningSession({ lessonId, source: resource })'));
  assert(home.includes('StudyOnboardingModal'));
});

// ── 5. getNextStep() ─────────────────────────────────────────────
console.log('\n5. getNextStep()');
const jiti = createJiti(import.meta.url);
const { getNextStep, NEXT_STEP_CTA_LABEL } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));

const mkLesson = (id, status, month = 1, subjectId = 'math') => ({
  id, title: `Lesson ${id}`, subjectId, status, month, durationHours: 1, description: '',
});
const lessons = [mkLesson('a', 'COMPLETED'), mkLesson('b', 'NOT STARTED'), mkLesson('c', 'NOT STARTED', 2)];

await test('nextStep module is pure (no React / store imports)', () => {
  const src = read('src/utils/nextStep.ts');
  assert(!/from 'react'|useStore/.test(src));
});
await test('CTA label is always "เริ่มขั้นต่อไป"', () => {
  assert.strictEqual(NEXT_STEP_CTA_LABEL, 'เริ่มขั้นต่อไป');
  assert.strictEqual(getNextStep({ lessons }).ctaLabel, 'เริ่มขั้นต่อไป');
});
await test('Active session → continue in study room', () => {
  const s = getNextStep({ lessons, activeLearningSession: { lessonId: 'b', status: 'active' } });
  assert.strictEqual(s.kind, 'continue');
  assert.strictEqual(s.href, '/study/b');
  assert.strictEqual(s.requiresResourceConfirmation, false);
});
await test('Overdue review beats new lesson', () => {
  const overdue = [
    { id: 'r2', lessonId: 'a', topic: 'T2', nextReviewAt: '2026-01-05T00:00:00Z' },
    { id: 'r1', lessonId: 'a', topic: 'T1', nextReviewAt: '2026-01-01T00:00:00Z' },
  ];
  const s = getNextStep({ lessons, overdueReviews: overdue });
  assert.strictEqual(s.kind, 'review');
  assert.strictEqual(s.href, '/review/r1', 'oldest overdue first');
  assert(s.missing.some((m) => m.includes('เลยเวลาทบทวน')));
});
await test('Otherwise → study next roadmap lesson with resource confirmation', () => {
  const s = getNextStep({ lessons });
  assert.strictEqual(s.kind, 'study');
  assert.strictEqual(s.lessonId, 'b');
  assert.strictEqual(s.href, '/lessons/b');
  assert.strictEqual(s.requiresResourceConfirmation, true);
  assert(s.reason.length > 0);
  assert(s.current.label.includes('เดือนที่ 1'));
});
await test('Goal uses first unfinished goal, else university default', () => {
  assert.strictEqual(getNextStep({ lessons, goals: [{ title: 'G done', progressPercent: 100 }, { title: 'G open', progressPercent: 40 }] }).goal.label, 'G open');
  assert(getNextStep({ lessons }).goal.label.includes('มหาวิทยาลัย'));
});
await test('All completed → due-today review, then general review', () => {
  const done = lessons.map((l) => ({ ...l, status: 'COMPLETED' }));
  const s1 = getNextStep({ lessons: done, dueTodayReviews: [{ id: 'd1', lessonId: 'a', topic: 'D', nextReviewAt: '' }] });
  assert.strictEqual(s1.href, '/review/d1');
  const s2 = getNextStep({ lessons: done });
  assert.strictEqual(s2.kind, 'empty');
  assert.strictEqual(s2.href, '/review');
});
await test('No lessons → points to /learn', () => {
  assert.strictEqual(getNextStep({ lessons: [] }).href, '/learn');
});
await test('User-facing text avoids technical jargon', () => {
  const s = getNextStep({ lessons, overdueReviews: [{ id: 'r', lessonId: 'a', topic: 'T', nextReviewAt: '2026-01-01' }] });
  const text = JSON.stringify(s).toLowerCase();
  for (const j of ['mastery', 'spaced repetition', 'knowledge gap']) assert(!text.includes(j), `jargon "${j}"`);
});

// ── 6. Branding ──────────────────────────────────────────────────
console.log('\n6. V2U branding');
await test('index.html, manifest and header use V2U', () => {
  assert(read('index.html').includes('<title>V2U — Vocational to University'));
  const vite = read('vite.config.ts');
  assert(vite.includes("short_name: 'V2U'"));
  assert(vite.includes("name: 'V2U — Vocational to University'"));
  assert(layout.includes('V2U') && layout.includes('เส้นทางสายอาชีพสู่มหาวิทยาลัย'));
  assert(read('src/pages/RouteHub.tsx'.replace('pages/', 'pages/hubs/')).includes('จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ'));
});
await test('No user-facing "NextStep" brand text remains in UI files', () => {
  const files = ['src/components/Layout.tsx', 'src/components/Sidebar.tsx', 'src/pages/Dashboard.tsx',
    'src/components/dashboard/DailyLearningChoice.tsx', 'src/components/study/PostLearningFlowModal.tsx', 'index.html'];
  for (const f of files) {
    const visible = read(f).split('\n').filter((l) => !l.trim().startsWith('//') && !l.includes('{/*'));
    assert(!visible.some((l) => /NextStep/.test(l)), `${f} still shows NextStep`);
  }
});

// ── 7. Storage key ───────────────────────────────────────────────
console.log('\n7. Persistence');
await test('Storage key unchanged: engineering-study-hub-storage', () => {
  assert(read('src/store/useStore.ts').includes("name: 'engineering-study-hub-storage'") ||
    read('src/store/useStore.ts').includes("'engineering-study-hub-storage'"));
});

// ── 8. Phase 40 learning loop ────────────────────────────────────
console.log('\n8. Phase 40 learning loop');
await test('Study Room, resource confirmation, summary, review questions, mastery still wired', () => {
  const study = read('src/pages/StudyRoom.tsx');
  assert(study.includes('ResourceConfirmationModal') && study.includes('handleConfirmResourceAndStart'));
  const post = read('src/components/study/PostLearningFlowModal.tsx');
  for (const s of ['VoiceSummaryInput', 'getGroundedQuestionsForLesson', 'calculateDeterministicMasteryScore', 'nextAction']) {
    assert(post.includes(s), `PostLearningFlowModal missing ${s}`);
  }
  const dash = read('src/pages/Dashboard.tsx');
  assert(dash.includes('pendingStudyLesson') && dash.includes('ResourceConfirmationModal'));
  assert(app.includes("import('./pages/Dashboard')"), 'legacy Dashboard still reachable');
});
await test('Offline indicator still in Layout', () => {
  assert(layout.includes('<OfflineIndicator />'));
});

// ── 9. Broken links ──────────────────────────────────────────────
console.log('\n9. Internal links');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}
const matchers = routePaths.filter((p) => p !== '*').map((p) => new RegExp(`^${p.replace(/:[^/]+/g, '[^/]+')}$`));
await test('Every static internal link resolves to a defined route', () => {
  const bad = [];
  for (const file of walk(path.join(root, 'src'))) {
    const src = fs.readFileSync(file, 'utf-8');
    const re = /(?:to=["']|to: ?'|navigate\(['`])(\/[^"'`?#$]*)/g;
    for (const m of src.matchAll(re)) {
      const raw = m[1];
      // template links like `/lessons/${id}` are captured up to `${`; stand in a param segment
      const candidate = raw === '/' ? '/' : raw.endsWith('/') ? `${raw}x` : raw;
      if (!matchers.some((r) => r.test(candidate))) bad.push(`${path.relative(root, file)} → ${m[1]}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
