/* =========================================================================
   Content audit (Phase 59) — computed from the real data, never hand-written.
   A lesson is "พร้อมเรียน" only when every part a learner needs exists:
   A goals · B what to know first · C concept · D simple explanation ·
   E way of thinking · F worked example · G more examples · H mistakes ·
   I try-it · J practice · K understanding check · L summary · M what next
   plus code (programming) or formulas with units (physics).
   Resources/video are reported but are NOT required: reading with V2U must
   be enough to learn every ready lesson.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import type { CurriculumLesson, CurriculumSubjectId } from '../curriculum/types';
import { getOriginalLesson, ORIGINAL_LESSONS } from './originals';
import { getInteractiveLesson } from '../interactive/registry';
import { getLessonVideos } from '../video/engine';

export type CriterionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'SUBJECT';

export const CRITERION_LABEL: Record<CriterionId, string> = {
  A: 'เป้าหมายการเรียน',
  B: 'สิ่งที่ต้องรู้ก่อน',
  C: 'อธิบายแนวคิด',
  D: 'อธิบายแบบง่าย',
  E: 'หลักคิด / วิธีคิด',
  F: 'ตัวอย่างทีละขั้น',
  G: 'ตัวอย่างเพิ่มเติม',
  H: 'จุดที่มักผิด',
  I: 'ลองทำ',
  J: 'แบบฝึก',
  K: 'เช็กความเข้าใจ',
  L: 'สรุป',
  M: 'สิ่งที่ต้องเรียนต่อ',
  SUBJECT: 'ส่วนเฉพาะวิชา (โค้ด / สูตรและหน่วย)',
};

export type LessonContentStatus = 'ready' | 'needs-content';

export interface LessonAudit {
  lessonId: string;
  title: string;
  subjectId: CurriculumSubjectId;
  topicId: string;
  status: LessonContentStatus;
  missing: CriterionId[];
  practiceCount: number;
  checkCount: number;
  exampleCount: number;
  hasOriginal: boolean;
  /** Reading with V2U covers all 8 reading sections */
  readingComplete: boolean;
  resources: { total: number; videos: number; playableInV2U: number; checked: number };
  nextLessonIds: string[];
}

const len = (s?: string) => (s ?? '').trim().length;

/** Text that appears in more than one lesson is generic filler, not teaching. */
function duplicatedTexts(): Set<string> {
  const seen = new Map<string, number>();
  for (const o of ORIGINAL_LESSONS) for (const t of [o.simple, o.principle, o.summary, o.what]) if (t) seen.set(t, (seen.get(t) ?? 0) + 1);
  return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
}

const nextOf = (l: CurriculumLesson) => CURRICULUM.lessons.filter((x) => x.prerequisites.includes(l.id)).map((x) => x.id);

export function auditLesson(l: CurriculumLesson, dup = duplicatedTexts()): LessonAudit {
  const o = getOriginalLesson(l.id);
  const il = getInteractiveLesson(l.id);
  const exItems = CURRICULUM.exercises.filter((e) => e.lessonId === l.id).flatMap((e) => e.items);
  const practiceCount = exItems.length + (o?.practice?.length ?? 0);
  const check = il?.finalCheck ?? [];
  const checkValid = check.filter((f) => f.choices.length >= 2 && f.correctIndex >= 0 && f.correctIndex < f.choices.length && len(f.explanation) > 0);
  const missing: CriterionId[] = [];
  const need = (ok: boolean, id: CriterionId) => !ok && missing.push(id);
  const prereqsReal = l.prerequisites.every((p) => CURRICULUM.lessons.some((x) => x.id === p));

  need(l.learningOutcomes.length >= 2, 'A');
  need(prereqsReal && len(o?.prereqNote) >= 20, 'B');
  need(len(o?.what) >= 20 && (o?.keyTerms.length ?? 0) >= 2 && !dup.has(o?.what ?? ''), 'C');
  need(len(o?.simple) >= 60 && !dup.has(o?.simple ?? ''), 'D');
  need(len(o?.principle) >= 40 && !dup.has(o?.principle ?? ''), 'E');
  need((o?.examples[0]?.steps.length ?? 0) >= 2, 'F');
  // a runnable, explained code example is a worked example too
  const exampleCount = (o?.examples.length ?? 0) + (o?.code?.length ?? 0);
  need(exampleCount >= 2, 'G');
  need((o?.mistakes.length ?? 0) >= 2, 'H');
  need((o?.tryIt.length ?? 0) >= 1, 'I');
  need(practiceCount >= 3, 'J');
  need(checkValid.length >= 3 && (o?.check.length ?? 0) >= 1, 'K');
  need(len(o?.summary) >= 40 && !dup.has(o?.summary ?? ''), 'L');
  need(len(o?.next) >= 5, 'M');
  if (l.subjectId === 'programming') {
    need(!!o?.code?.length && o.code.every((c) => len(c.code) && c.output !== undefined && len(c.does) && len(c.why) && len(c.whatIf)) && !!o.errorExample, 'SUBJECT');
  } else if (l.subjectId === 'physics') {
    need(!!o?.formulas?.length && o.formulas.every((f) => f.vars.length > 0 && f.vars.every((v) => len(v.unit) && len(v.meaning)) && len(f.relation)), 'SUBJECT');
  }

  const videos = getLessonVideos(l.id);
  const resIds = l.resourceIds;
  const readingComplete = !!o && ['C', 'D', 'E', 'F', 'H', 'I', 'K'].every((c) => !missing.includes(c as CriterionId));
  return {
    lessonId: l.id,
    title: l.title,
    subjectId: l.subjectId,
    topicId: l.topicId,
    status: missing.length === 0 ? 'ready' : 'needs-content',
    missing,
    practiceCount,
    checkCount: checkValid.length,
    exampleCount,
    hasOriginal: !!o,
    readingComplete,
    resources: { total: resIds.length, videos: videos.length, playableInV2U: videos.filter((v) => v.embeddable).length, checked: videos.filter((v) => v.checked).length },
    nextLessonIds: nextOf(l),
  };
}

export function auditCurriculum() {
  const dup = duplicatedTexts();
  const lessons = CURRICULUM.lessons.map((l) => auditLesson(l, dup));
  const subjects = (['math', 'programming', 'physics'] as CurriculumSubjectId[]).map((s) => {
    const ls = lessons.filter((l) => l.subjectId === s);
    return { subjectId: s, lessons: ls.length, complete: ls.filter((l) => l.status === 'ready').length, needsContent: ls.filter((l) => l.status !== 'ready').length };
  });
  const n = lessons.length;
  const count = (f: (l: LessonAudit) => boolean) => lessons.filter(f).length;
  return {
    lessons,
    subjects,
    totals: {
      lessons: n,
      complete: count((l) => l.status === 'ready'),
      practice: count((l) => !l.missing.includes('J')),
      check: count((l) => !l.missing.includes('K')),
      original: count((l) => l.hasOriginal),
      reading: count((l) => l.readingComplete),
      withResources: count((l) => l.resources.total > 0),
      withPlayableVideo: count((l) => l.resources.playableInV2U > 0),
      duplicatedTexts: dup.size,
    },
  };
}

const AUDIT_CACHE = new Map<string, LessonAudit>();
/** Cached per-lesson status for the UI (content is static at runtime). */
export function getLessonContentStatus(lessonId: string): LessonAudit | undefined {
  if (AUDIT_CACHE.size === 0) for (const a of auditCurriculum().lessons) AUDIT_CACHE.set(a.lessonId, a);
  return AUDIT_CACHE.get(lessonId);
}
