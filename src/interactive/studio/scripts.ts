/* Reference teaching scripts (Phase 64) — one per subject, for EXISTING lessons.
   Tutor lines are V2U's voice (short, friendly, explain why); every fact comes
   from the knowledge layer or the authored interactive lesson they point to. */

import type { StudioChunk, StudioScript } from './types';
import { getLessonKnowledge } from '../../content/knowledge';
import { getInteractiveLesson } from '../registry';
import { applyDepth } from './depth';

const MATH: StudioScript = {
  lessonId: 'math-alg-linear-eq',
  subject: 'math',
  principle: 'ทำให้เรื่องยากมองเห็นได้',
  experience: 'B',
  chunks: [
    { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ก่อนจำวิธีแก้ ลองดูว่าสมการ “คิด” แบบไหนก่อน แล้ววิธีแก้จะตามมาเอง' },
    { id: 'idea', phase: 'understand', kind: 'explain', title: 'สมการคือตาชั่งที่สมดุล', concepts: ['c-equation', 'c-variable'], analogy: true, tutor: 'จำภาพนี้ไว้ภาพเดียวพอ: สองฝั่งของ = หนักเท่ากันเสมอ' },
    { id: 'balance', phase: 'understand', kind: 'widget', title: 'ทำให้ x อยู่คนเดียวบนตาชั่ง', tutor: 'เริ่มจากตรงไหนดีนะ? ลองดูว่าทำยังไงให้ x อยู่คนเดียว', widget: { kind: 'balance', stepId: 'door' } },
    { id: 'why', phase: 'understand', kind: 'explain', title: 'สิ่งที่คุณเพิ่งทำ = สมบัติการเท่ากัน', rules: ['r-add', 'r-mul'], tutor: 'สิ่งที่คุณเพิ่งทำก็คือรักษาสมดุลของสมการ — นี่แหละคือกฎที่ใช้แก้สมการทุกข้อ' },
    { id: 'what-is-x', phase: 'understand', kind: 'step', stepId: 'variable' },
    { id: 'first-move', phase: 'try', kind: 'step', stepId: 'first-move', tutor: 'ไม่ต้องคำนวณก่อนก็ได้ แค่เลือกว่าจะเอาอะไรออกจากฝั่งที่มี x' },
    { id: 'example', phase: 'try', kind: 'example', exampleId: 'we-1', tutor: 'ข้อนี้มีวงเล็บและ x สองฝั่ง ลองเดาขั้นต่อไปก่อนกดดู' },
    { id: 'order', phase: 'try', kind: 'step', stepId: 'order-brackets' },
    { id: 'recover', phase: 'try', kind: 'mistakes', title: 'จุดที่คนส่วนใหญ่พลาด', stepId: 'spot-mistake', tutor: 'เจอบ่อยมาก ไม่ต้องกังวล — ดูว่าพลาดเพราะอะไร แล้วแก้ยังไง' },
    { id: 'solo-1', phase: 'practice', kind: 'step', stepId: 'try-1', tutor: 'ข้อนี้ลองเองเลย ถ้าติดค่อยขอคำใบ้' },
    { id: 'solo-2', phase: 'practice', kind: 'step', stepId: 'try-2' },
    { id: 'drill', phase: 'practice', kind: 'practice', title: 'ฝึกเพิ่มอีกนิด', practiceIds: ['i-4', 'i-5', 'i-6'], tutor: 'ตอบผิดไม่เป็นไร V2U จะบอกว่าพลาดตรงไหน' },
    { id: 'summary', phase: 'practice', kind: 'summary', tutor: 'จำแค่นี้พอ ที่เหลือคือฝึกให้คล่อง' },
  ],
};

const PHYSICS: StudioScript = {
  lessonId: 'phy-dyn-newton',
  subject: 'physics',
  principle: 'ทำให้สูตรทดลองได้',
  experience: 'B',
  chunks: [
    { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ตรงนี้ไม่ต้องจำสูตรก่อนก็ได้ ลองปรับค่าแล้วดูสิว่าเกิดอะไรขึ้น' },
    { id: 'lab-force', phase: 'understand', kind: 'widget', title: 'ทดลองที่ 1: เพิ่มแรง', tutor: 'ทายก่อน แล้วค่อยทดลอง — ถ้ามวลเท่าเดิม แต่เพิ่มแรง จะเกิดอะไรขึ้น?', widget: { kind: 'cart-lab', stepId: 'lab-force', vary: 'force' } },
    { id: 'net', phase: 'understand', kind: 'explain', title: 'สิ่งที่ทำให้รถเร่งคือ “แรงลัพธ์”', concepts: ['c-force', 'c-net'] },
    { id: 'lab-mass', phase: 'understand', kind: 'widget', title: 'ทดลองที่ 2: เพิ่มมวล', tutor: 'คราวนี้คงแรงไว้ แล้วลองเพิ่มมวลดู', widget: { kind: 'cart-lab', stepId: 'lab-mass', vary: 'mass' } },
    { id: 'formula', phase: 'understand', kind: 'explain', title: 'สูตรที่อธิบายการทดลองของคุณ', concepts: ['c-inertia'], rules: ['r-n2', 'r-n1'], tutor: 'สูตรนี้ไม่ได้มาจากไหน — มันแค่เขียนสิ่งที่คุณเพิ่งเห็นในการทดลองเป็นภาษาคณิตศาสตร์' },
    { id: 'calc', phase: 'try', kind: 'step', stepId: 'calc-1', tutor: 'ลองใช้สูตรกับตัวเลขจริง แล้วนึกภาพรถในการทดลองไปด้วย' },
    { id: 'fbd', phase: 'try', kind: 'explain', title: 'วาดแรงก่อนคำนวณ', concepts: ['c-fbd'], rules: ['r-w', 'r-f'], diagram: 'dg-fbd' },
    { id: 'example', phase: 'try', kind: 'example', exampleId: 'we-2' },
    { id: 'friction', phase: 'practice', kind: 'step', stepId: 'calc-friction', tutor: 'มีแรงสองแรงคนละทิศ — หาแรงลัพธ์ก่อนเสมอ' },
    { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
    { id: 'drill', phase: 'practice', kind: 'practice', title: 'ฝึกคำนวณเพิ่ม', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'หาแรงลัพธ์ก่อน แล้วค่อยหาร' },
    { id: 'summary', phase: 'practice', kind: 'summary' },
  ],
};

const PROGRAMMING: StudioScript = {
  lessonId: 'prog-ctrl-conditions',
  subject: 'programming',
  principle: 'ทำให้โค้ดมีชีวิต',
  experience: 'A',
  chunks: [
    { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'โปรแกรมต้องตัดสินใจได้ วันนี้เราจะสั่งหุ่นให้เลือกประตูเองด้วย if / elif / else' },
    { id: 'read-if', phase: 'understand', kind: 'step', stepId: 'read-if' },
    { id: 'run', phase: 'understand', kind: 'widget', title: 'กด Run แล้วดูว่าหุ่นไปทางไหน', tutor: 'ลอง Run ดูก่อน แล้วดูว่าหุ่นไปทางไหน — ลองหลายคะแนนนะ', widget: { kind: 'robot-run', codeFrom: { exampleId: 'we-1' }, values: [95, 72, 40] } },
    { id: 'rule', phase: 'understand', kind: 'explain', title: 'Python เลือกได้ทางเดียว', concepts: ['c-branch', 'c-indent'], rules: ['r-if', 'r-eq'], tutor: 'สังเกตไหม: เจอเงื่อนไขแรกที่จริงปุ๊บ หุ่นไปทางนั้นเลย ไม่ดูข้อที่เหลือ' },
    { id: 'write', phase: 'try', kind: 'step', stepId: 'write-condition' },
    { id: 'debug', phase: 'try', kind: 'widget', title: 'Debug: ทำไมคะแนน 95 ได้แค่ “ผ่าน”?', tutor: 'โค้ดนี้ไม่มี error แต่ผลไม่ตรงที่ตั้งใจ — Run ดูแล้วหาว่าติดที่บรรทัดไหน', widget: { kind: 'robot-debug', practiceId: 'i-3', value: 95 } },
    { id: 'order', phase: 'practice', kind: 'step', stepId: 'order-branches' },
    { id: 'predict', phase: 'practice', kind: 'step', stepId: 'predict', tutor: 'ไล่ในหัวก่อนว่าบรรทัดไหนจริง แล้วค่อยพิมพ์คำตอบ' },
    { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
    { id: 'drill', phase: 'practice', kind: 'practice', title: 'อ่านโค้ดแล้วบอกผลลัพธ์', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'ไล่ทีละบรรทัดเหมือนหุ่นเมื่อกี้ แล้วพิมพ์สิ่งที่โปรแกรมจะแสดง' },
    { id: 'summary', phase: 'practice', kind: 'summary' },
  ],
};

export const STUDIO_SCRIPTS: StudioScript[] = [MATH, PHYSICS, PROGRAMMING];

const SUBJECT: Record<string, { subject: StudioScript['subject']; principle: string; hook: string; practice: string }> = {
  math: { subject: 'math', principle: 'ทำให้เรื่องยากมองเห็นได้', hook: 'ดูภาพรวมก่อนว่าบทนี้ช่วยให้ทำอะไรได้ แล้วค่อยลงมือทีละขั้น', practice: 'ทำบนกระดาษก่อน แล้วพิมพ์คำตอบ — ถ้าผิด V2U จะใบ้ให้' },
  phy: { subject: 'physics', principle: 'ทำให้สูตรทดลองได้', hook: 'ไม่ต้องจำสูตรก่อน ลองนึกภาพสถานการณ์ แล้วสูตรจะตามมาเอง', practice: 'เขียนสิ่งที่โจทย์ให้มาก่อน แล้วเลือกสูตรที่มีตัวแปรครบ' },
  prog: { subject: 'programming', principle: 'ทำให้โค้ดมีชีวิต', hook: 'โค้ดทุกบรรทัดทำงานตามลำดับ ลองไล่ตามดูว่าคอมพิวเตอร์คิดยังไง', practice: 'ไล่โค้ดทีละบรรทัดในหัว แล้วพิมพ์สิ่งที่โปรแกรมจะแสดง' },
};

/** "เรียนกับ V2U" for every other lesson — built only from that lesson's knowledge and generated steps. */
export function buildStudioScript(lessonId: string): StudioScript | undefined {
  const k = getLessonKnowledge(lessonId);
  const lesson = getInteractiveLesson(lessonId);
  const sub = SUBJECT[lessonId.split('-')[0]];
  if (!k || !lesson || !sub) return undefined;
  const steps = lesson.steps.filter((s) => s.interaction);
  const [ex1, ex2] = k.workedExamples;
  const chunks: StudioChunk[] = [
    { id: 'hook', phase: 'understand', kind: 'hook', tutor: sub.hook },
    { id: 'idea', phase: 'understand', kind: 'explain', title: 'แนวคิดหลัก', concepts: k.concepts.map((c) => c.id), analogy: !!k.analogy },
    { id: 'rules', phase: 'understand', kind: 'explain', title: sub.subject === 'programming' ? 'รูปแบบคำสั่งที่ใช้' : 'หลักและสูตรที่ใช้', rules: k.rules.map((r) => r.id), diagram: k.diagrams?.[0]?.id, tutor: 'ไม่ต้องท่องทั้งหมด ดูว่าแต่ละข้อใช้ตอนไหน' },
    ...(ex1 ? [{ id: 'example-a', phase: 'understand', kind: 'example', exampleId: ex1.id, tutor: 'ลองเดาขั้นต่อไปก่อนกดดู' } as StudioChunk] : []),
    ...steps.map<StudioChunk>((s) => ({ id: `step-${s.id}`, phase: 'try', kind: 'step', stepId: s.id })),
    { id: 'guided', phase: 'try', kind: 'practice', title: 'ลองทำ (มีคำใบ้)', practiceIds: k.guided.map((p) => p.id), tutor: sub.practice },
    ...(k.debugging?.[0] ? [{ id: 'debug', phase: 'practice', kind: 'debug', title: 'หาจุดผิดในโค้ด', debugId: k.debugging[0].id, tutor: 'โค้ดนี้มีปัญหา ทายก่อนว่าเพราะอะไร แล้วค่อยดูวิธีแก้' } as StudioChunk] : []),
    ...(ex2 ? [{ id: 'example-b', phase: 'practice', kind: 'example', exampleId: ex2.id } as StudioChunk] : []),
    { id: 'solo', phase: 'practice', kind: 'practice', title: 'ลองทำเอง', practiceIds: [...k.independent].sort((a, b) => a.level - b.level).map((p) => p.id), tutor: 'ข้อนี้ลองเองก่อน ถ้าติดค่อยขอคำใบ้' },
    { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
    { id: 'summary', phase: 'practice', kind: 'summary' },
  ];
  return { lessonId, subject: sub.subject, principle: sub.principle, experience: 'B', chunks: applyDepth(lessonId, chunks) };
}

export const getStudioScript = (lessonId: string): StudioScript | undefined => STUDIO_SCRIPTS.find((s) => s.lessonId === lessonId) ?? buildStudioScript(lessonId);
