import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Clock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import type { Lesson, SubjectId } from '../../types';
import type { SmartRecommendation } from '../../utils/dashboardUtils';
import { SUBJECTS } from '../../types';

interface ContinueLearningSectionProps {
  recommendation: SmartRecommendation | null;
  secondaryLessons?: Lesson[];
  onStartLesson?: (lessonId: string) => void;
}

export const ContinueLearningSection: React.FC<ContinueLearningSectionProps> = ({
  recommendation,
  secondaryLessons = [],
  onStartLesson,
}) => {
  if (!recommendation) return null;

  const { lesson, reasonTitle, reasonDescription, badgeLabel, badgeColor, rule } = recommendation;
  const subject = SUBJECTS[lesson.subjectId as SubjectId];

  return (
    <div className="bg-white rounded-3xl border border-blue-200/80 shadow-sm p-6 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                3. เรียนรู้ต่อ (Continue Learning)
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{badgeLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดลำดับตาม State จริง: Incomplete &gt; Planned Today &gt; Next Roadmap Item (Deterministic Rule)
            </p>
          </div>
        </div>

        <Link
          to={`/lessons/${lesson.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>ดูเนื้อหาบทนี้</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Focus Recommendation Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 md:p-6 text-white shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            {/* Why was this recommended badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-medium border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>เหตุผลที่เลือก: {reasonTitle}</span>
            </div>

            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {lesson.title}
            </h3>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {reasonDescription}
            </p>

            {/* Metadata pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-medium">
                {subject ? subject.name : lesson.subjectId}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {lesson.durationHours} ชม.
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300">
                เดือนที่ {lesson.month} &middot; สัปดาห์ที่ {lesson.week || 1}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300">
                ความยาก: {lesson.difficulty}
              </span>
            </div>
          </div>

          {/* Large Action CTA */}
          <div className="shrink-0 flex flex-col gap-2">
            <Link
              to={`/lessons/${lesson.id}?action=study`}
              onClick={() => onStartLesson?.(lesson.id)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <PlayCircle className="w-5 h-5" />
              <span>{rule === 'incomplete_lesson' ? 'เรียนต่อทันที' : 'เริ่มเรียนบทนี้'}</span>
            </Link>
            <p className="text-[11px] text-center text-slate-400">
              บันทึกเวลาจริง &amp; โน้ตความเข้าใจ
            </p>
          </div>
        </div>
      </div>

      {/* Secondary queued items */}
      {secondaryLessons.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            คิวบทเรียนถัดไปใน Roadmap
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {secondaryLessons.map((l) => {
              const sub = SUBJECTS[l.subjectId];
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-blue-200 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {l.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span>{sub ? sub.name.split('/')[0] : l.subjectId}</span>
                      <span>&middot;</span>
                      <span>{l.durationHours} ชม.</span>
                      <span>&middot;</span>
                      <span>เดือน {l.month}</span>
                    </div>
                  </div>
                  <Link
                    to={`/lessons/${l.id}`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                  >
                    ดูบทเรียน
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
