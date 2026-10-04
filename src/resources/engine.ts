/* =========================================================================
   V2U Resource Curation Foundation (Phase 42B) — selection & planning
   Pure functions: no React / store. Reusable by tests and a future mobile app.
   ========================================================================= */

import { getOriginalLesson } from '../content/originals';
import { parseYouTubeVideoId } from '../video/youtube';
import type { Curriculum, CurriculumLesson } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { RESOURCE_REGISTRY } from './registry';
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

/** The registry the selection functions read by default. Tests may swap in a fixture
 *  (e.g. entries marked verified) to exercise ranking and planning logic; the app never does. */
let activeRegistry: CuratedResource[] = RESOURCE_REGISTRY;
export function __setResourceRegistryForTests(r?: CuratedResource[]): void {
  activeRegistry = r ?? RESOURCE_REGISTRY;
}

/* ── Learner visibility (Phase 67) ─────────────────────────────────────
   ACTIONABLE     verified/active with a real, safe https URL — the learner can open it
   PENDING        a candidate URL exists (found by search) but it was not verified
   BROKEN         a check found the URL unusable
   METADATA_ONLY  title/publisher/locator only — nothing to open
   Only ACTIONABLE resources are ever shown to learners. The rest stay in the
   registry as research backlog (see src/resources/registryView.ts). */
export type Actionability = 'ACTIONABLE' | 'PENDING' | 'BROKEN' | 'METADATA_ONLY';

const SAFE_URL = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i;

export function classifyResource(r: CuratedResource): Actionability {
  const http = r.verification?.httpStatus;
  if (http !== undefined && (http < 200 || http >= 300)) return 'BROKEN';
  if ((r.status === 'active' || r.status === 'verified') && r.url && SAFE_URL.test(r.url)) return 'ACTIONABLE';
  if (r.candidateUrl || r.candidateVideoUrl || r.url) return 'PENDING';
  return 'METADATA_ONLY';
}

/** A learner-facing resource: not deprecated and actionable (a real link they can open). */
export function isRecommendable(r: CuratedResource): boolean {
  return r.status !== 'deprecated' && classifyResource(r) === 'ACTIONABLE';
}
const usable = isRecommendable;

/**
 * Trust tier used before relevance: active > verified > unverified.
 * Unverified entries are still offered (with their locator and a clear
 * "link not checked" label) so a lesson is never left without material,
 * but any active/verified alternative always ranks first.
 */
const STATUS_TIER: Record<CuratedResource['status'], number> = {
  active: 3,
  verified: 2,
  unverified: 1,
  deprecated: 0,
};

/** Every recommendable registry entry (Phase 51: used by search). */
export function getRecommendableResources(resources: CuratedResource[] = activeRegistry): CuratedResource[] {
  return resources.filter(isRecommendable);
}

/** Phase 52: plain-Thai link state shown wherever a resource appears. */
export function linkStateLabel(r: CuratedResource): string {
  if (r.status === 'deprecated') return 'เลิกใช้แล้ว';
  if ((r.status === 'active' || r.status === 'verified') && r.url) return `ตรวจลิงก์แล้ว ${r.verification?.checkedAt ?? ''}`.trim();
  return 'ยังไม่ได้ตรวจลิงก์';
}

/** Look up any registry entry by id, including deprecated ones (for old references). */
export function getResourceById(id: string, resources: CuratedResource[] = activeRegistry): CuratedResource | undefined {
  return resources.find((r) => r.id === id);
}

/** Follow `supersededBy` from a deprecated entry to its current replacements. */
export function resolveCurrentResources(id: string, resources: CuratedResource[] = activeRegistry): CuratedResource[] {
  const r = getResourceById(id, resources);
  if (!r) return [];
  if (isRecommendable(r)) return [r];
  return (r.supersededBy ?? []).map((x) => getResourceById(x, resources)).filter((x): x is CuratedResource => !!x && isRecommendable(x));
}

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
  return score;
}

/** All usable resources for a lesson, best first. */
export function getResourcesForLesson(
  lessonId: string,
  resources: CuratedResource[] = activeRegistry,
  curriculum: Curriculum = CURRICULUM
): CuratedResource[] {
  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return [];
  return resources
    .filter((r) => usable(r) && r.curriculumLessonIds.includes(lessonId))
    .sort(
      (a, b) =>
        STATUS_TIER[b.status] - STATUS_TIER[a.status] ||
        // Phase 51: Thai first within the same trust tier
        (b.language === 'th' ? 1 : 0) - (a.language === 'th' ? 1 : 0) ||
        scoreResourceForLesson(b, lesson) - scoreResourceForLesson(a, lesson) ||
        a.estimatedMinutes - b.estimatedMinutes
    );
}

export function getResourcesForOutcome(outcomeId: OutcomeId, resources: CuratedResource[] = activeRegistry): CuratedResource[] {
  return resources.filter((r) => usable(r) && r.coveredOutcomes.includes(outcomeId));
}

/**
 * Best resources that fit inside `minutes` together, chosen by relevance
 * (not a truncated list): greedy by score, skipping anything that would overflow.
 */
export function getBestResourcesForTime(
  lessonId: string,
  minutes: number,
  resources: CuratedResource[] = activeRegistry,
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
  resources: CuratedResource[] = activeRegistry,
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
      // Phase 51: the worked-example slot is V2U's own summary + examples (always available)
      const original = slot.kind === 'example' ? getOriginalLesson(lessonId) : undefined;
      if (original) {
        steps.push({ kind: 'example', label: 'อ่านสรุปและตัวอย่างของ V2U', minutes: slot.minutes, contentId: original.contentId, detail: `V2U: ${lesson.title} — สรุป ตัวอย่าง จุดที่มักพลาด` });
        continue;
      }
      // Phase 51: the first explanation is a clip when one exists
      const videoFirst = (xs: CuratedResource[]) => [...xs.filter((x) => x.type === 'video'), ...xs.filter((x) => x.type !== 'video')];
      const ordered = slot.kind === 'learn' ? [...videoFirst(byRole('explanation')), ...byRole('worked-example'), ...byRole('reference')] : preferred;
      const r = take(ordered);
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
        const fallback = getOriginalLesson(lessonId);
        steps.push({ kind: 'learn', label: fallback ? 'เรียนจาก V2U' : label, minutes: slot.minutes, contentId: fallback?.contentId, detail: fallback ? `บทเรียน V2U: ${lesson.title}` : `อ่านสรุปบทเรียน: ${lesson.description}` });
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
      steps.find((s) => s.kind === 'example' && s.contentId) ??
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

/** True when `a` and `b` share any 6-character run (works for Thai, which has no spaces). */
function sharesPhrase(a: string, b: string): boolean {
  const x = a.replace(/\s+/g, '');
  const y = b.replace(/\s+/g, '');
  for (let i = 0; i + 6 <= x.length; i++) if (y.includes(x.slice(i, i + 6))) return true;
  return false;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateResources(
  resources: CuratedResource[] = RESOURCE_REGISTRY,
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
    if (!['unverified', 'verified', 'active', 'deprecated'].includes(r.status)) errors.push(`${where}: invalid status`);

    if (typeof r.estimatedMinutes !== 'number' || !Number.isFinite(r.estimatedMinutes) || r.estimatedMinutes < 0) {
      errors.push(`${where}: negative or invalid duration`);
    } else if (!Number.isInteger(r.estimatedMinutes) || r.estimatedMinutes < MIN_RESOURCE_MINUTES || r.estimatedMinutes > MAX_RESOURCE_MINUTES) {
      errors.push(`${where}: estimatedMinutes out of range (${r.estimatedMinutes})`);
    }

    const checked = r.status === 'verified' || r.status === 'active';
    if (r.url !== undefined && !isValidHttpUrl(r.url)) errors.push(`${where}: invalid url`);
    if (r.status === 'unverified' && (r.url !== undefined || r.videoId !== undefined)) {
      errors.push(`${where}: unverified resources must not carry a url`);
    }
    // Phase 51: search-found links are allowed only as a labelled candidate with provenance
    if (r.candidateUrl !== undefined) {
      if (!isValidHttpUrl(r.candidateUrl)) errors.push(`${where}: invalid candidateUrl`);
      const pv = r.urlProvenance;
      if (!pv || pv.kind !== 'search-result' || !pv.query?.trim() || !ISO_DATE.test(pv.foundAt) || !pv.resultTitle?.trim()) {
        errors.push(`${where}: candidateUrl needs search provenance (query, foundAt, resultTitle)`);
      }
      if (/example\.(com|org)|sample|placeholder|localhost/i.test(r.candidateUrl)) errors.push(`${where}: placeholder candidateUrl`);
      // Phase 52: the search result must be about THIS resource, not just the site's name
      if (pv?.resultTitle && !sharesPhrase(pv.resultTitle.split(' - ')[0], r.title)) errors.push(`${where}: search result title does not match the resource`);
    }
    if (r.urlProvenance && r.candidateUrl === undefined) errors.push(`${where}: provenance without candidateUrl`);
    // Phase 57: candidate YouTube upload — real YouTube URL with a parseable id + matching provenance
    if (r.candidateVideoUrl !== undefined) {
      if (!parseYouTubeVideoId(r.candidateVideoUrl)) errors.push(`${where}: candidateVideoUrl must be a YouTube URL with a valid video id`);
      const vp = r.videoProvenance;
      if (!vp || vp.kind !== 'search-result' || !vp.query?.trim() || !ISO_DATE.test(vp.foundAt) || !vp.resultTitle?.trim()) errors.push(`${where}: candidateVideoUrl needs search provenance`);
      else if (!sharesPhrase(vp.resultTitle.replace(/^\d+_/, '').split(' (')[0], r.title)) errors.push(`${where}: video search result title does not match the resource`);
      if (r.type !== 'video') errors.push(`${where}: candidateVideoUrl only for videos`);
    }
    if (r.videoProvenance && r.candidateVideoUrl === undefined) errors.push(`${where}: videoProvenance without candidateVideoUrl`);
    if (checked) {
      if (!r.url) errors.push(`${where}: ${r.status} resources need a verified url`);
      const v = r.verification;
      if (!v || !ISO_DATE.test(v.checkedAt) || !v.method?.trim() || !v.note?.trim()) {
        errors.push(`${where}: ${r.status} resources must record what was verified`);
      }
      // Phase 52: a search result is not verification — working URL + title + coverage + legality
      if (v && !(typeof v.httpStatus === 'number' && v.httpStatus >= 200 && v.httpStatus < 300 && v.pageTitle?.trim() && v.titleMatches && v.coverageChecked && v.legalSource)) {
        errors.push(`${where}: ${r.status} needs httpStatus 2xx, pageTitle, titleMatches, coverageChecked and legalSource`);
      }
    } else if (r.status === 'unverified' && r.verification) {
      errors.push(`${where}: unverified resources must not carry a verification record`);
    }
    // Phase 67: a learner-facing YouTube clip carries inspected-content metadata
    const yt = r.youtube;
    const ytUrl = r.url ? parseYouTubeVideoId(r.url) : null;
    if (checked && r.type === 'video' && ytUrl) {
      if (!yt) errors.push(`${where}: verified YouTube video needs youtube metadata`);
      else {
        if (yt.videoId !== ytUrl) errors.push(`${where}: youtube.videoId does not match url`);
        if (!yt.actualContentInspected) errors.push(`${where}: verified YouTube video must have its content inspected`);
        if (!yt.channel?.trim() || !ISO_DATE.test(yt.checkedAt)) errors.push(`${where}: youtube needs channel and checkedAt`);
      }
    }
    if (yt) {
      if (r.type !== 'video') errors.push(`${where}: youtube metadata only for videos`);
      if (yt.summary && !yt.actualContentInspected) errors.push(`${where}: a video summary requires inspected content`);
      if (yt.chapters?.length && !yt.actualContentInspected) errors.push(`${where}: timestamps require inspected content`);
      if ((yt.postVideoQuiz?.length || yt.suitability?.length) && !yt.actualContentInspected) errors.push(`${where}: post-video quiz / suitability require inspected content`);
      const skills = new Set(curriculum.lessons.filter((l) => r.curriculumLessonIds.includes(l.id)).flatMap((l) => l.skillIds));
      for (const q of yt.postVideoQuiz ?? []) {
        if (!skills.has(q.skillId)) errors.push(`${where}: post-video question uses a skill outside the lesson (${q.skillId})`);
        if (!(q.correctIndex >= 0 && q.correctIndex < q.choices.length) || !q.explanation?.trim()) errors.push(`${where}: post-video question needs a valid answer and explanation`);
      }
      if (!checked && yt.actualContentInspected === false && yt.review.rank === 'RECOMMENDED') errors.push(`${where}: cannot recommend an uninspected video`);
    }
    if (r.videoId !== undefined && r.type !== 'video') errors.push(`${where}: videoId only allowed for video`);
    if (r.videoId !== undefined && !/^[A-Za-z0-9_-]{6,20}$/.test(r.videoId)) errors.push(`${where}: invalid videoId`);
    if (r.videoId !== undefined && !r.url) errors.push(`${where}: videoId requires a verified url`);
    if (r.supersededBy && r.status !== 'deprecated') errors.push(`${where}: only deprecated resources may be superseded`);
    for (const id of r.supersededBy ?? []) {
      const next = resources.find((x) => x.id === id);
      if (!next) errors.push(`${where}: supersededBy unknown ${id}`);
      else if (next.status === 'deprecated') errors.push(`${where}: supersededBy points to deprecated ${id}`);
    }

    if (!r.whyV2USelected?.trim()) errors.push(`${where}: missing whyV2USelected`);
    if (!r.lastChecked || !ISO_DATE.test(r.lastChecked) || Number.isNaN(Date.parse(r.lastChecked))) {
      errors.push(`${where}: missing or invalid lastChecked`);
    }
    if (typeof r.isFree !== 'boolean') errors.push(`${where}: isFree must be explicit`);

    if (r.curriculumLessonIds.length === 0) errors.push(`${where}: not linked to any lesson`);
    for (const id of r.curriculumLessonIds) {
      if (!lessonIds.has(id)) errors.push(`${where}: unknown lesson ${id}`);
      else if (!curriculum.lessons.find((l) => l.id === id)?.resourceIds.includes(r.id)) {
        errors.push(`${where}: lesson ${id} does not list this resource`);
      }
    }
    if (r.coveredOutcomes.length === 0 && r.status !== 'deprecated') errors.push(`${where}: covers no outcomes`);
    for (const o of r.coveredOutcomes) {
      if (!outcomeIds.has(o)) errors.push(`${where}: unknown outcome ${o}`);
      else if (!r.curriculumLessonIds.includes(o.split('#')[0])) errors.push(`${where}: outcome ${o} belongs to an unlinked lesson`);
    }
  }
  return errors;
}

/** Read-only access to the whole registry (content audit / registry view). */
export const allResources = (): readonly CuratedResource[] => RESOURCE_REGISTRY;
