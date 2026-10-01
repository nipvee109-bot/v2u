/**
 * Test Suite: Phase 35 — Personal Learning Coach
 */

import assert from 'node:assert';

function getCoachRecommendations(params) {
  const {
    lessons = [],
    sessions = [],
    reviewQueue = [],
    unclearTopics = [],
    todayStr = new Date().toISOString().split('T')[0],
  } = params;

  const recommendations = [];

  // 1. Overdue Reviews
  const overdueReviews = reviewQueue
    .filter((r) => r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));

  overdueReviews.forEach((rev) => {
    recommendations.push({
      id: `coach-review-${rev.id}`,
      lessonId: rev.lessonId,
      reviewItemId: rev.id,
      title: rev.topic || 'ทบทวนบทเรียน',
      subjectId: 'math',
      actionType: 'review',
      priority: 'urgent',
      priorityLabel: 'ด่วนที่สุด — ทบทวนก่อนลืม',
      priorityRank: 1,
      estimatedMinutes: 15,
      reason: 'ถึงกำหนดทบทวนตามหลัก Spaced Repetition',
      whyExplanation: 'ตามหลัก Forgetting Curve หากปล่อยข้ามช่วงเวลานี้ ข้อมูลจะเริ่มเลือนหายอย่างรวดเร็ว',
      cognitivePrinciple: 'Ebbinghaus Spaced Repetition',
      targetUrl: `/review-room/${rev.id}`,
      actionButtonText: 'เปิดห้องทบทวน (15 นาที)',
    });
  });

  // 2. In-Progress Lessons
  const inProgressLessons = lessons.filter((l) => l.status === 'IN PROGRESS');
  inProgressLessons.forEach((l) => {
    recommendations.push({
      id: `coach-inprogress-${l.id}`,
      lessonId: l.id,
      title: l.title,
      subjectId: l.subjectId,
      actionType: 'study',
      priority: 'high',
      priorityLabel: 'สำคัญสูง — เรียนต่อให้จบ',
      priorityRank: 2,
      estimatedMinutes: 45,
      reason: `คุณกำลังเรียนบท "${l.title}" ค้างไว้`,
      whyExplanation: 'การเรียนแบบต่อเนื่องจนจบประเด็นหลัก ช่วยลด Cognitive Switching Cost',
      cognitivePrinciple: 'Zeigarnik Effect & Task Continuity',
      targetUrl: `/study-room/${l.id}`,
      actionButtonText: 'เข้า Study Room เรียนต่อ',
    });
  });

  // 3. Unclear Topics
  const pendingUnclear = unclearTopics.filter((u) => u.status !== 'Understood');
  pendingUnclear.forEach((u) => {
    recommendations.push({
      id: `coach-unclear-${u.id}`,
      unclearTopicId: u.id,
      title: `แก้จุดติดขัด: ${u.topic}`,
      subjectId: u.subjectId,
      actionType: 'clarify',
      priority: 'high',
      priorityLabel: 'แก้จุดติดขัด — เคลียร์ความเข้าใจ',
      priorityRank: 3,
      estimatedMinutes: 20,
      reason: `มีประเด็นที่บันทึกว่ายังไม่เข้าใจ`,
      whyExplanation: 'ความรู้ทางวิศวกรรมคอมและ AI เป็นแบบสั่งสม (Cumulative Schema)',
      cognitivePrinciple: 'Cognitive Load Theory & Schema Building',
      targetUrl: '/not-understood',
      actionButtonText: 'ทบทวนและทำความเข้าใจ',
    });
  });

  // 4. Planned Sessions
  const todayPlanned = sessions.filter((s) => s.date === todayStr && s.status === 'planned');
  todayPlanned.forEach((s) => {
    recommendations.push({
      id: `coach-planned-${s.id}`,
      lessonId: s.lessonId,
      title: s.title,
      subjectId: s.subjectId,
      actionType: 'study',
      priority: 'medium',
      priorityLabel: 'ตามแผน — ตารางเรียนวันนี้',
      priorityRank: 4,
      estimatedMinutes: s.plannedMinutes || 45,
      reason: `ถึงเวลาเซสชันตามแผนการเรียนประจำวัน`,
      whyExplanation: 'การปฏิบัติตามแผนการเรียนที่กำหนดไว้ล่วงหน้า ช่วยลด Decision Fatigue',
      cognitivePrinciple: 'Implementation Intentions & Habit Formation',
      targetUrl: `/study-room/${s.lessonId}`,
      actionButtonText: 'เริ่มเรียนตามแผน',
    });
  });

  // 5. Next Roadmap Lesson
  const unstartedLessons = lessons.filter((l) => l.status === 'NOT STARTED');
  if (unstartedLessons.length > 0) {
    const nextLesson = unstartedLessons[0];
    recommendations.push({
      id: `coach-roadmap-${nextLesson.id}`,
      lessonId: nextLesson.id,
      title: nextLesson.title,
      subjectId: nextLesson.subjectId,
      actionType: 'study',
      priority: 'normal',
      priorityLabel: 'ก้าวไปข้างหน้า — บทเรียนถัดไป',
      priorityRank: 5,
      estimatedMinutes: 45,
      reason: `บทเรียนถัดไปตามแผน 6 เดือน`,
      whyExplanation: 'เมื่อเคลียร์รายการทบทวนเรียบร้อยแล้ว นี่คือจังหวะที่ดีที่สุดในการเปิดรับหัวข้อใหม่',
      cognitivePrinciple: 'Progressive Mastery',
      targetUrl: `/study-room/${nextLesson.id}`,
      actionButtonText: 'เริ่มเรียนบทนี้',
    });
  }

  return recommendations;
}

console.log('=== Running Phase 35: Personal Learning Coach Tests ===\n');

const today = '2026-10-02';

const mockState = {
  lessons: [
    { id: 'les-in-prog', title: 'Calculus Limits', subjectId: 'math', status: 'IN PROGRESS' },
    { id: 'les-not-started', title: 'Python OOP', subjectId: 'programming', status: 'NOT STARTED' },
  ],
  sessions: [
    { id: 'sess-today', title: 'Daily Coding', subjectId: 'programming', date: today, status: 'planned', plannedMinutes: 30 }
  ],
  reviewQueue: [
    { id: 'rev-overdue', topic: 'Vectors & Forces', lessonId: 'les-phys', status: 'pending', nextReviewAt: '2026-10-01T08:00:00.000Z' }
  ],
  unclearTopics: [
    { id: 'unc-1', topic: 'Pointers in C', subjectId: 'programming', status: 'Not Understood' }
  ],
  todayStr: today,
};

const recs = getCoachRecommendations(mockState);

// Test 1: Complete list of recommendations returned
assert.strictEqual(recs.length, 5, 'Generates all 5 category items when present');
console.log('✔ Test 1: Coach populates all 5 deterministic recommendation tiers');

// Test 2: Priority 1 (Overdue Review) is at the very top
assert.strictEqual(recs[0].priorityRank, 1, 'Top recommendation is Rank 1');
assert.strictEqual(recs[0].actionType, 'review');
assert.strictEqual(recs[0].targetUrl, '/review-room/rev-overdue');
console.log('✔ Test 2: Overdue review takes absolute highest priority to prevent forgetting');

// Test 3: Priority 2 (In-Progress lesson) is second
assert.strictEqual(recs[1].priorityRank, 2);
assert.strictEqual(recs[1].lessonId, 'les-in-prog');
assert.strictEqual(recs[1].targetUrl, '/study-room/les-in-prog');
console.log('✔ Test 3: In-progress lesson takes second priority to finish started task');

// Test 4: Priority 3 (Unclear topic) is third
assert.strictEqual(recs[2].priorityRank, 3);
assert.strictEqual(recs[2].unclearTopicId, 'unc-1');
console.log('✔ Test 4: Unclear topics take priority before new lessons to resolve blockers');

// Test 5: Priority 4 (Planned session) is fourth
assert.strictEqual(recs[3].priorityRank, 4);
assert.strictEqual(recs[3].estimatedMinutes, 30);
console.log('✔ Test 5: Planned sessions are prioritized by daily schedule');

// Test 6: Priority 5 (Next Roadmap) is fifth
assert.strictEqual(recs[4].priorityRank, 5);
assert.strictEqual(recs[4].lessonId, 'les-not-started');
console.log('✔ Test 6: Roadmap progression recommended when no higher blockers exist');

// Test 7: Clean slate (no reviews, no in-progress, no unclear, no planned)
const cleanRecs = getCoachRecommendations({
  lessons: [{ id: 'les-only', title: 'Neural Networks', subjectId: 'ai', status: 'NOT STARTED' }],
  sessions: [],
  reviewQueue: [],
  unclearTopics: [],
  todayStr: today,
});
assert.strictEqual(cleanRecs.length, 1);
assert.strictEqual(cleanRecs[0].priorityRank, 5);
assert.strictEqual(cleanRecs[0].lessonId, 'les-only');
console.log('✔ Test 7: Clean slate defaults cleanly to Next Roadmap lesson');

// Test 8: All recommendations have cognitive justification
recs.forEach((r, idx) => {
  assert(r.reason.length > 5, `Reason must be non-empty for item ${idx}`);
  assert(r.whyExplanation.length > 10, `WhyExplanation must be substantial for item ${idx}`);
  assert(r.cognitivePrinciple.length > 3, `CognitivePrinciple must be stated for item ${idx}`);
});
console.log('✔ Test 8: Every recommendation provides psychological & cognitive justification');

console.log('\nAll 8/8 Phase 35 Personal Learning Coach tests passed successfully!\n');
