/* =========================================================================
   V2U Diagnostic & Pathway engine (Phase 60)
   -------------------------------------------------------------------------
     diagnostic answers ─┐
     learning records ───┼→ per-skill profile (per subject, never one score)
     (check / mastery /  │        │
      review, existing)  ┘        ↓
     target + curriculum map → gaps → cross-subject next lesson (+ reasons)

   Pure and deterministic: no React, no store. Reuses the existing curriculum,
   skill engine (getSkillGaps), route data and prerequisite helpers.
   ========================================================================= */

import type { Lesson, LearningRecord } from '../types';
import type { CurriculumLesson, CurriculumSubjectId } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { findStudyLesson, getOrderedCurriculumLessons, isCurriculumLessonCompleted } from '../curriculum/engine';
import { getSkillGaps } from '../skills/engine';
import type { SkillStatus } from '../skills/engine';
import { getRouteRequirement, getRouteTarget, getVocationalProgram } from '../route/engine';
import type { StudentProfile } from '../route/types';
import { DIAGNOSTIC_ITEMS } from './items';
import type { DiagnosticAttempt, DiagnosticData, DiagnosticItem, ProfileStatus, SkillProfileEntry, SubjectProfile } from './types';
import { EMPTY_DIAGNOSTIC, PROFILE_STATUS_LABEL } from './types';

export const SUBJECT_ORDER: CurriculumSubjectId[] = ['math', 'physics', 'programming'];
export const SUBJECT_LABEL: Record<CurriculumSubjectId, string> = { math: 'คณิตศาสตร์', physics: 'ฟิสิกส์', programming: 'Programming' };
export const SUBJECT_EMOJI: Record<CurriculumSubjectId, string> = { math: '🧮', physics: '⚛️', programming: '💻' };

/* ── Data hygiene (old saves, imports) ─────────────────────────────────── */

const isSubject = (s: unknown): s is CurriculumSubjectId => s === 'math' || s === 'physics' || s === 'programming';

export function sanitizeDiagnosticData(raw: unknown): DiagnosticData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DIAGNOSTIC, attempts: [], skippedSubjects: [] };
  const r = raw as Partial<DiagnosticData>;
  const known = new Set(DIAGNOSTIC_ITEMS.map((i) => i.id));
  const attempts = (Array.isArray(r.attempts) ? r.attempts : [])
    .filter((a): a is DiagnosticAttempt => !!a && typeof a === 'object' && typeof a.id === 'string' && isSubject(a.subjectId) && typeof a.takenAt === 'string' && !!a.answers && typeof a.answers === 'object')
    .map((a) => ({
      id: a.id,
      subjectId: a.subjectId,
      takenAt: a.takenAt,
      answers: Object.fromEntries(Object.entries(a.answers).filter(([k, v]) => known.has(k) && (v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0)))),
    }));
  const skippedSubjects = [...new Set((Array.isArray(r.skippedSubjects) ? r.skippedSubjects : []).filter(isSubject))];
  return { attempts, skippedSubjects };
}

export const hasDiagnosticData = (d?: DiagnosticData | null) => !!d && (d.attempts.length > 0 || d.skippedSubjects.length > 0);

/* ── Scoring (deterministic) ───────────────────────────────────────────── */

export interface SkillScore {
  skillId: string;
  correct: number;
  answered: number;
  total: number;
  status: ProfileStatus;
}

/**
 * Per-skill status from answers:
 *   no answer → ยังไม่ได้วัด · all right on ≥2 items → พร้อม ·
 *   all right on 1 item → กำลังพัฒนา (one item is not enough evidence for "ready") ·
 *   at least half right → กำลังพัฒนา · otherwise → ต้องทบทวน.
 * "ไม่แน่ใจ" (null) is not counted as wrong — it simply measures nothing.
 */
export function scoreSkill(items: DiagnosticItem[], answers: Record<string, number | null>): Omit<SkillScore, 'skillId'> {
  const answeredItems = items.filter((i) => typeof answers[i.id] === 'number');
  const correct = answeredItems.filter((i) => answers[i.id] === i.correctIndex).length;
  const answered = answeredItems.length;
  const status: ProfileStatus =
    answered === 0 ? 'not-assessed' : correct === answered && answered >= 2 ? 'ready' : correct * 2 >= answered && correct > 0 ? 'developing' : 'needs-review';
  return { correct, answered, total: items.length, status };
}

export function scoreAttempt(attempt: Pick<DiagnosticAttempt, 'subjectId' | 'answers'>): SkillScore[] {
  const items = DIAGNOSTIC_ITEMS.filter((i) => i.subjectId === attempt.subjectId);
  const skillIds = [...new Set(items.map((i) => i.skillId))];
  return skillIds.map((skillId) => ({ skillId, ...scoreSkill(items.filter((i) => i.skillId === skillId), attempt.answers) }));
}

export function latestAttempt(data: DiagnosticData | null | undefined, subjectId: CurriculumSubjectId): DiagnosticAttempt | undefined {
  return [...(data?.attempts ?? [])].filter((a) => a.subjectId === subjectId).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
}

/* ── Skill profile: diagnostic + learning evidence (newest wins) ───────── */

/** Real evidence: an answered check/quiz, an answered review, or a completion (incl. legacy completions). */
export function hasLearningEvidence(r?: LearningRecord): boolean {
  if (!r) return false;
  return r.quizLatestScore !== undefined || r.quizBestScore !== undefined || r.reviewCount > 0 || !!r.lastReviewOutcome || !!r.confusedSkillIds?.length || r.completionStatus === 'COMPLETED';
}

const FROM_LEARNING: Record<SkillStatus, ProfileStatus | null> = {
  ready: 'ready',
  developing: 'developing',
  'needs-review': 'needs-review',
  'not-learned': null,
};

export interface ProfileParams {
  storeLessons: Lesson[];
  records: LearningRecord[];
  diagnostic?: DiagnosticData | null;
  referenceDate?: Date;
}

/**
 * One status per existing curriculum skill.
 * Learning evidence (understanding check → quiz score, mastery, review due,
 * confused skills — via the existing skill engine) and diagnostic evidence are
 * compared by date; the newer one wins. Opening/reading a lesson is not evidence.
 */
export function computeSkillProfile(params: ProfileParams): SkillProfileEntry[] {
  const { storeLessons, records, diagnostic, referenceDate = new Date() } = params;
  const gaps = getSkillGaps({ storeLessons, records, referenceDate });
  const recordById = new Map(records.map((r) => [r.lessonId, r]));
  const diagBySubject = new Map(SUBJECT_ORDER.map((s) => [s, latestAttempt(diagnostic, s)]));
  const scoreBySkill = new Map<string, { s: SkillScore; at: string }>();
  for (const [, a] of diagBySubject) if (a) for (const s of scoreAttempt(a)) scoreBySkill.set(s.skillId, { s, at: a.takenAt });

  return CURRICULUM.skills.map((skill) => {
    const gap = gaps.find((g) => g.skill.id === skill.id);
    // Phase 61: learning status counts only when there is real evidence (check/quiz, review answer,
    // or a completion) — starting or opening a lesson (IN PROGRESS) proves nothing
    const evidence = gap?.studyLessonIds.some((id) => hasLearningEvidence(recordById.get(id)));
    const learned = gap && evidence ? FROM_LEARNING[gap.status] : null;
    const learnedAt = gap?.studyLessonIds.map((id) => recordById.get(id)?.lastStudiedAt).filter((x): x is string => !!x).sort().pop();
    const d = scoreBySkill.get(skill.id);
    const diag = d && d.s.status !== 'not-assessed' ? d : undefined;
    const base = { skillId: skill.id, subjectId: skill.subjectId, title: skill.title };
    const fromDiag: SkillProfileEntry = { ...base, status: diag?.s.status ?? 'not-assessed', source: 'diagnostic', at: diag?.at, correct: diag?.s.correct, answered: diag?.s.answered };
    if (learned && (!diag || (learnedAt && learnedAt >= diag.at))) return { ...base, status: learned, source: 'learning', at: learnedAt };
    if (diag) return fromDiag;
    return { ...base, status: 'not-assessed', source: 'none' };
  });
}

/** Overall status of a subject in plain words (no single % score). */
function subjectStatus(counts: Record<ProfileStatus, number>, total: number): ProfileStatus {
  if (counts['not-assessed'] === total) return 'not-assessed';
  if (counts['needs-review'] > 0) return 'needs-review';
  if (counts.ready === total) return 'ready';
  return 'developing';
}

export function getSubjectProfiles(params: ProfileParams): SubjectProfile[] {
  const entries = computeSkillProfile(params);
  return SUBJECT_ORDER.map((subjectId) => {
    const skills = entries.filter((e) => e.subjectId === subjectId);
    const counts: Record<ProfileStatus, number> = { ready: 0, developing: 0, 'needs-review': 0, 'not-assessed': 0 };
    skills.forEach((s) => counts[s.status]++);
    return {
      subjectId,
      title: SUBJECT_LABEL[subjectId],
      skills,
      counts,
      status: subjectStatus(counts, skills.length),
      lastDiagnosticAt: latestAttempt(params.diagnostic, subjectId)?.takenAt,
      skipped: !!params.diagnostic?.skippedSubjects.includes(subjectId),
    };
  });
}

/** "2 พร้อม · 1 กำลังพัฒนา · 2 ยังไม่ได้วัด" — counts only, empty parts left out. */
export function describeCounts(p: SubjectProfile): string {
  return (['ready', 'developing', 'needs-review', 'not-assessed'] as ProfileStatus[])
    .filter((s) => p.counts[s] > 0)
    .map((s) => `${p.counts[s]} ${PROFILE_STATUS_LABEL[s]}`)
    .join(' · ');
}

/* ── Curriculum map: subject → topic → lesson → skill → dependencies ──── */

export interface MapLesson {
  lesson: CurriculumLesson;
  skills: { id: string; title: string }[];
  /** What should be learned before this */
  prerequisites: CurriculumLesson[];
  /** What this lesson prepares the learner for */
  unlocks: CurriculumLesson[];
}

export function getCurriculumMap() {
  const ordered = getOrderedCurriculumLessons(CURRICULUM);
  return SUBJECT_ORDER.map((subjectId) => {
    const subject = CURRICULUM.subjects.find((s) => s.id === subjectId)!;
    return {
      subjectId,
      title: subject.title,
      topics: subject.topicIds.map((tid) => {
        const topic = CURRICULUM.topics.find((t) => t.id === tid)!;
        return {
          topic,
          lessons: topic.lessonIds.map((lid): MapLesson => {
            const lesson = CURRICULUM.lessons.find((l) => l.id === lid)!;
            return {
              lesson,
              skills: lesson.skillIds.map((id) => ({ id, title: CURRICULUM.skills.find((s) => s.id === id)?.title ?? id })),
              prerequisites: lesson.prerequisites.map((p) => CURRICULUM.lessons.find((l) => l.id === p)).filter((l): l is CurriculumLesson => !!l),
              unlocks: ordered.filter((l) => l.prerequisites.includes(lid)),
            };
          }),
        };
      }),
    };
  });
}

/** Every lesson that (transitively) needs this one — how foundational it is. */
function downstream(lessonId: string, seen = new Set<string>()): Set<string> {
  for (const l of CURRICULUM.lessons) if (l.prerequisites.includes(lessonId) && !seen.has(l.id)) { seen.add(l.id); downstream(l.id, seen); }
  return seen;
}

/* ── Gap engine + cross-subject recommendation ─────────────────────────── */

export interface PathwayParams extends ProfileParams {
  profile?: Partial<StudentProfile> | null;
  /** Today's minutes (defaults to the profile) */
  budget?: number;
  /** Restrict to one subject (manual "เลือกวิชาเอง" → V2U picks inside it) */
  subjectId?: CurriculumSubjectId;
}

export type LessonGapState = 'known' | 'gap' | 'blocked';

export interface LessonGap {
  lesson: CurriculumLesson;
  state: LessonGapState;
  /** Skills of this lesson that are not ready, with their status */
  missingSkills: SkillProfileEntry[];
  /** Prerequisites not yet known (blocked lessons) */
  missingPrerequisites: CurriculumLesson[];
}

export interface PathwayRecommendation {
  lesson: CurriculumLesson;
  subjectId: CurriculumSubjectId;
  minutes: number;
  reasons: string[];
  /** For the "เปลี่ยนสิ่งที่แนะนำ" choice: best candidates in other subjects */
  alternatives: { lesson: CurriculumLesson; reason: string }[];
  /** The subject has no evidence at all → offer the subject diagnostic too */
  suggestDiagnostic: boolean;
}

/** Subjects the target needs (from the existing route data); all three when no target is set. */
export function targetSubjects(profile?: Partial<StudentProfile> | null): CurriculumSubjectId[] {
  const target = profile?.targetId ? getRouteTarget(profile.targetId) : undefined;
  if (!target) return SUBJECT_ORDER;
  const subs = target.requirementIds.map((id) => getRouteRequirement(id)?.subjectId).filter(isSubject);
  return SUBJECT_ORDER.filter((s) => subs.includes(s));
}

export function computeLessonGaps(params: PathwayParams): { gaps: LessonGap[]; profile: SkillProfileEntry[] } {
  const profile = computeSkillProfile(params);
  const bySkill = new Map(profile.map((p) => [p.skillId, p]));
  const subjects = params.subjectId ? [params.subjectId] : targetSubjects(params.profile);
  // Phase 61: completed but a skill needs review (failed/weak evidence) → still a gap
  const known = (l: CurriculumLesson) =>
    (isCurriculumLessonCompleted(l, params.storeLessons) && !l.skillIds.some((s) => bySkill.get(s)?.status === 'needs-review')) ||
    l.skillIds.every((s) => bySkill.get(s)?.status === 'ready');
  const gaps = getOrderedCurriculumLessons(CURRICULUM)
    .filter((l) => subjects.includes(l.subjectId))
    .map((lesson): LessonGap => {
      if (known(lesson)) return { lesson, state: 'known', missingSkills: [], missingPrerequisites: [] };
      const missingPrerequisites = lesson.prerequisites.map((p) => CURRICULUM.lessons.find((l) => l.id === p)!).filter((p) => p && !known(p));
      const missingSkills = lesson.skillIds.map((s) => bySkill.get(s)!).filter((p) => p && p.status !== 'ready');
      return { lesson, state: missingPrerequisites.length > 0 ? 'blocked' : 'gap', missingSkills, missingPrerequisites };
    });
  return { gaps, profile };
}

/**
 * The next useful lesson ACROSS subjects. Ordered, explainable preferences:
 *   1. a lesson whose skill is known to need review (from a check or the diagnostic)
 *   2. the subject the learner knows least about (no evidence / fewest ready skills);
 *      on a tie, a subject the vocational program already practises goes later
 *   3. the most foundational lesson (unlocks the most later lessons)
 *   4. curriculum order
 * Only lessons whose prerequisites are already known are candidates, so the
 * engine never jumps ahead of real dependencies. Never "next item in the array".
 */
export function recommendPathway(params: PathwayParams): PathwayRecommendation | null {
  const { gaps, profile } = computeLessonGaps(params);
  const candidates = gaps.filter((g) => g.state === 'gap');
  if (candidates.length === 0) return null;
  const order = getOrderedCurriculumLessons(CURRICULUM).map((l) => l.id);
  const coverage = (s: CurriculumSubjectId) => {
    const sk = profile.filter((p) => p.subjectId === s);
    return sk.filter((p) => p.status === 'ready' || p.status === 'developing').length / Math.max(1, sk.length);
  };
  const assessed = (s: CurriculumSubjectId) => profile.some((p) => p.subjectId === s && p.status !== 'not-assessed');
  // Tiebreak only: the vocational program already practises these subjects (existing route data)
  const strengths = getVocationalProgram(params.profile?.programId ?? 'other').strengths;
  const key = (g: LessonGap) => [
    g.missingSkills.some((s) => s.status === 'needs-review') ? 0 : 1,
    coverage(g.lesson.subjectId),
    strengths.includes(g.lesson.subjectId) ? 1 : 0,
    -downstream(g.lesson.id).size,
    order.indexOf(g.lesson.id),
  ];
  const ranked = [...candidates].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
  const pick = ranked[0];
  const budget = params.budget ?? params.profile?.availableMinutes ?? 30;
  const target = params.profile?.targetId ? getRouteTarget(params.profile.targetId) : undefined;

  const reasonFor = (g: LessonGap): string[] => {
    const r: string[] = [];
    const s = g.lesson.subjectId;
    const review = g.missingSkills.filter((m) => m.status === 'needs-review');
    if (review.length > 0) r.push(`${review.map((m) => m.title).join(', ')} ยังต้องทบทวน (จาก${review[0].source === 'diagnostic' ? 'การวัดระดับ' : 'การเช็กความเข้าใจ'})`);
    else if (!assessed(s)) r.push(`พื้นฐาน${SUBJECT_LABEL[s]}ของคุณยังไม่ได้วัดและยังไม่มีข้อมูลเพียงพอ`);
    else if (g.missingSkills.some((m) => m.status === 'developing')) r.push(`${g.missingSkills.filter((m) => m.status === 'developing').map((m) => m.title).join(', ')} กำลังพัฒนา ต่อให้แน่นจะคุ้มที่สุด`);
    else r.push(`${SUBJECT_LABEL[s]}เป็นวิชาที่คุณยังมีส่วนที่ขาดมากที่สุดตอนนี้`);
    const dep = CURRICULUM.lessons.find((l) => l.prerequisites.includes(g.lesson.id));
    if (dep) r.push(`เป็นพื้นฐานของบท “${dep.title}”`);
    if (target) r.push(`จำเป็นต่อเส้นทาง${target.title}`);
    return r;
  };

  const reasons = reasonFor(pick);
  if (pick.lesson.estimatedMinutes > budget) reasons.push(`บทนี้ใช้ประมาณ ${pick.lesson.estimatedMinutes} นาที วันนี้เรียนได้ ${budget} นาที — แบ่งเรียนได้ ความคืบหน้าไม่หาย`);
  const alternatives = SUBJECT_ORDER.filter((s) => s !== pick.lesson.subjectId)
    .map((s) => ranked.find((g) => g.lesson.subjectId === s))
    .filter((g): g is LessonGap => !!g)
    .map((g) => ({ lesson: g.lesson, reason: reasonFor(g)[0] }));
  return {
    lesson: pick.lesson,
    subjectId: pick.lesson.subjectId,
    minutes: Math.min(budget, pick.lesson.estimatedMinutes),
    reasons,
    alternatives,
    suggestDiagnostic: !assessed(pick.lesson.subjectId),
  };
}

/** The store lesson behind a curriculum lesson (for the existing study/mastery flow). */
export const studyLessonFor = (l: CurriculumLesson, storeLessons: Lesson[]) => findStudyLesson(l, storeLessons);

/** Subject-level progress for the route view: share of the subject's skills per status. */
export function subjectProgress(p: SubjectProfile) {
  const total = p.skills.length || 1;
  return { ready: p.counts.ready / total, developing: p.counts.developing / total, review: p.counts['needs-review'] / total, unknown: p.counts['not-assessed'] / total };
}

/* ── Phase 61: what one piece of evidence changed ─────────────────────── */

export interface SkillChange {
  skillId: string;
  title: string;
  subjectId: CurriculumSubjectId;
  before: ProfileStatus;
  after: ProfileStatus;
}

/** Status of each skill before vs after (only the skills given, in that order). */
export function diffSkillProfiles(before: SkillProfileEntry[], after: SkillProfileEntry[], skillIds: string[]): SkillChange[] {
  return skillIds
    .map((id) => {
      const a = after.find((x) => x.skillId === id);
      const b = before.find((x) => x.skillId === id);
      return a ? { skillId: id, title: a.title, subjectId: a.subjectId, before: b?.status ?? 'not-assessed', after: a.status } : null;
    })
    .filter((x): x is SkillChange => !!x);
}
