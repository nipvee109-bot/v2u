import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- RUNNING PHASE 20 ACCESSIBILITY AND RESPONSIVE HARDENING QA TESTS ---');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// 1. CSS & Global Responsive / Focus Hardening
// ----------------------------------------------------
console.log('\n--- 1. Testing CSS Global Rules & Accessibility ---');
const cssPath = path.join(rootDir, 'src', 'index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes(':focus-visible'), 'CSS includes :focus-visible rules for keyboard navigation');
assert(cssContent.includes('outline: 2px solid'), 'CSS defines visible outline ring for focused interactive elements');
assert(cssContent.includes('overflow-x: hidden'), 'CSS sets overflow-x: hidden on body/root to prevent layout spills');
assert(cssContent.includes('min-width: 320px'), 'CSS establishes 320px minimum screen support');
assert(cssContent.includes('prefers-reduced-motion'), 'CSS supports @media (prefers-reduced-motion: reduce)');
assert(cssContent.includes('.sr-only'), 'CSS includes .sr-only utility class for screen readers');
assert(cssContent.includes('.responsive-scroll-x'), 'CSS provides smooth touch scroll for responsive data tables');

// ----------------------------------------------------
// 2. Modal Accessibility & Keyboard Trap/Escape Support
// ----------------------------------------------------
console.log('\n--- 2. Testing Modal Dialogs ARIA & Escape Key Handlers ---');

const modalFiles = [
  'src/components/onboarding/StudyOnboardingModal.tsx',
  'src/components/integrity/ImportPreviewModal.tsx',
  'src/components/CreateGoalModal.tsx',
  'src/components/CreateResourceModal.tsx',
  'src/components/ReviewSessionModal.tsx',
  'src/components/MasteryScaleGuideModal.tsx',
  'src/components/KnowledgeGapDetailModal.tsx',
  'src/components/analytics/AnalyticsDetailModal.tsx',
];

for (const modalRelPath of modalFiles) {
  const filePath = path.join(rootDir, modalRelPath);
  const content = fs.readFileSync(filePath, 'utf8');
  const baseName = path.basename(filePath);

  const hasRoleDialog = content.includes('role="dialog"');
  const hasAriaModal = content.includes('aria-modal="true"');
  const hasAriaLabelledby = content.includes('aria-labelledby=');
  const hasEscapeHandler = content.includes("'Escape'") || content.includes('"Escape"');

  assert(hasRoleDialog, `${baseName} has role="dialog"`);
  assert(hasAriaModal, `${baseName} has aria-modal="true"`);
  assert(hasAriaLabelledby, `${baseName} has aria-labelledby`);
  assert(hasEscapeHandler, `${baseName} handles Escape key press to dismiss`);
}

// ----------------------------------------------------
// 3. Skip Link & Main Content Landmark
// ----------------------------------------------------
console.log('\n--- 3. Testing Skip Link & Landmark Structure ---');
const layoutPath = path.join(rootDir, 'src', 'components', 'Layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
const sidebarPath = path.join(rootDir, 'src', 'components', 'Sidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

assert(layoutContent.includes('href="#main-content"'), 'Layout has Skip to main content link for keyboard users');
assert(layoutContent.includes('id="main-content"'), 'Layout provides #main-content target landmark');
assert(sidebarContent.includes('<nav') || sidebarContent.includes('role="navigation"'), 'Sidebar contains <nav> navigation landmark');
assert(sidebarContent.includes('aria-label="แถบนำทางหลัก') || sidebarContent.includes('aria-label="รายการเมนู"'), 'Navigation landmark has descriptive Thai aria-label');

// ----------------------------------------------------
// 4. Input & Form Accessibility (htmlFor / id pairing)
// ----------------------------------------------------
console.log('\n--- 4. Testing Form Inputs and Label Associations ---');
const goalModalContent = fs.readFileSync(path.join(rootDir, 'src/components/CreateGoalModal.tsx'), 'utf8');
assert(goalModalContent.includes('htmlFor="goal-title-input"') && goalModalContent.includes('id="goal-title-input"'), 'CreateGoalModal links title label and input');
assert(goalModalContent.includes('htmlFor="goal-target-value"') && goalModalContent.includes('id="goal-target-value"'), 'CreateGoalModal links target value label and input');
assert(goalModalContent.includes('htmlFor="goal-start-date"') && goalModalContent.includes('id="goal-start-date"'), 'CreateGoalModal links start date label and input');

const resourceModalContent = fs.readFileSync(path.join(rootDir, 'src/components/CreateResourceModal.tsx'), 'utf8');
assert(resourceModalContent.includes('htmlFor="resource-title-input"') && resourceModalContent.includes('id="resource-title-input"'), 'CreateResourceModal links title label and input');
assert(resourceModalContent.includes('htmlFor="resource-url-input"') && resourceModalContent.includes('id="resource-url-input"'), 'CreateResourceModal links URL label and input');
assert(resourceModalContent.includes('htmlFor="resource-type-select"') && resourceModalContent.includes('id="resource-type-select"'), 'CreateResourceModal links type label and select');

const notUnderstoodContent = fs.readFileSync(path.join(rootDir, 'src/pages/NotUnderstoodPage.tsx'), 'utf8');
assert(notUnderstoodContent.includes('htmlFor="unclear-topic-input"') && notUnderstoodContent.includes('id="unclear-topic-input"'), 'NotUnderstoodPage links topic input and label');
assert(notUnderstoodContent.includes('htmlFor="unclear-subject-select"') && notUnderstoodContent.includes('id="unclear-subject-select"'), 'NotUnderstoodPage links subject select and label');
assert(notUnderstoodContent.includes('htmlFor="unclear-details-input"') && notUnderstoodContent.includes('id="unclear-details-input"'), 'NotUnderstoodPage links details textarea and label');

// ----------------------------------------------------
// 5. Button and Icon-Only Accessible Names
// ----------------------------------------------------
console.log('\n--- 5. Testing Icon-Only Buttons and Accessible Names ---');
const goalCardContent = fs.readFileSync(path.join(rootDir, 'src/components/GoalCard.tsx'), 'utf8');
assert(goalCardContent.includes('aria-label={`ลดความคืบหน้า'), 'GoalCard minus button has accessible aria-label');
assert(goalCardContent.includes('aria-label={`เพิ่มความคืบหน้า'), 'GoalCard plus button has accessible aria-label');
assert(goalCardContent.includes('aria-label={`แก้ไขเป้าหมาย'), 'GoalCard edit button has accessible aria-label');
assert(goalCardContent.includes('aria-label={`ลบเป้าหมาย'), 'GoalCard delete button has accessible aria-label');

const resourceCardContent = fs.readFileSync(path.join(rootDir, 'src/components/ResourceCard.tsx'), 'utf8');
assert(resourceCardContent.includes('aria-label={`แก้ไขแหล่งเรียนรู้'), 'ResourceCard edit button has accessible aria-label');
assert(resourceCardContent.includes('aria-label={`ลบแหล่งเรียนรู้'), 'ResourceCard delete button has accessible aria-label');
assert(resourceCardContent.includes('aria-label={resource.favorite ?'), 'ResourceCard favorite toggle button has dynamic accessible aria-label');

const calendarContent = fs.readFileSync(path.join(rootDir, 'src/pages/CalendarPage.tsx'), 'utf8');
assert(calendarContent.includes('aria-label="เดือนก่อนหน้า"'), 'CalendarPage previous month button has aria-label');
assert(calendarContent.includes('aria-label="เดือนถัดไป"'), 'CalendarPage next month button has aria-label');

const weeklyReviewContent = fs.readFileSync(path.join(rootDir, 'src/pages/WeeklyReviewPage.tsx'), 'utf8');
assert(weeklyReviewContent.includes('aria-label="สัปดาห์ก่อนหน้า"'), 'WeeklyReviewPage previous week button has aria-label');
assert(weeklyReviewContent.includes('aria-label="สัปดาห์ถัดไป"'), 'WeeklyReviewPage next week button has aria-label');

// ----------------------------------------------------
// 6. Responsive Overflow & Fixed Width Guard
// ----------------------------------------------------
console.log('\n--- 6. Testing Responsive Safe Patterns ---');
// Check that wide calendar/table views are wrapped in overflow scroll containers
assert(calendarContent.includes('overflow-x-auto') && calendarContent.includes('responsive-scroll-x'), 'CalendarPage wraps grid in responsive-scroll-x container for mobile 360px viewport');
assert(notUnderstoodContent.includes('overflow-x-auto') && notUnderstoodContent.includes('responsive-scroll-x'), 'NotUnderstoodPage wraps table in responsive-scroll-x container');

const plannerContent = fs.readFileSync(path.join(rootDir, 'src/pages/PlannerPage.tsx'), 'utf8');
assert(plannerContent.includes('overflow-x-auto') && plannerContent.includes('responsive-scroll-x'), 'PlannerPage wraps Month View in responsive-scroll-x container');

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log(`\n======================================================`);
console.log(`PHASE 20 QA: ${passedTests} passed, ${failedTests} failed`);
console.log(`======================================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
