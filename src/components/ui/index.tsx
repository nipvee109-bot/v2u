/* =========================================================================
   V2U UI primitives (Phase 52)
   -------------------------------------------------------------------------
   One spacing rhythm (4/8 px grid; sections 24–32 px apart), one type scale:
     eyebrow 12/600 · title 24–28/700 · section 16/700 · body 14 · meta 12
   Surfaces group related things — rows inside a group are divided, not boxed.
   ========================================================================= */

import { Link } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { LOOP_STAGES } from './loop';
import type { LoopStage } from './loop';

type Icon = ComponentType<{ className?: string }>;
const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/** Page wrapper: width + vertical rhythm. */
export function Screen({ children, width = 'md', className }: { children: ReactNode; width?: 'sm' | 'md' | 'lg'; className?: string }) {
  const w = width === 'sm' ? 'max-w-2xl' : width === 'md' ? 'max-w-3xl' : 'max-w-5xl';
  return <div className={cx('mx-auto w-full space-y-6 sm:space-y-8', w, className)}>{children}</div>;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  back,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-1 inline-flex min-h-[32px] items-center text-xs font-semibold text-brand-700 hover:underline">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="text-xs font-semibold text-brand-700">{eyebrow}</p>}
        <h1 className="mt-0.5 text-2xl font-bold leading-tight text-ink sm:text-[28px] break-words">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600 break-words">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  id,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cx('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h2 id={id} className="text-base font-bold text-ink">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Surface({
  children,
  tone = 'plain',
  className,
  padded = true,
  as: As = 'div',
  ...rest
}: {
  children: ReactNode;
  tone?: 'plain' | 'muted' | 'brand' | 'warn' | 'good';
  className?: string;
  padded?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const t = {
    plain: 'bg-white border border-slate-200/80',
    muted: 'bg-slate-50 border border-slate-200/60',
    brand: 'bg-brand-50 border border-brand-100',
    warn: 'bg-amber-50 border border-amber-200',
    good: 'bg-emerald-50 border border-emerald-200',
  }[tone];
  return (
    <As className={cx('rounded-2xl', t, padded && 'p-4 sm:p-5', className)} {...rest}>
      {children}
    </As>
  );
}

export function ProgressBar({
  value,
  target,
  label,
  tone = 'brand',
  size = 'md',
}: {
  value: number;
  target?: number;
  label?: string;
  tone?: 'brand' | 'good' | 'onDark';
  size?: 'sm' | 'md';
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === 'good' ? 'bg-emerald-500' : tone === 'onDark' ? 'bg-white' : 'bg-brand-600';
  const track = tone === 'onDark' ? 'bg-white/20' : 'bg-slate-100';
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={label ?? `${v}%`}
      className={cx('relative w-full overflow-hidden rounded-full', track, size === 'sm' ? 'h-1.5' : 'h-2.5')}
    >
      <div className={cx('h-full rounded-full transition-[width]', fill)} style={{ width: `${v}%` }} />
      {target !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-emerald-600" style={{ left: `${Math.min(100, target)}%` }} aria-hidden="true" />
      )}
    </div>
  );
}

/** Circular progress; `children` renders in the middle. */
export function ProgressRing({ value, size = 64, stroke = 7, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="stroke-brand-600"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">{children ?? `${v}%`}</div>
    </div>
  );
}

export function Stat({ label, value, hint, icon: I, tone = 'plain' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: Icon; tone?: 'plain' | 'warn' | 'good' }) {
  const ic = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-brand-600';
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {I && <I className={cx('h-4 w-4 shrink-0', ic)} />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500 break-words">{hint}</p>}
    </div>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'warn' | 'good' | 'onDark' }) {
  const t = {
    neutral: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-50 text-brand-700',
    warn: 'bg-amber-100 text-amber-800',
    good: 'bg-emerald-100 text-emerald-800',
    onDark: 'bg-white/15 text-white',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', t)}>{children}</span>;
}

const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-brand-700 border border-brand-200 hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  inverse: 'bg-white text-brand-800 hover:bg-brand-50 shadow-md',
};
const btnCls = (variant: keyof typeof BTN, block?: boolean) =>
  cx(
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200',
    BTN[variant],
    block && 'w-full'
  );

export function Button({
  children,
  onClick,
  variant = 'primary',
  block,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof BTN;
  block?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} onClick={onClick} className={btnCls(variant, block)}>
      {children}
    </button>
  );
}

export function ButtonLink({ to, children, variant = 'primary', block }: { to: string; children: ReactNode; variant?: keyof typeof BTN; block?: boolean }) {
  return (
    <Link to={to} className={btnCls(variant, block)}>
      {children}
    </Link>
  );
}

export function EmptyState({ icon: I, title, body, action }: { icon: Icon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <I className="h-6 w-6" />
      </span>
      <p className="mt-3 text-base font-bold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-600">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface RowItem {
  to: string;
  title: ReactNode;
  meta?: ReactNode;
  icon?: Icon;
  trailing?: ReactNode;
  /** Optional thin progress under the title (0–100). */
  progress?: number;
  key?: string;
}

/** A group of navigable rows inside ONE surface, separated by dividers. */
export function RowGroup({ items, label }: { items: RowItem[]; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      {items.map((it, i) => {
        const I = it.icon;
        return (
          <li key={it.key ?? `${it.to}|${i}`}>
            <Link
              to={it.to}
              className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-brand-50"
            >
              {I && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <I className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink break-words">{it.title}</span>
                {it.meta && <span className="mt-0.5 block text-xs text-slate-500 break-words">{it.meta}</span>}
                {it.progress !== undefined && (
                  <span className="mt-2 block">
                    <ProgressBar value={it.progress} size="sm" />
                  </span>
                )}
              </span>
              {it.trailing}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The V2U loop, shown wherever the student is in it:
 * วันนี้ → เรียน → เช็ก → ปรับขั้นต่อไป
 */


export function LoopStrip({ current, onDark = false }: { current: LoopStage; onDark?: boolean }) {
  const idx = LOOP_STAGES.findIndex((s) => s.id === current);
  return (
    <ol aria-label="ขั้นตอนการเรียนของ V2U" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold">
      {LOOP_STAGES.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'now' : 'next';
        const cls = onDark
          ? state === 'now'
            ? 'bg-white text-brand-800'
            : state === 'done'
              ? 'text-white'
              : 'text-white/60'
          : state === 'now'
            ? 'bg-brand-600 text-white'
            : state === 'done'
              ? 'text-brand-700'
              : 'text-slate-400';
        return (
          <li key={s.id} className="flex items-center gap-1.5" aria-current={state === 'now' ? 'step' : undefined}>
            <span className={cx('rounded-full px-2 py-0.5', cls)}>{s.label}</span>
            {i < LOOP_STAGES.length - 1 && <span className={onDark ? 'text-white/50' : 'text-slate-300'} aria-hidden="true">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Segmented bar of a time plan: each segment's width = its minutes. */
export function PlanBar({ segments, onDark = false }: { segments: { label: string; minutes: number }[]; onDark?: boolean }) {
  const total = segments.reduce((s, x) => s + x.minutes, 0) || 1;
  const colors = onDark ? ['bg-white', 'bg-white/70', 'bg-white/45', 'bg-white/30', 'bg-white/20', 'bg-white/15'] : ['bg-brand-600', 'bg-brand-500', 'bg-sky-400', 'bg-emerald-500', 'bg-amber-400', 'bg-slate-400'];
  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {segments.map((s, i) => (
          <div key={i} className={cx('h-full', colors[i % colors.length])} style={{ width: `${(s.minutes / total) * 100}%` }} />
        ))}
      </div>
      <ul className={cx('mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs', onDark ? 'text-white/85' : 'text-slate-600')}>
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className={cx('h-2 w-2 rounded-full', colors[i % colors.length])} aria-hidden="true" />
            {s.label} {s.minutes} นาที
          </li>
        ))}
      </ul>
    </div>
  );
}
