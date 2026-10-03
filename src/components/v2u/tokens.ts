import type { IconName } from './kit';

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

/* ── Subject identity ── */
export type SubKey = 'math' | 'physics' | 'programming';
export const SUB: Record<SubKey, { name: string; c: string; soft: string; k: IconName }> = {
  math: { name: 'คณิตศาสตร์', c: 'var(--math)', soft: 'var(--math-soft)', k: 'sigma' },
  physics: { name: 'ฟิสิกส์', c: 'var(--phy)', soft: 'var(--phy-soft)', k: 'atom' },
  programming: { name: 'Programming', c: 'var(--prog)', soft: 'var(--prog-soft)', k: 'code' },
};
export const subOf = (id: string) => SUB[(id in SUB ? id : 'math') as SubKey] && (id in SUB ? SUB[id as SubKey] : { name: id, c: 'var(--brand-ink)', soft: 'var(--brand-soft)', k: 'book' as IconName });

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

