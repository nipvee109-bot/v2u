/* System states (V2U design reference: loading / error / offline). Visual only. */
import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Skeleton page while a route chunk loads (shimmer is disabled by prefers-reduced-motion). */
export function PageSkeleton() {
  const bar = 'rounded-lg bg-[linear-gradient(90deg,var(--skel)_0%,var(--skel-hi)_50%,var(--skel)_100%)] bg-[length:200%_100%] motion-safe:animate-[v2uShimmer_1.4s_linear_infinite]';
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5" aria-live="polite" aria-busy="true" data-testid="page-skeleton">
      <div className={`h-4 w-40 ${bar}`} />
      <div className={`h-8 w-72 max-w-full ${bar}`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className={`h-56 rounded-3xl ${bar}`} />
        <div className="space-y-3">
          <div className={`h-24 rounded-2xl ${bar}`} />
          <div className={`h-24 rounded-2xl ${bar}`} />
        </div>
      </div>
      <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ink-3)' }}>
        <span className="inline-block motion-safe:animate-[v2uSpin_1.2s_linear_infinite]"><RefreshCw className="h-4 w-4" aria-hidden="true" /></span> กำลังโหลดข้อมูล...
      </p>
    </div>
  );
}

/** Error state for a page that failed to render — data in storage is untouched. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl px-5 py-9 text-center" style={{ background: 'var(--surface)', border: '1px solid color-mix(in oklab, var(--err) 35%, transparent)' }} data-testid="page-error">
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--err-soft)] text-[var(--err)]">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="font-display text-[21px] font-bold text-[var(--ink)]">หน้านี้แสดงผลไม่สำเร็จ</p>
        <p className="max-w-[42ch] text-sm text-[var(--ink-2)]">ข้อมูลการเรียนของคุณยังอยู่ครบในเครื่อง ลองโหลดหน้าใหม่อีกครั้ง</p>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] bg-[var(--brand)] px-5 font-bold text-[var(--on-brand)]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> ลองใหม่
        </button>
      </div>
    );
  }
}
