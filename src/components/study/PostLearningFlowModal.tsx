import React, { useState, useMemo } from 'react';
import {
  Award,
  Clock,
  Sparkles,
  HelpCircle,
  TrendingUp,
  CalendarCheck,
  Check,
  BookOpen,
  X
} from 'lucide-react';
import type { Lesson, Resource, ConfidenceLevel, MasteryScore } from '../../types';
import { MASTERY_SCALE } from '../../types';
import { calculateDeterministicMasteryScore } from '../../store/useStore';
import { formatDurationThai } from './LessonLearningHistory';

interface PostLearningFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson;
  elapsedSeconds: number;
  resourcesUsed: Resource[];
  initialLearnedNotes?: string;
  initialUnclearNotes?: string;
  initialReviewNotes?: string;
  initialConfidence?: ConfidenceLevel;
  onConfirm: (result: {
    actualMinutes: number;
    quizScore?: number;
    confidence: ConfidenceLevel;
    learnedNotes: string;
    stillUnclearNotes: string;
    reviewNotes: string;
    newMasteryScore: MasteryScore;
  }) => void;
}

export const PostLearningFlowModal: React.FC<PostLearningFlowModalProps> = ({
  isOpen,
  onClose,
  lesson,
  elapsedSeconds,
  resourcesUsed,
  initialLearnedNotes = '',
  initialUnclearNotes = '',
  initialReviewNotes = '',
  initialConfidence = 'Medium',
  onConfirm,
}) => {
  const actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  // State for form
  const [learnedNotes, setLearnedNotes] = useState(initialLearnedNotes || lesson.learnedNotes || '');
  const [stillUnclearNotes, setStillUnclearNotes] = useState(initialUnclearNotes || lesson.stillUnclearNotes || '');
  const [reviewNotes, setReviewNotes] = useState(initialReviewNotes || lesson.reviewNotes || '');
  const [confidence, setConfidence] = useState<ConfidenceLevel>(initialConfidence || lesson.confidence || 'Medium');
  const [quizScoreInput, setQuizScoreInput] = useState<string>(lesson.quizScore !== undefined ? String(lesson.quizScore) : '');

  // Active step inside modal: 'recall' -> 'test' -> 'mastery'
  const [activeStep, setActiveStep] = useState<'recall' | 'test' | 'summary'>('recall');

  const parsedQuizScore = useMemo(() => {
    if (!quizScoreInput.trim()) return undefined;
    const num = parseInt(quizScoreInput, 10);
    return isNaN(num) ? undefined : Math.min(100, Math.max(0, num));
  }, [quizScoreInput]);

  // Current baseline mastery
  const oldMasteryScore = (lesson.masteryScore ?? 0) as MasteryScore;
  const oldMasteryMeta = MASTERY_SCALE[oldMasteryScore] || MASTERY_SCALE[0];

  // Projected deterministic mastery calculation
  const newMasteryScore = useMemo<MasteryScore>(() => {
    const totalMinutes = (lesson.totalStudyMinutes || 0) + actualMinutes;
    const bestScore = parsedQuizScore !== undefined
      ? Math.max(parsedQuizScore, ...(lesson.quizAttempts || []).map((a) => a.score), lesson.quizScore || 0)
      : (lesson.quizAttempts && lesson.quizAttempts.length > 0 ? Math.max(...lesson.quizAttempts.map(a => a.score)) : lesson.quizScore);

    return calculateDeterministicMasteryScore({
      status: 'COMPLETED',
      totalStudyMinutes: totalMinutes,
      quizBestScore: bestScore,
      quizLatestScore: parsedQuizScore,
      confidence,
      reviewCount: lesson.reviewCount || 0,
      hasLearnedNotes: Boolean(learnedNotes.trim()),
      hasUnclearNotes: Boolean(stillUnclearNotes.trim()),
      unclearTopicsCount: stillUnclearNotes.trim() ? 1 : 0,
    });
  }, [lesson, actualMinutes, parsedQuizScore, confidence, learnedNotes, stillUnclearNotes]);

  const newMasteryMeta = MASTERY_SCALE[newMasteryScore] || MASTERY_SCALE[0];
  const isMasteryIncreased = newMasteryScore > oldMasteryScore;

  if (!isOpen) return null;

  const handleFinish = () => {
    onConfirm({
      actualMinutes,
      quizScore: parsedQuizScore,
      confidence,
      learnedNotes: learnedNotes.trim(),
      stillUnclearNotes: stillUnclearNotes.trim(),
      reviewNotes: reviewNotes.trim(),
      newMasteryScore,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-learning-title"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl p-6 sm:p-7 space-y-5 my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Header: Study Summary ── */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                Learn → Test → Master
              </span>
              <span className="text-[10px] text-slate-400">สรุปการเรียนรู้</span>
            </div>
            <h3 id="post-learning-title" className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
              {lesson.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <Clock className="w-3.5 h-3.5" /> เวลาเรียนจริง {formatDurationThai(actualMinutes)}
              </span>
              {resourcesUsed.length > 0 && (
                <span className="flex items-center gap-1 text-slate-500">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  สื่อที่ใช้ {resourcesUsed.length} รายการ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Step Tabs ── */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveStep('recall')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeStep === 'recall'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            1. สรุปความรู้ (Recall)
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('test')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeStep === 'test'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            2. ประเมินความมั่นใจ & Quiz
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('summary')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeStep === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> 3. ระดับ Mastery
          </button>
        </div>

        {/* ── STEP 1: ACTIVE RECALL & NOTES ── */}
        {activeStep === 'recall' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Active Recall Prompt */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Active Recall Challenge</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                การสรุปด้วยภาษาตนเองทันทีหลังเรียนจบ ช่วยเพิ่มอัตราการจำได้ในระยะยาว (Retention) มากกว่า 50%
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>สิ่งที่ได้เรียนรู้ / สรุปสาระสำคัญ (Learned Notes)</span>
                <span className="text-[10px] text-emerald-600 font-normal">บันทึกช่วยยกระดับ Mastery</span>
              </label>
              <textarea
                value={learnedNotes}
                onChange={(e) => setLearnedNotes(e.target.value)}
                placeholder="สรุปแนวคิดหลัก สูตร วิธีแก้ปัญหา หรือสิ่งที่เข้าใจชัดเจน..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 min-h-[90px] outline-none focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-700">
                  <HelpCircle className="w-3.5 h-3.5" /> สิ่งที่ยังติดขัด / ไม่เข้าใจ (Still Unclear)
                </span>
                <span className="text-[10px] text-slate-400">ถ้ามี จะตั้งคิวทบทวนให้อัตโนมัติ</span>
              </label>
              <input
                type="text"
                value={stillUnclearNotes}
                onChange={(e) => setStillUnclearNotes(e.target.value)}
                placeholder="เช่น จุดที่ยังสงสัย, สัญลักษณ์คณิตศาสตร์ที่ยังไม่คล่อง..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                สิ่งที่ต้องทบทวนเพิ่มเติม (Review Focus)
              </label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="เช่น ทบทวนเรื่องกราฟพรุ่งนี้, ทำโจทย์เพิ่ม 3 ข้อ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: TEST & CONFIDENCE ── */}
        {activeStep === 'test' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Quiz Score Input & Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>คะแนนแบบทดสอบ (Quiz Score %)</span>
                <span className="text-[10px] text-slate-400">เว้นว่างได้หากไม่ได้ทำ Quiz</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quizScoreInput}
                  onChange={(e) => setQuizScoreInput(e.target.value)}
                  placeholder="0 - 100"
                  className="w-28 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>

              {/* Quick score buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">ปุ่มด่วน:</span>
                {[
                  { score: '95', label: '95% ยอดเยี่ยม' },
                  { score: '80', label: '80% เข้าใจดี' },
                  { score: '60', label: '60% พอใช้' },
                  { score: '45', label: '45% ต้องทวน' },
                ].map((item) => (
                  <button
                    key={item.score}
                    type="button"
                    onClick={() => setQuizScoreInput(item.score)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                {quizScoreInput && (
                  <button
                    type="button"
                    onClick={() => setQuizScoreInput('')}
                    className="text-[11px] text-rose-500 hover:underline px-1"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>
            </div>

            {/* Confidence Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">
                ระดับความมั่นใจในบทเรียนนี้ (Self-Assessment)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { level: 'High' as ConfidenceLevel, title: 'มั่นใจมาก', desc: 'แก้โจทย์ได้ คล่องตัว', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                  { level: 'Medium' as ConfidenceLevel, title: 'ปานกลาง', desc: 'เข้าใจหลักการทั่วไป', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                  { level: 'Low' as ConfidenceLevel, title: 'ยังไม่มั่นใจ', desc: 'ยังมีจุดติดขัด', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                ].map((item) => {
                  const isSelected = confidence === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setConfidence(item.level)}
                      className={`p-3 rounded-2xl text-left border-2 transition-all ${
                        isSelected ? item.color + ' shadow-xs ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">{item.title}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: DETERMINISTIC MASTERY PREVIEW ── */}
        {activeStep === 'summary' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Projected Mastery Change Banner */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isMasteryIncreased 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${isMasteryIncreased ? 'text-emerald-600' : 'text-blue-600'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      การคำนวณระดับความเชี่ยวชาญ (Mastery Recalculation)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isMasteryIncreased 
                        ? '🎉 ยินดีด้วย! ระดับความเชี่ยวชาญของคุณเพิ่มขึ้น' 
                        : 'ระดับความเชี่ยวชาญได้รับการประเมินตามกฎจริง'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${newMasteryMeta.badgeClass}`}>
                  ระดับ {newMasteryScore}/4
                </span>
              </div>

              {/* Old vs New Level display */}
              <div className="flex items-center justify-center gap-4 py-3 my-2 bg-white/80 rounded-xl border border-slate-200/60">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">ก่อนเรียน</span>
                  <span className="text-xs font-bold text-slate-700">
                    ระดับ {oldMasteryScore}: {oldMasteryMeta.title}
                  </span>
                </div>
                <span className="text-slate-300 font-bold text-lg">➔</span>
                <div className="text-center">
                  <span className="text-[10px] text-emerald-600 font-semibold block">หลังเรียนเซสชันนี้</span>
                  <span className="text-xs font-bold text-emerald-800">
                    ระดับ {newMasteryScore}: {newMasteryMeta.title}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                <p>
                  <strong className="text-slate-700">เกณฑ์ที่ตรง:</strong> {newMasteryMeta.criteria}
                </p>
                <p className="text-slate-500">
                  {newMasteryMeta.fullDescription}
                </p>
              </div>
            </div>

            {/* Auto Spaced Review Notification */}
            {(stillUnclearNotes.trim() || (parsedQuizScore !== undefined && parsedQuizScore < 70)) && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                <CalendarCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">นัดหมาย Spaced Review อัตโนมัติ</span>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    เนื่องจากมีจุดที่ยังไม่เข้าใจหรือคะแนน Quiz ต่ำกว่าเกณฑ์ ระบบจะจัดคิวทบทวนภายใน 1 วัน เพื่อเสริมสร้างความจำถาวร
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer Navigation & Completion Buttons ── */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            {activeStep !== 'recall' && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'summary' ? 'test' : 'recall')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ย้อนกลับ
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeStep !== 'summary' ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'recall' ? 'test' : 'summary')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                ถัดไป
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกและจบการเรียน (Update Mastery)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
