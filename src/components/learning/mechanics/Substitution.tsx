import { useState } from 'react';
import { Feedback } from '../Questions';
import type { SubstituteInteraction } from '../../../interactive/types';
import { holds, linText, rearrangeForX, solveSubstituted, substitutedText, substitutedValue } from '../../../interactive/mechanics/linearSystem';
import { MechanicFooter } from './shared';
import { PICK, PRIMARY } from './ui';
import type { MechanicProps } from './ui';

/* Substitution Machine (math-alg-linear-system). The learner rearranges one equation into "x = …",
   picks that label up and drops it on EVERY x of the other equation. The equation keeps its meaning
   because x and (y + 2) are the same number. Then: one unknown → solve → back-substitute → both lights on. */

type Tok = { kind: 'coef' | 'x' | 'y' | 'op' | 'eq' | 'num'; text: string };

function tokens(a: number, b: number, c: number): Tok[] {
  const out: Tok[] = [];
  if (a) { if (Math.abs(a) !== 1 || a < 0) out.push({ kind: 'coef', text: a === -1 ? '−' : a < 0 ? `−${-a}` : String(a) }); out.push({ kind: 'x', text: 'x' }); }
  if (b) { out.push({ kind: 'op', text: b < 0 ? '−' : '+' }); if (Math.abs(b) !== 1) out.push({ kind: 'coef', text: String(Math.abs(b)) }); out.push({ kind: 'y', text: 'y' }); }
  out.push({ kind: 'eq', text: '=' }, { kind: 'num', text: c < 0 ? `−${-c}` : String(c) });
  return out;
}

export function Substitution({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<SubstituteInteraction>) {
  const sub = rearrangeForX(it.relation);
  const [stage, setStage] = useState<'rearrange' | 'replace' | 'solve-y' | 'solve-x' | 'check'>('rearrange');
  const [holding, setHolding] = useState(false);
  const [replaced, setReplaced] = useState<number[]>([]);
  const [y, setY] = useState('');
  const [x, setX] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const toks = tokens(it.target.a, it.target.b, it.target.c);
  const xIdx = toks.map((t, i) => (t.kind === 'x' ? i : -1)).filter((i) => i >= 0);
  const answer = solveSubstituted(it.target, sub);
  const done = result.solved || result.revealed;
  const num = (s: string) => Number(s.replace('−', '-'));

  const rearrange = (right: boolean) => {
    if (right) { setStage('replace'); setMsg(null); return; }
    onAnswer(false);
    setMsg(`ลบ y ทั้งสองข้างได้ x − 2y = 2 − y — x ยังไม่อยู่คนเดียว ต้องทำให้ −y หายจากข้างของ x`);
  };
  const tap = (i: number) => {
    const t = toks[i];
    if (!holding) { setMsg('หยิบป้าย “' + sub.text + '” ก่อน แล้วแตะตัวที่จะแทน'); return; }
    if (t.kind !== 'x') { onAnswer(false); setMsg(`ป้ายนี้บอกว่า x เท่ากับอะไร จึงแทนได้เฉพาะ x — ${t.text} ไม่ได้เท่ากับ ${sub.text.replace('x = ', '')}`); return; }
    const next = [...replaced, i];
    setReplaced(next);
    setMsg(null);
    if (xIdx.every((k) => next.includes(k))) { setHolding(false); setStage('solve-y'); }
  };
  const checkY = () => {
    const v = num(y);
    if (y.trim() !== '' && Math.abs(v - answer.y) < 1e-9) { setStage('solve-x'); setMsg(null); return; }
    onAnswer(false);
    if (y.trim() === '') return;
    setMsg(`ลองแทน y = ${v}: ${substitutedText(it.target, sub).split(' = ')[0].replace(/\(y/g, `(${v}`).replace(/y/g, `(${v})`)} = ${substitutedValue(it.target, sub, v)} ไม่ใช่ ${it.target.c}`);
  };
  const checkX = () => {
    const v = num(x);
    if (x.trim() !== '' && Math.abs(v - answer.x) < 1e-9) {
      setStage('check');
      setMsg(null);
      if (!result.solved) onAnswer(true);
      return;
    }
    onAnswer(false);
    setMsg(`ใช้ป้ายเดิม: ${sub.text} เมื่อ y = ${answer.y} จะได้ x = ?`);
  };

  return (
    <div className="space-y-3" data-testid="substitution">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      <ol className="space-y-1 font-mono text-base" aria-label="ระบบสมการ">
        <li>① {linText(it.relation)}</li>
        <li>② {linText(it.target)}</li>
      </ol>

      {stage === 'rearrange' && !done && (
        <fieldset>
          <legend className="text-sm font-semibold">ขั้น 1: ทำให้สมการ ① มี x อยู่คนเดียว — ทำอะไรกับทั้งสองข้าง?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={PICK(false)} onClick={() => rearrange(true)}>บวก y ทั้งสองข้าง</button>
            <button type="button" className={PICK(false)} onClick={() => rearrange(false)}>ลบ y ทั้งสองข้าง</button>
          </div>
        </fieldset>
      )}

      {stage !== 'rearrange' && (
        <div className="space-y-2">
          <button type="button" disabled={stage !== 'replace'} aria-pressed={holding} onClick={() => { setHolding((h) => !h); setMsg(null); }} className={`${PICK(holding)} font-mono`} data-testid="sub-label">
            {holding ? 'กำลังถือป้าย: ' : 'ป้าย: '}{sub.text}
          </button>
          <p className="text-sm text-[var(--ink-2)]">{stage === 'replace' ? 'ขั้น 2: หยิบป้าย แล้วแตะ x ทุกตัวในสมการ ② เพื่อแทนด้วยสิ่งที่ x เท่ากับ' : 'x ทุกตัวถูกแทนแล้ว — ตอนนี้สมการ ② เหลือตัวแปรเดียว'}</p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[var(--surface-3)] p-3 font-mono text-lg" role="group" aria-label="สมการ ② — แตะ x เพื่อแทนค่า" data-testid="sub-equation">
            {toks.map((t, i) =>
              replaced.includes(i) ? (
                <span key={i} className="rounded-lg border-2 border-[var(--ok)] bg-[var(--ok-soft)] px-1.5" data-testid="sub-replaced">({sub.text.replace('x = ', '')})<span className="sr-only"> แทน x แล้ว</span></span>
              ) : t.kind === 'x' || t.kind === 'y' ? (
                <button key={i} type="button" disabled={stage !== 'replace'} onClick={() => tap(i)} className="min-h-[44px] min-w-[44px] rounded-lg border-2 border-dashed border-[var(--line-2)] px-1.5 font-bold enabled:hover:bg-[var(--surface)]" aria-label={`ตัวแปร ${t.text}`}>{t.text}</button>
              ) : (
                <span key={i} className="px-0.5">{t.text}</span>
              ),
            )}
          </div>
          {stage !== 'replace' && <p className="font-mono text-base" data-testid="sub-result">= {substitutedText(it.target, sub)}</p>}
        </div>
      )}

      {stage === 'solve-y' && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); checkY(); }}>
          <label className="text-sm"><span className="block font-semibold">ขั้น 3: แก้สมการตัวแปรเดียวนี้ y = ?</span>
            <input inputMode="decimal" value={y} onChange={(e) => setY(e.target.value)} className="mt-1 min-h-[44px] w-28 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" />
          </label>
          <button type="submit" className={PRIMARY}>ตรวจ</button>
        </form>
      )}
      {stage === 'solve-x' && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); checkX(); }}>
          <label className="text-sm"><span className="block font-semibold">ขั้น 4: y = {answer.y} แล้ว x = ? (ใช้ป้าย {sub.text})</span>
            <input inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} className="mt-1 min-h-[44px] w-28 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" />
          </label>
          <button type="submit" className={PRIMARY}>ตรวจ</button>
        </form>
      )}
      {(stage === 'check' || result.solved) && (
        <ul className="space-y-1 font-mono text-sm" aria-label="ตรวจทั้งสองสมการ" data-testid="sub-lights">
          {[it.relation, it.target].map((e, i) => (
            <li key={i} className="rounded-xl border border-[var(--ok)] bg-[var(--ok-soft)] px-3 py-2">{linText(e)} → แทน x = {answer.x}, y = {answer.y} {holds(e, answer.x, answer.y) ? '✓ จริง' : '✗ เท็จ'}</li>
          ))}
        </ul>
      )}
      {msg && <Feedback tone="try" title="ลองดูอีกที">{msg}</Feedback>}
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
    </div>
  );
}
