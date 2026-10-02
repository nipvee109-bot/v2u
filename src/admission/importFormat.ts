/* =========================================================================
   V2U Admission Import Format (Phase 46B) — provider-neutral bundle
   -------------------------------------------------------------------------
   A flat, relational JSON shape. Each array is one future table; nested
   lists (eligibility, requirements, milestones) become child rows keyed by
   pathId, so the bundle maps directly to Postgres (e.g. Supabase) later:

     admission_sources        (source_id PK)
     universities             (id PK)          ← university_sources(university_id, source_id)
     faculties                (id PK, university_id FK)
     majors                   (id PK, faculty_id FK, route_target_id)
     exams                    (id PK)          ← exam_subjects(exam_id, subject_id)
     admission_paths          (id PK, major_id FK) ← admission_path_sources(path_id, source_id)
     admission_eligibility    (path_id FK, position)
     admission_requirements   (path_id FK, position)
     admission_milestones     (id, path_id FK)

   No backend SDK here — parsing, conversion and validation are pure.
   ========================================================================= */

import type { EducationLevel } from '../route/types';
import type { CurriculumSubjectId } from '../curriculum/types';
import { validateAdmissionRegistry, getSourceWarnings } from './engine';
import type {
  AdmissionPath,
  AdmissionRegistry,
  AdmissionRequirement,
  AdmissionSource,
  ApplicationMilestone,
  EligibilityRule,
  Exam,
  Faculty,
  Major,
  University,
} from './types';

export const ADMISSION_IMPORT_FORMAT = 'v2u-admission' as const;
export const ADMISSION_IMPORT_FORMAT_VERSION = 1;

export interface EligibilityRow {
  pathId: string;
  position: number;
  kind: EligibilityRule['kind'];
  allowedLevels?: EducationLevel[];
  gpaxMin?: number;
  description?: string;
}

export interface RequirementRow {
  pathId: string;
  position: number;
  kind: AdmissionRequirement['kind'];
  subjectId?: CurriculumSubjectId;
  minReadinessPercent?: number;
  skillId?: string;
  examId?: string;
  minScore?: number;
  weightPercent?: number;
  items?: string[];
  gpaxMin?: number;
  description?: string;
}

export interface MilestoneRow extends ApplicationMilestone {
  pathId: string;
}

export type AdmissionPathRow = Omit<AdmissionPath, 'eligibility' | 'requirements' | 'milestones'>;

export interface AdmissionImportBundle {
  format: typeof ADMISSION_IMPORT_FORMAT;
  formatVersion: number;
  generatedAt: string;
  sources: AdmissionSource[];
  universities: University[];
  faculties: Faculty[];
  majors: Major[];
  exams: Exam[];
  admissionPaths: AdmissionPathRow[];
  eligibility: EligibilityRow[];
  requirements: RequirementRow[];
  milestones: MilestoneRow[];
}

/* ── Registry → bundle ───────────────────────────────────────────────── */

function ruleToRow(pathId: string, rule: EligibilityRule, position: number): EligibilityRow {
  if (rule.kind === 'education-level') return { pathId, position, kind: rule.kind, allowedLevels: rule.allowed };
  if (rule.kind === 'gpax-min') return { pathId, position, kind: rule.kind, gpaxMin: rule.min };
  return { pathId, position, kind: rule.kind, description: rule.description };
}

function requirementToRow(pathId: string, r: AdmissionRequirement, position: number): RequirementRow {
  switch (r.kind) {
    case 'subject':
      return { pathId, position, kind: r.kind, subjectId: r.subjectId, minReadinessPercent: r.minReadinessPercent };
    case 'skill':
      return { pathId, position, kind: r.kind, skillId: r.skillId };
    case 'exam':
      return { pathId, position, kind: r.kind, examId: r.examId, minScore: r.minScore, weightPercent: r.weightPercent };
    case 'portfolio':
      return { pathId, position, kind: r.kind, items: r.items };
    case 'gpax':
      return { pathId, position, kind: r.kind, gpaxMin: r.min };
    default:
      return { pathId, position, kind: 'other', description: r.description };
  }
}

export function registryToBundle(registry: AdmissionRegistry, generatedAt: string = new Date().toISOString()): AdmissionImportBundle {
  return {
    format: ADMISSION_IMPORT_FORMAT,
    formatVersion: ADMISSION_IMPORT_FORMAT_VERSION,
    generatedAt,
    sources: registry.sources,
    universities: registry.universities,
    faculties: registry.faculties,
    majors: registry.majors,
    exams: registry.exams,
    admissionPaths: registry.paths.map(({ eligibility: _e, requirements: _r, milestones: _m, ...row }) => row),
    eligibility: registry.paths.flatMap((p) => p.eligibility.map((rule, i) => ruleToRow(p.id, rule, i))),
    requirements: registry.paths.flatMap((p) => p.requirements.map((r, i) => requirementToRow(p.id, r, i))),
    milestones: registry.paths.flatMap((p) => p.milestones.map((m) => ({ ...m, pathId: p.id }))),
  };
}

/* ── Bundle → registry ───────────────────────────────────────────────── */

function rowToRule(row: EligibilityRow): EligibilityRule {
  if (row.kind === 'education-level') return { kind: 'education-level', allowed: row.allowedLevels ?? [] };
  if (row.kind === 'gpax-min') return { kind: 'gpax-min', min: row.gpaxMin ?? NaN };
  return { kind: 'other', description: row.description ?? '' };
}

function rowToRequirement(row: RequirementRow): AdmissionRequirement {
  switch (row.kind) {
    case 'subject':
      return { kind: 'subject', subjectId: row.subjectId as CurriculumSubjectId, minReadinessPercent: row.minReadinessPercent ?? NaN };
    case 'skill':
      return { kind: 'skill', skillId: row.skillId ?? '' };
    case 'exam': {
      const r: AdmissionRequirement = { kind: 'exam', examId: row.examId ?? '' };
      if (row.minScore !== undefined) r.minScore = row.minScore;
      if (row.weightPercent !== undefined) r.weightPercent = row.weightPercent;
      return r;
    }
    case 'portfolio':
      return { kind: 'portfolio', items: row.items ?? [] };
    case 'gpax':
      return { kind: 'gpax', min: row.gpaxMin ?? NaN };
    default:
      return { kind: 'other', description: row.description ?? '' };
  }
}

export function bundleToRegistry(bundle: AdmissionImportBundle): AdmissionRegistry {
  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
  return {
    sources: bundle.sources,
    universities: bundle.universities,
    faculties: bundle.faculties,
    majors: bundle.majors,
    exams: bundle.exams,
    paths: bundle.admissionPaths.map((p) => ({
      ...p,
      eligibility: bundle.eligibility.filter((r) => r.pathId === p.id).sort(byPos).map(rowToRule),
      requirements: bundle.requirements.filter((r) => r.pathId === p.id).sort(byPos).map(rowToRequirement),
      milestones: bundle.milestones
        .filter((m) => m.pathId === p.id)
        .map(({ pathId: _p, ...m }) => m),
    })),
  };
}

/* ── Parse + validate ────────────────────────────────────────────────── */

export interface AdmissionImportResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  registry?: AdmissionRegistry;
}

const ARRAY_KEYS = [
  'sources',
  'universities',
  'faculties',
  'majors',
  'exams',
  'admissionPaths',
  'eligibility',
  'requirements',
  'milestones',
] as const;

export function parseAdmissionImport(json: string, now: Date = new Date()): AdmissionImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, errors: [`invalid JSON: ${(e as Error).message}`], warnings: [] };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['bundle must be an object'], warnings: [] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (obj.format !== ADMISSION_IMPORT_FORMAT) errors.push(`unknown format: ${String(obj.format)}`);
  if (obj.formatVersion !== ADMISSION_IMPORT_FORMAT_VERSION) errors.push(`unsupported formatVersion: ${String(obj.formatVersion)}`);
  for (const k of ARRAY_KEYS) if (!Array.isArray(obj[k])) errors.push(`${k} must be an array`);
  if (errors.length > 0) return { ok: false, errors, warnings: [] };

  const bundle = obj as unknown as AdmissionImportBundle;
  const pathIds = new Set(bundle.admissionPaths.map((p) => p.id));
  for (const [k, rows] of [
    ['eligibility', bundle.eligibility],
    ['requirements', bundle.requirements],
    ['milestones', bundle.milestones],
  ] as const) {
    rows.forEach((r) => !pathIds.has(r.pathId) && errors.push(`${k}: row references unknown path ${r.pathId}`));
  }
  for (const [k, rows] of [
    ['eligibility', bundle.eligibility],
    ['requirements', bundle.requirements],
  ] as const) {
    const seen = new Set<string>();
    rows.forEach((r) => {
      const key = `${r.pathId}#${r.position}`;
      if (seen.has(key)) errors.push(`${k}: duplicate position ${key}`);
      seen.add(key);
    });
  }

  const registry = bundleToRegistry(bundle);
  errors.push(...validateAdmissionRegistry(registry));
  if (errors.length > 0) return { ok: false, errors, warnings: [] };
  return { ok: true, errors: [], warnings: getSourceWarnings(registry, now), registry };
}
