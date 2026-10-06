import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import type { StudySession, SubjectId } from '../../types';
import { SUBJECTS } from '../../types';

interface TodayPlanSectionProps {
  todaySessions: StudySession[];
  onStartSession?: (session: StudySession) => void;
}

const subjectIconColor: Record<SubjectId, string> = {
  math: 'text-blue-600 bg-blue-50 border-blue-100',
  programming: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  physics: 'text-orange-600 bg-orange-50 border-orange-100',
  tgat3: 'text-purple-600 bg-purple-50 border-purple-100',
  ai: 'text-rose-600 bg-rose-50 border-rose-100',
  web: 'text-web bg-web-soft border-web/30',
};

const priorityStyles: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700 border-rose-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const TodayPlanSection: React.FC<TodayPlanSectionProps> = ({
  todaySessions,
  onStartSession,
}) => {
  const totalPlannedMinutes = todaySessions.reduce((acc, s) => acc + s.plannedMinutes, 0);
  const totalPlannedHours = +(totalPlannedMinutes / 60).toFixed(1);

  const completedMinutes = todaySessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes), 0);
  const completedHours = +(completedMinutes / 60).toFixed(1);

  const completedCount = todaySessions.filter((s) => s.status === 'completed').length;
  const isAllDone = todaySessions.length > 0 && completedCount === todaySessions.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                1. วันนี้ต้องทำอะไร? (Today's Plan)
              </h2>
              {isAllDone && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ครบทุกคาบแล้ว 🎉
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {todaySessions.length > 0 ? (
                <>
                  วางแผนไว้ {todaySessions.length} เซสชัน ({totalPlannedHours} ชม.) &middot; เสร็จแล้ว {completedCount}/{todaySessions.length} ({completedHours} ชม.)
                </>
              ) : (
                'ยังไม่มีตารางเรียนที่กำหนดไว้สำหรับวันนี้'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/70 transition-colors"
          >
            <span>เปิดตารางเต็ม</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      {todaySessions.length > 0 ? (
        <div className="space-y-3">
          {todaySessions.map((session) => {
            const isDone = session.status === 'completed';
            const subject = SUBJECTS[session.subjectId];
            const colorClass = subjectIconColor[session.subjectId] || 'text-slate-600 bg-slate-50 border-slate-100';

            return (
              <div
                key={session.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-slate-50/70 border-slate-200/50 opacity-80'
                    : 'bg-white hover:bg-blue-50/20 border-slate-200/80 hover:border-blue-300 shadow-xs'
                }`}
              >
                {/* Left details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${colorClass}`}
                  >
                    {subject ? subject.name.substring(0, 2) : 'SB'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-bold truncate ${
                          isDone ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {session.title}
                      </p>
                      {session.priority && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border shrink-0 ${
                            priorityStyles[session.priority] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {session.priority === 'High'
                            ? 'สำคัญสูง'
                            : session.priority === 'Medium'
                            ? 'ปานกลาง'
                            : 'ทั่วไป'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {session.startTime} - {session.endTime} ({session.plannedMinutes} นาที)
                      </span>
                      <span>&middot;</span>
                      <span className="text-slate-500">
                        {subject ? subject.name : session.subjectId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>เสร็จแล้ว</span>
                    </span>
                  ) : session.lessonId ? (
                    <Link
                      to={`/lessons/${session.lessonId}?action=study`}
                      onClick={() => onStartSession?.(session)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 transition-all"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>เริ่มเรียน</span>
                    </Link>
                  ) : (
                    <Link
                      to="/planner"
                      onClick={() => onStartSession?.(session)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <span>ดูรายละเอียด</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State for Today */
        <div className="py-8 px-4 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              ไม่มีคาบเรียนที่กำหนดไว้ในวันนี้
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              คุณสามารถจัดเวลาเรียนสำหรับวันนี้ หรือเลือกเรียนตามคำแนะนำด้านล่างได้ทันที
            </p>
          </div>
          <Link
            to="/planner"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มคาบเรียนวันนี้ใน Planner</span>
          </Link>
        </div>
      )}
    </div>
  );
};
