import React, { useState } from 'react';
import type { QuizTrendPoint } from '../../types';
import { SUBJECTS } from '../../types';
import { Award, Sparkles } from 'lucide-react';

interface QuizTrendChartProps {
  data: QuizTrendPoint[];
  averageScore?: number;
  scoreChangePercent?: number;
  onSelectQuiz: (quiz: QuizTrendPoint) => void;
}

export const QuizTrendChart: React.FC<QuizTrendChartProps> = ({
  data,
  averageScore,
  scoreChangePercent,
  onSelectQuiz,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<QuizTrendPoint | null>(null);

  if (data.length === 0) {
    return (
      <div className="card p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            แนวโน้มคะแนนแบบทดสอบ (Quiz Score Trend)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ตอบคำถาม: ผลการทดสอบความเข้าใจพัฒนาขึ้นตามลำดับเวลาหรือไม่?
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-slate-500">
          <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700">ยังไม่มีประวัติการทำแบบทดสอบในช่วงนี้</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
            เมื่อคุณทำ Quiz ท้ายบทเรียน ระบบจะพล็อตแนวโน้มคะแนนและความเข้าใจให้เห็นพัฒนาการตรงนี้
          </p>
        </div>
      </div>
    );
  }

  // SVG coordinates calculation
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  // Calculate coordinates for points
  const pointsWithCoords = data.map((pt, idx) => {
    const x =
      data.length === 1
        ? paddingX + innerWidth / 2
        : paddingX + (idx / (data.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - (pt.score / 100) * innerHeight;
    return { ...pt, x, y };
  });

  // Polyline points path
  const linePath = pointsWithCoords.map((p) => `${p.x},${p.y}`).join(' ');

  // Passing threshold line (75%)
  const thresholdY = paddingY + innerHeight - 0.75 * innerHeight;

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            แนวโน้มคะแนนแบบทดสอบ (Quiz Score Trend)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ตอบคำถาม: ผลการทดสอบความเข้าใจพัฒนาขึ้นตามลำดับเวลาหรือไม่?
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {averageScore !== undefined && (
            <div className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 font-bold">
              เฉลี่ย {averageScore}%
            </div>
          )}
          {scoreChangePercent !== undefined && (
            <div
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                scoreChangePercent >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {scoreChangePercent >= 0 ? `+${scoreChangePercent}%` : `${scoreChangePercent}%`} แนวโน้ม
            </div>
          )}
        </div>
      </div>

      {/* SVG Trendline Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          {/* Grid lines: 100%, 75%, 50%, 0% */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />
          <text x={paddingX - 8} y={paddingY + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
            100%
          </text>

          {/* 75% target threshold */}
          <line
            x1={paddingX}
            y1={thresholdY}
            x2={width - paddingX}
            y2={thresholdY}
            stroke="#10b981"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />
          <text x={paddingX - 8} y={thresholdY + 4} textAnchor="end" className="text-[10px] fill-emerald-600 font-mono">
            75%
          </text>

          {/* Baseline 0% */}
          <line
            x1={paddingX}
            y1={paddingY + innerHeight}
            x2={width - paddingX}
            y2={paddingY + innerHeight}
            stroke="#e2e8f0"
          />
          <text x={paddingX - 8} y={paddingY + innerHeight + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
            0%
          </text>

          {/* Area under curve */}
          {pointsWithCoords.length > 1 && (
            <polygon
              points={`${pointsWithCoords[0].x},${paddingY + innerHeight} ${linePath} ${
                pointsWithCoords[pointsWithCoords.length - 1].x
              },${paddingY + innerHeight}`}
              fill="url(#quiz-gradient)"
              opacity="0.2"
            />
          )}

          <defs>
            <linearGradient id="quiz-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Connecting Line */}
          {pointsWithCoords.length > 1 && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePath}
            />
          )}

          {/* Data Points */}
          {pointsWithCoords.map((pt) => {
            const isHovered = hoveredDayScore(pt.id);
            const fill =
              pt.score >= 80 ? '#10b981' : pt.score >= 60 ? '#f59e0b' : '#ef4444';

            return (
              <g
                key={pt.id}
                onClick={() => onSelectQuiz(pt)}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 5}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-200 hover:scale-125"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-xl text-xs z-30 pointer-events-none">
            <div className="font-bold border-b border-white/10 pb-1 mb-1 text-[11px] flex items-center justify-between gap-3">
              <span>{hoveredPoint.label}</span>
              <span
                className={`font-bold ${
                  hoveredPoint.score >= 80
                    ? 'text-emerald-400'
                    : hoveredPoint.score >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {hoveredPoint.score}%
              </span>
            </div>
            <div className="text-slate-300 text-[11px] truncate max-w-[200px]">
              {hoveredPoint.lessonTitle}
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">
              วิชา: {SUBJECTS[hoveredPoint.subjectId]?.name || hoveredPoint.subjectId}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <span>💡 คลิกที่จุดคะแนนเพื่อดูรายละเอียดของแบบทดสอบนั้นๆ</span>
        <span>แบบทดสอบทั้งหมด {data.length} ครั้ง</span>
      </div>
    </div>
  );

  function hoveredDayScore(id: string) {
    return hoveredPoint?.id === id;
  }
};
