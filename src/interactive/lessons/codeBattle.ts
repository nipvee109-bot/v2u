/* =========================================================================
   Interactive lesson: เงื่อนไข if / elif / else (prog-ctrl-conditions)
   Format: CODE BATTLE — every correct answer hits the BUG MONSTER.
   Content (examples, mistakes, try-it, check) comes from the V2U original
   lesson and the curriculum quiz; the battle framing is V2U's own.
   ========================================================================= */

import type { InteractiveLesson } from '../types';

export const CODE_BATTLE_LESSON: InteractiveLesson = {
  lessonId: 'prog-ctrl-conditions',
  contentId: 'v2u-prog-ctrl-conditions',
  source: 'authored',
  mission: { title: 'CODE BATTLE', goal: 'ใช้ if / elif / else สู้กับ BUG MONSTER — ตอบถูกเท่ากับโจมตี' },
  theme: { kind: 'battle', enemy: 'BUG MONSTER', hp: 100 },
  steps: [
    {
      id: 'read-if',
      type: 'concept',
      title: 'อ่านคำสั่งของตัวละคร',
      body: 'if ตรวจเงื่อนไข ถ้าจริงจึงทำบล็อกนั้น ถ้าไม่จริงไปทำ else — ย่อหน้าบอกว่าโค้ดอยู่บล็อกไหน',
      visual: { lines: ['if hp < 30:', '    heal()', 'else:', '    attack()'], caption: 'hp = 20' },
      skillId: 'skill-prog-conditions',
      interaction: {
        kind: 'choice',
        prompt: 'ถ้า hp = 20 ตัวละครจะทำอะไร?',
        choices: ['heal()', 'attack()', 'ทำทั้งสองอย่าง', 'ไม่ทำอะไรเลย'],
        correctIndex: 0,
        hint: '20 < 30 เป็นจริงหรือเท็จ? ถ้าจริง โปรแกรมจะเข้าบล็อกแรก',
        explanation: '20 < 30 เป็นจริง จึงทำบล็อกของ if (heal) และข้าม else ไป',
      },
    },
    {
      id: 'write-condition',
      type: 'try',
      title: 'เขียนเงื่อนไขเอง',
      body: 'BUG MONSTER โจมตีแรง! ให้ตัวละครฮีลเมื่อ hp ต่ำกว่า 30 และโจมตีกลับเมื่อเลือดยังพอ',
      skillId: 'skill-prog-conditions',
      interaction: {
        kind: 'code',
        prompt: 'เติมเงื่อนไขในช่องว่าง',
        template: 'if ____:\n    heal()\nelse:\n    attack()',
        accept: ['hp < 30', '30 > hp', 'hp<30'],
        hint: 'ต้องการ “hp น้อยกว่า 30” — ใช้ตัวดำเนินการเปรียบเทียบ <',
        explanation: 'hp < 30 ได้ค่า True/False ซึ่งเป็นสิ่งที่ if ต้องการ',
        wrongFeedback: [
          { answer: 'hp > 30', message: 'แบบนี้จะฮีลตอนเลือดเยอะ — เราต้องการ “น้อยกว่า” 30' },
          { answer: 'hp = 30', message: '= คือการกำหนดค่า ใช้เปรียบเทียบไม่ได้ — ใช้ < (หรือ == เมื่อต้องการเท่ากับ)' },
          { answer: 'hp <= 30', message: 'ใกล้แล้ว แต่ <= จะฮีลตอน hp = 30 ด้วย — โจทย์บอก “ต่ำกว่า” 30' },
        ],
      },
    },
    {
      id: 'order-branches',
      type: 'example',
      title: 'จัดลำดับ elif ให้ถูก',
      body: 'ระบบให้รางวัลตามคะแนน: ≥80 ได้ A, ≥70 ได้ B, อื่น ๆ ได้ C',
      skillId: 'skill-prog-conditions',
      interaction: {
        kind: 'order',
        prompt: 'เรียงบรรทัดให้ s = 85 ได้ A',
        items: ['if s >= 80: g = "A"', 'elif s >= 70: g = "B"', 'else: g = "C"'],
        hint: 'เรียงเงื่อนไขจากเข้มไปหลวม — ถ้า >= 70 มาก่อน 85 จะหยุดที่ B',
        explanation: 'elif จะถูกตรวจก็ต่อเมื่อเงื่อนไขก่อนหน้าเป็นเท็จ จึงต้องวางเงื่อนไขที่เข้มที่สุดไว้บนสุด',
      },
    },
    {
      id: 'predict',
      type: 'challenge',
      title: 'ทำนายผลก่อนรัน',
      visual: { lines: ['n = 7', 'if n % 2 == 0:', '    print("คู่")', 'else:', '    print("คี่")'] },
      skillId: 'skill-prog-conditions',
      interaction: {
        kind: 'typed',
        prompt: 'โปรแกรมนี้พิมพ์อะไร',
        inputLabel: 'ผลลัพธ์:',
        accept: ['คี่'],
        hint: 'คำนวณ 7 % 2 ก่อน แล้วดูว่าเงื่อนไข == 0 เป็นจริงไหม',
        workedSteps: ['7 % 2 = 1', '1 == 0 เป็นเท็จ', 'จึงทำ else → พิมพ์ "คี่"'],
        explanation: '% ให้เศษจากการหาร เลขคี่หาร 2 เหลือเศษ 1 เสมอ',
        wrongFeedback: [{ answer: 'คู่', message: '7 % 2 ได้ 1 ไม่ใช่ 0 — เงื่อนไขจึงเป็นเท็จ และโปรแกรมไปทำ else' }],
      },
    },
  ],
  finalCheck: [
    { id: 'fc-1', prompt: 'x = 75 โค้ด if x >= 80: A elif x >= 70: B else: C ได้อะไร', choices: ['A', 'B', 'C', 'ไม่มีผล'], correctIndex: 1, explanation: '75 ไม่ถึง 80 แต่ ≥ 70', skillId: 'skill-prog-conditions' },
    { id: 'fc-2', prompt: 'elif ทำงานเมื่อไร', choices: ['ทุกครั้ง', 'เมื่อเงื่อนไขก่อนหน้าทั้งหมดเป็นเท็จ', 'เมื่อ if เป็นจริง', 'หลัง else'], correctIndex: 1, explanation: 'elif ถูกตรวจต่อเมื่อเงื่อนไขก่อนหน้าทั้งหมดเป็นเท็จ', skillId: 'skill-prog-conditions' },
  ],
  mistakes: ['เรียง >= 70 ก่อน >= 80 ทำให้ 85 ได้ B', 'ลืม : ท้าย if', 'ย่อหน้าไม่ตรงกัน'],
  nextLessonId: 'prog-ctrl-loops',
};
