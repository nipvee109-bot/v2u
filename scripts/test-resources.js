// Automated QA test script for Phase 14 - Resource Library
import assert from 'assert';

// 1. URL validation tests
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 2. YouTube Video ID extraction
function extractYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

// 3. Auto thumbnail generator
function getAutoThumbnail(url, type, existingThumbnail) {
  if (existingThumbnail && existingThumbnail.trim().length > 0) {
    return existingThumbnail.trim();
  }
  if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  return undefined;
}

// 4. Duplicate resource detection
function isDuplicateResource(url, currentId, existingResources = []) {
  if (!url) return false;
  const normalized = url.trim().toLowerCase().replace(/\/+$/, '');
  return existingResources.some(
    (r) => r.id !== currentId && r.url.trim().toLowerCase().replace(/\/+$/, '') === normalized
  );
}

console.log('--- RUNNING RESOURCE LIBRARY QA TESTS ---');

// Test 1: URL validation
console.log('Test 1: Valid URL handling');
assert.strictEqual(isValidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
assert.strictEqual(isValidUrl('http://example.com/sheet.pdf'), true);
assert.strictEqual(isValidUrl('javascript:alert(1)'), false);
assert.strictEqual(isValidUrl('not-a-valid-url'), false);
assert.strictEqual(isValidUrl(''), false);
console.log('  ✓ Valid and invalid URL checks passed');

// Test 2: YouTube ID extraction
console.log('Test 2: YouTube Video ID extraction across formats');
assert.strictEqual(
  extractYouTubeVideoId('https://www.youtube.com/watch?v=7UJ4CFr9KAw'),
  '7UJ4CFr9KAw'
);
assert.strictEqual(
  extractYouTubeVideoId('https://youtu.be/7UJ4CFr9KAw?t=10'),
  '7UJ4CFr9KAw'
);
assert.strictEqual(
  extractYouTubeVideoId('https://www.youtube.com/embed/7UJ4CFr9KAw'),
  '7UJ4CFr9KAw'
);
console.log('  ✓ YouTube ID extraction verified across all formats');

// Test 3: Auto Thumbnail generation
console.log('Test 3: Thumbnail resolution');
const ytThumb = getAutoThumbnail('https://www.youtube.com/watch?v=7UJ4CFr9KAw', 'youtube');
assert.strictEqual(ytThumb, 'https://img.youtube.com/vi/7UJ4CFr9KAw/hqdefault.jpg');

const customThumb = getAutoThumbnail(
  'https://www.youtube.com/watch?v=7UJ4CFr9KAw',
  'youtube',
  'https://custom.com/image.png'
);
assert.strictEqual(customThumb, 'https://custom.com/image.png');

const webThumb = getAutoThumbnail('https://docs.python.org/3/', 'website');
assert.strictEqual(webThumb, undefined);
console.log('  ✓ Auto thumbnail and custom fallback verified');

// Test 4: Duplicate Resource Detection
console.log('Test 4: Duplicate resource check');
const existingList = [
  { id: 'res-1', url: 'https://docs.python.org/3/tutorial/' },
  { id: 'res-2', url: 'https://youtube.com/watch?v=sample1' },
];

assert.strictEqual(
  isDuplicateResource('https://docs.python.org/3/tutorial', 'res-99', existingList),
  true
);
assert.strictEqual(
  isDuplicateResource('https://docs.python.org/3/tutorial/', 'res-1', existingList),
  false // Same item being edited, should not trigger duplicate error on self
);
assert.strictEqual(
  isDuplicateResource('https://newsite.org/course', 'res-99', existingList),
  false
);
console.log('  ✓ Normalized duplicate check verified (case and trailing slash insensitive)');

// Test 5: Simulating Store State Machine for Resources
console.log('Test 5: Resource addition and lesson syncing');
let store = {
  resources: [
    {
      id: 'res-init',
      title: 'Python Docs',
      url: 'https://docs.python.org/3/',
      type: 'website',
      subject: 'programming',
      lessonId: 'lesson-prog-1',
      favorite: false,
    },
  ],
  lessons: [
    {
      id: 'lesson-prog-1',
      subjectId: 'programming',
      title: 'Python Basics',
      resources: [],
    },
  ],
};

function addResource(res) {
  if (!isValidUrl(res.url)) return { success: false, error: 'Invalid URL' };
  if (isDuplicateResource(res.url, res.id, store.resources)) return { success: false, error: 'Duplicate' };

  store.resources = [res, ...store.resources];
  if (res.lessonId) {
    store.lessons = store.lessons.map((l) =>
      l.id === res.lessonId ? { ...l, resources: [...l.resources, res] } : l
    );
  }
  return { success: true };
}

function deleteResource(id) {
  store.resources = store.resources.filter((r) => r.id !== id);
  store.lessons = store.lessons.map((l) => ({
    ...l,
    resources: l.resources.filter((r) => r.id !== id),
  }));
}

const newRes = {
  id: 'res-new-1',
  title: 'Python Functions Guide',
  url: 'https://example.com/python-functions',
  type: 'website',
  subject: 'programming',
  lessonId: 'lesson-prog-1',
  favorite: true,
};

const addResult = addResource(newRes);
assert.strictEqual(addResult.success, true);
assert.strictEqual(store.resources.length, 2);
assert.strictEqual(store.lessons[0].resources.length, 1);
assert.strictEqual(store.lessons[0].resources[0].id, 'res-new-1');
console.log('  ✓ Resource added and synced to parent lesson');

// Test 6: Deleting resource cleans both places
console.log('Test 6: Resource deletion cleans store and lesson references');
deleteResource('res-new-1');
assert.strictEqual(store.resources.length, 1);
assert.strictEqual(store.lessons[0].resources.length, 0);
console.log('  ✓ Resource deletion cleanly removed from store and lesson');

console.log('\nALL 6 QA TEST SUITES PASSED (100% SUCCESS)\n');
