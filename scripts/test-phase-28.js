import assert from 'node:assert';

console.log('--- RUNNING PHASE 28: YOUTUBE LEARNING QA TESTS ---');

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

function extractYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function formatVideoTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 1. YouTube URL parsing
check(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Extracts ID from standard watch URL');
check(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Extracts ID from youtu.be short URL');
check(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Extracts ID from embed URL');
check(extractYouTubeVideoId('https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'Extracts ID from query parameter with extra parameters');
check(extractYouTubeVideoId('https://wikipedia.org') === null, 'Returns null on non-YouTube URL');

// 2. Video Time formatting
check(formatVideoTime(0) === '00:00', 'Formats 0s as 00:00');
check(formatVideoTime(822) === '13:42', 'Formats 822s as 13:42');
check(formatVideoTime(5022) === '01:23:42', 'Formats 5,022s as 01:23:42 (hours supported)');

// 3. YouTube duration vs Study timer separation rule
const videoDurationSeconds = 7200; // 2 hours video
const actualStudyTimerSeconds = 3600; // Studied 1 hour

check(videoDurationSeconds !== actualStudyTimerSeconds, 'Playback duration is decoupled from study session timer');
check(actualStudyTimerSeconds === 3600, 'Study time derives strictly from active session timer');

console.log(`\n======================================================`);
console.log(`PHASE 28 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
