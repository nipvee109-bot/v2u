import { BookOpen, PlayCircle, Sparkles } from 'lucide-react';
import type { LearningMode } from '../../interactive/types';

export const MODE_META: Record<LearningMode, { title: string; description: string; icon: typeof BookOpen }> = {
  read: { title: 'อ่าน', description: 'เรียนจากคำอธิบายและตัวอย่างที่ V2U เรียบเรียงให้', icon: BookOpen },
  video: { title: 'ดูคลิป', description: 'เรียนจากวิดีโอที่ V2U คัดมาให้', icon: PlayCircle },
  v2u: { title: 'เรียนกับ V2U', description: 'ให้ V2U สอนทีละขั้น พร้อมให้คุณลองคิดและตอบ', icon: Sparkles },
};

export const READING_SECTIONS = [
  { id: 'what', label: 'คืออะไร' },
  { id: 'why', label: 'ทำไม' },
  { id: 'how', label: 'ทำอย่างไร' },
  { id: 'example', label: 'ตัวอย่าง' },
  { id: 'try', label: 'ลองทำ' },
  { id: 'check', label: 'เช็ก' },
] as const;
export const READING_SECTION_IDS = READING_SECTIONS.map((s) => s.id);
