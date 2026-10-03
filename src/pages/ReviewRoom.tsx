import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  CalendarCheck,
  Check,
  HelpCircle,
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
import { KIcon } from '../components/v2u/kit';
import { subOf } from '../components/v2u/tokens';
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
        <div className="w-12 h-12 rounded-2xl bg-[var(--rev-soft)] text-[var(--rev)] flex items-center justify-center mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[var(--ink)]">ไม่พบรายการทบทวนนี้</h3>
        <p className="text-xs text-[var(--ink-3)] mt-1 mb-4">รายการนี้อาจถูกลบหรือทบทวนเสร็จสิ้นแล้ว</p>
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
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 pb-20">
      {confirmModal}
      {/* ── Top Bar (design: review session) ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="ออกจากการทบทวน" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}>
          <KIcon name="x" size={20} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => <span key={n} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: n <= (stage === 'completed' ? 3 : isRevealed ? 2 : 1) ? 'var(--brand)' : 'var(--line-2)' }} />)}
        </div>
        <span className="font-mono text-[13px] font-semibold" style={{ color: 'var(--ink-3)' }}>{Math.min(stage === 'completed' ? 3 : isRevealed ? 2 : 1, 3)}/3</span>
      </div>

      {/* ── Lesson & Review Context ── */}
      <section className="flex flex-col gap-3" data-testid="review-context" style={{ padding: 'clamp(20px,2.4vw,32px)', borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full pl-2 pr-3 text-xs font-semibold" style={{ background: subOf(lesson.subjectId).soft, color: subOf(lesson.subjectId).c }}>
            <KIcon name={subOf(lesson.subjectId).k} size={14} /> {subject.name}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>ทบทวนรอบที่ {reviewItem.reviewCount + 1}</span>
        </div>
        <h1 className="font-display font-semibold leading-snug break-words" style={{ fontSize: 'clamp(19px,1vw + 15px,24px)', color: 'var(--ink)' }}>{lesson.title}</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-2.5 font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}><KIcon name="clock" size={14} /> เวลาที่ใช้ทบทวน <span className="font-mono">{formatTimer(recallSeconds)}</span></span>
          <span className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-2.5 font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}><KIcon name="gauge" size={14} /> ระดับความเข้าใจ {oldMasteryScore}/4: {oldMasteryMeta.title}</span>
        </div>
        {lesson.description && <p className="flex items-start gap-1.5 text-[13px] break-words" style={{ color: 'var(--ink-2)' }}><span style={{ marginTop: 2 }}><KIcon name="info" size={14} /></span>{lesson.description}</p>}
      </section>

      {/* ── REVIEW WORKSPACE BODY ── */}
      {stage !== 'completed' ? (
        <div className="space-y-6">
          {/* STEP 1: ACTIVE RECALL CHALLENGE */}
          <div className="rounded-[24px] p-[clamp(20px,2.4vw,32px)] bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-ink)] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-[var(--ink)]">
                    ขั้นตอนที่ 1: ลองนึกก่อนเปิดโน้ต
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)]">
                    พิมพ์สิ่งที่จำได้ก่อนเปิดสมุดโน้ต ช่วยให้รู้ว่าจุดไหนยังไม่แม่น
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--ink-3)]">
                {activeRecallText.trim().split(/\s+/).filter(Boolean).length} คำ
              </span>
            </div>

            <div className="bg-[var(--surface-2)] rounded-2xl p-4 border border-[var(--line)] space-y-2">
              <label className="text-xs font-bold text-[var(--ink-2)] block">
                💡 คุณจำอะไรเกี่ยวกับเรื่องนี้ได้บ้าง? (หลักการ, สูตร, ข้อสรุป หรือแนวคิดสำคัญ):
              </label>
              <textarea
                value={activeRecallText}
                onChange={(e) => setActiveRecallText(e.target.value)}
                placeholder="พิมพ์สิ่งที่จำได้ออกมาอย่างอิสระ ไม่ต้องกังวลว่าจะพิมพ์ถูกหรือผิดทั้งหมด..."
                className="w-full bg-[var(--surface)] border border-[var(--line-2)] rounded-xl p-3.5 text-xs text-[var(--ink)] min-h-[120px] outline-none focus:border-[var(--brand)] resize-none leading-relaxed"
              />
            </div>

            {!isRevealed && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleRevealNotes}
                  className="px-6 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hi)] text-white rounded-[14px] text-sm font-bold min-h-[48px] transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>เปิดดูสรุป & โน้ตเพื่อตรวจสอบความถูกต้อง</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: REVEALED LESSON KNOWLEDGE & NOTES */}
          {isRevealed && (
            <div className="rounded-[24px] p-[clamp(20px,2.4vw,32px)] bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--ok-soft)] text-[var(--ok)] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-[var(--ink)]">
                      ขั้นตอนที่ 2: เปรียบเทียบกับบันทึกเดิม (Lesson Notes & Resources)
                    </h3>
                    <p className="text-[11px] text-[var(--ink-3)]">
                      ตรวจดูว่าสิ่งที่คุณจำได้ตรงกับโน้ตหรือไม่ มีจุดไหนที่ลืมหรือจำสับสน
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Learned Notes */}
                <div className="p-4 rounded-2xl bg-[var(--ok-soft)] border border-transparent space-y-2">
                  <span className="text-xs font-bold text-[var(--ok)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" /> สิ่งที่ได้เรียนรู้
                  </span>
                  <div className="text-xs text-[var(--ink-2)] whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {lesson.learnedNotes || 'ยังไม่มีบันทึกสิ่งที่ได้เรียนรู้ในบทนี้'}
                  </div>
                </div>

                {/* Unclear Notes */}
                <div className="p-4 rounded-2xl bg-[var(--rev-soft)] border border-transparent space-y-2">
                  <span className="text-xs font-bold text-[var(--rev)] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[var(--rev)]" /> สิ่งที่เคยติดขัด / จุดที่ไม่เข้าใจ
                  </span>
                  <div className="text-xs text-[var(--ink-2)] whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {lesson.stillUnclearNotes || 'ไม่มีจุดติดขัดที่บันทึกไว้'}
                  </div>
                </div>
              </div>

              {/* Lesson Resources */}
              {lesson.resources && lesson.resources.length > 0 && (
                <div className="pt-2 border-t border-[var(--line)]">
                  <span className="text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider block mb-2">
                    สื่อการเรียนรู้ที่เกี่ยวข้อง:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {lesson.resources.map((res) => (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-slate-100 border border-[var(--line-2)] text-xs font-medium text-[var(--ink-2)] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-[var(--ink-3)]" />
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
            <div className="rounded-[24px] p-[clamp(20px,2.4vw,32px)] bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)] space-y-4 animate-in fade-in">
              <div className="pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-ink)] flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-[var(--ink)]">
                      ขั้นตอนที่ 3: ประเมินว่าจำได้แค่ไหน
                    </h3>
                    <p className="text-[11px] text-[var(--ink-3)]">
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
                  className={`min-h-[56px] p-4 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selectedOutcome === 'remembered'
                      ? 'border-[var(--ok)] bg-[var(--ok-soft)]'
                      : 'border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[var(--ok)]">จำได้แม่นยำ</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--ok-soft)] text-[var(--ok)] flex items-center justify-center text-[10px] font-bold">
                      ✓✓
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-snug">
                    จำหลักการและรายละเอียดได้ดี เข้าใจโครงสร้างชัดเจน
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--ok)] mt-2 block">
                    ขยายระยะทบทวน (เช่น 7-14 วัน)
                  </span>
                </button>

                {/* 2. Partially */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('partially')}
                  className={`min-h-[56px] p-4 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selectedOutcome === 'partially'
                      ? 'border-[var(--dev)] bg-[var(--dev-soft)]'
                      : 'border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[var(--dev)]">พอจำได้</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--dev-soft)] text-[var(--dev)] flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-snug">
                    จำประเด็นหลักได้ แต่มีรายละเอียดปลีกย่อยที่ตกหล่น
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--dev)] mt-2 block">
                    ทบทวนซ้ำใน 2–3 วัน
                  </span>
                </button>

                {/* 3. Unsure */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('unsure')}
                  className={`min-h-[56px] p-4 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selectedOutcome === 'unsure'
                      ? 'border-[var(--rev)] bg-[var(--rev-soft)]'
                      : 'border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[var(--rev)]">ยังไม่แม่น</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--rev-soft)] text-[var(--rev)] flex items-center justify-center text-[10px] font-bold">
                      ?
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-snug">
                    จำได้เลือนราง ต้องดูเฉลยจึงจะนึกออก
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--rev)] mt-2 block">
                    ทบทวนซ้ำใน 1 วัน
                  </span>
                </button>

                {/* 4. Forgot */}
                <button
                  type="button"
                  onClick={() => handleSelectOutcome('forgot')}
                  className={`min-h-[56px] p-4 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selectedOutcome === 'forgot'
                      ? 'border-[var(--err)] bg-[var(--err-soft)]'
                      : 'border-[var(--line-2)] hover:border-[var(--brand)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[var(--err)]">จำไม่ได้เลย</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--err-soft)] text-[var(--err)] flex items-center justify-center text-[10px] font-bold">
                      ✕
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-2)] leading-snug">
                    ลืมแนวคิดหลัก ต้องอ่านทบทวนใหม่อย่างจริงจัง
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--err)] mt-2 block">
                    รีเซ็ตคิวทบทวนทันทีใน 1 วัน
                  </span>
                </button>
              </div>

              {/* Optional Review Note */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[var(--ink-2)] block">
                  บันทึกข้อสังเกตในการทบทวนรอบนี้ (ตัวเลือกเพิ่มเติม):
                </label>
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="เช่น จุดที่ยังสับสน, ข้อที่จำได้ดีแล้ว..."
                  className="w-full bg-[var(--surface-2)] border border-[var(--line-2)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)] focus:bg-[var(--surface)]"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  disabled={!selectedOutcome}
                  onClick={handleConfirmReview}
                  className="px-6 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hi)] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold min-h-[48px] transition-all flex items-center gap-2"
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
        <div className="rounded-[26px] p-[clamp(22px,3vw,36px)] bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow-lg)] space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-[var(--ok-soft)] text-[var(--ok)] flex items-center justify-center mx-auto border-4 border-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
              บันทึกการทบทวนเสร็จสมบูรณ์!
            </h2>
            <p className="text-xs text-[var(--ink-3)]">
              V2U จัดรอบทบทวนครั้งถัดไปให้ตามที่คุณจำได้แล้ว
            </p>
          </div>

          {reviewLoop && (
            <div className="mx-auto mb-4 max-w-md space-y-3 text-left" data-testid="review-loop">
              {reviewLoop.changes.length > 0 && (
                <ul className="space-y-2" data-testid="skill-changes">
                  {reviewLoop.changes.map((c) => (
                    <li key={c.skillId} className="rounded-2xl bg-[var(--surface-2)] px-4 py-3" data-skill={c.skillId} data-before={c.before} data-after={c.after}>
                      <p className="text-sm font-semibold text-ink">{c.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-2)]">
                        {c.before === c.after ? <>สถานะเดิม <StatusPill status={c.after} /></> : <>ก่อนหน้านี้ <StatusPill status={c.before} /> → ตอนนี้ <StatusPill status={c.after} /></>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-2xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-4 text-white" data-testid="loop-next">
                <p className="text-xs font-semibold text-brand-100">ก้าวต่อไปของคุณ (คำนวณใหม่แล้ว)</p>
                <p className="mt-1 text-base font-bold break-words">{reviewLoop.next.todayAction}</p>
                <p className="mt-1 text-xs text-white/90 break-words">เพราะ {reviewLoop.next.reason}</p>
                <button type="button" onClick={() => startNext(reviewLoop.next)} className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[var(--surface)] px-5 text-sm font-bold text-brand-800">
                  {reviewLoop.next.ctaLabel}
                </button>
              </div>
            </div>
          )}

          {resultSummary && (
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-[var(--brand-soft)]">
                <span className="text-[10px] text-[var(--brand-ink)] font-bold uppercase block mb-1">
                  รอบทบทวนถัดไป
                </span>
                <p className="text-sm font-bold text-[var(--ink)]">
                  {format(parseISO(resultSummary.nextReviewAt), 'd MMMM yyyy', { locale: th })}
                </p>
                <span className="text-[10px] text-[var(--brand-ink)] mt-0.5 block">
                  อีก {resultSummary.intervalDays} วันข้างหน้า
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)]">
                <span className="text-[10px] text-[var(--ink-3)] font-bold uppercase block mb-1">
                  สถิติทบทวนสะสม
                </span>
                <p className="text-sm font-bold text-[var(--ink)]">
                  ทบทวนแล้ว {resultSummary.nextReviewCount} รอบ
                </p>
                <span className="text-[10px] text-[var(--ink-3)] mt-0.5 block">
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
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[var(--line)]">
            {otherDueItems.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/review-room/${otherDueItems[0].id}`)}
                className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hi)] text-white rounded-[14px] text-sm font-bold transition-all min-h-[48px] flex items-center gap-2"
              >
                <span>ทบทวนรายการถัดไป ({otherDueItems.length} ค้างอยู่)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(`/study-room/${lesson.id}`)}
              className="px-5 py-2.5 bg-blue-50 hover:bg-[var(--dev-soft)] text-[var(--dev)] border border-blue-200 rounded-[14px] text-sm font-bold transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>เข้า Study Room บทนี้</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/lessons/${lesson.id}?tab=timeline`)}
              className="px-5 py-2.5 min-h-[48px] border border-[var(--line-2)] text-[var(--ink)] rounded-[14px] text-sm font-bold transition-colors"
            >
              ดูประวัติบทเรียน
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-[var(--ink-3)] hover:text-[var(--ink)] text-xs font-medium transition-colors"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
