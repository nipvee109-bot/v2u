/* =========================================================================
   Teaching Depth Matrix + per-lesson teaching patterns (Phase 69).
   Each lesson gets the smallest interaction that teaches ITS hard idea.
   Every number below is taken from the lesson's own worked examples/checks
   (cross-checked in scripts/test-phase-69.js). No games, no new curriculum.
   ========================================================================= */

import type { StudioChunk } from './types';

export type PatternId =
  | 'VISUAL_REASONING'
  | 'STEP_ORDERING'
  | 'MISSING_STEP'
  | 'FIND_THE_MISTAKE'
  | 'PREDICT_OBSERVE_EXPLAIN'
  | 'VARIABLE_EXPLORER'
  | 'GRAPH_EXPLORER'
  | 'CODE_TRACE'
  | 'CODE_WHAT_IF'
  | 'DEBUGGING'
  | 'MATCH_REPRESENTATIONS'
  | 'SMART_READING'
  /** Web: code ↔ live page (HTML Live Web Builder) — every edit redraws the page */
  | 'LIVE_BUILDER';

export type DepthClass = 'REFERENCE_COMPLETE' | 'DEPTH_UPGRADE_NEEDED' | 'SMART_READING_SUFFICIENT';

export interface DepthRow {
  lessonId: string;
  /** Hardest ideas for learners (from the lesson's concepts / mistakes) */
  hardConcepts: string[];
  /** Status BEFORE Phase 69 */
  before: DepthClass;
  /** Status after this phase */
  after: DepthClass | 'DEPTH_UPGRADED';
  patterns: PatternId[];
  why: string;
  interaction: boolean;
  visualization: boolean;
  simulation: boolean;
  codeExecution: boolean;
  limitation?: string;
}

type Insert = { after: string; chunk: StudioChunk } | { replace: string; chunk: StudioChunk };

export interface DepthPlan extends DepthRow {
  inserts: Insert[];
}

const w = (id: string, phase: StudioChunk['phase'], title: string, tutor: string, widget: Extract<StudioChunk, { kind: 'widget' }>['widget']): StudioChunk => ({ id, phase, kind: 'widget', title, tutor, widget });

export const DEPTH_PLANS: DepthPlan[] = [
  /* ── Reference lessons (Phase 64, approved) ── */
  { lessonId: 'math-alg-linear-eq', hardConcepts: ['ทำแบบเดียวกันทั้งสองข้าง', 'ลำดับการแก้'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['VISUAL_REASONING', 'STEP_ORDERING', 'FIND_THE_MISTAKE'], why: 'ตาชั่งทำให้ “ทำเหมือนกันทั้งสองข้าง” เห็นได้', interaction: true, visualization: true, simulation: false, codeExecution: false, inserts: [] },
  { lessonId: 'phy-dyn-newton', hardConcepts: ['แรงลัพธ์', 'a แปรผกผันกับ m'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['PREDICT_OBSERVE_EXPLAIN', 'VARIABLE_EXPLORER', 'FIND_THE_MISTAKE'], why: 'ทายก่อนแล้วทดลองรถ ทำให้ ΣF = ma มาจากสิ่งที่เห็น', interaction: true, visualization: true, simulation: true, codeExecution: false, inserts: [] },
  { lessonId: 'prog-ctrl-conditions', hardConcepts: ['ลำดับ if/elif', '= กับ =='], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['CODE_TRACE', 'CODE_WHAT_IF', 'DEBUGGING', 'FIND_THE_MISTAKE'], why: 'เห็นเงื่อนไขที่จริงก่อนชนะ และแก้ลำดับเงื่อนไขเอง', interaction: true, visualization: true, simulation: false, codeExecution: true, inserts: [] },

  /* ── Batch A: Mathematics ── */
  {
    lessonId: 'math-alg-linear-system',
    hardConcepts: ['คำตอบต้องจริงทั้งสองสมการพร้อมกัน', 'แทนค่าให้ครบทุกพจน์'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['VISUAL_REASONING', 'MISSING_STEP', 'FIND_THE_MISTAKE'],
    why: 'ลองคู่ (x, y) แล้วเห็นแต่ละสมการจริง/เท็จทันที — ทำให้ “คำตอบของระบบ” เป็นรูปธรรม (ไม่ใช้กราฟ เพราะการแก้ด้วยกราฟยังไม่อยู่ในบทนี้)',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'idea', chunk: w('pair', 'understand', 'คู่ไหนทำให้จริงทั้งสองสมการ?', 'ลองขยับ x กับ y แล้วดูว่าสมการไหนจริงบ้าง', { kind: 'pair-check', exampleId: 'we-1', eqs: [[3, 2, 16], [1, -1, 2]] }) },
      { after: 'example-a', chunk: w('missing', 'try', 'ขั้นไหนหายไป?', 'ขั้นนี้คือหัวใจของวิธีแทนค่า', { kind: 'missing-step', exampleId: 'we-1', index: 1 }) },
    ],
  },
  {
    lessonId: 'math-alg-linear-ineq',
    hardConcepts: ['คูณ/หารด้วยจำนวนลบต้องกลับทิศ', 'วงเล็บเปิด/ปิดของช่วง'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['PREDICT_OBSERVE_EXPLAIN', 'VISUAL_REASONING', 'MISSING_STEP', 'FIND_THE_MISTAKE'],
    why: 'เห็นบนเส้นจำนวนว่าการคูณด้วยจำนวนลบสลับลำดับ — ตอบคำถาม “ทำไมต้องกลับทิศ” แทนการท่องจำ',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'rules', chunk: w('flip', 'understand', 'ทำไมคูณด้วยจำนวนลบต้องกลับทิศ?', 'ทายก่อน แล้วลองคูณด้วยค่าบวกและค่าลบ', { kind: 'number-line', a: 1, b: 2 }) },
      { after: 'example-a', chunk: w('missing', 'try', 'ขั้นไหนหายไป?', 'ดูว่าขั้นที่หายไปต้องทำอะไรกับเครื่องหมาย', { kind: 'missing-step', exampleId: 'we-2', index: 1 }) },
    ],
  },
  {
    lessonId: 'math-alg-exponents',
    hardConcepts: ['คูณฐานเดียวกัน = บวกเลขชี้กำลัง', 'เลขชี้กำลังศูนย์/ลบ'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['VISUAL_REASONING', 'STEP_ORDERING', 'FIND_THE_MISTAKE'],
    why: 'มองเลขยกกำลังเป็นตัวคูณที่นับได้ แล้วกฎบวก/ลบเลขชี้กำลัง (และ a⁰ = 1, a⁻ⁿ) มาจากการนับและตัดกัน',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'idea', chunk: w('blocks', 'understand', 'นับตัวคูณแทนการท่องกฎ', 'ลองเปลี่ยน m กับ n แล้วนับจำนวนตัว 2', { kind: 'exponent-blocks', base: 2 }) },
      { after: 'example-a', chunk: w('order', 'try', 'เรียงขั้นของตัวอย่าง', 'ขั้นไหนต้องทำก่อน?', { kind: 'order-steps', exampleId: 'we-1' }) },
    ],
  },
  {
    lessonId: 'math-fn-linear',
    hardConcepts: ['ความหมายของ m และ c', 'ความชันจากสองจุด'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['GRAPH_EXPLORER', 'MATCH_REPRESENTATIONS', 'MISSING_STEP', 'FIND_THE_MISTAKE'],
    why: 'ปรับ m กับ c แล้วเห็นสมการและกราฟเปลี่ยนพร้อมกัน จนเส้นผ่านจุดของโจทย์ — เชื่อมสูตรกับภาพ',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'idea', chunk: w('graph', 'understand', 'ให้เส้นผ่านสองจุดนี้', 'ปรับความชันกับจุดตัดแกน y แล้วดูเส้นเปลี่ยน', { kind: 'line-graph', exampleId: 'we-1', points: [[1, 3], [4, 9]] }) },
      { after: 'example-a', chunk: w('missing', 'try', 'ขั้นไหนหายไป?', 'รู้ m แล้ว ต่อไปต้องหาอะไร?', { kind: 'missing-step', exampleId: 'we-1', index: 1 }) },
    ],
  },
  {
    lessonId: 'math-trig-ratios',
    hardConcepts: ['ข้าม/ชิดขึ้นกับมุมที่พิจารณา', 'เลือก sin/cos/tan ให้ตรงด้านที่รู้'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['VISUAL_REASONING', 'MISSING_STEP', 'FIND_THE_MISTAKE'],
    why: 'ติดป้ายด้านเองก่อนคำนวณ ตรงกับจุดพลาดอันดับหนึ่งของบท (ติดป้ายข้าม/ชิดจากมุมผิด)',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'idea', chunk: w('sides', 'understand', 'ติดป้ายด้านของสามเหลี่ยม', 'ดูมุม θ ให้ดี — ข้ามกับชิดขึ้นกับมุมนี้', { kind: 'triangle-sides', exampleId: 'we-1', opp: 3, adj: 4, hyp: 5 }) },
      { after: 'example-a', chunk: w('missing', 'try', 'ขั้นไหนหายไป?', 'รู้ฉาก อยากได้ข้าม — ใช้อัตราส่วนไหน?', { kind: 'missing-step', exampleId: 'we-2', index: 1 }) },
    ],
  },

  /* ── Batch B: Physics ── */
  {
    lessonId: 'phy-vec-units',
    hardConcepts: ['คูณหรือหาร 3.6', 'ให้หน่วยเดิมตัดกัน'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['PREDICT_OBSERVE_EXPLAIN', 'MISSING_STEP', 'FIND_THE_MISTAKE'],
    why: 'ทายก่อนว่าตัวเลขจะมากขึ้นหรือน้อยลง แล้วแปลงทีละตัวประกอบ — กันจุดพลาด “คูณแทนหาร”',
    interaction: true, visualization: true, simulation: false, codeExecution: false,
    inserts: [
      { after: 'rules', chunk: w('ladder', 'understand', '72 km/h เป็น m/s', 'ทายก่อนนะ แล้วค่อยแปลงทีละขั้น', { kind: 'unit-ladder', exampleId: 'we-1', value: 72, from: 'km/h', to: 'm/s' }) },
      { after: 'example-a', chunk: w('missing', 'try', 'ขั้นไหนหายไป?', 'ก่อนคูณ ต้องรู้อะไรเกี่ยวกับ k ก่อน?', { kind: 'missing-step', exampleId: 'we-2', index: 0 }) },
    ],
  },
  {
    lessonId: 'phy-vec-vectors',
    hardConcepts: ['องค์ประกอบด้วย cos/sin', 'รวมเวกเตอร์ตั้งฉากไม่ใช่บวกขนาด'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['PREDICT_OBSERVE_EXPLAIN', 'VARIABLE_EXPLORER', 'STEP_ORDERING', 'FIND_THE_MISTAKE'],
    why: 'ทายองค์ประกอบก่อน แล้วปรับขนาด/มุมดูองค์ประกอบเปลี่ยน — เห็นว่าทำไมแนวราบใช้ cos',
    interaction: true, visualization: true, simulation: true, codeExecution: false,
    inserts: [
      { after: 'idea', chunk: w('vector', 'understand', 'แยกเวกเตอร์เป็นสองส่วน', 'ทายก่อนว่าแนวราบได้เท่าไร', { kind: 'vector-explorer', exampleId: 'we-1', magnitude: 10, angle: 30 }) },
      { after: 'example-a', chunk: w('order', 'try', 'เรียงขั้นหาเวกเตอร์ลัพธ์', 'แยกแกน → รวม → หาขนาด', { kind: 'order-steps', exampleId: 'we-2' }) },
    ],
  },
  {
    lessonId: 'phy-kin-1d',
    hardConcepts: ['เลือกสมการจากตัวแปรที่รู้', 'ความชัน/พื้นที่ของกราฟ v–t', 'เครื่องหมายของความเร่งตอนเบรก'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['PREDICT_OBSERVE_EXPLAIN', 'VARIABLE_EXPLORER', 'GRAPH_EXPLORER', 'STEP_ORDERING', 'FIND_THE_MISTAKE'],
    why: 'ทาย v ก่อน แล้วปรับ u, a, t ดูกราฟ v–t: ความชันคือ a และพื้นที่คือ s ตามสมการของบท',
    interaction: true, visualization: true, simulation: true, codeExecution: false,
    limitation: '“พื้นที่ใต้กราฟ = การกระจัด” ยืนยันด้วยการคำนวณ ไม่พบเป็นข้อความในหัวข้อ OpenStax ที่เปิด',
    inserts: [
      { after: 'rules', chunk: w('motion', 'understand', 'ความเร็วเปลี่ยนอย่างไรเมื่อมีความเร่ง', 'ทายก่อน แล้วลองปรับค่าดูกราฟ', { kind: 'motion-explorer', exampleId: 'we-1', u: 0, a: 2, t: 5 }) },
      { after: 'example-a', chunk: w('order', 'try', 'เรียงขั้นแก้โจทย์เบรก', 'เริ่มจากกำหนดทิศและสิ่งที่รู้', { kind: 'order-steps', exampleId: 'we-2' }) },
    ],
  },

  /* ── Batch C: Programming ── */
  {
    lessonId: 'prog-py-variables',
    hardConcepts: ['/ ได้ float ส่วน // ได้ int', 'ต่อสตริงกับตัวเลข'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['CODE_TRACE', 'CODE_WHAT_IF', 'DEBUGGING', 'FIND_THE_MISTAKE'],
    why: 'ทายผลลัพธ์ก่อน แล้วไล่ทีละบรรทัดดูค่าในหน่วยความจำ — เห็นชนิดข้อมูล (3.4 กับ 3) จริงจาก Python',
    interaction: true, visualization: true, simulation: false, codeExecution: true,
    inserts: [{ replace: 'example-a', chunk: w('trace', 'understand', 'ดูหน่วยความจำทีละบรรทัด', 'ทายผลลัพธ์ก่อน แล้วกดถัดไปทีละขั้น', { kind: 'code-trace', traceId: 'var-we-1', mode: 'memory' }) }],
  },
  {
    lessonId: 'prog-py-io',
    hardConcepts: ['input() ได้ str เสมอ', 'f-string'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['CODE_TRACE', 'CODE_WHAT_IF', 'DEBUGGING', 'FIND_THE_MISTAKE'],
    why: 'เห็นจังหวะที่ input() แสดงข้อความ รอผู้ใช้ แล้วเก็บค่าเป็นสตริงในหน่วยความจำ',
    interaction: true, visualization: true, simulation: false, codeExecution: true,
    inserts: [{ replace: 'example-a', chunk: w('trace', 'understand', 'input → ตัวแปร → output', 'ทายก่อนว่าหน้าจอจะแสดงอะไร', { kind: 'code-trace', traceId: 'io-we-1', mode: 'io' }) }],
  },
  {
    lessonId: 'prog-ctrl-loops',
    hardConcepts: ['range ไม่รวมค่าสุดท้าย', 'ตำแหน่งของตัวสะสม'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['CODE_TRACE', 'CODE_WHAT_IF', 'DEBUGGING', 'FIND_THE_MISTAKE'],
    why: 'ดูค่า i และ total ทุกรอบ แล้วไล่โค้ดที่ผิดเพื่อเห็นว่า total ถูกรีเซ็ตในลูป',
    interaction: true, visualization: true, simulation: false, codeExecution: true,
    inserts: [
      { replace: 'example-a', chunk: w('trace', 'understand', 'ลูปทำงานทีละรอบ', 'ทายผลรวมก่อน แล้วดูค่าทุกรอบ', { kind: 'code-trace', traceId: 'loop-we-1', mode: 'loop' }) },
      { after: 'debug', chunk: w('trace-bug', 'practice', 'ไล่โค้ดที่ผิดทีละรอบ', 'ดูว่า total เปลี่ยนอย่างไรในแต่ละรอบ', { kind: 'code-trace', traceId: 'loop-d-1', mode: 'loop' }) },
    ],
  },
  {
    lessonId: 'prog-fn-functions',
    hardConcepts: ['return ส่งค่ากลับ', 'list/dict เปลี่ยนสถานะ'],
    before: 'DEPTH_UPGRADE_NEEDED', after: 'DEPTH_UPGRADED',
    patterns: ['CODE_TRACE', 'CODE_WHAT_IF', 'DEBUGGING', 'FIND_THE_MISTAKE'],
    why: 'เห็นการกระโดดเข้าไปในฟังก์ชัน ค่าพารามิเตอร์ และค่าที่ return กลับไปจุดเรียก แล้วดู dict เปลี่ยนทีละขั้น',
    interaction: true, visualization: true, simulation: false, codeExecution: true,
    inserts: [
      { replace: 'example-a', chunk: w('trace', 'understand', 'เรียกฟังก์ชันแล้วเกิดอะไรขึ้น', 'ทายก่อนว่าแสดงอะไร แล้วตามเข้าไปในฟังก์ชัน', { kind: 'code-trace', traceId: 'fn-we-1', mode: 'call' }) },
      { replace: 'example-b', chunk: w('trace-dict', 'practice', 'dict เปลี่ยนทีละขั้น', 'ดู key ใหม่ที่ถูกเพิ่ม แล้วลูปแสดงทุกคู่', { kind: 'code-trace', traceId: 'fn-we-2', mode: 'memory' }) },
    ],
  },

  /* ── Web track: HTML reference lessons (authored with the HTML Live Web Builder) ── */
  { lessonId: 'web-html-elements', hardConcepts: ['แท็กไม่แสดงบนหน้า', 'element = แท็กเปิด + เนื้อหา + แท็กปิด'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['LIVE_BUILDER', 'PREDICT_OBSERVE_EXPLAIN', 'FIND_THE_MISTAKE'], why: 'วางบล็อกแล้วเห็นหน้าเว็บเกิดทันที ก่อนจะอธิบายว่าแท็กคืออะไร', interaction: true, visualization: true, simulation: false, codeExecution: false, limitation: 'หน้าเว็บในบทเรียนวาดจากแท็กที่บทเรียนอนุญาตเท่านั้น (ไม่รันสคริปต์ ลิงก์ไม่เปิดจริง รูปมาจากชุดที่เตรียมไว้)', inserts: [] },
  { lessonId: 'web-html-text', hardConcepts: ['ลำดับหัวข้อ', 'แท็กที่ไม่ปิดทำให้หน้าเพี้ยน', 'เปิดทีหลังปิดก่อน'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['LIVE_BUILDER', 'FIND_THE_MISTAKE', 'VISUAL_REASONING'], why: 'เห็นย่อหน้ากลายเป็นตัวใหญ่เมื่อหัวข้อไม่ปิด และเห็นคู่แท็กพร้อมป้าย แท็กเปิด/เนื้อหา/แท็กปิด', interaction: true, visualization: true, simulation: false, codeExecution: false, limitation: 'หน้าเว็บในบทเรียนวาดจากแท็กที่บทเรียนอนุญาตเท่านั้น (ไม่รันสคริปต์ ลิงก์ไม่เปิดจริง รูปมาจากชุดที่เตรียมไว้)', inserts: [] },
  { lessonId: 'web-html-links-images', hardConcepts: ['attribute อยู่ในแท็กเปิด', 'alt คือคำอธิบายรูป', 'img ไม่มีแท็กปิด'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['LIVE_BUILDER', 'VARIABLE_EXPLORER', 'FIND_THE_MISTAKE'], why: 'เปลี่ยนค่า src / href / alt แล้วรูปและลิงก์เปลี่ยนตาม รวมถึงเห็น alt แทนรูปที่โหลดไม่ได้', interaction: true, visualization: true, simulation: false, codeExecution: false, limitation: 'หน้าเว็บในบทเรียนวาดจากแท็กที่บทเรียนอนุญาตเท่านั้น (ไม่รันสคริปต์ ลิงก์ไม่เปิดจริง รูปมาจากชุดที่เตรียมไว้)', inserts: [] },
  { lessonId: 'web-html-page-structure', hardConcepts: ['head ≠ header', 'โค้ดซ้อนกัน = พื้นที่ซ้อนกัน'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['LIVE_BUILDER', 'VISUAL_REASONING', 'MATCH_REPRESENTATIONS'], why: 'แตะโค้ดแล้วพื้นที่บนหน้าไฮไลต์ (และกลับกัน) จนเห็นว่าโครงโค้ดคือโครงหน้า', interaction: true, visualization: true, simulation: false, codeExecution: false, limitation: 'หน้าเว็บในบทเรียนวาดจากแท็กที่บทเรียนอนุญาตเท่านั้น (ไม่รันสคริปต์ ลิงก์ไม่เปิดจริง รูปมาจากชุดที่เตรียมไว้)', inserts: [] },
  { lessonId: 'web-html-project', hardConcepts: ['สร้างจากข้อกำหนด ไม่ใช่ลอกภาพ'], before: 'REFERENCE_COMPLETE', after: 'REFERENCE_COMPLETE', patterns: ['LIVE_BUILDER', 'FIND_THE_MISTAKE'], why: 'สร้างหน้าแนะนำตัวเองโดยมีรายการข้อกำหนดที่ติ๊กเองเมื่อโครงสร้างครบ', interaction: true, visualization: true, simulation: false, codeExecution: false, limitation: 'หน้าเว็บในบทเรียนวาดจากแท็กที่บทเรียนอนุญาตเท่านั้น (ไม่รันสคริปต์ ลิงก์ไม่เปิดจริง รูปมาจากชุดที่เตรียมไว้)', inserts: [] },
];

export const getDepthPlan = (lessonId: string) => DEPTH_PLANS.find((p) => p.lessonId === lessonId);

/** Apply a lesson's inserts to its generated chunk list. */
export function applyDepth(lessonId: string, chunks: StudioChunk[]): StudioChunk[] {
  const plan = getDepthPlan(lessonId);
  if (!plan) return chunks;
  let out = [...chunks];
  for (const ins of plan.inserts) {
    if ('replace' in ins) {
      const i = out.findIndex((c) => c.id === ins.replace);
      if (i >= 0) out[i] = ins.chunk;
    } else {
      const i = out.findIndex((c) => c.id === ins.after);
      if (i >= 0) out = [...out.slice(0, i + 1), ins.chunk, ...out.slice(i + 1)];
    }
  }
  return out;
}
