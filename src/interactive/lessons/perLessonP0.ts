/* P0 per-lesson mechanics, wave 1 (docs/per-lesson-learning-mechanics.md, gap map P0).
   Four existing lessons move from "generated" (worked steps + self-rating) to authored, hands-on lessons:
     phy-kin-1d           Motion Over Time
     phy-vec-units        Cancellation Tiles
     math-alg-linear-system  Substitution Machine + Story → Model
     prog-py-io           Be-the-User console
   Every number comes from the lesson's verified knowledge (src/content/knowledge) and is re-checked in
   scripts/test-phase-77.js. No new curriculum, skills or ids. */

import type { InteractiveLesson } from '../types';

/* ── phy-kin-1d ─────────────────────────────────────────────────── */
const KIN = 'skill-phy-kinematics-equations';
const GRAPH = 'skill-math-graph-reading';

export const MOTION_LESSON: InteractiveLesson = {
  lessonId: 'phy-kin-1d',
  contentId: 'v2u-phy-kin-1d',
  source: 'authored',
  mission: { title: 'การเคลื่อนที่แนวตรงด้วยความเร่งคงตัว', goal: 'ดูรถวิ่งจริง ทายตำแหน่งก่อน แล้วค้นพบว่าทำไมระยะในแต่ละวินาทีจึงยาวขึ้นเมื่อมีความเร่ง' },
  steps: [
    {
      id: 'steady', type: 'try', title: 'ความเร็วคงที่: อีก 1 วินาทีรถอยู่ไหน?', skillId: KIN,
      interaction: { kind: 'motion', mode: 'predict', prompt: 'รถวิ่งด้วยความเร็วคงที่ ผ่านไป 1 วินาทีแล้ว (ดูรอย t = 0 และ t = 1) — อีก 1 วินาทีรถจะอยู่ตรงไหน? เลื่อนหมุด แล้วกด RUN', u: 4, a: 0, shownUntil: 1, predictAt: [2, 3], trackMax: 20, tol: 0.5, hint: 'ระยะระหว่างรอย t = 0 กับ t = 1 คือระยะที่รถไปได้ใน 1 วินาที', explanation: 'ความเร็วคงที่ 4 m/s แปลว่าทุกวินาทีรถไปได้ 4 m เท่ากัน รอยจึงห่างเท่ากัน — นี่คือความเร่ง a = 0' },
    },
    {
      id: 'speeding', type: 'try', title: 'เร่งขึ้น: รอยห่างเท่าเดิมไหม?', skillId: KIN,
      interaction: { kind: 'motion', mode: 'predict', prompt: 'คราวนี้รถออกตัวจากหยุดนิ่งแล้วเร่งขึ้น (a = 2 m/s²) — ดูรอย t = 0, 1, 2 แล้วทายว่าตอน t = 3 s รถจะอยู่ที่ไหน', u: 0, a: 2, shownUntil: 2, predictAt: [3, 4], trackMax: 30, tol: 0.5, hint: 'ดูตารางช่อง “ไปได้ในวินาทีนี้”: วินาทีแรก 1 m วินาทีที่สอง 3 m — วินาทีที่สามจะไปได้เท่าไร?', explanation: 'ความเร็วเพิ่มวินาทีละ 2 m/s (v = u + at) ระยะในแต่ละวินาทีจึงยาวขึ้น 1, 3, 5, 7 m … ตำแหน่งรวมตอน t = 3 s คือ s = ut + ½at² = ½ · 2 · 3² = 9 m ไม่ใช่ 7 m แบบที่ระยะห่างเท่าเดิม' },
    },
    {
      id: 'flag', type: 'try', title: 'ตั้งค่าให้ถึงธงพอดี', skillId: GRAPH,
      interaction: { kind: 'motion', mode: 'target', prompt: 'ตั้ง u และ a ให้รถถึงธงที่ 50 m ตอน t = 5 s พอดี — มีหลายคำตอบ ลองให้ได้สักแบบ แล้วสังเกตรอยและกราฟ', u: 0, a: 0, controls: { u: [0, 15, 1], a: [0, 4, 0.5] }, goal: { type: 'reach', x: 50, t: 5 }, runFor: 5, trackMax: 80, tol: 0.5, hint: 'ถ้า a = 0 ต้องใช้ความเร็วเท่าไรจึงไปได้ 50 m ใน 5 s? หรือถ้า u = 0 ต้องเร่งเท่าไร?', explanation: 'ระยะใน 5 วินาทีคือ s = ut + ½at² จึงได้หลายคู่ เช่น u = 10, a = 0 · u = 0, a = 4 · u = 5, a = 2 — เมื่อ a = 0 กราฟ v–t เป็นเส้นนอนและรอยห่างเท่ากัน เมื่อ a > 0 กราฟเอียงขึ้น (ความชัน = a) และพื้นที่ใต้กราฟคือระยะที่ไปได้' },
    },
    {
      id: 'brake', type: 'try', title: 'เบรกให้หยุดตรงเส้น', skillId: KIN,
      interaction: { kind: 'motion', mode: 'target', prompt: 'รถวิ่ง 20 m/s ต้องหยุดให้ตรงเส้นที่ 50 m — เลือกความเร่ง a แล้วกด RUN', u: 20, a: 0, controls: { a: [-8, 2, 1] }, goal: { type: 'stop', x: 50 }, runFor: 10, trackMax: 120, tol: 0.5, hint: 'ตอนเบรก ความเร็วลดลง ความเร่งจึงต้องมีทิศตรงข้ามกับการเคลื่อนที่ (ติดลบ)', explanation: 'a = −4 m/s² ทำให้ความเร็วลดวินาทีละ 4 m/s รถหยุดใน 5 s และไปได้ 50 m (v² = u² + 2as → 0 = 20² + 2(−4)s → s = 50 m) รอยใกล้กันขึ้นเรื่อย ๆ เพราะรถช้าลง' },
    },
    {
      id: 'pick-equation', type: 'challenge', title: 'เลือกสมการจากสิ่งที่รู้', skillId: KIN,
      interaction: { kind: 'motion', mode: 'equation', prompt: 'แตะการ์ดแต่ละใบว่าโจทย์ “บอกค่า” หรือ “ถาม” แล้วเลือกสมการที่มีแต่สิ่งที่รู้กับสิ่งที่ถาม', u: 0, a: 3, trackMax: 30, tol: 0.5, equation: { story: 'จักรยานเริ่มจากหยุดนิ่ง ความเร่ง 3 m/s² ต้องใช้เวลากี่วินาทีจึงไปได้ 24 m', known: { u: 0, a: 3, s: 24 }, unknown: 't', answer: 4, unit: 's' }, hint: '“เริ่มจากหยุดนิ่ง” บอกค่า u = 0 — โจทย์ไม่ได้บอกและไม่ได้ถามความเร็วปลาย v', explanation: 's = ut + ½at² มี u, a, s ที่รู้ และ t ที่ถาม → 24 = 0 + ½ · 3 · t² → t² = 16 → t = 4 s' },
    },
  ],
  finalCheck: [],
  mistakes: ['ลืมใส่เครื่องหมายลบให้ความเร่งตอนเบรก', 'คิดว่ารอยห่างเท่ากันแม้มีความเร่ง', 'เลือกสมการที่มีตัวที่ไม่รู้สองตัว'],
  nextLessonId: 'phy-dyn-newton',
};

/* ── phy-vec-units ──────────────────────────────────────────────── */
const UNITS = 'skill-phy-units';
const T_KM = { id: 'km-m', top: { v: 1, u: 'km' }, bottom: { v: 1000, u: 'm' } };
const T_H = { id: 'h-s', top: { v: 1, u: 'h' }, bottom: { v: 3600, u: 's' } };
const T_MIN = { id: 'min-s', top: { v: 1, u: 'min' }, bottom: { v: 60, u: 's' } };

export const UNITS_LESSON: InteractiveLesson = {
  lessonId: 'phy-vec-units',
  contentId: 'v2u-phy-vec-units',
  source: 'authored',
  mission: { title: 'หน่วย SI และการแปลงหน่วย', goal: 'แปลงหน่วยด้วยการวางตัวประกอบให้หน่วยเดิมตัดกันเอง — ไม่ต้องจำว่าคูณหรือหาร 3.6' },
  steps: [
    {
      id: 'kg-g', type: 'try', title: 'ให้ kg ตัดกันหายไป', skillId: UNITS,
      interaction: { kind: 'units', prompt: 'มวล 0.75 kg เป็นกี่กรัม? แตะตัวประกอบ แล้วเลือกว่าจะวางด้านไหนขึ้น ให้ kg ตัดกันหายไป', value: 0.75, from: { num: ['kg'], den: [] }, to: { num: ['g'], den: [] }, tiles: [{ id: 'kg-g', top: { v: 1, u: 'kg' }, bottom: { v: 1000, u: 'g' } }], answer: 750, hint: 'kg ที่มีอยู่อยู่ด้านบน — kg ของตัวประกอบจึงต้องอยู่ด้านล่างเพื่อให้ตัดกัน', explanation: '1000 g / 1 kg เท่ากับ 1 การคูณจึงไม่เปลี่ยนมวลจริง แค่เปลี่ยนหน่วย: kg บนกับ kg ล่างตัดกัน เหลือ g → 0.75 × 1000 = 750 g' },
    },
    {
      id: 'kmh-ms', type: 'try', title: '72 km/h เป็น m/s', skillId: UNITS,
      interaction: { kind: 'units', prompt: 'รถวิ่ง 72 km/h คิดเป็นกี่ m/s? ต้องเปลี่ยนทั้ง km และ h — เลือกตัวประกอบที่ใช้ได้ และวางให้ถูกด้าน', value: 72, from: { num: ['km'], den: ['h'] }, to: { num: ['m'], den: ['s'] }, tiles: [T_KM, T_H, T_MIN], predict: 'smaller', answer: 20, hint: 'km อยู่บน จึงต้องมี km อยู่ล่างในตัวประกอบ · h อยู่ล่าง จึงต้องมี h อยู่บนในตัวประกอบ', explanation: '72 × (1000 m / 1 km) × (1 h / 3600 s) = 72 × 1000 ÷ 3600 = 20 m/s — ตัวเลข 3.6 มาจาก 3600 ÷ 1000 ที่คุณวางเอง ตัวเลขน้อยลงเพราะ 1 วินาทีสั้นกว่า 1 ชั่วโมงมาก ระยะในเวลาสั้นกว่าจึงน้อยกว่า' },
    },
    {
      id: 'ms-kmh', type: 'challenge', title: 'กลับทาง: 15 m/s เป็น km/h', skillId: UNITS,
      interaction: { kind: 'units', prompt: 'กลับทาง: 15 m/s เป็นกี่ km/h? วางตัวประกอบเอง แล้วคำนวณตัวเลขเอง', value: 15, from: { num: ['m'], den: ['s'] }, to: { num: ['km'], den: ['h'] }, tiles: [T_KM, T_H, T_MIN], learnerComputes: true, answer: 54, hint: 'ตอนนี้ m อยู่บนและ s อยู่ล่าง — ตัวประกอบต้องวาง m ไว้ล่าง และ s ไว้บน', explanation: '15 × (1 km / 1000 m) × (3600 s / 1 h) = 15 × 3600 ÷ 1000 = 54 km/h — กลับทางจึงกลายเป็น × 3.6 ไม่ต้องจำว่าคูณหรือหาร แค่ให้หน่วยตัดกัน' },
    },
  ],
  finalCheck: [],
  mistakes: ['คูณ 3.6 แทนที่จะหาร', 'วางตัวประกอบกลับด้านจนหน่วยไม่หาย', 'ใช้ตัวประกอบที่ไม่เกี่ยวข้อง เช่น นาที เมื่อโจทย์เป็นชั่วโมง'],
  nextLessonId: 'phy-vec-vectors',
};

/* ── math-alg-linear-system ─────────────────────────────────────── */
const SYS = 'skill-math-linear-system';
const WORD = 'skill-math-word-problem';

export const LINEAR_SYSTEM_LESSON: InteractiveLesson = {
  lessonId: 'math-alg-linear-system',
  contentId: 'v2u-math-alg-linear-system',
  source: 'authored',
  mission: { title: 'ระบบสมการเชิงเส้นสองตัวแปร', goal: 'หาคู่ (x, y) ที่ทำให้ทั้งสองสมการจริง ด้วยการแทนค่า และแปลงเรื่องราวเป็นระบบสมการเอง' },
  steps: [
    {
      id: 'substitute', type: 'try', title: 'เครื่องแทนค่า', skillId: SYS,
      interaction: { kind: 'substitute', prompt: 'แทนที่จะเดาคู่ ลองใช้เครื่องแทนค่า: ทำให้สมการ ① มี x อยู่คนเดียว แล้วเอาไปแทน x ทุกตัวในสมการ ②', relation: { a: 1, b: -1, c: 2 }, target: { a: 3, b: 2, c: 16 }, hint: 'x กับ y + 2 คือจำนวนเดียวกัน จึงแทนกันได้ทุกที่ที่มี x', explanation: 'x กับ y + 2 คือจำนวนเดียวกัน การแทนจึงไม่เปลี่ยนความหมายของสมการ ② แต่ทำให้เหลือตัวแปรเดียว: 3(y + 2) + 2y = 16 → 5y + 6 = 16 → y = 2 แล้ว x = y + 2 = 4 — และคู่ (4, 2) ทำให้ทั้งสองสมการจริง' },
    },
    {
      id: 'tickets', type: 'try', title: 'แปลงเรื่องราวเป็นสมการ', skillId: WORD,
      interaction: {
        kind: 'story', kindOfStory: 'money-count',
        prompt: 'อ่านเรื่อง แล้วสร้างระบบสมการเอง',
        story: 'ร้านขายตั๋วผู้ใหญ่ใบละ 60 บาท ตั๋วเด็กใบละ 40 บาท วันนี้ขายได้ทั้งหมด 20 ใบ ได้เงินรวม 1,040 บาท ขายตั๋วผู้ใหญ่และตั๋วเด็กไปอย่างละกี่ใบ?',
        phrases: [
          { id: 'adult', text: 'จำนวนตั๋วผู้ใหญ่', is: 'x' },
          { id: 'child', text: 'จำนวนตั๋วเด็ก', is: 'y' },
          { id: 'price', text: 'ราคาตั๋วผู้ใหญ่', is: 'given' },
          { id: 'total', text: 'เงินรวม', is: 'given' },
        ],
        names: { x: 'จำนวนตั๋วผู้ใหญ่', y: 'จำนวนตั๋วเด็ก' },
        chips: [
          { id: 'one', label: '1', value: 1, measure: 'number', says: '1 (นับเป็นใบ)' },
          { id: 'p60', label: '60', value: 60, measure: 'money', belongsTo: 'x', says: 'ราคาตั๋วผู้ใหญ่ 60 บาท' },
          { id: 'p40', label: '40', value: 40, measure: 'money', belongsTo: 'y', says: 'ราคาตั๋วเด็ก 40 บาท' },
          { id: 'n20', label: '20', value: 20, measure: 'count', says: 'ขายได้ 20 ใบ' },
          { id: 'm1040', label: '1040', value: 1040, measure: 'money', says: 'เงินรวม 1,040 บาท' },
        ],
        rows: [
          { id: 'count', label: 'นับจำนวนตั๋ว', storySays: 'ขายได้ทั้งหมด 20 ใบ', expect: { a: 1, b: 1, c: 20 } },
          { id: 'money', label: 'นับเงิน', storySays: 'ได้เงินรวม 1,040 บาท', expect: { a: 60, b: 40, c: 1040 } },
        ],
        solution: { x: 12, y: 8 },
        hint: 'เรื่องนี้นับสองอย่าง: นับ “ใบ” (แต่ละใบนับ 1) และนับ “เงิน” (แต่ละใบนับตามราคา) — แต่ละอย่างได้หนึ่งสมการ',
        explanation: 'เรื่องราวนับสองอย่างจึงได้สองสมการ: (ตั๋วผู้ใหญ่) + (ตั๋วเด็ก) = 20 จากการนับใบ และ 60·(ตั๋วผู้ใหญ่) + 40·(ตั๋วเด็ก) = 1040 จากการนับเงิน — ขายตั๋วผู้ใหญ่ 12 ใบ ตั๋วเด็ก 8 ใบ ทำให้ทั้งสองจริง: 12 + 8 = 20 และ 720 + 320 = 1040',
      },
    },
    {
      id: 'numbers', type: 'challenge', title: 'โจทย์ใหม่ ช่วยน้อยลง', skillId: WORD,
      interaction: {
        kind: 'story', kindOfStory: 'numbers',
        prompt: 'สร้างระบบสมการจากเรื่องนี้เอง แล้วหาคำตอบ',
        story: 'จำนวนสองจำนวนบวกกันได้ 40 ลบกันได้ 6 จำนวนทั้งสองคืออะไร?',
        names: { x: 'จำนวนที่มากกว่า', y: 'จำนวนที่น้อยกว่า' },
        chips: [
          { id: 'one', label: '1', value: 1, measure: 'number', says: '1' },
          { id: 'neg', label: '−1', value: -1, measure: 'number', says: '−1 (ลบออก)' },
          { id: 'c40', label: '40', value: 40, measure: 'number', says: 'ผลบวก 40' },
          { id: 'c6', label: '6', value: 6, measure: 'number', says: 'ผลต่าง 6' },
        ],
        rows: [
          { id: 'sum', label: 'ผลบวก', storySays: 'สองจำนวนบวกกันได้ 40', expect: { a: 1, b: 1, c: 40 } },
          { id: 'diff', label: 'ผลต่าง', storySays: 'จำนวนที่มากกว่าลบจำนวนที่น้อยกว่าได้ 6', expect: { a: 1, b: -1, c: 6 } },
        ],
        solution: { x: 23, y: 17 },
        hint: '“ลบกันได้ 6” คือ ตัวมาก − ตัวน้อย = 6 จึงต้องมีตัวคูณ −1 หน้า y',
        explanation: 'x + y = 40 และ x − y = 6 — บวกสองสมการได้ 2x = 46 → x = 23 แล้ว y = 17 ตรวจ: 23 + 17 = 40 และ 23 − 17 = 6',
      },
    },
  ],
  finalCheck: [],
  mistakes: ['หาได้ตัวแปรเดียวแล้วหยุด', 'ตรวจกับสมการเดียว', 'บวก “จำนวนใบ” กับ “เงิน” ในสมการเดียวกัน'],
  nextLessonId: 'math-alg-linear-ineq',
};

/* ── prog-py-io ─────────────────────────────────────────────────── */
const IO = 'skill-prog-io';
const AGE_STR = 'age = input("อายุ: ")\nprint(age + 1)';
const AGE_F = 'age = int(input("อายุ: "))\nprint("ปีหน้าคุณจะอายุ {age + 1} ปี")';

export const PYTHON_IO_LESSON: InteractiveLesson = {
  lessonId: 'prog-py-io',
  contentId: 'v2u-prog-py-io',
  source: 'authored',
  mission: { title: 'รับค่าและแสดงผล', goal: 'เป็นผู้ใช้ของโปรแกรมเอง — พิมพ์ค่าเข้าไป แล้วดูว่าค่าไปอยู่ในหน่วยความจำเป็นชนิดอะไร' },
  steps: [
    {
      id: 'greet', type: 'try', title: 'โปรแกรมรอคุณ', skillId: IO,
      interaction: { kind: 'console', goal: 'run', prompt: 'กด RUN แล้วเป็นผู้ใช้ของโปรแกรมนี้ — โปรแกรมจะหยุดรอให้คุณพิมพ์ชื่อ', program: 'name = input("ชื่อของคุณ: ")\nprint("สวัสดี", name)', hint: 'กด RUN แล้วพิมพ์ชื่อของคุณในช่องคอนโซล แล้วกด Enter', explanation: 'input() หยุดโปรแกรมรอผู้ใช้ สิ่งที่คุณพิมพ์ถูกเก็บในตัวแปร name แล้วบรรทัดถัดไปจึงทำงาน — print แสดงหลายค่าโดยคั่นด้วยช่องว่าง' },
    },
    {
      id: 'double', type: 'think', title: '5 + 5 ได้เท่าไร?', skillId: IO,
      interaction: { kind: 'console', goal: 'predict', prompt: 'โปรแกรมนี้รับตัวเลขแล้วแสดง x + x', program: 'x = input("ตัวเลข: ")\nprint(x + x)', predictions: [{ input: '5', choices: ['10', '55', 'x + x'], correctIndex: 1 }, { input: '7', choices: ['14', '77', '49'], correctIndex: 1 }], hint: 'ดูหน่วยความจำหลังพิมพ์: x เป็นชนิดอะไร?', explanation: 'input() ให้ข้อความ (str) เสมอ แม้จะพิมพ์ตัวเลข — "5" + "5" คือการต่อข้อความ ได้ "55" ไม่ใช่การบวกเลข' },
    },
    {
      id: 'age', type: 'try', title: 'ทำไม error?', skillId: IO,
      interaction: {
        kind: 'console', goal: 'fix', prompt: 'โปรแกรมนี้จะบอกอายุปีหน้า — RUN แล้วพิมพ์อายุของคุณ ดูว่าเกิดอะไรขึ้น แล้วแก้โค้ด', program: AGE_STR,
        fixes: [
          { label: 'age = int(input("อายุ: "))', program: 'age = int(input("อายุ: "))\nprint(age + 1)', correct: true },
          { label: 'age = str(input("อายุ: "))', program: 'age = str(input("อายุ: "))\nprint(age + 1)', correct: false },
          { label: 'print(age + "1")', program: 'age = input("อายุ: ")\nprint(age + "1")', correct: false },
        ],
        hint: 'ดูหน่วยความจำ: age เป็น str — ตัวเลขที่บวกได้ต้องเป็น int',
        explanation: '"16" เป็นข้อความ บวกกับเลข 1 ไม่ได้ (TypeError) — int(...) แปลง "16" → 16 แล้วจึงบวกได้ 17 · str(...) ไม่ช่วยเพราะยังเป็นข้อความ · age + "1" ได้ "161" ซึ่งไม่ใช่อายุปีหน้า',
      },
    },
    {
      id: 'fstring', type: 'challenge', title: 'ทำไมแสดง {age + 1}?', skillId: IO,
      interaction: {
        kind: 'console', goal: 'fix', prompt: 'โปรแกรมนี้ไม่ error แต่ผลลัพธ์แปลก — RUN ดูก่อน แล้วแก้ให้แสดงอายุปีหน้าจริง', program: AGE_F,
        fixes: [
          { label: 'print(f"ปีหน้าคุณจะอายุ {age + 1} ปี")', program: 'age = int(input("อายุ: "))\nprint(f"ปีหน้าคุณจะอายุ {age + 1} ปี")', correct: true },
          { label: 'print("ปีหน้าคุณจะอายุ", age + 1, "ปี")', program: 'age = int(input("อายุ: "))\nprint("ปีหน้าคุณจะอายุ", age + 1, "ปี")', correct: true },
          { label: 'print("ปีหน้าคุณจะอายุ {age} + 1 ปี")', program: 'age = int(input("อายุ: "))\nprint("ปีหน้าคุณจะอายุ {age} + 1 ปี")', correct: false },
        ],
        hint: 'ข้อความธรรมดาไม่รู้จัก { } — ต้องมีตัว f หน้าเครื่องหมายคำพูด หรือส่งค่าให้ print แยกกัน',
        explanation: 'ถ้าไม่มีตัว f ข้อความ {age + 1} ถูกพิมพ์ตรง ๆ · f"…{age + 1}…" แทนค่าที่คำนวณลงในข้อความ · หรือส่งค่าให้ print หลายตัวคั่นด้วยจุลภาคก็ได้ผลเหมือนกัน',
      },
    },
  ],
  finalCheck: [],
  mistakes: ['นำค่าจาก input() ไปคำนวณโดยไม่แปลงชนิด', 'ลืมตัว f หน้า f-string แล้วได้ข้อความ {x} ออกมาตรง ๆ', 'คิดว่า str() ช่วยให้บวกเลขได้'],
  nextLessonId: 'prog-ctrl-conditions',
};

export const P0_LESSONS: InteractiveLesson[] = [MOTION_LESSON, UNITS_LESSON, LINEAR_SYSTEM_LESSON, PYTHON_IO_LESSON];
