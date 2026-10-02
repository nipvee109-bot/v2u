/* =========================================================================
   Interactive lesson: กฎการเคลื่อนที่ของนิวตัน (phy-dyn-newton)
   Format: PHYSICS LAB — change force and mass, watch a = F ÷ m respond.
   Relations, examples and checks come from the V2U original and quiz.
   ========================================================================= */

import type { InteractiveLesson } from '../types';

const F = { id: 'F', label: 'แรงลัพธ์ F', unit: 'N', min: 0, max: 40, step: 2, initial: 10 };
const M = { id: 'm', label: 'มวล m', unit: 'kg', min: 1, max: 10, step: 1, initial: 2 };

export const NEWTON_LAB_LESSON: InteractiveLesson = {
  lessonId: 'phy-dyn-newton',
  contentId: 'v2u-phy-dyn-newton',
  source: 'authored',
  mission: { title: 'PHYSICS LAB', goal: 'ทดลองเปลี่ยนแรงและมวล แล้วดูว่าความเร่งเปลี่ยนอย่างไร (ΣF = ma)' },
  theme: { kind: 'lab', title: 'ห้องทดลองแรงและการเคลื่อนที่' },
  steps: [
    {
      id: 'lab-force',
      type: 'concept',
      title: 'ทดลอง: เพิ่มแรง',
      body: 'เลื่อนแรงขึ้นลง โดยให้มวลเท่าเดิม แล้วสังเกตความเร่ง',
      keyIdea: 'กฎข้อที่ 2: ΣF = ma หรือ a = F ÷ m',
      skillId: 'skill-phy-newton-second',
      interaction: {
        kind: 'lab',
        prompt: 'ลองเปลี่ยนค่าแล้วสังเกต',
        formula: 'newton2',
        variables: [F, M],
        output: { label: 'ความเร่ง a', unit: 'm/s²' },
        question: {
          prompt: 'ถ้าเพิ่มแรง แต่คงมวลเดิม ความเร่งจะเปลี่ยนอย่างไร?',
          choices: ['เพิ่มขึ้น', 'ลดลง', 'เท่าเดิม', 'เป็นศูนย์เสมอ'],
          correctIndex: 0,
          hint: 'ดูตัวเลขความเร่งตอนที่คุณเลื่อนแรงขึ้น โดยไม่แตะมวล',
          explanation: 'a = F ÷ m — มวลเท่าเดิม แรงมากขึ้น ความเร่งจึงมากขึ้นตามสัดส่วน',
        },
      },
    },
    {
      id: 'lab-mass',
      type: 'think',
      title: 'ทดลอง: เพิ่มมวล',
      body: 'คราวนี้คงแรงไว้ แล้วเพิ่มมวล',
      skillId: 'skill-phy-newton-second',
      interaction: {
        kind: 'lab',
        prompt: 'ลองเพิ่มมวลโดยไม่แตะแรง',
        formula: 'newton2',
        variables: [F, M],
        output: { label: 'ความเร่ง a', unit: 'm/s²' },
        question: {
          prompt: 'ถ้าแรงเท่าเดิม แต่มวลมากขึ้น ความเร่งจะเป็นอย่างไร?',
          choices: ['เพิ่มขึ้น', 'ลดลง', 'เท่าเดิม', 'กลับทิศ'],
          correctIndex: 1,
          hint: 'มวลอยู่ในตัวหารของ a = F ÷ m',
          explanation: 'ตัวหารใหญ่ขึ้น ผลหารเล็กลง — วัตถุมวลมาก “เร่งยาก” กว่า',
        },
      },
    },
    {
      id: 'calc-1',
      type: 'try',
      title: 'คำนวณเอง',
      visual: { lines: ['m = 2 kg', 'ΣF = 10 N', 'a = ?'] },
      skillId: 'skill-phy-newton-second',
      interaction: {
        kind: 'typed',
        prompt: 'มวล 2 kg ถูกแรงลัพธ์ 10 N ความเร่งเท่าไร (m/s²)',
        inputLabel: 'a =',
        accept: ['5'],
        hint: 'a = ΣF ÷ m',
        workedSteps: ['a = ΣF ÷ m', 'a = 10 ÷ 2', 'a = 5 m/s²'],
        explanation: 'แทนค่าในกฎข้อที่ 2 แล้วหาร',
        wrongFeedback: [
          { answer: '20', message: 'ถ้าคูณกันจะได้หน่วยของแรง ไม่ใช่ความเร่ง — a = F ÷ m' },
          { answer: '0.2', message: 'สลับตัวตั้งกับตัวหาร — a = F ÷ m ไม่ใช่ m ÷ F' },
        ],
      },
    },
    {
      id: 'calc-friction',
      type: 'challenge',
      title: 'ภารกิจย่อย: มีแรงเสียดทาน',
      body: 'กล่อง 5 kg ถูกดึงด้วยแรง 20 N มีแรงเสียดทาน 5 N',
      visual: { lines: ['ดึง 20 N →', '← เสียดทาน 5 N', 'm = 5 kg'] },
      skillId: 'skill-phy-free-body',
      interaction: {
        kind: 'typed',
        prompt: 'ความเร่งของกล่อง (m/s²)',
        inputLabel: 'a =',
        accept: ['3'],
        hint: 'หาแรงลัพธ์ก่อน: แรงที่ทิศตรงข้ามกันต้องหักกัน',
        workedSteps: ['ΣF = 20 − 5 = 15 N', 'a = 15 ÷ 5 = 3 m/s²'],
        explanation: 'ใช้แรงลัพธ์ ไม่ใช่แรงดึงอย่างเดียว — ลืมแรงเสียดทานเป็นจุดที่พลาดบ่อย',
        wrongFeedback: [{ answer: '4', message: 'ลืมแรงเสียดทาน — แรงลัพธ์คือ 20 − 5 = 15 N' }, { answer: '5', message: 'ลองหาแรงลัพธ์ใหม่ — 20 กับ 5 อยู่คนละทิศ จึงต้องลบกัน' }],
      },
    },
  ],
  finalCheck: [
    { id: 'fc-1', prompt: 'แรงลัพธ์เป็นศูนย์ วัตถุจะ', choices: ['หยุดเสมอ', 'เร่งขึ้น', 'คงสภาพการเคลื่อนที่', 'ช้าลง'], correctIndex: 2, explanation: 'กฎข้อ 1: ความเร็วคงตัว (รวมถึงหยุดนิ่ง)', skillId: 'skill-phy-newton-second' },
    { id: 'fc-2', prompt: 'แผนภาพแรงของกล่องวางนิ่งบนโต๊ะมีแรงใดบ้าง', choices: ['น้ำหนักอย่างเดียว', 'น้ำหนักและแรงปฏิกิริยาตั้งฉาก', 'แรงเสียดทานอย่างเดียว', 'ไม่มีแรง'], correctIndex: 1, explanation: 'mg ลง และ N ขึ้น หักล้างกัน', skillId: 'skill-phy-free-body' },
  ],
  mistakes: ['ใส่แรงที่วัตถุกระทำต่อสิ่งอื่นลงในแผนภาพ', 'ลืมแรงเสียดทานหรือน้ำหนัก', 'สับสนมวล (kg) กับน้ำหนัก (N)'],
  nextLessonId: undefined,
};
