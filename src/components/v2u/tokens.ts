import type { IconName } from './kit';
import { subjectIdentity } from '../../subjects/registry';

/* ── Status (skill) ── */
export type StKey = 'ok' | 'dev' | 'rev' | 'none';
export const ST: Record<StKey, { label: string; c: string; soft: string; k: IconName }> = {
  ok: { label: 'พร้อม', c: 'var(--ok)', soft: 'var(--ok-soft)', k: 'sOk' },
  dev: { label: 'กำลังพัฒนา', c: 'var(--dev)', soft: 'var(--dev-soft)', k: 'sDev' },
  rev: { label: 'ต้องทบทวน', c: 'var(--rev)', soft: 'var(--rev-soft)', k: 'sRev' },
  none: { label: 'ยังไม่ได้วัด', c: 'var(--none)', soft: 'var(--none-soft)', k: 'sNone' },
};
/** Engine status → design status key */
export const stOf = (s: 'ready' | 'developing' | 'needs-review' | 'not-assessed'): StKey =>
  s === 'ready' ? 'ok' : s === 'developing' ? 'dev' : s === 'needs-review' ? 'rev' : 'none';

/* ── Subject identity ── (Phase 67: from the subject registry — any number of subjects) */
export const subOf = (id: string): { name: string; c: string; soft: string; k: IconName } => {
  const s = subjectIdentity(id);
  return { name: s.label, c: s.color, soft: s.soft, k: s.icon as IconName };
};

/* ── Lesson state (Subject list) ── */
export type LstKey = 'rec' | 'progress' | 'done' | 'review' | 'none' | 'ready' | 'locked';
export const LST: Record<LstKey, { label: string; c: string; soft: string; k: IconName }> = {
  rec: { label: 'แนะนำ', c: 'var(--brand-ink)', soft: 'var(--brand-soft)', k: 'sparkle' },
  progress: { label: 'กำลังเรียน', c: 'var(--dev)', soft: 'var(--dev-soft)', k: 'sDev' },
  done: { label: 'เรียนจบแล้ว', c: 'var(--ok)', soft: 'var(--ok-soft)', k: 'sOk' },
  review: { label: 'ต้องทบทวน', c: 'var(--rev)', soft: 'var(--rev-soft)', k: 'sRev' },
  none: { label: 'ยังไม่ได้วัด', c: 'var(--none)', soft: 'var(--none-soft)', k: 'sNone' },
  ready: { label: 'พร้อมเริ่ม', c: 'var(--ink-2)', soft: 'var(--surface-3)', k: 'play' },
  locked: { label: 'ควรเรียนบทก่อน', c: 'var(--ink-3)', soft: 'transparent', k: 'lock' },
};

