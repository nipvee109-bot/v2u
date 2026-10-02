/** The V2U loop, shown wherever the student is in it: วันนี้ → เรียน → เช็ก → ปรับขั้นถัดไป */
export const LOOP_STAGES = [
  { id: 'today', label: 'วันนี้' },
  { id: 'learn', label: 'เรียน' },
  { id: 'check', label: 'เช็ก' },
  { id: 'adapt', label: 'ปรับขั้นถัดไป' },
] as const;
export type LoopStage = (typeof LOOP_STAGES)[number]['id'];
