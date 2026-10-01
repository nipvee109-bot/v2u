import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('--- RUNNING PHASE 30: MULTI-SOURCE LEARNING WORKSPACE QA TESTS ---');

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

function switchSessionResource(session, newResource) {
  const used = session.resourcesUsed || (session.source ? [session.source] : []);
  const exists = used.some(r => r.id === newResource.id);
  const updatedUsed = exists ? used : [...used, newResource];

  return {
    ...session,
    source: newResource,
    resourcesUsed: updatedUsed,
    lastHeartbeatAt: new Date().toISOString(),
  };
}

const rYouTube = { id: 'res-yt', type: 'youtube', title: 'Python Functions Tutorial', url: 'https://youtube.com/watch?v=1' };
const rPdf = { id: 'res-pdf', type: 'pdf', title: 'Python Standard Library Guide', url: 'https://docs.python.org/guide.pdf' };
const rPractice = { id: 'res-practice', type: 'website', title: 'LeetCode Python Practice', url: 'https://leetcode.com' };

// Initial session with YouTube
let session = {
  sessionId: uuidv4(),
  lessonId: 'l-py-functions',
  startedAt: new Date().toISOString(),
  accumulatedSeconds: 1200, // 20 min
  actualSeconds: 1200,
  source: rYouTube,
  resourcesUsed: [rYouTube],
  notesDraft: { learnedNotes: 'เริ่มต้นเรียน Function', stillUnclearNotes: '', reviewNotes: '' },
  status: 'active',
};

check(session.source.id === 'res-yt', 'Initial source is YouTube');
check(session.accumulatedSeconds === 1200, 'Initial study time is 20 minutes');

// 1. Switch to PDF
session = switchSessionResource(session, rPdf);
check(session.source.id === 'res-pdf', 'Switched active source to PDF');
check(session.accumulatedSeconds === 1200, 'Session timer NOT reset when switching to PDF');
check(session.status === 'active', 'Session remains continuously active');
check(session.notesDraft.learnedNotes === 'เริ่มต้นเรียน Function', 'NotesDraft preserved across source switch');
check(session.resourcesUsed.length === 2, 'resourcesUsed tracks both YouTube and PDF');

// 2. Switch to Practice Website
session = switchSessionResource(session, rPractice);
check(session.source.id === 'res-practice', 'Switched active source to Practice Website');
check(session.accumulatedSeconds === 1200, 'Session timer continues unbroken');
check(session.resourcesUsed.length === 3, 'resourcesUsed tracks all 3 sources');

// 3. Switch back to YouTube
session = switchSessionResource(session, rYouTube);
check(session.source.id === 'res-yt', 'Switched back to YouTube');
check(session.resourcesUsed.length === 3, 'resourcesUsed does not create duplicates when returning to existing source');

console.log(`\n======================================================`);
console.log(`PHASE 30 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
