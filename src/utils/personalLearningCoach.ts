import type {
  Lesson,
  SubjectId,
  StudySession,
  LearningSession,
  ReviewItem,
  UnclearTopic,
} from '../types';
import { SUBJECTS } from '../types';

export type CoachPriority = 'urgent' | 'high' | 'medium' | 'normal';
export type CoachActionType = 'review' | 'study' | 'clarify';

export interface CoachRecommendation {
  id: string;
  lessonId?: string;
  reviewItemId?: string;
  unclearTopicId?: string;
  title: string;
  subjectId: SubjectId;
  actionType: CoachActionType;
  priority: CoachPriority;
  priorityLabel: string;
  priorityRank: number; // 1 = highest
  estimatedMinutes: number;
  reason: string;
  whyExplanation: string;
  cognitivePrinciple: string;
  targetUrl: string;
  actionButtonText: string;
}

export interface CoachInputParams {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  unclearTopics: UnclearTopic[];
  todayStr?: string;
}

/**
 * Deterministic Personal Learning Coach Recommendation Engine
 * Hierarchy:
 * 1. Overdue Review (ป้องกันการลืม)
 * 2. In-Progress Lesson (ทำให้จบ)
 * 3. Unclear Topic (แก้จุดติดขัด)
 * 4. Planned Session for Today (ตามแผนที่วางไว้)
 * 5. Next Roadmap Lesson (ก้าวไปข้างหน้า)
 */
export function getCoachRecommendations(params: CoachInputParams): CoachRecommendation[] {
  const {
    lessons = [],
    sessions = [],
    reviewQueue = [],
    unclearTopics = [],
    todayStr = new Date().toISOString().split('T')[0],
  } = params;

  const recommendations: CoachRecommendation[] = [];

  // ── 1. OVERDUE REVIEWS (Highest Priority) ──
  const overdueReviews = reviewQueue
    .filter((r) => r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));

  overdueReviews.forEach((rev) => {
    const lesson = lessons.find((l) => l.id === rev.lessonId);
    const subId = lesson?.subjectId || 'math';
    recommendations.push({
      id: `coach-review-${rev.id}`,
      lessonId: rev.lessonId,
      reviewItemId: rev.id,
      title: rev.topic || lesson?.title || 'ทบทวนบทเรียน',
      subjectId: subId,
      actionType: 'review',
      priority: 'urgent',
      priorityLabel: 'ด่วนที่สุด — ทบทวนก่อนลืม',
      priorityRank: 1,
      estimatedMinutes: 15,
      reason: `ถึงกำหนดทบทวนตามหลัก Spaced Repetition ในวิชา ${SUBJECTS[subId]?.name || subId}`,
      whyExplanation:
        'ตามหลัก Forgetting Curve หากปล่อยข้ามช่วงเวลานี้ ข้อมูลจะเริ่มเลือนหายอย่างรวดเร็ว การทบทวนสั้นๆ 10-15 นาทีในจังหวะนี้จะช่วยยึดข้อมูลไว้ในหน่วยความจำระยะยาวถาวร',
      cognitivePrinciple: 'Ebbinghaus Spaced Repetition & Memory Retention',
      targetUrl: `/review-room/${rev.id}`,
      actionButtonText: 'เปิดห้องทบทวน (15 นาที)',
    });
  });

  // ── 2. IN-PROGRESS LESSONS (Continue and Finish) ──
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
      estimatedMinutes: Math.min(60, Math.max(25, (l.durationHours || 1) * 60)),
      reason: `คุณกำลังเรียนบท "${l.title}" ค้างไว้ ควรเรียนต่อให้จบรอบเพื่อความต่อเนื่อง`,
      whyExplanation:
        'การเรียนแบบต่อเนื่องจนจบประเด็นหลัก ช่วยลด Cognitive Switching Cost และป้องกันไม่ให้ไอเดียสำคัญขาดตอน ทำให้จำโครงสร้างภาพรวมได้แม่นยำกว่าการทิ้งไว้นาน',
      cognitivePrinciple: 'Zeigarnik Effect & Task Continuity',
      targetUrl: `/study-room/${l.id}`,
      actionButtonText: 'เข้า Study Room เรียนต่อ',
    });
  });

  // ── 3. UNCLEAR TOPICS (Resolve Blockers) ──
  const pendingUnclear = unclearTopics.filter((u) => u.status !== 'Understood');
  pendingUnclear.forEach((u) => {
    const matchingLesson = lessons.find(
      (l) => l.subjectId === u.subjectId && (l.title.includes(u.topic) || u.topic.includes(l.title))
    ) || lessons.find((l) => l.subjectId === u.subjectId);

    recommendations.push({
      id: `coach-unclear-${u.id}`,
      lessonId: matchingLesson?.id,
      unclearTopicId: u.id,
      title: `แก้จุดติดขัด: ${u.topic}`,
      subjectId: u.subjectId,
      actionType: 'clarify',
      priority: 'high',
      priorityLabel: 'แก้จุดติดขัด — เคลียร์ความเข้าใจ',
      priorityRank: 3,
      estimatedMinutes: 20,
      reason: `มีประเด็นที่บันทึกว่ายังไม่เข้าใจในวิชา ${SUBJECTS[u.subjectId]?.name || u.subjectId}`,
      whyExplanation:
        'ความรู้ทางวิศวกรรมคอมและ AI เป็นแบบสั่งสม (Cumulative Schema) หากจุดพื้นฐานยังมีข้อสงสัย การเรียนบทถัดไปจะมีความฝืดและเข้าใจยากขึ้นเป็นทวีคูณ',
      cognitivePrinciple: 'Cognitive Load Theory & Schema Building',
      targetUrl: matchingLesson ? `/study-room/${matchingLesson.id}` : '/not-understood',
      actionButtonText: 'ทบทวนและทำความเข้าใจ',
    });
  });

  // ── 4. PLANNED SESSIONS FOR TODAY ──
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
      reason: `ถึงเวลาเซสชันตามแผนการเรียนประจำวันที่คุณจัดตารางไว้ (${s.startTime || 'วันนี้'})`,
      whyExplanation:
        'การปฏิบัติตามแผนการเรียนที่กำหนดไว้ล่วงหน้า ช่วยลด Decision Fatigue และสร้างความสม่ำเสมอซึ่งเป็นปัจจัยสำคัญที่สุดในการเรียนรู้ 6 เดือน',
      cognitivePrinciple: 'Implementation Intentions & Habit Formation',
      targetUrl: s.lessonId ? `/study-room/${s.lessonId}` : '/planner',
      actionButtonText: 'เริ่มเรียนตามแผน',
    });
  });

  // ── 5. NEXT ROADMAP LESSON (Advance Forward) ──
  const unstartedLessons = lessons.filter((l) => l.status === 'NOT STARTED');
  if (unstartedLessons.length > 0) {
    // Sort by month and week
    const sorted = [...unstartedLessons].sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.week - b.week;
    });

    const nextLesson = sorted[0];
    recommendations.push({
      id: `coach-roadmap-${nextLesson.id}`,
      lessonId: nextLesson.id,
      title: nextLesson.title,
      subjectId: nextLesson.subjectId,
      actionType: 'study',
      priority: 'normal',
      priorityLabel: 'ก้าวไปข้างหน้า — บทเรียนถัดไป',
      priorityRank: 5,
      estimatedMinutes: Math.min(60, Math.max(30, (nextLesson.durationHours || 1) * 60)),
      reason: `บทเรียนถัดไปตามแผน 6 เดือน สู่ วิศวะคอม / AI (เดือนที่ ${nextLesson.month} สัปดาห์ที่ ${nextLesson.week})`,
      whyExplanation:
        'เมื่อเคลียร์รายการทบทวนและงานค้างเรียบร้อยแล้ว นี่คือจังหวะที่ดีที่สุดในการเปิดรับหัวข้อใหม่เพื่อขับเคลื่อนความก้าวหน้าตามเป้าหมาย 6 เดือน',
      cognitivePrinciple: 'Zone of Proximal Development & Progressive Mastery',
      targetUrl: `/study-room/${nextLesson.id}`,
      actionButtonText: 'เริ่มเรียนบทนี้',
    });
  }

  return recommendations;
}
