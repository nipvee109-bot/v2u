import React from 'react';
import { WifiOff, Wifi, ShieldCheck, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  if (!isOnline) {
    return (
      <div 
        role="status"
        aria-live="assertive"
        className="bg-rev-soft border-b border-rev/20 text-ink text-xs px-4 py-2 flex items-center justify-between transition-all z-50"
      >
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <WifiOff className="w-4 h-4 shrink-0 text-rev" aria-hidden="true" />
          <span className="font-medium">
            <strong>โหมดออฟไลน์:</strong> ระบบตรวจพบว่าไม่มีสัญญาณอินเทอร์เน็ต &mdash; ข้อมูลโน้ต เวลาเรียน และความคืบหน้าจะถูกบันทึกลงในเครื่อง (Local Storage) อย่างปลอดภัย 100%
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[36px] items-center gap-1 px-3 py-1 bg-white border border-rev/25 hover:bg-rev-soft rounded-lg text-rev font-semibold text-[11px] transition shrink-0 ml-3 cursor-pointer"
          title="ลองเชื่อมต่อใหม่"
        >
          <RefreshCw className="w-3 h-3" />
          <span>ตรวจสอบสัญญาณ</span>
        </button>
      </div>
    );
  }

  // When back online after being offline
  return (
    <div 
      role="status"
      aria-live="polite"
      className="bg-ok-soft border-b border-ok/20 text-ink text-xs px-4 py-1.5 flex items-center justify-center gap-2 transition-all z-50"
    >
      <Wifi className="w-4 h-4 text-ok" aria-hidden="true" />
      <span className="font-medium">
        กลับมาเชื่อมต่ออินเทอร์เน็ตแล้ว &mdash; ข้อมูลทั้งหมดปลอดภัยและพร้อมใช้งาน
      </span>
      <ShieldCheck className="w-4 h-4 text-ok" aria-hidden="true" />
    </div>
  );
};
