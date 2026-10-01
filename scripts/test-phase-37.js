/**
 * Test Suite: Phase 37 — Real-World Resource Import
 */

import assert from 'node:assert';

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

function extractYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const shortsMatch = url.match(/\/shorts\/([\w-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

function extractTitleFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    let lastSegment = segments[segments.length - 1];
    lastSegment = lastSegment.replace(/\.(html|php|asp|pdf)$/i, '');
    const words = lastSegment.replace(/[-_]+/g, ' ').trim();
    if (!words || words.length < 3) return null;

    return words
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return null;
  }
}

function analyzeResourceUrl(rawUrl) {
  const url = (rawUrl || '').trim();
  const lower = url.toLowerCase();

  const result = {
    url,
    type: 'website',
    provider: 'Web Resource',
    suggestedTitle: '',
    canEmbed: false,
    suggestedRole: 'reference',
  };

  if (!url) return result;

  const isYouTube = lower.includes('youtube.com') || lower.includes('youtu.be');
  if (isYouTube) {
    const videoId = extractYouTubeVideoId(url);
    const isPlaylist = lower.includes('list=');
    const isShorts = lower.includes('/shorts/');

    result.type = 'youtube';
    result.provider = 'YouTube';
    result.canEmbed = true;
    result.suggestedRole = 'primary';
    result.isPlaylist = isPlaylist;
    result.isShorts = isShorts;

    if (videoId) {
      result.videoId = videoId;
      result.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      result.suggestedTitle = isShorts ? `YouTube Short (${videoId})` : `YouTube Video (${videoId})`;
    } else if (isPlaylist) {
      result.suggestedTitle = 'YouTube Playlist';
    } else {
      result.suggestedTitle = 'YouTube Video';
    }
    return result;
  }

  const isPdf = lower.endsWith('.pdf') || lower.includes('/pdf/') || lower.includes('type=pdf') || lower.includes('.pdf?');
  if (isPdf) {
    result.type = 'pdf';
    result.canEmbed = true;
    result.suggestedRole = 'reference';

    if (lower.includes('arxiv.org')) {
      result.provider = 'arXiv Research';
      result.suggestedTitle = 'arXiv Research Paper (PDF)';
    } else if (lower.includes('ocw.mit.edu')) {
      result.provider = 'MIT OpenCourseWare';
      result.suggestedTitle = 'MIT Lecture Notes (PDF)';
    } else {
      result.provider = 'PDF Document';
      result.suggestedTitle = extractTitleFromUrl(url) || 'เอกสารประกอบการเรียน (PDF)';
    }
    return result;
  }

  if (lower.includes('leetcode.com')) {
    result.provider = 'LeetCode';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'LeetCode Problem';
    return result;
  }
  if (lower.includes('kaggle.com')) {
    result.provider = 'Kaggle';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'Kaggle Notebook / Dataset';
    return result;
  }
  if (lower.includes('hackerrank.com')) {
    result.provider = 'HackerRank';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'HackerRank Challenge';
    return result;
  }

  if (lower.includes('ocw.mit.edu')) {
    result.provider = 'MIT OpenCourseWare';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'MIT Course Material';
    return result;
  }
  if (lower.includes('coursera.org')) {
    result.provider = 'Coursera';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'Coursera Lecture';
    return result;
  }
  if (lower.includes('edx.org')) {
    result.provider = 'edX';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'edX Course';
    return result;
  }

  if (lower.includes('docs.python.org')) {
    result.provider = 'Python Docs';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'Python Official Documentation';
    return result;
  }
  if (lower.includes('developer.mozilla.org') || lower.includes('mdn')) {
    result.provider = 'MDN Web Docs';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'MDN Documentation';
    return result;
  }
  if (lower.includes('github.com')) {
    result.provider = 'GitHub';
    result.suggestedRole = 'practice';
    result.suggestedTitle = extractTitleFromUrl(url) || 'GitHub Repository';
    return result;
  }
  if (lower.includes('wikipedia.org')) {
    result.provider = 'Wikipedia';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'Wikipedia Article';
    return result;
  }

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    result.provider = domain;
    result.suggestedTitle = extractTitleFromUrl(url) || `${domain} Guide`;
  } catch {
    result.provider = 'Web Resource';
  }

  return result;
}

console.log('=== Running Phase 37: Real-World Resource Import Tests ===\n');

// Test 1: Standard YouTube Video
const yt1 = analyzeResourceUrl('https://www.youtube.com/watch?v=fNk_zzaMoSs');
assert.strictEqual(yt1.type, 'youtube');
assert.strictEqual(yt1.provider, 'YouTube');
assert.strictEqual(yt1.videoId, 'fNk_zzaMoSs');
assert.strictEqual(yt1.canEmbed, true);
assert.strictEqual(yt1.suggestedRole, 'primary');
assert.strictEqual(yt1.thumbnail, 'https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg');
console.log('✔ Test 1: Standard YouTube video parsed with videoId, thumbnail & primary role');

// Test 2: youtu.be Short URL
const yt2 = analyzeResourceUrl('https://youtu.be/JP7ITIXG1gw');
assert.strictEqual(yt2.type, 'youtube');
assert.strictEqual(yt2.videoId, 'JP7ITIXG1gw');
assert.strictEqual(yt2.canEmbed, true);
console.log('✔ Test 2: youtu.be short format parsed seamlessly');

// Test 3: YouTube Shorts
const ytShorts = analyzeResourceUrl('https://www.youtube.com/shorts/b1t41Q3xRM8');
assert.strictEqual(ytShorts.type, 'youtube');
assert.strictEqual(ytShorts.isShorts, true);
assert.strictEqual(ytShorts.videoId, 'b1t41Q3xRM8');
assert.strictEqual(ytShorts.canEmbed, true);
console.log('✔ Test 3: YouTube Shorts identified and embeddable');

// Test 4: YouTube Playlist
const ytPlaylist = analyzeResourceUrl('https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab');
assert.strictEqual(ytPlaylist.type, 'youtube');
assert.strictEqual(ytPlaylist.isPlaylist, true);
console.log('✔ Test 4: YouTube Playlist detected');

// Test 5: Direct PDF Document & MIT OCW
const pdf1 = analyzeResourceUrl('https://ocw.mit.edu/courses/18-01sc-calculus/resources/notes.pdf');
assert.strictEqual(pdf1.type, 'pdf');
assert.strictEqual(pdf1.provider, 'MIT OpenCourseWare');
assert.strictEqual(pdf1.canEmbed, true);
assert.strictEqual(pdf1.suggestedRole, 'reference');
console.log('✔ Test 5: MIT OCW PDF classified as embeddable reference');

// Test 6: arXiv Research Paper PDF
const arxivPdf = analyzeResourceUrl('https://arxiv.org/pdf/1706.03762.pdf');
assert.strictEqual(arxivPdf.type, 'pdf');
assert.strictEqual(arxivPdf.provider, 'arXiv Research');
assert.strictEqual(arxivPdf.canEmbed, true);
console.log('✔ Test 6: arXiv Research PDF classified accurately');

// Test 7: LeetCode Practice URL
const leetcode = analyzeResourceUrl('https://leetcode.com/problems/two-sum/');
assert.strictEqual(leetcode.type, 'website');
assert.strictEqual(leetcode.provider, 'LeetCode');
assert.strictEqual(leetcode.suggestedRole, 'practice');
assert.strictEqual(leetcode.canEmbed, false, 'LeetCode blocks iframe (handled via external tab)');
assert.strictEqual(leetcode.suggestedTitle, 'Two Sum');
console.log('✔ Test 7: LeetCode classified as practice with title extracted from slug');

// Test 8: Kaggle Coding Notebook
const kaggle = analyzeResourceUrl('https://www.kaggle.com/learn/python');
assert.strictEqual(kaggle.provider, 'Kaggle');
assert.strictEqual(kaggle.suggestedRole, 'practice');
assert.strictEqual(kaggle.canEmbed, false);
console.log('✔ Test 8: Kaggle classified as practice platform');

// Test 9: Python Official Documentation
const pyDocs = analyzeResourceUrl('https://docs.python.org/3/tutorial/defining-functions.html');
assert.strictEqual(pyDocs.provider, 'Python Docs');
assert.strictEqual(pyDocs.suggestedRole, 'reference');
assert.strictEqual(pyDocs.suggestedTitle, 'Defining Functions');
console.log('✔ Test 9: Python Docs parsed with title extracted from HTML slug');

// Test 10: Coursera Course
const coursera = analyzeResourceUrl('https://www.coursera.org/learn/machine-learning');
assert.strictEqual(coursera.provider, 'Coursera');
assert.strictEqual(coursera.suggestedRole, 'primary');
assert.strictEqual(coursera.canEmbed, false);
console.log('✔ Test 10: Coursera classified as primary course with external launch fallback');

console.log('\nAll 10/10 Phase 37 Real-World Resource Import tests passed successfully!\n');
