import { useState } from 'react';
import { Feedback } from '../Questions';
import type { StoryInteraction } from '../../../interactive/types';
import { checkStoryRow, holds, linText, rowEquation } from '../../../interactive/mechanics/linearSystem';
import type { RowSlots } from '../../../interactive/mechanics/linearSystem';
import { MechanicFooter } from './shared';
import { GHOST, PICK, PRIMARY } from './ui';
import type { MechanicProps } from './ui';

/* Story → Model Translator (math-alg-linear-system, skill-math-word-problem).
   1) name the two unknowns from the story · 2) build each relationship from story pieces (tap a piece,
   then tap a slot) · 3) a wrong equation is answered with what it MEANS · 4) solve and check both. */

type Slot = keyof RowSlots;

export function StoryModel({ interaction: base, result, onAnswer, onHint, onReveal }: MechanicProps<StoryInteraction>) {
  // Naming the unknowns the other way round is NOT wrong: swap the model so the learner's choice is respected
  const [swapped, setSwapped] = useState(false);
  const it: StoryInteraction = swapped
    ? {
        ...base,
        names: { x: base.names.y, y: base.names.x },
        chips: base.chips.map((c) => (c.belongsTo ? { ...c, belongsTo: c.belongsTo === 'x' ? 'y' : 'x' } : c)),
        rows: base.rows.map((r) => ({ ...r, expect: { a: r.expect.b, b: r.expect.a, c: r.expect.c } })),
        solution: { x: base.solution.y, y: base.solution.x },
      }
    : base;
  const [stage, setStage] = useState<'unknowns' | 'build' | 'solve'>(it.phrases ? 'unknowns' : 'build');
  const [unk, setUnk] = useState<{ x?: string; y?: string }>({});
  const [chip, setChip] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowSlots>>(() => Object.fromEntries(it.rows.map((r) => [r.id, {}])));
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; text?: string }>>({});
  const [xs, setXs] = useState('');
  const [ys, setYs] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const done = result.solved || result.revealed;
  const label = (id?: string) => it.chips.find((c) => c.id === id)?.label;

  const pickUnknown = (slot: 'x' | 'y', phraseId: string) => setUnk((u) => ({ ...u, [slot]: phraseId }));
  const checkUnknowns = () => {
    const p = (id?: string) => it.phrases!.find((q) => q.id === id);
    const px = p(unk.x), py = p(unk.y);
    if (px?.is === 'x' && py?.is === 'y') { setStage('build'); setMsg(null); return; }
    if (px?.is === 'y' && py?.is === 'x') { setSwapped(true); setStage('build'); setMsg(null); return; }
    onAnswer(false);
    const given = [px, py].find((q) => q?.is === 'given');
    setMsg(given ? `“${given.text}” โจทย์บอกมาแล้ว — ตัวแปรต้องเป็นสิ่งที่ยังไม่รู้` : 'x กับ y ต้องเป็นสองสิ่งที่โจทย์ถามและยังไม่รู้ค่า (คนละอย่างกัน)');
  };
  const put = (rowId: string, slot: Slot) => {
    if (!chip) { setMsg('แตะชิ้นส่วนจากโจทย์ก่อน แล้วแตะช่องที่จะวาง'); return; }
    setRows((r) => ({ ...r, [rowId]: { ...r[rowId], [slot]: chip } }));
    setChip(null); // one placement per tap: the next tap on any piece (even the same one) picks it up again
    setRowMsg((m) => { const n = { ...m }; delete n[rowId]; return n; });
    setMsg(null);
  };
  const checkRows = () => {
    const out: Record<string, { ok: boolean; text?: string }> = {};
    for (const r of it.rows) {
      const c = checkStoryRow(r, rows[r.id], it.chips, it.names, it.kindOfStory);
      out[r.id] = { ok: c.ok, text: c.message };
    }
    setRowMsg(out);
    if (Object.values(out).every((o) => o.ok)) { setStage('solve'); return; }
    onAnswer(false);
  };
  const solve = () => {
    const x = Number(xs.replace('−', '-')), y = Number(ys.replace('−', '-'));
    const eqs = it.rows.map((r) => r.expect);
    if (xs.trim() && ys.trim() && eqs.every((e) => holds(e, x, y))) { setMsg(null); if (!result.solved) onAnswer(true); return; }
    onAnswer(false);
    const okN = eqs.filter((e) => holds(e, x, y)).length;
    setMsg(okN === 1 ? 'คู่นี้ทำให้สมการหนึ่งจริง แต่อีกสมการยังไม่จริง — คำตอบต้องจริงทั้งสองสมการ' : 'ลองแทนค่าลงในแต่ละสมการ — ยังไม่มีสมการไหนจริง');
  };

  const x = Number(xs.replace('−', '-')), y = Number(ys.replace('−', '-'));
  return (
    <div className="space-y-3" data-testid="story-model">
      <p className="text-[15px] font-semibold leading-relaxed text-ink">{it.prompt}</p>
      <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface-3)] px-4 py-3 text-[15px] leading-relaxed" data-testid="story-text">{it.story}</p>

      {stage === 'unknowns' && it.phrases && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">ขั้น 1: อะไรคือสิ่งที่ยังไม่รู้? เลือกให้ x และ y</legend>
          {(['x', 'y'] as const).map((s) => (
            <div key={s} role="group" aria-label={`${s} คือ`} className="flex flex-wrap items-center gap-2">
              <span className="w-8 font-mono text-lg font-bold">{s} =</span>
              {it.phrases!.map((p) => (
                <button key={p.id} type="button" aria-pressed={unk[s] === p.id} className={PICK(unk[s] === p.id)} onClick={() => pickUnknown(s, p.id)}>{p.text}</button>
              ))}
            </div>
          ))}
          <button type="button" className={PRIMARY} disabled={!unk.x || !unk.y} onClick={checkUnknowns}>ตรวจตัวแปร</button>
        </fieldset>
      )}

      {stage !== 'unknowns' && (
        <p className="text-sm" data-testid="story-names"><b className="font-mono">x</b> = {it.names.x} · <b className="font-mono">y</b> = {it.names.y}</p>
      )}

      {stage === 'build' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">ขั้น 2: สร้างสมการจากโจทย์ — แตะชิ้นส่วน แล้วแตะช่อง</p>
          <div role="group" aria-label="ชิ้นส่วนจากโจทย์" className="flex flex-wrap gap-2" data-testid="story-chips">
            {it.chips.map((c) => (
              <button key={c.id} type="button" aria-pressed={chip === c.id} className={`${PICK(chip === c.id)} font-mono`} onClick={() => setChip(chip === c.id ? null : c.id)} aria-label={`ชิ้นส่วน ${c.says}`}>{c.label}</button>
            ))}
          </div>
          {it.rows.map((r) => {
            const s = rows[r.id];
            const slotBtn = (slot: Slot) => (
              <button type="button" onClick={() => put(r.id, slot)} className={`${GHOST} min-w-[64px] font-mono ${s[slot] ? '' : 'border-dashed text-[var(--ink-3)]'}`} aria-label={`ช่อง${slot === 'a' ? 'ตัวคูณของ x' : slot === 'b' ? 'ตัวคูณของ y' : 'ด้านขวา'} ในสมการ${r.label}: ${label(s[slot]) ?? 'ว่าง'}`} data-testid={`slot-${r.id}-${slot}`}>{label(s[slot]) ?? '…'}</button>
            );
            const eq = rowEquation(s, it.chips);
            return (
              <div key={r.id} className="rounded-2xl border border-[var(--line)] p-3">
                <p className="text-xs font-semibold text-[var(--ink-3)]">{r.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-base">
                  {slotBtn('a')}<span>× x +</span>{slotBtn('b')}<span>× y =</span>{slotBtn('c')}
                </div>
                {eq && <p className="mt-1 font-mono text-sm text-[var(--ink-2)]">อ่านว่า: {linText(eq)}</p>}
                {rowMsg[r.id] && <p className={`mt-1 text-sm ${rowMsg[r.id].ok ? 'text-[var(--ok)]' : 'text-[var(--ink)]'}`} role="status" data-testid={`row-msg-${r.id}`}>{rowMsg[r.id].ok ? '✓ ตรงกับโจทย์' : `✗ ${rowMsg[r.id].text}`}</p>}
              </div>
            );
          })}
          <button type="button" className={PRIMARY} onClick={checkRows} disabled={it.rows.some((r) => !rowEquation(rows[r.id], it.chips))}>ตรวจสมการ</button>
        </div>
      )}

      {stage === 'solve' && (
        <div className="space-y-2">
          <ul className="font-mono text-base" aria-label="ระบบสมการที่คุณสร้าง">{it.rows.map((r) => <li key={r.id}>{linText(r.expect)} <span className="font-sans text-xs text-[var(--ink-3)]">({r.label})</span></li>)}</ul>
          {!done && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); solve(); }}>
              <label className="text-sm"><span className="block font-semibold">ขั้น 3: x =</span><input inputMode="decimal" value={xs} onChange={(e) => setXs(e.target.value)} className="mt-1 min-h-[44px] w-24 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" /></label>
              <label className="text-sm"><span className="block font-semibold">y =</span><input inputMode="decimal" value={ys} onChange={(e) => setYs(e.target.value)} className="mt-1 min-h-[44px] w-24 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" /></label>
              <button type="submit" className={PRIMARY}>ตรวจทั้งสองสมการ</button>
            </form>
          )}
          {xs.trim() !== '' && ys.trim() !== '' && !Number.isNaN(x) && !Number.isNaN(y) && (
            <ul className="space-y-1 font-mono text-sm" aria-live="polite" data-testid="story-lights">
              {it.rows.map((r) => <li key={r.id} className={`rounded-xl border px-3 py-2 ${holds(r.expect, x, y) ? 'border-[var(--ok)] bg-[var(--ok-soft)]' : 'border-[var(--line)]'}`}>{linText(r.expect)} → {r.expect.a * x + r.expect.b * y} {holds(r.expect, x, y) ? '✓ จริง' : `≠ ${r.expect.c} ✗ เท็จ`}</li>)}
            </ul>
          )}
        </div>
      )}
      {msg && <Feedback tone="try" title="ลองดูอีกที">{msg}</Feedback>}
      <MechanicFooter result={result} hint={it.hint} explanation={it.explanation} onHint={onHint} onReveal={onReveal} canReveal={result.attempts >= 2} />
    </div>
  );
}
