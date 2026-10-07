import type { StepResult } from '../../../interactive/types';

/* Styles and props shared by the P0 per-lesson mechanics (kept out of .tsx for fast refresh). */

export const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-50';
export const PRIMARY = `${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-hi)]`;
export const GHOST = `${BTN} border border-[var(--line-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]`;
export const PICK = (on: boolean) => `${BTN} border ${on ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'border-[var(--line-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]'}`;
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface MechanicProps<I> {
  interaction: I;
  result: StepResult;
  onAnswer: (correct: boolean) => void;
  onHint: () => void;
  onReveal: () => void;
}
