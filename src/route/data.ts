/* =========================================================================
   V2U Route Engine (Phase 43) — static route data
   Only one target exists today (Computer Engineering). Add targets by
   appending; requirement ids are stable references.
   ========================================================================= */

import type { RouteRequirement, RouteTarget, StudentProfile, VocationalProgram } from './types';

export const VOCATIONAL_PROGRAMS: VocationalProgram[] = [
  { id: 'digital-business-technology', title: 'เทคโนโลยีธุรกิจดิจิทัล (Digital Business Technology)', strengths: ['programming'] },
  { id: 'information-technology', title: 'เทคโนโลยีสารสนเทศ', strengths: ['programming'] },
  { id: 'electronics', title: 'อิเล็กทรอนิกส์', strengths: ['physics'] },
  { id: 'electrical-power', title: 'ไฟฟ้ากำลัง', strengths: ['physics'] },
  { id: 'mechatronics', title: 'เมคคาทรอนิกส์', strengths: ['physics', 'programming'] },
  { id: 'accounting', title: 'การบัญชี', strengths: [] },
  { id: 'other', title: 'สาขาอื่น', strengths: [] },
];

export const ROUTE_REQUIREMENTS: RouteRequirement[] = [
  {
    id: 'req-math',
    kind: 'subject',
    title: 'พื้นฐานคณิตศาสตร์',
    description: 'พีชคณิต ฟังก์ชัน และตรีโกณมิติ ที่ทุกวิชาวิศวะต้องใช้',
    subjectId: 'math',
    dependsOn: [],
  },
  {
    id: 'req-physics',
    kind: 'subject',
    title: 'ฟิสิกส์',
    description: 'หน่วย เวกเตอร์ การเคลื่อนที่ และแรง',
    subjectId: 'physics',
    // Vectors need trigonometry; kinematics needs equations
    dependsOn: ['req-math'],
  },
  {
    id: 'req-programming',
    kind: 'subject',
    title: 'Programming',
    description: 'Python ตั้งแต่ตัวแปรจนถึงฟังก์ชัน',
    subjectId: 'programming',
    dependsOn: [],
  },
  {
    id: 'req-exams',
    kind: 'exam',
    title: 'ข้อสอบ / การสอบ',
    description: 'ฝึกทำข้อสอบจริงแบบจับเวลา',
    dependsOn: ['req-math', 'req-physics', 'req-programming'],
    checklist: ['TGAT', 'TPAT3 ความถนัดวิทยาศาสตร์ เทคโนโลยี วิศวกรรมศาสตร์', 'A-Level คณิตศาสตร์ประยุกต์ 1', 'A-Level ฟิสิกส์'],
  },
  {
    id: 'req-portfolio',
    kind: 'portfolio',
    title: 'Portfolio',
    description: 'รวบรวมผลงานที่แสดงความพร้อมด้านคอมพิวเตอร์',
    dependsOn: ['req-programming'],
    checklist: ['โปรเจกต์โปรแกรมอย่างน้อย 1 ชิ้น', 'ผลงาน/รางวัล/การแข่งขันจากสายอาชีพ', 'เรียงความแนะนำตัวและเหตุผลที่เลือกสาขา'],
  },
  {
    id: 'req-application',
    kind: 'application',
    title: 'การสมัครมหาวิทยาลัย',
    description: 'สมัครผ่านระบบ TCAS ตามรอบที่เหมาะกับคุณ',
    dependsOn: ['req-exams', 'req-portfolio'],
    checklist: ['เลือกมหาวิทยาลัยและสาขา', 'ตรวจเกณฑ์รับของแต่ละรอบ', 'สมัครและติดตามผล'],
  },
];

export const ROUTE_TARGETS: RouteTarget[] = [
  {
    id: 'target-computer-engineering',
    title: 'วิศวกรรมคอมพิวเตอร์',
    faculty: 'คณะวิศวกรรมศาสตร์',
    pathwayId: 'pathway-computer-engineering',
    requirementIds: ['req-math', 'req-physics', 'req-programming', 'req-exams', 'req-portfolio', 'req-application'],
  },
];

/** Used until the student sets their own starting point. */
export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  educationLevel: 'ปวช.3',
  programId: 'other',
  targetId: 'target-computer-engineering',
  availableMinutes: 30,
};
