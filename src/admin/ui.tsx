/* Small accessible admin UI primitives (Phase 72). */

import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

export const btn = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
export const btnLine = `${btn} border border-[var(--line)] bg-[var(--surface)]`;
export const btnPrimary = `${btn} text-white bg-[#1a2490]`;
export const btnDanger = `${btn} text-white bg-[#b42318]`;
export const field = 'min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm';
export const panel = 'rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4';

/** Label + one control, explicitly associated (for/id) with the hint as its description. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const auto = useId();
  type Ctl = ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  const id = isValidElement(children) ? ((children as Ctl).props.id ?? auto) : auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const control = isValidElement(children) ? cloneElement(children as Ctl, { id, 'aria-describedby': hintId }) : children;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="font-semibold">{label}</label>
      {control}
      {hint && <span id={hintId} className="text-xs text-[var(--ink-2)]">{hint}</span>}
    </div>
  );
}

/** A visible, explicit notice (not colour-only): warnings before saving, stale-copy alerts. */
export function Notice({ tone = 'warn', children, id }: { tone?: 'warn' | 'info'; children: ReactNode; id?: string }) {
  return (
    <p id={id} role={tone === 'warn' ? 'note' : undefined} className={`rounded-xl border px-3 py-2 text-sm ${tone === 'warn' ? 'border-[#b54708] bg-[#fffaeb] text-[#7a2e0e]' : 'border-[var(--line)] bg-[var(--surface-2,#eef0ff)]'}`}>
      <span aria-hidden>{tone === 'warn' ? '⚠ ' : 'ℹ '}</span>{children}
    </p>
  );
}

export function StateBadge({ value }: { value: string }) {
  const tone = /PUBLISHED|VERIFIED|AVAILABLE|ACTIVE|APPROVED/.test(value) ? '#0b7a3e' : /REJECTED|ERROR|DISABLED|SUSPENDED|UNAVAILABLE|DEPRECATED/.test(value) ? '#b42318' : '#5b6170';
  return (
    <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ color: tone, borderColor: tone }}>
      {value}
    </span>
  );
}

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<unknown> | void;
}

/** Confirmation for dangerous actions (native modal dialog: focus trap + Esc to cancel). */
export function ConfirmDialog({ req, onClose }: { req: ConfirmRequest | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (req && !d.open) d.showModal();
    if (!req && d.open) d.close();
  }, [req]);
  return (
    <dialog ref={ref} aria-labelledby="confirm-h" className="m-auto w-[min(92vw,440px)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--ink)] backdrop:bg-black/50" onClose={onClose}>
      {req && (
        <div className="flex flex-col gap-3">
          <h2 id="confirm-h" className="text-lg font-bold">{req.title}</h2>
          <p className="text-sm">{req.body}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btnLine} onClick={onClose} autoFocus>ยกเลิก</button>
            <button
              type="button"
              className={req.danger ? btnDanger : btnPrimary}
              onClick={async () => {
                await req.run();
                onClose();
              }}
            >
              {req.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function UpDown({ label, index, count, onMove, disabled }: { label: string; index: number; count: number; onMove: (from: number, to: number) => void; disabled?: boolean }) {
  return (
    <span className="inline-flex gap-1">
      <button type="button" className={btnLine} aria-label={`เลื่อน ${label} ขึ้น`} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)}>↑</button>
      <button type="button" className={btnLine} aria-label={`เลื่อน ${label} ลง`} disabled={disabled || index === count - 1} onClick={() => onMove(index, index + 1)}>↓</button>
    </span>
  );
}

export const move = <T,>(list: T[], from: number, to: number) => {
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
};
