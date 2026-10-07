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

/* ── Web track: HTML reference (HTML Live Web Builder) ──
   SEE → PLACE → RESULT → WHY → MODIFY → BUILD. Explanations come AFTER the learner has seen the page change. */
const WEB_PRINCIPLE = 'ทำให้โค้ดกลายเป็นหน้าเว็บตรงหน้า';
const html = (id: string, phase: StudioChunk['phase'], title: string, tutor: string): StudioChunk => ({ id, phase, kind: 'widget', title, tutor, widget: { kind: 'html-builder', stepId: id } });

const WEB_HTML: StudioScript[] = [
  {
    lessonId: 'web-html-elements', subject: 'web', principle: WEB_PRINCIPLE, experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ยังไม่ต้องรู้อะไรเลย — วางบล็อกแรก แล้วดูว่าหน้าเว็บเปลี่ยนอย่างไร' },
      html('place-h1', 'understand', 'วางบล็อกแรก', 'ลองวางก่อน แล้วค่อยมาดูว่ามันคืออะไร'),
      html('place-p', 'understand', 'เพิ่มย่อหน้า', 'เทียบดู: หัวข้อกับย่อหน้าหน้าตาต่างกัน เพราะหน้าที่ต่างกัน'),
      { id: 'idea', phase: 'understand', kind: 'explain', title: 'สิ่งที่คุณเพิ่งทำ', concepts: ['c-element', 'c-tag'], rules: ['r-element'], analogy: true, tutor: 'โค้ดแต่ละบรรทัดสร้างชิ้นส่วนหนึ่งชิ้นบนหน้าเว็บ' },
      { id: 'what-shows', phase: 'try', kind: 'step', stepId: 'what-shows' },
      html('edit-text', 'try', 'แก้เนื้อหาเป็นของคุณ', 'แตะ <h1> ในแผนผังโค้ดก่อน จะเห็นว่าส่วนไหนแก้ได้'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มือใหม่มักพลาด' },
      html('own-page', 'practice', 'หน้าแรกของคุณ', 'คราวนี้คุณพิมพ์เนื้อหาเอง ถ้าติดค่อยขอคำใบ้'),
      { id: 'drill', phase: 'practice', kind: 'practice', title: 'ลองเขียน HTML เอง', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'พิมพ์โค้ดของคุณเอง — ข้อความต่างจากเฉลยได้ ขอแค่โครงสร้างถูก' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'web-html-text', subject: 'web', principle: WEB_PRINCIPLE, experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'หน้าเว็บที่อ่านง่ายมีหัวข้อเป็นลำดับ — และทุกแท็กปิดครบ ลองดูว่าถ้าไม่ปิดจะเกิดอะไร' },
      html('levels', 'understand', 'หัวข้อหลายระดับ', 'วางหัวข้อรองก่อน แล้วค่อยวางย่อหน้า'),
      { id: 'order', phase: 'understand', kind: 'explain', title: 'หัวข้อคือสารบัญของหน้า', concepts: ['c-levels'], rules: ['r-one-h1', 'r-order'], analogy: true },
      html('fix-close', 'try', 'ส่วนไหนยังไม่ได้ปิด?', 'ย่อหน้าตัวใหญ่ผิดปกติ — หาแท็กที่ยังไม่มีคู่'),
      { id: 'pairs', phase: 'try', kind: 'explain', title: 'ทุกแท็กมีคู่ และข้างในปิดก่อน', concepts: ['c-pair', 'c-nesting'], rules: ['r-close', 'r-nest'], tutor: 'ถ้าไม่ปิด เบราว์เซอร์ต้องเดาเอง — และมักเดาผิด' },
      html('nesting', 'try', 'กล่องซ้อนกล่อง', 'แท็กไหนเปิดทีหลัง?'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      html('intro', 'practice', 'ส่วนแนะนำตัวของคุณ', 'ใช้ทุกอย่างในบทนี้ — ข้อความเป็นของคุณเอง'),
      { id: 'drill', phase: 'practice', kind: 'practice', title: 'ลองเขียน HTML เอง', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'พิมพ์โค้ดของคุณเอง — ข้อความต่างจากเฉลยได้ ขอแค่โครงสร้างถูก' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'web-html-links-images', subject: 'web', principle: WEB_PRINCIPLE, experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'บางข้อมูลไม่ได้แสดงเป็นข้อความ แต่เปลี่ยนสิ่งที่ element ทำ — ลองเปลี่ยนค่าแล้วดูรูปเปลี่ยน' },
      html('img-src', 'understand', 'src → รูปไหน', 'เปลี่ยนค่าเดียว แล้วดูหน้าเว็บ'),
      { id: 'attr', phase: 'understand', kind: 'explain', title: 'attribute คือข้อมูลในแท็กเปิด', concepts: ['c-attribute', 'c-src'], rules: ['r-attr', 'r-img'], analogy: true },
      html('img-alt', 'try', 'alt → คำอธิบายรูป', 'ลองทำให้รูปโหลดไม่ได้ด้วย แล้วดูว่า alt ไปโผล่ตรงไหน'),
      html('link-href', 'try', 'href → ลิงก์ไปไหน', 'กดลิงก์บนหน้าเว็บเพื่อดูปลายทาง (ในบทเรียนลิงก์จะไม่เปิดจริง)'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      html('own-media', 'practice', 'รูป + ข้อความ + ลิงก์', 'บล็อกยังไม่ครบ — เติม attribute ให้ครบเอง'),
      { id: 'drill', phase: 'practice', kind: 'practice', title: 'ลองเขียน HTML เอง', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'พิมพ์โค้ดของคุณเอง — ข้อความต่างจากเฉลยได้ ขอแค่โครงสร้างถูก' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'web-html-page-structure', subject: 'web', principle: WEB_PRINCIPLE, experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'หน้าเว็บจริงแบ่งเป็นพื้นที่ — แตะโค้ดแล้วดูว่าพื้นที่ไหนบนหน้าสว่างขึ้น' },
      html('regions', 'understand', 'แต่ละส่วนคือพื้นที่ไหน', 'แตะ <header> <main> <footer> ทีละอัน'),
      { id: 'areas', phase: 'understand', kind: 'explain', title: 'ส่วนหัว เนื้อหาหลัก ส่วนท้าย', concepts: ['c-regions', 'c-section', 'c-div'], rules: ['r-one-main'], analogy: true },
      html('skeleton', 'try', 'โครงเอกสาร', 'ดูชื่อบนแท็บของหน้าเว็บเปลี่ยน'),
      { id: 'head-header', phase: 'try', kind: 'step', stepId: 'head-header' },
      { id: 'doc', phase: 'try', kind: 'explain', title: 'head ไม่แสดง · body คือสิ่งที่เห็น', concepts: ['c-document'], rules: ['r-head-header', 'r-skeleton'] },
      html('arrange', 'practice', 'จัดหน้าให้เป็นพื้นที่', 'คลิกตำแหน่งในโค้ดก่อน แล้วค่อยกดบล็อก'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'drill', phase: 'practice', kind: 'practice', title: 'ลองเขียน HTML เอง', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'พิมพ์โค้ดของคุณเอง — ข้อความต่างจากเฉลยได้ ขอแค่โครงสร้างถูก' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'web-html-project', subject: 'web', principle: WEB_PRINCIPLE, experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ถึงเวลาสร้างหน้าเว็บของคุณเอง — ไม่มีคำตอบเดียว ขอแค่ผ่านข้อกำหนด' },
      { id: 'plan', phase: 'understand', kind: 'explain', title: 'วางโครงก่อน แล้วเติมทีละส่วน', concepts: ['c-requirement', 'c-plan', 'c-check'], rules: ['r-structure', 'r-accessible', 'r-free'] },
      html('project', 'try', 'หน้าเว็บแนะนำตัวของคุณ', 'ทำทีละข้อในรายการ แล้วดูหน้าเว็บเปลี่ยนทุกครั้ง'),
      { id: 'review', phase: 'practice', kind: 'step', stepId: 'review' },
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'drill', phase: 'practice', kind: 'practice', title: 'ลองเขียน HTML เอง', practiceIds: ['g-1', 'g-2', 'g-3'], tutor: 'พิมพ์โค้ดของคุณเอง — ข้อความต่างจากเฉลยได้ ขอแค่โครงสร้างถูก' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
];

/* ── P0 per-lesson mechanics, wave 1 (docs/per-lesson-learning-mechanics.md) ──
   ACTION → VISIBLE CONSEQUENCE → WHY → CHANGE SOMETHING → NEW CONSEQUENCE → INDEPENDENT. Explanations come after the action. */
const step = (id: string, phase: StudioChunk['phase'], tutor?: string): StudioChunk => ({ id, phase, kind: 'step', stepId: id, ...(tutor ? { tutor } : {}) });
const solo = (lessonId: string): string[] => [...(getLessonKnowledge(lessonId)?.independent ?? [])].sort((a, b) => a.level - b.level).map((p) => p.id);

const P0: StudioScript[] = [
  {
    lessonId: 'phy-kin-1d', subject: 'physics', principle: 'ทำให้สูตรทดลองได้', experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ยังไม่ต้องดูสูตร — ดูรถวิ่งก่อน แล้วทายว่าอีก 1 วินาทีมันจะอยู่ตรงไหน' },
      step('steady', 'understand', 'เลื่อนหมุดไปตรงที่คิดว่ารถจะอยู่ แล้วกด RUN'),
      step('speeding', 'understand', 'คราวนี้รถเร่งขึ้น — รอยจะห่างเท่าเดิมไหม?'),
      { id: 'why', phase: 'understand', kind: 'explain', title: 'สิ่งที่เกิดขึ้นเมื่อกี้ เพราะ…', concepts: ['c-accel', 'c-velocity', 'c-displacement'], rules: ['r-1', 'r-2'], tutor: 'สองสมการนี้แค่เขียนสิ่งที่คุณเพิ่งเห็นเป็นตัวเลข: ความเร็วเพิ่มทุกวินาที ระยะจึงเพิ่มเร็วขึ้น' },
      step('flag', 'try', 'ลองหลายแบบได้ — สังเกตว่าเมื่อเปลี่ยน a รอยและกราฟเปลี่ยนอย่างไร'),
      step('brake', 'try', 'เบรกคือความเร่งที่สวนทางการเคลื่อนที่'),
      { id: 'graph', phase: 'try', kind: 'explain', title: 'กราฟ v–t บอกอะไร', concepts: ['c-vt'], rules: ['r-graph', 'r-3'], diagram: 'dg-vt' },
      step('pick-equation', 'practice', 'ไม่ต้องจำว่าสมการไหนใช้เมื่อไร — ดูว่าโจทย์บอกอะไร ถามอะไร'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'solo', phase: 'practice', kind: 'practice', title: 'ลองทำเอง', practiceIds: solo('phy-kin-1d'), tutor: 'เขียนสิ่งที่รู้ก่อน แล้วเลือกสมการเหมือนการ์ดเมื่อกี้' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'phy-vec-units', subject: 'physics', principle: 'ทำให้สูตรทดลองได้', experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'ไม่ต้องจำว่าคูณหรือหาร — วางตัวประกอบให้หน่วยหายไปเอง' },
      step('kg-g', 'understand', 'ลองวางด้านไหนก็ได้ แล้วดูว่าหน่วยหายหรือเพิ่ม'),
      { id: 'why', phase: 'understand', kind: 'explain', title: 'สิ่งที่เกิดขึ้นเมื่อกี้ เพราะ…', concepts: ['c-factor', 'c-prefix'], rules: ['r-factor'], tutor: 'ตัวประกอบเท่ากับ 1 เสมอ จึงคูณได้โดยไม่เปลี่ยนปริมาณจริง' },
      step('kmh-ms', 'try', 'ทายก่อน แล้วแปลงสองหน่วยพร้อมกัน — ระวังตัวประกอบที่ไม่เกี่ยว'),
      { id: 'kmh', phase: 'try', kind: 'explain', title: '3.6 มาจากไหน', rules: ['r-kmh', 'r-prefix'] },
      step('ms-kmh', 'practice', 'คราวนี้คำนวณตัวเลขเอง'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'solo', phase: 'practice', kind: 'practice', title: 'ลองทำเอง', practiceIds: solo('phy-vec-units'), tutor: 'นึกภาพตัวประกอบที่ทำให้หน่วยเดิมตัดกัน แล้วค่อยคิดตัวเลข' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'math-alg-linear-system', subject: 'math', principle: 'ทำให้เรื่องยากมองเห็นได้', experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'คำตอบของระบบคือคู่ (x, y) ที่ทำให้ไฟทั้งสองดวงติดพร้อมกัน — ลองหาดู' },
      { id: 'pair', phase: 'understand', kind: 'widget', title: 'คู่ไหนทำให้จริงทั้งสองสมการ?', tutor: 'ขยับ x กับ y แล้วดูว่าสมการไหนจริงบ้าง', widget: { kind: 'pair-check', exampleId: 'we-1', eqs: [[3, 2, 16], [1, -1, 2]] } },
      { id: 'why', phase: 'understand', kind: 'explain', title: 'สิ่งที่เกิดขึ้นเมื่อกี้ เพราะ…', concepts: ['c-pair'], rules: ['r-check2'] },
      step('substitute', 'try', 'การเดาใช้เวลานาน — เครื่องแทนค่าทำให้เหลือตัวแปรเดียว'),
      { id: 'sub', phase: 'try', kind: 'explain', title: 'ทำไมแทนแล้วยังถูก', concepts: ['c-sub'] },
      step('tickets', 'try', 'ไม่ต้องรีบคำนวณ — ทำให้สมการ “พูด” เหมือนเรื่องราวก่อน'),
      step('numbers', 'practice', 'คราวนี้ตั้งชื่อ x กับ y ไว้ให้แล้ว — สร้างสองสมการเองจากสิ่งที่โจทย์บอก'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'solo', phase: 'practice', kind: 'practice', title: 'ลองทำเอง', practiceIds: solo('math-alg-linear-system'), tutor: 'เลือกวิธีที่ชอบ แล้วตรวจกับทั้งสองสมการทุกครั้ง' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
  {
    lessonId: 'prog-py-io', subject: 'programming', principle: 'ทำให้โค้ดมีชีวิต', experience: 'A',
    chunks: [
      { id: 'hook', phase: 'understand', kind: 'hook', tutor: 'วันนี้คุณเป็นผู้ใช้ของโปรแกรม — โปรแกรมจะถาม คุณพิมพ์ แล้วดูว่าค่าไปอยู่ไหน' },
      step('greet', 'understand', 'กด RUN แล้วพิมพ์ชื่อ'),
      { id: 'io', phase: 'understand', kind: 'explain', title: 'สิ่งที่เกิดขึ้นเมื่อกี้ เพราะ…', concepts: ['c-input', 'c-print'] },
      step('double', 'understand', 'ทายก่อน — ผลอาจไม่ใช่อย่างที่คิด'),
      { id: 'convert', phase: 'try', kind: 'explain', title: 'แปลงข้อความเป็นตัวเลข', rules: ['r-input'], tutor: 'ค่าจาก input() เป็นข้อความเสมอ ถ้าจะคำนวณต้องแปลงก่อน' },
      step('age', 'try', 'อ่านบรรทัดที่แดง แล้วดูชนิดในหน่วยความจำ'),
      step('fstring', 'practice', 'โปรแกรมไม่ error แต่ผลไม่ใช่ — หาจุดที่ขาด'),
      { id: 'recover', phase: 'practice', kind: 'mistakes', title: 'จุดที่มักพลาด' },
      { id: 'solo', phase: 'practice', kind: 'practice', title: 'อ่านโค้ดแล้วบอกผลลัพธ์', practiceIds: solo('prog-py-io'), tutor: 'นึกถึงหน่วยความจำ: ค่าที่รับมาเป็นชนิดอะไร' },
      { id: 'summary', phase: 'practice', kind: 'summary' },
    ],
  },
];

export const STUDIO_SCRIPTS: StudioScript[] = [MATH, PHYSICS, PROGRAMMING, ...WEB_HTML, ...P0];

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
