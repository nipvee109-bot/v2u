/* Per-lesson content-completion audit (honest, computed from data).
   READING / LEARN WITH V2U / VIDEO / PRACTICE / POST-LEARNING QUIZ / SOURCES → OVERALL.
   Overall is never better than the knowledge layer's own research readiness. */

import { CURRICULUM } from '../curriculum/data';
import { getLessonKnowledge, getSource } from './knowledge';
import type { ReadinessStatus } from './knowledge';
import { getOriginalLesson } from './originals';
import { getInteractiveLesson } from '../interactive/registry';
import { getStudioScript } from '../interactive/studio/scripts';
import { practiceFields } from '../interactive/studio/practiceCheck';
import { allResources } from '../resources/engine';
import { registryStatus } from '../resources/registryView';
import { DISCOVERED_RESOURCES } from '../resources/discovered';

export type PartStatus = 'READY' | 'LIMITATION';
export type VideoStatus = 'VERIFIED' | 'PENDING' | 'NONE';

export interface LessonCompletion {
  lessonId: string;
  reading: PartStatus;
  learnWithV2U: PartStatus;
  video: VideoStatus;
  videoCandidates: number;
  practice: PartStatus;
  /** Practice items V2U can check automatically */
  checkedPractice: number;
  quiz: PartStatus;
  quizQuestions: number;
  sources: { total: number; opened: number };
  overall: ReadinessStatus;
  gaps: string[];
}

export function auditLessonCompletion(lessonId: string): LessonCompletion | undefined {
  const k = getLessonKnowledge(lessonId);
  const o = getOriginalLesson(lessonId);
  const il = getInteractiveLesson(lessonId);
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  if (!k || !o || !il || !lesson) return undefined;
  const gaps: string[] = [];

  const reading: PartStatus = k.concepts.length > 0 && k.rules.length > 0 && k.workedExamples.length >= 2 && k.mistakes.length > 0 && k.summary.length > 0 && !!o.simple ? 'READY' : 'LIMITATION';
  if (reading !== 'READY') gaps.push('อ่านกับ V2U: โครงสร้างยังไม่ครบ');

  const practiceItems = [...k.guided, ...k.independent];
  const checkedPractice = practiceItems.filter((p) => practiceFields(p).length > 0).length;
  const practice: PartStatus = k.guided.length >= 3 && k.independent.length >= 3 && checkedPractice >= practiceItems.length - 1 ? 'READY' : 'LIMITATION';
  if (practice !== 'READY') gaps.push('แบบฝึก: ตรวจอัตโนมัติไม่ครบ');

  const script = getStudioScript(lessonId);
  const hasPracticeChunk = !!script?.chunks.some((c) => c.kind === 'practice');
  const learnWithV2U: PartStatus = script && hasPracticeChunk ? 'READY' : 'LIMITATION';
  if (learnWithV2U !== 'READY') gaps.push('เรียนกับ V2U: ยังไม่มีการฝึกที่ตรวจคำตอบ');
  if (script && !script.chunks.some((c) => c.kind === 'widget')) gaps.push('เรียนกับ V2U: ยังไม่มีการทดลอง/ภาพเคลื่อนไหวเฉพาะบท (ใช้ขั้นตอน + แบบฝึกที่ตรวจคำตอบ)');

  const quiz = il.finalCheck;
  const quizOk = quiz.length >= 4 && quiz.every((q) => q.skillId && lesson.skillIds.includes(q.skillId) && q.explanation && q.choices.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.choices.length);
  const quizStatus: PartStatus = quizOk ? 'READY' : 'LIMITATION';
  if (!quizOk) gaps.push('แบบทดสอบหลังเรียน: ข้อมูลไม่ครบ');
  gaps.push('แบบทดสอบหลังเรียน: ยังไม่มีช่อง misconception แยกต่อข้อ (ใช้คำอธิบาย + จุดที่มักพลาดของบทแทน)');

  const resources = allResources().filter((r) => r.curriculumLessonIds.includes(lessonId) && r.status !== 'deprecated');
  const videos = resources.filter((r) => r.type === 'video' || r.candidateVideoUrl);
  const video: VideoStatus = videos.some((r) => registryStatus(r) === 'VERIFIED') ? 'VERIFIED' : videos.length > 0 ? 'PENDING' : 'NONE';
  if (video === 'PENDING') gaps.push('คลิป: มีตัวเลือก แต่ยังไม่ได้เปิดดูเนื้อหาจริง (SUMMARY_PENDING)');
  if (video === 'NONE') gaps.push('คลิป: ยังไม่มีคลิปที่คัดไว้');
  for (const d of DISCOVERED_RESOURCES.filter((x) => x.lessonIds.includes(lessonId))) gaps.push(`ตัวเลือกเสริม (${d.type}): ${d.title} — ตรวจจากต้นฉบับแล้ว แต่ยังไม่ได้เปิดหน้าจริง (VERIFICATION_PENDING)`);

  const srcIds = k.provenance.map((p) => p.sourceId);
  const opened = srcIds.filter((id) => ['opened-local', 'opened-repo'].includes(getSource(id)?.verification ?? '')).length;
  if (opened < srcIds.length) gaps.push(`แหล่งอ้างอิง: เปิดอ่านจริง ${opened}/${srcIds.length} (ที่เหลือ VERIFICATION_PENDING)`);

  const core = [reading, learnWithV2U, practice, quizStatus];
  const overall: ReadinessStatus = core.includes('LIMITATION') ? 'NOT_READY' : k.audit.readiness === 'READY' && video === 'VERIFIED' ? 'READY' : 'READY_WITH_LIMITATIONS';
  return { lessonId, reading, learnWithV2U, video, videoCandidates: videos.length, practice, checkedPractice, quiz: quizStatus, quizQuestions: quiz.length, sources: { total: srcIds.length, opened }, overall, gaps };
}

export const auditAllLessons = () => CURRICULUM.lessons.map((l) => auditLessonCompletion(l.id)).filter((x): x is LessonCompletion => !!x);
