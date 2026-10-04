/* =========================================================================
   Research backlog (Phase 66) — candidates found but NOT in the learner-facing
   registry. Nothing here is recommended, embedded or shown to students.
   A candidate moves into src/resources/registry.ts only after its live page /
   video is opened and checked (status VERIFIED in registryView).
   ========================================================================= */

export interface DiscoveredResource {
  id: string;
  title: string;
  publisher: string;
  /** Exactly as stated by the publisher's own repository README — the page itself was not opened */
  url: string;
  type: 'simulation' | 'video';
  language: 'th' | 'en';
  lessonIds: string[];
  /** What real content was inspected, and where */
  contentInspected: string;
  qualityNotes: string;
  limitations: string[];
  dateChecked: string;
}

export const DISCOVERED_RESOURCES: DiscoveredResource[] = [
  {
    id: 'disc-phet-vector-addition',
    title: 'PhET — Vector Addition',
    publisher: 'PhET Interactive Simulations, University of Colorado Boulder',
    url: 'https://phet.colorado.edu/en/simulation/vector-addition',
    type: 'simulation',
    language: 'en',
    lessonIds: ['phy-vec-vectors'],
    contentInspected:
      'official source repository github.com/phetsims/vector-addition @ 06059e4f58fe5f93767ffc416711b2e6c9624310 — doc/model.md (screens Explore 1D, Explore 2D, Lab, Equations; Cartesian and polar scenes; component vectors) and the English strings file',
    qualityNotes: 'ลากเวกเตอร์แล้วเห็นองค์ประกอบ x, y และเวกเตอร์ลัพธ์ทันที ตรงกับ “แตกองค์ประกอบ → รวมทีละแกน → หาขนาด” ของบทเรียน',
    limitations: [
      'หน้าเว็บ phet.colorado.edu ยังเปิดไม่ได้จากสภาพแวดล้อมนี้ (ยังไม่ได้ลองเล่นจริง)',
      'หน้าจอ Equations มีสัมประสิทธิ์และเวกเตอร์ฐาน ซึ่งเกินขอบเขตบทนี้ — ควรแนะนำเฉพาะ Explore 1D / Explore 2D',
      'ภาษาอังกฤษ (ยังไม่ได้ตรวจคำแปลภาษาไทย)',
    ],
    dateChecked: '2026-10-04',
  },
  {
    id: 'disc-phet-graphing-slope-intercept',
    title: 'PhET — Graphing Slope-Intercept',
    publisher: 'PhET Interactive Simulations, University of Colorado Boulder',
    url: 'https://phet.colorado.edu/en/simulation/graphing-slope-intercept',
    type: 'simulation',
    language: 'en',
    lessonIds: ['math-fn-linear'],
    contentInspected:
      'official source repositories github.com/phetsims/graphing-slope-intercept @ de12d92abe5d507ed8f66f34bb1adfb598d13277 (screens: Slope-Intercept + Line Game) and graphing-lines doc/model.md (slope m = (y2 − y1)/(x2 − x1); slope-intercept y = (rise/run)x + b)',
    qualityNotes: 'ปรับความชันและจุดตัดแกน y แล้วเห็นกราฟกับสมการเปลี่ยนพร้อมกัน ตรงกับแนวคิด y = mx + c ของบทเรียน (ใช้ b แทน c)',
    limitations: [
      'หน้าเว็บ phet.colorado.edu ยังเปิดไม่ได้จากสภาพแวดล้อมนี้ (ยังไม่ได้ลองเล่นจริง)',
      'มีหน้าจอ “Line Game” ในตัว — V2U จะแนะนำเฉพาะหน้าจอ Slope-Intercept',
      'ใช้สัญลักษณ์ b แทน c และเป็นภาษาอังกฤษ',
    ],
    dateChecked: '2026-10-04',
  },
];
