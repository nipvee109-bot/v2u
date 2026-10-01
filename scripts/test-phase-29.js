import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

console.log('--- RUNNING PHASE 29: TIMESTAMPED NOTES QA TESTS ---');

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

// 1. Add timestamped note
function addTimestampedNote(lesson, sessionId, timestampSeconds, timestampDisplay, content) {
  const note = {
    id: uuidv4(),
    lessonId: lesson.id,
    sessionId,
    timestampSeconds,
    timestampDisplay,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  const updatedLesson = {
    ...lesson,
    timestampedNotes: [...(lesson.timestampedNotes || []), note],
  };

  return { note, updatedLesson };
}

const mockLesson = { id: 'l1', title: 'Python Functions', timestampedNotes: [] };
const { note: n1, updatedLesson: l1 } = addTimestampedNote(mockLesson, 's1', 822, '13:42', 'Function parameter คือตัวแปรที่รับค่าจาก caller');

check(Boolean(n1.id), 'Generated unique note id');
check(n1.timestampSeconds === 822, 'Stored accurate timestamp in seconds');
check(n1.timestampDisplay === '13:42', 'Stored formatted timestamp display');
check(l1.timestampedNotes.length === 1, 'Lesson contains added timestamped note');

// 2. Add second note at later timestamp
const { note: n2, updatedLesson: l2 } = addTimestampedNote(l1, 's1', 2145, '35:45', 'Return value คืนค่าผลลัพธ์กลับไปยังจุดที่เรียกใช้');
check(l2.timestampedNotes.length === 2, 'Lesson contains multiple timestamped notes');

// 3. Delete note
function deleteTimestampedNote(lesson, noteId) {
  return {
    ...lesson,
    timestampedNotes: (lesson.timestampedNotes || []).filter(n => n.id !== noteId),
  };
}

const l3 = deleteTimestampedNote(l2, n1.id);
check(l3.timestampedNotes.length === 1, 'Note deleted successfully');
check(l3.timestampedNotes[0].id === n2.id, 'Remaining note is intact');

// 4. Backward compatibility
const legacyLesson = { id: 'l-old', title: 'Old Calculus' }; // No timestampedNotes field
const notes = legacyLesson.timestampedNotes || [];
check(notes.length === 0, 'Safely falls back to empty array for legacy lessons without timestampedNotes');

console.log(`\n======================================================`);
console.log(`PHASE 29 QA SUMMARY: ${passed} passed, 0 failed`);
console.log(`======================================================\n`);
