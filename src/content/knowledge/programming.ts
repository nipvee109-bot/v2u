/* V2U lesson knowledge — Programming / Python 3 (Phase 62). Original V2U writing.
   Every code sample carries `verify: { kind: 'python' }` and is executed by the test suite. */

import type { LessonKnowledge, Verify } from './types';

const VAR = 'skill-prog-variables';
const OPS = 'skill-prog-operators';
const IO = 'skill-prog-io';
const COND = 'skill-prog-conditions';
const LOOP = 'skill-prog-loops';
const TRACE = 'skill-prog-trace';
const FN = 'skill-prog-functions';
const COL = 'skill-prog-collections';

const py = (code: string, output: string, stdin?: string): Verify => ({ kind: 'python', code, output, ...(stdin ? { stdin } : {}) });
const pyErr = (code: string, error: string): Verify => ({ kind: 'python', code, error });

export const PROGRAMMING_KNOWLEDGE: LessonKnowledge[] = [
  // ───────────────────────────────────────────────────────────────────
  {
    lessonId: 'prog-py-variables',
    skills: [VAR, OPS],
    prerequisites: [],
    whyItMatters: 'ทุกโปรแกรมเก็บข้อมูลในตัวแปรและคำนวณด้วยตัวดำเนินการ ถ้าเข้าใจชนิดข้อมูลและความต่างของ / กับ // จะไม่โดนบั๊กที่พบบ่อยที่สุดของผู้เริ่มต้น',
    allowedKnowledge: [
      'การกำหนดค่าตัวแปรด้วย = และการเปลี่ยนค่าตัวแปร',
      'ชนิดข้อมูล int float str bool และ type()',
      'ตัวดำเนินการ + − * / // % ** และลำดับการคำนวณ',
      'ตัวดำเนินการเปรียบเทียบและ and or not (ระดับนิพจน์)',
      'แปลงชนิดด้วย int() float() str()',
      'การต่อสตริงด้วย + และการคูณสตริงด้วยจำนวนเต็ม',
    ],
    notYetAllowed: ['input() และ f-string (บทถัดไป)', 'if / loop', 'list และ dict', 'การปัดเศษแบบละเอียดและข้อผิดพลาดของทศนิยม', 'ฟังก์ชันที่เขียนเอง'],
    concepts: [
      { id: 'c-var', term: 'ตัวแปร', meaning: 'ชื่อที่ผูกกับค่า เช่น score = 80 ค่าเปลี่ยนได้ด้วยการกำหนดใหม่', skillId: VAR },
      { id: 'c-type', term: 'ชนิดข้อมูล', meaning: 'int จำนวนเต็ม float ทศนิยม str ข้อความ bool True/False — ชนิดกำหนดว่าทำอะไรกับค่านั้นได้', skillId: VAR },
      { id: 'c-div', term: '/ กับ //', meaning: '/ หารได้ float เสมอ ส่วน // หารปัดลง (floor division) ได้จำนวนเต็มเมื่อทั้งสองตัวเป็น int', skillId: OPS },
      { id: 'c-mod', term: '%', meaning: 'เศษจากการหาร เช่น 17 % 5 = 2 ใช้ตรวจคู่/คี่ได้', skillId: OPS },
    ],
    rules: [
      { id: 'r-assign', name: 'การกำหนดค่า', statement: 'ชื่อ = นิพจน์', notation: 'คำนวณข้างขวาก่อน แล้วผูกผลกับชื่อทางซ้าย', skillId: VAR },
      { id: 'r-prec', name: 'ลำดับการคำนวณ', statement: '( ) → ** → * / // % → + −', skillId: OPS },
      { id: 'r-conv', name: 'แปลงชนิด', statement: 'int("16") → 16, str(17) → "17", float("2.5") → 2.5', skillId: VAR },
    ],
    detailed: [
      'Python รู้ชนิดของค่าเองจากรูปที่เขียน: 7 เป็น int, 7.0 เป็น float, "7" เป็น str ค่าที่หน้าตาคล้ายกันแต่ชนิดต่างกันทำงานต่างกัน เช่น "3" + "4" ได้ "34" (ต่อสตริง) แต่ 3 + 4 ได้ 7',
      'ตัวหาร / คืนค่า float เสมอแม้หารลงตัว (8 / 2 ได้ 4.0) ถ้าต้องการจำนวนเต็มให้ใช้ // ซึ่งปัดลง และ % ให้เศษ ทั้งสองตัวมักใช้คู่กัน เช่น แปลงนาทีเป็นชั่วโมงกับนาที',
      'ตัวดำเนินการ ** มีลำดับสูงกว่าการคูณ ดังนั้น 10 − 4 * 2 ** 2 คำนวณ 2 ** 2 = 4 ก่อน แล้ว 4 * 4 = 16 แล้ว 10 − 16 = −6 ใส่วงเล็บเมื่อไม่แน่ใจ',
    ],
    analogy: 'ตัวแปรเหมือนป้ายชื่อที่แปะบนกล่อง — ย้ายป้ายไปแปะกล่องใหม่ได้ (กำหนดค่าใหม่)',
    workedExamples: [
      { id: 'we-1', skillId: OPS, problem: 'ผลลัพธ์ของ / // % กับ 17 และ 5', code: 'a = 17\nb = 5\nprint(a / b)\nprint(a // b)\nprint(a % b)', steps: ['a / b หารปกติได้ float: 3.4', 'a // b หารปัดลง: 3', 'a % b เศษ: 17 − 15 = 2'], answer: '3.4\n3\n2', verify: py('a = 17\nb = 5\nprint(a / b)\nprint(a // b)\nprint(a % b)', '3.4\n3\n2') },
      { id: 'we-2', skillId: VAR, problem: 'อายุเก็บเป็นข้อความ "16" อยากแสดงอายุปีหน้า', code: 'age = "16"\nnext_year = int(age) + 1\nprint("อายุปีหน้า: " + str(next_year))', steps: ['int(age) แปลง "16" เป็น 16 จึงบวก 1 ได้', 'str(next_year) แปลง 17 กลับเป็นข้อความเพื่อต่อกับสตริง'], answer: 'อายุปีหน้า: 17', verify: py('age = "16"\nnext_year = int(age) + 1\nprint("อายุปีหน้า: " + str(next_year))', 'อายุปีหน้า: 17') },
    ],
    guided: [
      { id: 'g-1', skillId: OPS, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(2 ** 3 + 1)', hint: '** คำนวณก่อน +', answer: '9', explanation: '2 ** 3 = 8 แล้ว + 1 = 9', verify: py('print(2 ** 3 + 1)', '9') },
      { id: 'g-2', skillId: VAR, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(type(7 / 7))', hint: '/ ให้ชนิดอะไรเสมอ', answer: "<class 'float'>", explanation: '7 / 7 = 1.0 เป็น float แม้หารลงตัว', verify: py('print(type(7 / 7))', "<class 'float'>") },
      { id: 'g-3', skillId: VAR, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 10\nx = x + 5\nprint(x)', hint: 'คำนวณข้างขวาด้วยค่าเดิมของ x ก่อน', answer: '15', explanation: 'ข้างขวา 10 + 5 = 15 แล้วผูกกลับกับ x', verify: py('x = 10\nx = x + 5\nprint(x)', '15') },
    ],
    independent: [
      { id: 'i-1', skillId: OPS, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(9 // 2, 9 % 2)', answer: '4 1', explanation: '9 หาร 2 ได้ 4 เศษ 1 และ print คั่นด้วยช่องว่าง', verify: py('print(9 // 2, 9 % 2)', '4 1') },
      { id: 'i-2', skillId: VAR, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print("3" + "4")', answer: '34', explanation: 'ทั้งสองเป็นสตริง + จึงเป็นการต่อข้อความ', verify: py('print("3" + "4")', '34') },
      { id: 'i-3', skillId: VAR, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(int("3") + 4)', answer: '7', explanation: 'int("3") เป็นจำนวน 3 บวก 4 ได้ 7', verify: py('print(int("3") + 4)', '7') },
      { id: 'i-4', skillId: VAR, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(int(7 / 2))', answer: '3', explanation: '7 / 2 = 3.5 แล้ว int() ตัดทศนิยมทิ้ง (ไม่ใช่ปัดขึ้น)', verify: py('print(int(7 / 2))', '3') },
      { id: 'i-5', skillId: OPS, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(10 - 4 * 2 ** 2)', answer: '-6', explanation: '2 ** 2 = 4, 4 * 4 = 16, 10 − 16 = −6', verify: py('print(10 - 4 * 2 ** 2)', '-6') },
      { id: 'i-6', skillId: OPS, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(5 > 3 and 2 > 4)', answer: 'False', explanation: '5 > 3 เป็น True แต่ 2 > 4 เป็น False และ and ต้องจริงทั้งคู่', verify: py('print(5 > 3 and 2 > 4)', 'False') },
    ],
    debugging: [
      { id: 'd-1', skillId: VAR, buggy: 'score = 90\nprint("score: " + score)', symptom: 'TypeError: can only concatenate str (not "int") to str', fixed: 'score = 90\nprint("score: " + str(score))', output: 'score: 90', explanation: 'ต่อสตริงกับจำนวนด้วย + ไม่ได้ ต้องแปลงจำนวนเป็นสตริงก่อน', verifyBuggy: pyErr('score = 90\nprint("score: " + score)', 'TypeError'), verifyFixed: py('score = 90\nprint("score: " + str(score))', 'score: 90') },
    ],
    checks: [
      { id: 'k-1', skillId: OPS, prompt: '7 // 2 ได้ค่าใด', code: 'print(7 // 2)', choices: ['3.5', '3', '4', '1'], correctIndex: 1, explanation: '// หารปัดลง 3.5 → 3', verify: py('print(7 // 2)', '3') },
      { id: 'k-2', skillId: VAR, prompt: 'type(3.0) คือชนิดใด', code: 'print(type(3.0))', choices: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"], correctIndex: 1, explanation: 'มีจุดทศนิยมจึงเป็น float', verify: py('print(type(3.0))', "<class 'float'>") },
      { id: 'k-3', skillId: VAR, prompt: '"5" * 2 ได้อะไร', code: 'print("5" * 2)', choices: ['10', '55', '"5"2', 'เกิด TypeError'], correctIndex: 1, explanation: 'สตริงคูณจำนวนเต็มคือการต่อซ้ำ', verify: py('print("5" * 2)', '55') },
      { id: 'k-4', skillId: OPS, prompt: 'ตัวดำเนินการ % ให้ผลลัพธ์อะไร', choices: ['ร้อยละ', 'เศษจากการหาร', 'ผลหารปัดลง', 'เลขยกกำลัง'], correctIndex: 1, explanation: 'เช่น 17 % 5 = 2', verify: py('print(17 % 5)', '2') },
    ],
    mistakes: [
      { mistake: 'คาดว่า 8 / 2 ได้ 4 แต่ได้ 4.0', why: 'คุ้นกับคณิตศาสตร์ที่ไม่แยกชนิดข้อมูล', fix: 'จำว่า / ให้ float เสมอ ใช้ // เมื่อต้องการจำนวนเต็ม' },
      { mistake: 'ต่อสตริงกับจำนวนด้วย + แล้วเจอ TypeError', why: 'มองว่า "ข้อความ + ตัวเลข" น่าจะต่อกันได้', fix: 'แปลงด้วย str() ก่อน (บทถัดไปใช้ f-string ได้สะดวกกว่า)' },
      { mistake: 'ลืมลำดับการคำนวณ ** ก่อน *', why: 'คำนวณจากซ้ายไปขวาเหมือนอ่านหนังสือ', fix: 'ใส่วงเล็บให้ชัด หรือไล่ตามลำดับ ( ) → ** → * / // % → + −' },
    ],
    summary: ['ตัวแปรคือชื่อที่ผูกกับค่า กำหนดใหม่ได้', 'ชนิดข้อมูลกำหนดพฤติกรรม: "3" + "4" ≠ 3 + 4', '/ ได้ float, // หารปัดลง, % ได้เศษ'],
    afterLesson: ['ประกาศตัวแปรและเลือกชนิดข้อมูลได้เหมาะสม', 'อธิบายความต่างของ / // % ได้', 'แปลงชนิดข้อมูลด้วย int() str() float() ได้'],
    next: ['prog-py-io', 'prog-ctrl-conditions'],
    provenance: [
      { sourceId: 'python-311-reference-bundled', usedFor: 'การกำหนดค่าตัวแปร ตัวดำเนินการ / // % ** และลำดับการคำนวณ', crossChecked: true, evidence: [{ ref: 'topic:assignment', quote: 'Assignment statements are used to (re)bind names to values', claim: '= ผูกชื่อกับค่า และกำหนดใหม่ได้' }, { ref: 'topic:binary', quote: 'Division of integers yields a float, while floor division of integers results in an integer', claim: '/ ได้ float, // ได้จำนวนเต็ม' }, { ref: 'topic:binary', quote: 'The "%" (modulo) operator yields the remainder from the division of the first argument by the second.', claim: '% ให้เศษ' }, { ref: 'topic:operator-summary', quote: 'from highest precedence (most binding) to lowest precedence (least binding). Operators in the same box have the same precedence.', claim: 'มีลำดับการคำนวณตามตาราง' }, { ref: 'topic:operator-summary', quote: '"*", "@", "/", "//", "%"', claim: '* / // % อยู่ระดับเดียวกัน' }, { ref: 'topic:typesseq', quote: '"s + t" | the concatenation of *s* and *t*', claim: 'สตริง + สตริง คือการต่อ' }, { ref: 'topic:typesseq', quote: '"s * n" or "n * s" | equivalent to adding *s* to', claim: 'สตริง * จำนวนเต็ม คือการต่อซ้ำ' }, { ref: 'topic:comparisons', quote: 'Comparisons yield boolean values: "True" or "False".', claim: 'การเปรียบเทียบได้ bool' }] },
      { sourceId: 'python-311-docstrings', usedFor: 'int() float() และการตัดทศนิยม', crossChecked: true, evidence: [{ ref: 'doc:int', quote: 'For floating point numbers, this truncates towards zero.', claim: 'int(3.5) ตัดทศนิยม ได้ 3' }, { ref: 'doc:float', quote: 'Convert a string or number to a floating point number, if possible.', claim: 'float() แปลงสตริงเป็นทศนิยม' }] },
    ],
    audit: {
      sourcesFound: ['python-tutorial-introduction', 'python-reference-expressions', 'programiz', 'kodekloud notes', 'สไลด์ใน scribd'],
      sourcesSelected: ['python-311-reference-bundled', 'python-311-docstrings'],
      sourcesRejected: [{ source: 'หน้าเว็บ docs.python.org (ออนไลน์)', reason: 'เปิดจากสภาพแวดล้อมนี้ไม่ได้ จึงใช้ข้อความทางการชุดเดียวกันที่ติดมากับ Python แทน' }, { source: 'programiz / kodekloud / scribd', reason: 'มีเอกสารทางการ และสถานะลิขสิทธิ์ของสไลด์ไม่ชัด' }],
      knowledgeCovered: ['ตัวแปร', 'ชนิดข้อมูล', '/ // % **', 'ลำดับการคำนวณ', 'การแปลงชนิด'],
      knowledgeMissing: [],
      externalResourcesVerified: 0,
      limitations: [],
      nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจลิงก์ (เปิด YouTube จากสภาพแวดล้อมนี้ไม่ได้)', 'ยังไม่มีที่รันโค้ดในหน้าเว็บ'],
      verification: ['ข้อเท็จจริงสำคัญตรวจกับเอกสาร Python ทางการที่เปิดอ่านจริง (ข้อความอ้างอิงถูกตรวจซ้ำทุกครั้งที่รันชุดทดสอบ)', 'โค้ดทุกตัวอย่างและเฉลยรันด้วย Python 3.11 จริง'],
      readiness: 'READY',
    },
  },
  // ───────────────────────────────────────────────────────────────────
  {
    lessonId: 'prog-py-io',
    skills: [IO],
    prerequisites: ['prog-py-variables'],
    whyItMatters: 'โปรแกรมที่ใช้งานจริงต้องรับข้อมูลจากผู้ใช้และแสดงผลที่อ่านง่าย ข้อเท็จจริงสำคัญที่สุดของบทนี้คือ input() คืนค่าเป็นข้อความเสมอ',
    allowedKnowledge: [
      'input(ข้อความ) แสดงข้อความแล้วรอรับ คืนค่าเป็น str เสมอ',
      'แปลงค่าที่รับด้วย int() float()',
      'print() กับหลายค่า และพารามิเตอร์ sep end',
      'f-string: f"... {นิพจน์} ..." และการจัดทศนิยม {x:.2f}',
    ],
    notYetAllowed: ['การตรวจสอบข้อมูลด้วย if / try', 'การอ่านเขียนไฟล์', 'การรับหลายค่าในบรรทัดเดียวด้วย split()', 'การจัดรูปแบบขั้นสูง (ความกว้าง จัดชิด)'],
    concepts: [
      { id: 'c-input', term: 'input()', meaning: 'อ่านหนึ่งบรรทัดจากผู้ใช้ คืนค่าเป็นสตริงเสมอ แม้ผู้ใช้พิมพ์ตัวเลข', skillId: IO },
      { id: 'c-print', term: 'print()', meaning: 'แสดงค่าหลายค่าคั่นด้วย sep (ค่าเริ่มต้นช่องว่าง) และจบด้วย end (ค่าเริ่มต้นขึ้นบรรทัดใหม่)', skillId: IO },
      { id: 'c-fstring', term: 'f-string', meaning: 'สตริงที่ขึ้นต้นด้วย f ใส่นิพจน์ใน { } ได้โดยไม่ต้องแปลงเป็น str เอง', skillId: IO },
    ],
    rules: [
      { id: 'r-input', name: 'รับตัวเลข', statement: 'n = int(input("...")) หรือ x = float(input("..."))', skillId: IO },
      { id: 'r-print', name: 'print หลายค่า', statement: 'print(a, b, sep="-", end="\\n")', skillId: IO },
      { id: 'r-format', name: 'ทศนิยม n ตำแหน่ง', statement: 'f"{x:.2f}" แสดง x ทศนิยม 2 ตำแหน่ง', skillId: IO },
    ],
    detailed: [
      'input() ไม่รู้ว่าเราต้องการตัวเลข มันส่งกลับสิ่งที่ผู้ใช้พิมพ์เป็นข้อความเสมอ ถ้าจะคำนวณต้องห่อด้วย int() หรือ float() ทันทีที่รับค่า',
      'ข้อความใน input("...") แสดงบนบรรทัดเดียวกับที่ผู้ใช้พิมพ์ (ไม่ขึ้นบรรทัดใหม่ให้) ผลลัพธ์ที่เห็นบนจอจึงต่อจากข้อความนั้น',
      'f-string ทำให้ไม่ต้องต่อสตริงด้วย + และไม่ต้องเรียก str() เอง ใส่นิพจน์ใด ๆ ใน { } ได้ เช่น {price * qty:.2f} ซึ่งคำนวณแล้วจัดทศนิยมในที่เดียว',
    ],
    workedExamples: [
      { id: 'we-1', skillId: IO, problem: 'ทักทายผู้ใช้ด้วยชื่อที่พิมพ์เข้ามา (ผู้ใช้พิมพ์ Mali)', code: 'name = input("ชื่อ: ")\nprint(f"สวัสดี {name}")', steps: ['input แสดง "ชื่อ: " แล้วรอ ผู้ใช้พิมพ์ Mali', 'name = "Mali"', 'f-string แทน {name} ด้วย Mali'], answer: 'ชื่อ: สวัสดี Mali', verify: py('name = input("ชื่อ: ")\nprint(f"สวัสดี {name}")', 'ชื่อ: สวัสดี Mali', 'Mali\n') },
      { id: 'we-2', skillId: IO, problem: 'แสดงราคารวมทศนิยม 2 ตำแหน่ง', code: 'price = 59.5\nqty = 3\nprint(f"รวม {price * qty:.2f} บาท")', steps: ['price * qty = 178.5', ':.2f จัดเป็น 178.50'], answer: 'รวม 178.50 บาท', verify: py('price = 59.5\nqty = 3\nprint(f"รวม {price * qty:.2f} บาท")', 'รวม 178.50 บาท') },
    ],
    guided: [
      { id: 'g-1', skillId: IO, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print("a", "b", sep="-")', hint: 'sep คือสิ่งที่คั่นระหว่างค่า', answer: 'a-b', explanation: 'sep="-" แทนช่องว่างด้วยขีด', verify: py('print("a", "b", sep="-")', 'a-b') },
      { id: 'g-2', skillId: IO, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print("ab", end="")\nprint("cd")', hint: 'end="" แปลว่าไม่ขึ้นบรรทัดใหม่', answer: 'abcd', explanation: 'print แรกไม่ขึ้นบรรทัด print ที่สองจึงต่อท้าย', verify: py('print("ab", end="")\nprint("cd")', 'abcd') },
      { id: 'g-3', skillId: IO, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 3\nprint(f"{x} x 2 = {x * 2}")', hint: 'ทุก { } ถูกคำนวณแล้วแทนที่', answer: '3 x 2 = 6', explanation: '{x} → 3 และ {x * 2} → 6 ส่วน x ที่อยู่นอกวงเล็บปีกกาเป็นตัวอักษรธรรมดา', verify: py('x = 3\nprint(f"{x} x 2 = {x * 2}")', '3 x 2 = 6') },
    ],
    independent: [
      { id: 'i-1', skillId: IO, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(f"{10 / 4}")', answer: '2.5', explanation: '10 / 4 = 2.5', verify: py('print(f"{10 / 4}")', '2.5') },
      { id: 'i-2', skillId: IO, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(f"{2 / 3:.2f}")', answer: '0.67', explanation: '0.666… ปัดเป็นทศนิยม 2 ตำแหน่ง', verify: py('print(f"{2 / 3:.2f}")', '0.67') },
      { id: 'i-3', skillId: IO, level: 2, prompt: 'ถ้าผู้ใช้พิมพ์ 4 โค้ดนี้แสดงอะไร', code: 'n = int(input())\nprint(n * n)', answer: '16', explanation: 'int() แปลง "4" เป็น 4 แล้ว 4 × 4 = 16', verify: py('n = int(input())\nprint(n * n)', '16', '4\n') },
      { id: 'i-4', skillId: IO, level: 2, prompt: 'ถ้าผู้ใช้พิมพ์ 2 แล้ว 3 (คนละบรรทัด) โค้ดนี้แสดงอะไร', code: 'a = int(input())\nb = int(input())\nprint(a + b)', answer: '5', explanation: 'input แต่ละครั้งอ่านหนึ่งบรรทัด', verify: py('a = int(input())\nb = int(input())\nprint(a + b)', '5', '2\n3\n') },
      { id: 'i-5', skillId: IO, level: 3, prompt: 'ถ้าผู้ใช้พิมพ์ 7 โค้ดนี้แสดงอะไร', code: 'print(input() * 2)', answer: '77', explanation: 'ไม่ได้แปลงเป็น int ค่าจึงเป็นสตริง "7" คูณ 2 คือต่อซ้ำ', verify: py('print(input() * 2)', '77', '7\n') },
      { id: 'i-6', skillId: IO, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(1, 2, 3, sep=", ", end="!\\n")', answer: '1, 2, 3!', explanation: 'คั่นด้วย ", " และจบด้วย "!" แล้วขึ้นบรรทัดใหม่', verify: py('print(1, 2, 3, sep=", ", end="!\\n")', '1, 2, 3!') },
    ],
    debugging: [
      { id: 'd-1', skillId: IO, buggy: 'n = input()\nprint(n + 1)', symptom: 'TypeError: can only concatenate str (not "int") to str', fixed: 'n = int(input())\nprint(n + 1)', output: '6', explanation: 'input() คืนสตริง ต้องแปลงเป็น int ก่อนบวก (ตัวอย่างนี้ผู้ใช้พิมพ์ 5)', verifyBuggy: { kind: 'python', code: 'n = input()\nprint(n + 1)', stdin: '5\n', error: 'TypeError' }, verifyFixed: py('n = int(input())\nprint(n + 1)', '6', '5\n') },
    ],
    checks: [
      { id: 'k-1', skillId: IO, prompt: 'input() คืนค่าชนิดใด', choices: ['int เสมอ', 'str เสมอ', 'ขึ้นกับสิ่งที่ผู้ใช้พิมพ์', 'float เสมอ'], correctIndex: 1, misconceptions: [{ choice: 0, mistake: 0 }], explanation: 'แม้ผู้ใช้พิมพ์ตัวเลข ค่าที่ได้ก็เป็นสตริง', verify: py('print(type(input()))', "<class 'str'>", '42\n') },
      { id: 'k-2', skillId: IO, prompt: 'f"{3.14159:.1f}" แสดงอะไร', code: 'print(f"{3.14159:.1f}")', choices: ['3.14159', '3.1', '3.14', '3'], correctIndex: 1, explanation: '.1f คือทศนิยม 1 ตำแหน่ง', verify: py('print(f"{3.14159:.1f}")', '3.1') },
      { id: 'k-3', skillId: IO, prompt: 'print("x", end="") ทำอะไรต่างจาก print("x")', choices: ['ไม่แสดงอะไรเลย', 'แสดง x โดยไม่ขึ้นบรรทัดใหม่', 'แสดง x สองครั้ง', 'เกิดข้อผิดพลาด'], correctIndex: 1, explanation: 'end แทนตัวขึ้นบรรทัดใหม่ที่ print ใส่ให้ตามปกติ' },
      { id: 'k-4', skillId: IO, prompt: 'ผู้ใช้พิมพ์ 12 โค้ดนี้แสดงอะไร', code: 'print(int(input()) + 1)', choices: ['121', '13', '12 1', 'TypeError'], correctIndex: 1, explanation: 'แปลงเป็น int ก่อนจึงบวกแบบตัวเลข', verify: py('print(int(input()) + 1)', '13', '12\n') },
    ],
    mistakes: [
      { mistake: 'นำค่าจาก input() ไปคำนวณโดยไม่แปลงชนิด', why: 'เห็นผู้ใช้พิมพ์ตัวเลข จึงคิดว่าได้ตัวเลข', fix: 'ห่อด้วย int() หรือ float() ตั้งแต่บรรทัดที่รับค่า' },
      { mistake: 'ลืมตัว f หน้า f-string แล้วได้ข้อความ {x} ออกมาตรง ๆ', why: 'f เป็นตัวอักษรเล็ก ๆ ที่มองข้ามง่าย', fix: 'ถ้าเห็นวงเล็บปีกกาในผลลัพธ์ ให้ตรวจว่ามี f หน้าเครื่องหมายคำพูดหรือไม่' },
      { mistake: 'คาดว่าข้อความใน input() จะขึ้นบรรทัดใหม่ให้', why: 'print ขึ้นบรรทัดใหม่ให้ จึงคิดว่า input ทำเหมือนกัน', fix: 'เว้นวรรคท้ายข้อความเอง เช่น input("ชื่อ: ")' },
    ],
    summary: ['input() คืนสตริงเสมอ — แปลงด้วย int() / float()', 'print ใช้ sep คั่นค่าและ end จบบรรทัด', 'f-string ใส่นิพจน์ใน { } และจัดทศนิยมด้วย :.2f'],
    afterLesson: ['รับค่าจากผู้ใช้และแปลงเป็นตัวเลขได้', 'จัดรูปแบบผลลัพธ์ด้วย f-string ได้', 'ทำนายผลของ print ที่ใช้ sep และ end ได้'],
    next: [],
    provenance: [
      { sourceId: 'python-311-docstrings', usedFor: 'พฤติกรรมของ input() และ print(sep, end)', crossChecked: true, evidence: [{ ref: 'doc:input', quote: 'Read a string from standard input.', claim: 'input() คืนสตริงเสมอ' }, { ref: 'doc:input', quote: 'The prompt string, if given, is printed to standard output without a trailing newline before reading input.', claim: 'ข้อความใน input() ไม่ขึ้นบรรทัดใหม่' }, { ref: 'doc:print', quote: 'sep string inserted between values, default a space.', claim: 'sep ค่าเริ่มต้นคือช่องว่าง' }, { ref: 'doc:print', quote: 'end string appended after the last value, default a newline.', claim: 'end ค่าเริ่มต้นคือขึ้นบรรทัดใหม่' }] },
      { sourceId: 'python-311-reference-bundled', usedFor: 'f-string และการจัดทศนิยม :.2f', crossChecked: true, evidence: [{ ref: 'topic:strings', quote: 'see f-strings', claim: 'สตริงที่ขึ้นต้นด้วย f คือ formatted string literal' }, { ref: 'topic:formatstrings', quote: 'Fixed-point notation. For a given precision "p", formats', claim: 'f คือรูปแบบทศนิยมตายตัว' }, { ref: 'topic:formatstrings', quote: 'The *precision* is a decimal integer indicating how many digits should be displayed after the decimal point', claim: '.2 คือจำนวนหลักหลังจุดทศนิยม' }] },
    ],
    audit: {
      sourcesFound: ['python-builtins', 'python-tutorial-introduction', 'บทเรียนของมหาวิทยาลัยต่างประเทศใน git', 'coddy.tech'],
      sourcesSelected: ['python-311-reference-bundled', 'python-311-docstrings'],
      sourcesRejected: [{ source: 'หน้าเว็บ docs.python.org (ออนไลน์)', reason: 'เปิดจากสภาพแวดล้อมนี้ไม่ได้ จึงใช้ข้อความทางการชุดเดียวกันที่ติดมากับ Python แทน' }, { source: 'coddy.tech / บทเรียนใน git ของมหาวิทยาลัย', reason: 'มีเอกสารทางการครอบคลุมแล้ว' }],
      knowledgeCovered: ['input คืน str', 'การแปลงชนิด', 'sep / end', 'f-string และทศนิยม'],
      knowledgeMissing: [],
      externalResourcesVerified: 0,
      limitations: [],
      nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจลิงก์ (เปิด YouTube จากสภาพแวดล้อมนี้ไม่ได้)', 'ยังไม่มีที่รันโค้ดในหน้าเว็บ'],
      verification: ['ข้อเท็จจริงสำคัญตรวจกับเอกสาร Python ทางการที่เปิดอ่านจริง (ข้อความอ้างอิงถูกตรวจซ้ำทุกครั้งที่รันชุดทดสอบ)', 'โค้ดทุกตัวอย่างและเฉลยรันด้วย Python 3.11 จริง'],
      readiness: 'READY',
    },
  },
  // ───────────────────────────────────────────────────────────────────
  {
    lessonId: 'prog-ctrl-conditions',
    skills: [COND],
    prerequisites: ['prog-py-variables'],
    whyItMatters: 'โปรแกรมต้องตัดสินใจ เช่น ให้เกรดตามคะแนน หรืออนุญาตเมื่อเงื่อนไขครบ if / elif / else คือวิธีเลือกว่าจะรันโค้ดส่วนไหน',
    allowedKnowledge: [
      'if / elif / else และการเยื้อง (indentation) บอกขอบเขตของบล็อก',
      'นิพจน์บูลีนด้วย == != < > <= >=',
      'and or not',
      'Python ตรวจเงื่อนไขจากบนลงล่าง ทำบล็อกแรกที่จริงแล้วข้ามที่เหลือ',
      'เงื่อนไขซ้อน (if ใน if) ระดับพื้นฐาน',
    ],
    notYetAllowed: ['match / case', 'การวนซ้ำ', 'try / except', 'นิพจน์เงื่อนไขบรรทัดเดียว (x if c else y)'],
    concepts: [
      { id: 'c-bool', term: 'นิพจน์บูลีน', meaning: 'นิพจน์ที่ได้ค่า True หรือ False เช่น score >= 80', skillId: COND },
      { id: 'c-branch', term: 'การแตกทาง', meaning: 'Python ทำบล็อกแรกที่เงื่อนไขเป็นจริงเพียงบล็อกเดียว', skillId: COND },
      { id: 'c-indent', term: 'การเยื้อง', meaning: 'บรรทัดที่เยื้องเข้าไปใต้ if คือโค้ดที่อยู่ในเงื่อนไขนั้น', skillId: COND },
    ],
    rules: [
      { id: 'r-if', name: 'รูปแบบ', statement: 'if เงื่อนไข:\n    ...\nelif เงื่อนไข:\n    ...\nelse:\n    ...', skillId: COND },
      { id: 'r-eq', name: '= กับ ==', statement: '= กำหนดค่า, == เปรียบเทียบว่าเท่ากันไหม', skillId: COND },
      { id: 'r-logic', name: 'ตรรกะ', statement: 'A and B จริงเมื่อจริงทั้งคู่ · A or B จริงเมื่อจริงอย่างน้อยหนึ่ง · not A กลับค่า', skillId: COND },
    ],
    detailed: [
      'Python ตรวจ if ก่อน ถ้าจริงจะทำบล็อกนั้นแล้วข้าม elif / else ทั้งหมด ถ้าไม่จริงจึงไปตรวจ elif ถัดไป ลำดับเงื่อนไขจึงสำคัญ: เงื่อนไขที่แคบกว่าต้องมาก่อน',
      'เช่น ตัดเกรด ถ้าเขียน if score >= 50 ก่อน if score >= 80 คนได้ 95 จะได้ "ผ่าน" แทน "ดี" เพราะเงื่อนไขแรกจริงแล้วหยุด',
      'and / or ใช้รวมเงื่อนไข: ปีอธิกสุรทิน คือ (หาร 4 ลงตัว และ หาร 100 ไม่ลงตัว) หรือ หาร 400 ลงตัว — ใส่วงเล็บให้ชัดว่าส่วนไหนรวมกันก่อน',
    ],
    analogy: 'ทางแยกหลายทาง: ตรวจป้ายทีละป้ายจากบนลงล่าง เลี้ยวทางแรกที่ตรงเงื่อนไข แล้วไม่ดูป้ายที่เหลือ',
    workedExamples: [
      { id: 'we-1', skillId: COND, problem: 'ตัดเกรดคะแนน 72', code: 'score = 72\nif score >= 80:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")', steps: ['72 >= 80 เป็นเท็จ ข้ามไป', '72 >= 70 เป็นจริง ทำบล็อกนี้แสดง B', 'ไม่ตรวจ else อีก'], answer: 'B', verify: py('score = 72\nif score >= 80:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")', 'B') },
      { id: 'we-2', skillId: COND, problem: 'เข้าชมได้เมื่ออายุ 12 ปีขึ้นไปและมีตั๋ว', code: 'age = 15\nhas_ticket = True\nif age >= 12 and has_ticket:\n    print("เข้าได้")\nelse:\n    print("เข้าไม่ได้")', steps: ['age >= 12 → True', 'has_ticket → True', 'True and True → True แสดง เข้าได้'], answer: 'เข้าได้', verify: py('age = 15\nhas_ticket = True\nif age >= 12 and has_ticket:\n    print("เข้าได้")\nelse:\n    print("เข้าไม่ได้")', 'เข้าได้') },
    ],
    guided: [
      { id: 'g-1', skillId: COND, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 0\nif x > 0:\n    print("บวก")\nelif x < 0:\n    print("ลบ")\nelse:\n    print("ศูนย์")', hint: 'ไล่ทีละเงื่อนไขจากบน', answer: 'ศูนย์', explanation: 'ทั้ง x > 0 และ x < 0 เป็นเท็จ จึงไป else', verify: py('x = 0\nif x > 0:\n    print("บวก")\nelif x < 0:\n    print("ลบ")\nelse:\n    print("ศูนย์")', 'ศูนย์') },
      { id: 'g-2', skillId: COND, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(not (3 > 2))', hint: 'หาค่าในวงเล็บก่อน', answer: 'False', explanation: '3 > 2 เป็น True แล้ว not กลับเป็น False', verify: py('print(not (3 > 2))', 'False') },
      { id: 'g-3', skillId: COND, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'n = 10\nif n % 2 == 0:\n    print("คู่")\nelse:\n    print("คี่")', hint: 'n % 2 คือเศษจากการหารด้วย 2', answer: 'คู่', explanation: '10 % 2 = 0 จึงเป็นเลขคู่', verify: py('n = 10\nif n % 2 == 0:\n    print("คู่")\nelse:\n    print("คี่")', 'คู่') },
    ],
    independent: [
      { id: 'i-1', skillId: COND, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 't = 35\nif t > 30:\n    print("ร้อน")', answer: 'ร้อน', explanation: '35 > 30 เป็นจริง', verify: py('t = 35\nif t > 30:\n    print("ร้อน")', 'ร้อน') },
      { id: 'i-2', skillId: COND, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(4 == 4.0)', answer: 'True', explanation: '== เปรียบเทียบค่า 4 กับ 4.0 มีค่าเท่ากัน แม้ชนิดต่างกัน', verify: py('print(4 == 4.0)', 'True') },
      { id: 'i-3', skillId: COND, level: 2, prompt: 'โค้ดนี้แสดงอะไร และผิดตรงไหน', code: 'score = 95\nif score >= 50:\n    print("ผ่าน")\nelif score >= 80:\n    print("ดี")', answer: 'ผ่าน — ควรเช็ก >= 80 ก่อน', explanation: 'เงื่อนไขแรกจริงแล้วจึงไม่ตรวจ elif สลับลำดับจึงจะได้ "ดี"', verify: py('score = 95\nif score >= 50:\n    print("ผ่าน")\nelif score >= 80:\n    print("ดี")', 'ผ่าน') },
      { id: 'i-4', skillId: COND, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 7\nprint(x > 5 or x < 0)', answer: 'True', explanation: 'x > 5 เป็นจริง or จึงจริงทันที', verify: py('x = 7\nprint(x > 5 or x < 0)', 'True') },
      { id: 'i-5', skillId: COND, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'a = 3\nb = 3\nif a > b:\n    print("a มากกว่า")\nelif a == b:\n    print("เท่ากัน")\nelse:\n    print("b มากกว่า")', answer: 'เท่ากัน', explanation: 'a > b เท็จ แต่ a == b จริง', verify: py('a = 3\nb = 3\nif a > b:\n    print("a มากกว่า")\nelif a == b:\n    print("เท่ากัน")\nelse:\n    print("b มากกว่า")', 'เท่ากัน') },
      { id: 'i-6', skillId: COND, level: 3, prompt: 'ปี 2024 เป็นปีอธิกสุรทินหรือไม่ (โค้ดนี้แสดงอะไร)', code: 'y = 2024\nprint((y % 4 == 0 and y % 100 != 0) or y % 400 == 0)', answer: 'True', explanation: '2024 หาร 4 ลงตัวและหาร 100 ไม่ลงตัว', verify: py('y = 2024\nprint((y % 4 == 0 and y % 100 != 0) or y % 400 == 0)', 'True') },
    ],
    debugging: [
      { id: 'd-1', skillId: COND, buggy: 'x = 5\nif x = 5:\n    print("ห้า")', symptom: 'SyntaxError (ใช้ = ในเงื่อนไข)', fixed: 'x = 5\nif x == 5:\n    print("ห้า")', output: 'ห้า', explanation: 'การเปรียบเทียบใช้ == ส่วน = ใช้กำหนดค่า', verifyBuggy: pyErr('x = 5\nif x = 5:\n    print("ห้า")', 'SyntaxError'), verifyFixed: py('x = 5\nif x == 5:\n    print("ห้า")', 'ห้า') },
    ],
    checks: [
      { id: 'k-1', skillId: COND, prompt: 'ถ้า if และ elif เป็นจริงทั้งคู่ Python ทำอะไร', choices: ['ทำทั้งสองบล็อก', 'ทำเฉพาะบล็อกของ if', 'ทำเฉพาะบล็อกของ elif', 'เกิดข้อผิดพลาด'], correctIndex: 1, explanation: 'ทำบล็อกแรกที่จริงแล้วข้ามที่เหลือ', verify: py('x = 10\nif x > 5:\n    print("if")\nelif x > 1:\n    print("elif")', 'if') },
      { id: 'k-2', skillId: COND, prompt: 'ข้อใดใช้เปรียบเทียบว่าเท่ากัน', choices: ['x = 5', 'x == 5', 'x := 5', 'x === 5'], correctIndex: 1, misconceptions: [{ choice: 0, mistake: 0 }], explanation: '== คือเปรียบเทียบ = คือกำหนดค่า' },
      { id: 'k-3', skillId: COND, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 15\nif x > 20:\n    print("A")\nelif x > 10:\n    print("B")\nelse:\n    print("C")', choices: ['A', 'B', 'C', 'B แล้ว C'], correctIndex: 1, explanation: '15 > 20 เท็จ, 15 > 10 จริง', verify: py('x = 15\nif x > 20:\n    print("A")\nelif x > 10:\n    print("B")\nelse:\n    print("C")', 'B') },
      { id: 'k-4', skillId: COND, prompt: 'True and False or True ได้ค่าใด', code: 'print(True and False or True)', choices: ['True', 'False', 'None', 'เกิดข้อผิดพลาด'], correctIndex: 0, explanation: 'and ทำก่อน: True and False = False แล้ว False or True = True', verify: py('print(True and False or True)', 'True') },
    ],
    mistakes: [
      { mistake: 'ใช้ = แทน == ในเงื่อนไข', why: 'คณิตศาสตร์ใช้ = เพื่อบอกว่าเท่ากัน', fix: 'อ่าน == ว่า "เท่ากับไหม?" — Python จะแจ้ง SyntaxError ถ้าใช้ = ใน if' },
      { mistake: 'เรียงเงื่อนไขกว้างก่อนแคบ', why: 'เขียนตามลำดับที่นึกออก', fix: 'เรียงจากเงื่อนไขที่เข้มที่สุดก่อน เช่น >= 80 ก่อน >= 50 แล้วลองไล่ด้วยค่าสุดขั้ว' },
      { mistake: 'เยื้องบรรทัดไม่สม่ำเสมอ', why: 'ภาษาอื่นใช้ { } แต่ Python ใช้การเยื้อง', fix: 'ใช้ช่องว่าง 4 ตัวต่อหนึ่งระดับเสมอ ทุกบรรทัดในบล็อกเดียวกันต้องเยื้องเท่ากัน' },
    ],
    summary: ['ทำบล็อกแรกที่เงื่อนไขจริงเพียงบล็อกเดียว', 'เรียงเงื่อนไขจากแคบไปกว้าง', '== เปรียบเทียบ, and/or/not รวมเงื่อนไข'],
    afterLesson: ['เขียนเงื่อนไขหลายทางได้ถูกลำดับ', 'รวมเงื่อนไขด้วย and / or ได้', 'ไล่โค้ดที่มี if เพื่อทำนายผลลัพธ์ได้'],
    next: ['prog-ctrl-loops'],
    provenance: [
      { sourceId: 'python-311-reference-bundled', usedFor: 'if/elif/else, การเปรียบเทียบ และ and/or/not', crossChecked: true, evidence: [{ ref: 'topic:if', quote: 'It selects exactly one of the suites by evaluating the expressions one by one until one is found to be true', claim: 'ทำบล็อกแรกที่จริงเพียงบล็อกเดียว ตรวจจากบนลงล่าง' }, { ref: 'topic:comparisons', quote: 'Comparisons yield boolean values: "True" or "False".', claim: 'นิพจน์เปรียบเทียบได้ True/False' }, { ref: 'topic:booleans', quote: 'The expression "x and y" first evaluates *x*; if *x* is false, its value is returned; otherwise, *y* is evaluated and the resulting value is returned.', claim: 'and' }, { ref: 'topic:booleans', quote: 'The expression "x or y" first evaluates *x*; if *x* is true, its value is returned; otherwise, *y* is evaluated and the resulting value is returned.', claim: 'or' }, { ref: 'topic:booleans', quote: 'The operator "not" yields "True" if its argument is false, "False" otherwise.', claim: 'not' }] },
    ],
    audit: {
      sourcesFound: ['python-tutorial-controlflow', 'python-reference-expressions', 'เว็บสอนเชิงพาณิชย์'],
      sourcesSelected: ['python-311-reference-bundled', 'python-311-docstrings'],
      sourcesRejected: [{ source: 'หน้าเว็บ docs.python.org (ออนไลน์)', reason: 'เปิดจากสภาพแวดล้อมนี้ไม่ได้ จึงใช้ข้อความทางการชุดเดียวกันที่ติดมากับ Python แทน' }, { source: 'เว็บสอนเชิงพาณิชย์', reason: 'มีเอกสารทางการ' }],
      knowledgeCovered: ['if/elif/else', 'การเปรียบเทียบ', 'and/or/not', 'ลำดับเงื่อนไข', 'การเยื้อง'],
      knowledgeMissing: [],
      externalResourcesVerified: 0,
      limitations: [],
      nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจลิงก์ (เปิด YouTube จากสภาพแวดล้อมนี้ไม่ได้)', 'ยังไม่มีที่รันโค้ดในหน้าเว็บ'],
      verification: ['ข้อเท็จจริงสำคัญตรวจกับเอกสาร Python ทางการที่เปิดอ่านจริง (ข้อความอ้างอิงถูกตรวจซ้ำทุกครั้งที่รันชุดทดสอบ)', 'โค้ดทุกตัวอย่างและเฉลยรันด้วย Python 3.11 จริง'],
      readiness: 'READY',
    },
  },
  // ───────────────────────────────────────────────────────────────────
  {
    lessonId: 'prog-ctrl-loops',
    skills: [LOOP, TRACE],
    prerequisites: ['prog-ctrl-conditions'],
    whyItMatters: 'การวนซ้ำทำให้คอมพิวเตอร์ทำงานเดิมหลายพันครั้งได้ด้วยโค้ดไม่กี่บรรทัด และการไล่โค้ดทีละรอบคือทักษะหลักในการหาบั๊ก',
    allowedKnowledge: [
      'for กับ range(stop), range(start, stop), range(start, stop, step)',
      'for วนบนตัวอักษรของสตริง',
      'การสะสมค่า (ตัวแปรผลรวม ตัวนับ ตัวคูณสะสม)',
      'while เมื่อไม่รู้จำนวนรอบล่วงหน้า',
      'break เพื่อออกจากลูป',
      'การไล่โค้ด (trace) ทีละรอบด้วยตาราง',
    ],
    notYetAllowed: ['list comprehension', 'enumerate / zip', 'ลูปซ้อนที่ซับซ้อน', 'continue และ else ของลูป', 'การวนบน list/dict (บทถัดไป)'],
    concepts: [
      { id: 'c-range', term: 'range()', meaning: 'สร้างลำดับจำนวน ไม่รวมค่าสุดท้าย: range(1, 5) คือ 1 2 3 4', skillId: LOOP },
      { id: 'c-acc', term: 'ตัวสะสม', meaning: 'ตัวแปรที่ตั้งค่าเริ่มก่อนลูป แล้วอัปเดตทุกรอบ เช่น total = 0 แล้ว total += i', skillId: LOOP },
      { id: 'c-while', term: 'while', meaning: 'วนตราบใดที่เงื่อนไขยังจริง ต้องมีบางอย่างในลูปที่ทำให้เงื่อนไขเป็นเท็จในที่สุด', skillId: LOOP },
      { id: 'c-trace', term: 'การไล่โค้ด', meaning: 'จดค่าตัวแปรทุกรอบในตาราง เพื่อทำนายผลลัพธ์โดยไม่ต้องรัน', skillId: TRACE },
    ],
    rules: [
      { id: 'r-for', name: 'for', statement: 'for i in range(start, stop, step): …', notation: 'start รวม, stop ไม่รวม, step ค่าเพิ่มต่อรอบ (ค่าเริ่มต้น 1)', skillId: LOOP },
      { id: 'r-while', name: 'while', statement: 'while เงื่อนไข: … (อัปเดตตัวแปรในเงื่อนไขทุกรอบ)', skillId: LOOP },
      { id: 'r-aug', name: 'กำหนดค่าแบบย่อ', statement: 'x += 1 คือ x = x + 1 (ทำนองเดียวกัน −= *= //=)', skillId: LOOP },
    ],
    detailed: [
      'for เหมาะเมื่อรู้จำนวนรอบ เช่น ทำ 10 ครั้ง หรือวนทุกตัวอักษร while เหมาะเมื่อรู้แค่เงื่อนไขหยุด เช่น "ทำจนกว่าค่าจะเกิน 100"',
      'รูปแบบสะสมมีสามส่วนเสมอ: ตั้งค่าเริ่มก่อนลูป (0 สำหรับผลบวก 1 สำหรับผลคูณ) อัปเดตในลูป และใช้ผลหลังลูป ถ้าตั้งค่าเริ่มไว้ในลูป ค่าจะถูกล้างทุกรอบ',
      'ไล่โค้ดด้วยตาราง: หนึ่งแถวต่อหนึ่งรอบ หนึ่งคอลัมน์ต่อหนึ่งตัวแปร แล้วตรวจเงื่อนไขก่อนเริ่มรอบถัดไป วิธีนี้หาบั๊ก "เกินหรือขาดหนึ่งรอบ" ได้ดีที่สุด',
    ],
    workedExamples: [
      { id: 'we-1', skillId: LOOP, problem: 'ผลรวม 1 ถึง 5', code: 'total = 0\nfor i in range(1, 6):\n    total += i\nprint(total)', steps: ['range(1, 6) คือ 1 2 3 4 5 (ไม่รวม 6)', 'total: 0 → 1 → 3 → 6 → 10 → 15', 'print หลังลูปจึงแสดงครั้งเดียว'], answer: '15', verify: py('total = 0\nfor i in range(1, 6):\n    total += i\nprint(total)', '15') },
      { id: 'we-2', skillId: TRACE, problem: 'คูณ 2 ไปเรื่อย ๆ จนไม่น้อยกว่า 100', code: 'n = 1\nwhile n < 100:\n    n = n * 2\nprint(n)', steps: ['n: 1 → 2 → 4 → 8 → 16 → 32 → 64 → 128', 'ตอน n = 128 เงื่อนไข 128 < 100 เป็นเท็จ ลูปหยุด'], answer: '128', verify: py('n = 1\nwhile n < 100:\n    n = n * 2\nprint(n)', '128') },
    ],
    guided: [
      { id: 'g-1', skillId: LOOP, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'for i in range(3):\n    print(i)', hint: 'range(3) เริ่มที่ 0', answer: '0\n1\n2', explanation: 'range(3) คือ 0 1 2 (สามค่า ไม่รวม 3)', verify: py('for i in range(3):\n    print(i)', '0\n1\n2') },
      { id: 'g-2', skillId: LOOP, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'for i in range(2, 11, 4):\n    print(i)', hint: 'เริ่ม 2 เพิ่มทีละ 4 หยุดก่อน 11', answer: '2\n6\n10', explanation: '2, 6, 10 แล้ว 14 เกิน 11', verify: py('for i in range(2, 11, 4):\n    print(i)', '2\n6\n10') },
      { id: 'g-3', skillId: TRACE, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'count = 0\nfor ch in "banana":\n    if ch == "a":\n        count += 1\nprint(count)', hint: 'นับเฉพาะตัว a', answer: '3', explanation: 'b-a-n-a-n-a มี a สามตัว', verify: py('count = 0\nfor ch in "banana":\n    if ch == "a":\n        count += 1\nprint(count)', '3') },
    ],
    independent: [
      { id: 'i-1', skillId: LOOP, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print(list(range(5)))', answer: '[0, 1, 2, 3, 4]', explanation: 'list() แสดงทุกค่าที่ range สร้าง', verify: py('print(list(range(5)))', '[0, 1, 2, 3, 4]') },
      { id: 'i-2', skillId: LOOP, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 's = 0\nfor i in range(4):\n    s += 2\nprint(s)', answer: '8', explanation: 'วน 4 รอบ บวกรอบละ 2', verify: py('s = 0\nfor i in range(4):\n    s += 2\nprint(s)', '8') },
      { id: 'i-3', skillId: LOOP, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'for i in range(10):\n    if i == 3:\n        break\n    print(i)', answer: '0\n1\n2', explanation: 'พอ i = 3 break ออกจากลูปก่อน print', verify: py('for i in range(10):\n    if i == 3:\n        break\n    print(i)', '0\n1\n2') },
      { id: 'i-4', skillId: LOOP, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'p = 1\nfor i in range(1, 6):\n    p *= i\nprint(p)', answer: '120', explanation: 'ผลคูณสะสม 1·2·3·4·5 (เริ่มที่ 1 ไม่ใช่ 0)', verify: py('p = 1\nfor i in range(1, 6):\n    p *= i\nprint(p)', '120') },
      { id: 'i-5', skillId: TRACE, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'x = 10\nsteps = 0\nwhile x > 1:\n    x //= 2\n    steps += 1\nprint(steps)', answer: '3', explanation: 'x: 10 → 5 → 2 → 1 ใช้ 3 รอบ แล้ว 1 > 1 เป็นเท็จ', verify: py('x = 10\nsteps = 0\nwhile x > 1:\n    x //= 2\n    steps += 1\nprint(steps)', '3') },
      { id: 'i-6', skillId: TRACE, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'for i in range(1, 4):\n    print("*" * i)', answer: '*\n**\n***', explanation: 'สตริงคูณ i ให้ดาว i ดวงต่อบรรทัด', verify: py('for i in range(1, 4):\n    print("*" * i)', '*\n**\n***') },
    ],
    debugging: [
      { id: 'd-1', skillId: TRACE, buggy: 'total = 0\nfor i in range(1, 4):\n    total = 0\n    total += i\nprint(total)', symptom: 'แสดง 3 แทนที่จะเป็น 6 (ไม่มีข้อผิดพลาด แต่ผลผิด)', fixed: 'total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)', output: '6', explanation: 'ตั้ง total = 0 ไว้ในลูปทำให้ค่าถูกล้างทุกรอบ ต้องตั้งค่าเริ่มนอกลูป', verifyBuggy: py('total = 0\nfor i in range(1, 4):\n    total = 0\n    total += i\nprint(total)', '3'), verifyFixed: py('total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)', '6') },
    ],
    checks: [
      { id: 'k-1', skillId: LOOP, prompt: 'range(1, 5) มีจำนวนกี่ตัว', choices: ['3', '4', '5', '6'], correctIndex: 1, misconceptions: [{ choice: 2, mistake: 0 }], explanation: '1 2 3 4 — ไม่รวม 5', verify: py('print(len(range(1, 5)))', '4') },
      { id: 'k-2', skillId: TRACE, prompt: 'โค้ดนี้แสดงอะไร', code: 's = 0\nfor i in range(3):\n    s += i\nprint(s)', choices: ['3', '6', '0', '2'], correctIndex: 0, explanation: '0 + 1 + 2 = 3 (range(3) เริ่มที่ 0)', verify: py('s = 0\nfor i in range(3):\n    s += i\nprint(s)', '3') },
      { id: 'k-3', skillId: LOOP, prompt: 'ควรใช้ while แทน for เมื่อใด', choices: ['เมื่อรู้จำนวนรอบแน่นอน', 'เมื่อรู้แต่เงื่อนไขหยุด ไม่รู้จำนวนรอบ', 'เมื่อวนบนสตริง', 'ไม่มีความต่าง'], correctIndex: 1, explanation: 'while วนจนเงื่อนไขเป็นเท็จ เหมาะเมื่อไม่รู้จำนวนรอบล่วงหน้า' },
      { id: 'k-4', skillId: LOOP, prompt: 'break ทำอะไร', choices: ['ข้ามรอบนี้แล้ววนต่อ', 'ออกจากลูปทันที', 'หยุดโปรแกรมทั้งหมด', 'เริ่มลูปใหม่'], correctIndex: 1, explanation: 'break ออกจากลูปที่อยู่ข้างในสุด แล้วทำคำสั่งหลังลูปต่อ', verify: py('for i in range(5):\n    if i == 1:\n        break\nprint(i)', '1') },
    ],
    mistakes: [
      { mistake: 'คิดว่า range(1, 5) รวม 5', why: 'ภาษาพูดว่า "1 ถึง 5" มักรวมทั้งสองปลาย', fix: 'จำว่า stop ไม่รวมเสมอ อยากได้ 1 ถึง 5 ให้เขียน range(1, 6)' },
      { mistake: 'ตั้งค่าตัวสะสมในลูป', why: 'เขียนทุกอย่างไว้ในลูปเดียวกัน', fix: 'ตั้งค่าเริ่มก่อน for เสมอ ในลูปมีเฉพาะการอัปเดต' },
      { mistake: 'while ที่ไม่เคยหยุด (infinite loop)', why: 'ลืมอัปเดตตัวแปรในเงื่อนไข', fix: 'ถามตัวเองว่า "บรรทัดไหนทำให้เงื่อนไขเป็นเท็จในที่สุด" ถ้าไม่มี ให้เพิ่ม' },
    ],
    summary: ['for + range เมื่อรู้จำนวนรอบ — stop ไม่รวม', 'while เมื่อรู้แต่เงื่อนไขหยุด ต้องอัปเดตตัวแปรในเงื่อนไข', 'ตัวสะสม: ตั้งค่าก่อนลูป อัปเดตในลูป ใช้หลังลูป'],
    afterLesson: ['ใช้ for กับ range() ได้ถูกต้อง', 'สะสมผลรวม ผลคูณ และจำนวนนับในลูปได้', 'เลือกใช้ while เมื่อไม่รู้จำนวนรอบ และไล่โค้ดทำนายผลได้'],
    next: ['prog-fn-functions'],
    provenance: [
      { sourceId: 'python-311-reference-bundled', usedFor: 'for, while, break และการกำหนดค่าแบบย่อ', crossChecked: true, evidence: [{ ref: 'topic:for', quote: 'The "for" statement is used to iterate over the elements of a sequence', claim: 'for วนตามสมาชิกของลำดับ' }, { ref: 'topic:while', quote: 'The "while" statement is used for repeated execution as long as an expression is true', claim: 'while วนตราบที่เงื่อนไขจริง' }, { ref: 'topic:break', quote: 'It terminates the nearest enclosing loop', claim: 'break ออกจากลูปที่อยู่ใกล้ที่สุด' }, { ref: 'topic:augassign', quote: 'An augmented assignment evaluates the target', claim: 'x += 1 เป็นการกำหนดค่าแบบย่อ' }] },
      { sourceId: 'python-311-docstrings', usedFor: 'range() ไม่รวมค่าสุดท้าย', crossChecked: true, evidence: [{ ref: 'doc:range', quote: 'Return an object that produces a sequence of integers from start (inclusive) to stop (exclusive) by step.', claim: 'start รวม stop ไม่รวม' }] },
    ],
    audit: {
      sourcesFound: ['python-tutorial-controlflow', 'python-tutorial-introduction', 'เว็บสอนเชิงพาณิชย์'],
      sourcesSelected: ['python-311-reference-bundled', 'python-311-docstrings'],
      sourcesRejected: [{ source: 'หน้าเว็บ docs.python.org (ออนไลน์)', reason: 'เปิดจากสภาพแวดล้อมนี้ไม่ได้ จึงใช้ข้อความทางการชุดเดียวกันที่ติดมากับ Python แทน' }, { source: 'เว็บสอนเชิงพาณิชย์', reason: 'มีเอกสารทางการ' }],
      knowledgeCovered: ['for/range', 'การสะสม', 'while', 'break', 'การไล่โค้ด'],
      knowledgeMissing: [],
      externalResourcesVerified: 0,
      limitations: [],
      nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจลิงก์ (เปิด YouTube จากสภาพแวดล้อมนี้ไม่ได้)', 'ยังไม่มีที่รันโค้ดในหน้าเว็บ'],
      verification: ['ข้อเท็จจริงสำคัญตรวจกับเอกสาร Python ทางการที่เปิดอ่านจริง (ข้อความอ้างอิงถูกตรวจซ้ำทุกครั้งที่รันชุดทดสอบ)', 'โค้ดทุกตัวอย่างและเฉลยรันด้วย Python 3.11 จริง'],
      readiness: 'READY',
    },
  },
  // ───────────────────────────────────────────────────────────────────
  {
    lessonId: 'prog-fn-functions',
    skills: [FN, COL],
    prerequisites: ['prog-ctrl-loops'],
    whyItMatters: 'ฟังก์ชันทำให้เขียนครั้งเดียวใช้ซ้ำได้ และ list/dict ทำให้เก็บข้อมูลหลายค่าได้เป็นระบบ — สามอย่างนี้รวมกันคือโครงของโปรแกรมจริงเกือบทุกตัว',
    allowedKnowledge: [
      'def ชื่อ(พารามิเตอร์): และ return',
      'ความต่างของ print กับ return; ฟังก์ชันที่ไม่ return คืน None',
      'list: สร้าง เข้าถึงด้วย index (เริ่มที่ 0) append() len() และวนด้วย for',
      'dict: คู่ key–value เข้าถึงด้วย key เพิ่ม/แก้ค่า get() และวนบน key',
    ],
    notYetAllowed: ['ค่าเริ่มต้นของพารามิเตอร์และ *args/**kwargs', 'การเรียกซ้ำ (recursion)', 'lambda', 'tuple set และ comprehension', 'คลาสและออบเจ็กต์', 'การ slice ขั้นสูง'],
    concepts: [
      { id: 'c-func', term: 'ฟังก์ชัน', meaning: 'ชุดคำสั่งที่มีชื่อ รับค่าผ่านพารามิเตอร์ และส่งผลกลับด้วย return', skillId: FN },
      { id: 'c-return', term: 'return กับ print', meaning: 'return ส่งค่ากลับให้ผู้เรียกนำไปใช้ต่อ print แค่แสดงบนจอ', skillId: FN },
      { id: 'c-list', term: 'list', meaning: 'ลำดับค่าที่เรียงกัน เข้าถึงด้วยตำแหน่ง xs[0] คือตัวแรก', skillId: COL },
      { id: 'c-dict', term: 'dict', meaning: 'ตารางจับคู่ key → value ค้นค่าด้วย key แทนตำแหน่ง', skillId: COL },
    ],
    rules: [
      { id: 'r-def', name: 'ประกาศฟังก์ชัน', statement: 'def name(a, b):\n    return ผลลัพธ์', skillId: FN },
      { id: 'r-list', name: 'list', statement: 'xs = [3, 1, 4] · xs[0] → 3 · xs.append(1) · len(xs)', skillId: COL },
      { id: 'r-dict', name: 'dict', statement: 'd = {"math": 80} · d["math"] → 80 · d["phy"] = 70 · d.get("x", 0)', skillId: COL },
    ],
    detailed: [
      'พารามิเตอร์คือตัวแปรในวงเล็บตอนประกาศ อาร์กิวเมนต์คือค่าที่ส่งตอนเรียก area(3, 4) ส่ง 3 ให้ w และ 4 ให้ h ตามลำดับ',
      'return จบการทำงานของฟังก์ชันและส่งค่ากลับ ถ้าฟังก์ชันใช้ print แทน ผู้เรียกจะได้ None กลับมา จึงนำผลไปคำนวณต่อไม่ได้',
      'list เหมาะกับข้อมูลที่มีลำดับ ส่วน dict เหมาะกับข้อมูลที่ค้นด้วยชื่อ การอ่าน key ที่ไม่มีด้วย d[key] จะเกิด KeyError ถ้าไม่แน่ใจว่ามี ให้ใช้ d.get(key, ค่าสำรอง)',
    ],
    analogy: 'ฟังก์ชันเหมือนเครื่องคั้นน้ำผลไม้: ใส่ผลไม้ (อาร์กิวเมนต์) ได้น้ำผลไม้กลับมา (return) — dict เหมือนสมุดโทรศัพท์ที่หาเบอร์จากชื่อ',
    workedExamples: [
      { id: 'we-1', skillId: FN, problem: 'ฟังก์ชันหาพื้นที่สี่เหลี่ยม', code: 'def area(w, h):\n    return w * h\n\nprint(area(3, 4))', steps: ['area(3, 4): w = 3, h = 4', 'return 12 กลับไปที่จุดเรียก', 'print แสดง 12'], answer: '12', verify: py('def area(w, h):\n    return w * h\n\nprint(area(3, 4))', '12') },
      { id: 'we-2', skillId: COL, problem: 'เก็บคะแนนแต่ละวิชาใน dict แล้วแสดงทั้งหมด', code: 'scores = {"math": 80, "phy": 70}\nscores["prog"] = 90\nfor k in scores:\n    print(k, scores[k])', steps: ['เพิ่ม key ใหม่ด้วย scores["prog"] = 90', 'for วนบน key ตามลำดับที่ใส่', 'แต่ละรอบแสดง key และค่า'], answer: 'math 80\nphy 70\nprog 90', verify: py('scores = {"math": 80, "phy": 70}\nscores["prog"] = 90\nfor k in scores:\n    print(k, scores[k])', 'math 80\nphy 70\nprog 90') },
    ],
    guided: [
      { id: 'g-1', skillId: FN, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'def double(x):\n    return x * 2\n\nprint(double(5))', hint: 'แทน x ด้วย 5', answer: '10', explanation: 'double(5) คืน 10', verify: py('def double(x):\n    return x * 2\n\nprint(double(5))', '10') },
      { id: 'g-2', skillId: COL, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'nums = [3, 1, 4]\nnums.append(1)\nprint(len(nums))', hint: 'append เพิ่มหนึ่งตัวท้าย list', answer: '4', explanation: 'เดิม 3 ตัว เพิ่ม 1 เป็น 4', verify: py('nums = [3, 1, 4]\nnums.append(1)\nprint(len(nums))', '4') },
      { id: 'g-3', skillId: COL, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'd = {"a": 1}\nprint(d.get("b", 0))', hint: 'ไม่มี key "b"', answer: '0', explanation: 'get คืนค่าสำรองเมื่อไม่พบ key แทนการเกิด KeyError', verify: py('d = {"a": 1}\nprint(d.get("b", 0))', '0') },
    ],
    independent: [
      { id: 'i-1', skillId: COL, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'print([10, 20, 30][1])', answer: '20', explanation: 'index เริ่มที่ 0 ตำแหน่ง 1 คือตัวที่สอง', verify: py('print([10, 20, 30][1])', '20') },
      { id: 'i-2', skillId: FN, level: 1, prompt: 'โค้ดนี้แสดงอะไร', code: 'def greet(name):\n    return "Hi " + name\n\nprint(greet("Ann"))', answer: 'Hi Ann', explanation: 'คืนสตริงที่ต่อกันแล้ว', verify: py('def greet(name):\n    return "Hi " + name\n\nprint(greet("Ann"))', 'Hi Ann') },
      { id: 'i-3', skillId: FN, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n    return s\n\nprint(total([2, 4, 6]))', answer: '12', explanation: 'วนบวกทุกตัวใน list แล้วคืนผลรวม', verify: py('def total(xs):\n    s = 0\n    for x in xs:\n        s += x\n    return s\n\nprint(total([2, 4, 6]))', '12') },
      { id: 'i-4', skillId: FN, level: 2, prompt: 'โค้ดนี้แสดงอะไร', code: 'def f():\n    print("in")\n\nr = f()\nprint(r)', answer: 'in\nNone', explanation: 'f แสดง "in" แต่ไม่ return จึงคืน None', verify: py('def f():\n    print("in")\n\nr = f()\nprint(r)', 'in\nNone') },
      { id: 'i-5', skillId: COL, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'words = ["a", "b", "a"]\nc = {}\nfor w in words:\n    c[w] = c.get(w, 0) + 1\nprint(c)', answer: "{'a': 2, 'b': 1}", explanation: 'นับความถี่: get คืน 0 เมื่อยังไม่เคยเจอคำนั้น', verify: py('words = ["a", "b", "a"]\nc = {}\nfor w in words:\n    c[w] = c.get(w, 0) + 1\nprint(c)', "{'a': 2, 'b': 1}") },
      { id: 'i-6', skillId: FN, level: 3, prompt: 'โค้ดนี้แสดงอะไร', code: 'def max_of(xs):\n    m = xs[0]\n    for x in xs:\n        if x > m:\n            m = x\n    return m\n\nprint(max_of([3, 9, 2]))', answer: '9', explanation: 'เริ่มจากตัวแรก แล้วแทนที่เมื่อเจอตัวที่มากกว่า', verify: py('def max_of(xs):\n    m = xs[0]\n    for x in xs:\n        if x > m:\n            m = x\n    return m\n\nprint(max_of([3, 9, 2]))', '9') },
    ],
    debugging: [
      { id: 'd-1', skillId: COL, buggy: 'd = {"a": 1}\nprint(d["b"])', symptom: "KeyError: 'b'", fixed: 'd = {"a": 1}\nprint(d.get("b", 0))', output: '0', explanation: 'อ่าน key ที่ไม่มีด้วย [ ] จะเกิด KeyError ใช้ get กับค่าสำรองแทน', verifyBuggy: pyErr('d = {"a": 1}\nprint(d["b"])', 'KeyError'), verifyFixed: py('d = {"a": 1}\nprint(d.get("b", 0))', '0') },
    ],
    checks: [
      { id: 'k-1', skillId: FN, prompt: 'return ต่างจาก print อย่างไร', choices: ['เหมือนกัน', 'return ส่งค่ากลับให้ผู้เรียกใช้ต่อ print แค่แสดงบนจอ', 'print ส่งค่ากลับ return แสดงบนจอ', 'return ใช้ได้แค่กับตัวเลข'], correctIndex: 1, misconceptions: [{ choice: 0, mistake: 0 }], explanation: 'ค่าที่ return นำไปคำนวณหรือเก็บต่อได้' },
      { id: 'k-2', skillId: COL, prompt: 'xs = [5, 6, 7] แล้ว xs[0] คืออะไร', code: 'xs = [5, 6, 7]\nprint(xs[0])', choices: ['5', '6', '7', 'IndexError'], correctIndex: 0, misconceptions: [{ choice: 1, mistake: 1 }], explanation: 'index เริ่มที่ 0', verify: py('xs = [5, 6, 7]\nprint(xs[0])', '5') },
      { id: 'k-3', skillId: COL, prompt: 'โค้ดนี้แสดงอะไร', code: 'd = {"x": 3, "y": 4}\nprint(d["y"])', choices: ['3', '4', 'y', 'KeyError'], correctIndex: 1, explanation: 'ค้นค่าด้วย key "y"', verify: py('d = {"x": 3, "y": 4}\nprint(d["y"])', '4') },
      { id: 'k-4', skillId: FN, prompt: 'ฟังก์ชันที่ไม่มี return คืนค่าอะไร', code: 'def g():\n    x = 1\n\nprint(g())', choices: ['0', '1', 'None', 'เกิดข้อผิดพลาด'], correctIndex: 2, explanation: 'Python คืน None ให้อัตโนมัติ', verify: py('def g():\n    x = 1\n\nprint(g())', 'None') },
    ],
    mistakes: [
      { mistake: 'ใช้ print ในฟังก์ชันแทน return แล้วนำผลไปคำนวณต่อ', why: 'เห็นผลบนจอจึงคิดว่าฟังก์ชันส่งค่ากลับแล้ว', fix: 'ใช้ return เมื่อผลต้องถูกใช้ต่อ แล้ว print ที่จุดเรียกถ้าต้องการแสดง' },
      { mistake: 'คิดว่าตัวแรกของ list อยู่ที่ index 1', why: 'การนับในชีวิตประจำวันเริ่มที่ 1', fix: 'ตัวแรกคือ xs[0] ตัวสุดท้ายคือ xs[len(xs) − 1]' },
      { mistake: 'อ่าน key ที่ไม่มีใน dict แล้วเจอ KeyError', why: 'คิดว่า dict จะคืนค่าว่างให้เอง', fix: 'ใช้ d.get(key, ค่าสำรอง) หรือตรวจด้วย if key in d ก่อน' },
    ],
    summary: ['def ประกาศ, return ส่งค่ากลับ (ไม่มี return → None)', 'list เรียงตามตำแหน่ง index เริ่ม 0', 'dict ค้นด้วย key, ใช้ get เมื่อ key อาจไม่มี'],
    afterLesson: ['เขียนฟังก์ชันที่รับพารามิเตอร์และคืนค่าได้', 'วนลูปบน list และใช้ append len ได้', 'ค้นค่าและนับความถี่ด้วย dict ได้'],
    next: [],
    provenance: [
      { sourceId: 'python-311-reference-bundled', usedFor: 'def/return, list และ dict', crossChecked: true, evidence: [{ ref: 'topic:function', quote: 'A function definition defines a user-defined function object', claim: 'def ประกาศฟังก์ชัน' }, { ref: 'topic:return', quote: '"return" leaves the current function call with the expression list (or "None") as return value.', claim: 'return ส่งค่ากลับ ไม่มีค่า = None' }, { ref: 'topic:typesseq', quote: '*i*th item of *s*, origin 0', claim: 'index เริ่มที่ 0' }, { ref: 'topic:typesseq-mutable', quote: '"s.append(x)" | appends *x* to the end of the', claim: 'append เพิ่มท้าย list' }, { ref: 'topic:typesmapping', quote: 'Return the item of *d* with key *key*. Raises a "KeyError" if *key* is not in the map.', claim: 'd[key] และ KeyError' }, { ref: 'topic:typesmapping', quote: 'Return the value for *key* if *key* is in the dictionary, else *default*.', claim: 'd.get(key, default)' }, { ref: 'topic:typesmapping', quote: 'Set "d[key]" to *value*.', claim: 'เพิ่ม/แก้ค่าด้วย d[key] = value' }] },
      { sourceId: 'python-311-docstrings', usedFor: 'len()', crossChecked: true, evidence: [{ ref: 'doc:len', quote: 'Return the number of items in a container.', claim: 'len นับจำนวนสมาชิก' }] },
    ],
    audit: {
      sourcesFound: ['python-tutorial-controlflow', 'python-tutorial-datastructures', 'มิเรอร์ซอร์สโค้ดเอกสาร Python'],
      sourcesSelected: ['python-311-reference-bundled', 'python-311-docstrings'],
      sourcesRejected: [{ source: 'หน้าเว็บ docs.python.org (ออนไลน์)', reason: 'เปิดจากสภาพแวดล้อมนี้ไม่ได้ จึงใช้ข้อความทางการชุดเดียวกันที่ติดมากับ Python แทน' }, { source: 'มิเรอร์ซอร์สเอกสาร (googlesource)', reason: 'ใช้ docs.python.org ต้นฉบับแทน' }],
      knowledgeCovered: ['def/return', 'None', 'list index append len', 'dict key get', 'การวนบน list/dict'],
      knowledgeMissing: [],
      externalResourcesVerified: 0,
      limitations: [],
      nonBlocking: ['ยังไม่มีคลิปภายนอกที่ผ่านการตรวจลิงก์ (เปิด YouTube จากสภาพแวดล้อมนี้ไม่ได้)', 'ยังไม่มีที่รันโค้ดในหน้าเว็บ'],
      verification: ['ข้อเท็จจริงสำคัญตรวจกับเอกสาร Python ทางการที่เปิดอ่านจริง (ข้อความอ้างอิงถูกตรวจซ้ำทุกครั้งที่รันชุดทดสอบ)', 'โค้ดทุกตัวอย่างและเฉลยรันด้วย Python 3.11 จริง'],
      readiness: 'READY',
    },
  },
];
