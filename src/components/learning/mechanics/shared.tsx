import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { Feedback } from '../Questions';
import type { StepResult } from '../../../interactive/types';
import { GHOST } from './ui';

/* Shared parts of the P0 per-lesson mechanics. Evidence goes only through onAnswer / onHint / onReveal
   (the existing player reducer) — nothing here decides mastery, review or the next step. */

/** Hint → (after a wrong try) reveal; success / reveal messages. */
export function MechanicFooter({ result, hint, explanation, onHint, onReveal, canReveal, revealLabel = 'ดูวิธีคิด' }: { result: StepResult; hint: string; explanation: string; onHint: () => void; onReveal: () => void; canReveal: boolean; revealLabel?: string }) {
  const done = result.solved || result.revealed;
  return (
    <div className="space-y-2">
      {!done && (
        <div className="flex flex-wrap gap-2">
          {!result.hintShown && <button type="button" className={GHOST} onClick={onHint}><Lightbulb className="h-4 w-4" aria-hidden="true" /> ขอคำใบ้</button>}
          {result.hintShown && canReveal && <button type="button" className={GHOST} onClick={onReveal}>{revealLabel}</button>}
        </div>
      )}
      {!done && result.hintShown && <p className="rounded-xl bg-[var(--rev-soft)] px-3 py-2 text-sm" data-testid="mechanic-hint">คำใบ้: {hint}</p>}
      {result.solved && <Feedback tone="good" title="สิ่งที่เกิดขึ้นเมื่อกี้">{explanation}</Feedback>}
      {result.revealed && !result.solved && <Feedback tone="try" title="วิธีคิด">{explanation}</Feedback>}
    </div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="min-w-0 space-y-2">
      <p className="text-xs font-semibold text-[var(--ink-3)]">{label}</p>
      {children}
    </section>
  );
}
