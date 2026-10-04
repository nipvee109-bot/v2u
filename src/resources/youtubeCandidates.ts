/* =========================================================================
   YouTube candidates (Phase 67) — RESEARCH BACKLOG, never shown to learners.
   Every entry is a real watch URL returned by a web search on 2026-10-04
   (query + result title kept as provenance). youtube.com could not be opened
   from the research environment, so NOTHING here was watched: no channel,
   duration, caption, embed or quality data is recorded, no summary exists,
   and no candidate is ranked. A candidate becomes a learner-facing resource
   only after its content is inspected (see YouTubeMeta in ./types).
   ========================================================================= */

export interface YouTubeCandidate {
  lessonId: string;
  videoId: string;
  watchUrl: string;
  /** Title exactly as shown in the search result */
  title: string;
  /** Channel as stated by the search result, or null when unknown. `channelConfirmed` is false until the page is opened. */
  channel: string | null;
  channelConfirmed: false;
  /** Language guessed from the title only */
  language: 'th' | 'en';
  provenance: { kind: 'search-result'; query: string; foundAt: string; requestedBy?: 'user' };
  /** Review order within the lesson (1 = check first). NOT a quality ranking — nothing was watched. */
  candidateRank: number;
  status: 'PENDING';
  actualContentInspected: false;
  transcriptStatus: 'UNKNOWN';
  embedStatus: 'UNKNOWN';
  summaryStatus: 'SUMMARY_PENDING';
}

/** A candidate the user asked for that search could not tie to a real watch URL — no URL is stored. */
export interface UnresolvedCandidateRequest {
  lessonId: string;
  requestedTitle: string;
  requestedChannel: string;
  searchQuery: string;
  searchedAt: string;
  reason: string;
  status: 'PENDING';
}

const FOUND = '2026-10-04';
const FOUND_REQ = '2026-10-05';
type Row = Omit<YouTubeCandidate, 'candidateRank'>;
const c = (lessonId: string, videoId: string, title: string, language: 'th' | 'en', query: string, channel: string | null = null, requested = false): Row => ({
  lessonId,
  videoId,
  watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  title,
  channel,
  channelConfirmed: false,
  language,
  provenance: { kind: 'search-result', query, foundAt: requested ? FOUND_REQ : FOUND, ...(requested ? { requestedBy: 'user' as const } : {}) },
  status: 'PENDING',
  actualContentInspected: false,
  transcriptStatus: 'UNKNOWN',
  embedStatus: 'UNKNOWN',
  summaryStatus: 'SUMMARY_PENDING',
});
const P14 = 'Project 14 (สสวท.) — ตามผลค้นหา';
const r = (lessonId: string, videoId: string, title: string, query: string, channel: string) => c(lessonId, videoId, title, 'th', query, channel, true);

/* Phase 67b: candidates the user prioritised (review these first). */
const PRIORITY: Row[] = [
  r('math-alg-linear-eq', 'A-GxPuyuNMU', 'การแก้สมการเชิงเส้นตัวแปรเดียว ตอนที่ 1 คณิตศาสตร์ ม.1', 'Project 14 การแก้สมการเชิงเส้นตัวแปรเดียว ตอนที่ 1', 'ไม่ระบุในผลค้นหา (ผู้ใช้ระบุว่า Project 14)'),
  r('math-alg-linear-eq', 'XiCtWVxf3DY', '06_โจทย์ปัญหาเกี่ยวกับสมการเชิงเส้นตัวแปรเดียว ตอนที่ 1 (คณิตศาสตร์ ม.1 เล่ม 2 บทที่ 1)', 'Project 14 โจทย์ปัญหาเกี่ยวกับสมการเชิงเส้นตัวแปรเดียว ตอนที่ 1', P14),
  r('math-alg-linear-system', '-eXNHrJwR-A', '01_แนะนำระบบสมการเชิงเส้นสองตัวแปร (คณิตศาสตร์ ม.3 เล่ม 2 บทที่ 1)', 'Project 14 แนะนำระบบสมการเชิงเส้นสองตัวแปร', P14),
  r('math-alg-linear-system', 'vnXIPsijIRc', '02_การแก้ระบบสมการเชิงเส้นสองตัวแปร ตอนที่ 1 (คณิตศาสตร์ ม.3 เล่ม 2 บทที่ 1)', 'Project 14 การแก้ระบบสมการเชิงเส้นสองตัวแปร', P14),
  r('math-alg-linear-ineq', 'S10UEeXywYk', '08_การแก้อสมการเชิงเส้นตัวแปรเดียว ตอนที่ 4 (คณิตศาสตร์ ม.3 เล่ม 1 บทที่ 1) V3', 'Project 14 การแก้อสมการเชิงเส้นตัวแปรเดียว', P14),
  r('phy-dyn-newton', 'WbOEVqXy0lo', "LIVE ! ติวฟรี #ฟิสิกส์ #ปายภาค เกรด 4 กับ 'ป๋ามัก' ideal physics l ม.4 เทอม 1 กฏของนิวตัน", 'ideal Physics กฎของนิวตัน', 'ideal Physics (ป๋ามัก) — ตามชื่อคลิปในผลค้นหา'),
];

/* Requested by the user but no matching watch URL was found — kept without a URL (never invented). */
export const UNRESOLVED_CANDIDATE_REQUESTS: UnresolvedCandidateRequest[] = [
  { lessonId: 'math-alg-linear-eq', requestedTitle: 'การแก้สมการเชิงเส้นตัวแปรเดียว ตอนที่ 2', requestedChannel: 'Project 14', searchQuery: 'Project 14 การแก้สมการเชิงเส้นตัวแปรเดียว ตอนที่ 2', searchedAt: FOUND_REQ, reason: 'ผลค้นหาไม่มีคลิปชื่อนี้', status: 'PENDING' },
  { lessonId: 'math-alg-exponents', requestedTitle: 'เลขยกกำลัง ม.4', requestedChannel: 'ALTV / Thai PBS', searchQuery: 'ALTV Thai PBS เลขยกกำลัง ม.4', searchedAt: FOUND_REQ, reason: 'ผลค้นหาไม่มีคลิปของ ALTV / Thai PBS', status: 'PENDING' },
  { lessonId: 'math-trig-ratios', requestedTitle: 'อัตราส่วนตรีโกณมิติ ม.4', requestedChannel: 'DekTalent', searchQuery: 'DekTalent อัตราส่วนตรีโกณมิติ', searchedAt: FOUND_REQ, reason: 'พบคลิปอื่นของ DekTalent แต่ไม่มีคลิปอัตราส่วนตรีโกณมิติที่ยืนยันว่าเป็นของช่องนี้', status: 'PENDING' },
  { lessonId: 'phy-kin-1d', requestedTitle: 'การเคลื่อนที่แนวตรง', requestedChannel: 'ideal Physics', searchQuery: 'ideal Physics การเคลื่อนที่แนวตรง', searchedAt: FOUND_REQ, reason: 'ผลค้นหาไม่ระบุช่อง ideal Physics สำหรับเรื่องนี้', status: 'PENDING' },
  { lessonId: 'phy-kin-1d', requestedTitle: 'การเคลื่อนที่แนวตรง', requestedChannel: 'Nestle School', searchQuery: 'Nestle School การเคลื่อนที่แนวตรง ฟิสิกส์', searchedAt: FOUND_REQ, reason: 'ผลค้นหาไม่มีคลิปของ Nestle School', status: 'PENDING' },
  { lessonId: 'phy-dyn-newton', requestedTitle: 'กฎของนิวตัน', requestedChannel: 'We Mahidol', searchQuery: 'We Mahidol กฎของนิวตัน', searchedAt: FOUND_REQ, reason: 'ผลค้นหาไม่ระบุคลิปใดว่าเป็นของ We Mahidol', status: 'PENDING' },
];

/* Phase 67: found by lesson-topic searches (channel unknown). */
const SEARCHED: Row[] = [] = [
  c('math-alg-linear-eq', '-L6v1ZiysTA', "สมการเชิงเส้นตัวแปรเดียว ม.1 EP.1 หลักการแก้สมการ", 'th', "สมการเชิงเส้นตัวแปรเดียว คณิตศาสตร์ ม.1"),
  c('math-alg-linear-eq', 'FciYz-j1Sg8', "สมการ ver.สอนละเอียดที่สุดในชีวิต EP.1 || สมการเชิงเส้นตัวแปรเดียว || คณิต ม.1 เทอม 2", 'th', "สมการเชิงเส้นตัวแปรเดียว คณิตศาสตร์ ม.1"),
  c('math-alg-linear-eq', 'KnQ2TpnUCYg', "การแก้สมการเชิงเส้นตัวแปรเดียว", 'th', "สมการเชิงเส้นตัวแปรเดียว คณิตศาสตร์ ม.1"),
  c('math-alg-linear-system', 'KfRxaRsoIvE', "สมการเชิงเส้น 2 ตัวแปร ep.1 (วิธีแทนค่า) สอนแบบง่ายๆทำได้จริงๆ", 'th', "ระบบสมการเชิงเส้นสองตัวแปร วิธีแทนค่า วิธีกำจัดตัวแปร"),
  c('math-alg-linear-system', 'WY32wWV4IhY', "การแก้ระบบสมการเชิงเส้นสองตัวแปร : วิธีกำจัดตัวแปร", 'th', "ระบบสมการเชิงเส้นสองตัวแปร วิธีแทนค่า วิธีกำจัดตัวแปร"),
  c('math-alg-linear-system', 'V87HCi1azpI', "ระบบสมการเชิงเส้นสองตัวแปร ม.3 - สรุปทุกสิ่งที่ต้องรู้", 'th', "ระบบสมการเชิงเส้นสองตัวแปร วิธีแทนค่า วิธีกำจัดตัวแปร"),
  c('math-alg-linear-ineq', 'MOqSq1e_GFY', "อสมการเชิงเส้นตัวแปรเดียว ม.3 - สรุปทุกสิ่งที่ต้องรู้", 'th', "อสมการเชิงเส้นตัวแปรเดียว ม.3"),
  c('math-alg-linear-ineq', '7mgEoFJRvts', "พื้นฐาน อสมการเชิงเส้นตัวแปรเดียว + สรุป สมบัติการไม่เท่ากัน", 'th', "อสมการเชิงเส้นตัวแปรเดียว ม.3"),
  c('math-alg-linear-ineq', '-QQWtrxSV4Y', "การแก้อสมการเชิงเส้นตัวแปรเดียว", 'th', "อสมการเชิงเส้นตัวแปรเดียว ม.3"),
  c('math-alg-exponents', 'LLAepS9r5ps', "1.1 เลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็ม", 'th', "เลขยกกำลัง สมบัติเลขยกกำลัง เลขชี้กำลังเป็นศูนย์ ลบ"),
  c('math-alg-exponents', 'JKEEPYfVk60', "สรุป 7 สมบัติเลขยกกำลัง สิ่งที่ควรรู้และห้ามทำเด็ดขาด !", 'th', "เลขยกกำลัง สมบัติเลขยกกำลัง เลขชี้กำลังเป็นศูนย์ ลบ"),
  c('math-alg-exponents', 'qDMl5gTX2Wo', "กฎข้อ4 เลขชี้กำลังที่เป็นลบ", 'th', "เลขยกกำลัง สมบัติเลขยกกำลัง เลขชี้กำลังเป็นศูนย์ ลบ"),
  c('math-fn-linear', '7_DIMMq3iYg', "วิธีการหา ความชัน ของเส้นตรง + เทคนิค มองกราฟตอบได้เลย ! - ม.3", 'th', "ความชัน กราฟเส้นตรง y = mx + c สอน"),
  c('math-fn-linear', 'Z0VravsprbU', "การหาความชัน จากสมการเส้นตรง", 'th', "ความชัน กราฟเส้นตรง y = mx + c สอน"),
  c('math-fn-linear', 'QKGE9WKwayo', "พื้นฐานคณิตสำหรับฟิสิกส์ ( Ep15) : กราฟเส้นตรง ความชันกราฟ สมการเส้นตรง ตัวอย่างโจทย์ และ เฉลย", 'th', "ความชัน กราฟเส้นตรง y = mx + c สอน"),
  c('math-trig-ratios', '_VRibPRkLj8', "อัตราส่วนตรีโกณมิติในสามเหลี่ยมมุมฉาก", 'th', "อัตราส่วนตรีโกณมิติ sin cos tan ม.3"),
  c('math-trig-ratios', 'BgDlyPypHb4', "สอนตรีโกณ มัธยมสาม ที่มาของsin cos tan ของมุม 30 45 60", 'th', "อัตราส่วนตรีโกณมิติ sin cos tan ม.3"),
  c('math-trig-ratios', 'ZtuAmnkyZFE', "อัตราส่วนตรีโกณมิติ ม.3 เทอม 2 แบบฝึกหัด 5.1 (ข้อ 3) : การหาค่าของฟังก์ชัน Sin , Cos , Tan", 'th', "อัตราส่วนตรีโกณมิติ sin cos tan ม.3"),
  c('prog-py-variables', 'JdY2Qja6z7I', "เขียนไพทอนแสดงผลง่าย ๆ ด้วยคำสั่ง print", 'th', "Python variables data types tutorial beginners / สอน Python input print เบื้องต้น ภาษาไทย"),
  c('prog-py-variables', 'abpivu3ujlQ', "Python Variables & Data Types Explained for Beginners", 'en', "Python variables data types tutorial beginners / สอน Python input print เบื้องต้น ภาษาไทย"),
  c('prog-py-io', 'YghgZhFhOjU', "Python (คำสั่งรับค่า input — ตามคำอธิบายในผลค้นหา)", 'th', "สอน Python input print เบื้องต้น ภาษาไทย"),
  c('prog-py-io', 'UWrEy4GNO7c', "สอน Python เบื้องต้น คำสั่ง print [Part2]", 'th', "สอน Python input print เบื้องต้น ภาษาไทย"),
  c('prog-py-io', 'WnCBW_Im2UU', "Python Tutorial for Beginners #1 - Printing, Input, and Variables", 'en', "สอน Python input print เบื้องต้น ภาษาไทย"),
  c('prog-ctrl-conditions', 'nSuskKWbL70', "สอนไพธอน Python 3: การใช้ if...else เพื่อตรวจสอบเงื่อนไขเบื้องต้น", 'th', "สอน Python if elif else ภาษาไทย"),
  c('prog-ctrl-conditions', '4KiR2z8MG24', "สร้างเงื่อนไขคำสั่ง if else ใน python อย่างง่าย", 'th', "สอน Python if elif else ภาษาไทย"),
  c('prog-ctrl-conditions', '7n9feObdXHQ', "สอนไพธอน Python 3: การใช้คำสั่ง if ในการตรวจสอบเงื่อนไข ตอนที่ 2", 'th', "สอน Python if elif else ภาษาไทย"),
  c('prog-ctrl-loops', '-LIJeIapp_A', "while loop กับ for loop ต่างกันยังไง ควรใช้ตอนไหนดี", 'th', "สอน Python for loop while loop ภาษาไทย"),
  c('prog-ctrl-loops', 'x8Bh-0g9drQ', "Python for & while loops - คำสั่งการวนซ้ำ (ฉบับเต็ม)", 'th', "สอน Python for loop while loop ภาษาไทย"),
  c('prog-ctrl-loops', '5u94rRo6cXk', "สอน Python เบื้องต้น - บทที่ 6 Loops วนลูป", 'th', "สอน Python for loop while loop ภาษาไทย"),
  c('prog-fn-functions', 'NJnn7OZX5EY', "Python...แบบบ้านบ้าน ตอนที่ 12 [ฟังก์ชัน def]", 'th', "สอน Python function def return list dictionary ภาษาไทย"),
  c('prog-fn-functions', 'r5vnGAI8Uo0', "สรุปสั้นๆ เรื่อง Dictionary ใน Python (แถม Set ท้ายคลิป)", 'th', "สอน Python function def return list dictionary ภาษาไทย"),
  c('prog-fn-functions', '9X1cUbBF6Lc', "สอนไพธอน Python 3: รู้จักข้อมูลแบบ dictionary (key-value pair) เบื้องต้น", 'th', "สอน Python function def return list dictionary ภาษาไทย"),
  c('phy-vec-units', 'KlL3pFawWYM', "ฟิสิกส์ 1 ม.4 หน่วยฐาน หน่วย SI", 'th', "หน่วยSI คำนำหน้าหน่วย ฟิสิกส์ ม.4"),
  c('phy-vec-units', 'C7raRBkjeCQ', "หน่วยและการวัด ( Ep1) : หน่วย SI ระบบหน่วย เอสไอ (SI Unit)", 'th', "หน่วยSI คำนำหน้าหน่วย ฟิสิกส์ ม.4"),
  c('phy-vec-units', 'Dt9uYyEtfhw', "เทคนิคการเปลี่ยนหน่วย (ฟิสิกส์ ม.4)", 'th', "หน่วยSI คำนำหน้าหน่วย ฟิสิกส์ ม.4"),
  c('phy-vec-vectors', 'sbsyPfnWyK0', "เวกเตอร์ (การบวก ลบ และแตกเวกเตอร์)", 'th', "เวกเตอร์ ฟิสิกส์ ม.4 การแยกเวกเตอร์ การรวมเวกเตอร์"),
  c('phy-vec-vectors', '0nltg8benaA', "เวกเตอร์ (Vector) [ฟิสิกส์ ม.ต้น/ฟิสิกส์ ม.4]", 'th', "เวกเตอร์ ฟิสิกส์ ม.4 การแยกเวกเตอร์ การรวมเวกเตอร์"),
  c('phy-vec-vectors', 'JfWaI2gODMM', "พื้นฐานการรวมเวกเตอร์", 'th', "เวกเตอร์ ฟิสิกส์ ม.4 การแยกเวกเตอร์ การรวมเวกเตอร์"),
  c('phy-kin-1d', 'C6TFeE_0jJE', "สอนทำโจทย์ 5 สูตรหลัก การเคลื่อนที่แนวตรง (ฟิสิกส์ ม.4)", 'th', "การเคลื่อนที่แนวตรง ความเร่งคงตัว ฟิสิกส์ ม.4"),
  c('phy-kin-1d', 'Hq_V8LYtsMg', "สรุป การเคลื่อนที่แนวตรง - แบบฝึกหัดเสริม 2.14 โจทย์การใช้ 4 สมการการเคลื่อนที่", 'th', "การเคลื่อนที่แนวตรง ความเร่งคงตัว ฟิสิกส์ ม.4"),
  c('phy-kin-1d', 'jPjmVj5CeJY', "สรุป เคลื่อนที่แนวตรง - การกระจัด ระยะทาง ความเร็ว อัตราเร็ว ความเร่ง อัตราเร่ง", 'th', "การเคลื่อนที่แนวตรง ความเร่งคงตัว ฟิสิกส์ ม.4"),
  c('phy-dyn-newton', 'XsrjYsgtOuc', "สรุป แรงและการเคลื่อน - แรง กฎการเคลื่อนที่ของนิวตัน ทั้ง 3 ข้อ", 'th', "กฎการเคลื่อนที่ของนิวตัน ฟิสิกส์ ม.4"),
  c('phy-dyn-newton', 'g7igNxNEYkg', "กฎการเคลื่อนที่ข้อที่หนึ่งและข้อที่สองของนิวตัน วิทยาศาสตร์ ม.4-6 (ฟิสิกส์)", 'th', "กฎการเคลื่อนที่ของนิวตัน ฟิสิกส์ ม.4"),
  c('phy-dyn-newton', 'uMQp0KYBoIo', "กฎการเคลื่อนที่ข้อที่สามของนิวตัน วิทยาศาสตร์ ม.4-6 (ฟิสิกส์)", 'th', "กฎการเคลื่อนที่ของนิวตัน ฟิสิกส์ ม.4"),
];

/** Priority candidates first, then the rest; candidateRank = review order within each lesson. */
export const YOUTUBE_CANDIDATES: YouTubeCandidate[] = (() => {
  const seen = new Set<string>();
  const next = new Map<string, number>();
  return [...PRIORITY, ...SEARCHED]
    .filter((x) => !seen.has(`${x.lessonId}:${x.videoId}`) && !!seen.add(`${x.lessonId}:${x.videoId}`))
    .map((x) => {
      const n = (next.get(x.lessonId) ?? 0) + 1;
      next.set(x.lessonId, n);
      return { ...x, candidateRank: n };
    });
})();
