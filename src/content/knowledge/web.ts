/* V2U lesson knowledge — Web track: HTML (optional skill/career track). Original V2U writing.
   Facts checked against MDN Learn / MDN reference and the WHATWG HTML Living Standard
   (docs/sources/html-curriculum-sources.md). Every HTML answer carries `verify: { kind: 'html' }`:
   the test suite parses it with a real DOM (jsdom) and checks STRUCTURE, never exact strings —
   any HTML that meets the requirements is a right answer. */

import type { HtmlRequirement } from '../../web/html';
import type { LessonKnowledge, Verify } from './types';

const EL = 'skill-web-html-element';
const TEXT = 'skill-web-html-text-structure';
const NEST = 'skill-web-html-nesting';
const ATTR = 'skill-web-html-attributes';
const LINK = 'skill-web-html-links-images';
const PAGE = 'skill-web-html-page-structure';
const BUILD = 'skill-web-html-page-build';

const html = (code: string, ...require: HtmlRequirement[]): Verify => ({ kind: 'html', html: code, require: [{ kind: 'closed' }, ...require] });
const SRC_MDN_SYNTAX = { sourceId: 'mdn-basic-html-syntax', crossChecked: false } as const;
const SRC_MDN_HEAD = { sourceId: 'mdn-headings-paragraphs', crossChecked: false } as const;
const SRC_MDN_IMG = { sourceId: 'mdn-img-element', crossChecked: false } as const;
const SRC_MDN_A = { sourceId: 'mdn-a-element', crossChecked: false } as const;
const SRC_MDN_DOC = { sourceId: 'mdn-structuring-documents', crossChecked: false } as const;
const SRC_WHATWG_SYNTAX = { sourceId: 'whatwg-html-syntax', crossChecked: false } as const;
const SRC_WHATWG_SECTIONS = { sourceId: 'whatwg-html-sections', crossChecked: false } as const;

/** Honest status: the pages were fetched and read (2026-10-06), but no quotes are stored for the test suite to re-check, so no claim is marked cross-checked. */
const SOURCE_LIMIT = 'เปิดอ่าน MDN และ WHATWG จริงเมื่อ 2026-10-06 แต่ไม่ได้เก็บข้อความต้นฉบับไว้ให้ชุดทดสอบตรวจซ้ำ จึงยังไม่นับเป็นการตรวจไขว้ (cross-checked)';

const AUDIT_COMMON = {
  externalResourcesVerified: 0,
  nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจ', 'หน้าเว็บในบทเรียนเป็นพื้นที่ทดลองที่จำกัดแท็ก — ไม่ใช่เบราว์เซอร์เต็มรูปแบบ'],
  verification: ['ข้อเท็จจริงสำคัญตรวจกับ MDN และ WHATWG HTML Living Standard ที่เปิดอ่านจริงเมื่อ 2026-10-06', 'เฉลย HTML ทุกข้อถูกแยกเป็น DOM จริง (jsdom) แล้วตรวจโครงสร้างในชุดทดสอบ'],
};

export const WEB_KNOWLEDGE: LessonKnowledge[] = [
  /* ── HTML 1 ─────────────────────────────────────────────────────── */
  {
    lessonId: 'web-html-elements',
    skills: [EL],
    prerequisites: [],
    whyItMatters: 'ทุกหน้าเว็บที่คุณเปิดดูในมือถือเริ่มจากโค้ด HTML — ถ้ามองออกว่าโค้ดบรรทัดไหนสร้างอะไรบนหน้า คุณจะอ่าน แก้ และสร้างหน้าเว็บเองได้',
    allowedKnowledge: ['element = แท็กเปิด + เนื้อหา + แท็กปิด', '<h1> หัวข้อหลัก', '<p> ย่อหน้า'],
    notYetAllowed: ['attribute', 'โครงเอกสาร html / head / body', 'CSS (การแต่งสีและขนาด)'],
    concepts: [
      { id: 'c-html', term: 'HTML', meaning: 'ภาษาที่บอกเบราว์เซอร์ว่าแต่ละส่วนของหน้าเว็บคืออะไร เช่น ตรงนี้คือหัวข้อ ตรงนี้คือย่อหน้า', skillId: EL },
      { id: 'c-element', term: 'element', meaning: 'ชิ้นส่วนหนึ่งชิ้นของหน้าเว็บ ประกอบด้วยแท็กเปิด เนื้อหา และแท็กปิด', skillId: EL },
      { id: 'c-tag', term: 'แท็ก', meaning: 'คำในเครื่องหมาย < > ที่บอกชนิดของ element — แท็กไม่แสดงบนหน้า แต่บอกว่าเนื้อหาคืออะไร', skillId: EL },
    ],
    rules: [
      { id: 'r-element', name: 'รูปร่างของ element', statement: '<ชื่อแท็ก>เนื้อหา</ชื่อแท็ก>', notation: 'แท็กปิดเหมือนแท็กเปิดแต่มี / หน้าชื่อแท็ก', skillId: EL },
      { id: 'r-h1', name: 'หัวข้อหลัก', statement: '<h1>…</h1>', notation: 'หัวข้อที่สำคัญที่สุดของหน้า', skillId: EL },
      { id: 'r-p', name: 'ย่อหน้า', statement: '<p>…</p>', notation: 'ข้อความหนึ่งย่อหน้า', skillId: EL },
    ],
    detailed: [
      'เบราว์เซอร์อ่านโค้ด HTML จากบนลงล่าง แล้ววาดสิ่งที่โค้ดบอกลงบนหน้า แท็กจึงเป็นเหมือนป้ายชื่อที่บอกว่าเนื้อหาข้างในคืออะไร ตัวแท็กเองไม่ปรากฏบนหน้าเว็บ',
      'ข้อความที่อยู่ระหว่างแท็กเปิดกับแท็กปิดคือเนื้อหา ถ้าแก้เนื้อหา หน้าเว็บจะเปลี่ยนข้อความ แต่ยังเป็นชนิดเดิม เช่น ยังเป็นหัวข้อหลักเหมือนเดิม',
      'หัวข้อ <h1> ตัวใหญ่ไม่ใช่เพราะเราอยากได้ตัวใหญ่ แต่เพราะมันคือหัวข้อหลัก เบราว์เซอร์จึงแสดงให้เด่น การเลือกแท็กคือการบอกหน้าที่ของเนื้อหา ไม่ใช่การเลือกขนาดตัวอักษร',
    ],
    analogy: 'แท็กเหมือนป้ายที่แปะบนกล่อง: ป้าย “หัวข้อ” บอกว่ากล่องนี้คือหัวข้อ ส่วนของในกล่องคือข้อความที่คนอ่านเห็น',
    workedExamples: [
      { id: 'we-1', skillId: EL, problem: 'สร้างหัวข้อหลักคำว่า ร้านกาแฟของฉัน', code: '<h1>ร้านกาแฟของฉัน</h1>', steps: ['หัวข้อหลักใช้แท็ก h1', 'เขียนแท็กเปิด <h1>', 'ใส่ข้อความที่อยากให้เห็น', 'ปิดด้วย </h1>'], answer: '<h1>ร้านกาแฟของฉัน</h1>', verify: html('<h1>ร้านกาแฟของฉัน</h1>', { kind: 'text-is', tag: 'h1', text: 'ร้านกาแฟของฉัน' }) },
      { id: 'we-2', skillId: EL, problem: 'เพิ่มย่อหน้าใต้หัวข้อ', code: '<h1>ร้านกาแฟของฉัน</h1>\n<p>เปิดทุกวัน 7 โมงเช้า</p>', steps: ['ย่อหน้าใช้แท็ก p', 'เขียนต่อจากบรรทัดหัวข้อ เพราะหน้าเว็บเรียงจากบนลงล่าง', 'ปิดด้วย </p>'], answer: 'หัวข้อตัวใหญ่ แล้วตามด้วยย่อหน้า', verify: html('<h1>ร้านกาแฟของฉัน</h1>\n<p>เปิดทุกวัน 7 โมงเช้า</p>', { kind: 'before', first: 'h1', then: 'p' }) },
    ],
    guided: [
      { id: 'g-1', skillId: EL, level: 1, prompt: 'เขียน HTML ที่สร้างหัวข้อหลักคำว่า สวัสดี', answer: '<h1>สวัสดี</h1>', explanation: 'หัวข้อหลักใช้ h1 และเนื้อหาอยู่ระหว่างแท็กเปิดกับแท็กปิด', hint: 'แท็กของหัวข้อหลักคือ h1 อย่าลืม </h1>', verify: html('<h1>สวัสดี</h1>', { kind: 'text-is', tag: 'h1', text: 'สวัสดี' }) },
      { id: 'g-2', skillId: EL, level: 1, prompt: 'เขียนย่อหน้าที่มีข้อความ วันนี้อากาศดี', answer: '<p>วันนี้อากาศดี</p>', explanation: 'ย่อหน้าใช้ p เนื้อหาคือข้อความที่จะแสดง', hint: 'ย่อหน้าใช้แท็ก p', verify: html('<p>วันนี้อากาศดี</p>', { kind: 'text-is', tag: 'p', text: 'วันนี้อากาศดี' }) },
      { id: 'g-3', skillId: EL, level: 2, prompt: 'เขียนหัวข้อหลัก 1 อัน แล้วตามด้วยย่อหน้า 1 ย่อหน้า (ข้อความอะไรก็ได้)', answer: '<h1>ทีมฟุตบอล</h1>\n<p>ซ้อมทุกวันพุธ</p>', explanation: 'หัวข้อมาก่อนเพราะหน้าเว็บเรียงตามลำดับโค้ด', hint: 'เขียน h1 ก่อน แล้วขึ้นบรรทัดใหม่เขียน p', verify: html('<h1>ทีมฟุตบอล</h1>\n<p>ซ้อมทุกวันพุธ</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'p' }, { kind: 'before', first: 'h1', then: 'p' }) },
    ],
    independent: [
      { id: 'i-1', skillId: EL, level: 1, prompt: 'เขียนหัวข้อหลักเป็นชื่อเล่นของคุณ', answer: '<h1>บอส</h1>', explanation: 'ชื่ออยู่เป็นเนื้อหาระหว่าง <h1> กับ </h1>', verify: html('<h1>บอส</h1>', { kind: 'has', tag: 'h1' }, { kind: 'text', tag: 'h1', min: 1 }) },
      { id: 'i-2', skillId: EL, level: 1, prompt: 'เขียนย่อหน้าบอกว่าคุณเรียนสาขาอะไร', answer: '<p>เรียนช่างไฟฟ้า</p>', explanation: 'ข้อความทั่วไปหนึ่งย่อหน้าใช้ p', verify: html('<p>เรียนช่างไฟฟ้า</p>', { kind: 'has', tag: 'p' }, { kind: 'text', tag: 'p', min: 1 }) },
      { id: 'i-3', skillId: EL, level: 2, prompt: 'สร้างหน้าที่มีหัวข้อหลัก 1 อัน และย่อหน้า 2 ย่อหน้า', answer: '<h1>งานของฉัน</h1>\n<p>ซ่อมพัดลม</p>\n<p>ต่อวงจรไฟ</p>', explanation: 'แต่ละย่อหน้าเป็น element ของตัวเอง จึงต้องมี <p> … </p> สองชุด', verify: html('<h1>งานของฉัน</h1>\n<p>ซ่อมพัดลม</p>\n<p>ต่อวงจรไฟ</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'p', min: 2 }) },
      { id: 'i-4', skillId: EL, level: 2, prompt: 'โค้ด <h1>ข่าวโรงเรียน แสดงผลได้ แต่ยังไม่สมบูรณ์ เขียนให้ถูก', answer: '<h1>ข่าวโรงเรียน</h1>', explanation: 'ต้องมีแท็กปิด </h1> บอกว่าหัวข้อจบตรงไหน', verify: html('<h1>ข่าวโรงเรียน</h1>', { kind: 'text-is', tag: 'h1', text: 'ข่าวโรงเรียน' }) },
      { id: 'i-5', skillId: EL, level: 3, prompt: 'หน้าประกาศ: หัวข้อหลัก “รับสมัครชมรม” แล้วย่อหน้าบอกวัน และย่อหน้าบอกสถานที่', answer: '<h1>รับสมัครชมรม</h1>\n<p>วันศุกร์นี้</p>\n<p>ที่ห้องสมุด</p>', explanation: 'หัวข้อหลักหนึ่งอัน ตามด้วยย่อหน้าตามลำดับที่อยากให้อ่าน', verify: html('<h1>รับสมัครชมรม</h1>\n<p>วันศุกร์นี้</p>\n<p>ที่ห้องสมุด</p>', { kind: 'text-is', tag: 'h1', text: 'รับสมัครชมรม' }, { kind: 'has', tag: 'p', min: 2 }, { kind: 'before', first: 'h1', then: 'p' }) },
      { id: 'i-6', skillId: EL, level: 3, prompt: 'หน้าแนะนำตัวสั้น ๆ: หัวข้อหลักเป็นชื่อคุณ และย่อหน้าหนึ่งที่บอกสิ่งที่คุณชอบ', answer: '<h1>มิ้นท์</h1>\n<p>ชอบวาดรูปและเล่นเกม</p>', explanation: 'หน้าเว็บแรกต้องการแค่สองชิ้นนี้ก็อ่านรู้เรื่องแล้ว', verify: html('<h1>มิ้นท์</h1>\n<p>ชอบวาดรูปและเล่นเกม</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'p' }, { kind: 'text', tag: 'p', min: 2 }) },
    ],
    checks: [
      { id: 'k-1', skillId: EL, prompt: 'โค้ดนี้แสดงอะไรบนหน้าเว็บ', code: '<h1>ร้านข้าวมันไก่</h1>', choices: ['<h1>ร้านข้าวมันไก่</h1>', 'ร้านข้าวมันไก่ (เป็นหัวข้อ)', 'h1', 'ไม่แสดงอะไร'], correctIndex: 1, explanation: 'แท็กไม่แสดง เนื้อหาแสดงเป็นหัวข้อหลัก', verify: html('<h1>ร้านข้าวมันไก่</h1>', { kind: 'text-is', tag: 'h1', text: 'ร้านข้าวมันไก่' }) },
      { id: 'k-2', skillId: EL, prompt: 'ใน <p>เรียนสนุก</p> ส่วนใดคือเนื้อหา', choices: ['<p>', 'เรียนสนุก', '</p>', 'p'], correctIndex: 1, explanation: 'เนื้อหาคือสิ่งที่อยู่ระหว่างแท็กเปิดกับแท็กปิด' },
      { id: 'k-3', skillId: EL, prompt: 'ข้อใดเป็น element ที่สมบูรณ์', choices: ['<p>สวัสดี', '<p>สวัสดี</p>', 'สวัสดี</p>', '<p/>สวัสดี'], correctIndex: 1, explanation: 'ครบทั้งแท็กเปิด เนื้อหา และแท็กปิด', misconceptions: [{ choice: 0, mistake: 0 }], verify: html('<p>สวัสดี</p>', { kind: 'has', tag: 'p' }) },
      { id: 'k-4', skillId: EL, prompt: 'ทำไมหัวข้อ h1 ถึงตัวใหญ่', choices: ['เพราะพิมพ์ตัวใหญ่', 'เพราะเป็นหัวข้อหลัก เบราว์เซอร์จึงแสดงให้เด่น', 'เพราะมีตัวเลข 1', 'เพราะอยู่บรรทัดแรก'], correctIndex: 1, explanation: 'แท็กบอกหน้าที่ เบราว์เซอร์แสดงตามหน้าที่นั้น', misconceptions: [{ choice: 3, mistake: 2 }] },
    ],
    mistakes: [
      { mistake: 'ลืมแท็กปิด เช่น <h1>สวัสดี', why: 'เห็นหน้าเว็บยังแสดงได้ เลยคิดว่าไม่ต้องปิด', fix: 'เขียนแท็กปิดทันทีหลังเนื้อหา — เบราว์เซอร์ต้องเดาเองว่าหัวข้อจบตรงไหน และมักเดาเกินไปถึงเนื้อหาถัดไป' },
      { mistake: 'คิดว่าแท็กจะปรากฏบนหน้าเว็บ', why: 'เห็นแท็กอยู่ในโค้ด', fix: 'ดูหน้าเว็บจริง: เห็นเฉพาะเนื้อหา แท็กเป็นป้ายบอกเบราว์เซอร์' },
      { mistake: 'เลือก h1 เพราะอยากได้ตัวใหญ่', why: 'เห็นว่า h1 แสดงตัวใหญ่', fix: 'เลือกแท็กตามหน้าที่ของเนื้อหา ส่วนขนาดตัวอักษรเป็นงานของ CSS ที่จะเรียนทีหลัง' },
    ],
    summary: ['element = แท็กเปิด + เนื้อหา + แท็กปิด', 'แท็กไม่แสดงบนหน้า มันบอกว่าเนื้อหาคืออะไร', '<h1> หัวข้อหลัก · <p> ย่อหน้า'],
    afterLesson: ['ชี้ได้ว่าโค้ดส่วนไหนสร้างอะไรบนหน้าเว็บ', 'เขียน h1 และ p ได้เอง', 'แยกแท็กเปิด เนื้อหา แท็กปิด'],
    next: ['web-html-text'],
    provenance: [
      { ...SRC_MDN_SYNTAX, usedFor: 'element ประกอบด้วยแท็กเปิด เนื้อหา แท็กปิด; การลืมแท็กปิดทำให้ผลไม่ตรงที่ตั้งใจ' },
      { ...SRC_MDN_HEAD, usedFor: 'h1 คือหัวข้อหลัก p คือย่อหน้า และไม่เลือกหัวข้อเพราะขนาดตัวอักษร' },
    ],
    audit: { ...AUDIT_COMMON, sourcesFound: ['MDN Learn: Basic HTML syntax', 'MDN Learn: Headings and paragraphs', 'WHATWG HTML Living Standard'], sourcesSelected: ['mdn-basic-html-syntax', 'mdn-headings-paragraphs'], sourcesRejected: [{ source: 'บล็อกสอน HTML ทั่วไป', reason: 'มีเอกสารทางการและเอกสารอ้างอิงหลักครอบคลุมแล้ว' }], knowledgeCovered: ['element', 'แท็กเปิด/ปิด', 'h1', 'p'], knowledgeMissing: [], limitations: [SOURCE_LIMIT], readiness: 'READY_WITH_LIMITATIONS' },
  },

  /* ── HTML 2 ─────────────────────────────────────────────────────── */
  {
    lessonId: 'web-html-text',
    skills: [TEXT, NEST],
    prerequisites: ['web-html-elements'],
    whyItMatters: 'ลำดับหัวข้อที่ถูกต้องทำให้คนกวาดตาอ่านหน้าเว็บได้เร็ว และทำให้โปรแกรมอ่านหน้าจอพาผู้ใช้ไปทีละหัวข้อได้ — ส่วนแท็กที่ปิดครบทำให้หน้าเว็บไม่เพี้ยน',
    allowedKnowledge: ['h1 h2 h3 ตามลำดับความสำคัญ', 'p strong em', 'ปิดแท็กให้ครบ', 'ซ้อนแท็ก: เปิดทีหลัง ปิดก่อน'],
    notYetAllowed: ['h4–h6', 'รายการ ul / li', 'attribute', 'CSS'],
    concepts: [
      { id: 'c-levels', term: 'ลำดับหัวข้อ', meaning: 'h1 คือหัวข้อของทั้งหน้า h2 คือหัวข้อย่อยของ h1 และ h3 คือหัวข้อย่อยของ h2', skillId: TEXT },
      { id: 'c-emphasis', term: 'คำเน้น', meaning: 'strong บอกว่าคำนี้สำคัญ em บอกว่าคำนี้ต้องเน้นเสียงเวลาอ่าน', skillId: TEXT },
      { id: 'c-nesting', term: 'การซ้อนแท็ก', meaning: 'element หนึ่งอยู่ข้างในอีก element หนึ่งได้ แต่ต้องอยู่ข้างในทั้งตัว ห้ามเกยกัน', skillId: NEST },
      { id: 'c-pair', term: 'คู่แท็ก', meaning: 'แท็กเปิดทุกอันต้องมีแท็กปิดชื่อเดียวกันเป็นคู่ของมัน', skillId: NEST },
    ],
    rules: [
      { id: 'r-one-h1', name: 'หัวข้อหลักหนึ่งเดียว', statement: 'หนึ่งหน้า = <h1> หนึ่งอัน', skillId: TEXT },
      { id: 'r-order', name: 'ไม่ข้ามลำดับหัวข้อ', statement: 'h1 → h2 → h3', notation: 'หัวข้อย่อยลดลงทีละขั้น', skillId: TEXT },
      { id: 'r-close', name: 'ปิดให้ครบ', statement: '<h2>…</h2>', notation: 'แท็กเปิดทุกอันมีแท็กปิดคู่ของมัน', skillId: NEST },
      { id: 'r-nest', name: 'เปิดทีหลัง ปิดก่อน', statement: '<p><strong>…</strong></p>', notation: 'แท็กที่อยู่ข้างในต้องปิดก่อนแท็กข้างนอก', skillId: NEST },
    ],
    detailed: [
      'หัวข้อเป็นโครงของเนื้อหา เหมือนสารบัญของหนังสือ หน้าเว็บที่ดีมีหัวข้อหลักหนึ่งอัน แล้วแตกเป็นหัวข้อรองและหัวข้อย่อยตามลำดับ ไม่กระโดดจาก h1 ไป h3',
      'ถ้าลืมปิดแท็ก เบราว์เซอร์จะพยายามเดาว่าแท็กจบตรงไหน เช่น หัวข้อที่ไม่ปิดอาจกินย่อหน้าถัดไปเข้าไปด้วย ทำให้ย่อหน้ากลายเป็นตัวใหญ่ตามหัวข้อ',
      'เวลาซ้อนแท็ก ให้คิดเหมือนกล่องใส่ในกล่อง: กล่องเล็กที่ใส่ทีหลังต้องปิดฝาก่อน แล้วจึงปิดกล่องใหญ่ ถ้าปิดสลับกัน แท็กจะเกยกันและโครงสร้างผิด',
    ],
    analogy: 'หัวข้อเหมือนสารบัญหนังสือ: ชื่อหนังสือ (h1) → บท (h2) → หัวข้อในบท (h3)',
    workedExamples: [
      { id: 'we-1', skillId: TEXT, problem: 'จัดหัวข้อของหน้าแนะนำตัวให้เป็นลำดับ', code: '<h1>เกี่ยวกับฉัน</h1>\n<h2>งานอดิเรก</h2>\n<p>ชอบเล่นดนตรี</p>\n<h3>เครื่องดนตรี</h3>\n<p>กีตาร์</p>', steps: ['ชื่อหน้าใช้ h1 หนึ่งอัน', 'หัวข้อใหญ่ในหน้าใช้ h2', 'หัวข้อย่อยของ h2 ใช้ h3', 'ข้อความใต้หัวข้อใช้ p'], answer: 'h1 → h2 → h3 ลดลงทีละขั้น', verify: html('<h1>เกี่ยวกับฉัน</h1>\n<h2>งานอดิเรก</h2>\n<p>ชอบเล่นดนตรี</p>\n<h3>เครื่องดนตรี</h3>\n<p>กีตาร์</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'before', first: 'h2', then: 'h3' }) },
      { id: 'we-2', skillId: NEST, problem: 'แก้ <p>ฉันชอบ <strong>ดนตรี</p></strong> ให้ถูก', code: '<p>ฉันชอบ <strong>ดนตรี</strong></p>', steps: ['strong เปิดทีหลัง p', 'จึงต้องปิด </strong> ก่อน', 'แล้วค่อยปิด </p>'], answer: '<p>ฉันชอบ <strong>ดนตรี</strong></p>', verify: html('<p>ฉันชอบ <strong>ดนตรี</strong></p>', { kind: 'contains', tag: 'p', child: 'strong' }) },
    ],
    guided: [
      { id: 'g-1', skillId: NEST, level: 1, prompt: 'เติมแท็กที่ขาดให้ <h2>งานอดิเรก', answer: '<h2>งานอดิเรก</h2>', explanation: 'แท็กเปิด h2 ต้องมีแท็กปิด </h2>', hint: 'แท็กปิดมี / หน้าชื่อแท็ก', verify: html('<h2>งานอดิเรก</h2>', { kind: 'text-is', tag: 'h2', text: 'งานอดิเรก' }) },
      { id: 'g-2', skillId: TEXT, level: 1, prompt: 'เขียนหัวข้อรองคำว่า ผลงาน', answer: '<h2>ผลงาน</h2>', explanation: 'หัวข้อรองของหน้าใช้ h2', hint: 'หัวข้อรองอยู่ถัดจาก h1 หนึ่งขั้น', verify: html('<h2>ผลงาน</h2>', { kind: 'text-is', tag: 'h2', text: 'ผลงาน' }) },
      { id: 'g-3', skillId: NEST, level: 2, prompt: 'เขียนย่อหน้า “ห้ามลืมบัตร” โดยเน้นคำว่า ห้ามลืม ด้วย strong', answer: '<p><strong>ห้ามลืม</strong>บัตร</p>', explanation: 'strong อยู่ข้างใน p จึงต้องปิด strong ก่อน p', hint: 'เปิด p → เปิด strong → ปิด strong → ปิด p', verify: html('<p><strong>ห้ามลืม</strong>บัตร</p>', { kind: 'contains', tag: 'p', child: 'strong' }, { kind: 'text-is', tag: 'strong', text: 'ห้ามลืม' }) },
    ],
    independent: [
      { id: 'i-1', skillId: TEXT, level: 1, prompt: 'เขียนหัวข้อย่อย (h3) คำว่า เครื่องมือ', answer: '<h3>เครื่องมือ</h3>', explanation: 'หัวข้อย่อยของหัวข้อรองใช้ h3', verify: html('<h3>เครื่องมือ</h3>', { kind: 'has', tag: 'h3' }) },
      { id: 'i-2', skillId: TEXT, level: 1, prompt: 'เขียนย่อหน้าที่มีคำว่า สำคัญมาก เน้นแบบ em', answer: '<p>เรื่องนี้<em>สำคัญมาก</em></p>', explanation: 'em คือคำที่เน้นเสียงเวลาอ่าน อยู่ข้างใน p', verify: html('<p>เรื่องนี้<em>สำคัญมาก</em></p>', { kind: 'contains', tag: 'p', child: 'em' }) },
      { id: 'i-3', skillId: NEST, level: 2, prompt: 'แก้โค้ด <p><em>ชอบ</p></em> ให้ซ้อนถูก', answer: '<p><em>ชอบ</em></p>', explanation: 'em เปิดทีหลัง จึงต้องปิดก่อน p', verify: html('<p><em>ชอบ</em></p>', { kind: 'contains', tag: 'p', child: 'em' }) },
      { id: 'i-4', skillId: TEXT, level: 2, prompt: 'เขียนหัวข้อหลัก 1 อัน หัวข้อรอง 1 อัน และย่อหน้าใต้หัวข้อรอง', answer: '<h1>บ้านของฉัน</h1>\n<h2>สวน</h2>\n<p>ปลูกมะม่วง</p>', explanation: 'หัวข้อลดลงทีละขั้น และย่อหน้าอยู่ใต้หัวข้อที่มันอธิบาย', verify: html('<h1>บ้านของฉัน</h1>\n<h2>สวน</h2>\n<p>ปลูกมะม่วง</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'h2' }, { kind: 'before', first: 'h2', then: 'p' }) },
      { id: 'i-5', skillId: NEST, level: 3, prompt: 'เขียนย่อหน้าที่มีทั้งคำเน้น strong และคำเน้น em อย่างละหนึ่ง โดยซ้อนถูกทั้งหมด', answer: '<p><strong>ต้อง</strong>ส่งงาน<em>วันนี้</em></p>', explanation: 'ทั้ง strong และ em อยู่ข้างใน p และปิดก่อน </p>', verify: html('<p><strong>ต้อง</strong>ส่งงาน<em>วันนี้</em></p>', { kind: 'contains', tag: 'p', child: 'strong' }, { kind: 'contains', tag: 'p', child: 'em' }) },
      { id: 'i-6', skillId: TEXT, level: 3, prompt: 'ส่วนแนะนำตัว: หัวข้อหลัก หัวข้อรอง และย่อหน้า 2 ย่อหน้า โดยมีคำเน้น strong อย่างน้อย 1 ที่', answer: '<h1>ต้น</h1>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียน <strong>ช่างยนต์</strong></p>\n<p>ชอบซ่อมรถ</p>', explanation: 'โครงหัวข้อชัด และ strong อยู่ในย่อหน้าอย่างถูกต้อง', verify: html('<h1>ต้น</h1>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียน <strong>ช่างยนต์</strong></p>\n<p>ชอบซ่อมรถ</p>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'h2' }, { kind: 'has', tag: 'p', min: 2 }, { kind: 'has', tag: 'strong' }) },
    ],
    checks: [
      { id: 'k-1', skillId: TEXT, prompt: 'หน้าเว็บหนึ่งหน้าควรมีหัวข้อหลัก (h1) กี่อัน', choices: ['ไม่ต้องมี', '1', '2', 'เท่าไรก็ได้'], correctIndex: 1, explanation: 'h1 คือหัวข้อของทั้งหน้า จึงมีอันเดียว' },
      { id: 'k-2', skillId: NEST, prompt: 'ข้อใดซ้อนแท็กถูกต้อง', choices: ['<p><em>ดี</p></em>', '<p><em>ดี</em></p>', '<em><p>ดี</em></p>', '<p>ดี<em></p>'], correctIndex: 1, explanation: 'em เปิดทีหลัง ปิดก่อน', misconceptions: [{ choice: 0, mistake: 1 }], verify: html('<p><em>ดี</em></p>', { kind: 'contains', tag: 'p', child: 'em' }) },
      { id: 'k-3', skillId: TEXT, prompt: 'หัวข้อย่อยของ h2 ใช้แท็กใด', choices: ['h1', 'h3', 'h5', 'p'], correctIndex: 1, explanation: 'ลดลงทีละขั้น: h2 → h3', misconceptions: [{ choice: 2, mistake: 2 }] },
      { id: 'k-4', skillId: NEST, prompt: 'โค้ด <h1>ข่าว แล้วต่อด้วย <p>วันนี้ฝนตก</p> ผลที่มักเกิดคืออะไร', code: '<h1>ข่าว\n<p>วันนี้ฝนตก</p>', choices: ['ไม่มีผล', 'ย่อหน้าอาจถูกนับเป็นส่วนหนึ่งของหัวข้อ', 'หน้าเว็บว่าง', 'ย่อหน้าหายไป'], correctIndex: 1, explanation: 'h1 ยังไม่ปิด เบราว์เซอร์จึงเดาว่าย่อหน้าอยู่ในหัวข้อด้วย', misconceptions: [{ choice: 0, mistake: 0 }] },
    ],
    mistakes: [
      { mistake: 'ลืมปิดหัวข้อ แล้วย่อหน้าถัดไปกลายเป็นตัวใหญ่', why: 'เห็นหัวข้อแสดงได้จึงไม่ได้ปิด', fix: 'ปิด </h1> หรือ </h2> ทุกครั้ง แล้วดูว่าย่อหน้ากลับเป็นขนาดปกติ' },
      { mistake: 'ปิดแท็กสลับลำดับ เช่น <p><strong>…</p></strong>', why: 'ปิดตามลำดับที่เปิด', fix: 'แท็กที่เปิดทีหลังปิดก่อน — เหมือนปิดกล่องเล็กก่อนกล่องใหญ่' },
      { mistake: 'ข้ามลำดับหัวข้อจาก h1 ไป h3 เพราะอยากได้ตัวเล็กลง', why: 'มองหัวข้อเป็นขนาดตัวอักษร', fix: 'เลือกระดับตามโครงเนื้อหา ส่วนขนาดปรับด้วย CSS ภายหลัง' },
    ],
    summary: ['หัวข้อเรียง h1 → h2 → h3 และมี h1 หนึ่งอัน', 'แท็กเปิดทุกอันต้องมีแท็กปิดคู่ของมัน', 'แท็กที่อยู่ข้างในปิดก่อน'],
    afterLesson: ['จัดหัวข้อของหน้าเป็นลำดับได้', 'หาแท็กที่ยังไม่ได้ปิดได้', 'ซ้อน strong / em ในย่อหน้าได้ถูก'],
    next: ['web-html-links-images'],
    provenance: [
      { ...SRC_MDN_HEAD, usedFor: 'ระดับหัวข้อ h1–h6, h1 หนึ่งอันต่อหน้า, ไม่ข้ามระดับ, strong/em มีความหมาย' },
      { ...SRC_MDN_SYNTAX, usedFor: 'การซ้อนต้องอยู่ข้างในทั้งตัว ห้ามเกยกัน' },
      { ...SRC_WHATWG_SYNTAX, usedFor: 'แท็กปิดของ h1 ละไม่ได้ (บทเรียนสอนให้ปิดทุกแท็กเพื่อความง่าย)' },
    ],
    audit: { ...AUDIT_COMMON, sourcesFound: ['MDN Learn: Headings and paragraphs', 'MDN Learn: Basic HTML syntax', 'WHATWG HTML 13.1 Writing HTML documents'], sourcesSelected: ['mdn-headings-paragraphs', 'mdn-basic-html-syntax', 'whatwg-html-syntax'], sourcesRejected: [{ source: 'ตารางสรุปแท็กจากเว็บรวมโค้ด', reason: 'ใช้เอกสารต้นทางแทน' }], knowledgeCovered: ['h1–h3', 'strong / em', 'การปิดแท็ก', 'การซ้อนแท็ก'], knowledgeMissing: [], limitations: [SOURCE_LIMIT, 'ตามมาตรฐาน แท็กปิด </p> ละได้ในบางกรณี แต่บทเรียนให้ปิดทุกแท็กเสมอเพื่อไม่ต้องจำข้อยกเว้น'], readiness: 'READY_WITH_LIMITATIONS' },
  },

  /* ── HTML 3 ─────────────────────────────────────────────────────── */
  {
    lessonId: 'web-html-links-images',
    skills: [ATTR, LINK],
    prerequisites: ['web-html-text'],
    whyItMatters: 'ลิงก์ทำให้หน้าเว็บพาคนไปยังหน้าอื่นได้ และรูปทำให้หน้าเว็บสื่อสารได้เร็ว — ส่วน alt ทำให้คนที่มองไม่เห็นรูปยังเข้าใจหน้าเว็บของคุณ',
    allowedKnowledge: ['attribute name="value" ในแท็กเปิด', '<a href="…">', '<img src="…" alt="…">', 'img ไม่มีแท็กปิด'],
    notYetAllowed: ['target และ attribute อื่นของลิงก์', 'width / height ของรูป', 'การอัปโหลดรูปจริง'],
    concepts: [
      { id: 'c-attribute', term: 'attribute', meaning: 'ข้อมูลเพิ่มเติมของ element เขียนในแท็กเปิดรูปแบบ ชื่อ="ค่า"', skillId: ATTR },
      { id: 'c-href', term: 'href', meaning: 'บอกว่าลิงก์นี้จะพาไปที่ไหน', skillId: LINK },
      { id: 'c-src', term: 'src', meaning: 'บอกว่าจะแสดงรูปไฟล์ไหน', skillId: LINK },
      { id: 'c-alt', term: 'alt', meaning: 'คำอธิบายรูป ใช้เมื่อรูปแสดงไม่ได้ หรือเมื่อโปรแกรมอ่านหน้าจออ่านให้ผู้ใช้ฟัง', skillId: LINK },
    ],
    rules: [
      { id: 'r-attr', name: 'รูปแบบ attribute', statement: '<แท็ก ชื่อ="ค่า">', notation: 'อยู่ในแท็กเปิด คั่นด้วยช่องว่าง ค่าอยู่ในเครื่องหมายคำพูด', skillId: ATTR },
      { id: 'r-a', name: 'ลิงก์', statement: '<a href="ปลายทาง">ข้อความลิงก์</a>', notation: 'ข้อความลิงก์ควรบอกว่าพาไปไหน', skillId: LINK },
      { id: 'r-img', name: 'รูปภาพ', statement: '<img src="ไฟล์" alt="คำอธิบาย">', notation: 'img ไม่มีแท็กปิดและไม่มีเนื้อหา', skillId: LINK },
    ],
    detailed: [
      'attribute เพิ่มข้อมูลให้ element โดยไม่แสดงเป็นข้อความบนหน้าเว็บ เช่น href บอกปลายทางของลิงก์ ผู้ใช้เห็นเฉพาะข้อความลิงก์ แต่เมื่อกด เบราว์เซอร์จะไปตาม href',
      'รูปภาพใช้แท็ก img ซึ่งเป็น element ว่าง ไม่มีเนื้อหาและไม่มีแท็กปิด ทุกอย่างที่รูปต้องการจึงอยู่ใน attribute: src บอกไฟล์รูป และ alt บอกว่ารูปนั้นคืออะไร',
      'alt ที่ดีบอกว่ารูปสื่ออะไร เช่น “แมวสีส้มนั่งบนโต๊ะ” ไม่ใช่แค่ “รูป” ถ้ารูปโหลดไม่ได้ เบราว์เซอร์จะแสดง alt แทน และโปรแกรมอ่านหน้าจอจะอ่าน alt ให้ผู้ใช้ฟัง',
    ],
    analogy: 'element เหมือนซองจดหมาย: เนื้อหาคือจดหมายข้างใน ส่วน attribute คือที่อยู่ที่เขียนบนซอง — ไม่ใช่ข้อความที่คนอ่าน แต่บอกว่าจะส่งไปไหน',
    workedExamples: [
      { id: 'we-1', skillId: LINK, problem: 'ใส่รูปแมวที่มีคำอธิบาย', code: '<img src="cat.png" alt="แมวสีส้มนั่งอยู่">', steps: ['รูปใช้แท็ก img', 'src บอกไฟล์: cat.png', 'alt บอกว่ารูปคืออะไร', 'img ไม่ต้องมีแท็กปิด'], answer: '<img src="cat.png" alt="แมวสีส้มนั่งอยู่">', verify: html('<img src="cat.png" alt="แมวสีส้มนั่งอยู่">', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr-value', tag: 'img', attr: 'src', value: 'cat.png' }) },
      { id: 'we-2', skillId: LINK, problem: 'ทำลิงก์ไปหน้าโรงเรียน', code: '<p>ดูรายละเอียดที่ <a href="school.html">หน้าโรงเรียนของฉัน</a></p>', steps: ['ลิงก์ใช้แท็ก a', 'href บอกปลายทาง: school.html', 'ข้อความระหว่าง <a> กับ </a> คือสิ่งที่ผู้ใช้กด', 'ข้อความลิงก์บอกว่าจะพาไปไหน'], answer: 'ลิงก์ข้อความ “หน้าโรงเรียนของฉัน” ไปที่ school.html', verify: html('<p>ดูรายละเอียดที่ <a href="school.html">หน้าโรงเรียนของฉัน</a></p>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'school.html' }) },
    ],
    guided: [
      { id: 'g-1', skillId: LINK, level: 1, prompt: 'เขียนรูป mountain.png ที่มีคำอธิบายว่า ภูเขากับดวงอาทิตย์', answer: '<img src="mountain.png" alt="ภูเขากับดวงอาทิตย์">', explanation: 'src บอกไฟล์ alt บอกว่ารูปคืออะไร', hint: '<img src="…" alt="…">', verify: html('<img src="mountain.png" alt="ภูเขากับดวงอาทิตย์">', { kind: 'attr-value', tag: 'img', attr: 'src', value: 'mountain.png' }, { kind: 'attr', tag: 'img', attr: 'alt' }) },
      { id: 'g-2', skillId: LINK, level: 1, prompt: 'เขียนลิงก์ข้อความ หน้าแรก ไปที่ home.html', answer: '<a href="home.html">หน้าแรก</a>', explanation: 'href คือปลายทาง ข้อความคือสิ่งที่กด', hint: '<a href="…">ข้อความ</a>', verify: html('<a href="home.html">หน้าแรก</a>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'home.html' }, { kind: 'text-is', tag: 'a', text: 'หน้าแรก' }) },
      { id: 'g-3', skillId: ATTR, level: 2, prompt: 'รูป <img src="laptop.png"> ยังขาดอะไร เขียนให้ครบ', answer: '<img src="laptop.png" alt="โน้ตบุ๊กบนโต๊ะ">', explanation: 'ขาด alt ซึ่งอธิบายรูปเมื่อมองไม่เห็นภาพ', hint: 'เพิ่ม attribute ที่อธิบายรูป', verify: html('<img src="laptop.png" alt="โน้ตบุ๊กบนโต๊ะ">', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr-value', tag: 'img', attr: 'src', value: 'laptop.png' }) },
    ],
    independent: [
      { id: 'i-1', skillId: LINK, level: 1, prompt: 'เขียนรูป school.png พร้อม alt ที่อธิบายรูป', answer: '<img src="school.png" alt="อาคารโรงเรียน">', explanation: 'ทุกรูปต้องมี alt', verify: html('<img src="school.png" alt="อาคารโรงเรียน">', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr-value', tag: 'img', attr: 'src', value: 'school.png' }) },
      { id: 'i-2', skillId: LINK, level: 1, prompt: 'เขียนลิงก์ข้อความ ติดต่อเรา ไปที่ contact.html', answer: '<a href="contact.html">ติดต่อเรา</a>', explanation: 'ข้อความลิงก์บอกปลายทางชัด', verify: html('<a href="contact.html">ติดต่อเรา</a>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'contact.html' }) },
      { id: 'i-3', skillId: ATTR, level: 2, prompt: 'แก้ <img src="cat.png" alt="แมว"></img> ให้ถูก', answer: '<img src="cat.png" alt="แมว">', explanation: 'img ไม่มีแท็กปิด จึงลบ </img> ออก', verify: html('<img src="cat.png" alt="แมว">', { kind: 'attr', tag: 'img', attr: 'alt' }) },
      { id: 'i-4', skillId: LINK, level: 2, prompt: 'เขียนย่อหน้าที่มีลิงก์ไปที่ menu.html อยู่ข้างใน', answer: '<p>ดู<a href="menu.html">เมนูวันนี้</a></p>', explanation: 'ลิงก์อยู่ในย่อหน้าได้ และต้องปิด </a> ก่อน </p>', verify: html('<p>ดู<a href="menu.html">เมนูวันนี้</a></p>', { kind: 'contains', tag: 'p', child: 'a' }, { kind: 'attr-value', tag: 'a', attr: 'href', value: 'menu.html' }) },
      { id: 'i-5', skillId: LINK, level: 3, prompt: 'สร้างส่วนแนะนำ: รูป 1 รูป (มี alt) ข้อความ 1 ย่อหน้า และลิงก์ 1 ลิงก์', answer: '<img src="laptop.png" alt="โน้ตบุ๊กของฉัน">\n<p>ฉันชอบเขียนโปรแกรม</p>\n<a href="projects.html">ผลงานของฉัน</a>', explanation: 'รูปมี src และ alt ลิงก์มี href และข้อความบอกปลายทาง', verify: html('<img src="laptop.png" alt="โน้ตบุ๊กของฉัน">\n<p>ฉันชอบเขียนโปรแกรม</p>\n<a href="projects.html">ผลงานของฉัน</a>', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'img', attr: 'src' }, { kind: 'has', tag: 'p' }, { kind: 'attr', tag: 'a', attr: 'href' }) },
      { id: 'i-6', skillId: ATTR, level: 3, prompt: 'ลิงก์ <a>คลิกที่นี่</a> มีปัญหาสองอย่าง เขียนลิงก์ไปหน้าตารางเรียน (timetable.html) ที่ดีกว่า', answer: '<a href="timetable.html">ตารางเรียน</a>', explanation: 'ต้องมี href และข้อความลิงก์ควรบอกปลายทาง ไม่ใช่ “คลิกที่นี่”', verify: html('<a href="timetable.html">ตารางเรียน</a>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'timetable.html' }, { kind: 'text-not', tag: 'a', text: 'คลิกที่นี่' }) },
    ],
    checks: [
      { id: 'k-1', skillId: LINK, prompt: 'alt ใน img มีไว้ทำอะไร', choices: ['บอกขนาดรูป', 'อธิบายรูปเมื่อมองไม่เห็นภาพ', 'บอกชื่อไฟล์', 'ทำให้รูปเป็นลิงก์'], correctIndex: 1, explanation: 'alt แสดงแทนรูปที่โหลดไม่ได้ และถูกอ่านโดยโปรแกรมอ่านหน้าจอ', misconceptions: [{ choice: 2, mistake: 1 }] },
      { id: 'k-2', skillId: ATTR, prompt: 'attribute เขียนไว้ตรงไหน', choices: ['ในแท็กปิด', 'ในแท็กเปิด', 'ในเนื้อหา', 'หลังแท็กปิด'], correctIndex: 1, explanation: 'attribute อยู่ในแท็กเปิด หลังชื่อแท็ก' },
      { id: 'k-3', skillId: LINK, prompt: 'ข้อใดเขียนรูปถูกต้อง', choices: ['<img src="cat.png" alt="แมว"></img>', '<img src="cat.png" alt="แมว">', '<img>cat.png</img>', '<img alt>cat.png'], correctIndex: 1, explanation: 'img ไม่มีแท็กปิดและไม่มีเนื้อหา ข้อมูลทั้งหมดอยู่ใน attribute', misconceptions: [{ choice: 0, mistake: 2 }], verify: html('<img src="cat.png" alt="แมว">', { kind: 'attr', tag: 'img', attr: 'alt' }) },
      { id: 'k-4', skillId: LINK, prompt: 'ใน <a href="map.html">แผนที่</a> ผู้ใช้เห็นอะไรบนหน้า', choices: ['map.html', 'แผนที่', 'href', '<a>'], correctIndex: 1, explanation: 'ผู้ใช้เห็นข้อความลิงก์ ส่วน href ใช้ตอนกด', verify: html('<a href="map.html">แผนที่</a>', { kind: 'text-is', tag: 'a', text: 'แผนที่' }) },
    ],
    mistakes: [
      { mistake: 'ลืมเครื่องหมายคำพูดรอบค่า เช่น alt=แมวส้ม ตัวใหญ่', why: 'ค่าสั้น ๆ ไม่มีช่องว่างจึงทำงาน แต่พอมีช่องว่างค่าจะขาด', fix: 'ใส่ " " รอบค่าของ attribute ทุกครั้ง' },
      { mistake: 'ไม่ใส่ alt หรือใส่ alt ว่าแค่ “รูป”', why: 'มองไม่เห็นว่า alt ไปแสดงที่ไหน', fix: 'เขียน alt ที่บอกว่ารูปนั้นสื่ออะไร' },
      { mistake: 'ใส่แท็กปิด </img>', why: 'จำว่าทุกแท็กต้องปิด', fix: 'img เป็น element ว่าง ไม่มีแท็กปิด' },
    ],
    summary: ['attribute = ชื่อ="ค่า" อยู่ในแท็กเปิด', 'a ใช้ href บอกปลายทาง', 'img ใช้ src บอกรูป และ alt อธิบายรูป — ไม่มีแท็กปิด'],
    afterLesson: ['เปลี่ยนรูปด้วย src ได้', 'เขียน alt ที่อธิบายรูปได้', 'ทำลิงก์ที่ข้อความบอกปลายทางได้'],
    next: ['web-html-page-structure'],
    provenance: [
      { ...SRC_MDN_SYNTAX, usedFor: 'รูปแบบ attribute ชื่อ="ค่า" และควรใส่เครื่องหมายคำพูด; img เป็น void element' },
      { ...SRC_MDN_IMG, usedFor: 'src และ alt, เบราว์เซอร์แสดง alt เมื่อรูปโหลดไม่ได้, การเขียน alt ที่ดี' },
      { ...SRC_MDN_A, usedFor: 'href คือปลายทาง และข้อความลิงก์ควรบอกปลายทาง (ไม่ใช่ “คลิกที่นี่”)' },
      { ...SRC_WHATWG_SYNTAX, usedFor: 'void element ไม่มีแท็กปิด' },
    ],
    audit: { ...AUDIT_COMMON, sourcesFound: ['MDN: <img>', 'MDN: <a>', 'MDN Learn: Basic HTML syntax', 'WHATWG HTML 13.1.2 Elements'], sourcesSelected: ['mdn-img-element', 'mdn-a-element', 'mdn-basic-html-syntax', 'whatwg-html-syntax'], sourcesRejected: [{ source: 'บทความ SEO เรื่อง alt', reason: 'เน้นการตลาด ไม่ใช่การเข้าถึงได้' }], knowledgeCovered: ['attribute', 'a / href', 'img / src / alt', 'void element'], knowledgeMissing: [], limitations: [SOURCE_LIMIT, 'ในบทเรียน ลิงก์ไม่เปิดเว็บจริงและรูปมาจากชุดรูปที่เตรียมไว้เท่านั้น เพื่อความปลอดภัย', 'มาตรฐานอนุญาตค่า attribute แบบไม่มีเครื่องหมายคำพูดได้ แต่บทเรียนให้ใส่ " " เสมอ'], readiness: 'READY_WITH_LIMITATIONS' },
  },

  /* ── HTML 4 ─────────────────────────────────────────────────────── */
  {
    lessonId: 'web-html-page-structure',
    skills: [PAGE],
    prerequisites: ['web-html-links-images'],
    whyItMatters: 'หน้าเว็บจริงแบ่งเป็นส่วนหัว เนื้อหาหลัก และส่วนท้าย — โครงที่ชัดทำให้จัดหน้าด้วย CSS ได้ง่าย และทำให้โปรแกรมอ่านหน้าจอกระโดดไปยังเนื้อหาหลักได้ทันที',
    allowedKnowledge: ['html head title body', 'header main section footer', 'div เป็นกล่องทั่วไป', 'element ซ้อนกันเป็นชั้น'],
    notYetAllowed: ['nav article aside', 'meta และข้อมูลอื่นใน head', 'form'],
    concepts: [
      { id: 'c-document', term: 'โครงเอกสาร', meaning: 'html ครอบทั้งหน้า head เก็บข้อมูลของหน้า (เช่น title) และ body เก็บทุกอย่างที่มองเห็น', skillId: PAGE },
      { id: 'c-regions', term: 'พื้นที่ของหน้า', meaning: 'header ส่วนหัว · main เนื้อหาหลักของหน้า · footer ส่วนท้าย', skillId: PAGE },
      { id: 'c-section', term: 'section', meaning: 'กลุ่มเนื้อหาเรื่องเดียวกัน มักเริ่มด้วยหัวข้อ', skillId: PAGE },
      { id: 'c-div', term: 'div', meaning: 'กล่องทั่วไปที่ไม่มีความหมายพิเศษ ใช้เมื่อไม่มีแท็กที่มีความหมายตรงกว่า', skillId: PAGE },
    ],
    rules: [
      { id: 'r-skeleton', name: 'โครงเอกสาร', statement: '<html>\n<head><title>…</title></head>\n<body>…</body>\n</html>', skillId: PAGE },
      { id: 'r-head-header', name: 'head ≠ header', statement: '<head> ไม่แสดง · <header> แสดง', notation: 'head คือข้อมูลของหน้า header คือแถบหัวที่ผู้ใช้เห็น', skillId: PAGE },
      { id: 'r-one-main', name: 'เนื้อหาหลักหนึ่งส่วน', statement: 'หนึ่งหน้า = <main> หนึ่งอัน', skillId: PAGE },
    ],
    detailed: [
      'เอกสาร HTML ทั้งหน้าอยู่ใน html แบ่งเป็นสองส่วน: head เก็บข้อมูลเกี่ยวกับหน้า เช่น title ที่ขึ้นบนแท็บเบราว์เซอร์ และ body เก็บทุกอย่างที่ผู้ใช้มองเห็นบนหน้า',
      'ใน body เราแบ่งหน้าเป็นพื้นที่: header สำหรับชื่อเว็บหรือหัวหน้า main สำหรับเนื้อหาที่เป็นของหน้านี้โดยเฉพาะ และ footer สำหรับข้อมูลท้ายหน้า เช่น ลิขสิทธิ์หรือช่องทางติดต่อ',
      'section ใช้รวมเนื้อหาเรื่องเดียวกันและควรเริ่มด้วยหัวข้อ ส่วน div คือกล่องเปล่าไม่มีความหมาย ใช้เมื่ออยากจัดกลุ่มแต่ไม่มีแท็กที่สื่อความหมายได้ตรงกว่า',
    ],
    analogy: 'หน้าเว็บเหมือนจดหมายข่าว: หัวกระดาษ (header) เนื้อข่าว (main แบ่งเป็นหลายเรื่อง = section) และท้ายกระดาษ (footer)',
    workedExamples: [
      { id: 'we-1', skillId: PAGE, problem: 'จัดหน้าแนะนำตัวให้มีส่วนหัว เนื้อหาหลัก และส่วนท้าย', code: '<header>\n  <h1>มินตรา</h1>\n</header>\n<main>\n  <section>\n    <h2>เกี่ยวกับฉัน</h2>\n    <p>เรียน ปวช. คอมพิวเตอร์ธุรกิจ</p>\n  </section>\n</main>\n<footer>\n  <p>ติดต่อ: ห้อง 3/2</p>\n</footer>', steps: ['ชื่อเจ้าของหน้าไว้ใน header', 'เนื้อหาของหน้าไว้ใน main', 'เรื่องเดียวกันรวมเป็น section ที่มีหัวข้อ', 'ข้อมูลติดต่อไว้ใน footer'], answer: 'header → main (มี section) → footer', verify: html('<header>\n  <h1>มินตรา</h1>\n</header>\n<main>\n  <section>\n    <h2>เกี่ยวกับฉัน</h2>\n    <p>เรียน ปวช. คอมพิวเตอร์ธุรกิจ</p>\n  </section>\n</main>\n<footer>\n  <p>ติดต่อ: ห้อง 3/2</p>\n</footer>', { kind: 'inside', tag: 'h1', parent: 'header' }, { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'has', tag: 'footer' }) },
      { id: 'we-2', skillId: PAGE, problem: 'ใส่ชื่อแท็บให้หน้าเว็บ', code: '<html>\n<head>\n  <title>หน้าของฉัน</title>\n</head>\n<body>\n  <h1>ยินดีต้อนรับ</h1>\n</body>\n</html>', steps: ['ชื่อแท็บไม่ได้อยู่บนหน้า จึงไม่ใส่ใน body', 'ใส่ title ไว้ใน head', 'เนื้อหาที่มองเห็นอยู่ใน body'], answer: 'แท็บเบราว์เซอร์แสดง “หน้าของฉัน”', verify: html('<html>\n<head>\n  <title>หน้าของฉัน</title>\n</head>\n<body>\n  <h1>ยินดีต้อนรับ</h1>\n</body>\n</html>', { kind: 'has', tag: 'head' }, { kind: 'inside', tag: 'title', parent: 'head' }, { kind: 'has', tag: 'body' }) },
    ],
    guided: [
      { id: 'g-1', skillId: PAGE, level: 1, prompt: 'ห่อหัวข้อ <h1>ร้านของเรา</h1> ด้วยส่วนหัวของหน้า', answer: '<header><h1>ร้านของเรา</h1></header>', explanation: 'ชื่อเว็บไซต์อยู่ใน header', hint: 'ส่วนหัวที่มองเห็นคือ header (ไม่ใช่ head)', verify: html('<header><h1>ร้านของเรา</h1></header>', { kind: 'inside', tag: 'h1', parent: 'header' }) },
      { id: 'g-2', skillId: PAGE, level: 1, prompt: 'ใส่ย่อหน้า © 2026 ร้านของเรา ไว้ในส่วนท้ายของหน้า', answer: '<footer><p>© 2026 ร้านของเรา</p></footer>', explanation: 'ข้อมูลท้ายหน้าอย่างลิขสิทธิ์อยู่ใน footer', hint: 'ส่วนท้ายคือ footer', verify: html('<footer><p>© 2026 ร้านของเรา</p></footer>', { kind: 'inside', tag: 'p', parent: 'footer' }) },
      { id: 'g-3', skillId: PAGE, level: 2, prompt: 'ทำ main ที่มี section 1 ส่วน และ section นั้นเริ่มด้วยหัวข้อ h2', answer: '<main>\n<section>\n<h2>บริการ</h2>\n<p>ซ่อมคอมพิวเตอร์</p>\n</section>\n</main>', explanation: 'section อยู่ใน main และเริ่มด้วยหัวข้อ', hint: 'main ครอบ section และ section ครอบ h2 กับ p', verify: html('<main>\n<section>\n<h2>บริการ</h2>\n<p>ซ่อมคอมพิวเตอร์</p>\n</section>\n</main>', { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'contains', tag: 'section', child: 'h2' }) },
    ],
    independent: [
      { id: 'i-1', skillId: PAGE, level: 1, prompt: 'เขียน title ของหน้าว่า ผลงานของฉัน ไว้ใน head', answer: '<head><title>ผลงานของฉัน</title></head>', explanation: 'title อยู่ใน head และขึ้นบนแท็บ ไม่ได้อยู่บนหน้า', verify: html('<head><title>ผลงานของฉัน</title></head>', { kind: 'has', tag: 'head' }, { kind: 'inside', tag: 'title', parent: 'head' }) },
      { id: 'i-2', skillId: PAGE, level: 1, prompt: 'ทำ header ที่มีหัวข้อหลักชื่อเว็บของคุณ', answer: '<header><h1>เว็บของต้น</h1></header>', explanation: 'ชื่อเว็บไว้ในส่วนหัว', verify: html('<header><h1>เว็บของต้น</h1></header>', { kind: 'inside', tag: 'h1', parent: 'header' }) },
      { id: 'i-3', skillId: PAGE, level: 2, prompt: 'ทำ main ที่มี section 2 ส่วน แต่ละส่วนมีหัวข้อ h2', answer: '<main>\n<section><h2>การศึกษา</h2><p>ปวช.</p></section>\n<section><h2>ทักษะ</h2><p>ซ่อมคอม</p></section>\n</main>', explanation: 'แต่ละเรื่องเป็น section ของตัวเอง', verify: html('<main>\n<section><h2>การศึกษา</h2><p>ปวช.</p></section>\n<section><h2>ทักษะ</h2><p>ซ่อมคอม</p></section>\n</main>', { kind: 'has', tag: 'section', min: 2 }, { kind: 'contains', tag: 'section', child: 'h2' }, { kind: 'inside', tag: 'section', parent: 'main' }) },
      { id: 'i-4', skillId: PAGE, level: 2, prompt: 'เขียนโครงเอกสารเต็ม: html head (มี title) และ body ที่มีหัวข้อหลัก', answer: '<html>\n<head><title>หน้าแรก</title></head>\n<body><h1>สวัสดี</h1></body>\n</html>', explanation: 'html ครอบทั้งหมด head มี title body มีสิ่งที่มองเห็น', verify: html('<html>\n<head><title>หน้าแรก</title></head>\n<body><h1>สวัสดี</h1></body>\n</html>', { kind: 'has', tag: 'html' }, { kind: 'has', tag: 'head' }, { kind: 'has', tag: 'body' }, { kind: 'inside', tag: 'title', parent: 'head' }) },
      { id: 'i-5', skillId: PAGE, level: 3, prompt: 'จัดหน้า: header มีชื่อ, main มี section ที่มีหัวข้อและย่อหน้า, footer มีข้อมูลติดต่อ', answer: '<header><h1>บีม</h1></header>\n<main><section><h2>เกี่ยวกับฉัน</h2><p>ชอบอิเล็กทรอนิกส์</p></section></main>\n<footer><p>ติดต่อที่ห้อง 2/1</p></footer>', explanation: 'สามพื้นที่ครบ และ section อยู่ใน main', verify: html('<header><h1>บีม</h1></header>\n<main><section><h2>เกี่ยวกับฉัน</h2><p>ชอบอิเล็กทรอนิกส์</p></section></main>\n<footer><p>ติดต่อที่ห้อง 2/1</p></footer>', { kind: 'inside', tag: 'h1', parent: 'header' }, { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'inside', tag: 'p', parent: 'body' }, { kind: 'has', tag: 'footer' }, { kind: 'has', tag: 'main', max: 1 }) },
      { id: 'i-6', skillId: PAGE, level: 3, prompt: 'หน้าที่มี main สองอันผิดตรงไหน เขียนใหม่ให้มี main เดียวที่รวมทั้งสองเรื่องเป็น section', answer: '<main>\n<section><h2>เรื่องที่ 1</h2></section>\n<section><h2>เรื่องที่ 2</h2></section>\n</main>', explanation: 'main มีได้หนึ่งอันต่อหน้า เรื่องย่อยใช้ section', verify: html('<main>\n<section><h2>เรื่องที่ 1</h2></section>\n<section><h2>เรื่องที่ 2</h2></section>\n</main>', { kind: 'has', tag: 'main', max: 1 }, { kind: 'has', tag: 'section', min: 2 }, { kind: 'inside', tag: 'section', parent: 'main' }) },
    ],
    checks: [
      { id: 'k-1', skillId: PAGE, prompt: 'สิ่งที่ผู้ใช้มองเห็นบนหน้าเว็บอยู่ในส่วนใด', choices: ['head', 'body', 'title', 'นอก html'], correctIndex: 1, explanation: 'body เก็บทุกอย่างที่มองเห็น', misconceptions: [{ choice: 0, mistake: 0 }] },
      { id: 'k-2', skillId: PAGE, prompt: 'ข้อใดถูกเกี่ยวกับ head และ header', choices: ['เป็นแท็กเดียวกัน', 'head ไม่แสดงบนหน้า ส่วน header คือส่วนหัวที่มองเห็น', 'header อยู่ใน head', 'head ใช้ใส่โลโก้'], correctIndex: 1, explanation: 'head = ข้อมูลของหน้า header = แถบหัวที่มองเห็น', misconceptions: [{ choice: 0, mistake: 0 }] },
      { id: 'k-3', skillId: PAGE, prompt: 'โค้ดใดจัดส่วนท้ายถูกต้อง', choices: ['<head><p>© 2026</p></head>', '<footer><p>© 2026</p></footer>', '<title>© 2026</title>', '<main><footer></main></footer>'], correctIndex: 1, explanation: 'ข้อมูลท้ายหน้าอยู่ใน footer และปิดครบ', verify: html('<footer><p>© 2026</p></footer>', { kind: 'inside', tag: 'p', parent: 'footer' }) },
      { id: 'k-4', skillId: PAGE, prompt: 'ควรใช้ div เมื่อไร', choices: ['ทุกครั้งแทน section', 'เมื่อไม่มีแท็กที่มีความหมายตรงกว่า', 'ใช้แทน body', 'ใช้ใส่ title'], correctIndex: 1, explanation: 'div เป็นกล่องทั่วไป ใช้เมื่อไม่มีแท็กที่สื่อความหมายได้', misconceptions: [{ choice: 0, mistake: 1 }] },
    ],
    mistakes: [
      { mistake: 'สับสน <head> กับ <header>', why: 'ชื่อคล้ายกัน', fix: 'head ไม่แสดงบนหน้า (มี title) · header คือส่วนหัวที่ผู้ใช้เห็น' },
      { mistake: 'ใช้ div ทุกที่', why: 'div ใช้ได้กับทุกอย่างจึงสะดวก', fix: 'ถ้ามีแท็กที่บอกความหมายได้ (header main section footer) ให้ใช้แท็กนั้นก่อน' },
      { mistake: 'มี main มากกว่าหนึ่งอัน', why: 'อยากแบ่งเนื้อหาหลักเป็นหลายก้อน', fix: 'main มีอันเดียว แล้วแบ่งเรื่องข้างในด้วย section' },
    ],
    summary: ['html ครอบทั้งหน้า: head (ไม่แสดง) + body (มองเห็น)', 'header · main · footer แบ่งพื้นที่ของหน้า', 'section รวมเรื่องเดียวกัน div คือกล่องทั่วไป'],
    afterLesson: ['เขียนโครงเอกสารได้', 'แยก head กับ header ได้', 'จัดเนื้อหาลงพื้นที่ของหน้าได้'],
    next: ['web-html-project'],
    provenance: [
      { ...SRC_MDN_DOC, usedFor: 'header main (หนึ่งอันต่อหน้า) section footer div และความต่างของ head กับ header' },
      { ...SRC_MDN_SYNTAX, usedFor: 'โครงเอกสาร html head title body' },
      { ...SRC_WHATWG_SECTIONS, usedFor: 'ความหมายของ body header footer section (section ไม่ใช่กล่องทั่วไป ให้ใช้ div)' },
    ],
    audit: { ...AUDIT_COMMON, sourcesFound: ['MDN Learn: Structuring documents', 'MDN Learn: Basic HTML syntax', 'WHATWG HTML 4.3 Sections'], sourcesSelected: ['mdn-structuring-documents', 'mdn-basic-html-syntax', 'whatwg-html-sections'], sourcesRejected: [{ source: 'บทความ semantic HTML สำหรับ SEO', reason: 'ลงรายละเอียดเกินระดับเริ่มต้น' }], knowledgeCovered: ['html head title body', 'header main section footer div'], knowledgeMissing: [], limitations: [SOURCE_LIMIT, 'ยังไม่สอน nav article aside เพื่อให้บทแรกเน้นพื้นที่หลักของหน้า', 'ไม่สอน <!doctype html> และ meta charset — ตัวสร้างหน้าในบทเรียนเติมให้ บทเรียนถัดไปจึงจะพูดถึง'], readiness: 'READY_WITH_LIMITATIONS' },
  },

  /* ── HTML 5 ─────────────────────────────────────────────────────── */
  {
    lessonId: 'web-html-project',
    skills: [BUILD],
    prerequisites: ['web-html-page-structure'],
    whyItMatters: 'ผลงานที่สร้างเองตามข้อกำหนดคือหลักฐานว่าคุณใช้ HTML ได้จริง — หน้าแนะนำตัวหน้าแรกยังต่อยอดเป็นแฟ้มผลงานหรือเว็บของตัวเองได้ด้วย',
    allowedKnowledge: ['ทุกแท็กจาก HTML 1–4', 'ตรวจงานกับรายการข้อกำหนด', 'เลือกข้อความ รูป และลำดับเนื้อหาเอง'],
    notYetAllowed: ['CSS', 'JavaScript', 'รูปจากอินเทอร์เน็ต'],
    concepts: [
      { id: 'c-requirement', term: 'ข้อกำหนด', meaning: 'สิ่งที่หน้าเว็บต้องมี เช่น หัวข้อหลักหนึ่งอัน รูปที่มี alt — ตรวจที่โครงสร้าง ไม่ใช่หน้าตา', skillId: BUILD },
      { id: 'c-plan', term: 'วางโครงก่อนเขียน', meaning: 'คิดก่อนว่าหน้ามีส่วนอะไรบ้าง แล้วค่อยเติมเนื้อหาในแต่ละส่วน', skillId: BUILD },
      { id: 'c-check', term: 'ตรวจทีละข้อ', meaning: 'ดูรายการข้อกำหนดทีละข้อ แก้ข้อที่ยังไม่ผ่าน แล้วดูหน้าเว็บใหม่', skillId: BUILD },
    ],
    rules: [
      { id: 'r-structure', name: 'โครงก่อน เนื้อหาทีหลัง', statement: '<header> → <main> (section) → <footer>', skillId: BUILD },
      { id: 'r-accessible', name: 'ทุกคนอ่านได้', statement: 'h1 หนึ่งอัน · รูปมี alt · ลิงก์บอกปลายทาง', skillId: BUILD },
      { id: 'r-free', name: 'หน้าตาเป็นของคุณ', statement: 'ผ่านข้อกำหนด = ผ่าน', notation: 'ไม่ต้องเหมือนตัวอย่างหรือเหมือนเพื่อน', skillId: BUILD },
    ],
    detailed: [
      'โปรเจกต์นี้ไม่มีคำตอบเดียว หน้าเว็บของแต่ละคนจะต่างกันได้ทั้งข้อความ รูป และลำดับ สิ่งที่ตรวจคือโครงสร้าง เช่น มีหัวข้อหลักหนึ่งอัน มีรูปที่อธิบายด้วย alt และเนื้อหาแบ่งเป็นส่วนชัดเจน',
      'วิธีที่ได้ผลคือวางโครงก่อน: header สำหรับชื่อ main สำหรับเนื้อหา และ footer สำหรับข้อมูลติดต่อ แล้วค่อยเติม section ทีละเรื่อง ดูหน้าเว็บเปลี่ยนไปพร้อมกับโค้ดทุกครั้ง',
      'ถ้าข้อกำหนดข้อไหนยังไม่ผ่าน ให้อ่านว่ามันขาดอะไร แก้จุดเดียว แล้วดูผล การแก้ทีละจุดทำให้รู้ว่าโค้ดส่วนไหนทำให้เกิดอะไรบนหน้า',
    ],
    workedExamples: [
      { id: 'we-1', skillId: BUILD, problem: 'ตัวอย่างหน้าแนะนำตัวที่ผ่านข้อกำหนด (ของคุณไม่ต้องเหมือน)', code: '<header>\n  <h1>ต้นข้าว</h1>\n</header>\n<main>\n  <section>\n    <h2>เกี่ยวกับฉัน</h2>\n    <p>เรียน ปวช. ช่างอิเล็กทรอนิกส์ ปีที่ 2 ชอบประกอบวงจร</p>\n    <img src="laptop.png" alt="โน้ตบุ๊กที่ใช้เขียนโปรแกรม">\n  </section>\n  <section>\n    <h2>ผลงาน</h2>\n    <p><a href="projects.html">ดูผลงานของฉัน</a></p>\n  </section>\n</main>\n<footer>\n  <p>ติดต่อที่ห้อง 2/1</p>\n</footer>', steps: ['วาง header main footer', 'เติม h1 ชื่อใน header', 'ทำ section แนะนำตัวที่มีย่อหน้าและรูป (มี alt)', 'ทำ section ผลงานที่มีลิงก์', 'ตรวจรายการข้อกำหนดทีละข้อ'], answer: 'ผ่านทุกข้อกำหนด', verify: html('<header>\n  <h1>ต้นข้าว</h1>\n</header>\n<main>\n  <section>\n    <h2>เกี่ยวกับฉัน</h2>\n    <p>เรียน ปวช. ช่างอิเล็กทรอนิกส์ ปีที่ 2 ชอบประกอบวงจร</p>\n    <img src="laptop.png" alt="โน้ตบุ๊กที่ใช้เขียนโปรแกรม">\n  </section>\n  <section>\n    <h2>ผลงาน</h2>\n    <p><a href="projects.html">ดูผลงานของฉัน</a></p>\n  </section>\n</main>\n<footer>\n  <p>ติดต่อที่ห้อง 2/1</p>\n</footer>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }, { kind: 'has', tag: 'section', min: 2 }, { kind: 'inside', tag: 'section', parent: 'main' }) },
      { id: 'we-2', skillId: BUILD, problem: 'หน้านี้ไม่ผ่านข้อกำหนด 2 ข้อ: <h1>เว็บ</h1><h1>ของฉัน</h1><img src="cat.png">', code: '<h1>เว็บของฉัน</h1>\n<img src="cat.png" alt="แมวที่บ้านของฉัน">', steps: ['ข้อกำหนด: h1 หนึ่งอัน → รวมเป็นหัวข้อเดียว', 'ข้อกำหนด: รูปต้องมี alt → เพิ่ม alt ที่อธิบายรูป', 'ตรวจอีกครั้ง'], answer: 'h1 เหลือหนึ่งอัน และรูปมี alt', verify: html('<h1>เว็บของฉัน</h1>\n<img src="cat.png" alt="แมวที่บ้านของฉัน">', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'attr', tag: 'img', attr: 'alt' }) },
    ],
    guided: [
      { id: 'g-1', skillId: BUILD, level: 1, prompt: 'เริ่มโครงหน้า: header ที่มี h1 ชื่อคุณ, main และ footer', answer: '<header><h1>ฝน</h1></header>\n<main></main>\n<footer></footer>', explanation: 'วางสามพื้นที่ก่อนเติมเนื้อหา', hint: 'header → main → footer', verify: html('<header><h1>ฝน</h1></header>\n<main></main>\n<footer></footer>', { kind: 'inside', tag: 'h1', parent: 'header' }, { kind: 'has', tag: 'main', max: 1 }, { kind: 'has', tag: 'footer' }) },
      { id: 'g-2', skillId: BUILD, level: 1, prompt: 'เขียน section แนะนำตัว: h2 และย่อหน้าอย่างน้อย 20 ตัวอักษร', answer: '<section>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียนบัญชี ชอบทำขนมและถ่ายรูป</p>\n</section>', explanation: 'section เริ่มด้วยหัวข้อ แล้วตามด้วยเนื้อหา', hint: 'section ครอบ h2 กับ p', verify: html('<section>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียนบัญชี ชอบทำขนมและถ่ายรูป</p>\n</section>', { kind: 'contains', tag: 'section', child: 'h2' }, { kind: 'text', tag: 'p', min: 20 }) },
      { id: 'g-3', skillId: BUILD, level: 2, prompt: 'เพิ่มรูป (มี alt) และลิงก์ (มี href) ลงใน section', answer: '<section>\n<h2>งานอดิเรก</h2>\n<img src="mountain.png" alt="ภูเขาที่ไปเที่ยวมา">\n<p><a href="trip.html">อ่านเรื่องทริปนี้</a></p>\n</section>', explanation: 'รูปมี alt ลิงก์มี href และข้อความบอกปลายทาง', hint: 'img ต้องมี src และ alt · a ต้องมี href', verify: html('<section>\n<h2>งานอดิเรก</h2>\n<img src="mountain.png" alt="ภูเขาที่ไปเที่ยวมา">\n<p><a href="trip.html">อ่านเรื่องทริปนี้</a></p>\n</section>', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }) },
    ],
    independent: [
      { id: 'i-1', skillId: BUILD, level: 1, prompt: 'เขียน footer ที่มีย่อหน้าบอกช่องทางติดต่อ', answer: '<footer><p>ติดต่อ: ห้องพักครู แผนกช่างยนต์</p></footer>', explanation: 'ข้อมูลติดต่อเป็นข้อมูลท้ายหน้า', verify: html('<footer><p>ติดต่อ: ห้องพักครู แผนกช่างยนต์</p></footer>', { kind: 'inside', tag: 'p', parent: 'footer' }) },
      { id: 'i-2', skillId: BUILD, level: 1, prompt: 'เขียน header ที่มีหัวข้อหลักเพียงอันเดียว', answer: '<header><h1>หน้าของเจมส์</h1></header>', explanation: 'หัวข้อหลักหนึ่งอันอยู่ในส่วนหัว', verify: html('<header><h1>หน้าของเจมส์</h1></header>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'inside', tag: 'h1', parent: 'header' }) },
      { id: 'i-3', skillId: BUILD, level: 2, prompt: 'main ที่มี section 2 ส่วน (แต่ละส่วนมี h2)', answer: '<main>\n<section><h2>การเรียน</h2><p>ปวส. ไฟฟ้า</p></section>\n<section><h2>เป้าหมาย</h2><p>เรียนต่อวิศวะ</p></section>\n</main>', explanation: 'แบ่งเนื้อหาเป็นเรื่อง ๆ ด้วย section', verify: html('<main>\n<section><h2>การเรียน</h2><p>ปวส. ไฟฟ้า</p></section>\n<section><h2>เป้าหมาย</h2><p>เรียนต่อวิศวะ</p></section>\n</main>', { kind: 'has', tag: 'section', min: 2 }, { kind: 'contains', tag: 'section', child: 'h2' }) },
      { id: 'i-4', skillId: BUILD, level: 2, prompt: 'แก้หน้านี้ให้ผ่าน: รูปไม่มี alt และลิงก์ไม่มี href — <img src="school.png"> <a>ข่าวโรงเรียน</a>', answer: '<img src="school.png" alt="อาคารเรียนของวิทยาลัย">\n<a href="news.html">ข่าวโรงเรียน</a>', explanation: 'เติม alt ที่อธิบายรูป และ href ที่บอกปลายทาง', verify: html('<img src="school.png" alt="อาคารเรียนของวิทยาลัย">\n<a href="news.html">ข่าวโรงเรียน</a>', { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }) },
      { id: 'i-5', skillId: BUILD, level: 3, prompt: 'หน้าแนะนำตัวเต็ม: h1 หนึ่งอัน, ย่อหน้าแนะนำตัว, รูปที่มี alt, ลิงก์ที่มี href, section อย่างน้อย 2 ส่วนใน main', answer: '<header><h1>แพรว</h1></header>\n<main>\n<section><h2>เกี่ยวกับฉัน</h2><p>เรียนการโรงแรม ชอบพูดคุยกับผู้คน</p><img src="school.png" alt="วิทยาลัยที่ฉันเรียน"></section>\n<section><h2>ติดตาม</h2><p><a href="blog.html">บันทึกการฝึกงาน</a></p></section>\n</main>\n<footer><p>ขอบคุณที่แวะมา</p></footer>', explanation: 'ทุกข้อกำหนดผ่าน หน้าตาและเนื้อหาเป็นของคุณเอง', verify: html('<header><h1>แพรว</h1></header>\n<main>\n<section><h2>เกี่ยวกับฉัน</h2><p>เรียนการโรงแรม ชอบพูดคุยกับผู้คน</p><img src="school.png" alt="วิทยาลัยที่ฉันเรียน"></section>\n<section><h2>ติดตาม</h2><p><a href="blog.html">บันทึกการฝึกงาน</a></p></section>\n</main>\n<footer><p>ขอบคุณที่แวะมา</p></footer>', { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'p' }, { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }, { kind: 'has', tag: 'section', min: 2 }, { kind: 'inside', tag: 'section', parent: 'main' }) },
      { id: 'i-6', skillId: BUILD, level: 3, prompt: 'หน้าร้านค้าเล็ก ๆ: header ชื่อร้าน, main มี section สินค้า (รูปมี alt) และ section ติดต่อ (ลิงก์), footer', answer: '<header><h1>ร้านขนมแม่ศรี</h1></header>\n<main>\n<section><h2>สินค้า</h2><img src="cat.png" alt="คุกกี้รูปแมว"></section>\n<section><h2>สั่งซื้อ</h2><a href="order.html">สั่งขนมออนไลน์</a></section>\n</main>\n<footer><p>เปิดทุกวัน</p></footer>', explanation: 'ใช้โครงเดิมกับเนื้อหาใหม่ได้ — นี่คือการนำไปใช้ในสถานการณ์ใหม่', verify: html('<header><h1>ร้านขนมแม่ศรี</h1></header>\n<main>\n<section><h2>สินค้า</h2><img src="cat.png" alt="คุกกี้รูปแมว"></section>\n<section><h2>สั่งซื้อ</h2><a href="order.html">สั่งขนมออนไลน์</a></section>\n</main>\n<footer><p>เปิดทุกวัน</p></footer>', { kind: 'inside', tag: 'h1', parent: 'header' }, { kind: 'has', tag: 'section', min: 2 }, { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }, { kind: 'has', tag: 'footer' }) },
    ],
    checks: [
      { id: 'k-1', skillId: BUILD, prompt: 'ข้อกำหนด “มีรูปที่อธิบายได้” ตรวจจากอะไร', choices: ['สีของรูป', 'มี img และ img มี alt', 'ขนาดไฟล์รูป', 'รูปต้องเป็นแมว'], correctIndex: 1, explanation: 'ตรวจโครงสร้าง: มี img และมี alt', verify: html('<img src="cat.png" alt="แมว">', { kind: 'attr', tag: 'img', attr: 'alt' }) },
      { id: 'k-2', skillId: BUILD, prompt: 'หน้าเว็บของคุณกับของเพื่อนหน้าตาต่างกัน แต่ผ่านข้อกำหนดทุกข้อ', choices: ['ของคุณผิด', 'ผ่านทั้งคู่', 'ต้องแก้ให้เหมือนกัน', 'ของเพื่อนผิด'], correctIndex: 1, explanation: 'ตรวจโครงสร้าง ไม่ใช่ความเหมือน', misconceptions: [{ choice: 2, mistake: 2 }] },
      { id: 'k-3', skillId: BUILD, prompt: 'ถ้าข้อกำหนดข้อหนึ่งยังไม่ผ่าน ควรทำอย่างไร', choices: ['ลบโค้ดทั้งหมดแล้วเริ่มใหม่', 'อ่านว่าขาดอะไร แก้จุดนั้น แล้วดูผล', 'เพิ่ม h1 อีกอัน', 'ข้ามไป'], correctIndex: 1, explanation: 'แก้ทีละจุดแล้วดูผล', misconceptions: [{ choice: 0, mistake: 0 }] },
      { id: 'k-4', skillId: BUILD, prompt: 'โค้ดใดเป็นโครงหน้าที่ถูกลำดับ', choices: ['<footer></footer><main></main><header></header>', '<header></header><main></main><footer></footer>', '<main><header></header></main><main></main>', '<head><main></main></head>'], correctIndex: 1, explanation: 'ส่วนหัว → เนื้อหาหลัก → ส่วนท้าย', verify: html('<header></header><main></main><footer></footer>', { kind: 'before', first: 'header', then: 'main' }, { kind: 'before', first: 'main', then: 'footer' }) },
    ],
    mistakes: [
      { mistake: 'เขียนทั้งหน้ารวดเดียวแล้วค่อยตรวจ', why: 'อยากให้เสร็จเร็ว', fix: 'วางโครงก่อน เติมทีละส่วน และดูหน้าเว็บทุกครั้งที่แก้' },
      { mistake: 'มีหัวข้อหลักหลายอัน', why: 'ใช้ h1 กับทุกหัวข้อที่อยากให้เด่น', fix: 'h1 หนึ่งอันสำหรับชื่อหน้า หัวข้ออื่นใช้ h2' },
      { mistake: 'พยายามทำให้เหมือนตัวอย่างทุกอย่าง', why: 'คิดว่าต้องตรงกับเฉลย', fix: 'ตัวอย่างเป็นแค่แนวทาง — ผ่านข้อกำหนดด้วยเนื้อหาของคุณเองก็ถูก' },
    ],
    summary: ['วางโครง header → main → footer ก่อน', 'ตรวจกับข้อกำหนดทีละข้อ', 'หน้าเว็บของคุณไม่ต้องเหมือนใคร ขอแค่โครงสร้างถูก'],
    afterLesson: ['สร้างหน้าเว็บจากข้อกำหนดได้เอง', 'อ่านข้อความแจ้งแล้วแก้โค้ดได้', 'พร้อมเรียน CSS เพื่อแต่งหน้าเว็บนี้'],
    next: [],
    provenance: [
      { ...SRC_MDN_DOC, usedFor: 'โครงหน้า header main section footer' },
      { ...SRC_MDN_IMG, usedFor: 'alt ที่อธิบายรูป' },
      { ...SRC_MDN_A, usedFor: 'ข้อความลิงก์บอกปลายทาง' },
      { ...SRC_MDN_HEAD, usedFor: 'h1 หนึ่งอันต่อหน้า' },
    ],
    audit: { ...AUDIT_COMMON, sourcesFound: ['MDN Learn: Structuring documents', 'MDN: <img>', 'MDN: <a>', 'MDN Learn: Headings and paragraphs'], sourcesSelected: ['mdn-structuring-documents', 'mdn-img-element', 'mdn-a-element', 'mdn-headings-paragraphs'], sourcesRejected: [{ source: 'เทมเพลตหน้าโปรไฟล์สำเร็จรูป', reason: 'บทนี้ให้ผู้เรียนสร้างเอง' }], knowledgeCovered: ['ประกอบทุกส่วนจาก HTML 1–4 ตามข้อกำหนด'], knowledgeMissing: [], limitations: [SOURCE_LIMIT, 'ตรวจเฉพาะโครงสร้าง ไม่ตรวจคุณภาพของถ้อยคำ — ผู้เรียนควรอ่านทวนเอง'], readiness: 'READY_WITH_LIMITATIONS' },
  },
];
