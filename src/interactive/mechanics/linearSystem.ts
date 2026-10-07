/* Substitution Machine + Story → Model Translator (math-alg-linear-system).
   Equations are a·x + b·y = c. No eval — plain arithmetic on numbers. */

export interface Lin { a: number; b: number; c: number }

export const holds = (e: Lin, x: number, y: number) => Math.abs(e.a * x + e.b * y - e.c) < 1e-9;

const sgn = (n: number, first: boolean) => (n < 0 ? (first ? '−' : ' − ') : first ? '' : ' + ');
const coef = (n: number) => (Math.abs(n) === 1 ? '' : String(Math.abs(n)));
export const linText = (e: Lin) => `${e.a ? `${sgn(e.a, true)}${coef(e.a)}x` : ''}${e.b ? `${sgn(e.b, !e.a)}${coef(e.b)}y` : ''} = ${e.c < 0 ? '−' : ''}${Math.abs(e.c)}`;

/* ── Substitution: relation x + b·y = c  (a = 1)  →  x = c − b·y ── */

/** "x − y = 2" → the label "x = y + 2" (only relations with a = 1, i.e. x alone on one side after rearranging). */
export function rearrangeForX(rel: Lin): { k: number; m: number; text: string } {
  if (rel.a !== 1) throw new Error('relation must have coefficient 1 on x');
  const m = -rel.b; // x = m·y + k
  const k = rel.c;
  const yPart = m === 0 ? '' : `${coef(m) || ''}${m < 0 ? '' : ''}y`;
  const text = `x = ${m < 0 ? '−' : ''}${yPart}${k === 0 ? '' : `${m === 0 ? '' : k < 0 ? ' − ' : ' + '}${Math.abs(k)}`}`;
  return { k, m, text };
}

/** Text of the target equation after every x is replaced by (m·y + k) — shown, not simplified. */
export function substitutedText(target: Lin, sub: { k: number; m: number }) {
  const inner = `${sub.m === 1 ? '' : sub.m === -1 ? '−' : sub.m}y ${sub.k < 0 ? '−' : '+'} ${Math.abs(sub.k)}`;
  const x = `${target.a === 1 ? '' : target.a === -1 ? '−' : target.a}(${inner})`;
  const y = target.b ? `${target.b < 0 ? ' − ' : ' + '}${coef(target.b)}y` : '';
  return `${x}${y} = ${target.c}`;
}

/** Solve after substitution: a(m·y + k) + b·y = c */
export function solveSubstituted(target: Lin, sub: { k: number; m: number }): { y: number; x: number } {
  const y = (target.c - target.a * sub.k) / (target.a * sub.m + target.b);
  return { y, x: sub.m * y + sub.k };
}

/** What the substituted equation gives for a learner's y — so a wrong y shows its own consequence. */
export const substitutedValue = (target: Lin, sub: { k: number; m: number }, y: number) => target.a * (sub.m * y + sub.k) + target.b * y;

/* ── Story → model ── */

/** A piece of the story the learner can place into an equation slot. */
export interface StoryChip {
  id: string;
  label: string;
  value: number;
  /** count of things, money, or a plain number */
  measure: 'count' | 'money' | 'number';
  /** for a per-item price: which unknown it belongs to */
  belongsTo?: 'x' | 'y';
  /** how the chip reads in a sentence, e.g. "ราคาตั๋วผู้ใหญ่ (60 บาท)" */
  says: string;
}

export interface StoryRow {
  id: string;
  /** what this equation is about, e.g. "จำนวนตั๋ว" */
  label: string;
  /** what the story says for this relationship (used in feedback) */
  storySays: string;
  expect: Lin;
}

export interface StoryNames { x: string; y: string }

export interface RowSlots { a?: string; b?: string; c?: string }

/** Coefficient chips: '1' means "count the unknown itself"; a price means "money from it". */
function termMeasure(chip: StoryChip | undefined): 'count' | 'money' | 'number' | undefined {
  if (!chip) return undefined;
  if (chip.measure === 'number' && Math.abs(chip.value) === 1) return 'count';
  return chip.measure === 'money' ? 'money' : chip.measure;
}

export function rowEquation(slots: RowSlots, chips: StoryChip[]): Lin | undefined {
  const g = (id?: string) => chips.find((c) => c.id === id);
  const a = g(slots.a), b = g(slots.b), c = g(slots.c);
  if (!a || !b || !c) return undefined;
  return { a: a.value, b: b.value, c: c.value };
}

/** Check one row and, when wrong, say what the learner's equation MEANS compared with the story. */
export function checkStoryRow(row: StoryRow, slots: RowSlots, chips: StoryChip[], names: StoryNames, kind: 'money-count' | 'numbers'): { ok: boolean; message?: string } {
  const g = (id?: string) => chips.find((c) => c.id === id);
  const a = g(slots.a), b = g(slots.b), c = g(slots.c);
  if (!a || !b || !c) return { ok: false, message: 'ยังเติมไม่ครบทุกช่อง' };
  const eq = { a: a.value, b: b.value, c: c.value };
  if (eq.a === row.expect.a && eq.b === row.expect.b && eq.c === row.expect.c) return { ok: true };

  if (kind === 'numbers') {
    const says = (e: Lin) =>
      e.a === 1 && e.b === 1 ? `สองจำนวนบวกกันได้ ${e.c}` : e.a === 1 && e.b === -1 ? `${names.x} มากกว่า ${names.y} อยู่ ${e.c}` : e.a === -1 && e.b === 1 ? `${names.y} มากกว่า ${names.x} อยู่ ${e.c}` : `${linText(e)}`;
    return { ok: false, message: `สมการนี้หมายความว่า ${says(eq)} แต่โจทย์บอกว่า ${row.storySays}` };
  }

  // money / count story
  const ta = termMeasure(a), tb = termMeasure(b);
  if (a.belongsTo === 'y' || b.belongsTo === 'x') {
    const wrong = a.belongsTo === 'y' ? a : b;
    const who = a.belongsTo === 'y' ? names.x : names.y;
    return { ok: false, message: `สมการนี้หมายความว่า ${who}ใช้${wrong.says} แต่โจทย์บอกว่า ${wrong.says} ใช้กับ${wrong.belongsTo === 'x' ? names.x : names.y}` };
  }
  if (ta !== tb) return { ok: false, message: `สมการนี้บวก “จำนวน” กับ “เงิน” เข้าด้วยกัน — สองอย่างนี้บวกกันไม่ได้` };
  const lhs = ta === 'money' ? 'เงินที่ได้' : 'จำนวนตั๋ว';
  const rhs = c.measure === 'money' ? 'เงิน' : 'จำนวนใบ';
  if ((ta === 'money') !== (c.measure === 'money')) return { ok: false, message: `สมการนี้หมายความว่า ${lhs}รวมกัน = ${c.label} แต่ ${c.label} คือ${rhs} — ${row.storySays}` };
  return { ok: false, message: `สมการนี้หมายความว่า ${lhs}รวม = ${c.label} แต่โจทย์บอกว่า ${row.storySays}` };
}
