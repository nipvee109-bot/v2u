/* =========================================================================
   V2U Skill Gap Engine (Phase 44)
   -------------------------------------------------------------------------
   Target requirements vs current learning state → per-skill status:
     ready        พร้อม
     developing   กำลังพัฒนา
     needs-review ต้องทบทวน
     not-learned  ยังไม่ได้เรียน

   Pure and deterministic. Input is the existing per-lesson LearningRecord
   (computed by the store's computeLessonLearningRecord), so the existing
   0–4 readiness calculation is reused, not re-implemented.
   ========================================================================= */

import type { Lesson, LearningRecord } from '../types';
import type { Curriculum, CurriculumSkill, CurriculumSubjectId } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson } from '../curriculum/engine';
import type { ReadinessProvider } from '../route/engine';

export type SkillStatus = 'ready' | 'developing' | 'needs-review' | 'not-learned';

/** Plain-Thai labels shown to students. */
export const SKILL_STATUS_LABEL: Record<SkillStatus, string> = {
  ready: 'พร้อม',
  developing: 'กำลังพัฒนา',
  'needs-review': 'ต้องทบทวน',
  'not-learned': 'ยังไม่ได้เรียน',
};

/** Contribution of each status to subject readiness (0–1). */
const STATUS_WEIGHT: Record<SkillStatus, number> = {
  ready: 1,
  developing: 0.5,
  'needs-review': 0.25,
  'not-learned': 0,
};

/** Lower = more urgent among learned skills. */
const URGENCY: Record<SkillStatus, number> = {
  'needs-review': 0,
  developing: 1,
  ready: 2,
  'not-learned': 3,
};

export const PASSING_QUIZ_SCORE = 60;
export const READY_MASTERY_SCORE = 3;

export type SkillReason = 'overdue-review' | 'low-quiz' | 'check-confused' | 'review-weak' | 'low-readiness' | 'in-progress' | 'proven' | 'not-started';

export interface SkillGap {
  skill: CurriculumSkill;
  status: SkillStatus;
  reason: SkillReason;
  /** Curriculum lessons that teach this skill. */
  lessonIds: string[];
  /** Trackable study lessons behind those curriculum lessons. */
  studyLessonIds: string[];
}

export interface SubjectSkillGap {
  subjectId: CurriculumSubjectId;
  readinessPercent: number;
  counts: Record<SkillStatus, number>;
  skills: SkillGap[];
}

/** The newest evidence about the lesson is a weak review answer. */
export function reviewIsLatestWeak(record: LearningRecord): boolean {
  const weak = record.lastReviewOutcome === 'forgot' || record.lastReviewOutcome === 'unsure';
  return weak && (!record.lastCheckedAt || (record.lastReviewedAt ?? '') >= record.lastCheckedAt);
}

/** The newest evidence is a review that went well (it supersedes an older confused check). */
const reviewIsLatestGood = (record: LearningRecord) =>
  (record.lastReviewOutcome === 'remembered' || record.lastReviewOutcome === 'partially') && !!record.lastCheckedAt && (record.lastReviewedAt ?? '') > record.lastCheckedAt;

/** Classify one study lesson's learning record. */
export function classifyRecord(record: LearningRecord | undefined, referenceDate: Date): { status: SkillStatus; reason: SkillReason } {
  if (!record) return { status: 'not-learned', reason: 'not-started' };
  const studied = record.completionStatus !== 'NOT STARTED' || record.studyCount > 0 || (record.masteryScore ?? 0) > 0;
  if (!studied) return { status: 'not-learned', reason: 'not-started' };

  const quiz = record.quizLatestScore ?? record.quizBestScore;
  const overdue =
    record.completionStatus === 'COMPLETED' && !!record.nextReviewAt && new Date(record.nextReviewAt).getTime() < referenceDate.getTime();
  const score = record.masteryScore ?? 0;

  if (overdue) return { status: 'needs-review', reason: 'overdue-review' };
  // Phase 61: the latest review answer is evidence — "ยังไม่แม่น / จำไม่ได้" means review again,
  // unless a newer understanding check already showed otherwise
  if (reviewIsLatestWeak(record)) return { status: 'needs-review', reason: 'review-weak' };
  if (quiz !== undefined && quiz < PASSING_QUIZ_SCORE) return { status: 'needs-review', reason: 'low-quiz' };
  if (score <= 1 && record.completionStatus === 'COMPLETED') return { status: 'needs-review', reason: 'low-readiness' };
  if (record.completionStatus === 'COMPLETED' && score >= READY_MASTERY_SCORE) return { status: 'ready', reason: 'proven' };
  return { status: 'developing', reason: 'in-progress' };
}

export interface SkillGapParams {
  storeLessons: Lesson[];
  records: LearningRecord[];
  referenceDate?: Date;
  curriculum?: Curriculum;
}

export function getSkillGaps(params: SkillGapParams): SkillGap[] {
  const { storeLessons, records, referenceDate = new Date(), curriculum = CURRICULUM } = params;
  const recordByLesson = new Map(records.map((r) => [r.lessonId, r]));

  return curriculum.skills.map((skill) => {
    const cLessons = curriculum.lessons.filter((l) => l.skillIds.includes(skill.id));
    const studyLessonIds = [
      ...new Set(cLessons.map((l) => findStudyLesson(l, storeLessons)?.id).filter((x): x is string => !!x)),
    ];
    // Evidence counts per (curriculum lesson → study lesson) pair. Phase 50: when a study
    // lesson tracks which curriculum lessons are done, a sibling's study is not evidence.
    const classified = cLessons
      .map((cl) => findStudyLesson(cl, storeLessons))
      .map((study, i) => {
        if (!study) return null;
        const record = recordByLesson.get(study.id);
        // Phase 56: the latest understanding check named THIS skill as shaky → review it
        // (Phase 61: skill-level evidence comes before the sibling-credit rule below)
        if (record?.confusedSkillIds?.includes(skill.id) && !reviewIsLatestGood(record)) return { status: 'needs-review' as SkillStatus, reason: 'check-confused' as SkillReason };
        const tracked = study.completedCurriculumLessonIds;
        if (Array.isArray(tracked) && !tracked.includes(cLessons[i].id)) return { status: 'not-learned' as SkillStatus, reason: 'not-started' as SkillReason };
        return classifyRecord(record, referenceDate);
      })
      .filter((c): c is { status: SkillStatus; reason: SkillReason } => c !== null);
    const learned = classified.filter((c) => c.status !== 'not-learned');
    // A skill is as strong as its weakest studied lesson; unstudied if none studied.
    const pick = learned.length > 0 ? [...learned].sort((a, b) => URGENCY[a.status] - URGENCY[b.status])[0] : classified[0];
    return {
      skill,
      status: pick?.status ?? 'not-learned',
      reason: pick?.reason ?? 'not-started',
      lessonIds: cLessons.map((l) => l.id),
      studyLessonIds,
    };
  });
}

export function getSubjectSkillGaps(params: SkillGapParams): SubjectSkillGap[] {
  const curriculum = params.curriculum ?? CURRICULUM;
  const gaps = getSkillGaps(params);
  return curriculum.subjects.map((subject) => {
    const skills = gaps.filter((g) => g.skill.subjectId === subject.id);
    const counts: Record<SkillStatus, number> = { ready: 0, developing: 0, 'needs-review': 0, 'not-learned': 0 };
    skills.forEach((g) => counts[g.status]++);
    const readinessPercent =
      skills.length > 0 ? Math.round((skills.reduce((s, g) => s + STATUS_WEIGHT[g.status], 0) / skills.length) * 100) : 0;
    return { subjectId: subject.id, readinessPercent, counts, skills };
  });
}

/**
 * Weakest learned skill (needs-review first, then developing) — the
 * candidate for "ทบทวนจุดที่ยังไม่แม่น" in the adaptive next step.
 */
export function getWeakestSkill(params: SkillGapParams & { subjectId?: CurriculumSubjectId }): SkillGap | undefined {
  return getSkillGaps(params)
    .filter((g) => g.status === 'needs-review' && (!params.subjectId || g.skill.subjectId === params.subjectId))
    .sort((a, b) => a.skill.id.localeCompare(b.skill.id))[0];
}

/** Route readiness based on skills (plugs into buildStudentRoute). */
export function createSkillReadinessProvider(records: LearningRecord[], referenceDate?: Date): ReadinessProvider {
  return (subjectId, storeLessons) =>
    getSubjectSkillGaps({ storeLessons, records, referenceDate }).find((s) => s.subjectId === subjectId)?.readinessPercent ?? 0;
}
