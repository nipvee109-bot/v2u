/* Motion Over Time (phy-kin-1d) — pure physics for the track, the marks and the v–t graph.
   Constant acceleration only (the lesson's boundary). A braking car stops; it never reverses. */

export type KinVar = 'u' | 'v' | 'a' | 's' | 't';
export interface MotionState { t: number; x: number; v: number; stopped: boolean }

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Position/velocity after t seconds from x = 0 with initial speed u and constant acceleration a. */
export function motionAt(u: number, a: number, t: number): MotionState {
  if (a < 0 && u > 0) {
    const tStop = -u / a;
    if (t >= tStop) return { t, x: round(u * tStop + 0.5 * a * tStop * tStop), v: 0, stopped: true };
  }
  if (a < 0 && u <= 0) return { t, x: 0, v: 0, stopped: true }; // braking while already stopped does not move the car backwards
  return { t, x: round(u * t + 0.5 * a * t * t), v: round(u + a * t), stopped: false };
}

/** One mark per second from t = 0 to tEnd (inclusive). */
export const marksUntil = (u: number, a: number, tEnd: number): MotionState[] =>
  Array.from({ length: Math.floor(tEnd) + 1 }, (_, t) => motionAt(u, a, t));

/** Distance covered in each 1-second interval — what the learner sees as mark spacing. */
export const spacings = (marks: MotionState[]) => marks.slice(1).map((m, i) => round(m.x - marks[i].x));

export interface PredictionResult { ok: boolean; predicted: number; actual: number; message: string }

export function judgePrediction(predicted: number, actual: number, tol: number, spacingSoFar: number[]): PredictionResult {
  const ok = Math.abs(predicted - actual) <= tol;
  if (ok) return { ok, predicted, actual, message: `ตรง — รถอยู่ที่ ${fmt(actual)} m` };
  const growing = spacingSoFar.length >= 2 && spacingSoFar[spacingSoFar.length - 1] > spacingSoFar[spacingSoFar.length - 2];
  const hint = growing
    ? 'ดูระยะห่างระหว่างรอย: แต่ละวินาทีรถไปได้ไกลขึ้นกว่าวินาทีก่อน เพราะความเร็วเพิ่มขึ้นทุกวินาที'
    : 'ดูระยะห่างระหว่างรอย: ถ้าความเร็วคงที่ รถไปได้ระยะเท่ากันทุกวินาที';
  return { ok, predicted, actual, message: `คุณคาดไว้: ${fmt(predicted)} m · รถอยู่จริง: ${fmt(actual)} m — ${hint}` };
}

export type MotionGoal = { type: 'reach'; x: number; t: number } | { type: 'stop'; x: number };

export function judgeGoal(goal: MotionGoal, u: number, a: number, tol: number): { ok: boolean; message: string; end: MotionState } {
  if (goal.type === 'reach') {
    const end = motionAt(u, a, goal.t);
    if (Math.abs(end.x - goal.x) <= tol) return { ok: true, end, message: `ถึงธงที่ ${goal.x} m ตอน t = ${goal.t} s พอดี` };
    return { ok: false, end, message: `ตอน t = ${goal.t} s รถอยู่ที่ ${fmt(end.x)} m — ${end.x < goal.x ? 'ยังไม่ถึงธง ลองเพิ่ม u หรือ a' : 'เลยธงไปแล้ว ลองลด u หรือ a'}` };
  }
  if (a >= 0) {
    const end = motionAt(u, a, 10);
    return { ok: false, end, message: a > 0 ? 'รถเร่งขึ้นแทนที่จะเบรก — ตอนเบรก a ต้องมีทิศตรงข้ามกับความเร็ว (ติดลบ)' : 'a = 0 รถวิ่งด้วยความเร็วเท่าเดิม ไม่หยุด — ต้องมีความเร่งติดลบ' };
  }
  const tStop = u / -a;
  const end = motionAt(u, a, tStop);
  if (Math.abs(end.x - goal.x) <= tol) return { ok: true, end, message: `หยุดที่ ${fmt(end.x)} m ตรงเส้นพอดี ใช้เวลา ${fmt(tStop)} s` };
  return { ok: false, end, message: `รถหยุดที่ ${fmt(end.x)} m — ${end.x > goal.x ? 'เลยเส้น เบรกแรงขึ้น (a ติดลบมากขึ้น)' : 'หยุดก่อนถึงเส้น เบรกเบาลง'}` };
}

/* ── Choosing an equation from what is known ── */
export const KIN_EQUATIONS: { ruleId: string; vars: KinVar[]; text: string }[] = [
  { ruleId: 'r-1', vars: ['v', 'u', 'a', 't'], text: 'v = u + at' },
  { ruleId: 'r-2', vars: ['s', 'u', 'a', 't'], text: 's = ut + ½at²' },
  { ruleId: 'r-3', vars: ['v', 'u', 'a', 's'], text: 'v² = u² + 2as' },
  { ruleId: 'r-4', vars: ['s', 'u', 'v', 't'], text: 's = (u + v)t / 2' },
];

/** Equations that contain the unknown and otherwise only known quantities. */
export const usableEquations = (known: KinVar[], unknown: KinVar) =>
  KIN_EQUATIONS.filter((e) => e.vars.includes(unknown) && e.vars.every((v) => v === unknown || known.includes(v)));

export const fmt = (n: number) => String(Math.round(n * 100) / 100);
