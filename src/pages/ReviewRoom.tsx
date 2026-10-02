import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookOpen,
  CalendarCheck,
  Check,
  HelpCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useStore, computeNextReviewDate } from '../store/useStore';
import type { ReviewItem, ReviewOutcome } from '../types';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import { format, parseISO } from 'date-fns';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { recordReviewEvidence } from '../hooks/learningLoop';
import type { NextStep } from '../utils/nextStep';
import type { SkillChange } from '../diagnostic/engine';
import { getCurriculumLessonsForStudyLesson } from '../curriculum/engine';
import { StatusPill } from '../components/pathway/PathwayBits';
import { th } from 'date-fns/locale';

export const ReviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    lessons,
    reviewQueue = [],
    createReviewItemForLesson,
    getDueReviewItems,
  } = useStore();

  // Find review item by reviewItemId or find/create for lessonId
  const { reviewItem, lesson } = useMemo(() => {
    // 1. Try finding by reviewItem id
    const foundItem = reviewQueue.find((r) => r.id === id);
    if (foundItem) {
      const foundLesson = lessons.find((l) => l.id === foundItem.lessonId);
      return { reviewItem: foundItem, lesson: foundLesson || null };
    }

    // 2. Try finding by lesson id
    const foundLesson = lessons.find((l) => l.id === id);
    if (foundLesson) {
      const existingItem = reviewQueue.find((r) => r.lessonId === foundLesson.id && r.status !== 'completed');
      if (existingItem) {
        return { reviewItem: existingItem, lesson: foundLesson };
      }
      // If no active review item exists, create a virtual one for this view
      const virtualItem: ReviewItem = {
        id: `virtual-${foundLesson.id}`,
        lessonId: foundLesson.id,
        topic: foundLesson.title,
        createdAt: new Date().toISOString(),
        nextReviewAt: new Date().toISOString(),
        reviewCount: foundLesson.reviewCount || 0,
        status: 'pending',
        reason: 'manual',
        priority: 'Medium',
      };
      return { reviewItem: virtualItem, lesson: foundLesson };
    }

    return { reviewItem: null, lesson: null };
  }, [id, reviewQueue, lessons]);

  // Stages: 'recall' -> 'reveal' -> 'completed'
  const [stage, setStage] = useState<'recall' | 'reveal' | 'completed'>('recall');
  const [reviewLoop, setReviewLoop] = useState<{ changes: SkillChange[]; next: NextStep } | null>(null);
  const { start: startNext, confirmModal } = useStartNextStep();
  const [activeRecallText, setActiveRecallText] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<ReviewOutcome | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [recallSeconds, setRecallSeconds] = useState(0);

  // Result summary after completion
  const [resultSummary, setResultSummary] = useState<{
    nextReviewAt: string;
    intervalDays: number;
    outcome: ReviewOutcome;
    nextReviewCount: number;
  } | null>(null);

  // Recall timer
  useEffect(() => {
    if (stage === 'completed') return;
    const timer = setInterval(() => {
      setRecallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // Check if there are other due review items
  const otherDueItems = useMemo(() => {
    const { overdue, dueToday } = getDueReviewItems();
    const allDue = [...overdue, ...dueToday];
    return allDue.filter((r) => r.id !== reviewItem?.id);
  }, [getDueReviewItems, reviewItem]);

  if (!lesson || !reviewItem) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">ไม่พบรายการทบทวนนี้</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">รายการนี้อาจถูกลบหรือทบทวนเสร็จสิ้นแล้ว</p>
        <Link
          to="/weekly-review"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          ไปยังคิวการทบทวน
        </Link>
      </div>
    );
  }

  const subject = SUBJECTS[lesson.subjectId];
  const oldMasteryScore = lesson.masteryScore ?? 0;
  const oldMasteryMeta = MASTERY_SCALE[oldMasteryScore as 0 | 1 | 2 | 3 | 4] || MASTERY_SCALE[0];

  const handleRevealNotes = () => {
    setIsRevealed(true);
    setStage('reveal');
  };

  const handleSelectOutcome = (outcome: ReviewOutcome) => {
    setSelectedOutcome(outcome);
  };

  const handleConfirmReview = () => {
    if (!selectedOutcome) return;

    // If virtual item, create it in store first
    let targetItemId = reviewItem.id;
    if (targetItemId.startsWith('virtual-')) {
      createReviewItemForLesson(lesson.id, 'manual');
      const newlyCreated = useStore.getState().reviewQueue.find((r) => r.lessonId === lesson.id && r.status !== 'completed');
      if (newlyCreated) targetItemId = newlyCreated.id;
    }

    // Phase 61: the review answer is evidence → skill / mastery → gap → next step, all recalculated
    setReviewLoop(
      recordReviewEvidence({
        reviewItemId: targetItemId,
        outcome: selectedOutcome,
        notes: reviewNote.trim() || undefined,
        skillIds: [...new Set(getCurriculumLessonsForStudyLesson(lesson).flatMap((c) => c.skillIds))],
      })
    );

    // Compute expected next review date and count
    const { nextReviewAt, nextReviewCount, intervalDays } = computeNextReviewDate(reviewItem.reviewCount, selectedOutcome);

    setResultSummary({
      nextReviewAt,
      intervalDays,
      outcome: selectedOutcome,
      nextReviewCount,
    });

    setStage('completed');
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {confirmModal}
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200/60 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            <RotateCcw className="w-3.5 h-3.5" /> ห้องทบทวน
          </span>
        </div>
      </div>

      {/* ── Lesson & Review Context Banner ── */}
      {/* Phase 49: not using .card here — its white background hid this dark header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${subject.color} text-white`}>
                {subject.name}
              </span>
              <span className="text-purple-200 text-xs">
                ทบทวนรอบที่ {reviewItem.reviewCount + 1}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {lesson.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-center">
              <span className="text-[10px] text-purple-200 block">เวลาที่ใช้ทบทวน</span>
              <span className="text-sm font-mono font-bold text-white flex items-center gap-1 justify-center mt-0.5">
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                {formatTimer(recallSeconds)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-center">
              <span className="text-[10px] text-purple-200 block">ระดับความเข้าใจ</span>
              <span className="text-xs font-bold text-emerald-300 block mt-0.5">
                ระดับ {oldMasteryScore}/4: {oldMasteryMeta.title}
              </span>
            </div>
          </div>
        </div>

        {lesson.description && (
          <p className="text-xs text-purple-100/90 leading-relaxed border-t border-white/10 pt-3">
            {lesson.description}
          </p>
        )}
      </div>

      {/* ── REVIEW WORKSPACE BODY ── */}
      {stage !== 'completed' ? (
        <div className="space-y-6">
          {/* STEP 1: ACTIVE RECALL CHALLENGE */}
          <div className="card p-6 bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ขั้นตอนที่ 1: ลองนึกก่อนเปิดโน้ต
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    พิมพ์สิ่งที่จำได้ก่อนเปิดสมุดโน้ต ช่วยให้รู้ว่าจุดไหนยังไม่แม่น
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {activeRecallText.trim().split(/\s+/).filter(Boolean).length} คำ
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                💡 คุณจำอะไรเกี่ยวกับเรื่องนี้ได้บ้าง? (หลักการ, สูตร, ข้อสรุป หรือแนวคิดสำคัญ):
              </label>
              <textarea
                value={activeRecallText}
                onChange={(e) => setActiveRecallText(e.target.value)}
                placeholder="พิมพ์สิ่งที่จำได้ออกมาอย่างอิสระ ไม่ต้องกังวลว่าจะพิมพ์ถูกหรือผิดทั้งหมด..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 min-h-[120px] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none leading-relaxed"
              />
            </div>

            {!isRevealed && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleRevealNotes}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>เปิดดูสรุป & โน้ตเพื่อตรวจสอบความถูกต้อง</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: REVEALED LESSON KNOWLEDGE & NOTES */}
          {isRevealed && (
            <div className="card p-6 bg-white border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      ขั้นตอนที่ 2: เปรียบเทียบกับบันทึกเดิม (Lesson Notes & Resources)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ตรวจดูว่าสิ่งที่คุณจำได้ตรงกับโน้ตหรือไม่ มีจุดไหนที่ลืมหรือจำสับสน
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Learned Notes */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> สิ่งที่ได้เรียนรู้
                  </span>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {lesson.learnedNotes || 'ยังไม่มีบันทึกสิ่งที่ได้เรียนรู้ในบทนี้'}
                  </div>
                </div>

                {/* Unclear Notes */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" /> สิ่งที่เคยติดขัด / จุดที่ไม่เข้าใจ
                  </span>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {lesson.stillUnclearNotes || 'ไม่มีจุดติดขัดที่บันทึกไว้'}
                  </div>
                </div>
              </div>

              {/* Lesson Resources */}
              {lesson.resources && lesson.resources.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    สื่อการเรียนรู้ที่เกี่ยวข้อง:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {lesson.resources.map((res) => (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span className="max-w-[200px] truncate">{res.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SELF-ASSESSMENT OUTCOME (4 LEVELS) */}
          {isRevealed && (
            <div className="card p-6 bg-white border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      ขั้นตอนที่ 3: ประเมินว่าจำได้แค่ไหน
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      เลือกระดับความจำจริงเพื่อให้อัลกอริทึมจัดระยะเวลาทบทวนรอบถัดไปได้อย่างแม่นยำ
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Remembered */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('remembered')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedOutcome === 'remembered'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-800">จำได้แม่นยำ</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                      ✓✓
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    จำหลักการและรายละเอียดได้ดี เข้าใจโครงสร้างชัดเจน
                  </p>
                  <span className="text-[10px] font-semibold text-emerald-700 mt-2 block">
                    ขยายระยะทบทวน (เช่น 7-14 วัน)
                  </span>
                </button>

                {/* 2. Partially */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('partially')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedOutcome === 'partially'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-800">พอจำได้</span>
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    จำประเด็นหลักได้ แต่มีรายละเอียดปลีกย่อยที่ตกหล่น
                  </p>
                  <span className="text-[10px] font-semibold text-blue-700 mt-2 block">
                    ทบทวนซ้ำใน 2–3 วัน
                  </span>
                </button>

                {/* 3. Unsure */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('unsure')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedOutcome === 'unsure'
                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-800">ยังไม่แม่น</span>
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                      ?
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    จำได้เลือนราง ต้องดูเฉลยจึงจะนึกออก
                  </p>
                  <span className="text-[10px] font-semibold text-amber-700 mt-2 block">
                    ทบทวนซ้ำใน 1 วัน
                  </span>
                </button>

                {/* 4. Forgot */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('forgot')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedOutcome === 'forgot'
                      ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-rose-800">จำไม่ได้เลย</span>
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold">
                      ✕
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    ลืมแนวคิดหลัก ต้องอ่านทบทวนใหม่อย่างจริงจัง
                  </p>
                  <span className="text-[10px] font-semibold text-rose-700 mt-2 block">
                    รีเซ็ตคิวทบทวนทันทีใน 1 วัน
                  </span>
                </button>
              </div>

              {/* Optional Review Note */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 block">
                  บันทึกข้อสังเกตในการทบทวนรอบนี้ (ตัวเลือกเพิ่มเติม):
                </label>
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="เช่น จุดที่ยังสับสน, ข้อที่จำได้ดีแล้ว..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={!selectedOutcome}
                  onClick={handleConfirmReview}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-purple-600/25 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกผลการทบทวน</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 4: RESULT SUMMARY & NAVIGATION */
        <div className="card p-8 bg-white border border-slate-200 shadow-md space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              บันทึกการทบทวนเสร็จสมบูรณ์!
            </h2>
            <p className="text-xs text-slate-500">
              V2U จัดรอบทบทวนครั้งถัดไปให้ตามที่คุณจำได้แล้ว
            </p>
          </div>

          {reviewLoop && (
            <div className="mx-auto mb-4 max-w-md space-y-3 text-left" data-testid="review-loop">
              {reviewLoop.changes.length > 0 && (
                <ul className="space-y-2" data-testid="skill-changes">
                  {reviewLoop.changes.map((c) => (
                    <li key={c.skillId} className="rounded-2xl bg-slate-50 px-4 py-3" data-skill={c.skillId} data-before={c.before} data-after={c.after}>
                      <p className="text-sm font-semibold text-ink">{c.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                        {c.before === c.after ? <>สถานะเดิม <StatusPill status={c.after} /></> : <>ก่อนหน้านี้ <StatusPill status={c.before} /> → ตอนนี้ <StatusPill status={c.after} /></>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white" data-testid="loop-next">
                <p className="text-xs font-semibold text-brand-100">ก้าวต่อไปของคุณ (คำนวณใหม่แล้ว)</p>
                <p className="mt-1 text-base font-bold break-words">{reviewLoop.next.todayAction}</p>
                <p className="mt-1 text-xs text-white/90 break-words">เพราะ {reviewLoop.next.reason}</p>
                <button type="button" onClick={() => startNext(reviewLoop.next)} className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-brand-800">
                  {reviewLoop.next.ctaLabel}
                </button>
              </div>
            </div>
          )}

          {resultSummary && (
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                <span className="text-[10px] text-purple-600 font-bold uppercase block mb-1">
                  รอบทบทวนถัดไป
                </span>
                <p className="text-sm font-bold text-purple-950">
                  {format(parseISO(resultSummary.nextReviewAt), 'd MMMM yyyy', { locale: th })}
                </p>
                <span className="text-[10px] text-purple-700 mt-0.5 block">
                  อีก {resultSummary.intervalDays} วันข้างหน้า
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <span className="text-[10px] text-indigo-600 font-bold uppercase block mb-1">
                  สถิติทบทวนสะสม
                </span>
                <p className="text-sm font-bold text-indigo-950">
                  ทบทวนแล้ว {resultSummary.nextReviewCount} รอบ
                </p>
                <span className="text-[10px] text-indigo-700 mt-0.5 block">
                  ผลล่าสุด: {
                    resultSummary.outcome === 'remembered' ? 'จำได้แม่นยำ' :
                    resultSummary.outcome === 'partially' ? 'พอจำได้' :
                    resultSummary.outcome === 'unsure' ? 'ยังไม่แม่น' : 'จำไม่ได้'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
            {otherDueItems.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/review-room/${otherDueItems[0].id}`)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-2"
              >
                <span>ทบทวนรายการถัดไป ({otherDueItems.length} ค้างอยู่)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(`/study-room/${lesson.id}`)}
              className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>เข้า Study Room บทนี้</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/lessons/${lesson.id}?tab=timeline`)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              ดูประวัติบทเรียน
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
