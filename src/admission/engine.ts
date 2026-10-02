/* =========================================================================
   V2U Admission Engine (Phase 46A) — validation & deterministic evaluation
   Pure functions; registry is passed in (defaults to the shipped, empty one).
   ========================================================================= */

import type { Curriculum } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import type { RouteRequirement, StudentProfile } from '../route/types';
import { EDUCATION_LEVELS } from '../route/types';
import { ROUTE_TARGETS } from '../route/data';
import type { SkillGap, SubjectSkillGap } from '../skills/engine';
import { ADMISSION_REGISTRY } from './registry';
import type {
  AdmissionPath,
  AdmissionPathEvaluation,
  AdmissionRegistry,
  AdmissionRequirement,
  ApplicationMilestone,
  AdmissionSource,
  RequirementEvaluation,
  StudentAdmissionState,
} from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* ── Validation ───────────────────────────────────────────────────────── */

const SOURCE_TYPES = ['university-announcement', 'faculty-announcement', 'admission-page', 'tcas-official', 'exam-official'];

/** Verified sources older than this are reported as stale. */
export const SOURCE_STALE_AFTER_DAYS = 365;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateSourceRecord(src: AdmissionSource, errors: string[]) {
  const where = `source ${src.sourceId}`;
  if (!src.sourceId?.trim()) errors.push('source without sourceId');
  if (!SOURCE_TYPES.includes(src.sourceType)) errors.push(`${where}: invalid sourceType`);
  if (!src.publisher?.trim() || !src.title?.trim()) errors.push(`${where}: missing publisher/title`);
  if (src.url !== undefined && !isHttpUrl(src.url)) errors.push(`${where}: invalid url`);
  for (const [k, v] of [['publishedAt', src.publishedAt], ['updatedAt', src.updatedAt], ['checkedAt', src.checkedAt]] as const) {
    if (v !== undefined && (!ISO_DATE.test(v) || Number.isNaN(Date.parse(v)))) errors.push(`${where}: invalid ${k}`);
  }
  if (src.status === 'verified') {
    if (!src.url) errors.push(`${where}: verified source without url`);
    if (!src.checkedAt) errors.push(`${where}: verified source without verification date (checkedAt)`);
  } else if (src.status !== 'unverified') {
    errors.push(`${where}: invalid status`);
  }
}

/** True when every referenced source exists and is verified (and at least one is referenced). */
export function isBackedByVerifiedSources(sourceIds: string[], registry: AdmissionRegistry = ADMISSION_REGISTRY): boolean {
  if (sourceIds.length === 0) return false;
  return sourceIds.every((id) => registry.sources.find((s) => s.sourceId === id)?.status === 'verified');
}

/**
 * Non-blocking metadata warnings: stale verification, or a source that
 * states neither a published nor an updated date.
 */
export function getSourceWarnings(registry: AdmissionRegistry = ADMISSION_REGISTRY, now: Date = new Date()): string[] {
  const warnings: string[] = [];
  for (const src of registry.sources) {
    if (src.status === 'verified' && src.checkedAt) {
      const ageDays = (now.getTime() - Date.parse(src.checkedAt)) / 86_400_000;
      if (ageDays > SOURCE_STALE_AFTER_DAYS) warnings.push(`source ${src.sourceId}: stale (checked ${src.checkedAt})`);
    }
    if (!src.publishedAt && !src.updatedAt) warnings.push(`source ${src.sourceId}: unknown published/updated date`);
  }
  return warnings;
}

export function validateAdmissionRegistry(
  registry: AdmissionRegistry = ADMISSION_REGISTRY,
  curriculum: Curriculum = CURRICULUM
): string[] {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  for (const src of registry.sources) {
    if (sourceIds.has(src.sourceId)) errors.push(`duplicate source id: ${src.sourceId}`);
    sourceIds.add(src.sourceId);
    validateSourceRecord(src, errors);
  }
  const checkSourceRefs = (ids: string[] | undefined, where: string) => {
    if (!ids || ids.length === 0) return errors.push(`${where}: missing source`);
    ids.forEach((id) => !sourceIds.has(id) && errors.push(`${where}: unknown source ${id}`));
  };
  const seen = new Set<string>();
  const all = [...registry.exams, ...registry.universities, ...registry.faculties, ...registry.majors, ...registry.paths];
  for (const x of all) {
    if (!x.id) errors.push('record without id');
    if (seen.has(x.id)) errors.push(`duplicate id: ${x.id}`);
    seen.add(x.id);
  }

  const uni = new Set(registry.universities.map((u) => u.id));
  const fac = new Set(registry.faculties.map((f) => f.id));
  const maj = new Set(registry.majors.map((m) => m.id));
  const exams = new Set(registry.exams.map((e) => e.id));
  const subjects = new Set(curriculum.subjects.map((s) => s.id));
  const skills = new Set(curriculum.skills.map((s) => s.id));
  const targets = new Set(ROUTE_TARGETS.map((t) => t.id));

  for (const e of registry.exams) {
    if (!e.code?.trim() || !e.title?.trim()) errors.push(`exam ${e.id}: missing code/title`);
    e.subjectIds.forEach((s) => !subjects.has(s) && errors.push(`exam ${e.id}: unknown subject ${s}`));
    if (e.maxScore !== undefined && !(e.maxScore > 0)) errors.push(`exam ${e.id}: invalid maxScore`);
  }
  for (const u of registry.universities) checkSourceRefs(u.sourceIds, `university ${u.id}`);
  for (const f of registry.faculties) if (!uni.has(f.universityId)) errors.push(`faculty ${f.id}: unknown university ${f.universityId}`);
  for (const m of registry.majors) {
    if (!fac.has(m.facultyId)) errors.push(`major ${m.id}: unknown faculty ${m.facultyId}`);
    if (m.routeTargetId && !targets.has(m.routeTargetId)) errors.push(`major ${m.id}: unknown route target ${m.routeTargetId}`);
  }

  for (const p of registry.paths) {
    const where = `path ${p.id}`;
    if (!maj.has(p.majorId)) errors.push(`${where}: unknown major ${p.majorId}`);
    if (!Number.isInteger(p.round) || p.round < 1) errors.push(`${where}: invalid round`);
    if (!/^\d{4}$/.test(p.admissionYear)) errors.push(`${where}: invalid admissionYear`);
    if (p.quota !== undefined && (!Number.isInteger(p.quota) || p.quota < 0)) errors.push(`${where}: invalid quota`);
    checkSourceRefs(p.sourceIds, where);

    for (const rule of p.eligibility) {
      if (rule.kind === 'education-level' && (rule.allowed.length === 0 || rule.allowed.some((l) => !EDUCATION_LEVELS.includes(l)))) {
        errors.push(`${where}: invalid education-level rule`);
      }
      if (rule.kind === 'gpax-min' && !(rule.min > 0 && rule.min <= 4)) errors.push(`${where}: invalid gpax-min`);
    }

    let weight = 0;
    for (const r of p.requirements) {
      if (r.kind === 'subject') {
        if (!subjects.has(r.subjectId)) errors.push(`${where}: unknown subject ${r.subjectId}`);
        if (!(r.minReadinessPercent >= 0 && r.minReadinessPercent <= 100)) errors.push(`${where}: invalid minReadinessPercent`);
      } else if (r.kind === 'skill') {
        if (!skills.has(r.skillId)) errors.push(`${where}: unknown skill ${r.skillId}`);
      } else if (r.kind === 'exam') {
        if (!exams.has(r.examId)) errors.push(`${where}: unknown exam ${r.examId}`);
        if (r.weightPercent !== undefined) {
          if (!(r.weightPercent > 0 && r.weightPercent <= 100)) errors.push(`${where}: invalid weightPercent`);
          weight += r.weightPercent;
        }
        if (r.minScore !== undefined && !(r.minScore >= 0)) errors.push(`${where}: invalid minScore`);
      } else if (r.kind === 'portfolio') {
        if (r.items.length === 0) errors.push(`${where}: empty portfolio requirement`);
      } else if (r.kind === 'gpax') {
        if (!(r.min > 0 && r.min <= 4)) errors.push(`${where}: invalid gpax requirement`);
      }
    }
    if (weight > 100) errors.push(`${where}: exam weights exceed 100%`);

    const msIds = new Set<string>();
    for (const m of p.milestones) {
      if (msIds.has(m.id)) errors.push(`${where}: duplicate milestone ${m.id}`);
      msIds.add(m.id);
      if (m.dateStatus !== 'unknown' && (!m.date || !ISO_DATE.test(m.date))) errors.push(`${where}: milestone ${m.id} needs an ISO date`);
      if (m.dateStatus === 'unknown' && m.date) errors.push(`${where}: milestone ${m.id} has a date but status unknown`);
    }
  }
  return errors;
}

/* ── Student state ────────────────────────────────────────────────────── */

/** Build evaluation input from the V2U profile + Skill Gap engine output. */
export function buildStudentAdmissionState(
  profile: StudentProfile,
  subjectGaps: SubjectSkillGap[],
  skillGaps: SkillGap[],
  extra: Pick<StudentAdmissionState, 'gpax' | 'examScores' | 'completedPortfolioItems'> = {}
): StudentAdmissionState {
  return {
    educationLevel: profile.educationLevel,
    subjectReadiness: Object.fromEntries(subjectGaps.map((s) => [s.subjectId, s.readinessPercent])),
    readySkillIds: skillGaps.filter((g) => g.status === 'ready').map((g) => g.skill.id),
    ...extra,
  };
}

/* ── Evaluation ───────────────────────────────────────────────────────── */

export function checkEligibility(path: AdmissionPath, state: StudentAdmissionState): { eligible: boolean | 'unknown'; notes: string[] } {
  const notes: string[] = [];
  let unknown = false;
  let ok = true;
  for (const rule of path.eligibility) {
    if (rule.kind === 'education-level') {
      if (!rule.allowed.includes(state.educationLevel)) {
        ok = false;
        notes.push(`รอบนี้รับเฉพาะ ${rule.allowed.join(', ')}`);
      }
    } else if (rule.kind === 'gpax-min') {
      if (state.gpax === undefined) {
        unknown = true;
        notes.push(`ต้องมีเกรดเฉลี่ยอย่างน้อย ${rule.min.toFixed(2)} (ยังไม่ได้กรอกเกรด)`);
      } else if (state.gpax < rule.min) {
        ok = false;
        notes.push(`เกรดเฉลี่ยต้องไม่น้อยกว่า ${rule.min.toFixed(2)}`);
      }
    } else {
      unknown = true;
      notes.push(rule.description);
    }
  }
  return { eligible: !ok ? false : unknown ? 'unknown' : true, notes };
}

function evaluateRequirement(r: AdmissionRequirement, state: StudentAdmissionState, registry: AdmissionRegistry, curriculum: Curriculum): RequirementEvaluation {
  switch (r.kind) {
    case 'subject': {
      const have = state.subjectReadiness[r.subjectId] ?? 0;
      const title = curriculum.subjects.find((s) => s.id === r.subjectId)?.title ?? r.subjectId;
      return have >= r.minReadinessPercent
        ? { requirement: r, check: 'met', detail: `${title} พร้อม ${have}% (ต้องการ ${r.minReadinessPercent}%)` }
        : { requirement: r, check: 'gap', detail: `${title} ยังขาดอีก ${r.minReadinessPercent - have}%` };
    }
    case 'skill': {
      const title = curriculum.skills.find((s) => s.id === r.skillId)?.title ?? r.skillId;
      return state.readySkillIds.includes(r.skillId)
        ? { requirement: r, check: 'met', detail: `${title}: พร้อม` }
        : { requirement: r, check: 'gap', detail: `${title}: ยังไม่พร้อม` };
    }
    case 'exam': {
      const exam = registry.exams.find((e) => e.id === r.examId);
      const name = exam?.code ?? r.examId;
      const score = state.examScores?.[r.examId];
      if (score === undefined) return { requirement: r, check: 'unknown', detail: `${name}: ยังไม่มีคะแนน` };
      if (r.minScore !== undefined && score < r.minScore) return { requirement: r, check: 'gap', detail: `${name}: ได้ ${score} ต้องการ ${r.minScore}` };
      return { requirement: r, check: 'met', detail: `${name}: ${score}` };
    }
    case 'portfolio': {
      const done = state.completedPortfolioItems ?? [];
      const missing = r.items.filter((i) => !done.includes(i));
      if (state.completedPortfolioItems === undefined) return { requirement: r, check: 'unknown', detail: 'ยังไม่ได้บันทึกผลงาน' };
      return missing.length === 0
        ? { requirement: r, check: 'met', detail: 'Portfolio ครบแล้ว' }
        : { requirement: r, check: 'gap', detail: `Portfolio ยังขาด: ${missing.join(', ')}` };
    }
    case 'gpax':
      if (state.gpax === undefined) return { requirement: r, check: 'unknown', detail: 'ยังไม่ได้กรอกเกรดเฉลี่ย' };
      return state.gpax >= r.min
        ? { requirement: r, check: 'met', detail: `เกรดเฉลี่ย ${state.gpax.toFixed(2)}` }
        : { requirement: r, check: 'gap', detail: `เกรดเฉลี่ยต้องไม่น้อยกว่า ${r.min.toFixed(2)}` };
    default:
      return { requirement: r, check: 'unknown', detail: r.description };
  }
}

export function evaluateAdmissionPath(
  path: AdmissionPath,
  state: StudentAdmissionState,
  registry: AdmissionRegistry = ADMISSION_REGISTRY,
  curriculum: Curriculum = CURRICULUM
): AdmissionPathEvaluation {
  const { eligible, notes } = checkEligibility(path, state);
  const requirements = path.requirements.map((r) => evaluateRequirement(r, state, registry, curriculum));
  return {
    pathId: path.id,
    eligible,
    eligibilityNotes: notes,
    requirements,
    metCount: requirements.filter((r) => r.check === 'met').length,
    gapCount: requirements.filter((r) => r.check === 'gap').length,
    unknownCount: requirements.filter((r) => r.check === 'unknown').length,
    recommendable: isBackedByVerifiedSources(path.sourceIds, registry),
  };
}

/* ── Bridges ──────────────────────────────────────────────────────────── */

/** Admission paths available for a V2U route target (verified only by default). */
export function getPathsForRouteTarget(
  routeTargetId: string,
  registry: AdmissionRegistry = ADMISSION_REGISTRY,
  options: { includeUnverified?: boolean } = {}
): AdmissionPath[] {
  const majors = new Set(registry.majors.filter((m) => m.routeTargetId === routeTargetId).map((m) => m.id));
  return registry.paths
    .filter((p) => majors.has(p.majorId) && (options.includeUnverified || isBackedByVerifiedSources(p.sourceIds, registry)))
    .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
}

/**
 * Express an admission path as Route Engine requirements, so a verified
 * path can later replace the generic route stages.
 */
export function toRouteRequirements(
  path: AdmissionPath,
  registry: AdmissionRegistry = ADMISSION_REGISTRY,
  curriculum: Curriculum = CURRICULUM
): RouteRequirement[] {
  const out: RouteRequirement[] = [];
  const subjectIds: string[] = [];
  for (const r of path.requirements) {
    if (r.kind === 'subject') {
      const id = `${path.id}:subject:${r.subjectId}`;
      subjectIds.push(id);
      out.push({ id, kind: 'subject', title: curriculum.subjects.find((x) => x.id === r.subjectId)?.title ?? r.subjectId, description: `ต้องการความพร้อม ${r.minReadinessPercent}%`, subjectId: r.subjectId, dependsOn: [] });
    }
  }
  const exams = path.requirements.filter((r): r is Extract<AdmissionRequirement, { kind: 'exam' }> => r.kind === 'exam');
  if (exams.length > 0) {
    out.push({
      id: `${path.id}:exams`,
      kind: 'exam',
      title: 'ข้อสอบ / การสอบ',
      description: path.name,
      dependsOn: subjectIds,
      checklist: exams.map((e) => registry.exams.find((x) => x.id === e.examId)?.code ?? e.examId),
    });
  }
  const portfolio = path.requirements.filter((r): r is Extract<AdmissionRequirement, { kind: 'portfolio' }> => r.kind === 'portfolio');
  if (portfolio.length > 0) {
    out.push({ id: `${path.id}:portfolio`, kind: 'portfolio', title: 'Portfolio', description: path.name, dependsOn: [], checklist: portfolio.flatMap((p) => p.items) });
  }
  out.push({
    id: `${path.id}:application`,
    kind: 'application',
    title: 'การสมัครมหาวิทยาลัย',
    description: path.name,
    dependsOn: out.filter((x) => x.kind !== 'subject').map((x) => x.id),
    checklist: path.milestones.map((m) => m.title),
  });
  return out;
}

/** Milestones with a known date on/after `from`, soonest first. */
export function getUpcomingMilestones(
  paths: AdmissionPath[],
  from: Date
): { pathId: string; milestone: ApplicationMilestone }[] {
  const day = from.toISOString().slice(0, 10);
  return paths
    .flatMap((p) => p.milestones.filter((m) => m.date && m.date >= day).map((milestone) => ({ pathId: p.id, milestone })))
    .sort((a, b) => (a.milestone.date ?? '').localeCompare(b.milestone.date ?? '') || a.pathId.localeCompare(b.pathId));
}
