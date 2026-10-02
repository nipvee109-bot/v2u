/* =========================================================================
   V2U Resource Curation Foundation (Phase 42B) — selection & planning
   Pure functions: no React / store. Reusable by tests and a future mobile app.
   ========================================================================= */

import type { Curriculum, CurriculumLesson } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { CURATED_RESOURCES } from './data';
import type {
  CuratedResource,
  CuratedResourceType,
  LearningPlan,
  LearningPlanStep,
  OutcomeId,
  ResourceRole,
  TimeBudgetMinutes,
} from './types';
import { TIME_BUDGETS } from './types';

export const MIN_RESOURCE_MINUTES = 5;
export const MAX_RESOURCE_MINUTES = 600;

const RESOURCE_TYPES: CuratedResourceType[] = ['video', 'article', 'documentation', 'book', 'pdf', 'course'];
const RESOURCE_ROLES: ResourceRole[] = ['explanation', 'worked-example', 'reference'];

export const TYPE_LABEL: Record<CuratedResourceType, string> = {
  video: 'วิดีโอ',
  article: 'บทความ',
  documentation: 'เอกสารทางการ',
  book: 'หนังสือ',
  pdf: 'PDF',
  course: 'คอร์สออนไลน์',
};

/* ── Outcomes ─────────────────────────────────────────────────────────── */

export function getOutcomeId(lessonId: string, index: number): OutcomeId {
  return `${lessonId}#o${index + 1}`;
}

export function getAllOutcomeIds(curriculum: Curriculum = CURRICULUM): Set<OutcomeId> {
  return new Set(curriculum.lessons.flatMap((l) => l.learningOutcomes.map((_, i) => getOutcomeId(l.id, i))));
}

export function getOutcomeText(outcomeId: OutcomeId, curriculum: Curriculum = CURRICULUM): string | undefined {
  const [lessonId, idx] = outcomeId.split('#o');
  return curriculum.lessons.find((l) => l.id === lessonId)?.learningOutcomes[Number(idx) - 1];
}

/* ── Selection ────────────────────────────────────────────────────────── */

const usable = (r: CuratedResource) => r.status !== 'retired';

/**
 * Relevance / quality score for a resource within one lesson.
 * Outcome coverage dominates; then beginner-fit for foundation lessons,
 * free access, and Thai language as tie-breakers.
 */
export function scoreResourceForLesson(r: CuratedResource, lesson: CurriculumLesson): number {
  const covered = r.coveredOutcomes.filter((o) => o.startsWith(`${lesson.id}#`)).length;
  let score = covered * 10;
  if (lesson.level === 'foundation' && r.level === 'beginner') score += 5;
  if (lesson.level !== 'foundation' && r.level !== 'beginner') score += 2;
  if (r.isFree) score += 3;
  if (r.language === 'th') score += 2;
  if (r.status === 'active') score += 1;
  return score;
}

/** All usable resources for a lesson, best first. */
export function getResourcesForLesson(
  lessonId: string,
  resources: CuratedResource[] = CURATED_RESOURCES,
  curriculum: Curriculum = CURRICULUM
): CuratedResource[] {
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return [];
  return resources
    .filter((r) => usable(r) && r.curriculumLessonIds.includes(lessonId))
    .sort((a, b) => scoreResourceForLesson(b, lesson) - scoreResourceForLesson(a, lesson) || a.estimatedMinutes - b.estimatedMinutes);
}

export function getResourcesForOutcome(outcomeId: OutcomeId, resources: CuratedResource[] = CURATED_RESOURCES): CuratedResource[] {
  return resources.filter((r) => usable(r) && r.coveredOutcomes.includes(outcomeId));
}

/**
 * Best resources that fit inside `minutes` together, chosen by relevance
 * (not a truncated list): greedy by score, skipping anything that would overflow.
 */
export function getBestResourcesForTime(
  lessonId: string,
  minutes: number,
  resources: CuratedResource[] = CURATED_RESOURCES,
  curriculum: Curriculum = CURRICULUM
): CuratedResource[] {
  const picked: CuratedResource[] = [];
  let used = 0;
  for (const r of getResourcesForLesson(lessonId, resources, curriculum)) {
    if (used + r.estimatedMinutes <= minutes) {
      picked.push(r);
      used += r.estimatedMinutes;
    }
  }
  return picked;
}

/* ── Time-based learning plan ─────────────────────────────────────────── */

type SlotKind = LearningPlanStep['kind'];

/** Minute allocation per budget. Sums to the budget exactly. */
const PLAN_TEMPLATES: Record<TimeBudgetMinutes, { kind: SlotKind; minutes: number }[]> = {
  15: [
    { kind: 'learn', minutes: 10 },
    { kind: 'check', minutes: 5 },
  ],
  30: [
    { kind: 'learn', minutes: 18 },
    { kind: 'example', minutes: 7 },
    { kind: 'check', minutes: 5 },
  ],
  60: [
    { kind: 'learn', minutes: 25 },
    { kind: 'example', minutes: 15 },
    { kind: 'practice', minutes: 15 },
    { kind: 'recap', minutes: 5 },
  ],
  120: [
    { kind: 'learn', minutes: 30 },
    { kind: 'example', minutes: 25 },
    { kind: 'deepen', minutes: 25 },
    { kind: 'practice', minutes: 20 },
    { kind: 'check', minutes: 10 },
    { kind: 'recap', minutes: 10 },
  ],
};

const STEP_LABEL: Record<SlotKind, string> = {
  learn: 'ดูบทเรียน',
  example: 'ทำความเข้าใจตัวอย่าง',
  deepen: 'อ่านเพิ่มให้ลึกขึ้น',
  practice: 'ฝึกทำโจทย์',
  check: 'เช็กความเข้าใจ',
  recap: 'ทบทวนสั้น ๆ',
};

export function isTimeBudget(n: number): n is TimeBudgetMinutes {
  return TIME_BUDGETS.some((b) => b.minutes === n);
}

/**
 * Build a coherent learning sequence for one curriculum lesson and time budget:
 *   15  → explanation → check
 *   30  → explanation → worked example → check
 *   60  → explanation → worked example → practice → recap
 *   120 → explanation → worked example → deeper reading → practice → check → recap
 * A long resource is used partially rather than dropped; unused minutes from a
 * short resource roll into practice/check so the plan fills the budget.
 */
export function buildLearningPlan(
  lessonId: string,
  budgetMinutes: TimeBudgetMinutes,
  resources: CuratedResource[] = CURATED_RESOURCES,
  curriculum: Curriculum = CURRICULUM
): LearningPlan | null {
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson || !isTimeBudget(budgetMinutes)) return null;

  const ranked = getResourcesForLesson(lessonId, resources, curriculum);
  const byRole = (role: ResourceRole) => ranked.filter((r) => r.role === role);
  const used = new Set<string>();
  const take = (list: CuratedResource[]) => {
    const r = list.find((x) => !used.has(x.id));
    if (r) used.add(r.id);
    return r;
  };

  const exerciseId = lesson.exerciseIds[0];
  const quizId = lesson.quizIds[0];
  const outcomes = lesson.learningOutcomes;

  const steps: LearningPlanStep[] = [];
  let slack = 0;

  for (const slot of PLAN_TEMPLATES[budgetMinutes]) {
    const label = STEP_LABEL[slot.kind];
    if (slot.kind === 'learn' || slot.kind === 'example' || slot.kind === 'deepen') {
      const preferred =
        slot.kind === 'learn'
          ? [...byRole('explanation'), ...byRole('worked-example'), ...byRole('reference')]
          : slot.kind === 'example'
            ? [...byRole('worked-example'), ...byRole('explanation'), ...byRole('reference')]
            : [...byRole('reference'), ...byRole('worked-example'), ...byRole('explanation')];
      const r = take(preferred);
      if (r) {
        const minutes = Math.min(r.estimatedMinutes, slot.minutes);
        slack += slot.minutes - minutes;
        const partial = r.estimatedMinutes > slot.minutes;
        steps.push({
          kind: slot.kind,
          label,
          minutes,
          resourceId: r.id,
          partial,
          detail: partial ? `${r.title} (ช่วงที่ตรงกับบทนี้)` : r.title,
        });
      } else if (slot.kind === 'example' && exerciseId) {
        // No curated example left → walk through V2U's own exercise answers
        steps.push({ kind: 'example', label, minutes: slot.minutes, exerciseId, detail: 'ดูวิธีทำจากแบบฝึกของ V2U' });
      } else if (slot.kind === 'learn') {
        steps.push({ kind: 'learn', label, minutes: slot.minutes, detail: `อ่านสรุปบทเรียน: ${lesson.description}` });
      } else {
        slack += slot.minutes; // nothing to deepen with → give time to practice
      }
    } else if (slot.kind === 'practice') {
      if (exerciseId) steps.push({ kind: 'practice', label, minutes: slot.minutes, exerciseId, detail: 'แบบฝึกของบทนี้' });
      else slack += slot.minutes;
    } else if (slot.kind === 'check') {
      if (quizId) steps.push({ kind: 'check', label, minutes: slot.minutes, quizId, detail: 'แบบทดสอบสั้นของบทนี้' });
      else slack += slot.minutes;
    } else {
      steps.push({ kind: 'recap', label, minutes: slot.minutes, detail: `ทบทวน: ${outcomes.join(' · ')}` });
    }
  }

  // Roll unused minutes into the most useful active step
  if (slack > 0) {
    const target =
      steps.find((s) => s.kind === 'practice') ??
      steps.find((s) => s.kind === 'check') ??
      steps.find((s) => s.kind === 'example' && !s.resourceId) ??
      steps[steps.length - 1];
    if (target) target.minutes += slack;
  }

  return {
    curriculumLessonId: lessonId,
    budgetMinutes,
    totalMinutes: steps.reduce((sum, s) => sum + s.minutes, 0),
    steps,
  };
}

/* ── Validation ───────────────────────────────────────────────────────── */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateResources(
  resources: CuratedResource[] = CURATED_RESOURCES,
  curriculum: Curriculum = CURRICULUM
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lessonIds = new Set(curriculum.lessons.map((l) => l.id));
  const outcomeIds = getAllOutcomeIds(curriculum);

  for (const r of resources) {
    const where = `resource ${r.id}`;
    if (!r.id) errors.push('resource without id');
    if (seen.has(r.id)) errors.push(`duplicate resource id: ${r.id}`);
    seen.add(r.id);

    if (!r.title?.trim()) errors.push(`${where}: missing title`);
    if (!r.provider?.trim()) errors.push(`${where}: missing provider`);
    if (!r.locator?.trim() && !r.url) errors.push(`${where}: needs a url or a locator`);
    if (!RESOURCE_TYPES.includes(r.type)) errors.push(`${where}: invalid type ${r.type}`);
    if (!RESOURCE_ROLES.includes(r.role)) errors.push(`${where}: invalid role ${r.role}`);
    if (!['beginner', 'intermediate', 'advanced'].includes(r.level)) errors.push(`${where}: invalid level`);
    if (!['th', 'en'].includes(r.language)) errors.push(`${where}: invalid language`);
    if (!['active', 'unverified-link', 'retired'].includes(r.status)) errors.push(`${where}: invalid status`);

    if (typeof r.estimatedMinutes !== 'number' || !Number.isFinite(r.estimatedMinutes) || r.estimatedMinutes < 0) {
      errors.push(`${where}: negative or invalid duration`);
    } else if (!Number.isInteger(r.estimatedMinutes) || r.estimatedMinutes < MIN_RESOURCE_MINUTES || r.estimatedMinutes > MAX_RESOURCE_MINUTES) {
      errors.push(`${where}: estimatedMinutes out of range (${r.estimatedMinutes})`);
    }

    if (r.url !== undefined && !isValidHttpUrl(r.url)) errors.push(`${where}: invalid url`);
    if (r.status === 'active' && !r.url) errors.push(`${where}: active resources need a verified url`);
    if (r.status === 'unverified-link' && r.url) errors.push(`${where}: unverified resources must not carry a url`);
    if (r.videoId !== undefined && r.type !== 'video') errors.push(`${where}: videoId only allowed for video`);
    if (r.videoId !== undefined && !/^[A-Za-z0-9_-]{6,20}$/.test(r.videoId)) errors.push(`${where}: invalid videoId`);

    if (!r.whyV2USelected?.trim()) errors.push(`${where}: missing whyV2USelected`);
    if (!r.lastChecked || !ISO_DATE.test(r.lastChecked) || Number.isNaN(Date.parse(r.lastChecked))) {
      errors.push(`${where}: missing or invalid lastChecked`);
    }
    if (typeof r.isFree !== 'boolean') errors.push(`${where}: isFree must be explicit`);

    if (r.curriculumLessonIds.length === 0) errors.push(`${where}: not linked to any lesson`);
    for (const id of r.curriculumLessonIds) if (!lessonIds.has(id)) errors.push(`${where}: unknown lesson ${id}`);
    if (r.coveredOutcomes.length === 0) errors.push(`${where}: covers no outcomes`);
    for (const o of r.coveredOutcomes) {
      if (!outcomeIds.has(o)) errors.push(`${where}: unknown outcome ${o}`);
      else if (!r.curriculumLessonIds.includes(o.split('#')[0])) errors.push(`${where}: outcome ${o} belongs to an unlinked lesson`);
    }
  }
  return errors;
}
