import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Feedback } from '../Questions';
import type { MotionInteraction } from '../../../interactive/types';
import { KIN_EQUATIONS, fmt, judgeGoal, judgePrediction, marksUntil, motionAt, spacings, usableEquations } from '../../../interactive/mechanics/kinematics';
import type { KinVar, MotionState } from '../../../interactive/mechanics/kinematics';
import { MechanicFooter } from './shared';
import { GHOST, PICK, PRIMARY, reducedMotion } from './ui';
import type { MechanicProps } from './ui';

/* Motion Over Time (phy-kin-1d). The car really moves; a mark is left every second; the v–t graph
   draws in step. The learner predicts BEFORE running and compares the prediction with where the car really is. */

const SEC_MS = 650;

function Track({ marks, carX, trackMax, pin, goalX, goalLabel }: { marks: MotionState[]; carX: number; trackMax: number; pin?: number | null; goalX?: number; goalLabel?: string }) {
  const W = 340, L = 16, R = W - 16;
  const X = (x: number) => L + (Math.min(Math.max(x, 0), trackMax) / trackMax) * (R - L);
  const ticks = Array.from({ length: 6 }, (_, i) => (trackMax / 5) * i);
  return (
    <svg viewBox={`0 0 ${W} 110`} className="block w-full" role="img" aria-label={`ราง: รถอยู่ที่ ${fmt(carX)} m · รอยที่ ${marks.map((m) => `t=${m.t} s ${fmt(m.x)} m`).join(', ')}${pin != null ? ` · หมุดที่คุณคาด ${fmt(pin)} m` : ''}`} data-testid="motion-track">
      <line x1={L} y1="70" x2={R} y2="70" stroke="var(--ink-3)" strokeWidth="2" />
      {ticks.map((t) => (
        <g key={t}><line x1={X(t)} y1="66" x2={X(t)} y2="74" stroke="var(--ink-3)" /><text x={X(t)} y="104" fontSize="10" textAnchor="middle" fill="var(--ink-2)">{fmt(t)} m</text></g>
      ))}
      {goalX !== undefined && (
        <g><line x1={X(goalX)} y1="20" x2={X(goalX)} y2="74" stroke="var(--rev)" strokeWidth="2" strokeDasharray="4 3" /><text x={X(goalX)} y="16" fontSize="10" textAnchor="middle" fill="var(--rev)">{goalLabel}</text></g>
      )}
      {marks.map((m) => (
        <g key={m.t}><circle cx={X(m.x)} cy="70" r="4" fill="var(--phy)" /><text x={X(m.x)} y="88" fontSize="9" textAnchor="middle" fill="var(--ink)">t={m.t}</text></g>
      ))}
      {pin != null && (
        <g><line x1={X(pin)} y1="30" x2={X(pin)} y2="70" stroke="var(--brand)" strokeWidth="2" /><circle cx={X(pin)} cy="30" r="5" fill="var(--brand)" /><text x={X(pin)} y="22" fontSize="9" textAnchor="middle" fill="var(--brand-ink)">คุณคาด</text></g>
      )}
      <g style={{ transform: `translateX(${X(carX) - 14}px)` }}>
        <rect x="0" y="46" width="28" height="14" rx="3" fill="var(--phy)" /><circle cx="7" cy="62" r="4" fill="var(--ink)" /><circle cx="21" cy="62" r="4" fill="var(--ink)" />
      </g>
    </svg>
  );
}

function VtGraph({ u, a, tNow, tMax }: { u: number; a: number; tNow: number; tMax: number }) {
  const W = 340, H = 120, vMax = Math.max(4, ...Array.from({ length: Math.ceil(tMax) + 1 }, (_, t) => motionAt(u, a, t).v)) * 1.15;
  const X = (t: number) => 30 + (t / tMax) * (W - 40);
  const Y = (v: number) => H - 18 - (v / vMax) * (H - 30);
  const pts = Array.from({ length: 41 }, (_, i) => (i / 40) * tNow).map((t) => motionAt(u, a, t));
  const area = `M${X(0)},${Y(0)} ${pts.map((p) => `L${X(p.t)},${Y(p.v)}`).join(' ')} L${X(tNow)},${Y(0)} Z`;
  const now = motionAt(u, a, tNow);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`กราฟความเร็ว–เวลา ถึง t = ${fmt(tNow)} s: v = ${fmt(now.v)} m/s · พื้นที่ใต้กราฟ = ระยะ ${fmt(now.x)} m`} data-testid="motion-graph">
      <line x1={X(0)} y1={Y(0)} x2={X(tMax)} y2={Y(0)} stroke="var(--ink-3)" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={8} stroke="var(--ink-3)" />
      <text x={X(tMax)} y={H - 4} fontSize="9" textAnchor="end" fill="var(--ink-2)">t (s)</text>
      <text x={X(0) + 4} y={14} fontSize="9" fill="var(--ink-2)">v (m/s)</text>
      {tNow > 0 && <path d={area} fill="var(--phy-soft)" />}
      {tNow > 0 && <polyline points={pts.map((p) => `${X(p.t)},${Y(p.v)}`).join(' ')} fill="none" stroke="var(--phy)" strokeWidth="3" />}
    </svg>
  );
}

function MarkTable({ marks }: { marks: MotionState[] }) {
  const gaps = spacings(marks);
  return (
    <table className="w-full text-left text-sm" aria-label="ตารางวัดทุกวินาที" data-testid="motion-table">
      <thead><tr className="text-[var(--ink-3)]"><th className="py-1">t (s)</th><th>ตำแหน่ง (m)</th><th>ไปได้ในวินาทีนี้ (m)</th><th>v (m/s)</th></tr></thead>
      <tbody className="font-mono">
        {marks.map((m, i) => (
          <tr key={m.t} className="border-t border-[var(--line)]"><td className="py-1">{m.t}</td><td>{fmt(m.x)}</td><td>{i === 0 ? '—' : fmt(gaps[i - 1])}</td><td>{fmt(m.v)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

/** Animate the car from t0 to t1 (seconds), dropping a mark each second. */
function useRun() {
  const [tNow, setTNow] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stop = () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current); };
  useEffect(() => stop, []);
  const run = (t0: number, t1: number, done: () => void) => {
    stop();
    if (reducedMotion()) { setTNow(t1); done(); return; }
    setRunning(true);
    const start = performance.now();
    const finish = () => { stop(); setTNow(t1); setRunning(false); done(); };
    const tick = (now: number) => {
      const t = Math.min(t1, t0 + (now - start) / SEC_MS);
      if (t < t1) { setTNow(t); raf.current = requestAnimationFrame(tick); } else finish();
    };
    raf.current = requestAnimationFrame(tick);
    // animation frames pause in hidden tabs — the run still ends on time
    timer.current = setTimeout(finish, (t1 - t0) * SEC_MS + 300);
  };
  return { tNow, setTNow, running, run };
}

export function MotionLab(props: MechanicProps<MotionInteraction>) {
  const it = props.interaction;
  if (it.mode === 'equation') return <EquationChooser {...props} />;
  if (it.mode === 'target') return <TargetRun {...props} />;
  return <PredictRun {...props} />;
}

/* ── predict ─────────────────────────────────────────────────────── */

function PredictRun({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<MotionInteraction>) {
  const targets = it.predictAt ?? [2];
  const [round, setRound] = useState(0);
  const shown = round === 0 ? it.shownUntil ?? 1 : targets[round - 1];
  const target = targets[Math.min(round, targets.length - 1)];
  const { tNow, setTNow, running, run } = useRun();
  const [pin, setPin] = useState<number>(() => motionAt(it.u, it.a, it.shownUntil ?? 1).x);
  const [verdict, setVerdict] = useState<ReturnType<typeof judgePrediction> | null>(null);
  useEffect(() => { setTNow(it.shownUntil ?? 1); }, [it.shownUntil, setTNow]);
  const marks = marksUntil(it.u, it.a, Math.floor(Math.max(tNow, shown)));
  const car = motionAt(it.u, it.a, Math.max(tNow, shown));
  const done = result.solved || result.revealed;
  const waiting = !verdict || (!verdict.ok && round < targets.length);
  const go = () => {
    run(shown, target, () => {
      const v = judgePrediction(pin, motionAt(it.u, it.a, target).x, it.tol, spacings(marksUntil(it.u, it.a, target)));
      setVerdict(v);
      onAnswer(v.ok);
    });
  };
  const nextRound = () => { setRound((r) => r + 1); setVerdict(null); setPin(motionAt(it.u, it.a, target).x); };
  // half-metre steps: every position is reachable within the tolerance, and arrow keys move a useful amount
  const step = Math.min(0.5, it.tol);
  return (
    <div className="space-y-3" data-testid="motion-lab" data-mode="predict">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      <p className="text-sm text-[var(--ink-2)]">u = {it.u} m/s · a = {it.a} m/s² · รอยบนรางคือตำแหน่งทุก 1 วินาที</p>
      <Track marks={marks} carX={car.x} trackMax={it.trackMax} pin={verdict || !done ? pin : null} />
      {!done && !running && (!verdict || (!verdict.ok && round < targets.length - 1)) && (
        <label className="block text-sm">
          <span className="font-semibold text-ink">{verdict ? 'ลองอีกครั้ง: ' : ''}อีก {target - shown} วินาที (t = {target} s) รถจะอยู่ตรงไหน? <span className="font-mono">{fmt(pin)} m</span></span>
          <input type="range" min={0} max={it.trackMax} step={step} value={pin} disabled={!!verdict} onChange={(e) => setPin(Number(e.target.value))} className="mt-1 h-11 w-full accent-[var(--brand)]" aria-label={`ตำแหน่งที่คุณคาดตอน t = ${target} s (เมตร)`} />
        </label>
      )}
      {!done && !running && !verdict && <button type="button" className={PRIMARY} onClick={go} data-testid="motion-run"><Play className="h-4 w-4" aria-hidden="true" /> RUN — ดูรถวิ่งถึง t = {target} s</button>}
      {verdict && (
        <Feedback tone={verdict.ok ? 'good' : 'try'} title={verdict.ok ? 'คาดถูก' : 'ไม่ตรงกับที่คาด'}>
          <span data-testid="motion-verdict">{verdict.message}</span>
        </Feedback>
      )}
      {verdict && !verdict.ok && !done && round < targets.length - 1 && <button type="button" className={GHOST} onClick={nextRound}>ทายวินาทีถัดไป</button>}
      <div className="grid gap-3 @xl:grid-cols-2">
        <VtGraph u={it.u} a={it.a} tNow={Math.max(tNow, shown)} tMax={targets[targets.length - 1]} />
        <MarkTable marks={marks} />
      </div>
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={!!verdict && !verdict.ok && waiting} revealLabel="ดูรถวิ่งต่อและวิธีคิด" />
    </div>
  );
}

/* ── target (change u / a until the goal is met) ─────────────────── */

function TargetRun({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<MotionInteraction>) {
  const [u, setU] = useState(it.u);
  const [a, setA] = useState(it.a);
  const { tNow, setTNow, running, run } = useRun();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const goal = it.goal!;
  const runFor = it.runFor ?? (goal.type === 'reach' ? goal.t : 10);
  const tEnd = goal.type === 'stop' && a < 0 ? Math.min(runFor, u / -a) : runFor;
  const marks = marksUntil(u, a, Math.floor(tNow));
  const car = motionAt(u, a, tNow);
  const go = () => {
    setMsg(null);
    setTNow(0);
    run(0, Math.max(0.5, tEnd), () => {
      const j = judgeGoal(goal, u, a, it.tol);
      setMsg({ ok: j.ok, text: j.message });
      if (!result.solved) onAnswer(j.ok);
    });
  };
  const slider = (label: string, unit: string, v: number, set: (n: number) => void, c?: [number, number, number]) =>
    c && (
      <label className="block text-sm">
        <span className="flex justify-between font-medium text-[var(--ink-2)]"><span>{label}</span><span className="font-mono text-ink">{v} {unit}</span></span>
        <input type="range" min={c[0]} max={c[1]} step={c[2]} value={v} disabled={running} onChange={(e) => { set(Number(e.target.value)); setMsg(null); setTNow(0); }} className="mt-1 h-11 w-full accent-[var(--brand)]" aria-label={`${label} (${unit})`} />
      </label>
    );
  return (
    <div className="space-y-3" data-testid="motion-lab" data-mode="target">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      <Track marks={marks} carX={car.x} trackMax={it.trackMax} goalX={goal.x} goalLabel={goal.type === 'reach' ? `ธง ${goal.x} m (t = ${goal.t} s)` : `เส้นหยุด ${goal.x} m`} />
      <div className="grid gap-3 @md:grid-cols-2">
        {slider('ความเร็วต้น u', 'm/s', u, setU, it.controls?.u)}
        {slider('ความเร่ง a', 'm/s²', a, setA, it.controls?.a)}
      </div>
      {!it.controls?.u && <p className="text-sm text-[var(--ink-2)]">u = {u} m/s (คงที่)</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={PRIMARY} onClick={go} disabled={running} data-testid="motion-run"><Play className="h-4 w-4" aria-hidden="true" /> RUN</button>
        <button type="button" className={GHOST} onClick={() => { setTNow(0); setMsg(null); }} disabled={running}><RotateCcw className="h-4 w-4" aria-hidden="true" /> กลับจุดเริ่ม</button>
      </div>
      {msg && <Feedback tone={msg.ok ? 'good' : 'try'} title={msg.ok ? 'ทำได้' : 'ยังไม่ตรงเป้า'}><span data-testid="motion-verdict">{msg.text}</span></Feedback>}
      <div className="grid gap-3 @xl:grid-cols-2">
        <VtGraph u={u} a={a} tNow={tNow} tMax={Math.max(1, runFor)} />
        <MarkTable marks={marks} />
      </div>
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
    </div>
  );
}

/* ── equation chooser (cards: what is known / asked) ────────────── */

const VAR_TH: Record<KinVar, string> = { u: 'ความเร็วต้น u', v: 'ความเร็วปลาย v', a: 'ความเร่ง a', s: 'การกระจัด s', t: 'เวลา t' };
type CardState = 'none' | 'known' | 'asked';

function EquationChooser({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<MotionInteraction>) {
  const eq = it.equation!;
  const vars: KinVar[] = ['u', 'v', 'a', 's', 't'];
  const [cards, setCards] = useState<Record<KinVar, CardState>>({ u: 'none', v: 'none', a: 'none', s: 'none', t: 'none' });
  const [stage, setStage] = useState<'cards' | 'pick' | 'solve'>('cards');
  const [msg, setMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ans, setAns] = useState('');
  const known = Object.keys(eq.known) as KinVar[];
  const cycle = (v: KinVar) => setCards((c) => ({ ...c, [v]: c[v] === 'none' ? 'known' : c[v] === 'known' ? 'asked' : 'none' }));
  const checkCards = () => {
    const wrongKnown = vars.find((v) => (cards[v] === 'known') !== known.includes(v));
    const askOk = cards[eq.unknown] === 'asked' && vars.filter((v) => cards[v] === 'asked').length === 1;
    if (!wrongKnown && askOk) { setStage('pick'); setMsg(null); return; }
    onAnswer(false);
    if (wrongKnown && known.includes(wrongKnown)) setMsg(`โจทย์บอก ${VAR_TH[wrongKnown]} มาแล้ว — ${VAR_TH[wrongKnown]} = ${eq.known[wrongKnown]}`);
    else if (wrongKnown) setMsg(`โจทย์ไม่ได้บอก ${VAR_TH[wrongKnown]} — อย่าใส่ค่าที่ไม่มีในโจทย์`);
    else setMsg('เลือกสิ่งที่โจทย์ “ถาม” หนึ่งอย่าง');
  };
  const usable = usableEquations(known, eq.unknown).map((e) => e.ruleId);
  const pick = (ruleId: string) => {
    setPicked(ruleId);
    const e = KIN_EQUATIONS.find((x) => x.ruleId === ruleId)!;
    if (usable.includes(ruleId)) { setStage('solve'); setMsg(null); return; }
    onAnswer(false);
    const missing = e.vars.filter((v) => v !== eq.unknown && !known.includes(v));
    setMsg(!e.vars.includes(eq.unknown) ? `${e.text} ไม่มี ${eq.unknown} ซึ่งเป็นสิ่งที่ถาม` : `${e.text} มี ${missing.join(', ')} ซึ่งโจทย์ไม่ได้บอก — จะมีตัวที่ไม่รู้สองตัว`);
  };
  const submit = () => {
    const n = Number(ans.replace('−', '-'));
    const ok = ans.trim() !== '' && Math.abs(n - eq.answer) <= Math.max(0.01, Math.abs(eq.answer) * 0.01);
    onAnswer(ok);
    setMsg(ok ? null : `แทนค่าที่รู้ลงใน ${KIN_EQUATIONS.find((x) => x.ruleId === picked)?.text} แล้วแก้หา ${eq.unknown} อีกครั้ง`);
  };
  return (
    <div className="space-y-3" data-testid="motion-lab" data-mode="equation">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      <p className="rounded-xl bg-[var(--surface-3)] px-3 py-2 text-[15px]">{eq.story}</p>
      <div role="group" aria-label="การ์ดตัวแปร: แตะเพื่อเลือก รู้ค่า / โจทย์ถาม / ไม่เกี่ยว" className="flex flex-wrap gap-2" data-testid="motion-cards">
        {vars.map((v) => (
          <button key={v} type="button" disabled={stage !== 'cards'} onClick={() => cycle(v)} aria-label={`${VAR_TH[v]}: ${cards[v] === 'known' ? 'รู้ค่า' : cards[v] === 'asked' ? 'โจทย์ถาม' : 'ไม่ได้เลือก'}`} className={PICK(cards[v] !== 'none')}>
            <span className="font-mono">{v}</span><span className="text-xs">{cards[v] === 'known' ? `รู้ = ${eq.known[v] ?? '?'}` : cards[v] === 'asked' ? 'ถาม ?' : '—'}</span>
          </button>
        ))}
      </div>
      {stage === 'cards' && <button type="button" className={PRIMARY} onClick={checkCards}>ตรวจการ์ด</button>}
      {stage !== 'cards' && (
        <div role="group" aria-label="เลือกสมการ" className="grid gap-2 @md:grid-cols-2" data-testid="motion-equations">
          {KIN_EQUATIONS.map((e) => (
            <button key={e.ruleId} type="button" disabled={stage === 'solve'} onClick={() => pick(e.ruleId)} aria-pressed={picked === e.ruleId} className={`${PICK(picked === e.ruleId)} justify-start font-mono`}>
              {e.text} <span className="font-sans text-xs text-[var(--ink-3)]">(ไม่มี {(['u', 'v', 'a', 's', 't'] as KinVar[]).find((v) => !e.vars.includes(v))})</span>
            </button>
          ))}
        </div>
      )}
      {stage === 'solve' && !result.solved && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="text-sm"><span className="block font-semibold">{eq.unknown} = ? ({eq.unit})</span>
            <input inputMode="decimal" value={ans} onChange={(e) => setAns(e.target.value)} className="mt-1 min-h-[44px] w-32 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" />
          </label>
          <button type="submit" className={PRIMARY}>ตรวจ</button>
        </form>
      )}
      {msg && <Feedback tone="try" title="ลองดูอีกที">{msg}</Feedback>}
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
    </div>
  );
}
