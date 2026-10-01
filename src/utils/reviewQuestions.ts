import type { SubjectId, Lesson } from '../types';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isCustom?: boolean;
}

export interface GroundedQuestionsResult {
  questions: QuizQuestion[];
  isGrounded: boolean;
  sourceDescription: string;
}

/**
 * Curriculum-grounded questions by subject and keyword matching.
 * Provides real engineering and fundamental academic questions grounded in the syllabus.
 */
const SUBJECT_QUESTION_BANK: Record<SubjectId, Array<{ keywords: string[]; questions: QuizQuestion[] }>> = {
  math: [
    {
      keywords: ['สมการ', 'อสมการ', 'linear', 'equation'],
      questions: [
        {
          id: 'math-eq-1',
          question: 'ถ้า 3x - 7 = 14 ค่าของ x เท่ากับข้อใด?',
          options: ['5', '7', '9', '21'],
          correctIndex: 1,
          explanation: '3x = 14 + 7 = 21 ดังนั้น x = 21 / 3 = 7',
        },
        {
          id: 'math-eq-2',
          question: 'เมื่อคูณหรือหารทั้งสองข้างของอสมการด้วยจำนวนลบ ต้องทำอย่างไร?',
          options: ['คงเครื่องหมายเดิมไว้', 'กลับทิศทางของเครื่องหมายอสมการ', 'เปลี่ยนเป็นเครื่องหมายเท่ากับ', 'เติมเครื่องหมายลบหน้าคำตอบ'],
          correctIndex: 1,
          explanation: 'กฎพื้นฐานของอสมการ: การคูณหรือหารด้วยจำนวนจริงลบต้องกลับทิศทางเครื่องหมายเสมอ เช่น < กลายเป็น >',
        },
        {
          id: 'math-eq-3',
          question: 'สมการเชิงเส้นสองตัวแปรมีคำตอบเป็นจำนวนอนันต์เมื่อใด?',
          options: ['เมื่อเส้นกราฟตัดกัน 1 จุด', 'เมื่อเส้นกราฟขนานกัน', 'เมื่อเส้นกราฟทับซ้อนกันเป็นเส้นเดียวกัน', 'เมื่อความชันเท่ากับ 0'],
          correctIndex: 2,
          explanation: 'เมื่อสมการทั้งสองสมมูลกัน กราฟจะทับกันสนิท ทำให้มีจุดตัดร่วมกันเป็นจำนวนอนันต์',
        },
      ],
    },
    {
      keywords: ['เลขยกกำลัง', 'ราก', 'exponent', 'root'],
      questions: [
        {
          id: 'math-exp-1',
          question: 'ค่าของ (2^3) * (2^4) มีค่าเท่ากับข้อใด?',
          options: ['2^7 (128)', '2^12 (4096)', '4^7', '8^12'],
          correctIndex: 0,
          explanation: 'ฐานเหมือนกันคูณกัน ให้นำเลขชี้กำลังมาบวกกัน: 3 + 4 = 7 ได้ 2^7 = 128',
        },
        {
          id: 'math-exp-2',
          question: 'นิยามของ a^0 (เมื่อ a ≠ 0) มีค่าเท่ากับเท่าใด?',
          options: ['0', '1', 'a', 'ไม่นิยาม'],
          correctIndex: 1,
          explanation: 'ตามสมบัติของเลขชี้กำลัง จำนวนจริงใดๆ ที่ไม่เท่ากับศูนย์ เมื่อยกกำลัง 0 จะมีค่าเท่ากับ 1 เสมอ',
        },
      ],
    },
    {
      keywords: ['ตรีโกณ', 'trig', 'sin', 'cos', 'tan'],
      questions: [
        {
          id: 'math-trig-1',
          question: 'เอกลักษณ์ตรีโกณมิติพื้นฐาน sin²(θ) + cos²(θ) มีค่าเท่าใดเสมอ?',
          options: ['0', '1', 'tan(θ)', '2'],
          correctIndex: 1,
          explanation: 'จากทฤษฎีบทพีทาโกรัสบนวงกลมหนึ่งหน่วย: x² + y² = 1 ซึ่ง cos²(θ) + sin²(θ) = 1',
        },
      ],
    },
    {
      keywords: ['แคลคูลัส', 'calculus', 'อนุพันธ์', 'derivative'],
      questions: [
        {
          id: 'math-calc-1',
          question: 'อนุพันธ์ของฟังก์ชัน f(x) = x^3 มีค่าเท่ากับข้อใด?',
          options: ['3x²', 'x²', '3x', 'x⁴/4'],
          correctIndex: 0,
          explanation: 'ตามกฎ Power Rule: d/dx(x^n) = n * x^(n-1) ดังนั้น d/dx(x^3) = 3x²',
        },
      ],
    },
  ],
  programming: [
    {
      keywords: ['python', 'ตัวแปร', 'variable', 'syntax'],
      questions: [
        {
          id: 'prog-py-1',
          question: 'ใน Python ฟังก์ชันใดใช้สำหรับตรวจสอบชนิดข้อมูลของตัวแปร?',
          options: ['typeof()', 'type()', 'checkType()', 'isType()'],
          correctIndex: 1,
          explanation: 'Python ใช้ built-in function `type(variable)` เช่น type(10) จะคืนค่า <class \'int\'>',
        },
        {
          id: 'prog-py-2',
          question: 'ข้อใดคือโครงสร้างข้อมูลใน Python ที่เป็น immutable (ไม่สามารถแก้ไขค่าหลังสร้างได้)?',
          options: ['list', 'dict', 'set', 'tuple'],
          correctIndex: 3,
          explanation: 'Tuple เป็น immutable sequence ใน Python เมื่อสร้างแล้วจะไม่สามารถเพิ่ม ลบ หรือแก้ไขสมาชิกภายในได้',
        },
        {
          id: 'prog-py-3',
          question: 'ผลลัพธ์ของคำสั่ง `bool("")` (สตริงว่าง) ใน Python คือข้อใด?',
          options: ['True', 'False', 'None', 'Error'],
          correctIndex: 1,
          explanation: 'ใน Python สตริงว่าง "", เลข 0, None, list ว่าง [] จะถูกแปลงเป็น False เมื่อประเมินแบบ boolean (Falsy)',
        },
      ],
    },
    {
      keywords: ['control flow', 'เงื่อนไข', 'loop', 'if'],
      questions: [
        {
          id: 'prog-cf-1',
          question: 'คำสั่งใดใช้ในการออกจาก loop ทันทีในภาษา Python?',
          options: ['continue', 'break', 'exit', 'pass'],
          correctIndex: 1,
          explanation: '`break` ใช้หยุดและออกจาก loop ทันที ส่วน `continue` ใช้ข้ามไปรอบถัดไป',
        },
      ],
    },
    {
      keywords: ['oop', 'class', 'object'],
      questions: [
        {
          id: 'prog-oop-1',
          question: 'เมธอดพิเศษใดใน Python ที่ทำหน้าที่เป็น Constructor เมื่อสร้างอ็อบเจกต์ใหม่?',
          options: ['__init__()', '__new__()', '__construct__()', '__main__()'],
          correctIndex: 0,
          explanation: '`__init__(self, ...)` เป็น initializer method ที่จะถูกเรียกอัตโนมัติเมื่อคลาสถูก instantiate',
        },
      ],
    },
  ],
  physics: [
    {
      keywords: ['หน่วย', 'เวกเตอร์', 'vector', 'unit'],
      questions: [
        {
          id: 'phys-vec-1',
          question: 'ข้อใดต่อไปนี้เป็นปริมาณเวกเตอร์ (Vector Quantity)?',
          options: ['มวล (Mass)', 'ความเร็ว (Velocity)', 'เวลา (Time)', 'ระยะทาง (Distance)'],
          correctIndex: 1,
          explanation: 'ความเร็ว (Velocity) มีทั้งขนาดและทิศทาง จึงเป็นปริมาณเวกเตอร์ ส่วนมวล เวลา และระยะทางเป็นปริมาณสเกลาร์',
        },
        {
          id: 'phys-vec-2',
          question: 'หน่วย SI ของแรง (Force) ในรูปหน่วยฐาน (Base Units) คือข้อใด?',
          options: ['kg·m/s', 'kg·m/s²', 'kg·m²/s²', 'J/s'],
          correctIndex: 1,
          explanation: 'จาก F = ma หน่วยคือ kg * m/s² ซึ่งเรียกว่า นิวตัน (N)',
        },
      ],
    },
    {
      keywords: ['นิวตัน', 'newton', 'กฎการเคลื่อนที่', 'แรง'],
      questions: [
        {
          id: 'phys-newton-1',
          question: 'กฎการเคลื่อนที่ข้อที่ 1 ของนิวตัน (ΣF = 0) อธิบายสภาวะใดของวัตถุ?',
          options: ['วัตถุมีความเร่งคงตัว', 'วัตถุหยุดนิ่งหรือเคลื่อนที่ด้วยความเร็วคงที่ในแนวเส้นตรง', 'แรงกิริยาเท่ากับแรงปฏิกิริยา', 'วัตถุตกลงสู่พื้นโลก'],
          correctIndex: 1,
          explanation: 'กฎความเฉื่อย: หากไม่มีแรงภายนอกมากระทำ (ΣF = 0) วัตถุจะรักษาสภาพหยุดนิ่งหรือเคลื่อนที่ด้วยความเร็วคงที่ต่อไป',
        },
        {
          id: 'phys-newton-2',
          question: 'ถ้าออกแรง 20 N ผลักวัตถุมวล 4 kg บนพื้นราบไร้แรงเสียดทาน วัตถุจะมีความเร่งเท่าใด?',
          options: ['5 m/s²', '16 m/s²', '24 m/s²', '80 m/s²'],
          correctIndex: 0,
          explanation: 'จาก a = F / m = 20 N / 4 kg = 5 m/s²',
        },
      ],
    },
    {
      keywords: ['งาน', 'พลังงาน', 'work', 'energy'],
      questions: [
        {
          id: 'phys-work-1',
          question: 'งาน (Work) มีค่าเป็นศูนย์ในกรณีใดต่อไปนี้?',
          options: ['ออกแรงดันกำแพงแต่กำแพงไม่ขยับ', 'ยกของขึ้นบันได', 'ผลักกล่องให้เลื่อนบนพื้น', 'ปล่อยลูกบอลให้ตกจากที่สูง'],
          correctIndex: 0,
          explanation: 'งานทางฟิสิกส์ W = F·s·cos(θ) ถ้าการกระจัด (s) = 0 งานที่ได้จะมีค่าเป็น 0 จูล',
        },
      ],
    },
  ],
  tgat3: [
    {
      keywords: ['tgat', 'เหตุผล', 'logic', 'สมรรถนะ'],
      questions: [
        {
          id: 'tgat-logic-1',
          question: 'ในการคิดเชิงวิพากษ์ (Critical Thinking) ขั้นตอนแรกในการวิเคราะห์สถานการณ์ปัญหาคือข้อใด?',
          options: ['เลือกแนวทางแก้ไขทันที', 'แยกแยะข้อเท็จจริง (Fact) ออกจากความคิดเห็น (Opinion)', 'ขอความช่วยเหลือจากผู้อื่น', 'ลงมือปฏิบัติตามความเคยชิน'],
          correctIndex: 1,
          explanation: 'การแยกข้อเท็จจริงออกจากความคิดเห็นและอคติเป็นรากฐานสำคัญที่สุดในการวิเคราะห์ปัญหาเชิงตรรกะ',
        },
        {
          id: 'tgat-logic-2',
          question: 'หากข้อความระบุว่า "นักเรียนทุกคนในห้อง A ตั้งใจเรียน และสมชายเป็นนักเรียนห้อง A" ข้อสรุปใดสมเหตุสมผลที่สุด?',
          options: ['สมชายเป็นหัวหน้าห้อง', 'สมชายเป็นคนตั้งใจเรียน', 'สมชายสอบผ่านทุกคน', 'ไม่มีข้อสรุปที่แน่นอน'],
          correctIndex: 1,
          explanation: 'เป็นการสรุปเชิงตรรกศาสตร์แบบนิรนัย (Deductive reasoning): ถ้าเงื่อนไขครอบคลุมทุกคนในกลุ่ม สมชายซึ่งอยู่ในกลุ่มต้องมีสมบัตินั้นด้วย',
        },
      ],
    },
  ],
  ai: [
    {
      keywords: ['ai', 'machine learning', 'ml', 'การเรียนรู้ของเครื่อง'],
      questions: [
        {
          id: 'ai-ml-1',
          question: 'การเรียนรู้ของเครื่องแบบ Supervised Learning แตกต่างจาก Unsupervised Learning อย่างไร?',
          options: ['ต้องใช้คอมพิวเตอร์ที่แรงกว่า', 'ข้อมูลในการฝึกฝนมีป้ายกำกับเฉลย (Labelled Data)', 'ไม่สามารถใช้ทำนายผลลัพธ์ได้', 'ใช้ได้กับข้อมูลภาพเท่านั้น'],
          correctIndex: 1,
          explanation: 'Supervised Learning ใช้ข้อมูลที่มีคู่ (Input, Output/Label) เพื่อสอนโมเดล ส่วน Unsupervised เรียนรู้รูปแบบจากข้อมูลที่ไม่มี Label',
        },
        {
          id: 'ai-ml-2',
          question: 'ปัญหา Overfitting ในโมเดล Machine Learning หมายถึงสภาวะใด?',
          options: ['โมเดลทำงานช้าเกินไป', 'โมเดลทำคะแนนได้ดีมากบน Training Data แต่ทำนายบนข้อมูลใหม่ได้แย่', 'โมเดลมีขนาดไฟล์เล็กเกินไป', 'ข้อมูลมีจำนวนน้อยเกินไป'],
          correctIndex: 1,
          explanation: 'Overfitting คือการที่โมเดลจดจำข้อมูลที่ใช้ฝึกฝน (รวมถึง noise) มากเกินไป จนขาดความสามารถในการ Generalize กับข้อมูลที่ไม่เคยเห็น',
        },
      ],
    },
  ],
};

/**
 * Returns grounded recall and quiz questions for a lesson.
 * Falls back safely to conceptual active recall prompts if no exact keyword matches.
 */
export function getGroundedQuestionsForLesson(lesson: Lesson): GroundedQuestionsResult {
  const subjectPool = SUBJECT_QUESTION_BANK[lesson.subjectId] || [];
  const textToSearch = `${lesson.title} ${lesson.description || ''}`.toLowerCase();

  // Try to find keyword match
  for (const entry of subjectPool) {
    const matched = entry.keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));
    if (matched && entry.questions.length > 0) {
      return {
        questions: entry.questions,
        isGrounded: true,
        sourceDescription: `อิงจากหลักสูตรหัวข้อ: ${lesson.title}`,
      };
    }
  }

  // Safe universal fallback questions grounded in active recall principles
  const safeFallbackQuestions: QuizQuestion[] = [
    {
      id: `fallback-${lesson.id}-1`,
      question: `ใจความสำคัญหรือข้อสรุปหลักในหัวข้อ "${lesson.title}" คือข้อใด?`,
      options: [
        'เข้าใจกลไกและขั้นตอนหลักอย่างถูกต้อง',
        'ท่องจำคำศัพท์ได้แต่ยังอธิบายไม่ได้',
        'เนื้อหายังไม่ชัดเจน ต้องหาข้อมูลเพิ่ม',
        'เป็นเรื่องที่ไม่เกี่ยวข้องกับการประยุกต์ใช้',
      ],
      correctIndex: 0,
      explanation: 'การทำความเข้าใจกลไกหลักเป็นรากฐานในการยกระดับ Mastery สู่การแก้โจทย์จริง',
    },
    {
      id: `fallback-${lesson.id}-2`,
      question: `หากต้องการประยุกต์ใช้ความรู้จาก "${lesson.title}" ควรเริ่มต้นอย่างไร?`,
      options: [
        'วิเคราะห์โจทย์ กำหนดข้อมูลนำเข้า และเลือกใช้หลักการที่ถูกต้อง',
        'เดาคำตอบโดยไม่พิจารณาสูตรหรือทฤษฎี',
        'ข้ามไปทำโจทย์หัวข้ออื่นทันที',
        'จำคำตอบเดิมโดยไม่ดูเงื่อนไข',
      ],
      correctIndex: 0,
      explanation: 'กระบวนการคิดเชิงวิศวกรรมเริ่มต้นจากการระบุปัญหาและเชื่อมโยงหลักการที่ได้เรียนรู้',
    },
  ];

  return {
    questions: safeFallbackQuestions,
    isGrounded: false,
    sourceDescription: `คำถามทบทวนเชิงแนวคิด (Active Recall Rubric) สำหรับ: ${lesson.title}`,
  };
}
