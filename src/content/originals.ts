/* =========================================================================
   V2U Original Lessons (Phase 51) — one per curriculum lesson
   Written by V2U. Plain Thai, worked examples checked by hand.
   ========================================================================= */

import type { OriginalLesson } from './types';
import { LESSON_DEPTH } from './depth';

const META = { author: 'V2U' as const, version: '1.0.0', createdAt: '2026-10-02', updatedAt: '2026-10-02' };

type Body = Omit<OriginalLesson, 'contentId' | 'author' | 'version' | 'createdAt' | 'updatedAt'>;
const o = (b: Body): OriginalLesson => ({ contentId: `v2u-${b.lessonId}`, ...META, ...b });

const BASE_LESSONS: OriginalLesson[] = [
  o({
    lessonId: 'math-alg-linear-eq',
    relatedLessonIds: ['math-alg-linear-system', 'math-alg-linear-ineq'],
    relatedSkills: ['skill-math-solve-linear', 'skill-math-check-solution'],
    readingMinutes: 7,
    summary: 'สมการเชิงเส้นตัวแปรเดียวคือสมการที่ตัวแปรยกกำลังหนึ่ง เช่น 3x + 5 = 20 เราแก้โดยทำสิ่งเดียวกันทั้งสองข้างจนเหลือ x ตัวเดียว แล้วแทนค่ากลับเพื่อตรวจ',
    keyTerms: [
      { term: 'ตัวแปร', meaning: 'ตัวอักษรแทนค่าที่ยังไม่รู้ เช่น x' },
      { term: 'สมการ', meaning: 'ประโยคที่บอกว่าสองข้างมีค่าเท่ากัน' },
      { term: 'คำตอบ', meaning: 'ค่าของตัวแปรที่ทำให้สองข้างเท่ากันจริง' },
    ],
    what: 'สมการที่มีตัวแปรตัวเดียวและตัวแปรไม่ยกกำลังเกินหนึ่ง เขียนได้ในรูป ax + b = c',
    why: 'เป็นฐานของเกือบทุกเรื่องต่อจากนี้ ทั้งระบบสมการ อสมการ ฟิสิกส์ และการเขียนโปรแกรมคำนวณ',
    steps: [
      'กระจายวงเล็บ (ถ้ามี)',
      'ย้ายพจน์ที่มี x ไปข้างหนึ่ง ตัวเลขไปอีกข้าง — ย้ายข้างแล้วเปลี่ยนเครื่องหมาย',
      'รวมพจน์ที่เหมือนกัน',
      'หารทั้งสองข้างด้วยตัวเลขหน้า x',
      'แทนค่ากลับในสมการเดิมเพื่อตรวจ',
    ],
    examples: [
      { problem: '3x + 5 = 20', steps: ['3x = 20 − 5 = 15', 'x = 15 ÷ 3 = 5', 'ตรวจ: 3(5) + 5 = 20 ✓'] },
      { problem: '2(x − 4) = 10', steps: ['2x − 8 = 10', '2x = 18', 'x = 9', 'ตรวจ: 2(9 − 4) = 10 ✓'] },
    ],
    mistakes: ['ย้ายข้างแต่ลืมเปลี่ยนเครื่องหมาย', 'กระจายวงเล็บไม่ครบทุกตัว เช่น 2(x − 4) เป็น 2x − 4', 'ไม่แทนค่ากลับเพื่อตรวจ'],
    tryIt: [
      { prompt: '5x − 7 = 18', answer: 'x = 5' },
      { prompt: 'x/4 + 3 = 7', answer: 'x = 16' },
    ],
    check: [
      { prompt: 'ถ้า 4x = 2x + 10 แล้ว x เท่าไร', answer: 'x = 5' },
      { prompt: 'ขั้นสุดท้ายที่ควรทำทุกครั้งคืออะไร', answer: 'แทนค่ากลับเพื่อตรวจคำตอบ' },
    ],
    next: 'ระบบสมการเชิงเส้นสองตัวแปร — แก้สองสมการพร้อมกัน',
  }),
  o({
    lessonId: 'math-alg-linear-system',
    relatedLessonIds: ['math-alg-linear-eq', 'math-fn-linear'],
    relatedSkills: ['skill-math-linear-system', 'skill-math-word-problem'],
    readingMinutes: 8,
    summary: 'ระบบสมการสองตัวแปรคือสมการสองสมการที่ต้องเป็นจริงพร้อมกัน แก้ได้สองวิธีหลัก: แทนค่า และกำจัดตัวแปร',
    keyTerms: [
      { term: 'วิธีแทนค่า', meaning: 'หาตัวแปรหนึ่งจากสมการหนึ่ง แล้วแทนในอีกสมการ' },
      { term: 'วิธีกำจัดตัวแปร', meaning: 'บวกหรือลบสองสมการให้ตัวแปรหนึ่งหายไป' },
    ],
    what: 'สมการสองสมการ เช่น x + y = 10 และ x − y = 2 ที่ต้องหา x, y ชุดเดียวที่ทำให้ทั้งคู่เป็นจริง',
    why: 'โจทย์ปัญหาจริงมักมีสองสิ่งที่ไม่รู้ เช่น ราคาของสองอย่าง และเป็นพื้นฐานของกราฟเส้นตรงตัดกัน',
    steps: [
      'ดูว่าตัวแปรไหนกำจัดง่าย (สัมประสิทธิ์เท่ากันหรือเป็น 1)',
      'บวก/ลบสมการ หรือแทนค่า จนเหลือตัวแปรเดียว',
      'แก้สมการตัวแปรเดียว',
      'แทนค่ากลับหาอีกตัว',
      'ตรวจกับทั้งสองสมการ',
    ],
    examples: [
      { problem: 'x + y = 10, x − y = 2', steps: ['บวกกัน: 2x = 12 → x = 6', 'แทน: 6 + y = 10 → y = 4', 'ตรวจ: 6 − 4 = 2 ✓'] },
      { problem: 'ปากกา 2 ด้ามกับดินสอ 1 แท่ง 25 บาท, ปากกา 1 ด้ามกับดินสอ 1 แท่ง 15 บาท', steps: ['2p + d = 25, p + d = 15', 'ลบกัน: p = 10', 'd = 5', 'ปากกา 10 บาท ดินสอ 5 บาท'] },
    ],
    mistakes: ['ลบสมการแต่ลืมลบทุกพจน์', 'หาได้ตัวเดียวแล้วหยุด', 'ตรวจกับสมการเดียว'],
    tryIt: [
      { prompt: '2x + y = 7, x − y = 2', answer: 'x = 3, y = 1' },
      { prompt: 'x + 2y = 8, x = 2', answer: 'x = 2, y = 3' },
    ],
    check: [{ prompt: 'วิธีกำจัดตัวแปรทำงานอย่างไร', answer: 'บวกหรือลบสมการให้ตัวแปรหนึ่งหายไป' }],
    next: 'ฟังก์ชันเชิงเส้นและกราฟ — คำตอบของระบบคือจุดที่เส้นตรงสองเส้นตัดกัน',
  }),
  o({
    lessonId: 'math-alg-linear-ineq',
    relatedLessonIds: ['math-alg-linear-eq'],
    relatedSkills: ['skill-math-solve-inequality'],
    readingMinutes: 6,
    summary: 'อสมการแก้เหมือนสมการ ยกเว้นข้อเดียว: คูณหรือหารด้วยจำนวนลบต้องกลับเครื่องหมาย คำตอบเป็นช่วงของค่า',
    keyTerms: [
      { term: 'อสมการ', meaning: 'ประโยคที่ใช้ <, >, ≤, ≥' },
      { term: 'ช่วงคำตอบ', meaning: 'ค่าทั้งหมดที่ทำให้อสมการเป็นจริง' },
    ],
    what: 'ประโยคเปรียบเทียบที่มีตัวแปร เช่น 2x + 1 > 7',
    why: 'ใช้ตั้งเงื่อนไขจริง เช่น คะแนนอย่างน้อยเท่าไร งบไม่เกินเท่าไร และใช้ในเงื่อนไข if ของโปรแกรม',
    steps: ['แก้เหมือนสมการ', 'ถ้าคูณ/หารด้วยจำนวนลบ ให้กลับเครื่องหมาย', 'เขียนคำตอบเป็นช่วง', 'ลองแทนค่าหนึ่งค่าในช่วงเพื่อตรวจ'],
    examples: [
      { problem: '2x + 1 > 7', steps: ['2x > 6', 'x > 3'] },
      { problem: '−3x ≤ 12', steps: ['หารด้วย −3 และกลับเครื่องหมาย', 'x ≥ −4'] },
    ],
    mistakes: ['ลืมกลับเครื่องหมายเมื่อหารด้วยจำนวนลบ', 'สับสน < กับ ≤'],
    tryIt: [
      { prompt: '4x − 2 < 10', answer: 'x < 3' },
      { prompt: '5 − x ≥ 2', answer: 'x ≤ 3' },
    ],
    check: [{ prompt: 'เมื่อไรต้องกลับเครื่องหมายอสมการ', answer: 'เมื่อคูณหรือหารทั้งสองข้างด้วยจำนวนลบ' }],
    next: 'เลขยกกำลังและราก หรือใช้อสมการในเงื่อนไข if ของ Python',
  }),
  o({
    lessonId: 'math-alg-exponents',
    relatedLessonIds: ['math-trig-ratios'],
    relatedSkills: ['skill-math-exponent-laws'],
    readingMinutes: 7,
    summary: 'aⁿ คือ a คูณกันเอง n ตัว สมบัติหลัก: คูณฐานเดียวกันให้บวกเลขชี้กำลัง หารให้ลบ ยกกำลังซ้อนให้คูณ และราก = เลขชี้กำลังเศษส่วน',
    keyTerms: [
      { term: 'ฐาน', meaning: 'ตัวที่ถูกคูณซ้ำ' },
      { term: 'เลขชี้กำลัง', meaning: 'จำนวนครั้งที่คูณ' },
      { term: 'ราก', meaning: '√a = a^(1/2)' },
    ],
    what: 'วิธีเขียนการคูณซ้ำให้สั้น เช่น 2⁵ = 2×2×2×2×2 = 32',
    why: 'ใช้กับหน่วยวิทยาศาสตร์ (10³, 10⁻⁶) สูตรฟิสิกส์ และความซับซ้อนของโปรแกรม',
    steps: ['aᵐ × aⁿ = aᵐ⁺ⁿ', 'aᵐ ÷ aⁿ = aᵐ⁻ⁿ', '(aᵐ)ⁿ = aᵐⁿ', 'a⁰ = 1 และ a⁻ⁿ = 1/aⁿ', '√a = a^(1/2)'],
    examples: [
      { problem: '2³ × 2⁴', steps: ['ฐานเดียวกัน บวกเลขชี้กำลัง', '2⁷ = 128'] },
      { problem: '(10²)³ ÷ 10⁴', steps: ['10⁶ ÷ 10⁴', '10² = 100'] },
    ],
    mistakes: ['คูณเลขชี้กำลังแทนการบวก (2³×2⁴ ≠ 2¹²)', 'คิดว่า a⁰ = 0', 'ใช้สมบัติกับฐานต่างกัน'],
    tryIt: [
      { prompt: '3² × 3³', answer: '3⁵ = 243' },
      { prompt: '5⁻²', answer: '1/25' },
    ],
    check: [{ prompt: '√16 เขียนเป็นเลขยกกำลังได้อย่างไร และมีค่าเท่าไร', answer: '16^(1/2) = 4' }],
    next: 'อัตราส่วนตรีโกณมิติ — ใช้รากที่สองบ่อยกับมุมพิเศษ',
  }),
  o({
    lessonId: 'math-fn-linear',
    relatedLessonIds: ['math-alg-linear-system', 'phy-kin-1d'],
    relatedSkills: ['skill-math-slope', 'skill-math-graph-reading'],
    readingMinutes: 8,
    summary: 'ฟังก์ชันเชิงเส้น y = mx + c มีกราฟเป็นเส้นตรง m คือความชัน (เพิ่มขึ้นเท่าไรต่อ x หนึ่งหน่วย) c คือจุดตัดแกน y',
    keyTerms: [
      { term: 'ความชัน (m)', meaning: 'การเปลี่ยนของ y หารการเปลี่ยนของ x' },
      { term: 'จุดตัดแกน y (c)', meaning: 'ค่า y เมื่อ x = 0' },
    ],
    what: 'ความสัมพันธ์ที่ y เปลี่ยนเท่ากันทุกครั้งที่ x เพิ่มหนึ่งหน่วย',
    why: 'อ่านกราฟความเร็ว–เวลาในฟิสิกส์ และตีความข้อมูลจริง เช่น ค่าบริการรายเดือน',
    steps: ['หาความชันจากสองจุด: m = (y₂ − y₁)/(x₂ − x₁)', 'หา c โดยแทนจุดหนึ่งใน y = mx + c', 'เขียนสมการ', 'วาด: เริ่มที่ (0, c) แล้วเดินตามความชัน'],
    examples: [{ problem: 'เส้นผ่าน (1, 3) และ (3, 7)', steps: ['m = (7 − 3)/(3 − 1) = 2', '3 = 2(1) + c → c = 1', 'y = 2x + 1'] }],
    mistakes: ['สลับลำดับจุดระหว่างตัวตั้งกับตัวหาร', 'สับสน m กับ c'],
    tryIt: [{ prompt: 'เส้นผ่าน (0, 2) และ (2, 8)', answer: 'y = 3x + 2' }],
    check: [{ prompt: 'ความชันติดลบหมายความว่าอะไร', answer: 'x เพิ่มแล้ว y ลด (เส้นลาดลง)' }],
    next: 'การเคลื่อนที่แนวตรง — ความชันของกราฟ v–t คือความเร่ง',
  }),
  o({
    lessonId: 'math-trig-ratios',
    relatedLessonIds: ['phy-vec-vectors'],
    relatedSkills: ['skill-math-trig-ratio', 'skill-math-special-angles'],
    readingMinutes: 8,
    summary: 'ในสามเหลี่ยมมุมฉาก sin = ข้าม/ฉาก, cos = ชิด/ฉาก, tan = ข้าม/ชิด จำค่ามุม 30° 45° 60° ไว้ใช้บ่อย',
    keyTerms: [
      { term: 'ด้านตรงข้ามมุมฉาก', meaning: 'ด้านยาวที่สุด' },
      { term: 'ด้านตรงข้าม / ด้านประชิด', meaning: 'เทียบกับมุมที่สนใจ' },
    ],
    what: 'อัตราส่วนของด้านในสามเหลี่ยมมุมฉากที่ขึ้นกับมุมเท่านั้น',
    why: 'ใช้แยกเวกเตอร์ในฟิสิกส์ คำนวณความสูง ความลาด และงานช่าง',
    steps: ['ระบุมุมที่สนใจ', 'ติดป้ายด้าน: ข้าม ชิด ฉาก', 'เลือกอัตราส่วนที่มีด้านที่รู้และด้านที่หา', 'แก้สมการ'],
    examples: [{ problem: 'บันไดยาว 4 m พิงผนัง ทำมุม 60° กับพื้น สูงเท่าไร', steps: ['ความสูง = ข้าม, บันได = ฉาก', 'sin 60° = h/4', 'h = 4 × (√3/2) = 2√3 ≈ 3.46 m'] }],
    mistakes: ['ติดป้ายด้านผิดมุม', 'เครื่องคิดเลขอยู่โหมด radian'],
    tryIt: [{ prompt: 'cos 60° × 10', answer: '5' }],
    check: [{ prompt: 'tan 45° เท่าไร', answer: '1' }],
    next: 'เวกเตอร์และการรวมเวกเตอร์',
  }),
  o({
    lessonId: 'prog-py-variables',
    relatedLessonIds: ['prog-py-io'],
    relatedSkills: ['skill-prog-variables', 'skill-prog-operators'],
    readingMinutes: 6,
    summary: 'ตัวแปรคือชื่อที่เก็บค่า ชนิดหลักใน Python: int, float, str, bool นิพจน์คือการคำนวณที่ให้ค่าใหม่',
    keyTerms: [
      { term: 'int / float', meaning: 'จำนวนเต็ม / ทศนิยม' },
      { term: 'str', meaning: 'ข้อความ อยู่ในเครื่องหมายคำพูด' },
      { term: 'bool', meaning: 'True หรือ False' },
    ],
    what: 'การตั้งชื่อให้ค่า เช่น score = 80 แล้วนำไปคำนวณต่อ',
    why: 'ทุกโปรแกรมต้องเก็บและคำนวณค่า',
    steps: ['ตั้งชื่อ = ค่า', 'ตรวจชนิดด้วย type()', 'ใช้ตัวดำเนินการ + − * / // % **', 'เปรียบเทียบด้วย == != < > ได้ค่า bool'],
    examples: [{ problem: 'คิดค่าเฉลี่ยคะแนน 70 และ 90', steps: ['a = 70', 'b = 90', 'avg = (a + b) / 2  # 80.0'] }],
    mistakes: ['ใช้ = แทน == ในการเปรียบเทียบ', '"5" + 3 เกิด error เพราะ str บวก int ไม่ได้', '7 / 2 ได้ 3.5 ส่วน 7 // 2 ได้ 3'],
    tryIt: [{ prompt: 'print(10 % 3)', answer: '1' }],
    check: [{ prompt: 'type(3.0) คืออะไร', answer: 'float' }],
    next: 'รับค่าและแสดงผล',
  }),
  o({
    lessonId: 'prog-py-io',
    relatedLessonIds: ['prog-py-variables', 'prog-ctrl-conditions'],
    relatedSkills: ['skill-prog-io'],
    readingMinutes: 5,
    summary: 'input() รับข้อความจากผู้ใช้เสมอเป็น str ต้องแปลงด้วย int()/float() ก่อนคำนวณ print() กับ f-string ใช้แสดงผล',
    keyTerms: [
      { term: 'input()', meaning: 'รับค่าจากแป้นพิมพ์ (ได้ str)' },
      { term: 'f-string', meaning: 'f"...{ตัวแปร}..." แทรกค่าในข้อความ' },
    ],
    what: 'การสื่อสารระหว่างโปรแกรมกับผู้ใช้',
    why: 'โปรแกรมที่รับค่าได้จึงใช้งานจริงได้',
    steps: ['x = input("ข้อความ")', 'แปลงชนิด: n = int(x)', 'คำนวณ', 'print(f"ผลคือ {n * 2}")'],
    examples: [{ problem: 'รับอายุแล้วบอกอายุปีหน้า', steps: ['age = int(input("อายุ: "))', 'print(f"ปีหน้าคุณอายุ {age + 1}")'] }],
    mistakes: ['ลืมแปลง int() แล้วได้ "17" + 1 error', 'ลืมตัว f หน้า f-string'],
    tryIt: [{ prompt: 'เขียนโปรแกรมรับชื่อแล้วพิมพ์ สวัสดี <ชื่อ>', answer: 'name = input(); print(f"สวัสดี {name}")' }],
    check: [{ prompt: 'input() คืนค่าชนิดอะไร', answer: 'str' }],
    next: 'เงื่อนไข if / elif / else',
  }),
  o({
    lessonId: 'prog-ctrl-conditions',
    relatedLessonIds: ['prog-ctrl-loops', 'math-alg-linear-ineq'],
    relatedSkills: ['skill-prog-conditions'],
    readingMinutes: 6,
    summary: 'if ตรวจเงื่อนไข ถ้าจริงจึงทำบล็อกนั้น elif ตรวจต่อเมื่อข้อก่อนเท็จ else ทำเมื่อไม่มีข้อไหนจริง ย่อหน้ากำหนดว่าโค้ดอยู่บล็อกไหน',
    keyTerms: [
      { term: 'เงื่อนไข', meaning: 'นิพจน์ที่ได้ True/False' },
      { term: 'การย่อหน้า', meaning: 'ช่องว่างหน้าบรรทัดที่บอกขอบเขตบล็อก' },
    ],
    what: 'การเลือกทางเดินของโปรแกรมตามข้อมูล',
    why: 'โปรแกรมจริงต้องตัดสินใจ เช่น ผ่าน/ไม่ผ่าน',
    steps: ['เขียน if เงื่อนไข: แล้วย่อหน้า', 'เพิ่ม elif สำหรับกรณีถัดไป', 'ปิดด้วย else', 'เรียงเงื่อนไขจากเข้มไปหลวม'],
    examples: [{ problem: 'ตัดเกรด: ≥80 A, ≥70 B, อื่น ๆ C', steps: ['if s >= 80: g = "A"', 'elif s >= 70: g = "B"', 'else: g = "C"'] }],
    mistakes: ['เรียง >= 70 ก่อน >= 80 ทำให้ 85 ได้ B', 'ลืม : ท้าย if', 'ย่อหน้าไม่ตรงกัน'],
    tryIt: [{ prompt: 'n = 7 เป็นเลขคู่หรือคี่ (ใช้ %)', answer: 'if n % 2 == 0: คู่ else: คี่ → คี่' }],
    check: [{ prompt: 'elif ทำงานเมื่อไร', answer: 'เมื่อเงื่อนไขก่อนหน้าทั้งหมดเป็นเท็จ' }],
    next: 'การวนซ้ำ for / while',
  }),
  o({
    lessonId: 'prog-ctrl-loops',
    relatedLessonIds: ['prog-fn-functions'],
    relatedSkills: ['skill-prog-loops', 'skill-prog-trace'],
    readingMinutes: 7,
    summary: 'for วนตามจำนวนที่รู้ เช่น range(5) ได้ 0–4 while วนจนเงื่อนไขเป็นเท็จ ต้องให้ค่าเปลี่ยนเพื่อไม่ให้วนไม่จบ',
    keyTerms: [
      { term: 'range(a, b)', meaning: 'ลำดับ a ถึง b − 1' },
      { term: 'ลูปไม่รู้จบ', meaning: 'while ที่เงื่อนไขไม่เคยเป็นเท็จ' },
    ],
    what: 'การสั่งให้โค้ดชุดเดิมทำซ้ำ',
    why: 'ประมวลผลข้อมูลจำนวนมากโดยไม่ต้องเขียนซ้ำ',
    steps: ['รู้จำนวนรอบ → for i in range(n)', 'ไม่รู้จำนวนรอบ → while เงื่อนไข', 'ไล่ค่าตัวแปรทีละรอบในตาราง', 'ใช้ break ออกจากลูปเมื่อพบสิ่งที่หา'],
    examples: [{ problem: 'ผลรวม 1 ถึง 5', steps: ['total = 0', 'for i in range(1, 6): total += i', 'total = 15'] }],
    mistakes: ['range(1, 5) ไม่รวม 5', 'while ลืมเพิ่มตัวนับ', 'ใส่ total = 0 ไว้ในลูป'],
    tryIt: [{ prompt: 'for i in range(3): print(i * 2) แสดงอะไร', answer: '0 2 4' }],
    check: [{ prompt: 'range(2, 6) มีกี่ค่า', answer: '4 ค่า (2, 3, 4, 5)' }],
    next: 'ฟังก์ชัน list และ dict',
  }),
  o({
    lessonId: 'prog-fn-functions',
    relatedLessonIds: ['prog-ctrl-loops'],
    relatedSkills: ['skill-prog-functions', 'skill-prog-collections'],
    readingMinutes: 9,
    summary: 'ฟังก์ชันคือโค้ดที่ตั้งชื่อไว้เรียกซ้ำ รับพารามิเตอร์และ return ผลลัพธ์ list เก็บหลายค่าตามลำดับ dict เก็บคู่ คีย์ → ค่า',
    keyTerms: [
      { term: 'def / return', meaning: 'ประกาศฟังก์ชัน / ส่งค่ากลับ' },
      { term: 'list', meaning: '[1, 2, 3] เข้าถึงด้วยตำแหน่งเริ่ม 0' },
      { term: 'dict', meaning: '{"ชื่อ": "ก้อย"} เข้าถึงด้วยคีย์' },
    ],
    what: 'วิธีจัดโค้ดเป็นชิ้น และเก็บข้อมูลหลายค่า',
    why: 'โปรแกรมใหญ่ต้องแบ่งเป็นส่วน และข้อมูลจริงมักมาเป็นชุด',
    steps: ['def ชื่อ(พารามิเตอร์):', 'คำนวณแล้ว return ผล', 'เรียกใช้: ผล = ชื่อ(ค่า)', 'วนอ่าน list ด้วย for x in lst', 'อ่าน dict ด้วย d[คีย์] หรือ d.get(คีย์)'],
    examples: [{ problem: 'ฟังก์ชันหาค่าเฉลี่ยของ list', steps: ['def avg(xs):', '    return sum(xs) / len(xs)', 'avg([70, 80, 90])  # 80.0'] }],
    mistakes: ['print แทน return แล้วนำผลไปใช้ต่อไม่ได้', 'lst[len(lst)] เกินขอบเขต', 'ใช้คีย์ที่ไม่มีใน dict'],
    tryIt: [{ prompt: 'scores = {"math": 75}; scores["math"] + 5', answer: '80' }],
    check: [{ prompt: 'ตำแหน่งแรกของ list คือเลขอะไร', answer: '0' }],
    next: 'ทบทวนทั้งวิชาการเขียนโปรแกรม แล้วลองทำโปรเจกต์เล็ก',
  }),
  o({
    lessonId: 'phy-vec-units',
    relatedLessonIds: ['phy-vec-vectors', 'math-alg-exponents'],
    relatedSkills: ['skill-phy-units'],
    readingMinutes: 6,
    summary: 'หน่วย SI ฐาน: เมตร กิโลกรัม วินาที แปลงหน่วยด้วยการคูณตัวประกอบที่มีค่าเท่ากับ 1 เช่น 1 km/1000 m คำนำหน้าหน่วยคือเลขยกกำลังสิบ',
    keyTerms: [
      { term: 'หน่วย SI', meaning: 'ระบบหน่วยมาตรฐานสากล' },
      { term: 'คำนำหน้าหน่วย', meaning: 'k = 10³, c = 10⁻², m = 10⁻³' },
    ],
    what: 'ภาษากลางของการวัด ทำให้คำตอบเทียบกันได้',
    why: 'ตอบถูกแต่หน่วยผิดถือว่าผิด และสูตรฟิสิกส์ใช้หน่วย SI',
    steps: ['เขียนค่าพร้อมหน่วย', 'คูณด้วยตัวประกอบแปลงหน่วย', 'ตัดหน่วยที่ซ้ำบนล่าง', 'ตรวจว่าคำตอบสมเหตุสมผล'],
    examples: [{ problem: '72 km/h เป็น m/s', steps: ['72 × 1000 m ÷ 3600 s', '= 20 m/s'] }],
    mistakes: ['หาร 1000 แทนคูณ', 'ลืมแปลงชั่วโมงเป็นวินาที'],
    tryIt: [{ prompt: '2.5 km เป็น m', answer: '2500 m' }],
    check: [{ prompt: '1 g เท่ากับกี่ kg', answer: '0.001 kg' }],
    next: 'เวกเตอร์และการรวมเวกเตอร์',
  }),
  o({
    lessonId: 'phy-vec-vectors',
    relatedLessonIds: ['math-trig-ratios', 'phy-kin-1d'],
    relatedSkills: ['skill-phy-vector-components'],
    readingMinutes: 8,
    summary: 'เวกเตอร์มีทั้งขนาดและทิศ แยกเป็นองค์ประกอบ x = A cos θ, y = A sin θ แล้วรวมแต่ละแกน ขนาดผลรวม = √(x² + y²)',
    keyTerms: [
      { term: 'ปริมาณเวกเตอร์', meaning: 'มีขนาดและทิศ เช่น แรง ความเร็ว' },
      { term: 'ปริมาณสเกลาร์', meaning: 'มีแต่ขนาด เช่น มวล เวลา' },
    ],
    what: 'ลูกศรที่บอกว่าไปเท่าไรและไปทางไหน',
    why: 'แรงและการเคลื่อนที่ทั้งหมดเป็นเวกเตอร์',
    steps: ['วาดลูกศรและมุม', 'แยกองค์ประกอบ x, y', 'รวมแกนเดียวกัน', 'หาขนาดด้วยพีทาโกรัส', 'หาทิศด้วย tan θ = y/x'],
    examples: [{ problem: 'เดินตะวันออก 3 m แล้วเหนือ 4 m', steps: ['x = 3, y = 4', 'ขนาด = √(9 + 16) = 5 m', 'tan θ = 4/3 → θ ≈ 53° เหนือแนวตะวันออก'] }],
    mistakes: ['บวกขนาดตรง ๆ (3 + 4 = 7)', 'ใช้ sin กับ cos สลับแกน'],
    tryIt: [{ prompt: 'แรง 10 N ทำมุม 30° กับแนวราบ องค์ประกอบแนวราบเท่าไร', answer: '10 cos 30° ≈ 8.66 N' }],
    check: [{ prompt: 'เวลาเป็นเวกเตอร์หรือสเกลาร์', answer: 'สเกลาร์' }],
    next: 'การเคลื่อนที่แนวตรงด้วยความเร่งคงตัว',
  }),
  o({
    lessonId: 'phy-kin-1d',
    relatedLessonIds: ['math-fn-linear', 'phy-dyn-newton'],
    relatedSkills: ['skill-phy-kinematics-equations', 'skill-math-graph-reading'],
    readingMinutes: 9,
    summary: 'เมื่อความเร่งคงตัว ใช้สามสมการ: v = u + at, s = ut + ½at², v² = u² + 2as เลือกสมการที่ไม่มีตัวที่โจทย์ไม่ให้และไม่ถาม',
    keyTerms: [
      { term: 'u, v', meaning: 'ความเร็วต้น, ความเร็วปลาย (m/s)' },
      { term: 'a', meaning: 'ความเร่ง (m/s²)' },
      { term: 's', meaning: 'การกระจัด (m)' },
    ],
    what: 'การบรรยายการเคลื่อนที่ในแนวเส้นตรงเมื่อความเร็วเปลี่ยนสม่ำเสมอ',
    why: 'พื้นฐานของกลศาสตร์และข้อสอบฟิสิกส์ทุกสนาม',
    steps: ['เขียนตัวที่รู้ u, v, a, s, t', 'ระบุตัวที่ถาม', 'เลือกสมการที่ไม่มีตัวที่ไม่เกี่ยว', 'แทนค่าพร้อมหน่วย', 'ตรวจเครื่องหมายทิศ'],
    examples: [{ problem: 'รถเริ่มจากหยุดนิ่ง เร่ง 2 m/s² นาน 5 s ไปได้กี่เมตร', steps: ['u = 0, a = 2, t = 5', 's = 0 + ½(2)(25)', 's = 25 m'] }],
    mistakes: ['ลืมว่า "เริ่มจากหยุดนิ่ง" คือ u = 0', 'ลืม ½ ใน ut + ½at²', 'ปล่อยตกอิสระลืมว่า a = g ≈ 9.8 m/s²'],
    tryIt: [{ prompt: 'u = 10 m/s, a = −2 m/s² หยุดภายในกี่วินาที', answer: 't = 5 s' }],
    check: [{ prompt: 'ความชันของกราฟความเร็ว–เวลาคืออะไร', answer: 'ความเร่ง' }],
    next: 'กฎการเคลื่อนที่ของนิวตัน — ทำไมวัตถุจึงมีความเร่ง',
  }),
  o({
    lessonId: 'phy-dyn-newton',
    relatedLessonIds: ['phy-kin-1d', 'phy-vec-vectors'],
    relatedSkills: ['skill-phy-free-body', 'skill-phy-newton-second'],
    readingMinutes: 9,
    summary: 'กฎข้อ 1: ไม่มีแรงลัพธ์ วัตถุคงสภาพเดิม กฎข้อ 2: ΣF = ma กฎข้อ 3: แรงกริยาเท่ากับแรงปฏิกิริยาแต่ทิศตรงข้ามและกระทำต่อคนละวัตถุ',
    keyTerms: [
      { term: 'แรงลัพธ์ (ΣF)', meaning: 'ผลรวมเวกเตอร์ของแรงทั้งหมด' },
      { term: 'แผนภาพแรง', meaning: 'รูปวัตถุพร้อมลูกศรทุกแรงที่กระทำ' },
      { term: 'น้ำหนัก', meaning: 'W = mg' },
    ],
    what: 'กฎที่อธิบายว่าแรงทำให้การเคลื่อนที่เปลี่ยนอย่างไร',
    why: 'ใช้คำนวณทุกระบบกลไก ตั้งแต่รถจนถึงหุ่นยนต์',
    steps: ['วาดแผนภาพแรง', 'เลือกทิศบวก', 'รวมแรงในแต่ละแกน', 'ใช้ ΣF = ma', 'แก้หาค่าที่ถาม'],
    examples: [{ problem: 'กล่อง 5 kg ถูกดึง 20 N มีแรงเสียดทาน 5 N', steps: ['ΣF = 20 − 5 = 15 N', 'a = 15 ÷ 5 = 3 m/s²'] }],
    mistakes: ['ใส่แรงที่วัตถุกระทำต่อสิ่งอื่นลงในแผนภาพ', 'ลืมแรงเสียดทานหรือน้ำหนัก', 'สับสนมวล (kg) กับน้ำหนัก (N)'],
    tryIt: [{ prompt: 'มวล 2 kg ถูกแรงลัพธ์ 10 N ความเร่งเท่าไร', answer: '5 m/s²' }],
    check: [{ prompt: 'แรงคู่กริยา–ปฏิกิริยาหักล้างกันหรือไม่ เพราะอะไร', answer: 'ไม่ เพราะกระทำต่อคนละวัตถุ' }],
    next: 'ทบทวนฟิสิกส์ทั้งชุด แล้วลองทำข้อสอบเก่าแบบจับเวลา',
  }),
];

/** Base lesson + Phase 59 depth layer (examples/mistakes are appended, never replaced). */
export const ORIGINAL_LESSONS: OriginalLesson[] = BASE_LESSONS.map((b) => {
  const d = LESSON_DEPTH[b.lessonId];
  if (!d) return b;
  const { moreExamples = [], moreMistakes = [], ...rest } = d;
  return { ...b, ...rest, version: '1.1.0', updatedAt: '2026-10-02', examples: [...b.examples, ...moreExamples], mistakes: [...b.mistakes, ...moreMistakes] };
});

export function getOriginalLesson(lessonId: string): OriginalLesson | undefined {
  return ORIGINAL_LESSONS.find((l) => l.lessonId === lessonId);
}

export function getOriginalByContentId(contentId: string): OriginalLesson | undefined {
  return ORIGINAL_LESSONS.find((l) => l.contentId === contentId);
}
