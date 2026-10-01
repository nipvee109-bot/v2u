import { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Brain, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  RotateCcw,
  Clock,
  HelpCircle,
  Award
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { KnowledgeGap, SubjectId } from '../types';
import { MasteryBadge } from './MasteryBar';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface KnowledgeGapSectionProps {
  gaps: KnowledgeGap[];
  onSelectGap: (gap: KnowledgeGap) => void;
  onStartReview: (lessonId: string, topic: string) => void;
  onReStudy: (lessonId: string) => void;
}

export function KnowledgeGapSection({
  gaps,
  onSelectGap,
  onStartReview,
  onReStudy,
}: KnowledgeGapSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const criticalCount = gaps.filter((g) => g.severity === 'critical').length;
  const moderateCount = gaps.filter((g) => g.severity === 'moderate').length;
  const minorCount = gaps.filter((g) => g.severity === 'minor').length;

  const displayedGaps = showAll ? gaps : gaps.slice(0, 4);

  if (gaps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                ควรกลับไปดู (Knowledge Gap Analysis)
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                สมบูรณ์ 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ยอดเยี่ยมมาก! ไม่พบช่องว่างความรู้หรือหัวข้อที่ต้องกลับไปซ่อมในขณะนี้ บทเรียนทั้งหมดผ่านเกณฑ์ความเข้าใจ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/60">
            ไม่มีเนื้อหาค้างซ่อม 🎉
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                ควรกลับไปดู (Topics to Revisit)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                ตรวจพบ {gaps.length} หัวข้อ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              วิเคราะห์อัตโนมัติจากคะแนนแบบทดสอบ, ระดับความเข้าใจ (Mastery), บันทึกจุดที่ยังไม่เข้าใจ และรอบทบทวนที่ค้าง
            </p>
          </div>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {criticalCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              วิกฤต: {criticalCount}
            </span>
          )}
          {moderateCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              ปานกลาง: {moderateCount}
            </span>
          )}
          {minorCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              ทั่วไป: {minorCount}
            </span>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {displayedGaps.map((gap) => {
          const subject = SUBJECTS[gap.subject as SubjectId] || SUBJECTS.math;
          const targetLessonId = gap.relatedLessonIds[0];

          const isCritical = gap.severity === 'critical';
          const isModerate = gap.severity === 'moderate';

          const cardBorder = isCritical
            ? 'border-rose-200/90 hover:border-rose-300 bg-rose-50/20'
            : isModerate
            ? 'border-amber-200/90 hover:border-amber-300 bg-amber-50/20'
            : 'border-slate-200/80 hover:border-blue-300 bg-white';

          return (
            <div
              key={gap.id}
              className={`rounded-2xl border p-4.5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3 ${cardBorder}`}
            >
              <div>
                {/* Meta Top: Subject & Severity */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${subject.color}`} />
                    <span className="text-[11px] font-bold text-slate-600">
                      {subject.name.split('/')[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MasteryBadge score={gap.mastery} size="sm" />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isModerate
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-sky-100 text-sky-800 border-sky-200'
                      }`}
                    >
                      {isCritical ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : isModerate ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <HelpCircle className="w-3 h-3" />
                      )}
                      <span>{isCritical ? 'เร่งด่วน' : isModerate ? 'ปานกลาง' : 'แนะนำ'}</span>
                    </span>
                  </div>
                </div>

                {/* Topic Title */}
                <button
                  onClick={() => onSelectGap(gap)}
                  className="text-left font-bold text-slate-900 hover:text-blue-600 transition-colors text-sm line-clamp-1 block w-full"
                  title="คลิกเพื่อดูรายละเอียดและสาเหตุ"
                >
                  {gap.topic}
                </button>

                {/* Reason Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {gap.reasons.map((r, idx) => {
                    const isRevOverdue = r.code === 'review_overdue';
                    const isLowQuiz = r.code === 'low_quiz';
                    const isUnclear = r.code === 'repeated_unclear';

                    return (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${
                          isRevOverdue
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isLowQuiz
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : isUnclear
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isRevOverdue ? (
                          <Clock className="w-2.5 h-2.5" />
                        ) : isLowQuiz ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : isUnclear ? (
                          <HelpCircle className="w-2.5 h-2.5" />
                        ) : (
                          <Award className="w-2.5 h-2.5" />
                        )}
                        <span>{r.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer: Context & Actions */}
              <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  {gap.quizScore !== undefined && (
                    <span className="font-semibold text-slate-600 mr-2">
                      Quiz: {gap.quizScore}%
                    </span>
                  )}
                  {gap.lastStudied && (
                    <span>
                      เรียนล่าสุด {format(parseISO(gap.lastStudied), 'dd/MM/yy', { locale: th })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSelectGap(gap)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-0.5"
                  >
                    <span>รายละเอียด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {targetLessonId && (
                    <button
                      onClick={() => onStartReview(targetLessonId, gap.topic)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      title="ทบทวนทันที"
                    >
                      <Brain className="w-3 h-3" />
                      <span>ทบทวน</span>
                    </button>
                  )}

                  {targetLessonId && (
                    <button
                      onClick={() => onReStudy(targetLessonId)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      title="เริ่มเรียนใหม่อีกครั้ง"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>เรียนซ้ำ</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more toggle if more than 4 */}
      {gaps.length > 4 && (
        <div className="pt-1 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
          >
            <span>{showAll ? 'ย่อการแสดงผล' : `ดูทั้งหมด (${gaps.length} หัวข้อ)`}</span>
            <RotateCcw className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
