import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, BookOpen, Award, ArrowRight, ExternalLink } from 'lucide-react';
import type { DailyStudyPoint, QuizTrendPoint, SubjectId, Lesson } from '../../types';
import { SUBJECTS } from '../../types';

interface AnalyticsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay?: DailyStudyPoint | null;
  selectedSubjectId?: SubjectId | null;
  selectedQuiz?: QuizTrendPoint | null;
  lessons: Lesson[];
}

export const AnalyticsDetailModal: React.FC<AnalyticsDetailModalProps> = ({
  isOpen,
  onClose,
  selectedDay,
  selectedSubjectId,
  selectedQuiz,
  lessons,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-detail-title"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all overflow-hidden flex flex-col max-h-[85vh] my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedDay && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="analytics-detail-title" className="text-sm font-bold text-slate-900">{selectedDay.label}</h3>
                  <p className="text-xs text-slate-500">
                    เวลาเรียนรวม {selectedDay.hours} ชม. ({selectedDay.minutes} นาที) &middot; {selectedDay.sessionsCount} เซสชัน
                  </p>
                </div>
              </>
            )}

            {selectedSubjectId && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    วิชา{SUBJECTS[selectedSubjectId]?.name || selectedSubjectId}
                  </h3>
                  <p className="text-xs text-slate-500">รายละเอียดบทเรียนและการกระจายเวลา</p>
                </div>
              </>
            )}

            {selectedQuiz && (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ผลการทำแบบทดสอบ (Quiz)</h3>
                  <p className="text-xs text-slate-500">{selectedQuiz.label}</p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดรายละเอียดสถิติ"
            className="rounded-xl p-2 min-h-[44px] min-w-[44px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-center focus:ring-2 focus:ring-blue-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Day Detail View */}
          {selectedDay && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                รายการกิจกรรมการเรียนในวันนี้ ({selectedDay.details.length})
              </h4>

              {selectedDay.details.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  ไม่มีกิจกรรมการเรียนที่บันทึกไว้ในวันนี้
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedDay.details.map((item) => {
                    const subInfo = SUBJECTS[item.subjectId];
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${subInfo?.color || 'bg-blue-500'}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {subInfo?.name} &middot; {item.type === 'session' ? 'เซสชันการเรียน' : 'บทเรียนสำเร็จ'}
                            </p>
                          </div>
                        </div>

                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                          {item.minutes} นาที
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subject Detail View */}
          {selectedSubjectId && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                บทเรียนในหลักสูตรของวิชานี้
              </h4>

              <div className="space-y-2">
                {lessons
                  .filter((l) => l.subjectId === selectedSubjectId)
                  .map((l) => (
                    <Link
                      to={`/lessons/${l.id}`}
                      key={l.id}
                      onClick={onClose}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 p-3 hover:border-blue-400 hover:bg-slate-50/50 transition-all text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {l.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          เดือนที่ {l.month} &middot; ความยาก: {l.difficulty} &middot; {l.actualStudyMinutes || 0} นาที
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            l.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : l.status === 'IN PROGRESS'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {l.status === 'COMPLETED'
                            ? 'เรียนจบ'
                            : l.status === 'IN PROGRESS'
                            ? 'กำลังเรียน'
                            : 'ยังไม่เริ่ม'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Quiz Detail View */}
          {selectedQuiz && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-center space-y-2">
                <span className="text-xs text-slate-500">คะแนนแบบทดสอบ</span>
                <div
                  className={`text-4xl font-extrabold ${
                    selectedQuiz.score >= 80
                      ? 'text-emerald-600'
                      : selectedQuiz.score >= 60
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {selectedQuiz.score}%
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {selectedQuiz.score >= 80
                    ? 'ระดับ Mastered / เข้าใจอย่างถ่องแท้'
                    : selectedQuiz.score >= 60
                    ? 'ระดับ Proficient / ทำโจทย์มาตรฐานได้'
                    : 'ระดับ Novice / ควรทบทวนเนื้อหาเพิ่มเติม'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>บทเรียนที่เกี่ยวข้อง:</span>
                  <span className="font-bold text-slate-900">{selectedQuiz.lessonTitle}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>วิชา:</span>
                  <span className="font-bold text-slate-900">
                    {SUBJECTS[selectedQuiz.subjectId]?.name || selectedQuiz.subjectId}
                  </span>
                </div>
                {selectedQuiz.notes && (
                  <div className="pt-2 border-t border-slate-100 text-slate-600">
                    <span className="font-semibold block text-slate-700 mb-0.5">บันทึกเพิ่มเติม:</span>
                    <p className="italic bg-white p-2 rounded-lg border border-slate-100">{selectedQuiz.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Link
                  to={`/lessons/${selectedQuiz.lessonId}`}
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <span>ไปที่บทเรียนนี้</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 sm:px-6 py-3 bg-slate-50/75 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-colors focus:ring-2 focus:ring-blue-500"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
