import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Award,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import type { DashboardWeeklySummary } from '../../utils/dashboardUtils';

interface WeeklySummarySectionProps {
  summary: DashboardWeeklySummary;
}

export const WeeklySummarySection: React.FC<WeeklySummarySectionProps> = ({ summary }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100/60">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                6. สรุปสัปดาห์นี้ (Weekly Summary)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">
                {summary.studyHours} / {summary.targetWeeklyHours} ชม.
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ความก้าวหน้าในรอบ 7 วัน: เซสชันเรียน บทที่จบ คะแนนทดสอบ และคิวทบทวน
            </p>
          </div>
        </div>

        <Link
          to="/weekly-review"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/70 transition-colors shrink-0"
        >
          <span>รายงานสัปดาห์เต็ม</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Progress Bar towards weekly goal */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>เป้าหมายชั่วโมงเรียนรายสัปดาห์</span>
          <span className="font-bold text-slate-800">{summary.weeklyProgressPercent}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, summary.weeklyProgressPercent)}%` }}
          />
        </div>
      </div>

      {/* 4 Mini Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Hours & Sessions */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>เวลาเรียนสัปดาห์นี้</span>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {summary.studyHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {summary.sessionsCount} เซสชันที่เรียน
          </p>
        </div>

        {/* Lessons Completed */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>บทเรียนที่จบ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {summary.completedLessonsCount} <span className="text-xs font-normal text-slate-500">บท</span>
          </div>
          <p className="text-[11px] text-slate-400">
            สำเร็จตามเกณฑ์สัปดาห์นี้
          </p>
        </div>

        {/* Quiz Average */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Quiz เฉลี่ย</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {summary.averageQuizScore !== undefined ? (
              `${summary.averageQuizScore}%`
            ) : (
              <span className="text-xs text-slate-400 font-normal">ยังไม่มีทดสอบ</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {summary.quizAttemptsCount} ครั้งที่ทำแบบทดสอบ
          </p>
        </div>

        {/* Spaced Reviews */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ทบทวนแล้ว</span>
            <RotateCcw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {summary.reviewsCompletedCount} <span className="text-xs font-normal text-slate-500">รอบ</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {summary.reviewsOverdueCount > 0 ? (
              <span className="text-rose-600 font-semibold">
                ค้างทบทวน {summary.reviewsOverdueCount} รายการ
              </span>
            ) : (
              'ไม่มีรายการค้าง'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
