import { Link } from 'react-router-dom';
import { AlertCircle, Brain, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SUBJECTS } from '../types';
import type { TopicAttentionItem } from '../types';
import { MasteryBadge } from './MasteryBar';

interface TopicsNeedingAttentionCardProps {
  items: TopicAttentionItem[];
  onStartReview?: (lessonId: string, title: string) => void;
}

export function TopicsNeedingAttentionCard({
  items,
  onStartReview,
}: TopicsNeedingAttentionCardProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              ไม่มีหัวข้อที่ติดค้างหรือจำเป็นต้องใส่ใจเป็นพิเศษในขณะนี้
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              บทเรียนที่เรียนจบมีระดับความเข้าใจและคะแนนสอบอยู่ในเกณฑ์ดี และไม่มีคิวทบทวนที่เลยกำหนด
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
          สถานะปกติ
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                หัวข้อที่ควรให้ความสนใจ (Topics Needing Attention)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {items.length} หัวข้อ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจพบจากสัญญาณเชิงข้อมูล: Mastery ยังไม่ผ่านเกณฑ์, คะแนนสอบ &lt; 60%, มีจุดที่ยังไม่เข้าใจ หรือค้างทบทวน
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {items.map((item) => {
          const subject = SUBJECTS[item.subjectId];

          return (
            <div
              key={item.lessonId}
              className="p-4 rounded-xl border border-amber-200/70 bg-amber-50/30 hover:bg-amber-50/60 transition-all flex flex-col justify-between gap-3 shadow-2xs"
            >
              <div>
                {/* Subject & Mastery Pill */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${subject.color}`} />
                    <span className="text-[10px] font-bold text-slate-600">
                      {subject.name.split('/')[0]}
                    </span>
                  </div>
                  <MasteryBadge score={item.masteryScore} size="sm" />
                </div>

                {/* Topic Title */}
                <Link
                  to={`/lessons/${item.lessonId}`}
                  className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {item.topic}
                </Link>

                {/* Reason Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.reasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-amber-200/80 text-amber-900 font-medium"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-100 text-xs">
                {item.quizScore !== undefined && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Quiz ล่าสุด: <strong className="text-slate-800">{item.quizScore}%</strong>
                  </span>
                )}
                {item.quizScore === undefined && (
                  <span className="text-[10px] text-slate-400 italic">
                    ยังไม่มีผลสอบ Quiz
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  {onStartReview && (
                    <button
                      onClick={() => onStartReview(item.lessonId, item.topic)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Brain className="w-3 h-3" />
                      <span>ทบทวน</span>
                    </button>
                  )}
                  <Link
                    to={`/lessons/${item.lessonId}`}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                    title="ไปที่บทเรียน"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
