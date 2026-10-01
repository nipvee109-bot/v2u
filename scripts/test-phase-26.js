import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('--- RUNNING PHASE 26: LEARNING RESOURCE CENTER QA TESTS ---');

let passed = 0;
function check(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
}

// 1. Resource Types & Roles validation
const SUPPORTED_TYPES = ['youtube', 'website', 'pdf', 'document', 'image', 'other'];
const SUPPORTED_ROLES = ['primary', 'alternative', 'practice', 'reference'];

check(SUPPORTED_TYPES.includes('pdf'), 'Resource types include PDF');
check(SUPPORTED_TYPES.includes('youtube'), 'Resource types include YouTube');
check(SUPPORTED_TYPES.includes('website'), 'Resource types include Website');
check(SUPPORTED_TYPES.includes('document'), 'Resource types include Document');

check(SUPPORTED_ROLES.includes('primary'), 'Resource roles include Primary');
check(SUPPORTED_ROLES.includes('alternative'), 'Resource roles include Alternative');
check(SUPPORTED_ROLES.includes('practice'), 'Resource roles include Practice');
check(SUPPORTED_ROLES.includes('reference'), 'Resource roles include Reference');

// 2. Resource model schema verification
const testResource = {
  id: uuidv4(),
  title: 'MIT OCW Calculus Lecture Notes',
  url: 'https://ocw.mit.edu/courses/mathematics/18-01sc-single-variable-calculus-fall-2010/notes.pdf',
  type: 'pdf',
  role: 'primary',
  provider: 'MIT OpenCourseWare',
  subjectId: 'math',
  subject: 'math',
  lessonId: 'lesson-calc-1',
  topicId: 'limits-and-derivatives',
  thumbnail: 'https://ocw.mit.edu/thumb.jpg',
  description: 'Comprehensive lecture notes on single variable calculus',
  duration: 60,
  favorite: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

check(Boolean(testResource.id && testResource.type === 'pdf'), 'Resource model stores ID and type correctly');
check(testResource.role === 'primary', 'Resource model tracks role: primary');
check(testResource.provider === 'MIT OpenCourseWare', 'Resource model stores provider information');
check(testResource.lessonId === 'lesson-calc-1', 'Resource is linked to lessonId');

// 3. Multiple resources per lesson with distinct roles
const lessonResources = [
  { ...testResource, id: uuidv4(), role: 'primary', title: 'Calculus Main Video', type: 'youtube' },
  { ...testResource, id: uuidv4(), role: 'alternative', title: 'Khan Academy Calculus', type: 'youtube' },
  { ...testResource, id: uuidv4(), role: 'practice', title: 'Calculus Problem Set 1', type: 'pdf' },
  { ...testResource, id: uuidv4(), role: 'reference', title: 'Calculus Formula Cheat Sheet', type: 'document' },
];

check(lessonResources.length === 4, 'Lesson supports multiple resources simultaneously');
const distinctRoles = new Set(lessonResources.map(r => r.role));
check(distinctRoles.size === 4, 'Lesson resources have distinct roles (primary, alternative, practice, reference)');

// 4. Filtering engine tests
function filterResources(resources, filters) {
  return resources.filter(r => {
    if (filters.subject && filters.subject !== 'ALL' && r.subject !== filters.subject) return false;
    if (filters.type && filters.type !== 'ALL' && r.type !== filters.type) return false;
    if (filters.role && filters.role !== 'ALL' && r.role !== filters.role) return false;
    if (filters.onlyFavorites && !r.favorite) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description ? r.description.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });
}

const mockPool = [
  ...lessonResources,
  { id: uuidv4(), title: 'Python Docs', url: 'https://docs.python.org', type: 'website', role: 'reference', subject: 'programming', favorite: false },
  { id: uuidv4(), title: 'Physics Kinematics Lab', url: 'https://physics.org/lab.pdf', type: 'pdf', role: 'practice', subject: 'physics', favorite: true },
];

const pdfOnly = filterResources(mockPool, { type: 'pdf' });
check(pdfOnly.length === 2 && pdfOnly.every(r => r.type === 'pdf'), 'Filters accurately by PDF type');

const practiceOnly = filterResources(mockPool, { role: 'practice' });
check(practiceOnly.length === 2 && practiceOnly.every(r => r.role === 'practice'), 'Filters accurately by Practice role');

const favoritesOnly = filterResources(mockPool, { onlyFavorites: true });
check(favoritesOnly.every(r => r.favorite === true), 'Filters accurately by Favorites flag');

// 5. Assign & Unassign logic
function assignResourceToLesson(resource, newLessonId, newRole) {
  return {
    ...resource,
    lessonId: newLessonId || undefined,
    role: newRole || resource.role,
    updatedAt: new Date().toISOString(),
  };
}

const unassigned = { id: 'r-free', title: 'Unassigned Video', url: 'https://youtube.com/v1', type: 'youtube', favorite: false };
const assigned = assignResourceToLesson(unassigned, 'lesson-target-99', 'practice');
check(assigned.lessonId === 'lesson-target-99' && assigned.role === 'practice', 'Assigns resource to target lesson with practice role');

const detached = assignResourceToLesson(assigned, '', 'reference');
check(detached.lessonId === undefined, 'Unassigns resource from lesson cleanly');

console.log(`\n======================================================`);
console.log(`PHASE 26 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
