import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, HelpCircle, Award, ArrowRight } from 'lucide-react';
import type { RecentMemoryTakeaway } from '../../utils/dashboardUtils';
import { SUBJECTS, MASTERY_SCALE } from '../../types';

interface RecentMemorySectionProps {
  recentMemories: RecentMemoryTakeaway[];
}

export const RecentMemorySection: React.FC<RecentMemorySectionProps> = ({ recentMemories }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                8. ความทรงจำการเรียนรู้ล่าสุด (Recent Learning Memory)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {recentMemories.length} บันทึกล่าสุด
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              สรุปสิ่งที่เข้าใจแล้ว สิ่งที่ยังสงสัย และระดับความมั่นใจจากการเรียนจริง
            </p>
          </div>
        </div>

        <Link
          to="/progress"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/70 transition-colors shrink-0"
        >
          <span>ดู Memory ทั้งหมด</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Memory Cards */}
      {recentMemories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentMemories.map((mem) => {
            const subject = SUBJECTS[mem.subjectId];
            const masteryInfo = MASTERY_SCALE[mem.masteryScore];

            return (
              <div
                key={mem.lessonId}
                className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-amber-300 transition-all shadow-xs space-y-3"
              >
                <div>
                  {/* Subject and Mastery Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {subject ? subject.name.split('/')[0] : mem.subjectId}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        masteryInfo ? masteryInfo.badgeClass : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      M{mem.masteryScore}: {masteryInfo ? masteryInfo.title : 'Novice'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {mem.lessonTitle}
                  </h3>

                  {/* What I learned */}
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2 text-slate-700 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/70">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 text-[11px] leading-relaxed">
                        {mem.learnedNotes}
                      </p>
                    </div>

                    {/* What is still unclear if any */}
                    {mem.stillUnclearNotes && mem.stillUnclearNotes.trim().length > 0 && (
                      <div className="flex items-start gap-2 text-rose-800 bg-rose-50/60 p-2 rounded-xl border border-rose-100/70">
                        <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="line-clamp-2 text-[11px] leading-relaxed">
                          {mem.stillUnclearNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer stats and link */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {mem.quizScore !== undefined && (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <Award className="w-3 h-3" /> {mem.quizScore}%
                      </span>
                    )}
                    {mem.confidence && (
                      <span className="text-[10px] text-slate-400">
                        มั่นใจ: {mem.confidence}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/lessons/${mem.lessonId}?tab=notebook`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    <span>เปิดสมุด</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs">
          ยังไม่มีบันทึกความรู้จากการเรียน เมื่อคุณเรียนจบบทเรียนและจดบันทึก บันทึกจะแสดงที่นี่
        </div>
      )}
    </div>
  );
};
