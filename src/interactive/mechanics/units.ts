/* Cancellation Tiles (phy-vec-units) — a conversion factor is a "1" written as top/bottom.
   The learner decides WHICH tiles and WHICH WAY UP; units that appear on top and bottom cancel.
   The number is only computed once the remaining units are exactly the target units. */

export interface UnitExpr { num: string[]; den: string[] }
export interface UnitTile { id: string; top: { v: number; u: string }; bottom: { v: number; u: string } }
export interface PlacedTile { id: string; flipped: boolean }

export interface UnitOccurrence { unit: string; where: 'num' | 'den'; source: 'given' | string; cancelled: boolean }

export interface UnitEvaluation {
  occurrences: UnitOccurrence[];
  remaining: UnitExpr;
  /** Remaining units are exactly the target units */
  matches: boolean;
  /** value × all factors — meaningful only when `matches` */
  value: number;
  remainingText: string;
}

const sideOf = (t: UnitTile, flipped: boolean) => (flipped ? { top: t.bottom, bottom: t.top } : { top: t.top, bottom: t.bottom });

const sameMultiset = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/** km·km/(m·h) → "km²/(m·h)" */
export function formatUnits(e: UnitExpr): string {
  const group = (xs: string[]) => {
    const c = new Map<string, number>();
    xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
    const sup = (n: number) => (n === 1 ? '' : String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]));
    return [...c].map(([u, n]) => `${u}${sup(n)}`);
  };
  const num = group(e.num);
  const den = group(e.den);
  const top = num.length ? num.join('·') : '1';
  if (!den.length) return top;
  return `${top}/${den.length > 1 ? `(${den.join('·')})` : den[0]}`;
}

export function evaluateUnits(value: number, from: UnitExpr, to: UnitExpr, tiles: UnitTile[], placed: PlacedTile[]): UnitEvaluation {
  const occ: UnitOccurrence[] = [
    ...from.num.map((unit) => ({ unit, where: 'num' as const, source: 'given', cancelled: false })),
    ...from.den.map((unit) => ({ unit, where: 'den' as const, source: 'given', cancelled: false })),
  ];
  let v = value;
  for (const p of placed) {
    const tile = tiles.find((t) => t.id === p.id);
    if (!tile) continue;
    const s = sideOf(tile, p.flipped);
    v = (v * s.top.v) / s.bottom.v;
    occ.push({ unit: s.top.u, where: 'num', source: p.id, cancelled: false });
    occ.push({ unit: s.bottom.u, where: 'den', source: p.id, cancelled: false });
  }
  for (const d of occ.filter((o) => o.where === 'den')) {
    const n = occ.find((o) => o.where === 'num' && !o.cancelled && o.unit === d.unit);
    if (n) { n.cancelled = true; d.cancelled = true; }
  }
  const remaining = { num: occ.filter((o) => o.where === 'num' && !o.cancelled).map((o) => o.unit), den: occ.filter((o) => o.where === 'den' && !o.cancelled).map((o) => o.unit) };
  const matches = sameMultiset(remaining.num, to.num) && sameMultiset(remaining.den, to.den);
  return { occurrences: occ, remaining, matches, value: Math.round(v * 1e9) / 1e9, remainingText: formatUnits(remaining) };
}

/** Short, structural feedback about what is still wrong with the units. */
export function unitFeedback(e: UnitEvaluation, to: UnitExpr): string {
  if (e.matches) return `หน่วยเหลือ ${formatUnits(to)} ตรงตามที่ต้องการแล้ว`;
  const extraTop = e.remaining.num.filter((u) => !to.num.includes(u));
  const extraBottom = e.remaining.den.filter((u) => !to.den.includes(u));
  const missingTop = to.num.filter((u) => !e.remaining.num.includes(u));
  const missingBottom = to.den.filter((u) => !e.remaining.den.includes(u));
  const doubled = e.remaining.num.find((u, i) => e.remaining.num.indexOf(u) !== i) ?? e.remaining.den.find((u, i) => e.remaining.den.indexOf(u) !== i);
  const given = new Set(e.occurrences.filter((o) => o.source === 'given').map((o) => o.unit));
  const foreign = [...e.remaining.num, ...e.remaining.den].find((u) => !given.has(u) && !to.num.includes(u) && !to.den.includes(u));
  if (foreign) return `โจทย์นี้ไม่มี ${foreign} เลย — ตัวประกอบที่มี ${foreign} ไม่เกี่ยวกับโจทย์ เอาออกแล้วเลือกตัวที่มีหน่วยของโจทย์`;
  if (doubled) return `หน่วยยังไม่หาย กลับกลายเป็น ${e.remainingText} — แปลว่าตัวประกอบที่มี ${doubled} วางผิดด้าน ลองพลิกให้ ${doubled} อยู่ตรงข้ามกับ ${doubled} เดิม`;
  if (extraTop.length || extraBottom.length) return `ยังเหลือ ${[...extraTop, ...extraBottom].join(', ')} ที่ต้องตัดออก — หาตัวประกอบที่มีหน่วยนี้ แล้ววางให้อยู่ด้านตรงข้าม`;
  if (missingTop.length || missingBottom.length) return `ยังไม่มี ${[...missingTop, ...missingBottom].join(', ')} — เพิ่มตัวประกอบที่นำหน่วยนี้เข้ามา`;
  return `ตอนนี้หน่วยคือ ${e.remainingText} ยังไม่ใช่ ${formatUnits(to)}`;
}
