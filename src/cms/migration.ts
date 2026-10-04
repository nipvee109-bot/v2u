/* Learner-data migration planner (Phase 72) — PLAN ONLY, non-destructive.
   Today learner data (progress, mastery, diagnostics, review queue) stays in this
   device's localStorage ("engineering-study-hub-storage"). Signing in never moves,
   uploads, merges or deletes it. A future sync step will follow this plan:
     1. read local snapshot (unchanged)  2. back it up (existing export format)
     3. copy to the account only with explicit learner consent
     4. keep the local copy until the account copy is verified. */

import type { UserProfile } from './types';

export const LEARNER_STORAGE_KEY = 'engineering-study-hub-storage';

export interface MigrationPlan {
  action: 'guest-keep-local' | 'keep-local' | 'offer-copy-with-consent' | 'already-on-account';
  /** Always false: no step deletes or overwrites local learner data */
  destructive: false;
  steps: string[];
}

export function planLearnerDataMigration(profile: UserProfile | null, localSnapshot: string | null): MigrationPlan {
  const base = { destructive: false as const };
  if (!profile) return { ...base, action: 'guest-keep-local', steps: ['เรียนต่อแบบผู้เยี่ยมชม ข้อมูลอยู่ในเครื่องนี้'] };
  if (profile.learnerData.location === 'account') return { ...base, action: 'already-on-account', steps: ['ข้อมูลอยู่กับบัญชีแล้ว สำเนาในเครื่องยังเก็บไว้'] };
  if (!localSnapshot) return { ...base, action: 'keep-local', steps: ['ยังไม่มีข้อมูลการเรียนในเครื่องนี้'] };
  return {
    ...base,
    action: 'offer-copy-with-consent',
    steps: ['สำรองข้อมูลในเครื่อง (ส่งออกไฟล์)', 'ถามผู้เรียนก่อนคัดลอกไปยังบัญชี', 'ตรวจว่าสำเนาในบัญชีครบ', 'เก็บข้อมูลในเครื่องไว้เหมือนเดิม'],
  };
}
