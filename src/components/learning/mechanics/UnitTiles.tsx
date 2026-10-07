import { useEffect, useState } from 'react';
import { FlipVertical, X } from 'lucide-react';
import { Feedback } from '../Questions';
import type { UnitsInteraction } from '../../../interactive/types';
import { evaluateUnits, formatUnits, unitFeedback } from '../../../interactive/mechanics/units';
import type { PlacedTile, UnitOccurrence, UnitTile } from '../../../interactive/mechanics/units';
import { MechanicFooter } from './shared';
import { GHOST, PICK, PRIMARY } from './ui';
import type { MechanicProps } from './ui';

/* Cancellation Tiles (phy-vec-units). A factor is "1" written as top/bottom; the learner picks WHICH factor
   and WHICH WAY UP. Units that appear on top and bottom cross out. The number appears only when the
   remaining units are the target units — the dimensional decision comes first. */

const fmtNum = (n: number) => (Math.abs(n) >= 1e-3 || n === 0 ? String(Math.round(n * 1e6) / 1e6) : n.toExponential(2));

function UnitChip({ o }: { o: UnitOccurrence }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 font-mono font-semibold ${o.cancelled ? 'text-[var(--ink-3)] line-through decoration-2' : 'text-ink'}`}>
      {o.unit}
      {o.cancelled && <span className="sr-only"> (ตัดกันแล้ว)</span>}
    </span>
  );
}

function Fraction({ num, den, top, bottom }: { num: UnitOccurrence[]; den: UnitOccurrence[]; top: string; bottom: string }) {
  return (
    <span className="inline-flex flex-col items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-2 py-1 text-sm">
      <span className="whitespace-nowrap">{top}{num.map((o, i) => <UnitChip key={i} o={o} />)}</span>
      <span className="my-0.5 h-0.5 w-full bg-[var(--ink)]" aria-hidden="true" />
      <span className="whitespace-nowrap">{bottom}{den.map((o, i) => <UnitChip key={i} o={o} />)}</span>
    </span>
  );
}

const sideOf = (t: UnitTile, flipped: boolean) => (flipped ? { top: t.bottom, bottom: t.top } : { top: t.top, bottom: t.bottom });

export function UnitTiles({ interaction: it, result, onAnswer, onHint, onReveal }: MechanicProps<UnitsInteraction>) {
  const [guess, setGuess] = useState<'bigger' | 'smaller' | null>(it.predict ? null : 'bigger');
  const [placed, setPlaced] = useState<PlacedTile[]>([]);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const ev = evaluateUnits(it.value, it.from, it.to, it.tiles, placed);
  const given = ev.occurrences.filter((o) => o.source === 'given');
  const done = result.solved || result.revealed;

  // Units right + number shown by the system → solved by the learner's own placement
  useEffect(() => {
    if (!it.learnerComputes && ev.matches && !result.solved && !result.revealed) onAnswer(true);
  }, [ev.matches, it.learnerComputes, result.solved, result.revealed, onAnswer]);

  const place = (id: string, flipped: boolean) => { setPlaced((p) => [...p, { id, flipped }]); setChoosing(null); setMsg(null); };
  const check = () => {
    if (!ev.matches) { onAnswer(false); setMsg(unitFeedback(ev, it.to)); return; }
    const n = Number(typed.replace(/,/g, '').replace('−', '-'));
    const ok = typed.trim() !== '' && Math.abs(n - it.answer) <= Math.max(1e-9, Math.abs(it.answer) * 0.005);
    onAnswer(ok);
    setMsg(ok ? null : `หน่วยถูกแล้ว ลองคำนวณตัวเลขตามตัวประกอบที่วางไว้: ${it.value} ${placed.map((p) => { const t = it.tiles.find((x) => x.id === p.id)!; const s = sideOf(t, p.flipped); return `× ${s.top.v}/${s.bottom.v}`; }).join(' ')}`);
  };

  return (
    <div className="space-y-3" data-testid="unit-tiles">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      {it.predict && (
        <fieldset>
          <legend className="text-sm font-semibold">ทายก่อน: {it.value} {formatUnits(it.from)} เมื่อเขียนเป็น {formatUnits(it.to)} ตัวเลขจะมากขึ้นหรือน้อยลง?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={PICK(guess === 'bigger')} aria-pressed={guess === 'bigger'} disabled={!!guess} onClick={() => setGuess('bigger')}>มากกว่า {it.value}</button>
            <button type="button" className={PICK(guess === 'smaller')} aria-pressed={guess === 'smaller'} disabled={!!guess} onClick={() => setGuess('smaller')}>น้อยกว่า {it.value}</button>
          </div>
        </fieldset>
      )}
      {guess && (
        <>
          <div className="overflow-x-auto rounded-2xl bg-[var(--surface-3)] p-3" aria-label="สายการแปลงหน่วย" data-testid="unit-chain">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Fraction num={given.filter((o) => o.where === 'num')} den={given.filter((o) => o.where === 'den')} top={`${it.value} `} bottom={it.from.den.length ? '' : '1'} />
              {placed.map((p, i) => {
                const tile = it.tiles.find((t) => t.id === p.id)!;
                const s = sideOf(tile, p.flipped);
                const mine = ev.occurrences.filter((o) => o.source === p.id);
                return (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span aria-hidden="true">×</span>
                    <Fraction num={mine.filter((o) => o.where === 'num')} den={mine.filter((o) => o.where === 'den')} top={`${s.top.v} `} bottom={`${s.bottom.v} `} />
                    {!done && (
                      <span className="flex flex-col gap-1">
                        <button type="button" className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-[var(--line-2)] bg-[var(--surface)]" aria-label={`พลิก ${s.top.v} ${s.top.u} / ${s.bottom.v} ${s.bottom.u}`} onClick={() => { setPlaced((ps) => ps.map((x, j) => (j === i ? { ...x, flipped: !x.flipped } : x))); setMsg(null); }}><FlipVertical className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-[var(--line-2)] bg-[var(--surface)]" aria-label={`เอา ${s.top.u}/${s.bottom.u} ออก`} onClick={() => { setPlaced((ps) => ps.filter((_, j) => j !== i)); setMsg(null); }}><X className="h-4 w-4" aria-hidden="true" /></button>
                      </span>
                    )}
                  </span>
                );
              })}
              <span aria-hidden="true">=</span>
              <span className="font-mono text-base font-bold" data-testid="unit-result" aria-live="polite">
                {ev.matches ? (it.learnerComputes && !result.solved ? `? ${formatUnits(it.to)}` : `${fmtNum(ev.value)} ${formatUnits(it.to)}`) : `… ${ev.remainingText}`}
              </span>
            </div>
          </div>
          <p className="text-sm" data-testid="unit-status" aria-live="polite">
            {ev.matches ? <span className="font-semibold text-[var(--ok)]">✓ หน่วยเหลือ {formatUnits(it.to)} — ตอนนี้คำนวณตัวเลขได้แล้ว</span> : <span>หน่วยตอนนี้: <b className="font-mono">{ev.remainingText}</b> — ยังไม่ใช่ <span className="font-mono">{formatUnits(it.to)}</span>{placed.length && !msg ? ` · ${unitFeedback(ev, it.to)}` : ''}</span>}
          </p>
          {!done && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--ink-3)]">ตัวประกอบการแปลง (แต่ละอันเท่ากับ 1) — เลือก แล้วเลือกว่าจะวางด้านไหนขึ้น</p>
              <div className="flex flex-wrap gap-2" data-testid="unit-tray">
                {it.tiles.map((t) => (
                  <button key={t.id} type="button" className={PICK(choosing === t.id)} aria-pressed={choosing === t.id} onClick={() => setChoosing(choosing === t.id ? null : t.id)}>
                    <span className="font-mono">{t.top.v} {t.top.u} = {t.bottom.v} {t.bottom.u}</span>
                  </button>
                ))}
              </div>
              {choosing && (() => {
                const t = it.tiles.find((x) => x.id === choosing)!;
                return (
                  <div role="group" aria-label="วางด้านไหนขึ้น" className="flex flex-wrap gap-2" data-testid="unit-orient">
                    <button type="button" className={GHOST} onClick={() => place(t.id, false)} aria-label={`วาง ${t.top.v} ${t.top.u} ไว้ด้านบน ${t.bottom.v} ${t.bottom.u} ไว้ด้านล่าง`}><span className="font-mono">{t.top.v} {t.top.u} / {t.bottom.v} {t.bottom.u}</span></button>
                    <button type="button" className={GHOST} onClick={() => place(t.id, true)} aria-label={`วาง ${t.bottom.v} ${t.bottom.u} ไว้ด้านบน ${t.top.v} ${t.top.u} ไว้ด้านล่าง`}><span className="font-mono">{t.bottom.v} {t.bottom.u} / {t.top.v} {t.top.u}</span></button>
                  </div>
                );
              })()}
            </div>
          )}
          {it.learnerComputes && ev.matches && !done && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
              <label className="text-sm"><span className="block font-semibold">คำนวณเอง: ได้กี่ {formatUnits(it.to)}?</span>
                <input inputMode="decimal" value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 min-h-[44px] w-36 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" />
              </label>
              <button type="submit" className={PRIMARY}>ตรวจ</button>
            </form>
          )}
          {!it.learnerComputes && !ev.matches && placed.length > 0 && !done && <button type="button" className={PRIMARY} onClick={check}>ตรวจหน่วย</button>}
          {msg && <Feedback tone="try" title="ยังไม่ใช่">{msg}</Feedback>}
          {result.solved && it.predict && guess && (
            <p className="text-sm" data-testid="unit-prediction">คุณทายว่า {guess === 'bigger' ? 'มากขึ้น' : 'น้อยลง'} — ผลจริง {it.answer > it.value ? 'มากขึ้น' : 'น้อยลง'} {(it.answer > it.value) === (guess === 'bigger') ? '✓ ทายถูก' : '✗ ไม่ตรงที่ทาย'}</p>
          )}
          <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
        </>
      )}
    </div>
  );
}
