/* =========================================================================
   V2U Readiness (Phase 48) — "ตอนนี้ฉันพร้อมแค่ไหน?"
   -------------------------------------------------------------------------
   One summary that combines, without re-computing:
     curriculum progress   (curriculum engine)
     skill readiness       (Skill Gap engine)
     route readiness       (Route engine, via buildNextStepRoute)
     roadmap progress      (Roadmap engine)
     admission readiness   (student answers + VERIFIED admission paths only)

   Status vocabulary (plain Thai): พร้อม · กำลังพัฒนา · ต้องทบทวน · ยังไม่ได้เรียน
   Percentages are only shown where they are counts of real things
   (e.g. "พร้อม 3 จาก 10 ทักษะ"); otherwise we show counts / statuses.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { isCurriculumLessonCompleted } from '../curriculum/engine';
import type { CurriculumSubjectId } from '../curriculum/types';
import { getSkillGaps, getSubjectSkillGaps, SKILL_STATUS_LABEL } from '../skills/engine';
import type { SkillStatus } from '../skills/engine';
import { buildNextStepRoute } from '../utils/nextStep';
import { buildRoadmap } from '../roadmap/engine';
import type { BuildRoadmapParams } from '../roadmap/engine';
import { buildStudentAdmissionState, evaluateAdmissionPath, getPathsForRouteTarget } from '../admission/engine';
import { ADMISSION_REGISTRY } from '../admission/registry';
import type { StudentAdmissionInputs } from '../admission/types';

export type ReadinessStatus = SkillStatus;
export const READINESS_LABEL = SKILL_STATUS_LABEL;

export interface SubjectReadinessSummary {
  subjectId: CurriculumSubjectId;
  title: string;
  status: ReadinessStatus;
  readySkills: number;
  totalSkills: number;
  counts: Record<SkillStatus, number>;
  completedLessons: number;
  totalLessons: number;
  /** Route target reached (skill readiness ≥ requirement target). */
  meetsTarget: boolean;
}

export interface AdmissionReadinessSummary {
  /** Student checklist answers across exam / portfolio / application stages */
  met: number;
  gap: number;
  unknown: number;
  gpaxKnown: boolean;
  /** Evaluation of VERIFIED admission paths only; empty when none exist. */
  paths: { pathId: string; name: string; met: number; gap: number; unknown: number }[];
}

export interface ReadinessSummary {
  overall: ReadinessStatus;
  /** Plain-Thai one-liner explaining the overall status */
  headline: string;
  subjects: SubjectReadinessSummary[];
  route: { stagesDone: number; stagesTotal: number; currentStageTitle?: string };
  roadmap: { subjectWeeksNeeded: number; fitsInHorizon: boolean };
  admission: AdmissionReadinessSummary;
}

/** Deterministic status for one subject from its skill statuses. */
export function subjectStatus(counts: Record<SkillStatus, number>, meetsTarget: boolean): ReadinessStatus {
  const total = counts.ready + counts.developing + counts['needs-review'] + counts['not-learned'];
  if (total === 0 || counts['not-learned'] === total) return 'not-learned';
  if (counts['needs-review'] > 0) return 'needs-review';
  if (meetsTarget) return 'ready';
  return 'developing';
}

/** Overall: needs-review wins, then developing; ready only when every subject is ready. */
export function overallStatus(statuses: ReadinessStatus[]): ReadinessStatus {
  if (statuses.length === 0 || statuses.every((s) => s === 'not-learned')) return 'not-learned';
  if (statuses.includes('needs-review')) return 'needs-review';
  if (statuses.every((s) => s === 'ready')) return 'ready';
  return 'developing';
}

export function getReadinessSummary(params: BuildRoadmapParams & { admissionInputs?: StudentAdmissionInputs }): ReadinessSummary {
  const referenceDate = params.referenceDate ?? new Date();
  // One checklist source: the route context, falling back to the student's saved answers.
  const p = {
    ...params,
    referenceDate,
    route: { ...params.route, checklist: params.route.checklist ?? params.admissionInputs?.checklist },
  };
  const lessons = p.lessons ?? [];
  const records = p.route.records;

  const route = buildNextStepRoute(p)!;
  const roadmap = buildRoadmap(p);
  const subjectGaps = getSubjectSkillGaps({ storeLessons: lessons, records, referenceDate });
  const skillGaps = getSkillGaps({ storeLessons: lessons, records, referenceDate });

  // Subjects that this route actually requires
  const subjectSteps = route.steps.filter((s) => s.requirement.kind === 'subject' && s.requirement.subjectId);
  const subjects: SubjectReadinessSummary[] = subjectSteps.map((s) => {
    const subjectId = s.requirement.subjectId!;
    const gap = subjectGaps.find((g) => g.subjectId === subjectId)!;
    const cLessons = CURRICULUM.lessons.filter((l) => l.subjectId === subjectId);
    const meetsTarget = s.status === 'done';
    return {
      subjectId,
      title: s.requirement.title,
      status: subjectStatus(gap.counts, meetsTarget),
      readySkills: gap.counts.ready,
      totalSkills: gap.skills.length,
      counts: gap.counts,
      completedLessons: cLessons.filter((l) => isCurriculumLessonCompleted(l, lessons)).length,
      totalLessons: cLessons.length,
      meetsTarget,
    };
  });

  const overall = overallStatus(subjects.map((s) => s.status));
  const weak = subjects.filter((s) => s.status === 'needs-review').map((s) => s.title);
  const current = route.steps.find((s) => s.requirement.id === route.currentRequirementId);
  const headline =
    overall === 'ready'
      ? 'วิชาที่ต้องใช้พร้อมตามเป้าหมายแล้ว — ต่อด้วยการสอบและการสมัคร'
      : overall === 'needs-review'
        ? `มีเรื่องที่ต้องทบทวนใน ${weak.join(', ')} ก่อนไปต่อ`
        : overall === 'developing'
          ? `กำลังพัฒนา — ตอนนี้โฟกัสที่${current ? current.requirement.title : 'วิชาพื้นฐาน'}`
          : 'ยังไม่ได้เริ่มเรียน — เริ่มจากขั้นแรกของเส้นทาง';

  // Admission: only what the student answered + verified paths
  const items = route.steps.flatMap((s) => s.checklist ?? []);
  const registry = p.route.admissionRegistry ?? ADMISSION_REGISTRY;
  const paths = getPathsForRouteTarget(route.target.id, registry);
  const state = buildStudentAdmissionState(route.profile, subjectGaps, skillGaps, {}, params.admissionInputs);
  const pathResults = paths.map((path) => {
    const e = evaluateAdmissionPath(path, state, registry);
    return { pathId: path.id, name: path.name, met: e.metCount, gap: e.gapCount, unknown: e.unknownCount };
  });

  return {
    overall,
    headline,
    subjects,
    route: {
      stagesDone: route.completedCount,
      stagesTotal: route.steps.length,
      currentStageTitle: current?.requirement.title,
    },
    roadmap: { subjectWeeksNeeded: roadmap.subjectWeeksNeeded, fitsInHorizon: roadmap.fitsInHorizon },
    admission: {
      met: items.filter((i) => i.status === 'met').length,
      gap: items.filter((i) => i.status === 'gap').length,
      unknown: items.filter((i) => i.status === 'unknown').length,
      gpaxKnown: params.admissionInputs?.gpax !== null && params.admissionInputs?.gpax !== undefined,
      paths: pathResults,
    },
  };
}
