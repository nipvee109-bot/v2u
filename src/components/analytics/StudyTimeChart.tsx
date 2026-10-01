import React, { useState } from 'react';
import type { DailyStudyPoint } from '../../types';
import { Clock } from 'lucide-react';

interface StudyTimeChartProps {
  data: DailyStudyPoint[];
  averageDailyHours: number;
  onSelectDay: (day: DailyStudyPoint) => void;
}

export const StudyTimeChart: React.FC<StudyTimeChartProps> = ({
  data,
  averageDailyHours,
  onSelectDay,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DailyStudyPoint | null>(null);

  // Maximum hours for scaling (at least 3h for clean visual room)
  const maxHours = Math.max(3, ...data.map((d) => d.hours));
  const avgPercent = maxHours > 0 ? (averageDailyHours / maxHours) * 100 : 0;

  return (
    <div className="card p-6 space-y-4">
      {/* Header & Purpose */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            เวลาเรียนรายวัน (Study Time Over Time)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ตอบคำถาม: ฉันอ่านหนังสือกี่ชั่วโมงในแต่ละวัน? มีความสม่ำเสมอหรือไม่?
          </p>
        </div>

        {/* Legend & Average Marker */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
            <span>เวลาเรียนจริง</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="h-0.5 w-3 border-t-2 border-dashed border-amber-500" />
            <span>เฉลี่ย: {averageDailyHours} ชม./วัน</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-6 pb-2">
        {/* Average Reference Line */}
        {avgPercent > 0 && avgPercent <= 100 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/80 z-10 pointer-events-none flex items-center justify-end pr-2"
            style={{ bottom: `calc(${avgPercent}% + 28px)` }}
          >
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
              Avg {averageDailyHours}h
            </span>
          </div>
        )}

        {/* Bars Container */}
        <div className="flex items-end gap-1.5 sm:gap-2 h-48 w-full overflow-x-auto pb-1 px-1">
          {data.map((day) => {
            const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
            const isZero = day.hours === 0;

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className="group relative flex-1 min-w-[20px] max-w-[48px] h-full flex flex-col items-center justify-end cursor-pointer transition-transform hover:scale-105"
              >
                {/* Value Label on Top */}
                {!isZero && (
                  <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0">
                    {day.hours}h
                  </span>
                )}

                {/* The Bar */}
                <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      day.isToday
                        ? 'bg-gradient-to-t from-blue-700 to-indigo-500 shadow-xs'
                        : isZero
                        ? 'bg-slate-200/50 h-1'
                        : day.isWeekend
                        ? 'bg-gradient-to-t from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500'
                    }`}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                  />
                </div>

                {/* Day label */}
                <span
                  className={`mt-1.5 text-[10px] font-medium truncate w-full text-center ${
                    day.isToday
                      ? 'text-blue-600 font-bold underline'
                      : day.isWeekend
                      ? 'text-slate-400 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {day.dayOfWeek}
                </span>

                {/* Tooltip on Hover */}
                {hoveredDay?.date === day.date && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-xl bg-slate-900 px-3 py-2 text-white shadow-xl text-xs whitespace-nowrap min-w-[120px]">
                    <div className="font-bold border-b border-white/10 pb-1 mb-1 text-[11px]">
                      {day.label} {day.isToday ? '(วันนี้)' : ''}
                    </div>
                    <div className="text-[11px] space-y-0.5 text-slate-300">
                      <div>เวลาเรียน: <span className="font-bold text-white">{day.hours} ชม.</span> ({day.minutes} นาที)</div>
                      <div>เซสชัน: <span className="font-bold text-white">{day.sessionsCount} ครั้ง</span></div>
                      {day.lessonsCompletedCount > 0 && (
                        <div className="text-emerald-400 font-medium">เรียนจบ {day.lessonsCompletedCount} บท</div>
                      )}
                    </div>
                    <div className="text-[9px] text-blue-300 mt-1">คลิกเพื่อดูรายการละเอียด &rarr;</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <span>💡 คลิกที่แท่งกราฟวันใดก็ได้เพื่อดูบทเรียนและเซสชันอย่างละเอียด</span>
        <span>{data.filter((d) => d.hours > 0).length} จาก {data.length} วันที่มีการเรียน</span>
      </div>
    </div>
  );
};
