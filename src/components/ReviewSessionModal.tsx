import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  X, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CalendarCheck, 
  Brain, 
  Check 
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { ReviewItem, ReviewOutcome } from '../types';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface ReviewSessionModalProps {
  reviewItem: ReviewItem | null;
  onClose: () => void;
  onNext?: () => void;
  hasMoreDue?: boolean;
}

type ReviewStage = 'recall' | 'reveal' | 'outcome' | 'summary';

export function ReviewSessionModal(props: ReviewSessionModalProps) {
  if (!props.reviewItem) return null;
  return <ReviewSessionModalContent key={props.reviewItem.id} {...props} reviewItem={props.reviewItem} />;
}

function ReviewSessionModalContent({ 
  reviewItem, 
  onClose, 
  onNext, 
  hasMoreDue = false 
}: {
  reviewItem: ReviewItem;
  onClose: () => void;
  onNext?: () => void;
  hasMoreDue?: boolean;
}) {
  const { lessons, submitReviewOutcome } = useStore();
  const lesson = lessons.find((l) => l.id === reviewItem.lessonId);
  const subject = lesson ? SUBJECTS[lesson.subjectId] : null;

  const [stage, setStage] = useState<ReviewStage>('recall');
  const [activeRecallDraft, setActiveRecallDraft] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<ReviewOutcome | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [resultSummary, setResultSummary] = useState<{ nextReviewAt: string; intervalDays: number } | null>(null);

  const reasonLabel = {
    spaced_repetition: 'รอบทบทวน Spaced Repetition',
    low_quiz_score: 'คะแนน Quiz รอบก่อนต่ำกว่าเกณฑ์',
    unclear_topic: 'มีจุดที่บันทึกว่ายังไม่เข้าใจ',
    manual: 'ทบทวนตามความต้องการ',
  }[reviewItem.reason];

  const handleCompleteReview = () => {
    if (!selectedOutcome) return;
    
    // Submit outcome to store
    submitReviewOutcome(reviewItem.id, selectedOutcome, reviewNote.trim() || undefined);

    // Calculate preview for summary
    let intervalDays = 1;
    if (selectedOutcome === 'remembered') {
      const nextCount = reviewItem.reviewCount + 1;
      intervalDays = nextCount === 1 ? 3 : nextCount === 2 ? 7 : nextCount === 3 ? 14 : 30;
    } else if (selectedOutcome === 'partially') {
      const nextCount = reviewItem.reviewCount + 1;
      intervalDays = nextCount === 1 ? 1 : nextCount === 2 ? 3 : nextCount === 3 ? 7 : nextCount === 4 ? 14 : 30;
    } else if (selectedOutcome === 'unsure') {
      intervalDays = reviewItem.reviewCount > 1 ? 3 : 1;
    } else {
      intervalDays = 1;
    }

    const nextDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    setResultSummary({ nextReviewAt: nextDate, intervalDays });
    setStage('summary');
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-session-title"
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Brain className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-300">
                  Review Session &middot; รอบที่ {reviewItem.reviewCount + 1}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                  {reasonLabel}
                </span>
              </div>
              <h2 id="review-session-title" className="text-base font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5">
                {reviewItem.topic}
              </h2>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างทบทวนเนื้อหา"
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors focus:ring-2 focus:ring-purple-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 shrink-0">
          <div className={`flex items-center gap-1.5 ${stage === 'recall' ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${stage === 'recall' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            <span>Active Recall</span>
          </div>
          <div className="w-8 h-px bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${stage === 'reveal' ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${stage === 'reveal' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            <span>Self-Check</span>
          </div>
          <div className="w-8 h-px bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${stage === 'outcome' || stage === 'summary' ? 'text-blue-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${stage === 'outcome' || stage === 'summary' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            <span>Outcome</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STAGE 1: ACTIVE RECALL */}
          {stage === 'recall' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  ท้าทายความจำ: ลองนึกเนื้อหาสำคัญก่อนเปิดดู
                </div>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  งานวิจัยยืนยันว่าการพยายามดึงข้อมูลออกจากสมอง (Active Recall) ช่วยสร้างเส้นใยประสาทให้จำได้ยาวนานกว่าการอ่านซ้ำธรรมดาถึง 300%
                </p>
              </div>

              {subject && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={`w-2.5 h-2.5 rounded-full ${subject.color}`} />
                  <span>วิชา: <strong className="text-slate-800">{subject.name}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ทดลองนึก: คุณจำคอนเซ็ปต์, สูตร, หรือขั้นตอนอะไรได้บ้าง? (พิมพ์ทดสั้นๆ)
                </label>
                <textarea
                  value={activeRecallDraft}
                  onChange={(e) => setActiveRecallDraft(e.target.value)}
                  placeholder="เช่น สูตรการแก้สมการ, ข้อควรระวัง, นิยาม..."
                  className="w-full text-xs border border-slate-200 rounded-2xl p-3.5 min-h-[120px] outline-none focus:border-blue-500 leading-relaxed resize-none text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setStage('reveal')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
                >
                  <Eye className="w-4 h-4" /> เปิดดูสรุป & ตรวจคำตอบ <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: REVEAL & SELF CHECK */}
          {stage === 'reveal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  สรุปเนื้อหาจริงของบทเรียน
                </span>
                {lesson?.quizScore !== undefined && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    Quiz ล่าสุด: {lesson.quizScore}%
                  </span>
                )}
              </div>

              {activeRecallDraft && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    สิ่งที่คุณนึกได้เมื่อสักครู่:
                  </span>
                  <p className="text-slate-700 italic">"{activeRecallDraft}"</p>
                </div>
              )}

              {/* What I learned */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> สิ่งที่เคยเรียนรู้ (What I learned):
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {lesson?.learnedNotes || 'ไม่มีบันทึกสรุปเนื้อหา'}
                </p>
              </div>

              {/* Still unclear */}
              {lesson?.stillUnclearNotes && (
                <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> จุดที่เคยยังไม่เข้าใจ:
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {lesson.stillUnclearNotes}
                  </p>
                </div>
              )}

              {/* Review notes */}
              {lesson?.reviewNotes && (
                <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-1">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-purple-600" /> ประวัติและสิ่งที่ต้องทบทวน:
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {lesson.reviewNotes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setStage('recall')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  &larr; กลับไปดูโน้ตทด
                </button>
                <button
                  onClick={() => setStage('outcome')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-purple-600/20"
                >
                  ประเมินระดับความจำ <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: OUTCOME EVALUATION */}
          {stage === 'outcome' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  คุณจำเนื้อหาในบทเรียนนี้ได้ในระดับใด?
                </h3>
                <p className="text-xs text-slate-500">
                  ระบบจะคำนวณวันทบทวนรอบถัดไป (Spaced Repetition) ตามระดับที่คุณเลือก
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'remembered' as ReviewOutcome,
                    title: 'จำได้แม่นยำ',
                    subtitle: 'จำ concept หลักได้ชัดเจน ไม่ติดขัด',
                    intervalText: 'ข้ามขั้น interval (เช่น +7 ถึง +14 วัน)',
                    badgeColor: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70',
                    activeColor: 'ring-2 ring-emerald-600 bg-emerald-100 border-emerald-300',
                  },
                  {
                    id: 'partially' as ReviewOutcome,
                    title: 'พอจำได้',
                    subtitle: 'จำภาพรวมได้ แต่หลงลืมดีเทลบางจุด',
                    intervalText: 'เลื่อน interval ปกติ (เช่น +3 หรือ +7 วัน)',
                    badgeColor: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/70',
                    activeColor: 'ring-2 ring-blue-600 bg-blue-100 border-blue-300',
                  },
                  {
                    id: 'unsure' as ReviewOutcome,
                    title: 'ยังไม่แม่น',
                    subtitle: 'ต้องนึกนาน หรือต้องแอบดูสรุป',
                    intervalText: 'ทบทวนซ้ำเร็วๆ นี้ (+1 ถึง +3 วัน)',
                    badgeColor: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70',
                    activeColor: 'ring-2 ring-amber-600 bg-amber-100 border-amber-300',
                  },
                  {
                    id: 'forgot' as ReviewOutcome,
                    title: 'จำไม่ได้',
                    subtitle: 'นึกไม่ออกเลย ต้องอ่านใหม่',
                    intervalText: 'Reset เริ่มใหม่ ทบทวนวันพรุ่งนี้ (+1 วัน)',
                    badgeColor: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/70',
                    activeColor: 'ring-2 ring-rose-600 bg-rose-100 border-rose-300',
                  },
                ].map((opt) => {
                  const isSelected = selectedOutcome === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOutcome(opt.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                        isSelected ? opt.activeColor : opt.badgeColor
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{opt.title}</span>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      <p className="text-[11px] opacity-80 leading-normal">{opt.subtitle}</p>
                      <span className="text-[10px] font-semibold mt-2 inline-block opacity-90">
                        {opt.intervalText}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ข้อสังเกตเพิ่มเติม (Optional review note):
                </label>
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="เช่น ทำโจทย์เพิ่มได้ถูกต้อง, ระวังเครื่องหมายลบ..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500 text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setStage('reveal')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  &larr; ย้อนกลับ
                </button>
                <button
                  disabled={!selectedOutcome}
                  onClick={handleCompleteReview}
                  className="bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:shadow-none"
                >
                  <Check className="w-4 h-4" /> บันทึกผลการทบทวน
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: SUMMARY */}
          {stage === 'summary' && resultSummary && (
            <div className="text-center py-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">บันทึกการทบทวนสำเร็จ!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  ความจำถูกอัปเดตลงใน Learning Record และ Review Schedule เรียบร้อยแล้ว
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 max-w-sm mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">ผลการประเมิน:</span>
                  <span className="font-bold text-slate-900">
                    {selectedOutcome === 'remembered' ? 'จำได้แม่นยำ' :
                     selectedOutcome === 'partially' ? 'พอจำได้' :
                     selectedOutcome === 'unsure' ? 'ยังไม่แม่น' : 'จำไม่ได้'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">ช่วงเวลาถัดไป:</span>
                  <span className="font-bold text-blue-600">อีก {resultSummary.intervalDays} วัน</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">รอบทบทวนถัดไป:</span>
                  <span className="font-bold text-purple-700">
                    {format(parseISO(resultSummary.nextReviewAt), 'dd MMMM yyyy', { locale: th })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                {hasMoreDue && onNext && (
                  <button
                    onClick={() => {
                      onNext();
                      setStage('recall');
                      setActiveRecallDraft('');
                      setSelectedOutcome(null);
                      setReviewNote('');
                      setResultSummary(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <RotateCcw className="w-4 h-4" /> ทบทวนหัวข้อถัดไป
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
