/* =========================================================================
   Learning adaptation (Phase 56) — "ถ้าวิธีหนึ่งไม่เวิร์ก ให้ลองอีกวิธีหนึ่ง"
   Pure. Uses only the check result (evidence), never "watched/read" alone.
   ========================================================================= */

import type { LearningMode, UnderstandingSummary } from './types';

export interface ModeSuggestion {
  mode: LearningMode;
  reason: string;
}

export function suggestAlternativeModes(current: LearningMode, summary: UnderstandingSummary | undefined, opts: { hasVideos: boolean }): ModeSuggestion[] {
  if (!summary) return [];
  const weak = summary.score < 70 || summary.confused.length > 0;
  if (!weak) return [];
  const about = summary.confused.length ? ` เรื่อง${summary.confused.join(', ')}` : '';
  const all: Record<LearningMode, ModeSuggestion> = {
    v2u: { mode: 'v2u', reason: `ให้ V2U พาทำทีละขั้น พร้อมคำใบ้เมื่อพลาด${about}` },
    read: { mode: 'read', reason: `อ่านคำอธิบายของ V2U แบบสั้น ๆ อีกรอบ แล้วลองทำ${about}` },
    video: { mode: 'video', reason: `ดูคลิปที่ V2U คัดไว้ แล้วจดจุดที่ยังไม่เข้าใจ${about}` },
  };
  const order: Record<LearningMode, LearningMode[]> = {
    video: ['v2u', 'read'],
    read: ['v2u', 'video'],
    v2u: ['read', 'video'],
  };
  return order[current].filter((m) => m !== 'video' || opts.hasVideos).map((m) => all[m]);
}
