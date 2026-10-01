import React from 'react';
import type { PlannedVsActualPoint } from '../../types';
import { Target, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface PlannedVsActualChartProps {
  points: PlannedVsActualPoint[];
  totalPlannedHours: number;
  totalActualHours: number;
  overallAdherencePercent: number;
}

export const PlannedVsActualChart: React.FC<PlannedVsActualChartProps> = ({
  points,
  totalPlannedHours,
  totalActualHours,
  overallAdherencePercent,
}) => {
  // Focus on days that have either planned or actual time
  const activeDays = points.filter((p) => p.plannedMinutes > 0 || p.actualMinutes > 0);
  const displayDays = activeDays.length > 0 ? activeDays.slice(-14) : points.slice(-7);

  // Max hours among displayed
  const maxHours = Math.max(3, ...displayDays.map((d) => Math.max(d.plannedHours, d.actualHours)));

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-600" />
            การทำตามแผน (Planned vs. Actual Study Time)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ตอบคำถาม: ฉันทำตามแผนที่วางไว้ได้จริงกี่เปอร์เซ็นต์? วินัยการอ่านเป็นอย่างไร?
          </p>
        </div>

        {/* Adherence Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
              overallAdherencePercent >= 80
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : overallAdherencePercent >= 50
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {overallAdherencePercent >= 80 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>ทำได้ตามแผน {overallAdherencePercent}%</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <span className="text-xs text-slate-500 block">เวลาที่วางแผนไว้ (Planned)</span>
          <span className="text-xl font-bold text-slate-800">{totalPlannedHours} ชม.</span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <span className="text-xs text-slate-500 block">เวลาที่เรียนจริง (Actual)</span>
          <span className="text-xl font-bold text-blue-600">{totalActualHours} ชม.</span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <span className="text-xs text-slate-500 block">ความคลาดเคลื่อน (Variance)</span>
          <span
            className={`text-xl font-bold ${
              totalActualHours >= totalPlannedHours ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {totalActualHours >= totalPlannedHours ? '+' : ''}
            {(totalActualHours - totalPlannedHours).toFixed(1)} ชม.
          </span>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>เปรียบเทียบรายวัน (ล่าสุด {displayDays.length} วัน)</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-slate-300" />
              <span>แผน (Planned)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs bg-blue-600" />
              <span>จริง (Actual)</span>
            </span>
          </div>
        </div>

        <div className="flex items-end gap-2 h-36 w-full overflow-x-auto pb-1 px-1">
          {displayDays.map((day) => {
            const plannedHeight = maxHours > 0 ? (day.plannedHours / maxHours) * 100 : 0;
            const actualHeight = maxHours > 0 ? (day.actualHours / maxHours) * 100 : 0;

            return (
              <div
                key={day.date}
                className="flex-1 min-w-[28px] max-w-[56px] h-full flex flex-col items-center justify-end group relative"
              >
                {/* Two side-by-side bars */}
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  {/* Planned Bar */}
                  <div
                    className="w-1/2 rounded-t-sm bg-slate-200 group-hover:bg-slate-300 transition-colors"
                    style={{ height: `${Math.max(2, plannedHeight)}%` }}
                    title={`แผน: ${day.plannedHours} ชม.`}
                  />

                  {/* Actual Bar */}
                  <div
                    className={`w-1/2 rounded-t-sm transition-colors ${
                      day.actualHours >= day.plannedHours && day.plannedHours > 0
                        ? 'bg-emerald-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ height: `${Math.max(2, actualHeight)}%` }}
                    title={`จริง: ${day.actualHours} ชม.`}
                  />
                </div>

                {/* Date Label */}
                <span className="mt-1 text-[10px] text-slate-500 font-medium">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200/60">
        <TrendingUp className="h-4 w-4 shrink-0 text-blue-600" />
        <span>
          {overallAdherencePercent >= 80
            ? 'ยอดเยี่ยมมาก! คุณรักษาวินัยการอ่านได้ตามตารางที่วางไว้สม่ำเสมอ'
            : overallAdherencePercent >= 50
            ? 'วินัยอยู่ในเกณฑ์ปานกลาง ลองปรับลดเวลาต่อเซสชันลงเล็กน้อยเพื่อให้ทำตามได้ง่ายขึ้น'
            : 'มีเซสชันที่ยังไม่สำเร็จตามแผน ลองใช้ฟังก์ชันเลื่อนแผน (Reschedule) เพื่อไม่ให้สะสม'}
        </span>
      </div>
    </div>
  );
};
