import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Feedback } from '../Questions';
import { scrambled } from '../../../interactive/engine';
import type { KnowledgeMistake } from '../../../content/knowledge';
import type { CodeTraceData } from '../../../interactive/studio/traces';

/* Phase 69 — reusable TEACHING patterns (not games). Every pattern:
   learner acts → instructional feedback (what happened, why, what next) → onDone.
   Numbers and text come from the lesson's knowledge; formulas are the lesson's own rules. */

const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50';
const PRIMARY = `${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-hi)]`;
const GHOST = `${BTN} border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-3)]`;
const pick = (on: boolean) => `${BTN} border ${on ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'border-[var(--line)]'}`;
const CODE = { fontVariantLigatures: 'none' } as const;
const fmt = (n: number, d = 2) => String(Math.round(n * 10 ** d) / 10 ** d);

function Stepper({ label, value, set, min, max, step = 1 }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="min-w-[2.5rem] font-mono text-sm font-semibold">{label}</span>
      <button type="button" className={GHOST} aria-label={`ลด ${label}`} onClick={() => set(Math.max(min, +(value - step).toFixed(4)))} disabled={value <= min}>−</button>
      <output className="min-w-[3rem] text-center font-mono text-base font-bold" aria-live="polite">{value}</output>
      <button type="button" className={GHOST} aria-label={`เพิ่ม ${label}`} onClick={() => set(Math.min(max, +(value + step).toFixed(4)))} disabled={value >= max}>+</button>
    </div>
  );
}

function Slider({ label, unit, value, set, min, max, step = 1 }: { label: string; unit?: string; value: number; set: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between font-medium text-[var(--ink-2)]"><span>{label}</span><span className="font-mono text-ink">{value}{unit ? ` ${unit}` : ''}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-1 h-11 w-full accent-[var(--brand)]" aria-label={`${label}${unit ? ` (${unit})` : ''}`} />
    </label>
  );
}

/* ── STEP_ORDERING ─────────────────────────────────────────────────────── */
export function OrderSteps({ steps, onDone }: { steps: string[]; onDone: () => void }) {
  const [order, setOrder] = useState(() => scrambled(steps.map((s, i) => `${i}|${s}`), 11));
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'open' | 'right' | 'shown'>('open');
  const move = (k: number, d: -1 | 1) => {
    const j = k + d;
    if (j < 0 || j >= order.length) return;
    const n = [...order];
    [n[k], n[j]] = [n[j], n[k]];
    setOrder(n);
  };
  const correctAt = order.filter((x, i) => Number(x.split('|')[0]) === i).length;
  const check = () => {
    if (correctAt === steps.length) { setState('right'); onDone(); } else setTries((t) => t + 1);
  };
  const shown = state === 'shown' ? steps.map((s, i) => `${i}|${s}`) : order;
  return (
    <div data-testid="order-steps">
      <ol className="space-y-2">
        {shown.map((x, k) => {
          const text = x.slice(x.indexOf('|') + 1);
          return (
            <li key={x} className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-bold">{k + 1}</span>
              <span className="min-w-0 flex-1 text-sm break-words">{text}</span>
              {state === 'open' && (
                <span className="flex shrink-0 gap-1">
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[var(--surface-3)] disabled:opacity-30" onClick={() => move(k, -1)} disabled={k === 0} aria-label={`เลื่อนขั้น “${text}” ขึ้น`}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[var(--surface-3)] disabled:opacity-30" onClick={() => move(k, 1)} disabled={k === shown.length - 1} aria-label={`เลื่อนขั้น “${text}” ลง`}><ArrowDown className="h-4 w-4" /></button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {state === 'open' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={PRIMARY} onClick={check}>ตรวจลำดับ</button>
          {tries >= 2 && <button type="button" className={GHOST} onClick={() => { setState('shown'); onDone(); }}>ดูลำดับที่ถูก</button>}
        </div>
      )}
      {state === 'open' && tries > 0 && (
        <Feedback tone="try" title={`ถูกตำแหน่ง ${correctAt} จาก ${steps.length} ขั้น`}>ถามตัวเองว่า “ขั้นนี้ต้องใช้ผลจากขั้นไหนก่อน?” ขั้นที่ใช้ผลของอีกขั้นต้องอยู่หลังขั้นนั้น</Feedback>
      )}
      {state !== 'open' && <Feedback tone="good" title={state === 'right' ? 'เรียงถูกทั้งหมด' : 'นี่คือลำดับที่ถูก'}>แต่ละขั้นใช้ผลจากขั้นก่อนหน้า — นี่คือเหตุผลที่ลำดับสำคัญ</Feedback>}
    </div>
  );
}

/* ── MISSING_STEP ──────────────────────────────────────────────────────── */
export function MissingStep({ problem, steps, index, distractors, onDone }: { problem: string; steps: string[]; index: number; distractors: string[]; onDone: () => void }) {
  const choices = useMemo(() => scrambled([steps[index], ...distractors.slice(0, 2)], index + 3), [steps, index, distractors]);
  const [picked, setPicked] = useState<string | null>(null);
  const right = picked === steps[index];
  return (
    <div data-testid="missing-step">
      <p className="text-[15px] font-semibold text-ink break-words">{problem}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s} className={`rounded-xl px-3 py-2 text-sm break-words ${i === index ? 'border-2 border-dashed border-[var(--brand)]' : 'bg-[var(--surface-3)]'}`}>
            <span className="mr-2 font-bold">{i + 1}.</span>
            {i === index ? (right ? <b>{s}</b> : <span className="text-[var(--ink-3)]">ขั้นที่หายไป — ขั้นไหนพาจากขั้น {i} ไปถึงขั้น {i + 2}?</span>) : s}
          </li>
        ))}
      </ol>
      {!right && (
        <div role="group" aria-label="เลือกขั้นที่หายไป" className="mt-3 grid gap-2">
          {choices.map((c) => (
            <button key={c} type="button" className={`${pick(picked === c)} justify-start text-left`} onClick={() => { setPicked(c); if (c === steps[index]) onDone(); }}>{c}</button>
          ))}
        </div>
      )}
      {picked && !right && <Feedback tone="try" title="ยังไม่ใช่ขั้นนี้">ขั้นนี้มาจากโจทย์อื่นของบทนี้ — ดูขั้นก่อนหน้าว่าได้อะไรมา แล้วขั้นถัดไปต้องการอะไร</Feedback>}
      {right && <Feedback tone="good" title="ใช่ — ขั้นนี้เชื่อมสองขั้นเข้าด้วยกัน">ทุกขั้นต้องมีเหตุผลรองรับ ถ้าข้ามขั้นนี้ คำตอบจะไปต่อไม่ได้</Feedback>}
    </div>
  );
}

/* ── FIND_THE_MISTAKE: match each of the lesson's mistakes to its fix ── */
export function MistakeMatch({ mistakes, onDone }: { mistakes: KnowledgeMistake[]; onDone: () => void }) {
  const fixes = useMemo(() => scrambled(mistakes.map((m) => m.fix), 5), [mistakes]);
  const [sel, setSel] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const ok = (i: number) => sel[i] === mistakes[i].fix;
  const all = mistakes.every((_, i) => ok(i));
  return (
    <div data-testid="mistake-match" className="space-y-3">
      <p className="text-sm text-[var(--ink-2)]">จับคู่ “จุดที่พลาด” กับ “วิธีแก้” ที่ถูก</p>
      {mistakes.map((m, i) => (
        <fieldset key={m.mistake} className="rounded-2xl border border-[var(--line)] p-3">
          <legend className="sr-only">จุดที่พลาดข้อ {i + 1}</legend>
          <p className="text-sm font-semibold break-words">✗ {m.mistake}</p>
          <div className="mt-2 grid gap-1.5">
            {fixes.map((f) => (
              <button key={f} type="button" aria-pressed={sel[i] === f} className={`${pick(sel[i] === f)} justify-start text-left text-[13px]`} onClick={() => { setSel((s) => ({ ...s, [i]: f })); setChecked(false); }}>{f}</button>
            ))}
          </div>
          {checked && (
            <p className={`mt-2 text-sm ${ok(i) ? 'text-[var(--ok)]' : 'text-[var(--rev)]'}`} role="status">
              {ok(i) ? <>✓ ถูก — <span className="text-[var(--ink-2)]">ทำไมถึงพลาด: {m.why}</span></> : '✗ ยังไม่ใช่ — วิธีแก้ต้องตอบที่ต้นเหตุของจุดพลาดนี้'}
            </p>
          )}
        </fieldset>
      ))}
      <button type="button" className={PRIMARY} disabled={Object.keys(sel).length < mistakes.length} onClick={() => { setChecked(true); if (all) onDone(); }}>ตรวจคำตอบ</button>
    </div>
  );
}

/* ── VISUAL_REASONING: systems — a pair is a solution only if BOTH are true ── */
export function PairCheck({ eqs, onDone }: { eqs: [number, number, number][]; onDone: () => void }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const fired = useRef(false);
  const term = (k: number, v: string, first: boolean) => (k === 0 ? '' : `${k < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${Math.abs(k) === 1 ? '' : Math.abs(k)}${v}`);
  const rows = eqs.map(([a, b, c]) => ({ text: `${term(a, 'x', true)}${term(b, 'y', a === 0)} = ${c}`, lhs: a * x + b * y, c, ok: a * x + b * y === c }));
  const n = rows.filter((r) => r.ok).length;
  useEffect(() => {
    if (n === rows.length && !fired.current) { fired.current = true; onDone(); }
  }, [n, rows.length, onDone]);
  return (
    <div data-testid="pair-check" className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <Stepper label="x =" value={x} set={setX} min={-10} max={10} />
        <Stepper label="y =" value={y} set={setY} min={-10} max={10} />
      </div>
      <ul className="space-y-2" aria-live="polite">
        {rows.map((r) => (
          <li key={r.text} className={`rounded-xl border px-3 py-2 font-mono text-sm ${r.ok ? 'border-[var(--ok)] bg-[var(--ok-soft)]' : 'border-[var(--line)]'}`}>
            {r.text} → แทนค่าได้ {r.lhs} {r.ok ? '= ' + r.c + ' ✓ จริง' : '≠ ' + r.c + ' ✗ เท็จ'}
          </li>
        ))}
      </ul>
      {n === rows.length ? (
        <Feedback tone="good" title={`(x, y) = (${x}, ${y}) เป็นคำตอบของระบบ`}>คู่นี้ทำให้ทุกสมการจริงพร้อมกัน — นี่คือความหมายของ “คำตอบของระบบ”</Feedback>
      ) : n > 0 ? (
        <Feedback tone="try" title="จริงแค่บางสมการ">คู่นี้ใช้ได้กับสมการหนึ่ง แต่คำตอบของระบบต้องทำให้จริงทุกสมการพร้อมกัน ลองขยับค่าอีกนิด</Feedback>
      ) : (
        <p className="text-sm text-[var(--ink-2)]">ลองหาคู่ (x, y) ที่ทำให้ทั้งสองสมการเป็นจริงพร้อมกัน</p>
      )}
    </div>
  );
}

/* ── PREDICT_OBSERVE_EXPLAIN: multiplying an inequality by c ── */
export function NumberLine({ a, b, rule, onDone }: { a: number; b: number; rule: string; onDone: () => void }) {
  const [guess, setGuess] = useState<null | 'same' | 'flip'>(null);
  const [c, setC] = useState(1);
  const [tried, setTried] = useState<Set<'pos' | 'neg'>>(new Set());
  const [done, setDone] = useState(false);
  const A = a * c, B = b * c;
  const rel = A < B ? '<' : A > B ? '>' : '=';
  const setCv = (v: number) => {
    setC(v);
    if (v === 0) return;
    const next = new Set(tried).add(v > 0 ? 'pos' : 'neg');
    setTried(next);
    if (guess && next.size === 2 && !done) { setDone(true); onDone(); }
  };
  const W = 300, lo = -10, hi = 10, X = (v: number) => 10 + ((v - lo) / (hi - lo)) * (W - 20);
  return (
    <div data-testid="number-line" className="space-y-3">
      <p className="text-sm font-semibold">ทายก่อน: ถ้า {a} &lt; {b} แล้วคูณทั้งสองข้างด้วยจำนวนลบ เครื่องหมายจะเป็นอย่างไร?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pick(guess === 'same')} aria-pressed={guess === 'same'} onClick={() => setGuess('same')}>ยังเป็น &lt; เหมือนเดิม</button>
        <button type="button" className={pick(guess === 'flip')} aria-pressed={guess === 'flip'} onClick={() => setGuess('flip')}>กลับเป็น &gt;</button>
      </div>
      {guess && (
        <>
          <Slider label="คูณทั้งสองข้างด้วย c" value={c} set={setCv} min={-3} max={3} />
          <svg viewBox={`0 0 ${W} 70`} className="w-full max-w-[460px]" role="img" aria-label={`เส้นจำนวน: ${a}×${c} = ${A} และ ${b}×${c} = ${B} ดังนั้น ${A} ${rel} ${B}`}>
            <line x1="10" y1="40" x2={W - 10} y2="40" stroke="var(--ink-3)" strokeWidth="2" />
            {[-10, -5, 0, 5, 10].map((t) => <g key={t}><line x1={X(t)} y1="35" x2={X(t)} y2="45" stroke="var(--ink-3)" /><text x={X(t)} y="62" fontSize="10" textAnchor="middle" fill="var(--ink-2)">{t}</text></g>)}
            <circle cx={X(A)} cy="40" r="7" fill="var(--brand)" /><text x={X(A)} y="22" fontSize="11" textAnchor="middle" fill="var(--ink)">{a}c</text>
            <circle cx={X(B)} cy="40" r="7" fill="var(--rev)" /><text x={X(B)} y="22" fontSize="11" textAnchor="middle" fill="var(--ink)">{b}c</text>
          </svg>
          <p className="font-mono text-base font-semibold" aria-live="polite">{a} × {c} = {A} &nbsp; {rel} &nbsp; {b} × {c} = {B}</p>
          {c === 0 && <p className="text-sm text-[var(--ink-2)]">คูณด้วย 0 ทั้งสองข้างได้ 0 เท่ากัน — ลองค่าบวกและค่าลบ</p>}
          {done && (
            <Feedback tone={guess === 'flip' ? 'good' : 'try'} title={guess === 'flip' ? 'ทายถูก' : 'ผลจริงกลับทิศ'}>
              จำนวนลบสลับลำดับบนเส้นจำนวน (ตัวที่เคยอยู่ซ้ายกลายเป็นอยู่ขวา) จึงต้องกลับทิศเครื่องหมาย — {rule}
            </Feedback>
          )}
          {!done && <p className="text-sm text-[var(--ink-2)]">ลองทั้ง c ที่เป็นบวกและเป็นลบ แล้วสังเกตเครื่องหมาย</p>}
        </>
      )}
    </div>
  );
}

/* ── VISUAL_REASONING: exponents as repeated factors ── */
export function ExponentBlocks({ base, onDone }: { base: number; onDone: () => void }) {
  const [mode, setMode] = useState<'mul' | 'div'>('mul');
  const [m, setM] = useState(3);
  const [n, setN] = useState(2);
  const [ans, setAns] = useState('');
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const want = mode === 'mul' ? m + n : m - n;
  const check = () => {
    const ok = Number(ans.replace('−', '-')) === want && ans.trim() !== '';
    setMsg(ok
      ? { ok, text: mode === 'mul' ? `นับตัวคูณได้ ${m} + ${n} = ${m + n} ตัว → ${base}^${m + n}` : `ตัดคู่ที่หารกันได้ ${Math.min(m, n)} คู่ เหลือ ${want >= 0 ? `${want} ตัวบนเศษ → ${base}^${want}` : `${-want} ตัวที่ส่วน → ${base}^${want} = 1/${base}^${-want}`}${want === 0 ? ' (ทุกตัวหักล้างกันหมด จึงได้ 1 = ' + base + '⁰)' : ''}` }
      : { ok, text: mode === 'mul' ? 'นับจำนวนตัว ' + base + ' ทั้งหมดในแถว (คูณฐานเดียวกัน → นับรวม ไม่ใช่คูณเลขชี้กำลัง)' : 'ตัด ' + base + ' บนกับล่างทีละคู่ แล้วดูว่าเหลือกี่ตัวและอยู่ฝั่งไหน' });
    if (ok) {
      const next = new Set(solved).add(mode);
      setSolved(next);
      if (next.size === 2) onDone();
    }
  };
  const row = (k: number, cross = 0) => Array.from({ length: k }, (_, i) => (
    <span key={i} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-sm font-bold ${i < cross ? 'border-dashed border-[var(--ink-3)] text-[var(--ink-3)] line-through' : 'border-[var(--brand)] bg-[var(--brand-soft)]'}`}>{base}</span>
  ));
  const cancel = Math.min(m, n);
  return (
    <div data-testid="exponent-blocks" className="space-y-3">
      <div role="tablist" aria-label="แบบ" className="flex gap-2">
        <button type="button" role="tab" aria-selected={mode === 'mul'} className={pick(mode === 'mul')} onClick={() => { setMode('mul'); setMsg(null); setAns(''); }}>คูณ {base}ᵐ · {base}ⁿ {solved.has('mul') ? '✓' : ''}</button>
        <button type="button" role="tab" aria-selected={mode === 'div'} className={pick(mode === 'div')} onClick={() => { setMode('div'); setMsg(null); setAns(''); }}>หาร {base}ᵐ ÷ {base}ⁿ {solved.has('div') ? '✓' : ''}</button>
      </div>
      <div className="flex flex-wrap gap-4">
        <Stepper label="m =" value={m} set={(v) => { setM(v); setMsg(null); }} min={1} max={6} />
        <Stepper label="n =" value={n} set={(v) => { setN(v); setMsg(null); }} min={1} max={6} />
      </div>
      <div className="space-y-1.5 rounded-2xl bg-[var(--surface-3)] p-3" aria-label={mode === 'mul' ? `${base} คูณกัน ${m} ตัว แล้วคูณอีก ${n} ตัว` : `เศษมี ${base} ${m} ตัว ส่วนมี ${n} ตัว ตัดกันได้ ${cancel} คู่`}>
        {mode === 'mul' ? (
          <div className="flex flex-wrap items-center gap-1">{row(m)}<span className="px-1 font-bold">·</span>{row(n)}</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">{row(m, cancel)}</div>
            <div className="h-0.5 bg-[var(--ink)]" />
            <div className="flex flex-wrap gap-1">{row(n, cancel)}</div>
          </>
        )}
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
        <label className="font-mono text-base font-semibold" htmlFor="exp-ans">{mode === 'mul' ? `${base}^${m} · ${base}^${n} = ${base}^` : `${base}^${m} ÷ ${base}^${n} = ${base}^`}</label>
        <input id="exp-ans" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value)} className="min-h-[44px] w-20 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono" />
        <button type="submit" className={PRIMARY}>ตรวจ</button>
      </form>
      {msg && <Feedback tone={msg.ok ? 'good' : 'try'} title={msg.ok ? 'ถูกต้อง' : 'ลองนับใหม่'}>{msg.text}</Feedback>}
      {solved.size < 2 && <p className="text-xs text-[var(--ink-3)]">ทำให้ถูกทั้งแบบคูณและแบบหาร</p>}
    </div>
  );
}

/* ── GRAPH_EXPLORER: y = mx + c ── */
export function LineGraph({ points, onDone }: { points: [number, number][]; onDone: () => void }) {
  const [m, setM] = useState(1);
  const [c, setC] = useState(0);
  const fired = useRef(false);
  const on = points.map(([x, y]) => Math.abs(m * x + c - y) < 1e-9);
  const hits = on.filter(Boolean).length;
  const done = hits === points.length;
  useEffect(() => {
    if (done && !fired.current) { fired.current = true; onDone(); }
  }, [done, onDone]);
  const W = 300, H = 220, x0 = -1, x1 = 6, y0 = -4, y1 = 12;
  const X = (x: number) => 20 + ((x - x0) / (x1 - x0)) * (W - 30);
  const Y = (y: number) => H - 20 - ((y - y0) / (y1 - y0)) * (H - 30);
  return (
    <div data-testid="line-graph" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="ความชัน m" value={m} set={setM} min={-3} max={4} step={0.5} />
        <Slider label="จุดตัดแกน y (c)" value={c} set={setC} min={-3} max={6} />
      </div>
      <p className="font-mono text-lg font-bold" aria-live="polite">y = {m}x {c < 0 ? '−' : '+'} {Math.abs(c)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px]" role="img" aria-label={`กราฟเส้นตรง y = ${m}x + ${c}; ผ่านจุดของโจทย์ ${hits} จาก ${points.length} จุด`}>
        {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).map((g) => <line key={`x${g}`} x1={X(g)} y1={Y(y0)} x2={X(g)} y2={Y(y1)} stroke="var(--line)" />)}
        {Array.from({ length: (y1 - y0) / 2 + 1 }, (_, i) => y0 + i * 2).map((g) => <line key={`y${g}`} x1={X(x0)} y1={Y(g)} x2={X(x1)} y2={Y(g)} stroke="var(--line)" />)}
        <line x1={X(x0)} y1={Y(0)} x2={X(x1)} y2={Y(0)} stroke="var(--ink-3)" strokeWidth="1.5" />
        <line x1={X(0)} y1={Y(y0)} x2={X(0)} y2={Y(y1)} stroke="var(--ink-3)" strokeWidth="1.5" />
        <line x1={X(x0)} y1={Y(m * x0 + c)} x2={X(x1)} y2={Y(m * x1 + c)} stroke="var(--brand)" strokeWidth="3" />
        {/* slope triangle from x = 0 to x = 1: run 1, rise m */}
        <path d={`M${X(0)},${Y(c)} L${X(1)},${Y(c)} L${X(1)},${Y(c + m)}`} fill="none" stroke="var(--rev)" strokeWidth="2" strokeDasharray="4 3" />
        <text x={X(0.5)} y={Y(c) + 14} fontSize="10" textAnchor="middle" fill="var(--ink)">ไป 1</text>
        <text x={X(1) + 4} y={Y(c + m / 2)} fontSize="10" fill="var(--ink)">ขึ้น {m}</text>
        <circle cx={X(0)} cy={Y(c)} r="5" fill="var(--rev)" />
        {points.map(([px, py], i) => <circle key={i} cx={X(px)} cy={Y(py)} r="7" fill={on[i] ? 'var(--ok)' : 'var(--surface)'} stroke={on[i] ? 'var(--ok)' : 'var(--ink)'} strokeWidth="2" />)}
      </svg>
      <ul className="text-sm" aria-live="polite">
        {points.map(([px, py], i) => <li key={i}>{on[i] ? '✓' : '○'} จุด ({px}, {py}): แทน x = {px} ได้ y = {fmt(m * px + c)}</li>)}
      </ul>
      {done ? (
        <Feedback tone="good" title={`y = ${m}x + ${c} ผ่านทั้งสองจุด`}>m บอกว่า x เพิ่ม 1 แล้ว y เพิ่มเท่าไร ส่วน c คือจุดที่เส้นตัดแกน y (ตอน x = 0)</Feedback>
      ) : hits === 1 ? (
        <Feedback tone="try" title="ผ่านแล้วหนึ่งจุด">ถ้าเส้นชันไม่พอหรือชันเกิน ให้ปรับ m แล้วปรับ c ให้เส้นเลื่อนขึ้นลงตาม</Feedback>
      ) : (
        <p className="text-sm text-[var(--ink-2)]">ปรับ m และ c ให้เส้นผ่านทั้งสองจุดของโจทย์</p>
      )}
    </div>
  );
}

/* ── VISUAL_REASONING: which side is opposite / adjacent / hypotenuse ── */
type Side = 'opp' | 'adj' | 'hyp';
const SIDE_NAME: Record<Side, string> = { opp: 'ข้าม', adj: 'ชิด', hyp: 'ฉาก' };
export function TriangleSides({ opp, adj, hyp, onDone }: { opp: number; adj: number; hyp: number; onDone: () => void }) {
  const [label, setLabel] = useState<Record<string, Side | undefined>>({});
  const [checked, setChecked] = useState(false);
  const truth: Record<string, Side> = { right: 'opp', bottom: 'adj', slant: 'hyp' };
  const allOk = Object.keys(truth).every((k) => label[k] === truth[k]);
  const sides = [
    { k: 'bottom', len: adj, text: 'ด้านล่าง (ติดมุม θ)' },
    { k: 'right', len: opp, text: 'ด้านขวา (ตั้งตรง)' },
    { k: 'slant', len: hyp, text: 'ด้านเอียง' },
  ];
  return (
    <div data-testid="triangle-sides" className="space-y-3">
      <svg viewBox="0 0 260 170" className="w-full max-w-[380px]" role="img" aria-label={`สามเหลี่ยมมุมฉาก มุม θ อยู่มุมซ้ายล่าง ด้านล่างยาว ${adj} ด้านขวายาว ${opp} ด้านเอียงยาว ${hyp}`}>
        <polygon points="30,140 230,140 230,30" fill="var(--brand-soft)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="218" y="128" width="12" height="12" fill="none" stroke="var(--ink)" />
        <path d="M60,140 A30,30 0 0,0 56,126" fill="none" stroke="var(--rev)" strokeWidth="2" />
        <text x="66" y="132" fontSize="13" fill="var(--rev)">θ</text>
        <text x="130" y="160" fontSize="12" textAnchor="middle" fill="var(--ink)">{adj}{checked && label.bottom ? ` (${SIDE_NAME[label.bottom]})` : ''}</text>
        <text x="238" y="90" fontSize="12" fill="var(--ink)">{opp}{checked && label.right ? ` (${SIDE_NAME[label.right]})` : ''}</text>
        <text x="110" y="78" fontSize="12" textAnchor="middle" fill="var(--ink)">{hyp}{checked && label.slant ? ` (${SIDE_NAME[label.slant]})` : ''}</text>
      </svg>
      {sides.map((s) => (
        <div key={s.k} role="group" aria-label={`ป้ายของ${s.text}`} className="flex flex-wrap items-center gap-2">
          <span className="min-w-[10rem] text-sm">{s.text} = {s.len}</span>
          {(['opp', 'adj', 'hyp'] as Side[]).map((v) => (
            <button key={v} type="button" aria-pressed={label[s.k] === v} className={pick(label[s.k] === v)} onClick={() => { setLabel((l) => ({ ...l, [s.k]: v })); setChecked(false); }}>{SIDE_NAME[v]}</button>
          ))}
        </div>
      ))}
      <button type="button" className={PRIMARY} disabled={Object.values(label).filter(Boolean).length < 3} onClick={() => { setChecked(true); if (allOk) onDone(); }}>ตรวจป้าย</button>
      {checked && !allOk && <Feedback tone="try" title="ยังติดป้ายไม่ถูก">เริ่มจาก “ฉาก” ก่อน: ด้านตรงข้ามมุมฉาก (ยาวที่สุด) จากนั้นดูมุม θ — ด้านที่ไม่แตะมุม θ คือ “ข้าม” ด้านที่แตะมุม θ (ที่ไม่ใช่ฉาก) คือ “ชิด”</Feedback>}
      {checked && allOk && (
        <Feedback tone="good" title="ติดป้ายถูกทั้งหมด">
          sin θ = ข้าม/ฉาก = {opp}/{hyp} · cos θ = ชิด/ฉาก = {adj}/{hyp} · tan θ = ข้าม/ชิด = {opp}/{adj} — ป้ายขึ้นกับว่ามุมไหนคือ θ ถ้าเปลี่ยนมุม ข้ามกับชิดจะสลับกัน
        </Feedback>
      )}
    </div>
  );
}

/* ── PREDICT_OBSERVE_EXPLAIN: km/h → m/s ── */
export function UnitLadder({ value, onDone }: { value: number; onDone: () => void }) {
  const [guess, setGuess] = useState<null | 'bigger' | 'smaller'>(null);
  const [shown, setShown] = useState(0);
  const ms = value / 3.6;
  const steps = [
    `${value} km/h × (1000 m / 1 km) → ตัด km ออก เหลือ m/h = ${value * 1000} m/h`,
    `${value * 1000} m/h × (1 h / 3600 s) → ตัด h ออก เหลือ m/s`,
    `= ${value * 1000} / 3600 = ${fmt(ms)} m/s (เท่ากับ ${value} ÷ 3.6)`,
  ];
  return (
    <div data-testid="unit-ladder" className="space-y-3">
      <p className="text-sm font-semibold">ทายก่อน: {value} km/h เมื่อเขียนเป็น m/s ตัวเลขจะมากขึ้นหรือน้อยลง?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pick(guess === 'bigger')} aria-pressed={guess === 'bigger'} onClick={() => setGuess('bigger')}>มากกว่า {value}</button>
        <button type="button" className={pick(guess === 'smaller')} aria-pressed={guess === 'smaller'} onClick={() => setGuess('smaller')}>น้อยกว่า {value}</button>
      </div>
      {guess && (
        <>
          <ol className="space-y-2" aria-live="polite">
            {steps.slice(0, shown).map((s) => <li key={s} className="rounded-xl bg-[var(--surface-3)] px-3 py-2 font-mono text-sm break-words">{s}</li>)}
          </ol>
          {shown < steps.length ? (
            <button type="button" className={GHOST} onClick={() => { const n = shown + 1; setShown(n); if (n === steps.length) onDone(); }}>{shown === 0 ? 'เริ่มแปลงทีละตัวประกอบ' : 'ขั้นต่อไป'}</button>
          ) : (
            <Feedback tone={guess === 'smaller' ? 'good' : 'try'} title={guess === 'smaller' ? 'ทายถูก — ตัวเลขน้อยลง' : 'ผลจริง: ตัวเลขน้อยลง'}>
              1 วินาทีสั้นกว่า 1 ชั่วโมงมาก ในเวลาสั้นกว่าย่อมไปได้ระยะน้อยกว่า ตัวเลขใน m/s จึงน้อยกว่า — ถ้าคูณ 3.6 แทนการหาร คำตอบจะใหญ่ขึ้นผิดทาง
            </Feedback>
          )}
        </>
      )}
    </div>
  );
}

/* ── VARIABLE_EXPLORER: vector components ── */
export function VectorExplorer({ magnitude, angle, onDone }: { magnitude: number; angle: number; onDone: () => void }) {
  const [guess, setGuess] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'open' | 'right' | 'shown'>('open');
  const [A, setA] = useState(magnitude);
  const [th, setTh] = useState(angle);
  const target = magnitude * Math.cos((angle * Math.PI) / 180);
  const check = () => {
    const g = Number(guess);
    if (guess.trim() && Math.abs(g - target) <= 0.05) { setState('right'); onDone(); } else setTries((t) => t + 1);
  };
  const ax = A * Math.cos((th * Math.PI) / 180), ay = A * Math.sin((th * Math.PI) / 180);
  const S = 9, O = { x: 30, y: 190 };
  return (
    <div data-testid="vector-explorer" className="space-y-3">
      {state === 'open' && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <label htmlFor="vx" className="block text-sm font-semibold">ทายก่อน: แรง {magnitude} N ทำมุม {angle}° กับแนวราบ องค์ประกอบแนวราบ Fₓ ≈ กี่ N? (ทศนิยม 2 ตำแหน่ง)</label>
          <div className="flex flex-wrap gap-2">
            <input id="vx" inputMode="decimal" value={guess} onChange={(e) => setGuess(e.target.value)} className="min-h-[44px] w-28 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono" />
            <button type="submit" className={PRIMARY}>ตรวจ</button>
            {tries >= 2 && <button type="button" className={GHOST} onClick={() => { setState('shown'); onDone(); }}>ดูวิธีคิด</button>}
          </div>
          {tries > 0 && <Feedback tone="try" title="ยังไม่ตรง">แนวราบคือด้านที่ “ชิด” มุม → ใช้ cos: Fₓ = F cos θ (ถ้าได้ {fmt(magnitude * Math.sin((angle * Math.PI) / 180))} แสดงว่าใช้ sin สลับกัน)</Feedback>}
        </form>
      )}
      {state !== 'open' && <Feedback tone="good" title={`Fₓ = ${magnitude} cos ${angle}° ≈ ${fmt(target)} N`}>องค์ประกอบแนวราบใช้ cos เพราะอยู่ด้านชิดมุม ส่วนแนวดิ่งใช้ sin — ลองขยับขนาดและมุมด้านล่างแล้วดูว่าสองส่วนนี้เปลี่ยนอย่างไร</Feedback>}
      {state !== 'open' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Slider label="ขนาด A" unit="N" value={A} set={setA} min={1} max={18} />
            <Slider label="มุม θ" unit="°" value={th} set={setTh} min={0} max={90} step={5} />
          </div>
          <svg viewBox="0 0 220 210" className="w-full max-w-[320px]" role="img" aria-label={`เวกเตอร์ขนาด ${A} มุม ${th} องศา องค์ประกอบ x ≈ ${fmt(ax)} y ≈ ${fmt(ay)}`}>
            <line x1={O.x} y1={O.y} x2={O.x + 180} y2={O.y} stroke="var(--line)" />
            <line x1={O.x} y1={O.y} x2={O.x} y2={10} stroke="var(--line)" />
            <line x1={O.x} y1={O.y} x2={O.x + ax * S} y2={O.y} stroke="var(--phy)" strokeWidth="3" strokeDasharray="6 3" />
            <line x1={O.x + ax * S} y1={O.y} x2={O.x + ax * S} y2={O.y - ay * S} stroke="var(--rev)" strokeWidth="3" strokeDasharray="6 3" />
            <line x1={O.x} y1={O.y} x2={O.x + ax * S} y2={O.y - ay * S} stroke="var(--brand)" strokeWidth="4" />
            <text x={O.x + (ax * S) / 2} y={O.y + 14} fontSize="11" textAnchor="middle" fill="var(--ink)">Aₓ ≈ {fmt(ax)}</text>
            <text x={O.x + ax * S + 4} y={O.y - (ay * S) / 2} fontSize="11" fill="var(--ink)">Aᵧ ≈ {fmt(ay)}</text>
          </svg>
          <p className="font-mono text-sm" aria-live="polite">Aₓ = {A} cos {th}° ≈ {fmt(ax)} · Aᵧ = {A} sin {th}° ≈ {fmt(ay)}</p>
        </>
      )}
    </div>
  );
}

/* ── VARIABLE_EXPLORER + GRAPH_EXPLORER: constant acceleration ── */
export function MotionExplorer({ u, a, t, onDone }: { u: number; a: number; t: number; onDone: () => void }) {
  const [guess, setGuess] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'open' | 'done'>('open');
  const [U, setU] = useState(u);
  const [Acc, setAcc] = useState(a);
  const [T, setT] = useState(t);
  const want = u + a * t;
  const check = () => {
    if (guess.trim() && Math.abs(Number(guess) - want) < 1e-9) { setState('done'); onDone(); } else setTries((n) => n + 1);
  };
  const v = U + Acc * T, s = U * T + 0.5 * Acc * T * T;
  const W = 280, H = 170, vmax = 30, vmin = -10, tmax = 10;
  const X = (x: number) => 30 + (x / tmax) * (W - 40);
  const Y = (y: number) => H - 20 - ((y - vmin) / (vmax - vmin)) * (H - 30);
  const pts = Array.from({ length: 21 }, (_, i) => (i / 20) * T);
  return (
    <div data-testid="motion-explorer" className="space-y-3">
      {state === 'open' ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <label htmlFor="mv" className="block text-sm font-semibold">ทายก่อน: u = {u} m/s, a = {a} m/s², t = {t} s ความเร็วปลาย v = ? m/s</label>
          <div className="flex flex-wrap gap-2">
            <input id="mv" inputMode="decimal" value={guess} onChange={(e) => setGuess(e.target.value)} className="min-h-[44px] w-28 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono" />
            <button type="submit" className={PRIMARY}>ตรวจ</button>
            {tries >= 2 && <button type="button" className={GHOST} onClick={() => { setState('done'); onDone(); }}>ดูวิธีคิด</button>}
          </div>
          {tries > 0 && <Feedback tone="try" title="ยังไม่ตรง">ทุก 1 วินาที ความเร็วเพิ่มขึ้นเท่ากับ a — เริ่มจาก u แล้วบวก a ไปทีละวินาที (v = u + at)</Feedback>}
        </form>
      ) : (
        <Feedback tone="good" title={`v = u + at = ${u} + ${a}(${t}) = ${want} m/s`}>ความเร่งบอกว่าความเร็วเพิ่มวินาทีละเท่าไร ลองปรับค่าด้านล่างแล้วดูความชันและพื้นที่ใต้กราฟ v–t</Feedback>
      )}
      {state === 'done' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Slider label="u" unit="m/s" value={U} set={setU} min={0} max={20} />
            <Slider label="a" unit="m/s²" value={Acc} set={setAcc} min={-4} max={4} />
            <Slider label="t" unit="s" value={T} set={setT} min={1} max={10} />
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[440px]" role="img" aria-label={`กราฟความเร็ว-เวลา: จาก ${U} ถึง ${fmt(v)} m/s ใน ${T} s ความชัน ${Acc} พื้นที่ใต้กราฟ ${fmt(s)} m`}>
            <line x1={X(0)} y1={Y(0)} x2={X(tmax)} y2={Y(0)} stroke="var(--ink-3)" />
            <line x1={X(0)} y1={Y(vmin)} x2={X(0)} y2={Y(vmax)} stroke="var(--ink-3)" />
            <path d={`M${X(0)},${Y(0)} ${pts.map((x) => `L${X(x)},${Y(U + Acc * x)}`).join(' ')} L${X(T)},${Y(0)} Z`} fill="var(--phy-soft)" stroke="none" />
            <polyline points={pts.map((x) => `${X(x)},${Y(U + Acc * x)}`).join(' ')} fill="none" stroke="var(--phy)" strokeWidth="3" />
            <text x={X(T)} y={Y(Math.max(0, v)) - 6} fontSize="10" textAnchor="end" fill="var(--ink)">v ≈ {fmt(v)}</text>
            <text x={X(tmax)} y={Y(0) + 14} fontSize="10" textAnchor="end" fill="var(--ink-2)">t (s)</text>
            <text x={X(0) + 4} y={Y(vmax) + 10} fontSize="10" fill="var(--ink-2)">v (m/s)</text>
          </svg>
          <ul className="space-y-1 font-mono text-sm" aria-live="polite">
            <li>v = u + at = {U} + {Acc}({T}) = {fmt(v)} m/s ← ความชันของกราฟคือ a = {Acc}</li>
            <li>s = ut + ½at² = {U}({T}) + ½({Acc})({T})² = {fmt(s)} m ← พื้นที่ใต้กราฟ</li>
          </ul>
          {v < 0 && <p className="text-sm text-[var(--ink-2)]">v ติดลบ: วัตถุหยุดแล้วเคลื่อนกลับทิศ — สมการใช้ได้ตราบที่ a คงตัว</p>}
        </>
      )}
    </div>
  );
}

/* ── CODE_TRACE (+ predict output) ── */
export function CodeTrace({ data, mode, onDone }: { data: CodeTraceData; mode: 'memory' | 'loop' | 'io' | 'call'; onDone: () => void }) {
  const steps = data.steps;
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState('');
  const [predicted, setPredicted] = useState<null | boolean>(null);
  const [done, setDone] = useState(false);
  const st = steps[i];
  const lines = data.code.split('\n');
  const isEnd = st.event === 'end';
  const prev = i > 0 ? steps[i - 1].vars : {};
  const norm = (s: string) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  const expected = data.error ? data.error.split(':')[0] : data.output;
  const go = (n: number) => {
    const k = Math.max(0, Math.min(steps.length - 1, n));
    setI(k);
    if (steps[k].event === 'end' && predicted !== null && !done) { setDone(true); onDone(); }
  };
  const where = st.func === '<module>' ? 'โปรแกรมหลัก' : `ในฟังก์ชัน ${st.func}(${Object.entries(st.vars).map(([k, v]) => `${k}=${v}`).join(', ')})`;
  return (
    <div data-testid="code-trace-pattern" className="space-y-3">
      {predicted === null && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (guess.trim()) setPredicted(norm(guess) === norm(expected)); }}>
          <label htmlFor="ct-guess" className="block text-sm font-semibold">ทายก่อน: โปรแกรมนี้จะแสดงอะไร{data.error ? ' (หรือเกิดข้อผิดพลาดชนิดใด)' : ''}?{data.stdin ? ` ผู้ใช้พิมพ์ “${data.stdin.trim()}”` : ''}</label>
          <textarea id="ct-guess" rows={2} value={guess} onChange={(e) => setGuess(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono" style={CODE} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={PRIMARY}>ส่งคำทาย</button>
            <button type="button" className={GHOST} onClick={() => setPredicted(false)}>ไม่แน่ใจ — ไล่ดูเลย</button>
          </div>
        </form>
      )}
      {predicted !== null && (
        <>
          <pre style={CODE} className="overflow-x-auto rounded-2xl bg-[#0f172a] p-3 font-mono text-[13px] leading-6 text-slate-100" aria-label="โค้ด — บรรทัดที่กำลังทำงานถูกเน้น">
            {lines.map((l, n) => (
              <div key={n} className={`flex gap-3 rounded px-1 ${!isEnd && st.line === n + 1 ? 'bg-white/20' : ''}`}>
                <span className="select-none text-slate-500">{n + 1}</span>
                <span className="whitespace-pre">{l || ' '}</span>
                {!isEnd && st.line === n + 1 && <span className="text-sky-300">◀ {st.event === 'call' ? 'เข้าไปในฟังก์ชัน' : st.event === 'return' ? `return ${st.ret}` : st.event === 'input' ? `ผู้ใช้พิมพ์ “${st.typed}”` : 'กำลังจะทำบรรทัดนี้'}</span>}
              </div>
            ))}
          </pre>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className={GHOST} onClick={() => go(i - 1)} disabled={i === 0}><ChevronLeft className="h-4 w-4" /> ก่อนหน้า</button>
            <span className="text-xs text-[var(--ink-3)]" aria-live="polite">ขั้น {i + 1}/{steps.length}</span>
            <button type="button" className={PRIMARY} onClick={() => go(i + 1)} disabled={i === steps.length - 1}>ถัดไป <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] p-3" aria-live="polite">
              <p className="text-xs font-semibold text-[var(--ink-3)]">หน่วยความจำ · {where}</p>
              <table className="mt-1 w-full font-mono text-sm">
                <tbody>
                  {Object.entries(st.vars).length === 0 && <tr><td className="text-[var(--ink-3)]">ยังไม่มีตัวแปร</td></tr>}
                  {Object.entries(st.vars).map(([k, v]) => (
                    <tr key={k} className={prev[k] !== v ? 'bg-[var(--rev-soft)]' : ''}><td className="pr-3 font-semibold">{k}</td><td className="break-all">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-3)] p-3 font-mono text-sm" role="status">
              <p className="text-xs font-semibold text-[var(--ink-3)]">ผลลัพธ์ที่แสดง</p>
              <pre className="whitespace-pre-wrap break-words" style={CODE}>{st.out}</pre>
              {isEnd && st.error && <p className="mt-1 text-[var(--err)]">{st.error}</p>}
            </div>
          </div>
          {mode === 'loop' && i > 0 && (() => {
            // the distinct states so far (a new row only when some value changed)
            const rows: Record<string, string>[] = [];
            for (const x of steps.slice(0, i + 1)) {
              if (x.event === 'end' || Object.keys(x.vars).length === 0) continue;
              const last = rows[rows.length - 1];
              if (!last || Object.keys(x.vars).some((key) => last[key] !== x.vars[key])) rows.push(x.vars);
            }
            const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
            return (
              <div className="overflow-x-auto" data-testid="loop-history">
                <table className="w-full text-left font-mono text-sm">
                  <caption className="text-left text-xs font-semibold text-[var(--ink-3)]">ค่าตัวแปรที่เปลี่ยนไปทีละครั้ง (ถึงขั้นนี้)</caption>
                  <thead><tr>{keys.map((key) => <th key={key} className="pr-4">{key}</th>)}</tr></thead>
                  <tbody>{rows.map((r, n) => <tr key={n} className="border-t border-[var(--line)]">{keys.map((key) => <td key={key} className="pr-4">{r[key] ?? '–'}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          })()}
          {isEnd && (
            <Feedback tone={predicted ? 'good' : 'try'} title={predicted ? 'ทายถูก' : 'ผลจริงตามที่ Python ทำ'}>
              {data.error ? `Python หยุดที่ ${data.error.split(':')[0]} — ${data.error}` : 'ผลลัพธ์มาจากการทำทีละบรรทัดตามลำดับ ตัวแปรที่ถูกไฮไลต์คือค่าที่เพิ่งเปลี่ยน'}
            </Feedback>
          )}
        </>
      )}
    </div>
  );
}

/* ── Game slot (Codex games are separate; never faked) ── */
export function GameSlot({ status }: { status: 'NOT_AVAILABLE' | 'AVAILABLE' | 'LOADING' | 'COMPLETED' | 'ERROR' }) {
  return (
    <div data-testid="game-slot" data-status={status} className="rounded-2xl border border-dashed border-[var(--line)] p-3 text-sm text-[var(--ink-2)]">
      <p className="font-semibold text-ink">ลองฝึกแบบเกม</p>
      <p>{status === 'NOT_AVAILABLE' ? 'ยังไม่มีเกมสำหรับบทนี้ — การเรียนและเช็กความเข้าใจทำได้ครบโดยไม่ต้องใช้เกม' : status}</p>
    </div>
  );
}
