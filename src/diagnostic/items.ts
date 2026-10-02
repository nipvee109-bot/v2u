/* =========================================================================
   V2U Diagnostic items (Phase 60) — written by V2U
   -------------------------------------------------------------------------
   Two items per existing curriculum skill (23 skills → 46 items):
   one "basic" (the prerequisite idea) and one "core" (the skill as taught).
   Items are NOT copies of lesson quizzes/exercises (checked by tests).
   Answers are verified by tests (Python is executed; math/physics recomputed).
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { getOrderedCurriculumLessons } from '../curriculum/engine';
import type { CurriculumSubjectId } from '../curriculum/types';
import type { DiagnosticItem, DiagnosticLevel } from './types';

const ORDER = getOrderedCurriculumLessons(CURRICULUM);
/** The first lesson (teaching order) that teaches the skill. */
const lessonFor = (skillId: string) => ORDER.find((l) => l.skillIds.includes(skillId))?.id ?? '';

type Raw = [id: string, skillId: string, level: DiagnosticLevel, prompt: string, choices: string[], correctIndex: number, explanation: string, code?: string];

const build = (subjectId: CurriculumSubjectId, rows: Raw[]): DiagnosticItem[] =>
  rows.map(([id, skillId, level, prompt, choices, correctIndex, explanation, code]) => ({
    id,
    subjectId,
    skillId,
    lessonId: lessonFor(skillId),
    level,
    prompt,
    ...(code ? { code } : {}),
    choices,
    correctIndex,
    explanation,
  }));

const MATH: Raw[] = [
  ['dm-solve-1', 'skill-math-solve-linear', 'basic', '4x − 7 = 13 แล้ว x เท่ากับเท่าใด', ['3', '5', '6', '20/4 − 7'], 1, '4x = 20 → x = 5'],
  ['dm-solve-2', 'skill-math-solve-linear', 'core', '3(x − 2) = x + 8 แล้ว x เท่ากับเท่าใด', ['5', '7', '10', '14'], 1, '3x − 6 = x + 8 → 2x = 14 → x = 7'],
  ['dm-check-1', 'skill-math-check-solution', 'basic', 'ข้อใดเป็นคำตอบของ 2x + 5 = 17', ['x = 5', 'x = 6', 'x = 11', 'x = 8.5'], 1, 'แทน x = 6: 2(6) + 5 = 17 ✓'],
  ['dm-check-2', 'skill-math-check-solution', 'core', 'เพื่อนแก้ 5x − 3 = 12 ได้ x = 2 คำตอบนี้เป็นอย่างไร', ['ถูก', 'ผิด เพราะแทนแล้วได้ 7 ไม่ใช่ 12', 'ผิด เพราะ x ต้องเป็นจำนวนลบ', 'ตรวจไม่ได้'], 1, 'แทน x = 2: 5(2) − 3 = 7 ≠ 12 คำตอบที่ถูกคือ x = 3'],
  ['dm-system-1', 'skill-math-linear-system', 'basic', 'x + y = 7 และ x − y = 3 แล้ว (x, y) คือข้อใด', ['(5, 2)', '(4, 3)', '(2, 5)', '(10, −3)'], 0, 'บวกกัน 2x = 10 → x = 5, y = 2'],
  ['dm-system-2', 'skill-math-linear-system', 'core', 'y = x + 1 และ 2x + y = 10 แล้ว x เท่ากับเท่าใด', ['2', '3', '4', '9'], 1, 'แทน y: 2x + x + 1 = 10 → 3x = 9 → x = 3'],
  ['dm-word-1', 'skill-math-word-problem', 'basic', '“จำนวนหนึ่งบวก 8 เท่ากับ 3 เท่าของจำนวนนั้น” เขียนเป็นสมการได้ข้อใด', ['x + 8 = 3x', '8x = x + 3', 'x + 3 = 8x', '3(x + 8) = x'], 0, 'จำนวนนั้นคือ x: x + 8 = 3x'],
  ['dm-word-2', 'skill-math-word-problem', 'core', 'ซื้อสมุด 3 เล่มกับปากกา 2 ด้าม จ่าย 70 บาท ปากกาด้ามละ 5 บาท สมุดเล่มละกี่บาท', ['15', '20', '22', '30'], 1, '3s + 2(5) = 70 → 3s = 60 → s = 20'],
  ['dm-ineq-1', 'skill-math-solve-inequality', 'basic', '2x + 3 < 11 คำตอบคือข้อใด', ['x < 4', 'x > 4', 'x < 7', 'x ≤ 4'], 0, '2x < 8 → x < 4'],
  ['dm-ineq-2', 'skill-math-solve-inequality', 'core', '−4x ≥ 8 คำตอบคือข้อใด', ['x ≥ −2', 'x ≤ −2', 'x ≥ 2', 'x ≤ 2'], 1, 'หารด้วย −4 ต้องกลับเครื่องหมาย: x ≤ −2'],
  ['dm-exp-1', 'skill-math-exponent-laws', 'basic', '5³ เท่ากับเท่าใด', ['15', '125', '25', '243'], 1, '5 × 5 × 5 = 125'],
  ['dm-exp-2', 'skill-math-exponent-laws', 'core', 'a⁴ × a³ ÷ a² เท่ากับข้อใด', ['a⁵', 'a⁹', 'a⁶', 'a¹⁴'], 0, '4 + 3 − 2 = 5'],
  ['dm-slope-1', 'skill-math-slope', 'basic', 'เส้นตรงที่ลาดลงจากซ้ายไปขวามีความชันแบบใด', ['บวก', 'ลบ', 'ศูนย์', 'ไม่มีค่า'], 1, 'x เพิ่มแล้ว y ลด ความชันจึงติดลบ'],
  ['dm-slope-2', 'skill-math-slope', 'core', 'ความชันของเส้นที่ผ่าน (0, 1) และ (2, 7) เท่ากับเท่าใด', ['2', '3', '4', '6'], 1, '(7 − 1)/(2 − 0) = 3'],
  ['dm-graph-1', 'skill-math-graph-reading', 'basic', 'เส้น y = −x + 5 ตัดแกน y ที่จุดใด', ['(0, 5)', '(5, 0)', '(0, −1)', '(−1, 5)'], 0, 'ตัดแกน y เมื่อ x = 0: y = 5'],
  ['dm-graph-2', 'skill-math-graph-reading', 'core', 'เส้น y = 2x + 4 มีค่า y เท่าใดเมื่อ x = 3', ['7', '9', '10', '14'], 2, '2(3) + 4 = 10'],
  ['dm-trig-1', 'skill-math-trig-ratio', 'basic', 'ในสามเหลี่ยมมุมฉาก sin θ เท่ากับข้อใด', ['ด้านประชิด ÷ ด้านตรงข้ามมุมฉาก', 'ด้านตรงข้าม ÷ ด้านตรงข้ามมุมฉาก', 'ด้านตรงข้าม ÷ ด้านประชิด', 'ด้านตรงข้ามมุมฉาก ÷ ด้านตรงข้าม'], 1, 'sin = ข้าม/ฉาก'],
  ['dm-trig-2', 'skill-math-trig-ratio', 'core', 'ด้านตรงข้ามมุม θ ยาว 6 ด้านประชิดยาว 8 แล้ว tan θ เท่ากับเท่าใด', ['3/4', '4/3', '3/5', '4/5'], 0, 'tan = ข้าม/ชิด = 6/8 = 3/4'],
  ['dm-angle-1', 'skill-math-special-angles', 'basic', 'cos 60° เท่ากับเท่าใด', ['√3/2', '1/2', '1', '√2/2'], 1, 'cos 60° = 1/2'],
  ['dm-angle-2', 'skill-math-special-angles', 'core', 'sin 45° เท่ากับเท่าใด', ['1/2', '√3/2', '√2/2', '1'], 2, 'sin 45° = √2/2'],
];

const PROGRAMMING: Raw[] = [
  ['dp-var-1', 'skill-prog-variables', 'basic', 'หลังรันโค้ดนี้ x มีค่าเท่าใด', ['5', '2', '7', 'x + 2'], 2, 'ทางขวาคำนวณก่อน 5 + 2 = 7 แล้วเก็บลง x', 'x = 5\nx = x + 2'],
  ['dp-var-2', 'skill-prog-variables', 'core', 'type("3.5") เป็นชนิดใด', ['int', 'float', 'str', 'bool'], 2, 'อยู่ในเครื่องหมายคำพูดจึงเป็นข้อความ (str)'],
  ['dp-op-1', 'skill-prog-operators', 'basic', 'โค้ดนี้แสดงอะไร', ['2', '1', '2.25', '0'], 1, '% คือเศษจากการหาร 9 ÷ 4 เหลือเศษ 1', 'print(9 % 4)'],
  ['dp-op-2', 'skill-prog-operators', 'core', 'โค้ดนี้แสดงอะไร', ['7', '9', '12', '64'], 1, '** ทำก่อน: 2³ = 8 แล้ว + 1 = 9', 'print(2 ** 3 + 1)'],
  ['dp-io-1', 'skill-prog-io', 'basic', 'name = "บี" แล้ว print(f"สวัสดี {name}") แสดงอะไร', ['สวัสดี {name}', 'สวัสดี บี', 'f"สวัสดี บี"', 'สวัสดี name'], 1, 'f-string แทรกค่าของ name ลงใน { }'],
  ['dp-io-2', 'skill-prog-io', 'core', 'n = input() ผู้ใช้พิมพ์ 4 ต้องเขียนข้อใดจึงได้ผลลัพธ์เป็นตัวเลข 8', ['n * 2', 'int(n) * 2', 'str(n) * 2', 'n + n'], 1, 'input() ได้ข้อความ "4" ต้องแปลงด้วย int() ก่อน (n + n ได้ "44")'],
  ['dp-cond-1', 'skill-prog-conditions', 'basic', 'โค้ดนี้แสดงอะไร', ['ใหญ่', 'เล็ก', 'ใหญ่เล็ก', 'error'], 0, '12 > 10 เป็นจริง จึงทำบล็อก if', 'x = 12\nif x > 10:\n    print("ใหญ่")\nelse:\n    print("เล็ก")'],
  ['dp-cond-2', 'skill-prog-conditions', 'core', 'โค้ดนี้แสดงอะไร', ['A', 'C', 'F', 'ไม่แสดงอะไร'], 1, '65 ไม่ถึง 80 แต่ถึง 60 จึงเข้า elif', 'score = 65\nif score >= 80:\n    print("A")\nelif score >= 60:\n    print("C")\nelse:\n    print("F")'],
  ['dp-loop-1', 'skill-prog-loops', 'basic', 'for i in range(1, 4): ทำซ้ำกี่รอบ', ['3', '4', '5', '1'], 0, 'range(1, 4) ได้ 1, 2, 3'],
  ['dp-loop-2', 'skill-prog-loops', 'core', 'โค้ดนี้แสดงอะไร', ['0', '1', '-2', '-3'], 2, '10 → 7 → 4 → 1 → −2 แล้วเงื่อนไข n > 0 เป็นเท็จ', 'n = 10\nwhile n > 0:\n    n = n - 3\nprint(n)'],
  ['dp-trace-1', 'skill-prog-trace', 'basic', 'โค้ดนี้แสดงอะไร', ['6', '30', '10', '2'], 0, 'b ถูกคำนวณตอน a = 2 จึงได้ 6 การเปลี่ยน a ทีหลังไม่ย้อนไปเปลี่ยน b', 'a = 2\nb = a * 3\na = 10\nprint(b)'],
  ['dp-trace-2', 'skill-prog-trace', 'core', 'โค้ดนี้แสดงอะไร', ['3', '6', '2', '0'], 0, 'i เป็น 0, 1, 2 รวมได้ 3', 's = 0\nfor i in range(3):\n    s = s + i\nprint(s)'],
  ['dp-fn-1', 'skill-prog-functions', 'basic', 'ฟังก์ชันที่ไม่มีคำสั่ง return จะคืนค่าอะไร', ['0', 'None', 'ค่าสุดท้ายที่คำนวณ', 'error'], 1, 'Python คืนค่า None ให้อัตโนมัติ'],
  ['dp-fn-2', 'skill-prog-functions', 'core', 'โค้ดนี้แสดงอะไร', ['3', '4', '5', 'error'], 1, 'f(2) = 3 แล้ว f(3) = 4', 'def f(x):\n    return x + 1\nprint(f(f(2)))'],
  ['dp-col-1', 'skill-prog-collections', 'basic', 'โค้ดนี้แสดงอะไร', ['4', '8', '15', 'error'], 1, 'ตำแหน่งเริ่มที่ 0 ตำแหน่ง 1 คือ 8', 'nums = [4, 8, 15]\nprint(nums[1])'],
  ['dp-col-2', 'skill-prog-collections', 'core', 'โค้ดนี้แสดงอะไร', ['3', '5', 'b', 'error'], 1, 'dict หาค่าด้วยคีย์ "b" ได้ 5', 'd = {"a": 3, "b": 5}\nprint(d["b"])'],
];

const PHYSICS: Raw[] = [
  ['dy-unit-1', 'skill-phy-units', 'basic', '3 km เท่ากับกี่เมตร', ['30', '300', '3000', '0.003'], 2, '1 km = 1000 m'],
  ['dy-unit-2', 'skill-phy-units', 'core', '54 km/h เท่ากับกี่ m/s', ['5.4', '15', '54', '194.4'], 1, '54 ÷ 3.6 = 15 m/s'],
  ['dy-vec-1', 'skill-phy-vector-components', 'basic', 'เดินไปทางตะวันออก 5 m แล้วไปทางเหนือ 12 m การกระจัดมีขนาดเท่าใด', ['17 m', '13 m', '7 m', '60 m'], 1, '√(5² + 12²) = 13 m'],
  ['dy-vec-2', 'skill-phy-vector-components', 'core', 'แรง 10 N ทำมุม 60° กับแนวราบ องค์ประกอบแนวราบเท่าใด', ['5 N', '8.66 N', '10 N', '0 N'], 0, '10 cos 60° = 10 × 1/2 = 5 N'],
  ['dy-kin-1', 'skill-phy-kinematics-equations', 'basic', 'ในสมการ v = u + at ตัว a หมายถึงอะไร', ['ระยะทาง', 'ความเร่ง', 'เวลา', 'ความเร็วต้น'], 1, 'a คือความเร่ง หน่วย m/s²'],
  ['dy-kin-2', 'skill-phy-kinematics-equations', 'core', 'รถเริ่มจากหยุดนิ่ง เร่ง 3 m/s² นาน 4 s ความเร็วปลายเท่าใด', ['7 m/s', '12 m/s', '24 m/s', '0.75 m/s'], 1, 'v = 0 + 3 × 4 = 12 m/s'],
  ['dy-fbd-1', 'skill-phy-free-body', 'basic', 'หนังสือวางนิ่งบนโต๊ะ มีแรงใดกระทำต่อหนังสือ', ['น้ำหนักอย่างเดียว', 'น้ำหนักและแรงที่โต๊ะดันขึ้น', 'แรงที่หนังสือกดโต๊ะ', 'ไม่มีแรง'], 1, 'โลกดึงลง (น้ำหนัก) และโต๊ะดันขึ้น สองแรงสมดุลกัน'],
  ['dy-fbd-2', 'skill-phy-free-body', 'core', 'กล่องถูกดึงไปทางขวา 12 N มีแรงเสียดทานไปทางซ้าย 4 N แรงลัพธ์คือข้อใด', ['16 N ไปทางขวา', '8 N ไปทางขวา', '8 N ไปทางซ้าย', '4 N ไปทางซ้าย'], 1, '12 − 4 = 8 N ไปทางขวา'],
  ['dy-newton-1', 'skill-phy-newton-second', 'basic', 'ถ้าแรงลัพธ์เพิ่มเป็น 2 เท่าแต่มวลเท่าเดิม ความเร่งจะเป็นอย่างไร', ['ลดครึ่ง', 'เท่าเดิม', 'เพิ่ม 2 เท่า', 'เพิ่ม 4 เท่า'], 2, 'a = ΣF/m แปรผันตรงกับแรง'],
  ['dy-newton-2', 'skill-phy-newton-second', 'core', 'แรงลัพธ์ 12 N กระทำต่อมวล 3 kg ความเร่งเท่าใด', ['36 m/s²', '4 m/s²', '15 m/s²', '0.25 m/s²'], 1, 'a = 12 ÷ 3 = 4 m/s²'],
];

export const DIAGNOSTIC_ITEMS: DiagnosticItem[] = [...build('math', MATH), ...build('programming', PROGRAMMING), ...build('physics', PHYSICS)];

export const diagnosticItemsFor = (subjectId: CurriculumSubjectId) => DIAGNOSTIC_ITEMS.filter((i) => i.subjectId === subjectId);
