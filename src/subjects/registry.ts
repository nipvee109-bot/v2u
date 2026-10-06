/* =========================================================================
   Subject registry (Phase 67) — the ONE place that says which subjects exist,
   how they look, and whether learners can use them. Screens and engines read
   subjects from here instead of assuming exactly Math / Physics / Programming.

   status:
     active    has curriculum + diagnostic in V2U; shown to learners
     track     optional skill/career track: has curriculum and lessons, but is NOT part of
               the Diagnostic and NEVER counts toward university admission readiness
     proposed  researched candidate only — NO curriculum, never shown
   Later, University → Faculty → Major → Admission requirements will decide
   which active subjects a learner needs; nothing here assumes a fixed count.
   ========================================================================= */

export type SubjectStatus = 'active' | 'track' | 'proposed';

export interface SubjectDefinition {
  id: string;
  /** Thai display name */
  label: string;
  emoji: string;
  /** Design tokens; proposed subjects use the neutral brand identity until designed */
  color: string;
  soft: string;
  /** Icon key in components/v2u/kit (IconName) */
  icon: string;
  status: SubjectStatus;
  /** Why this subject matters for the university-preparation pathway */
  pathwayRole: string;
}

const NEUTRAL = { color: 'var(--brand-ink)', soft: 'var(--brand-soft)', icon: 'book' };

export const SUBJECT_REGISTRY: SubjectDefinition[] = [
  { id: 'math', label: 'คณิตศาสตร์', emoji: '🧮', color: 'var(--math)', soft: 'var(--math-soft)', icon: 'sigma', status: 'active', pathwayRole: 'พื้นฐานของทุกสายวิทย์–วิศวะ และวิชาสอบเข้า' },
  { id: 'physics', label: 'ฟิสิกส์', emoji: '⚛️', color: 'var(--phy)', soft: 'var(--phy-soft)', icon: 'atom', status: 'active', pathwayRole: 'วิชาหลักของคณะวิศวกรรมศาสตร์และวิทยาศาสตร์' },
  { id: 'programming', label: 'Programming', emoji: '💻', color: 'var(--prog)', soft: 'var(--prog-soft)', icon: 'code', status: 'active', pathwayRole: 'ทักษะหลักของสาย Computer / Software / AI' },
  {
    id: 'web',
    label: 'เว็บ (HTML)',
    emoji: '🌐',
    color: 'var(--web)',
    soft: 'var(--web-soft)',
    icon: 'code',
    status: 'track',
    pathwayRole: 'ทักษะเสริมสายอาชีพ: สร้างหน้าเว็บด้วย HTML — เรียนได้ตามสนใจ ไม่นับรวมความพร้อมสอบเข้ามหาวิทยาลัย',
  },
  {
    id: 'english',
    label: 'ภาษาอังกฤษ',
    emoji: '🔤',
    ...NEUTRAL,
    status: 'proposed',
    pathwayRole: 'สอบเข้าแทบทุกคณะต้องใช้ และจำเป็นต่อการอ่านตำรา/เอกสารเทคนิคภาษาอังกฤษ — ยังไม่มีหลักสูตรใน V2U',
  },
  {
    id: 'reasoning',
    label: 'ความถนัดเชิงเหตุผล',
    emoji: '🧩',
    ...NEUTRAL,
    status: 'proposed',
    pathwayRole: 'ความถนัดทั่วไป (เชิงตัวเลข ตรรกะ การวิเคราะห์) ที่ใช้ในการคัดเลือก — ยังไม่มีหลักสูตรใน V2U',
  },
];

const byId = new Map(SUBJECT_REGISTRY.map((s) => [s.id, s]));

export const getSubject = (id: string): SubjectDefinition | undefined => byId.get(id);

/** Active subjects in registry order, limited to those the given curriculum actually has. */
export function activeSubjectIds<T extends string>(curriculumSubjectIds: readonly T[], registry: SubjectDefinition[] = SUBJECT_REGISTRY): T[] {
  const have = new Set<string>(curriculumSubjectIds);
  return registry.filter((s) => s.status === 'active' && have.has(s.id)).map((s) => s.id as T);
}

/** Optional skill/career tracks (status `track`) that the given curriculum has — never admission subjects. */
export function trackSubjectIds<T extends string>(curriculumSubjectIds: readonly T[], registry: SubjectDefinition[] = SUBJECT_REGISTRY): T[] {
  const have = new Set<string>(curriculumSubjectIds);
  return registry.filter((s) => s.status === 'track' && have.has(s.id)).map((s) => s.id as T);
}

export const isTrackSubject = (id: string): boolean => byId.get(id)?.status === 'track';

/** Display identity for any subject id — unknown ids get a neutral identity, never a crash. */
export function subjectIdentity(id: string): { label: string; emoji: string; color: string; soft: string; icon: string } {
  const s = byId.get(id);
  return s ? { label: s.label, emoji: s.emoji, color: s.color, soft: s.soft, icon: s.icon } : { label: id, emoji: '📘', ...NEUTRAL };
}

export const subjectLabel = (id: string): string => subjectIdentity(id).label;
