import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Feedback } from '../Questions';
import type { ConsoleInteraction } from '../../../interactive/types';
import { runConsole, showValue } from '../../../interactive/mechanics/pyConsole';
import type { ConsoleRun, PyValue } from '../../../interactive/mechanics/pyConsole';
import { MechanicFooter } from './shared';
import { GHOST, PICK, PRIMARY } from './ui';
import type { MechanicProps } from './ui';

/* Be-the-User console (prog-py-io). RUN → the program asks → the learner types → memory changes →
   the code continues → output. Programs are fixed lesson programs run by a small interpreter that the
   test suite cross-checks against real python3; the learner only ever supplies input. */

const MONO = { fontVariantLigatures: 'none' } as const;
const typeBadge = (v: PyValue) => <span className={`ml-1 rounded px-1 text-[11px] font-bold ${v.t === 'str' ? 'bg-[#fdf0d8] text-[#7a4b00]' : 'bg-[#e1f5ee] text-[#0b5e45]'}`}>{v.t}</span>;

function Code({ program, active, errorLine, changedLine }: { program: string; active?: number; errorLine?: number; changedLine?: number }) {
  return (
    <pre style={MONO} className="overflow-x-auto rounded-2xl bg-[#0f172a] p-3 font-mono text-[13px] leading-6 text-slate-100" aria-label="โค้ดของโปรแกรม" data-testid="console-code">
      {program.split('\n').map((l, i) => (
        <div key={i} className={`flex gap-3 rounded px-1 ${i + 1 === errorLine ? 'bg-rose-500/25' : i + 1 === active ? 'bg-white/15' : i + 1 === changedLine ? 'bg-emerald-500/20' : ''}`}>
          <span className="select-none text-slate-500">{i + 1}</span><span className="whitespace-pre">{l}</span>
          {i + 1 === active && <span className="text-sky-300">← รอคุณพิมพ์</span>}
          {i + 1 === errorLine && <span className="text-rose-300">← error</span>}
          {i + 1 === changedLine && i + 1 !== errorLine && i + 1 !== active && <span className="text-emerald-300">← แก้แล้ว</span>}
        </div>
      ))}
    </pre>
  );
}

function Memory({ run }: { run: ConsoleRun | null }) {
  const conv = run?.events.filter((e) => e.kind === 'convert') ?? [];
  const vars = Object.entries(run?.vars ?? {});
  return (
    <div className="rounded-2xl border border-[var(--line)] p-3 text-sm" data-testid="console-memory" aria-label="หน่วยความจำ">
      <p className="text-xs font-semibold text-[var(--ink-3)]">หน่วยความจำ</p>
      {vars.length === 0 && <p className="text-[var(--ink-3)]">ยังว่าง</p>}
      {vars.map(([name, v]) => (
        <p key={name} className="font-mono text-ink">{name} = {showValue(v)}{typeBadge(v)}<span className="sr-only"> ชนิด {v.t}</span></p>
      ))}
      {conv.map((c, i) => c.kind === 'convert' && (
        <p key={i} className="mt-1 font-mono text-xs text-[var(--ink-2)]" data-testid="console-convert">{showValue(c.from)}{typeBadge(c.from)} → {c.fn}() → {showValue(c.to)}{typeBadge(c.to)}</p>
      ))}
    </div>
  );
}

export function PyConsole({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<ConsoleInteraction>) {
  const [program, setProgram] = useState(it.program);
  const [inputs, setInputs] = useState<string[] | null>(null);
  const [typed, setTyped] = useState('');
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [fixMsg, setFixMsg] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const run = inputs ? runConsole(program, inputs) : null;
  const pred = it.predictions?.[Math.min(round, (it.predictions?.length ?? 1) - 1)];
  const done = result.solved || result.revealed;
  const changedLine = program !== it.program ? program.split('\n').findIndex((l, i) => l !== it.program.split('\n')[i]) + 1 : undefined;

  useEffect(() => { if (run?.waitingFor) field.current?.focus(); }, [run?.waitingFor]);

  /** Judge a finished run — called from the RUN / Enter handlers, never from an effect. */
  const judge = (prog: string, ins: string[]) => {
    const r = runConsole(prog, ins);
    if (!r.done) return;
    if (it.goal === 'run' && !r.error && ins.length > 0 && !result.solved) onAnswer(true);
    if (it.goal === 'predict' && pred && guess !== null) {
      if (ins[0]?.trim() !== pred.input) { setVerdict(`คำทายของคุณเป็นของการพิมพ์ ${pred.input} — กด RUN แล้วพิมพ์ ${pred.input}`); return; }
      const shown = r.error ?? r.events.filter((e) => e.kind === 'print').map((e) => (e.kind === 'print' ? e.text : '')).join(' / ');
      const ok = pred.choices[guess] === shown;
      setVerdict(`คุณคาด: ${pred.choices[guess]} · โปรแกรมแสดงจริง: ${shown}${ok ? ' ✓' : ''}`);
      if (!result.solved) onAnswer(ok);
    }
    if (it.goal === 'fix' && prog !== it.program) {
      // A non-number typed into int(input()) is the USER's input, not a code mistake — explain, don't count it
      if (r.error?.startsWith('ValueError')) { setFixMsg('int() แปลงได้เฉพาะข้อความที่เป็นตัวเลข — RUN อีกครั้งแล้วพิมพ์ตัวเลข'); return; }
      const ok = !r.error && !!it.fixes?.some((f) => f.program === prog && f.correct);
      setFixMsg(ok ? null : r.error ? 'ยัง error อยู่ — ดูบรรทัดที่แดงและชนิดในหน่วยความจำ' : 'โปรแกรมทำงานแล้ว แต่ผลยังไม่ใช่สิ่งที่ตั้งใจ — ดูผลลัพธ์ในคอนโซลอีกครั้ง');
      if (!result.solved) onAnswer(ok);
    }
  };

  const start = () => { setInputs([]); setTyped(''); setVerdict(null); setFixMsg(null); judge(program, []); };
  const submit = () => { if (!inputs) return; const next = [...inputs, typed]; setInputs(next); setTyped(''); judge(program, next); };

  // console transcript as a terminal would show it (typed input echoed after the prompt)
  const lines: { text: string; kind: 'out' | 'in' | 'err' }[] = [];
  for (const e of run?.events ?? []) {
    if (e.kind === 'input') lines.push({ text: `${e.prompt}${e.raw}`, kind: 'in' });
    if (e.kind === 'print') lines.push({ text: e.text, kind: 'out' });
    if (e.kind === 'error') lines.push({ text: `Traceback (most recent call last):\n  line ${e.line}\n${e.error}`, kind: 'err' });
  }

  return (
    <div className="space-y-3" data-testid="py-console" data-goal={it.goal}>
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      {it.goal === 'predict' && pred && !done && (
        <fieldset>
          <legend className="text-sm font-semibold">ทายก่อน: ถ้าพิมพ์ <span className="font-mono">{pred.input}</span> โปรแกรมจะแสดงอะไร?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {pred.choices.map((c, i) => <button key={c} type="button" disabled={inputs !== null} aria-pressed={guess === i} className={`${PICK(guess === i)} font-mono`} onClick={() => setGuess(i)}>{c}</button>)}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 space-y-2">
          <Code program={program} active={run?.waitingFor?.line} errorLine={run?.errorLine} changedLine={changedLine} />
          <div className="rounded-2xl border border-[var(--line-2)] bg-[#0b1020] p-3 font-mono text-[13px] text-slate-100" style={MONO} data-testid="console-screen" role="log" aria-label="หน้าจอคอนโซล" aria-live="polite">
            {!run && <p className="text-slate-400">กด RUN เพื่อเริ่มโปรแกรม</p>}
            {lines.map((l, i) => <p key={i} className={`whitespace-pre-wrap break-words ${l.kind === 'err' ? 'text-rose-300' : l.kind === 'in' ? 'text-sky-200' : ''}`}>{l.text}</p>)}
            {run?.waitingFor && (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label htmlFor="console-in" className="whitespace-pre-wrap">{run.waitingFor.prompt}</label>
                <input id="console-in" ref={field} value={typed} onChange={(e) => setTyped(e.target.value)} enterKeyHint="send" autoComplete="off" className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-sky-400/60 bg-[#111a33] px-2 text-slate-100 caret-sky-300" aria-label={`โปรแกรมรอให้คุณพิมพ์: ${run.waitingFor.prompt}`} data-testid="console-input" />
                <button type="submit" className="min-h-[40px] rounded-lg bg-sky-500 px-3 text-sm font-semibold text-white">Enter</button>
              </form>
            )}
          </div>
        </div>
        <Memory run={run} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={PRIMARY} onClick={start} disabled={it.goal === 'predict' && guess === null && !done} data-testid="console-run"><Play className="h-4 w-4" aria-hidden="true" /> {run ? 'RUN อีกครั้ง' : 'RUN'}</button>
        {it.goal === 'fix' && program !== it.program && !result.solved && <button type="button" className={GHOST} onClick={() => { setProgram(it.program); setInputs(null); setFixMsg(null); }}><RotateCcw className="h-4 w-4" aria-hidden="true" /> โค้ดเดิม</button>}
      </div>
      {it.goal === 'fix' && run?.done && !result.solved && (
        <fieldset data-testid="console-fixes">
          <legend className="text-sm font-semibold">{run.error ? 'แก้โค้ดยังไงดี? เลือกการแก้ แล้ว RUN ใหม่' : 'ผลถูกไหม? ถ้ายังไม่ใช่ ลองแก้โค้ด'}</legend>
          <div className="mt-2 grid gap-2">
            {it.fixes?.map((f) => <button key={f.label} type="button" aria-pressed={program === f.program} className={`${PICK(program === f.program)} justify-start text-left font-mono`} onClick={() => { setProgram(f.program); setInputs(null); setFixMsg(null); }}>{f.label}</button>)}
          </div>
        </fieldset>
      )}
      {verdict && <Feedback tone={verdict.endsWith('✓') ? 'good' : 'try'} title={verdict.endsWith('✓') ? 'ทายถูก' : 'ไม่ตรงกับที่ทาย'}><span data-testid="console-verdict">{verdict}</span></Feedback>}
      {verdict && !verdict.endsWith('✓') && !done && round < (it.predictions?.length ?? 1) - 1 && inputs?.[0]?.trim() === pred?.input && (
        <button type="button" className={GHOST} onClick={() => { setRound((r) => r + 1); setGuess(null); setInputs(null); setVerdict(null); }}>ทายอีกค่า</button>
      )}
      {fixMsg && <Feedback tone="try" title="ยังไม่ใช่">{fixMsg}</Feedback>}
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
    </div>
  );
}
