import { Award } from 'lucide-react';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import type { SubjectMasterySummary, MasteryScore } from '../types';

interface SubjectMasterySummaryCardsProps {
  summaries: SubjectMasterySummary[];
  onSelectSubject?: (subjectId: string) => void;
}

export function SubjectMasterySummaryCards({
  summaries,
  onSelectSubject,
}: SubjectMasterySummaryCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            สรุปความก้าวหน้าและความเชี่ยวชาญแยกวิชา (Subject Summary)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เปรียบเทียบอัตราการเรียนจบ (Completion) กับระดับความเข้าใจจริง (Mastery 0–4)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((summary) => {
          const subject = SUBJECTS[summary.subjectId];
          const masteryPercent = Math.round((summary.averageMasteryScore / 4) * 100);
          const gap = summary.completionRate - masteryPercent;

          return (
            <div
              key={summary.subjectId}
              onClick={() => onSelectSubject?.(summary.subjectId)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all space-y-4 cursor-pointer"
            >
              {/* Header: Subject & Tag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${subject.color}`} />
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {subject.name}
                  </h3>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                  Mastery {summary.averageMasteryScore}/4.0
                </span>
              </div>

              {/* Completion vs Mastery Comparison */}
              <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                {/* Completion Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">การเรียนจบ (Completion)</span>
                    <span className="font-bold text-slate-800">
                      {summary.completionRate}% ({summary.completedLessons}/{summary.totalLessons} บท)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${summary.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Mastery Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">ระดับความเข้าใจ (Mastery)</span>
                    <span className="font-bold text-purple-700">
                      {summary.averageMasteryScore} / 4.0 ({masteryPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${masteryPercent}%` }}
                    />
                  </div>
                </div>

                {/* Insight gap */}
                {gap > 10 && summary.completedLessons > 0 && (
                  <p className="text-[10px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md mt-1">
                    💡 เรียนจบแล้ว {summary.completedLessons} บท แต่ยังต้องการการทบทวนเพื่อยกระดับ Mastery สู่ขั้น 3–4
                  </p>
                )}
              </div>

              {/* Stats Row: Hours, Quiz Avg */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">เวลาเรียนจริง</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {summary.actualStudyHours} ชม.
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Quiz เฉลี่ย</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {summary.averageQuizScore !== undefined ? `${summary.averageQuizScore}%` : '-'}
                  </span>
                </div>
              </div>

              {/* Mastery Distribution Mini-Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>การกระจายตัว (Level 0 &rarr; 4)</span>
                  <span>{summary.totalLessons} บท</span>
                </div>
                <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden w-full">
                  {[0, 1, 2, 3, 4].map((lvl) => {
                    const count = summary.masteryDistribution[lvl as MasteryScore] || 0;
                    if (count === 0 || summary.totalLessons === 0) return null;
                    const pct = (count / summary.totalLessons) * 100;
                    const colors = ['bg-slate-300', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-500', 'bg-purple-600'];

                    return (
                      <div
                        key={lvl}
                        className={`h-full ${colors[lvl]} rounded-sm`}
                        style={{ width: `${pct}%` }}
                        title={`ระดับ ${lvl} (${MASTERY_SCALE[lvl as MasteryScore].title}): ${count} บท`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
                  <span>0: {summary.masteryDistribution[0]}</span>
                  <span>1: {summary.masteryDistribution[1]}</span>
                  <span>2: {summary.masteryDistribution[2]}</span>
                  <span>3: {summary.masteryDistribution[3]}</span>
                  <span className="font-bold text-purple-700">4: {summary.masteryDistribution[4]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
