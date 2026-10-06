/* Web track — HTML reference lessons (authored). Each `html` step opens the HTML Live Web Builder:
   CODE → PAGE, checked on the parsed DOM. Support shrinks lesson by lesson:
   1 prepared blocks · 2 place / fix pieces · 3 edit attributes · 4 rearrange + complete structure · 5 free building.
   Facts match src/content/knowledge/web.ts; no new curriculum. */

import type { InteractiveLesson } from '../types';

const EL = 'skill-web-html-element';
const TEXT = 'skill-web-html-text-structure';
const NEST = 'skill-web-html-nesting';
const ATTR = 'skill-web-html-attributes';
const LINK = 'skill-web-html-links-images';
const PAGE = 'skill-web-html-page-structure';
const BUILD = 'skill-web-html-page-build';

export const HTML_ELEMENTS_LESSON: InteractiveLesson = {
  lessonId: 'web-html-elements',
  contentId: 'v2u-web-html-elements',
  source: 'authored',
  mission: { title: 'HTML ทำให้หน้าเว็บเกิดขึ้นได้อย่างไร', goal: 'วางโค้ดแล้วดูหน้าเว็บเกิดขึ้นทันที — แล้วสร้างหน้าแรกของคุณเอง' },
  steps: [
    {
      id: 'place-h1', type: 'try', title: 'วางบล็อกแรก', skillId: EL,
      interaction: { kind: 'html', focus: 'blocks', prompt: 'ลากบล็อกนี้ไปวางบนหน้าเว็บ (หรือกดปุ่ม “วาง”) แล้วดูว่าเกิดอะไรขึ้น', starter: '', blocks: [{ label: 'หัวข้อหลัก', html: '<h1>Hi</h1>' }], requirements: [{ kind: 'has', tag: 'h1' }], solution: '<h1>Hi</h1>', hint: 'กดปุ่ม “วาง · หัวข้อหลัก” หรือลากไปวางในช่องหน้าเว็บ', explanation: '<h1> สร้างหัวข้อหลัก — โค้ดหนึ่งบรรทัด ทำให้เกิดหัวข้อหนึ่งอันบนหน้าเว็บ สังเกตว่าบนหน้าไม่มี <h1> ให้เห็น มีแต่คำว่า Hi' },
    },
    {
      id: 'place-p', type: 'try', title: 'เพิ่มย่อหน้า', skillId: EL,
      interaction: { kind: 'html', focus: 'blocks', prompt: 'วางย่อหน้าต่อใต้หัวข้อ แล้วเทียบดูว่าหน้าตาต่างจากหัวข้ออย่างไร', starter: '<h1>Hi</h1>', blocks: [{ label: 'ย่อหน้า', html: '<p>Hello</p>' }], requirements: [{ kind: 'has', tag: 'h1' }, { kind: 'has', tag: 'p' }, { kind: 'before', first: 'h1', then: 'p' }], solution: '<h1>Hi</h1>\n<p>Hello</p>', hint: 'วางบล็อก “ย่อหน้า” — มันจะต่อท้ายโค้ด จึงอยู่ใต้หัวข้อ', explanation: '<p> สร้างย่อหน้า ตัวเล็กกว่าหัวข้อเพราะหน้าที่ต่างกัน และอยู่ใต้หัวข้อเพราะหน้าเว็บเรียงตามลำดับโค้ด' },
    },
    {
      id: 'what-shows', type: 'think', title: 'โค้ดนี้สร้างอะไร?', skillId: EL,
      interaction: { kind: 'choice', prompt: 'โค้ด <p>Hello</p> ทำให้หน้าเว็บแสดงอะไร', choices: ['<p>Hello</p>', 'Hello (เป็นย่อหน้า)', 'p'], correctIndex: 1, hint: 'ดูหน้าเว็บที่เพิ่งสร้าง — มีเครื่องหมาย < > ให้เห็นไหม?', explanation: 'แท็กไม่แสดงบนหน้า มันบอกเบราว์เซอร์ว่าเนื้อหาคืออะไร ส่วนที่เห็นคือเนื้อหา' },
    },
    {
      id: 'edit-text', type: 'try', title: 'แก้เนื้อหา', skillId: EL,
      interaction: { kind: 'html', focus: 'anatomy', prompt: 'แก้คำว่า Hi ในโค้ดให้เป็นชื่อของคุณ — แตะ <h1> ในแผนผังโค้ดเพื่อดูว่าส่วนไหนคือ “เนื้อหา”', starter: '<h1>Hi</h1>\n<p>Hello</p>', requirements: [{ kind: 'has', tag: 'h1' }, { kind: 'text-not', tag: 'h1', text: 'Hi' }], solution: '<h1>วีริศ</h1>\n<p>Hello</p>', hint: 'แก้เฉพาะตัวอักษรระหว่าง <h1> กับ </h1> อย่าลบแท็ก', explanation: 'คุณแก้แค่เนื้อหา แท็กเปิด <h1> กับแท็กปิด </h1> ยังอยู่ หน้าเว็บจึงยังเป็นหัวข้อหลัก แต่ข้อความเปลี่ยนเป็นของคุณ' },
    },
    {
      id: 'own-page', type: 'challenge', title: 'หน้าแรกของคุณ', skillId: EL,
      interaction: { kind: 'html', focus: 'blocks', prompt: 'สร้างหน้าของคุณเอง: หัวข้อหลัก 1 อัน และย่อหน้า 1 ย่อหน้า — คราวนี้บล็อกว่าง คุณพิมพ์เนื้อหาเอง', starter: '', blocks: [{ label: 'หัวข้อหลัก (ว่าง)', html: '<h1></h1>' }, { label: 'ย่อหน้า (ว่าง)', html: '<p></p>' }], requirements: [{ kind: 'has', tag: 'h1', max: 1 }, { kind: 'text', tag: 'h1', min: 1 }, { kind: 'has', tag: 'p' }, { kind: 'text', tag: 'p', min: 2 }, { kind: 'before', first: 'h1', then: 'p' }, { kind: 'closed' }], solution: '<h1>สวัสดี ฉันชื่อมิ้นท์</h1>\n<p>ฉันชอบวาดรูปและเล่นเกม</p>', hint: 'วางบล็อกว่างทั้งสองอัน แล้วพิมพ์ข้อความระหว่างแท็กเปิดกับแท็กปิด', explanation: 'หัวข้อหลักหนึ่งอันตามด้วยย่อหน้า — นี่คือหน้าเว็บที่ใช้ได้จริงหน้าแรกของคุณ' },
    },
  ],
  finalCheck: [],
  mistakes: ['ลืมแท็กปิด', 'คิดว่าแท็กแสดงบนหน้าเว็บ', 'เลือกแท็กเพราะขนาดตัวอักษร'],
  nextLessonId: 'web-html-text',
};

export const HTML_TEXT_LESSON: InteractiveLesson = {
  lessonId: 'web-html-text',
  contentId: 'v2u-web-html-text',
  source: 'authored',
  mission: { title: 'ข้อความและโครงสร้างเนื้อหา', goal: 'จัดหัวข้อเป็นลำดับ และหาว่าแท็กไหนยังไม่ได้ปิด' },
  steps: [
    {
      id: 'levels', type: 'try', title: 'หัวข้อหลายระดับ', skillId: TEXT,
      interaction: { kind: 'html', focus: 'blocks', prompt: 'วางหัวข้อรอง (h2) ใต้หัวข้อหลัก แล้ววางย่อหน้าใต้หัวข้อรอง', starter: '<h1>เกี่ยวกับฉัน</h1>', blocks: [{ label: 'หัวข้อรอง', html: '<h2>งานอดิเรก</h2>' }, { label: 'ย่อหน้า', html: '<p>ชอบเล่นดนตรี</p>' }, { label: 'หัวข้อย่อย', html: '<h3>เครื่องดนตรี</h3>' }], requirements: [{ kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'h2' }, { kind: 'has', tag: 'p' }, { kind: 'before', first: 'h2', then: 'p' }], solution: '<h1>เกี่ยวกับฉัน</h1>\n<h2>งานอดิเรก</h2>\n<p>ชอบเล่นดนตรี</p>', hint: 'วาง “หัวข้อรอง” ก่อน แล้วค่อยวาง “ย่อหน้า”', explanation: 'h2 เป็นหัวข้อย่อยของ h1 จึงเล็กกว่าเล็กน้อย — ลำดับหัวข้อคือโครงของเนื้อหา เหมือนสารบัญ' },
    },
    {
      id: 'fix-close', type: 'try', title: 'ส่วนไหนยังไม่ได้ปิด?', skillId: NEST,
      interaction: { kind: 'html', focus: 'anatomy', prompt: 'ทำไมย่อหน้าถึงตัวใหญ่เท่าหัวข้อ? แตะแท็กในแผนผังโค้ด หาแท็กที่ยังไม่มีคู่ แล้วเติมแท็กปิดในโค้ด', starter: '<h1>Hello\n<p>ยินดีที่ได้รู้จัก</p>', requirements: [{ kind: 'closed' }, { kind: 'text-is', tag: 'h1', text: 'Hello' }, { kind: 'has', tag: 'p' }], solution: '<h1>Hello</h1>\n<p>ยินดีที่ได้รู้จัก</p>', hint: '<h1> ยังไม่มี </h1> — เติม </h1> ต่อท้ายคำว่า Hello', explanation: 'ตอนนี้ <h1> มีคู่แล้ว เบราว์เซอร์จึงรู้ว่าหัวข้อจบที่ Hello และย่อหน้ากลับเป็นขนาดปกติ ก่อนหน้านี้มันต้องเดา และเดาว่าย่อหน้าเป็นส่วนหนึ่งของหัวข้อ' },
    },
    {
      id: 'nesting', type: 'try', title: 'กล่องซ้อนกล่อง', skillId: NEST,
      interaction: { kind: 'html', focus: 'anatomy', prompt: 'โค้ดนี้ปิดแท็กสลับลำดับ แก้ให้ strong อยู่ข้างใน p ทั้งตัว', starter: '<p>ฉันชอบ <strong>ดนตรี</p></strong>', requirements: [{ kind: 'closed' }, { kind: 'contains', tag: 'p', child: 'strong' }], solution: '<p>ฉันชอบ <strong>ดนตรี</strong></p>', hint: 'strong เปิดทีหลัง จึงต้องปิด </strong> ก่อน </p>', explanation: 'แท็กที่อยู่ข้างในต้องปิดก่อน เหมือนปิดฝากล่องเล็กก่อนกล่องใหญ่ ตอนนี้ “ดนตรี” เป็นคำเน้นอยู่ในย่อหน้าอย่างถูกต้อง' },
    },
    {
      id: 'intro', type: 'challenge', title: 'ส่วนแนะนำตัว', skillId: TEXT,
      interaction: { kind: 'html', focus: 'free', prompt: 'เขียนส่วนแนะนำตัว: หัวข้อหลัก 1 อัน หัวข้อรอง 1 อัน ย่อหน้า 2 ย่อหน้า และเน้นคำสำคัญด้วย strong อย่างน้อย 1 ที่', starter: '<h1>ชื่อของคุณ</h1>\n', blocks: [{ label: 'หัวข้อรอง (ว่าง)', html: '<h2></h2>' }, { label: 'ย่อหน้า (ว่าง)', html: '<p></p>' }, { label: 'คำเน้น', html: '<strong></strong>' }], requirements: [{ kind: 'closed' }, { kind: 'has', tag: 'h1', max: 1 }, { kind: 'has', tag: 'h2' }, { kind: 'has', tag: 'p', min: 2 }, { kind: 'has', tag: 'strong' }, { kind: 'inside', tag: 'strong', parent: 'p' }, { kind: 'before', first: 'h1', then: 'h2' }], solution: '<h1>ต้น</h1>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียน <strong>ช่างยนต์</strong> ปีที่ 2</p>\n<p>ชอบซ่อมรถและขี่จักรยาน</p>', hint: 'คำเน้นต้องอยู่ข้างในย่อหน้า: <p>เรียน <strong>…</strong></p>', explanation: 'หัวข้อเรียงลำดับ ย่อหน้าอยู่ใต้หัวข้อ และคำเน้นซ้อนอยู่ในย่อหน้าอย่างถูกต้อง' },
    },
  ],
  finalCheck: [],
  mistakes: ['ลืมปิดหัวข้อ', 'ปิดแท็กสลับลำดับ', 'ข้ามลำดับหัวข้อ'],
  nextLessonId: 'web-html-links-images',
};

export const HTML_LINKS_IMAGES_LESSON: InteractiveLesson = {
  lessonId: 'web-html-links-images',
  contentId: 'v2u-web-html-links-images',
  source: 'authored',
  mission: { title: 'ลิงก์ รูปภาพ และ Attributes', goal: 'เปลี่ยนค่า attribute แล้วดูรูปและลิงก์เปลี่ยนตาม' },
  steps: [
    {
      id: 'img-src', type: 'try', title: 'src → รูปไหน', skillId: ATTR,
      interaction: { kind: 'html', focus: 'attributes', prompt: 'เปลี่ยนค่า src ให้หน้าเว็บแสดงรูปภูเขา (mountain.png) — เปลี่ยนในช่อง src หรือในโค้ดก็ได้', starter: '<img src="cat.png" alt="แมวสีส้มนั่งอยู่">', requirements: [{ kind: 'attr-value', tag: 'img', attr: 'src', value: 'mountain.png' }], solution: '<img src="mountain.png" alt="ภูเขากับดวงอาทิตย์">', hint: 'เลือก mountain.png ในช่อง src', explanation: 'src บอกว่า “รูปไหน” — เปลี่ยนค่า รูปก็เปลี่ยน ทั้งที่แท็ก <img> เหมือนเดิม attribute คือข้อมูลเพิ่มที่อยู่ในแท็กเปิด สังเกตว่า alt ยังเขียนว่าแมวอยู่ — รูปเปลี่ยน คำอธิบายก็ต้องเปลี่ยนตาม (ข้อต่อไปจะได้ลอง)' },
    },
    {
      id: 'img-alt', type: 'try', title: 'alt → คำอธิบายรูป', skillId: LINK,
      interaction: { kind: 'html', focus: 'attributes', prompt: 'รูปนี้ยังไม่มีคำอธิบาย เพิ่ม alt ที่บอกว่ารูปนี้คืออะไร — แล้วลองเปลี่ยน src เป็นไฟล์ที่ไม่มี (เช่น dog.png) ดูว่าหน้าเว็บแสดงอะไรแทน', starter: '<img src="mountain.png">', requirements: [{ kind: 'attr', tag: 'img', attr: 'alt' }], solution: '<img src="mountain.png" alt="ภูเขากับดวงอาทิตย์">', hint: 'พิมพ์คำอธิบายรูปในช่อง alt เช่น ภูเขากับดวงอาทิตย์', explanation: 'alt คือคำอธิบายรูป ถ้ารูปโหลดไม่ได้ เบราว์เซอร์จะแสดง alt แทน และโปรแกรมอ่านหน้าจอจะอ่าน alt ให้คนที่มองไม่เห็นภาพฟัง' },
    },
    {
      id: 'link-href', type: 'try', title: 'href → ลิงก์ไปไหน', skillId: LINK,
      interaction: { kind: 'html', focus: 'attributes', prompt: 'เปลี่ยน href ให้ลิงก์พาไปที่ school.html แล้วกดลิงก์บนหน้าเว็บเพื่อดูปลายทาง', starter: '<p>ดูเพิ่มเติมที่ <a href="home.html">หน้าโรงเรียนของฉัน</a></p>', requirements: [{ kind: 'attr-value', tag: 'a', attr: 'href', value: 'school.html' }, { kind: 'closed' }], solution: '<p>ดูเพิ่มเติมที่ <a href="school.html">หน้าโรงเรียนของฉัน</a></p>', hint: 'แก้ค่าในช่อง href เป็น school.html', explanation: 'href บอกว่า “ลิงก์ไปไหน” ส่วนข้อความระหว่าง <a> กับ </a> คือสิ่งที่ผู้ใช้เห็นและกด' },
    },
    {
      id: 'own-media', type: 'challenge', title: 'รูป + ข้อความ + ลิงก์', skillId: LINK,
      interaction: { kind: 'html', focus: 'free', prompt: 'สร้างส่วนแนะนำของคุณ: รูป 1 รูป (มี src และ alt) ย่อหน้า 1 ย่อหน้า และลิงก์ 1 ลิงก์ที่ข้อความบอกปลายทาง', starter: '', blocks: [{ label: 'รูป', html: '<img src="laptop.png" alt="">' }, { label: 'ย่อหน้า (ว่าง)', html: '<p></p>' }, { label: 'ลิงก์', html: '<a href=""></a>' }], requirements: [{ kind: 'closed' }, { kind: 'attr', tag: 'img', attr: 'src' }, { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'has', tag: 'p' }, { kind: 'attr', tag: 'a', attr: 'href' }, { kind: 'text', tag: 'a', min: 2 }], solution: '<img src="laptop.png" alt="โน้ตบุ๊กของฉัน">\n<p>ฉันชอบเขียนโปรแกรม</p>\n<a href="projects.html">ผลงานของฉัน</a>', hint: 'บล็อก “รูป” ยังมี alt ว่าง และบล็อก “ลิงก์” ยังไม่มี href กับข้อความ — เติมให้ครบ', explanation: 'รูปมีทั้ง src (รูปไหน) และ alt (คำอธิบาย) ลิงก์มี href (ไปไหน) และข้อความที่บอกปลายทาง' },
    },
  ],
  finalCheck: [],
  mistakes: ['ไม่ใส่ alt', 'ลืมเครื่องหมายคำพูด', 'ใส่ </img>'],
  nextLessonId: 'web-html-page-structure',
};

export const HTML_PAGE_STRUCTURE_LESSON: InteractiveLesson = {
  lessonId: 'web-html-page-structure',
  contentId: 'v2u-web-html-page-structure',
  source: 'authored',
  mission: { title: 'โครงสร้างของหน้าเว็บ', goal: 'แตะโค้ดแล้วเห็นพื้นที่บนหน้า — แล้วจัดเนื้อหาให้อยู่ถูกพื้นที่' },
  steps: [
    {
      id: 'regions', type: 'try', title: 'แต่ละส่วนคือพื้นที่ไหน', skillId: PAGE,
      interaction: { kind: 'html', focus: 'regions', prompt: 'แตะ <header> <main> <footer> ในแผนผังโค้ด หรือแตะพื้นที่บนหน้าเว็บ แล้วย้ายบรรทัดลิขสิทธิ์ (©) ไปไว้ในส่วนท้าย', starter: '<header>\n  <h1>สมชาย</h1>\n</header>\n<main>\n  <p>สวัสดีครับ ผมเรียนช่างอิเล็กทรอนิกส์</p>\n  <p>© 2026 สมชาย</p>\n</main>\n<footer>\n</footer>', requirements: [{ kind: 'closed' }, { kind: 'contains', tag: 'footer', child: 'p' }, { kind: 'has', tag: 'p', max: 2 }, { kind: 'inside', tag: 'h1', parent: 'header' }], solution: '<header>\n  <h1>สมชาย</h1>\n</header>\n<main>\n  <p>สวัสดีครับ ผมเรียนช่างอิเล็กทรอนิกส์</p>\n</main>\n<footer>\n  <p>© 2026 สมชาย</p>\n</footer>', hint: 'ตัดบรรทัด <p>© 2026 สมชาย</p> แล้ววางระหว่าง <footer> กับ </footer>', explanation: 'header คือแถบหัว main คือเนื้อหาของหน้านี้ footer คือท้ายหน้า — ข้อมูลลิขสิทธิ์จึงอยู่ใน footer โค้ดที่ซ้อนกันเป็นชั้นคือพื้นที่ที่ซ้อนกันบนหน้า' },
    },
    {
      id: 'skeleton', type: 'try', title: 'โครงเอกสาร', skillId: PAGE,
      interaction: { kind: 'html', focus: 'regions', prompt: 'ห่อเนื้อหาด้วยโครงเอกสาร: วางบล็อก “โครงเอกสาร” แล้วย้ายหัวข้อกับย่อหน้าเข้าไปไว้ใน <body> — สังเกตชื่อบนแท็บของหน้าเว็บ', starter: '<h1>ยินดีต้อนรับ</h1>\n<p>นี่คือหน้าเว็บของฉัน</p>\n', blocks: [{ label: 'โครงเอกสาร', html: '<html>\n<head>\n  <title>หน้าของฉัน</title>\n</head>\n<body>\n\n</body>\n</html>' }], requirements: [{ kind: 'closed' }, { kind: 'has', tag: 'html' }, { kind: 'has', tag: 'head' }, { kind: 'has', tag: 'body' }, { kind: 'written-inside', tag: 'title', parent: 'head' }, { kind: 'written-inside', tag: 'h1', parent: 'body' }, { kind: 'written-inside', tag: 'p', parent: 'body' }], solution: '<html>\n<head>\n  <title>หน้าของฉัน</title>\n</head>\n<body>\n<h1>ยินดีต้อนรับ</h1>\n<p>นี่คือหน้าเว็บของฉัน</p>\n</body>\n</html>', hint: 'วางโครงเอกสาร แล้วตัดสองบรรทัดแรกไปวางในบรรทัดว่างระหว่าง <body> กับ </body>', explanation: 'head เก็บข้อมูลของหน้าอย่าง title ที่ขึ้นบนแท็บ (ไม่แสดงบนหน้า) ส่วน body เก็บทุกอย่างที่มองเห็น' },
    },
    {
      id: 'head-header', type: 'think', title: 'head กับ header', skillId: PAGE,
      interaction: { kind: 'choice', prompt: 'ชื่อที่ขึ้นบนแท็บเบราว์เซอร์อยู่ในแท็กไหน', choices: ['<header>', '<title> ใน <head>', '<h1>', '<footer>'], correctIndex: 1, hint: 'ดูแท็บของหน้าเว็บในข้อที่แล้ว — ชื่อนั้นมาจากส่วนที่ไม่แสดงบนหน้า', explanation: 'head (ไม่แสดง) มี title ที่ขึ้นบนแท็บ · header คือแถบหัวที่มองเห็นบนหน้า' },
    },
    {
      id: 'arrange', type: 'challenge', title: 'จัดหน้าให้เป็นพื้นที่', skillId: PAGE,
      interaction: { kind: 'html', focus: 'regions', prompt: 'จัดเนื้อหาลงพื้นที่: ชื่อใน header · เรื่อง “เกี่ยวกับฉัน” เป็น section ใน main · ข้อมูลติดต่อใน footer', starter: '<h1>มินตรา</h1>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียน ปวช. คอมพิวเตอร์ธุรกิจ</p>\n<p>ติดต่อ: ห้อง 3/2</p>', blocks: [{ label: 'ส่วนหัว', html: '<header>\n\n</header>' }, { label: 'เนื้อหาหลัก', html: '<main>\n\n</main>' }, { label: 'เรื่องหนึ่งเรื่อง', html: '<section>\n\n</section>' }, { label: 'ส่วนท้าย', html: '<footer>\n\n</footer>' }], requirements: [{ kind: 'closed' }, { kind: 'inside', tag: 'h1', parent: 'header' }, { kind: 'inside', tag: 'h2', parent: 'section' }, { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'has', tag: 'main', max: 1 }, { kind: 'contains', tag: 'footer', child: 'p' }], solution: '<header>\n<h1>มินตรา</h1>\n</header>\n<main>\n<section>\n<h2>เกี่ยวกับฉัน</h2>\n<p>เรียน ปวช. คอมพิวเตอร์ธุรกิจ</p>\n</section>\n</main>\n<footer>\n<p>ติดต่อ: ห้อง 3/2</p>\n</footer>', hint: 'คลิกในโค้ดตรงจุดที่อยากวาง แล้วกดบล็อก — บล็อกจะถูกวางตรงตำแหน่งนั้น จากนั้นย้ายบรรทัดเนื้อหาเข้าไป', explanation: 'หน้าเว็บแบ่งเป็นส่วนหัว เนื้อหาหลัก และส่วนท้ายครบแล้ว — โครงแบบนี้คือสิ่งที่ CSS จะใช้จัดหน้าในบทต่อไป' },
    },
  ],
  finalCheck: [],
  mistakes: ['สับสน head กับ header', 'ใช้ div ทุกที่', 'มี main มากกว่าหนึ่งอัน'],
  nextLessonId: 'web-html-project',
};

export const HTML_PROJECT_LESSON: InteractiveLesson = {
  lessonId: 'web-html-project',
  contentId: 'v2u-web-html-project',
  source: 'authored',
  mission: { title: 'Mini Project — หน้าเว็บแรกของฉัน', goal: 'สร้างหน้าเว็บแนะนำตัวของคุณเอง ให้ผ่านทุกข้อกำหนด' },
  steps: [
    {
      id: 'project', type: 'challenge', title: 'หน้าเว็บแนะนำตัวของคุณ', skillId: BUILD,
      interaction: { kind: 'html', focus: 'free', prompt: 'สร้างหน้าเว็บแนะนำตัว เลือกข้อความ รูป และลำดับเองได้ — ดูรายการ “สิ่งที่ต้องทำให้ได้” ด้านล่าง', starter: '<header>\n  <h1>ชื่อของคุณ</h1>\n</header>\n<main>\n\n</main>\n<footer>\n</footer>', blocks: [{ label: 'เรื่องหนึ่งเรื่อง', html: '<section>\n<h2></h2>\n<p></p>\n</section>' }, { label: 'รูป', html: '<img src="laptop.png" alt="">' }, { label: 'ลิงก์', html: '<a href=""></a>' }], requirements: [{ kind: 'closed' }, { kind: 'has', tag: 'h1', max: 1 }, { kind: 'text-not', tag: 'h1', text: 'ชื่อของคุณ' }, { kind: 'has', tag: 'section', min: 2 }, { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'contains', tag: 'section', child: 'h2' }, { kind: 'text', tag: 'p', min: 20, some: true }, { kind: 'attr', tag: 'img', attr: 'src' }, { kind: 'attr', tag: 'img', attr: 'alt' }, { kind: 'attr', tag: 'a', attr: 'href' }], solution: '<header>\n  <h1>ต้นข้าว</h1>\n</header>\n<main>\n  <section>\n    <h2>เกี่ยวกับฉัน</h2>\n    <p>เรียน ปวช. ช่างอิเล็กทรอนิกส์ ปีที่ 2 ชอบประกอบวงจร</p>\n    <img src="laptop.png" alt="โน้ตบุ๊กที่ใช้เขียนโปรแกรม">\n  </section>\n  <section>\n    <h2>ผลงาน</h2>\n    <p>ดูผลงานทั้งหมดได้ที่ <a href="projects.html">หน้าผลงานของฉัน</a></p>\n  </section>\n</main>\n<footer>\n  <p>ติดต่อที่ห้อง 2/1</p>\n</footer>', hint: 'คลิกในโค้ดระหว่าง <main> กับ </main> แล้วกดบล็อก “เรื่องหนึ่งเรื่อง” สองครั้ง จากนั้นเติมหัวข้อ ข้อความ รูป และลิงก์ทีละอย่าง', explanation: 'หน้าเว็บของคุณผ่านทุกข้อกำหนดแล้ว — หน้าตาไม่ต้องเหมือนใคร เพราะสิ่งที่ตรวจคือโครงสร้าง หน้านี้จะเป็นฐานของบทเรียน CSS' },
    },
    {
      id: 'review', type: 'think', title: 'ตรวจด้วยข้อกำหนด', skillId: BUILD,
      interaction: { kind: 'choice', prompt: 'เพื่อนทำหน้าเว็บที่หน้าตาไม่เหมือนของคุณเลย แต่ผ่านทุกข้อกำหนด ถือว่าอย่างไร', choices: ['ของเพื่อนผิด', 'ผ่านทั้งคู่', 'ต้องแก้ให้เหมือนกัน'], correctIndex: 1, hint: 'รายการข้อกำหนดตรวจอะไร — หน้าตา หรือโครงสร้าง?', explanation: 'ข้อกำหนดตรวจโครงสร้างและความเข้าถึงได้ (เช่น alt) ไม่ได้ตรวจความเหมือน งานสร้างสรรค์จึงต่างกันได้' },
    },
  ],
  finalCheck: [],
  mistakes: ['เขียนรวดเดียวแล้วค่อยตรวจ', 'ใช้ h1 หลายอัน', 'พยายามทำให้เหมือนตัวอย่าง'],
};

export const HTML_LESSONS: InteractiveLesson[] = [HTML_ELEMENTS_LESSON, HTML_TEXT_LESSON, HTML_LINKS_IMAGES_LESSON, HTML_PAGE_STRUCTURE_LESSON, HTML_PROJECT_LESSON];
