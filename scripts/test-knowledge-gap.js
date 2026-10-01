// Automated test suite for Phase 12 Knowledge Gap Analysis
import assert from 'node:assert';

// Standalone mirror of the deterministic Knowledge Gap logic for validation
function computeKnowledgeGaps({
  lessons,
  unclearTopics = [],
  reviewQueue = [],
  learningSessionsHistory = [],
  studyPlannerSessions = [],
  todayStr = '2026-10-01'
}) {
  const gaps = [];

  lessons.forEach((lesson) => {
    const mastery = lesson.masteryScore ?? 0;
    const quizScore = lesson.quizScore;
    const lastStudied = lesson.lastStudiedAt || lesson.completedAt;

    // Overdue check
    const overdueReviews = reviewQueue.filter(
      (r) => r.lessonId === lesson.id && r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr
    );
    const isOverdueReview = overdueReviews.length > 0;
    let overdueDays = 0;
    if (isOverdueReview) {
      const todayTime = new Date(todayStr).getTime();
      const oldestDueTime = Math.min(...overdueReviews.map((r) => new Date(r.nextReviewAt.split('T')[0]).getTime()));
      overdueDays = Math.max(1, Math.round((todayTime - oldestDueTime) / (1000 * 60 * 60 * 24)));
    }

    // Matching unclear topics
    const matchingUnclear = unclearTopics.filter(
      (u) => u.status !== 'Understood' &&
             u.subjectId === lesson.subjectId &&
             (u.topic.toLowerCase().includes(lesson.title.toLowerCase()) || lesson.title.toLowerCase().includes(u.topic.toLowerCase()))
    );
    const hasStillUnclearNotes = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 0);
    const unclearCount = matchingUnclear.length + (hasStillUnclearNotes ? 1 : 0);

    const reasons = [];

    // Reason 1: Low quiz score (< 60%)
    if (quizScore !== undefined && quizScore < 60) {
      reasons.push({
        code: 'low_quiz',
        label: `คะแนนแบบทดสอบต่ำกว่าเกณฑ์ (${quizScore}%)`,
        severity: quizScore < 50 ? 'critical' : 'moderate',
      });
    }

    // Reason 2: Repeated unclear
    if (unclearCount > 0) {
      reasons.push({
        code: 'repeated_unclear',
        label: `มีประเด็นที่ยังไม่เข้าใจ (${unclearCount} รายการ)`,
        severity: unclearCount >= 2 ? 'critical' : 'moderate',
      });
    }

    // Reason 3: Low mastery
    if (lesson.status === 'COMPLETED' && mastery <= 2) {
      reasons.push({
        code: 'low_mastery',
        label: `ระดับความเข้าใจต่ำกว่าเกณฑ์ (${mastery}/4)`,
        severity: mastery <= 1 ? 'critical' : 'moderate',
      });
    } else if (lesson.status === 'IN PROGRESS' && (lesson.actualStudyMinutes || 0) >= 45 && mastery <= 1) {
      reasons.push({
        code: 'low_mastery',
        label: `ระดับความเข้าใจพัฒนาช้า (${mastery}/4)`,
        severity: 'moderate',
      });
    }

    // Reason 4: Review overdue
    if (isOverdueReview) {
      reasons.push({
        code: 'review_overdue',
        label: `เลยกำหนดทบทวน Spaced Review (${overdueDays} วัน)`,
        severity: overdueDays >= 3 ? 'critical' : 'moderate',
      });
    }

    // Reason 5: Never reviewed
    if (lesson.status === 'COMPLETED' && (lesson.reviewCount || 0) === 0) {
      reasons.push({
        code: 'never_reviewed',
        label: 'เรียนจบแล้วแต่ยังไม่เคยทบทวน (0 รอบ)',
        severity: 'minor',
      });
    }

    if (reasons.length > 0) {
      const hasCritical = reasons.some((r) => r.severity === 'critical');
      const hasModerate = reasons.some((r) => r.severity === 'moderate');
      const severity = (hasCritical || reasons.length >= 3)
        ? 'critical'
        : (hasModerate || reasons.length >= 2)
        ? 'moderate'
        : 'minor';

      let scoreWeight = 0;
      if (isOverdueReview) scoreWeight += 45 + Math.min(30, overdueDays * 5);
      if (quizScore !== undefined && quizScore < 60) scoreWeight += 40 + Math.max(0, 60 - quizScore);
      if (unclearCount > 0) scoreWeight += 35 + unclearCount * 5;
      scoreWeight += (4 - mastery) * 10;
      if (reasons.some((r) => r.code === 'never_reviewed')) scoreWeight += 20;
      if (severity === 'critical') scoreWeight += 30;
      else if (severity === 'moderate') scoreWeight += 15;

      gaps.push({
        id: `gap-${lesson.id}`,
        topic: lesson.title,
        subject: lesson.subjectId,
        relatedLessonIds: [lesson.id],
        reasons,
        mastery,
        lastStudied,
        quizScore,
        severity,
        scoreWeight,
        unclearCount,
      });
    }
  });

  // Orphaned unclear topics
  unclearTopics.forEach((u) => {
    if (u.status !== 'Understood') {
      const alreadyLinked = gaps.some((g) =>
        g.subject === u.subjectId && (g.topic.toLowerCase().includes(u.topic.toLowerCase()) || u.topic.toLowerCase().includes(g.topic.toLowerCase()))
      );

      if (!alreadyLinked) {
        const severity = u.priority === 'High' ? 'critical' : u.priority === 'Medium' ? 'moderate' : 'minor';
        gaps.push({
          id: `gap-unclear-${u.id}`,
          topic: u.topic,
          subject: u.subjectId,
          relatedLessonIds: [],
          reasons: [
            {
              code: 'repeated_unclear',
              label: `มีข้อสงสัยติดค้าง: ${u.topic}`,
              severity,
            },
          ],
          mastery: 0,
          lastStudied: u.createdAt,
          quizScore: undefined,
          severity,
          scoreWeight: u.priority === 'High' ? 65 : u.priority === 'Medium' ? 45 : 30,
          unclearCount: 1,
        });
      }
    }
  });

  return gaps.sort((a, b) => b.scoreWeight - a.scoreWeight);
}

// ─────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────
console.log('Running Phase 12 Knowledge Gap Analysis Test Suite...\n');

let passedTests = 0;

// Test 1: Low quiz score detection (< 60%)
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'l1',
        title: 'Python Functions',
        subjectId: 'programming',
        status: 'COMPLETED',
        quizScore: 45,
        masteryScore: 3,
        reviewCount: 2,
      },
    ],
  });

  assert.strictEqual(gaps.length, 1, 'Should flag lesson with quiz score < 60%');
  assert.ok(gaps[0].reasons.some((r) => r.code === 'low_quiz'), 'Should have low_quiz reason');
  assert.strictEqual(gaps[0].severity, 'critical', 'Quiz < 50% should be critical severity');
  console.log('PASS Test 1: Low quiz score detected (< 60% and < 50% critical)');
  passedTests++;
}

// Test 2: Repeated unclear notes detection
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'l2',
        title: 'เวกเตอร์ 3 มิติ',
        subjectId: 'physics',
        status: 'IN PROGRESS',
        stillUnclearNotes: 'ยังสับสนเรื่อง Cross Product ทิศทางกดมือขวา',
        actualStudyMinutes: 30,
        masteryScore: 2,
      },
    ],
  });

  assert.strictEqual(gaps.length, 1, 'Should flag lesson with stillUnclearNotes');
  assert.ok(gaps[0].reasons.some((r) => r.code === 'repeated_unclear'), 'Should have repeated_unclear reason');
  assert.strictEqual(gaps[0].unclearCount, 1, 'Unclear count should be 1');
  console.log('PASS Test 2: Repeated unclear notes detected');
  passedTests++;
}

// Test 3: Low mastery on completed lesson (mastery <= 2)
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'l3',
        title: 'แคลคูลัสพื้นฐาน',
        subjectId: 'math',
        status: 'COMPLETED',
        quizScore: 65,
        masteryScore: 1, // Only novice/familiar
        reviewCount: 1,
      },
    ],
  });

  assert.strictEqual(gaps.length, 1, 'Should flag lesson with low mastery');
  assert.ok(gaps[0].reasons.some((r) => r.code === 'low_mastery'), 'Should have low_mastery reason');
  assert.strictEqual(gaps[0].severity, 'critical', 'Mastery <= 1 on completed lesson should be critical');
  console.log('PASS Test 3: Low mastery detected on completed lesson');
  passedTests++;
}

// Test 4: Review overdue detection
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'l4',
        title: 'TGAT 3 การคิดอย่างมีเหตุผล',
        subjectId: 'tgat3',
        status: 'COMPLETED',
        quizScore: 80,
        masteryScore: 3,
        reviewCount: 1,
      },
    ],
    reviewQueue: [
      {
        id: 'rq1',
        lessonId: 'l4',
        status: 'pending',
        nextReviewAt: '2026-09-25T10:00:00.000Z', // 6 days overdue relative to 2026-10-01
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(gaps.length, 1, 'Should flag lesson with overdue review');
  assert.ok(gaps[0].reasons.some((r) => r.code === 'review_overdue'), 'Should have review_overdue reason');
  assert.strictEqual(gaps[0].severity, 'critical', 'Review overdue >= 3 days should be critical');
  console.log('PASS Test 4: Review overdue detected (6 days overdue)');
  passedTests++;
}

// Test 5: Never reviewed detection
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'l5',
        title: 'Neural Networks Basics',
        subjectId: 'ai',
        status: 'COMPLETED',
        quizScore: 85,
        masteryScore: 3,
        reviewCount: 0,
      },
    ],
    todayStr: '2026-10-01',
  });

  assert.strictEqual(gaps.length, 1, 'Should flag completed lesson with 0 reviews');
  assert.ok(gaps[0].reasons.some((r) => r.code === 'never_reviewed'), 'Should have never_reviewed reason');
  assert.strictEqual(gaps[0].severity, 'minor', 'Single never_reviewed reason should be minor severity');
  console.log('PASS Test 5: Never reviewed detected');
  passedTests++;
}

// Test 6: Multi-reason escalation and deterministic score weight sorting
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'gap-minor',
        title: 'Minor Gap Lesson',
        subjectId: 'ai',
        status: 'COMPLETED',
        quizScore: 85,
        masteryScore: 3,
        reviewCount: 0, // only never_reviewed
      },
      {
        id: 'gap-critical',
        title: 'Critical Gap Lesson',
        subjectId: 'math',
        status: 'COMPLETED',
        quizScore: 40, // low quiz (<50 critical)
        stillUnclearNotes: 'ไม่เข้าใจสมการวงรี', // repeated unclear
        masteryScore: 1, // low mastery
        reviewCount: 0, // never reviewed
      },
      {
        id: 'gap-moderate',
        title: 'Moderate Gap Lesson',
        subjectId: 'physics',
        status: 'COMPLETED',
        quizScore: 55, // low quiz
        masteryScore: 2, // low mastery
        reviewCount: 1,
      },
    ],
  });

  assert.strictEqual(gaps.length, 3);
  assert.strictEqual(gaps[0].id, 'gap-gap-critical', 'Critical gap must be sorted first');
  assert.strictEqual(gaps[1].id, 'gap-gap-moderate', 'Moderate gap must be sorted second');
  assert.strictEqual(gaps[2].id, 'gap-gap-minor', 'Minor gap must be sorted last');
  console.log('PASS Test 6: Multi-reason escalation & deterministic score weight sorting');
  passedTests++;
}

// Test 7: Orphaned unclear topic detection
{
  const gaps = computeKnowledgeGaps({
    lessons: [],
    unclearTopics: [
      {
        id: 'unc-1',
        topic: 'สมบัติเชิงกลของของไหล',
        details: 'สมการแบร์นูลลีประยุกต์',
        subjectId: 'physics',
        priority: 'High',
        status: 'Not Understood',
        createdAt: '2026-10-01T08:00:00.000Z',
      },
    ],
  });

  assert.strictEqual(gaps.length, 1, 'Should include orphaned unclear topic');
  assert.strictEqual(gaps[0].topic, 'สมบัติเชิงกลของของไหล');
  assert.strictEqual(gaps[0].severity, 'critical');
  console.log('PASS Test 7: Orphaned unclear topic detected as Knowledge Gap');
  passedTests++;
}

// Test 8: Clean completed lesson with high mastery is NOT flagged as a gap
{
  const gaps = computeKnowledgeGaps({
    lessons: [
      {
        id: 'clean-1',
        title: 'Python Complete Mastery',
        subjectId: 'programming',
        status: 'COMPLETED',
        quizScore: 95,
        masteryScore: 4,
        reviewCount: 3,
        stillUnclearNotes: '',
      },
    ],
  });

  assert.strictEqual(gaps.length, 0, 'Clean lesson should NOT be flagged as a knowledge gap');
  console.log('PASS Test 8: Clean lesson with high mastery correctly excluded from gaps');
  passedTests++;
}

console.log(`\nAll ${passedTests} test cases passed successfully!`);
