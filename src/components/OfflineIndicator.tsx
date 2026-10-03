import React, { useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { KIcon } from './v2u/kit';
import type { IconName } from './v2u/kit';

/**
 * Network banner (design reference NET states): connecting · offline · back online.
 * V2U keeps everything in this device's storage, so nothing is lost while offline.
 */
export const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [checking, setChecking] = useState(false);

  if (isOnline && !wasOffline && !checking) return null;

  const state: { k: IconName; title: string; text: string; ok?: boolean; spin?: boolean; can?: string; cant?: string; retry?: boolean } = checking
    ? { k: 'refresh', title: 'กำลังเชื่อมต่อ…', text: 'ใช้งานต่อได้ตามปกติ ข้อมูลทั้งหมดอยู่ในเครื่องนี้', spin: true }
    : !isOnline
      ? { k: 'wifiOff', title: 'ตอนนี้ออฟไลน์อยู่', text: 'โน้ต เวลาเรียน และความคืบหน้าบันทึกในเครื่องนี้ตามปกติ', can: 'บทที่เปิดไว้แล้ว · โน้ต · ทบทวนที่ถึงรอบ', cant: 'ดูคลิป · เปิดแหล่งเรียนภายนอก', retry: true }
      : { k: 'check', title: 'กลับมาออนไลน์แล้ว', text: 'ข้อมูลทั้งหมดอยู่ครบ ใช้งานได้ทุกอย่าง', ok: true };

  return (
    <div className="px-4 pt-3 lg:px-8" data-testid="network-banner" data-state={checking ? 'connecting' : !isOnline ? 'offline' : 'recovered'}>
      <div
        role="status"
        aria-live={!isOnline ? 'assertive' : 'polite'}
        className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-3 rounded-2xl px-3.5 py-3"
        style={{ background: state.ok ? 'var(--ok-soft)' : 'var(--surface)', border: state.ok ? '1px solid transparent' : '1px solid var(--line-2)', boxShadow: 'var(--shadow)', animation: 'v2uIn .25s ease both' }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: state.ok ? 'var(--ok)' : 'var(--none-soft)', color: state.ok ? '#fff' : 'var(--ink-2)' }}>
          <KIcon name={state.k} size={18} style={state.spin ? { animation: 'v2uSpin 1.2s linear infinite' } : undefined} />
        </span>
        <div className="min-w-0 flex-[1_1_220px]">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{state.title}</p>
          <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{state.text}</p>
          {state.can && (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
              <span className="inline-flex items-center gap-1"><span style={{ color: 'var(--ok)' }}><KIcon name="check" size={12} w={2.4} /></span> ใช้ได้: {state.can}</span>
              <span className="inline-flex items-center gap-1"><span style={{ color: 'var(--err)' }}><KIcon name="x" size={12} w={2.4} /></span> ต้องออนไลน์: {state.cant}</span>
            </p>
          )}
        </div>
        {state.retry && (
          <button
            type="button"
            onClick={() => {
              setChecking(true);
              window.setTimeout(() => window.location.reload(), 600);
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold"
            style={{ border: '1px solid var(--line-2)', color: 'var(--ink)', background: 'var(--surface)' }}
          >
            <KIcon name="refresh" size={16} /> ลองใหม่
          </button>
        )}
      </div>
    </div>
  );
};
