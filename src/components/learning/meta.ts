import { BookOpen, PlayCircle, Sparkles } from 'lucide-react';
import type { LearningMode } from '../../interactive/types';

export const MODE_META: Record<LearningMode, { title: string; description: string; cta: string; icon: typeof BookOpen }> = {
  read: { title: 'อ่านกับ V2U', description: 'สรุปให้เข้าใจง่าย แต่เจาะลึก ไม่ต้องอ่านยาว', cta: 'อ่านกับ V2U', icon: BookOpen },
  video: { title: 'ดูคลิป', description: 'เรียนจากวิดีโอที่ V2U คัดตามลำดับ เลือกเองหรือให้ V2U แนะนำ', cta: 'ดูคลิป', icon: PlayCircle },
  v2u: { title: 'เรียนกับ V2U', description: 'เรียนผ่านภารกิจ เกม การทดลอง และกิจกรรมแบบ Interactive', cta: 'เริ่มเรียนกับ V2U', icon: Sparkles },
};

export const READING_SECTIONS = [
  { id: 'understand', label: 'สิ่งที่ต้องเข้าใจ' },
  { id: 'principle', label: 'หลักคิด' },
  { id: 'simple', label: 'อธิบายแบบง่าย' },
  { id: 'example', label: 'ตัวอย่าง' },
  { id: 'steps', label: 'วิธีคิดทีละขั้น' },
  { id: 'mistakes', label: 'จุดที่มักพลาด' },
  { id: 'try', label: 'ลองทำ' },
  { id: 'check', label: 'เช็กความเข้าใจ' },
] as const;
export const READING_SECTION_IDS = READING_SECTIONS.map((s) => s.id);
