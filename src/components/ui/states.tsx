/* System states (V2U design reference: loading / error / offline). Visual only. */
import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Skeleton page while a route chunk loads (shimmer is disabled by prefers-reduced-motion). */
export function PageSkeleton() {
  const bar = 'rounded-lg bg-[linear-gradient(90deg,#e9ecf5_0%,#f5f6fb_50%,#e9ecf5_100%)] bg-[length:200%_100%] motion-safe:animate-[v2uShimmer_1.4s_linear_infinite]';
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 lg:max-w-6xl" aria-live="polite" aria-busy="true" data-testid="page-skeleton">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className={`h-4 w-40 ${bar}`} />
      <div className={`h-8 w-72 max-w-full ${bar}`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className={`h-56 rounded-3xl ${bar}`} />
        <div className="space-y-3">
          <div className={`h-24 rounded-2xl ${bar}`} />
          <div className={`h-24 rounded-2xl ${bar}`} />
        </div>
      </div>
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
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-err/20 bg-white px-6 py-10 text-center shadow-card" data-testid="page-error">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-err-soft text-err">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-ink">หน้านี้แสดงผลไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-ink-3">ข้อมูลการเรียนของคุณยังอยู่ครบในเครื่อง ลองโหลดหน้าใหม่อีกครั้ง</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand-600 px-5 font-display text-sm font-bold text-white hover:bg-brand-700">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> ลองใหม่
        </button>
      </div>
    );
  }
}
