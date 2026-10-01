/**
 * Test Suite: Phase 31 — Resource Discovery
 */

import assert from 'node:assert';

// Test YouTube ID extractor mirror
function extractYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

const CURATED_RESOURCES = [
  {
    id: 'cur-py-1',
    title: 'Python Official Tutorial: Defining Functions',
    url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions',
    type: 'website',
    provider: 'Python Docs',
    description: 'เอกสารคู่มือทางการของ Python อธิบายการประกาศฟังก์ชัน def',
    canEmbed: false,
    suggestedRole: 'reference',
    subjectId: 'programming',
    keywords: ['python', 'function', 'def', 'beginner', 'programming', 'arguments'],
  },
  {
    id: 'cur-py-2',
    title: 'CS50 Python: Functions and Variables',
    url: 'https://www.youtube.com/watch?v=JP7ITIXG1gw',
    type: 'youtube',
    provider: 'Harvard CS50',
    description: 'Harvard University CS50P Lecture 0',
    thumbnail: 'https://img.youtube.com/vi/JP7ITIXG1gw/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'programming',
    keywords: ['python', 'cs50', 'harvard', 'function', 'variables'],
  },
  {
    id: 'cur-math-1',
    title: 'Essence of Linear Algebra - 3Blue1Brown',
    url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
    type: 'youtube',
    provider: '3Blue1Brown',
    description: 'Linear Algebra เชิงเรขาคณิต',
    thumbnail: 'https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'math',
    keywords: ['math', 'linear algebra', 'vectors', 'matrices', '3blue1brown'],
  },
  {
    id: 'cur-math-2',
    title: 'MIT 18.01 Calculus Lecture Notes (PDF)',
    url: 'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus/resources/notes.pdf',
    type: 'pdf',
    provider: 'MIT OpenCourseWare',
    description: 'เอกสารสรุปทฤษฎีแคลคูลัส 1',
    canEmbed: true,
    suggestedRole: 'reference',
    subjectId: 'math',
    keywords: ['math', 'calculus', 'derivatives', 'mit', 'pdf'],
  },
  {
    id: 'cur-ai-1',
    title: 'Stanford CS229: Machine Learning Course',
    url: 'https://www.youtube.com/watch?v=jGwO_UgTS7I',
    type: 'youtube',
    provider: 'Stanford University',
    description: 'Machine Learning โดย Andrew Ng',
    thumbnail: 'https://img.youtube.com/vi/jGwO_UgTS7I/hqdefault.jpg',
    canEmbed: true,
    suggestedRole: 'primary',
    subjectId: 'ai',
    keywords: ['ai', 'machine learning', 'stanford', 'andrew ng', 'gradient descent'],
  }
];

class DefaultResourceProvider {
  canEmbed(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return Boolean(
      extractYouTubeVideoId(url) ||
      lower.endsWith('.pdf') ||
      lower.includes('/pdf')
    );
  }

  getThumbnail(url) {
    const yId = extractYouTubeVideoId(url);
    if (yId) {
      return `https://img.youtube.com/vi/${yId}/hqdefault.jpg`;
    }
    return undefined;
  }

  async getMetadata(url) {
    const yId = extractYouTubeVideoId(url);
    const lower = url.toLowerCase();

    let type = 'website';
    let provider = 'Web Resource';

    if (yId) {
      type = 'youtube';
      provider = 'YouTube';
    } else if (lower.endsWith('.pdf') || lower.includes('/pdf')) {
      type = 'pdf';
      provider = 'PDF Document';
    } else if (lower.includes('github.com')) {
      provider = 'GitHub';
    } else if (lower.includes('coursera.org')) {
      provider = 'Coursera';
    } else if (lower.includes('ocw.mit.edu')) {
      provider = 'MIT OpenCourseWare';
    }

    return {
      url,
      type,
      provider,
      canEmbed: this.canEmbed(url),
      thumbnail: this.getThumbnail(url),
    };
  }

  async search(query, subject) {
    const q = (query || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    let list = CURATED_RESOURCES;

    if (subject) {
      list = list.filter((r) => !r.subjectId || r.subjectId === subject);
    }

    if (words.length === 0) {
      return list;
    }

    return list.filter((r) => {
      const fullText = `${r.title} ${r.description} ${r.provider} ${r.keywords.join(' ')}`.toLowerCase();
      if (fullText.includes(q)) return true;
      return words.every((w) => fullText.includes(w));
    });
  }
}

async function runTests() {
  console.log('=== Running Phase 31: Resource Discovery Tests ===\n');
  const provider = new DefaultResourceProvider();

  // Test 1: Empty search returns all resources
  const all = await provider.search('');
  assert.strictEqual(all.length, 5, 'Empty search should return all resources');
  console.log('✔ Test 1: Empty search returns all resources');

  // Test 2: Subject filter
  const pyResources = await provider.search('', 'programming');
  assert.strictEqual(pyResources.length, 2, 'Should filter by programming subject');
  assert(pyResources.every(r => r.subjectId === 'programming'), 'All items should belong to programming');
  console.log('✔ Test 2: Subject filtering works accurately');

  // Test 3: Keyword search
  const calculus = await provider.search('calculus');
  assert.strictEqual(calculus.length, 1, 'Should find 1 calculus resource');
  assert.strictEqual(calculus[0].id, 'cur-math-2', 'Should match calculus item');
  console.log('✔ Test 3: Keyword search finds relevant resource');

  // Test 4: Multi-word search
  const andrew = await provider.search('andrew ng');
  assert.strictEqual(andrew.length, 1, 'Should match Andrew Ng in keywords');
  assert.strictEqual(andrew[0].id, 'cur-ai-1');
  console.log('✔ Test 4: Multi-word query matches tags correctly');

  // Test 5: Embeddability checks
  assert.strictEqual(provider.canEmbed('https://www.youtube.com/watch?v=fNk_zzaMoSs'), true, 'YouTube should be embeddable');
  assert.strictEqual(provider.canEmbed('https://example.com/lecture.pdf'), true, 'PDF URL should be embeddable');
  assert.strictEqual(provider.canEmbed('https://example.com/guide.html'), false, 'Normal website is marked non-embeddable fallback');
  console.log('✔ Test 5: Embeddability accurately identified');

  // Test 6: Thumbnail generation
  const thumb = provider.getThumbnail('https://www.youtube.com/watch?v=JP7ITIXG1gw');
  assert.strictEqual(thumb, 'https://img.youtube.com/vi/JP7ITIXG1gw/hqdefault.jpg', 'Generates correct YouTube thumbnail');
  console.log('✔ Test 6: YouTube thumbnail correctly formed');

  // Test 7: Metadata extraction for custom YouTube link
  const ytMeta = await provider.getMetadata('https://youtu.be/dQw4w9WgXcQ');
  assert.strictEqual(ytMeta.type, 'youtube');
  assert.strictEqual(ytMeta.provider, 'YouTube');
  assert.strictEqual(ytMeta.canEmbed, true);
  console.log('✔ Test 7: Metadata extraction for YouTube URL passes');

  // Test 8: Metadata extraction for custom PDF link
  const pdfMeta = await provider.getMetadata('https://arxiv.org/pdf/1706.03762');
  assert.strictEqual(pdfMeta.type, 'pdf');
  assert.strictEqual(pdfMeta.provider, 'PDF Document');
  assert.strictEqual(pdfMeta.canEmbed, true);
  console.log('✔ Test 8: Metadata extraction for PDF URL passes');

  // Test 9: Metadata extraction for GitHub
  const ghMeta = await provider.getMetadata('https://github.com/karpathy/micrograd');
  assert.strictEqual(ghMeta.type, 'website');
  assert.strictEqual(ghMeta.provider, 'GitHub');
  console.log('✔ Test 9: Metadata extraction for GitHub domain passes');

  // Test 10: Graceful handling of null/empty URL
  const emptyMeta = await provider.getMetadata('');
  assert.strictEqual(emptyMeta.canEmbed, false);
  assert.strictEqual(provider.canEmbed(null), false);
  console.log('✔ Test 10: Empty/null inputs handled safely');

  console.log('\nAll 10/10 Phase 31 tests passed successfully!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
