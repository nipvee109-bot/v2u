import React from 'react';
import type { SubjectAllocationItem, SubjectId } from '../../types';
import { PieChart, AlertTriangle } from 'lucide-react';

interface SubjectDistributionChartProps {
  data: SubjectAllocationItem[];
  totalStudyHours: number;
  onSelectSubject: (subjectId: SubjectId) => void;
}

const SUBJECT_BAR_COLORS: Record<SubjectId, string> = {
  math: 'bg-blue-600',
  programming: 'bg-emerald-500',
  physics: 'bg-orange-500',
  tgat3: 'bg-purple-500',
  ai: 'bg-rose-500',
};

export const SubjectDistributionChart: React.FC<SubjectDistributionChartProps> = React.memo(({
  data,
  totalStudyHours,
  onSelectSubject,
}) => {
  // Check for potentially neglected subjects (< 5% of total time when total study > 10 hours)
  const isHighVolume = totalStudyHours >= 10;
  const neglectedSubjects = isHighVolume ? data.filter((s) => s.percentage < 5) : [];

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" />
            การกระจายตัวตามวิชา (Subject Allocation & Balance)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ตอบคำถาม: ฉันเทเวลาให้วิชาไหนมากที่สุด? มีวิชาใดถูกละเลยหรือไม่?
          </p>
        </div>

        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
          รวม {totalStudyHours} ชม.
        </span>
      </div>

      {/* Proportional Stacked Bar */}
      <div className="space-y-1.5">
        <div className="h-4 w-full rounded-xl bg-slate-100 overflow-hidden flex shadow-2xs">
          {data.map((sub) => {
            if (sub.percentage === 0) return null;
            return (
              <div
                key={sub.subjectId}
                onClick={() => onSelectSubject(sub.subjectId)}
                className={`h-full ${
                  SUBJECT_BAR_COLORS[sub.subjectId] || 'bg-slate-400'
                } hover:opacity-85 transition-all cursor-pointer relative group`}
                style={{ width: `${sub.percentage}%` }}
                title={`${sub.name}: ${sub.percentage}% (${sub.hours} ชม.)`}
              />
            );
          })}
        </div>

        {/* Legend dots */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
          {data.map((sub) => (
            <button
              key={sub.subjectId}
              onClick={() => onSelectSubject(sub.subjectId)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${SUBJECT_BAR_COLORS[sub.subjectId]}`} />
              <span className="font-medium text-[11px]">
                {sub.name} <span className="text-slate-400">({sub.percentage}%)</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {data.map((sub) => (
          <div
            key={sub.subjectId}
            onClick={() => onSelectSubject(sub.subjectId)}
            className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                {sub.name}
              </span>
              <span className={`h-2 w-2 rounded-full ${SUBJECT_BAR_COLORS[sub.subjectId]}`} />
            </div>

            <div className="text-lg font-bold text-slate-900">
              {sub.hours} <span className="text-xs font-normal text-slate-500">ชม.</span>
            </div>

            <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
              <div>จบแล้ว: <span className="font-semibold text-slate-700">{sub.lessonsCount} บท</span></div>
              {sub.avgQuizScore !== undefined ? (
                <div>Quiz: <span className="font-semibold text-amber-700">{sub.avgQuizScore}%</span></div>
              ) : (
                <div className="text-slate-400">ยังไม่มี Quiz</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Balance Insight / Neglected Warning */}
      {neglectedSubjects.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            คำแนะนำความสมดุล: วิชา{' '}
            <strong className="font-bold">
              {neglectedSubjects.map((s) => s.name).join(', ')}
            </strong>{' '}
            ใช้เวลาเรียนน้อยกว่า 5% ของทั้งหมด ควรพิจารณาจัดเวลาเพิ่มในสัปดาห์หน้า
          </span>
        </div>
      )}
    </div>
  );
});
