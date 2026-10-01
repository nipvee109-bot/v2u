import React, { useState } from 'react';
import { Brain, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { ReviewItem, Lesson } from '../../types';
import { SUBJECTS } from '../../types';
import { format, parseISO } from 'date-fns';

interface ReviewTodaySectionProps {
  overdue: ReviewItem[];
  dueToday: ReviewItem[];
  upcoming: ReviewItem[];
  lessons: Lesson[];
  onStartReview: (item: ReviewItem) => void;
  onStartAllDue: () => void;
}

export const ReviewTodaySection: React.FC<ReviewTodaySectionProps> = ({
  overdue,
  dueToday,
  upcoming,
  lessons,
  onStartReview,
  onStartAllDue,
}) => {
  const [activeTab, setActiveTab] = useState<'dueToday' | 'overdue' | 'upcoming'>('dueToday');

  const totalUrgent = overdue.length + dueToday.length;

  const priorityStyles: Record<string, string> = {
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const renderItemRow = (item: ReviewItem) => {
    const parentLesson = lessons.find((l) => l.id === item.lessonId);
    const subject = parentLesson ? SUBJECTS[parentLesson.subjectId] : null;
    const isOverdueItem = item.status === 'overdue' || item.nextReviewAt.split('T')[0] < format(new Date(), 'yyyy-MM-dd');

    return (
      <div
        key={item.id}
        className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 transition-all shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
            <Brain className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 truncate">
                {item.topic}
              </span>
              {subject && (
                <span className="text-xs text-slate-500 shrink-0">
                  ({subject.name.split('/')[0]})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
              <span className="text-slate-500">
                รอบที่ {item.reviewCount + 1}
              </span>
              <span className="text-slate-300">&middot;</span>
              <span
                className={`font-semibold ${
                  isOverdueItem ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {isOverdueItem
                  ? 'เลยกำหนดแล้ว'
                  : `ครบกำหนด: ${format(parseISO(item.nextReviewAt), 'dd/MM/yyyy')}`}
              </span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-md font-semibold border ${
                  priorityStyles[item.priority] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.priority === 'High'
                  ? 'สำคัญสูง'
                  : item.priority === 'Medium'
                  ? 'ปานกลาง'
                  : 'ทั่วไป'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onStartReview(item)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm shadow-purple-600/20 transition-all"
        >
          เริ่มทบทวน
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-purple-200/80 shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                2. วันนี้ต้องทบทวนอะไร? (Review Today)
              </h2>
              {totalUrgent > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 animate-pulse">
                  ถึงกำหนด {totalUrgent} รายการ
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  ทบทวนครบแล้ววันนี้ 🎉
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Spaced Repetition: ทบทวนตามระยะ 1, 3, 7, 14, 30 วัน เพื่อความจำถาวรและเพิ่มระดับ Mastery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onStartAllDue}
            disabled={totalUrgent === 0 && upcoming.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>เริ่มทบทวนทันที</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab('dueToday')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'dueToday'
              ? 'bg-purple-100 text-purple-800'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          ครบกำหนดวันนี้ ({dueToday.length})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'overdue'
              ? 'bg-rose-100 text-rose-800'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          เลยกำหนด ({overdue.length})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-slate-100 text-slate-800'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          คิวล่วงหน้า ({upcoming.length})
        </button>
      </div>

      {/* Content list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {activeTab === 'dueToday' &&
          (dueToday.length > 0 ? (
            dueToday.map((item) => renderItemRow(item))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              ไม่มีรายการที่ต้องทบทวนวันนี้ ยอดเยี่ยมมาก!
            </div>
          ))}

        {activeTab === 'overdue' &&
          (overdue.length > 0 ? (
            overdue.map((item) => renderItemRow(item))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              ไม่มีรายการทบทวนที่ค้างหรือเลยกำหนด
            </div>
          ))}

        {activeTab === 'upcoming' &&
          (upcoming.length > 0 ? (
            upcoming.map((item) => renderItemRow(item))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              ไม่มีรายการทบทวนในคิวล่วงหน้า
            </div>
          ))}
      </div>
    </div>
  );
};
