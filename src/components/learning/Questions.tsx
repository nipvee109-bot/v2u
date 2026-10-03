import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lightbulb, X, Eye } from 'lucide-react';
import type { ChoiceInteraction, CodeInteraction, LabInteraction, OrderInteraction, SelfCheckInteraction, StepResult, TypedInteraction } from '../../interactive/types';
import { checkChoice, checkCode, checkOrder, checkTyped, labOutput, normalizeCode, scrambled, wrongFeedbackFor } from '../../interactive/engine';

/* Interaction widgets. Each reports through onAnswer(correct) / onHint() / onReveal();
   the engine owns the state, so a widget can be swapped per subject. */

interface Props<I> {
  interaction: I;
  result: StepResult;
  /** Theme-specific success line, e.g. "⚔️ CRITICAL HIT!" */
  successTitle?: string;
  onAnswer: (correct: boolean) => void;
  onHint: () => void;
  onReveal: () => void;
}

export function Feedback({ tone, title, children }: { tone: 'good' | 'try'; title: string; children?: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 rounded-2xl border p-4 text-sm animate-in fade-in slide-in-from-bottom-1 duration-200 ${
        tone === 'good' ? 'border-[var(--ok-soft)] bg-[var(--ok-soft)] text-[var(--ink)]' : 'border-[var(--rev-soft)] bg-[var(--rev-soft)] text-[var(--ink)]'
      }`}
    >
      <p className="flex items-center gap-2 font-bold">
        {tone === 'good' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {title}
      </p>
      {children && <div className="mt-1.5 leading-relaxed">{children}</div>}
    </div>
  );
}

function HintBox({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-start gap-2 rounded-xl bg-white/70 p-2.5 text-sm text-[var(--ink)]">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rev)]" />
      <span>{text}</span>
    </p>
  );
}

export function ChoiceQuestion({ interaction: i, result, onAnswer, successTitle }: Props<ChoiceInteraction>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const choose = (k: number) => {
    if (result.solved) return;
    setPicked(k);
    const ok = checkChoice(i, k);
    if (!ok) setWrong((w) => (w.includes(k) ? w : [...w, k]));
    onAnswer(ok);
  };
  const lastWrong = picked !== null && !result.solved && wrong.includes(picked);
  return (
    <div>
      <p className="text-base font-semibold text-ink">{i.prompt}</p>
      <div role="group" aria-label={i.prompt} className="mt-3 grid gap-2">
        {i.choices.map((c, k) => {
          const isRight = result.solved && k === i.correctIndex;
          const isWrong = wrong.includes(k);
          return (
            <button
              key={c}
              type="button"
              onClick={() => choose(k)}
              disabled={result.solved || isWrong}
              aria-pressed={picked === k}
              className={`flex min-h-[52px] items-center gap-3 rounded-2xl border-2 px-4 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                isRight
                  ? 'border-emerald-500 bg-[var(--ok-soft)] text-[var(--ink)]'
                  : isWrong
                    ? 'border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--ink-3)] line-through'
                    : 'border-[var(--line-2)] bg-[var(--surface)] text-ink hover:border-brand-300 hover:bg-[var(--brand-soft)]'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isRight ? 'bg-[var(--ok-soft)]0 text-white' : 'bg-[var(--surface-3)] text-[var(--ink-2)]'
                }`}
              >
                {isRight ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + k)}
              </span>
              <span className="break-words">{c}</span>
            </button>
          );
        })}
      </div>
      {result.solved && <Feedback tone="good" title={successTitle ?? 'ถูกต้อง'}>{i.explanation}</Feedback>}
      {lastWrong && (
        <Feedback tone="try" title="ยังไม่ใช่ — ลองอีกครั้งได้เลย">
          <HintBox text={i.hint} />
        </Feedback>
      )}
    </div>
  );
}

export function TypedQuestion({ interaction: i, result, onAnswer, onReveal, successTitle }: Props<TypedInteraction>) {
  const [value, setValue] = useState('');
  const [lastWrong, setLastWrong] = useState(false);
  const [targeted, setTargeted] = useState<string | undefined>();
  const submit = () => {
    if (!value.trim() || result.solved) return;
    const ok = checkTyped(i, value);
    setLastWrong(!ok);
    setTargeted(ok ? undefined : wrongFeedbackFor(i, value));
    onAnswer(ok);
  };
  const id = `typed-${i.prompt.length}-${i.accept[0]}`;
  return (
    <div>
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {i.prompt}
      </label>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {i.inputLabel && <span className="font-mono text-lg font-semibold text-ink">{i.inputLabel}</span>}
        <input
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setLastWrong(false);
          }}
          disabled={result.solved}
          inputMode="text"
          autoComplete="off"
          aria-label={i.inputLabel ? `${i.prompt} ${i.inputLabel}` : i.prompt}
          className="min-h-[52px] w-32 rounded-2xl border-2 border-[var(--line-2)] bg-[var(--surface)] px-4 font-mono text-lg text-ink outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-brand-100 disabled:bg-[var(--ok-soft)]"
        />
        <button
          type="submit"
          disabled={result.solved || !value.trim()}
          className="min-h-[52px] rounded-2xl bg-[var(--brand)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-hi)] disabled:bg-[var(--surface-3)] disabled:text-[var(--ink-3)]"
        >
          ตรวจคำตอบ
        </button>
      </form>
      {result.solved && (
        <Feedback tone="good" title={successTitle ?? 'เยี่ยม ถูกต้อง'}>
          <p>{i.explanation}</p>
          <ol className="mt-2 space-y-0.5 font-mono text-[13px]">
            {i.workedSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Feedback>
      )}
      {!result.solved && lastWrong && (
        <Feedback tone="try" title="ยังไม่ใช่ — ไม่เป็นไร ลองใหม่ได้">
          {targeted && <p className="font-medium" data-testid="targeted-feedback">{targeted}</p>}
          <HintBox text={i.hint} />
        </Feedback>
      )}
      {!result.solved && result.attempts > 0 && (
        <div className="mt-3">
          {result.revealed ? (
            <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--surface-2)] p-4 text-sm">
              <p className="font-semibold text-ink">วิธีทำทีละขั้น</p>
              <ol className="mt-1.5 space-y-0.5 font-mono text-[13px] text-[var(--ink-2)]">
                {i.workedSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-[var(--ink-3)]">ลองพิมพ์คำตอบอีกครั้ง หรือไปต่อแล้ว V2U จะนับจุดนี้เป็นเรื่องที่ควรทบทวน</p>
            </div>
          ) : (
            <button type="button" onClick={onReveal} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[var(--brand-ink)]">
              <Eye className="h-4 w-4" /> ดูวิธีทำทีละขั้น
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function OrderQuestion({ interaction: i, result, onAnswer }: Props<OrderInteraction>) {
  const [order, setOrder] = useState(() => scrambled(i.items));
  const [lastWrong, setLastWrong] = useState(false);
  const move = (k: number, d: -1 | 1) => {
    const j = k + d;
    if (j < 0 || j >= order.length || result.solved) return;
    const next = [...order];
    [next[k], next[j]] = [next[j], next[k]];
    setOrder(next);
    setLastWrong(false);
  };
  const submit = () => {
    const ok = checkOrder(i, order);
    setLastWrong(!ok);
    onAnswer(ok);
  };
  const shown = result.solved ? i.items : order;
  return (
    <div>
      <p className="text-base font-semibold text-ink">{i.prompt}</p>
      <ol className="mt-3 space-y-2">
        {shown.map((item, k) => (
          <li
            key={item}
            className={`flex min-h-[52px] items-center gap-3 rounded-2xl border-2 px-3 ${
              result.solved ? 'border-emerald-300 bg-[var(--ok-soft)]' : 'border-[var(--line-2)] bg-[var(--surface)]'
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-bold text-[var(--ink-2)]">{k + 1}</span>
            <span className="min-w-0 flex-1 font-mono text-sm text-ink break-words">{item}</span>
            {!result.solved && (
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(k, -1)} disabled={k === 0} aria-label={`เลื่อน “${item}” ขึ้น`} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-3)] hover:bg-[var(--surface-3)] disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(k, 1)} disabled={k === shown.length - 1} aria-label={`เลื่อน “${item}” ลง`} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-3)] hover:bg-[var(--surface-3)] disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!result.solved && (
        <button type="button" onClick={submit} className="mt-3 min-h-[48px] rounded-2xl bg-[var(--brand)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-hi)]">
          ตรวจลำดับ
        </button>
      )}
      {result.solved && <Feedback tone="good" title="ลำดับถูกต้อง">{i.explanation}</Feedback>}
      {!result.solved && lastWrong && (
        <Feedback tone="try" title="ยังไม่ใช่ลำดับนี้">
          <HintBox text={i.hint} />
        </Feedback>
      )}
    </div>
  );
}

export function SelfCheck({ interaction: i, result, onAnswer, onReveal }: Props<SelfCheckInteraction>) {
  const [open, setOpen] = useState(result.solved || result.revealed);
  return (
    <div>
      <p className="text-base font-semibold text-ink">{i.prompt}</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-[var(--line-2)] bg-[var(--surface)] px-5 text-sm font-bold text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]">
          <Eye className="h-4 w-4" /> เปิดเฉลย
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border border-[var(--line-2)] bg-[var(--surface-2)] p-4">
          <p className="text-xs font-semibold text-[var(--ink-3)]">เฉลย</p>
          <p className="mt-1 font-mono text-sm text-ink break-words">{i.answer}</p>
          {!result.solved && !result.revealed && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onAnswer(true)} className="min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
                ฉันทำได้ตรงกัน
              </button>
              <button type="button" onClick={onReveal} className="min-h-[44px] rounded-xl border border-slate-300 bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)]">
                ยังไม่ตรง
              </button>
            </div>
          )}
          {result.solved && <p className="mt-2 text-sm font-semibold text-[var(--ok)]">✓ บันทึกว่าทำได้</p>}
          {result.revealed && !result.solved && <p className="mt-2 text-sm text-[var(--rev)]">△ V2U จะนับเรื่องนี้ไว้ในสิ่งที่ควรทบทวน</p>}
        </div>
      )}
    </div>
  );
}

/** Fill the blank in a code template. Shows WHY a wrong answer fails when we know. */
export function CodeQuestion({ interaction: i, result, onAnswer, successTitle }: Props<CodeInteraction>) {
  const [value, setValue] = useState('');
  const [lastWrong, setLastWrong] = useState(false);
  const [targeted, setTargeted] = useState<string | undefined>();
  const [before, after] = i.template.split('____');
  const submit = () => {
    if (!value.trim() || result.solved) return;
    const ok = checkCode(i, value);
    setLastWrong(!ok);
    setTargeted(ok ? undefined : wrongFeedbackFor(i, value, normalizeCode));
    onAnswer(ok);
  };
  return (
    <div>
      <p className="text-base font-semibold text-ink">{i.prompt}</p>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="overflow-x-auto rounded-2xl bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-100">
          <pre className="whitespace-pre-wrap break-words">
            {before}
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setLastWrong(false);
              }}
              disabled={result.solved}
              aria-label="เติมโค้ดในช่องว่าง"
              autoComplete="off"
              spellCheck={false}
              className="mx-1 inline-block min-h-[44px] w-40 max-w-full rounded-lg border-2 border-[var(--rev)] bg-slate-800 px-2 font-mono text-amber-200 outline-none focus:border-amber-300 disabled:border-emerald-400 disabled:text-emerald-200"
            />
            {after}
          </pre>
        </div>
        <button
          type="submit"
          disabled={result.solved || !value.trim()}
          className="mt-3 min-h-[48px] rounded-2xl bg-[var(--brand)] px-5 text-sm font-bold text-white hover:bg-[var(--brand-hi)] disabled:bg-[var(--surface-3)] disabled:text-[var(--ink-3)]"
        >
          รันโค้ด
        </button>
      </form>
      {result.solved && <Feedback tone="good" title={successTitle ?? 'ถูกต้อง'}>{i.explanation}</Feedback>}
      {!result.solved && lastWrong && (
        <Feedback tone="try" title="บั๊กยังรอดอยู่ — ลองแก้อีกครั้ง">
          {targeted && <p className="font-medium" data-testid="targeted-feedback">{targeted}</p>}
          <HintBox text={i.hint} />
        </Feedback>
      )}
    </div>
  );
}

/** Variables → known formula → observe → answer. Solved only after experimenting AND answering. */
export function LabQuestion({ interaction: i, result, onAnswer, successTitle }: Props<LabInteraction>) {
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(i.variables.map((v) => [v.id, v.initial])));
  const [tried, setTried] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const out = labOutput(i, values);
  const q = i.question;
  const wrong = picked !== null && picked !== q.correctIndex && !result.solved;
  return (
    <div>
      <p className="text-base font-semibold text-ink">{i.prompt}</p>
      <div className="mt-3 grid gap-4 rounded-2xl border border-[var(--line-2)] bg-[var(--surface-2)] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-4">
          {i.variables.map((v) => (
            <label key={v.id} className="block">
              <span className="flex items-center justify-between text-sm font-semibold text-ink">
                {v.label}
                <span className="font-mono text-[var(--brand-ink)]">
                  {values[v.id]} {v.unit}
                </span>
              </span>
              <input
                type="range"
                min={v.min}
                max={v.max}
                step={v.step}
                value={values[v.id]}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [v.id]: Number(e.target.value) }));
                  setTried(true);
                }}
                aria-label={v.label}
                className="mt-2 h-11 w-full accent-[var(--color-brand-600)]"
              />
            </label>
          ))}
        </div>
        <output aria-live="polite" className="rounded-2xl bg-[var(--surface)] px-6 py-4 text-center shadow-xs" data-testid="lab-output">
          <span className="block text-xs font-semibold text-[var(--ink-3)]">{i.output.label}</span>
          <span className="block font-mono text-3xl font-bold text-ink">{Number.isInteger(out) ? out : out.toFixed(2)}</span>
          <span className="block text-xs text-[var(--ink-3)]">{i.output.unit}</span>
          {/* visual: bar grows with the result */}
          <span className="mt-2 block h-2 w-28 overflow-hidden rounded-full bg-[var(--surface-3)]" aria-hidden="true">
            <span className="block h-full rounded-full bg-[var(--brand-soft)]0 transition-[width]" style={{ width: `${Math.min(100, out * 2.5)}%` }} />
          </span>
        </output>
      </div>
      {!tried && !result.solved && <p className="mt-2 text-xs text-[var(--ink-3)]">ลองเลื่อนค่าก่อน แล้วค่อยตอบคำถาม</p>}
      <p className="mt-4 text-base font-semibold text-ink">{q.prompt}</p>
      <div role="group" aria-label={q.prompt} className="mt-2 grid gap-2 sm:grid-cols-2">
        {q.choices.map((c, k) => (
          <button
            key={c}
            type="button"
            disabled={!tried || result.solved}
            aria-pressed={picked === k}
            onClick={() => {
              setPicked(k);
              onAnswer(k === q.correctIndex);
            }}
            className={`min-h-[52px] rounded-2xl border-2 px-4 text-left text-sm font-medium transition-colors disabled:opacity-60 ${
              result.solved && k === q.correctIndex ? 'border-emerald-500 bg-[var(--ok-soft)] text-[var(--ink)]' : picked === k && wrong ? 'border-[var(--rev)] bg-[var(--rev-soft)]' : 'border-[var(--line-2)] bg-[var(--surface)] hover:border-brand-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {result.solved && <Feedback tone="good" title={successTitle ?? 'ถูกต้อง'}>{q.explanation}</Feedback>}
      {wrong && (
        <Feedback tone="try" title="ยังไม่ใช่ — ลองเลื่อนค่าแล้วสังเกตอีกครั้ง">
          <HintBox text={q.hint} />
        </Feedback>
      )}
    </div>
  );
}
