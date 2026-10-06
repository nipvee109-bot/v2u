import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Feedback } from '../Questions';
import { labOutput } from '../../../interactive/engine';
import type { LabInteraction, StepResult } from '../../../interactive/types';
import { runBranches, swapFirstTwoBranches, withValue } from '../../../interactive/studio/branchRunner';
import type { BranchRun } from '../../../interactive/studio/branchRunner';

/* Teaching widgets (Phase 64). Every animation explains something,
   and every one finishes instantly under prefers-reduced-motion. */

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50';
const PRIMARY = `${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-hi)]`;
const GHOST = `${BTN} border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-3)]`;

/* ── Math: balance ─────────────────────────────────────────────────── */

/** Parse "ax + b = c" (the authored step's equation). */
function parseLinear(s: string): { a: number; b: number; c: number } | undefined {
  const m = s.replace(/\s+/g, '').match(/^(\d*)x([+−-])(\d+)=(\d+)$/);
  if (!m) return undefined;
  const a = m[1] ? Number(m[1]) : 1;
  const b = (m[2] === '+' ? 1 : -1) * Number(m[3]);
  return { a, b, c: Number(m[4]) };
}

export function BalanceWidget({ equation, solved, onSolved }: { equation: string; solved: boolean; onSolved: () => void }) {
  const eq = parseLinear(equation);
  const [stage, setStage] = useState(solved ? 2 : 0);
  const [tilt, setTilt] = useState(0);
  const [msg, setMsg] = useState<{ tone: 'good' | 'try'; text: string } | null>(null);
  if (!eq) return null;
  const { a, b, c } = eq;
  const sign = b >= 0 ? '+' : '−';
  const absB = Math.abs(b);
  const rhs1 = c - b;
  const x = rhs1 / a;
  const left = stage === 0 ? `${a === 1 ? '' : a}x ${sign} ${absB}` : stage === 1 ? `${a === 1 ? '' : a}x` : 'x';
  const right = stage === 0 ? `${c}` : stage === 1 ? `${rhs1}` : `${x}`;
  const lines = [equation, ...(stage >= 1 ? [`${a === 1 ? '' : a}x = ${c} ${b >= 0 ? '−' : '+'} ${absB} = ${rhs1}`] : []), ...(stage >= 2 ? [`x = ${rhs1} ÷ ${a} = ${x}`, `ตรวจ: ${a}(${x}) ${sign} ${absB} = ${c} ✓`] : [])];
  const act = (move: 'both-b' | 'left-b' | 'both-a' | 'left-a') => {
    if (stage === 2) return;
    if (move === 'left-b' || move === 'left-a') {
      setTilt(move === 'left-b' ? 1 : -1);
      setMsg({ tone: 'try', text: 'เกือบถูกแล้ว — แต่ตาชั่งเอียงทันที เพราะสองฝั่งไม่เท่ากันแล้ว ทำอะไรกับฝั่งหนึ่ง ต้องทำแบบเดียวกันกับอีกฝั่งเสมอ' });
      return;
    }
    setTilt(0);
    if (move === 'both-b') {
      if (stage !== 0) return;
      setStage(1);
      setMsg({ tone: 'good', text: `ใช่เลย ${sign}${absB} หายไปจากฝั่งซ้าย และตาชั่งยังสมดุล เพราะเอาออกเท่ากันทั้งสองฝั่ง` });
    } else if (stage === 0) {
      setMsg({ tone: 'try', text: `หารได้ แต่ ${sign}${absB} ยังติดอยู่กับ x — เอา ${absB} ออกก่อนจะเหลือแค่ ${a}x ให้หารง่ายกว่า` });
    } else {
      setStage(2);
      setMsg({ tone: 'good', text: `x อยู่คนเดียวแล้ว: x = ${x} ลองแทนกลับดู สองฝั่งเท่ากันจริง` });
      if (!solved) onSolved();
    }
  };
  return (
    <div data-testid="balance">
      <svg viewBox="0 0 320 170" role="img" aria-label={`ตาชั่ง: ซ้าย ${left} ขวา ${right}${tilt ? ' — ตาชั่งเอียง ไม่สมดุล' : ' — สมดุล'}`} className="mx-auto block w-full max-w-[420px]">
        <polygon points="160,150 145,170 175,170" fill="var(--ink-3)" />
        <line x1="160" y1="70" x2="160" y2="150" stroke="var(--ink-3)" strokeWidth="4" />
        <g style={{ transform: `rotate(${tilt * 8}deg)`, transformOrigin: '160px 70px', transition: 'transform 400ms' }} className="motion-reduce:!transition-none">
          <line x1="40" y1="70" x2="280" y2="70" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
          <rect x="10" y="80" width="120" height="44" rx="10" fill="var(--brand-soft)" stroke="var(--brand)" />
          <text x="70" y="108" textAnchor="middle" className="font-mono" fontSize="18" fontWeight="700" fill="var(--ink)">{left}</text>
          <rect x="190" y="80" width="120" height="44" rx="10" fill="var(--surface-3)" stroke="var(--line)" />
          <text x="250" y="108" textAnchor="middle" className="font-mono" fontSize="18" fontWeight="700" fill="var(--ink)">{right}</text>
        </g>
        <text x="160" y="40" textAnchor="middle" fontSize="13" fill={tilt ? 'var(--err)' : 'var(--ok)'} fontWeight="700">{tilt ? 'ไม่สมดุล ✗' : 'สมดุล ✓'}</text>
      </svg>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" className={GHOST} disabled={stage !== 0} onClick={() => act('both-b')}>{b >= 0 ? 'ลบ' : 'บวก'} {absB} ทั้งสองฝั่ง</button>
        <button type="button" className={GHOST} disabled={stage !== 0} onClick={() => act('left-b')}>{b >= 0 ? 'ลบ' : 'บวก'} {absB} เฉพาะฝั่งซ้าย</button>
        <button type="button" className={GHOST} disabled={stage === 2} onClick={() => act('both-a')}>หารด้วย {a} ทั้งสองฝั่ง</button>
        <button type="button" className={GHOST} disabled={stage === 2} onClick={() => act('left-a')}>หารด้วย {a} เฉพาะฝั่งซ้าย</button>
      </div>
      <div className="mt-3 rounded-2xl bg-[var(--surface-3)] px-4 py-3 font-mono text-[15px]" aria-label="สิ่งที่คุณทำ เขียนเป็นสมการ">
        {lines.map((l) => <p key={l} className="break-words">{l}</p>)}
      </div>
      {msg && <Feedback tone={msg.tone} title={msg.tone === 'good' ? 'ดีมาก' : 'ลองดูอีกนิด'}>{msg.text}</Feedback>}
      {tilt !== 0 && <button type="button" className={`${GHOST} mt-2`} onClick={() => { setTilt(0); setMsg(null); }}><RotateCcw className="h-4 w-4" /> ปรับตาชั่งกลับ</button>}
    </div>
  );
}

/* ── Physics: cart lab ─────────────────────────────────────────────── */

interface Run { F: number; m: number; a: number }

export function CartLab({ lab, vary, result, onAnswer }: { lab: LabInteraction; vary: 'force' | 'mass'; result: StepResult; onAnswer: (correct: boolean) => void }) {
  const varied = vary === 'force' ? 'F' : 'm';
  const fixed = vary === 'force' ? 'm' : 'F';
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(lab.variables.map((v) => [v.id, v.initial])));
  const [guess, setGuess] = useState<number | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [pos, setPos] = useState(0);
  const [running, setRunning] = useState(false);
  const [answered, setAnswered] = useState<number | null>(result.solved ? lab.question.correctIndex : null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const q = lab.question;
  const maxA = Math.max(...lab.variables.filter((v) => v.id === 'F').map((v) => v.max)) / Math.max(1, Math.min(...lab.variables.filter((v) => v.id === 'm').map((v) => v.min)));
  const fair = runs.length >= 2 && new Set(runs.map((r) => r[fixed])).size === 1 && new Set(runs.map((r) => r[varied])).size >= 2;
  const run = () => {
    const a = labOutput(lab, values);
    const target = Math.min(1, a / maxA);
    setRuns((r) => [...r.slice(-3), { F: values.F, m: values.m, a }]);
    if (reducedMotion()) { setPos(target); return; }
    setRunning(true);
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 2000);
      setPos(target * k * k); // s = ½at² — distance grows with t²
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const decide = (i: number) => {
    setAnswered(i);
    onAnswer(i === q.correctIndex);
  };
  return (
    <div data-testid="cart-lab" className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">1 · ทายก่อน: {q.prompt}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {q.choices.map((c, i) => (
            <button key={c} type="button" aria-pressed={guess === i} disabled={answered !== null} onClick={() => setGuess(i)} className={`${BTN} border ${guess === i ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'border-[var(--line)]'}`}>{c}</button>
          ))}
        </div>
      </fieldset>
      {guess !== null && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">2 · ทดลอง: เปลี่ยนเฉพาะ{vary === 'force' ? 'แรง' : 'มวล'} แล้วกด ปล่อยรถ อย่างน้อย 2 ครั้ง</p>
          <div className="relative h-20 overflow-hidden rounded-2xl border border-[var(--line)]" style={{ background: 'repeating-linear-gradient(90deg, var(--surface-3) 0 1px, transparent 1px 32px)' }} aria-hidden="true">
            <div className="absolute bottom-3 left-0 right-0 h-0.5 bg-[var(--ink-3)]" />
            <div className="absolute bottom-4" style={{ left: `calc(${pos * 100}% * 0.8 + 4px)` }}>
              <svg width="56" height="40" viewBox="0 0 56 40"><rect x="2" y="6" width="52" height="22" rx="4" fill="var(--brand)" /><text x="28" y="22" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">{values.m} kg</text><circle cx="14" cy="32" r="6" fill="var(--ink)" /><circle cx="42" cy="32" r="6" fill="var(--ink)" /></svg>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {lab.variables.map((v) => (
              <label key={v.id} className="block text-sm">
                <span className="flex justify-between font-medium text-[var(--ink-2)]"><span>{v.label}{v.id === fixed && ' (คงไว้)'}</span><span className="font-mono text-ink">{values[v.id]} {v.unit}</span></span>
                <input type="range" min={v.min} max={v.max} step={v.step} value={values[v.id]} onChange={(e) => setValues((s) => ({ ...s, [v.id]: Number(e.target.value) }))} className="mt-1 h-11 w-full accent-[var(--brand)]" aria-label={`${v.label} (${v.unit})`} />
              </label>
            ))}
          </div>
          <button type="button" className={PRIMARY} onClick={run} disabled={running}><Play className="h-4 w-4" /> ปล่อยรถ</button>
          {runs.length > 0 && (
            <table className="w-full text-left text-sm" aria-label="ผลการทดลอง">
              <thead><tr className="text-[var(--ink-3)]"><th className="py-1">ครั้ง</th><th>แรง (N)</th><th>มวล (kg)</th><th>{lab.output.label} ({lab.output.unit})</th></tr></thead>
              <tbody className="font-mono">{runs.map((r, i) => <tr key={i} className="border-t border-[var(--line)]"><td className="py-1">{i + 1}</td><td>{r.F}</td><td>{r.m}</td><td>{Number(r.a.toFixed(2))}</td></tr>)}</tbody>
            </table>
          )}
          {runs.length >= 2 && !fair && <p role="status" className="text-sm text-[var(--ink-2)]">การทดลองที่ยุติธรรมต้องเปลี่ยนแค่อย่างเดียว — ลองคง{vary === 'force' ? 'มวล' : 'แรง'}ไว้ แล้วเปลี่ยนแค่{vary === 'force' ? 'แรง' : 'มวล'}</p>}
        </div>
      )}
      {fair && (
        <fieldset>
          <legend className="text-sm font-semibold text-ink">3 · ดูตารางแล้วตอบ: {q.prompt}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.choices.map((c, i) => (
              <button key={c} type="button" disabled={result.solved} aria-pressed={answered === i} onClick={() => decide(i)} className={`${BTN} border ${answered === i ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)]'}`}>{c}</button>
            ))}
          </div>
          {result.solved && <Feedback tone="good" title={guess === q.correctIndex ? 'ทายถูกตั้งแต่แรก' : 'ตอนนี้ตรงกับผลทดลองแล้ว'}>{q.explanation}</Feedback>}
          {answered !== null && !result.solved && <Feedback tone="try" title="เกือบถูกแล้ว — ดูตัวเลขในตารางอีกที">{q.hint}</Feedback>}
        </fieldset>
      )}
    </div>
  );
}

/* ── Programming: robot ────────────────────────────────────────────── */

const doorsOf = (code: string) => [...code.matchAll(/print\("(.*)"\)/g)].map((m) => m[1]);

function Robot({ doors, at }: { doors: string[]; at: number | null }) {
  const w = 300, gap = w / doors.length;
  const x = at === null ? w / 2 : gap * at + gap / 2;
  return (
    <svg viewBox={`0 0 ${w} 120`} className="w-full max-w-[420px]" role="img" aria-label={at === null ? 'หุ่นยืนรอคำสั่ง' : `หุ่นเดินเข้าประตู ${doors[at] ?? '-'}`} style={{ imageRendering: 'pixelated' }}>
      {doors.map((d, i) => (
        <g key={d}>
          <rect x={gap * i + gap / 2 - 26} y="8" width="52" height="46" fill={at === i ? 'var(--ok-soft)' : 'var(--surface-3)'} stroke={at === i ? 'var(--ok)' : 'var(--line)'} strokeWidth="3" />
          <text x={gap * i + gap / 2} y="38" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)" className="font-mono">{d}</text>
        </g>
      ))}
      <g style={{ transform: `translate(${x - 14}px, ${at === null ? 72 : 60}px)`, transition: 'transform 500ms steps(5)' }} className="motion-reduce:!transition-none">
        <rect x="4" y="0" width="20" height="16" fill="var(--brand)" /><rect x="8" y="5" width="4" height="4" fill="#fff" /><rect x="16" y="5" width="4" height="4" fill="#fff" />
        <rect x="0" y="18" width="28" height="18" fill="var(--brand)" /><rect x="4" y="38" width="6" height="8" fill="var(--ink)" /><rect x="18" y="38" width="6" height="8" fill="var(--ink)" />
      </g>
    </svg>
  );
}

function useTrace() {
  const [trace, setTrace] = useState<{ run: BranchRun; shown: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);
  const start = (run: BranchRun, done?: () => void) => {
    clearInterval(timer.current);
    if (reducedMotion()) { setTrace({ run, shown: run.steps.length }); done?.(); return; }
    setTrace({ run, shown: 1 });
    let n = 1;
    timer.current = setInterval(() => {
      n++;
      setTrace({ run, shown: Math.min(n, run.steps.length) });
      if (n >= run.steps.length) { clearInterval(timer.current); done?.(); }
    }, 550);
  };
  const reset = () => { clearInterval(timer.current); setTrace(null); };
  return { trace, start, reset, finished: !!trace && trace.shown >= trace.run.steps.length };
}

function CodeTrace({ code, trace }: { code: string; trace: { run: BranchRun; shown: number } | null }) {
  const shown = trace ? trace.run.steps.slice(0, trace.shown) : [];
  const current = shown[shown.length - 1]?.line;
  const notes = new Map(shown.map((s) => [s.line, s]));
  return (
    <pre style={{ fontVariantLigatures: "none" }} className="overflow-x-auto rounded-2xl bg-[#0f172a] p-3 font-mono text-[13px] leading-6 text-slate-100" aria-label="โค้ดและการทำงานทีละบรรทัด" data-testid="code-trace">
      {code.split('\n').map((l, i) => {
        const s = notes.get(i);
        return (
          <div key={i} className={`flex flex-wrap gap-x-3 rounded px-1 ${i === current ? 'bg-white/15' : ''}`}>
            <span className="text-slate-500 select-none">{i + 1}</span>
            <span className="whitespace-pre">{l}</span>
            {s && <span className={s.value === true ? 'text-emerald-300' : s.value === false ? 'text-rose-300' : s.kind === 'skip' ? 'text-slate-400' : 'text-sky-300'}>{s.value === true ? '✓ ' : s.value === false ? '✗ ' : ''}{s.note}</span>}
          </div>
        );
      })}
    </pre>
  );
}

/** What Python holds and is checking right now: memory, then the current condition
    as written → with values substituted → True/False (text marks, not colour alone). */
function StatePanel({ trace }: { trace: { run: BranchRun; shown: number } | null }) {
  const shown = trace ? trace.run.steps.slice(0, trace.shown) : [];
  const memory = shown.filter((s) => s.kind === 'assign').map((s) => s.note);
  const cur = shown[shown.length - 1];
  return (
    <div data-testid="robot-state" role="group" aria-label="สิ่งที่ Python กำลังคิด" className="grid gap-3 rounded-2xl border border-[var(--line)] px-3 py-2 text-sm sm:grid-cols-[minmax(7rem,auto)_1fr]">
      <div>
        <p className="text-xs font-semibold text-[var(--ink-3)]">หน่วยความจำ</p>
        {memory.length ? memory.map((v) => <p key={v} className="font-mono text-ink">{v}</p>) : <p className="text-[var(--ink-3)]">ยังว่าง — กด Run</p>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--ink-3)]">{cur ? `บรรทัดที่ ${cur.line + 1}` : 'Python กำลังทำ'}</p>
        {cur?.kind === 'test' ? (
          <p className="flex flex-wrap items-center gap-x-2 font-mono text-ink">
            <span>{cur.source}</span>
            <span aria-label="แทนค่าได้">→</span>
            <span>{cur.note.split(' → ')[0]}</span>
            <span aria-label="ผลคือ">→</span>
            <span className={`font-semibold ${cur.value ? 'text-[var(--ok)]' : 'text-[var(--err)]'}`}>{cur.value ? 'True ✓ ทำทางนี้' : 'False ✗ ข้ามทางนี้'}</span>
          </p>
        ) : (
          <p className="break-words text-ink">{cur ? cur.note : '—'}</p>
        )}
      </div>
    </div>
  );
}

function Console({ out }: { out: string | null }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-3)] px-3 py-2 font-mono text-sm" role="status" aria-live="polite" data-testid="console">
      <span className="text-[var(--ink-3)]">ผลลัพธ์ &gt; </span>{out ?? ''}
    </div>
  );
}

export function RobotRun({ code, values, onDone }: { code: string; values: number[]; onDone: () => void }) {
  const { trace, start, finished } = useTrace();
  const [value, setValue] = useState(values[0]);
  const [seen, setSeen] = useState<number[]>([]);
  const seenRef = useRef<number[]>([]);
  const prog = withValue(code, value);
  const doors = doorsOf(code);
  const varName = code.match(/^(\w+)\s*=/)?.[1] ?? 'x';
  const go = () => {
    start(runBranches(prog), () => {
      // Parent update (onDone) must not run inside a state updater
      const next = seenRef.current.includes(value) ? seenRef.current : [...seenRef.current, value];
      seenRef.current = next;
      setSeen(next);
      if (next.length >= 2) onDone();
    });
  };
  return (
    <div className="space-y-3" data-testid="robot-run">
      <div role="group" aria-label={`เลือกค่า ${varName}`} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--ink-2)] font-mono">{varName} =</span>
        {values.map((v) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => setValue(v)} className={`${BTN} min-w-[56px] border font-mono ${value === v ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'border-[var(--line)]'}`}>{v}</button>
        ))}
        <button type="button" className={PRIMARY} onClick={go}><Play className="h-4 w-4" /> Run</button>
      </div>
      <CodeTrace code={prog} trace={trace} />
      <StatePanel trace={trace} />
      <Robot doors={doors} at={finished && trace ? trace.run.branch : null} />
      <Console out={finished && trace ? trace.run.output : null} />
      {finished && trace && <Feedback tone="good" title={`หุ่นเข้าประตู “${trace.run.output}”`}>เงื่อนไขบรรทัดที่ {trace.run.decidedAt + 1} เป็นจริงก่อน Python จึงทำทางนั้นทางเดียว {seen.length < 2 ? 'ลองเปลี่ยนค่าแล้ว Run อีกครั้ง' : ''}</Feedback>}
    </div>
  );
}

export function RobotDebug({ code, explanation, onDone }: { code: string; explanation: string; onDone: () => void }) {
  const { trace, start, reset, finished } = useTrace();
  const [fixed, setFixed] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const prog = fixed ? swapFirstTwoBranches(code) : code;
  const doors = doorsOf(code);
  const condLines = code.split('\n').map((l, i) => ({ l, i })).filter(({ l }) => /^(if|elif)\s/.test(l));
  const buggy = runBranches(code);
  const ok = pick === buggy.decidedAt;
  return (
    <div className="space-y-3" data-testid="robot-debug">
      <button type="button" className={PRIMARY} onClick={() => start(runBranches(prog), fixed ? onDone : undefined)}><Play className="h-4 w-4" /> Run</button>
      <CodeTrace code={prog} trace={trace} />
      <StatePanel trace={trace} />
      <Robot doors={doors} at={finished && trace ? trace.run.branch : null} />
      <Console out={finished && trace ? trace.run.output : null} />
      {finished && !fixed && (
        <fieldset>
          <legend className="text-sm font-semibold text-ink">บรรทัดไหนทำให้ได้ “{buggy.output}”?</legend>
          <div className="mt-2 grid gap-2">
            {condLines.map(({ l, i }) => (
              <button key={i} type="button" aria-pressed={pick === i} onClick={() => setPick(i)} className={`${BTN} justify-start border font-mono ${pick === i ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)]'}`}>บรรทัด {i + 1}: {l}</button>
            ))}
          </div>
          {pick !== null && !ok && <Feedback tone="try" title="เกือบถูกแล้ว">ดูเครื่องหมาย ✓ ในโค้ด — บรรทัดนี้ Python ข้ามไป เพราะมีเงื่อนไขก่อนหน้าที่จริงแล้ว</Feedback>}
          {ok && (
            <>
              <Feedback tone="good" title="เจอจุดแล้ว">{explanation}</Feedback>
              <button type="button" className={`${PRIMARY} mt-3`} onClick={() => { setFixed(true); reset(); }}>สลับลำดับเงื่อนไข</button>
            </>
          )}
        </fieldset>
      )}
      {fixed && finished && trace?.run.output !== buggy.output && <Feedback tone="good" title={`ตอนนี้ได้ “${trace?.run.output}” แล้ว`}>ลำดับเงื่อนไขมีผล: Python ทำเฉพาะทางแรกที่เงื่อนไขจริง</Feedback>}
      {fixed && !trace && <p className="text-sm text-[var(--ink-2)]">แก้แล้ว — กด Run อีกครั้งเพื่อดูผล</p>}
    </div>
  );
}
