import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Award,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  Copy,
  Check,
  Printer,
  ArrowRight,
  Zap,
  Calendar
} from 'lucide-react';
import { format, parseISO, addWeeks, isSameWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import { SUBJECTS } from '../types';
import type { ReviewItem, SubjectId } from '../types';
import { computeWeeklyReview, generateWeeklyReviewClipboardText } from '../utils/weeklyReviewUtils';
import { ReviewSessionModal } from '../components/ReviewSessionModal';

export const WeeklyReviewPage: React.FC = () => {
  const {
    lessons,
    sessions,
    learningSessionsHistory,
    reviewQueue,
    unclearTopics,
    goals,
    weeklyGoal,
  } = useStore();

  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState<ReviewItem | null>(null);

  // Compute Weekly Review data using deterministic aggregator
  const report = useMemo(() => {
    return computeWeeklyReview({
      targetDate: currentWeekDate,
      lessons,
      sessions,
      learningSessionsHistory,
      reviewQueue,
      unclearTopics,
      goals,
      weeklyGoal,
    });
  }, [
    currentWeekDate,
    lessons,
    sessions,
    learningSessionsHistory,
    reviewQueue,
    unclearTopics,
    goals,
    weeklyGoal,
  ]);

  const isCurrentWeek = isSameWeek(currentWeekDate, new Date(), { weekStartsOn: 1 });

  const handlePrevWeek = () => {
    setCurrentWeekDate((d) => addWeeks(d, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeekDate((d) => addWeeks(d, 1));
  };

  const handleCurrentWeek = () => {
    setCurrentWeekDate(new Date());
  };

  const handleCopySummary = async () => {
    try {
      const text = generateWeeklyReviewClipboardText(report);
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // Fallback
      alert('คัดลอกสรุปสำเร็จ');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { summary, subjectBreakdown, studiedItems, learnedNotesList, unclearTopicsList, nextWeekPlan } = report;

  // Format week range label in Thai
  const weekStartParsed = parseISO(summary.weekStartDate);
  const weekEndParsed = parseISO(summary.weekEndDate);
  const formattedRange = `${format(weekStartParsed, 'd MMM', { locale: th })} - ${format(
    weekEndParsed,
    'd MMM yyyy',
    { locale: th }
  )}`;

  return (
    <div className="space-y-6 pb-20 print:p-0">
      {/* Top Banner / Week Navigator */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Phase 15 &middot; Weekly Learning Review</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              สรุปผลการเรียนรู้ประจำสัปดาห์
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              ทบทวนภาพรวม ตอบคำถาม 7 ข้อสำคัญเพื่อพัฒนาทักษะวิศวกรรมอย่างต่อเนื่องและมีทิศทาง
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 print:hidden">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all active:scale-95"
              title="คัดลอกสรุปสำหรับบันทึกลงสมุดหรือแชร์"
            >
              {copySuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>คัดลอกสรุป</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all active:scale-95"
              title="พิมพ์สรุปหรือบันทึกเป็น PDF"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        </div>

        {/* Week Switcher Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="สัปดาห์ก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5 text-slate-300" aria-hidden="true" />
            </button>

            <div className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              <span>สัปดาห์ที่ {summary.weekNumber}</span>
              <span className="text-slate-400">&middot;</span>
              <span>{formattedRange}</span>
            </div>

            <button
              onClick={handleNextWeek}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="สัปดาห์ถัดไป"
            >
              <ChevronRight className="h-5 w-5 text-slate-300" aria-hidden="true" />
            </button>
          </div>

          {!isCurrentWeek && (
            <button
              onClick={handleCurrentWeek}
              className="rounded-xl bg-blue-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              กลับสู่สัปดาห์นี้
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Total Time */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>เวลาเรียนรวม</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {summary.totalStudyHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ({summary.totalStudyMinutes} นาที)
            {summary.studyTimeVsTargetPercent !== undefined && (
              <span className="ml-1 text-emerald-600 font-semibold">
                &middot; {summary.studyTimeVsTargetPercent}% เป้าหมาย
              </span>
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>เซสชันที่เรียน</span>
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {summary.sessionsCount} <span className="text-xs font-normal text-slate-500">เซสชัน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เฉลี่ย {summary.sessionsCount > 0 ? Math.round(summary.totalStudyMinutes / summary.sessionsCount) : 0} นาที/ครั้ง
          </div>
        </div>

        {/* Lessons Completed */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>บทเรียนที่จบ</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {summary.completedLessonsCount} <span className="text-xs font-normal text-slate-500">บท</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.completedLessonsCount > 0 ? 'สำเร็จตามเกณฑ์' : 'ยังไม่มีบทจบ'}
          </div>
        </div>

        {/* Quiz Avg */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>คะแนน Quiz เฉลี่ย</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {summary.averageQuizScore !== undefined ? (
              `${summary.averageQuizScore}%`
            ) : (
              <span className="text-xs text-slate-400 font-normal">ไม่มีทดสอบ</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.quizAttemptsCount} ครั้งในสัปดาห์
          </div>
        </div>

        {/* Reviews */}
        <div className="card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ทบทวน Spaced</span>
            <RotateCcw className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {summary.reviewsCompletedCount} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
          </div>
          <div className="text-[11px] mt-1 flex items-center gap-1">
            {summary.reviewsOverdueCount > 0 ? (
              <span className="text-rose-600 font-semibold">
                ค้างทบทวน {summary.reviewsOverdueCount} เรื่อง
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">ไม่มีค้างทบทวน</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 7 Core Questions Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Q1, Q2, Q3 (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* QUESTION 1 & 2: สัปดาห์นี้เรียนอะไร & เรียนกี่ชั่วโมง? */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                  Q1 & Q2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    สัปดาห์นี้เรียนอะไร & เรียนกี่ชั่วโมง?
                  </h2>
                  <p className="text-xs text-slate-500">
                    เวลาเรียนแยกตามวิชา และรายการเนื้อหาที่ได้เรียนรู้จริง
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                รวม {summary.totalStudyHours} ชม.
              </span>
            </div>

            {/* Subject Breakdown Bars */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                สัดส่วนเวลาเรียนแยกตามวิชา (Subject Breakdown)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(subjectBreakdown).map(([subId, sub]) => {
                  const subjectInfo = SUBJECTS[subId as SubjectId];
                  const percentOfTotal =
                    summary.totalStudyMinutes > 0
                      ? Math.round((sub.studyMinutes / summary.totalStudyMinutes) * 100)
                      : 0;

                  return (
                    <div
                      key={subId}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${subjectInfo.color}`} />
                          <span className="text-xs font-bold text-slate-800">{subjectInfo.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {sub.studyHours} ชม. <span className="text-[10px] text-slate-400 font-normal">({percentOfTotal}%)</span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${subjectInfo.color} transition-all duration-500`}
                          style={{ width: `${percentOfTotal}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{sub.sessionsCount} เซสชัน &middot; จบ {sub.completedLessonsCount} บท</span>
                        {sub.averageQuizScore !== undefined && (
                          <span className="font-medium text-amber-700">Quiz {sub.averageQuizScore}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logged Studied Items List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                รายการเนื้อหาที่เรียนในสัปดาห์นี้ ({studiedItems.length})
              </h3>
              {studiedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  ไม่มีบันทึกการเรียนในสัปดาห์นี้ คุณสามารถกดเริ่มเรียนจากตารางหรือหน้าหลักเพื่อบันทึกความก้าวหน้า
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {studiedItems.map((item) => {
                    const subInfo = SUBJECTS[item.subjectId];
                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${subInfo?.color || 'bg-blue-500'}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {subInfo?.name} &middot; {format(parseISO(item.date), 'dd/MM/yyyy HH:mm น.', { locale: th })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.quizScore !== undefined && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Quiz {item.quizScore}%
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {item.durationMinutes} นาที
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* QUESTION 3: จบกี่บท? (Lessons Completed) */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                  Q3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    จบกี่บทในสัปดาห์นี้?
                  </h2>
                  <p className="text-xs text-slate-500">
                    บทเรียนที่สำเร็จอย่างเป็นทางการ พร้อมผลประเมินความเข้าใจ
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                สำเร็จ {summary.completedLessonsCount} บท
              </span>
            </div>

            {summary.completedLessons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                ยังไม่มีบทเรียนที่สำเร็จในสัปดาห์นี้ ให้ตรวจสอบบทเรียนที่ยังค้างอยู่ในส่วน "สัปดาห์หน้าควรทำอะไร" ด้านล่าง
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.completedLessons.map((l) => {
                  const subInfo = SUBJECTS[l.subjectId];
                  return (
                    <Link
                      to={`/lessons/${l.id}`}
                      key={l.id}
                      className="group block rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          <span className={`h-1.5 w-1.5 rounded-full ${subInfo.color}`} />
                          {subInfo.name}
                        </span>
                        {l.quizScore !== undefined && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            Quiz {l.quizScore}%
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {l.title}
                      </h4>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>เดือนที่ {l.month} &middot; {l.actualStudyMinutes || 60} นาที</span>
                        <span className="flex items-center gap-0.5 text-blue-600 font-medium">
                          ดูบทเรียน <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUESTION 4: เข้าใจอะไรเพิ่ม? (What I Learned) */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold text-xs">
                  Q4
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    เข้าใจอะไรเพิ่มขึ้น? (What I Learned)
                  </h2>
                  <p className="text-xs text-slate-500">
                    บันทึกสรุปความรู้และ Concept สำคัญที่ตกผลึกได้จริงในสัปดาห์นี้
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                {learnedNotesList.length} บันทึก
              </span>
            </div>

            {learnedNotesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                ยังไม่มีบันทึก "สิ่งที่ฉันเรียนรู้" ในสัปดาห์นี้ สามารถจดสรุปหลังจบบทเรียนในสมุดจด (Notebook)
              </div>
            ) : (
              <div className="space-y-3">
                {learnedNotesList.map((note) => {
                  const subInfo = SUBJECTS[note.subjectId];
                  return (
                    <div
                      key={note.id}
                      className="rounded-xl border-l-4 border-l-purple-500 border border-slate-200/80 bg-slate-50/50 p-4 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Link
                          to={`/lessons/${note.lessonId}`}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                          <span>{note.lessonTitle}</span>
                        </Link>
                        {subInfo && (
                          <span className="text-[10px] font-medium text-slate-500">
                            {subInfo.name}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-1">
                        {note.learnedNotes}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Q5, Q6, Q7 (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* QUESTION 5: อะไรยังไม่เข้าใจ? (What's Still Unclear) */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold text-xs">
                  Q5
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    อะไรยังไม่เข้าใจ?
                  </h2>
                  <p className="text-xs text-slate-500">
                    จุดติดขัดที่ต้องติดตามและหาคำตอบ
                  </p>
                </div>
              </div>
              <Link
                to="/not-understood"
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </div>

            {unclearTopicsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700">ไม่มีหัวข้อติดขัด</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ความเข้าใจในทุกบทเรียนอยู่ในเกณฑ์ดีเยี่ยม
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unclearTopicsList.slice(0, 4).map((u) => {
                  const subInfo = SUBJECTS[u.subjectId];
                  return (
                    <div
                      key={u.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {u.topic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            u.priority === 'High'
                              ? 'bg-rose-50 text-rose-600'
                              : u.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {u.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{u.details}</p>
                      {subInfo && (
                        <div className="text-[10px] text-slate-400 pt-1">
                          วิชา: {subInfo.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUESTION 6: อะไรควรทบทวน? (What to Review) */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-xs">
                  Q6
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    อะไรควรทบทวน?
                  </h2>
                  <p className="text-xs text-slate-500">
                    คิว Spaced Repetition ที่ถึงกำหนด
                  </p>
                </div>
              </div>
            </div>

            {nextWeekPlan.reviewDueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-500">
                <Sparkles className="h-8 w-8 text-amber-500 mb-2" />
                <p className="font-semibold text-slate-700">ไม่มีคิวค้างทบทวน</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ความจำถูกเสริมแรงตามรอบ Spaced Repetition ครบถ้วน
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {nextWeekPlan.reviewDueItems.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{r.topic}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ทบทวนแล้ว {r.reviewCount} รอบ &middot; กำหนด:{' '}
                        {format(parseISO(r.nextReviewAt), 'dd/MM/yyyy', { locale: th })}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveReviewItem(r)}
                      aria-label={`ทบทวน ${r.topic}`}
                      className="shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-2xs"
                    >
                      ทบทวน
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUESTION 7: สัปดาห์หน้าควรทำอะไร? (Next Week Action Plan) */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                  Q7
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    สัปดาห์หน้าควรทำอะไร?
                  </h2>
                  <p className="text-xs text-slate-500">
                    Action Plan จากระบบจัดตารางและแผน 6 เดือน
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Unfinished lessons */}
              {nextWeekPlan.unfinishedLessons.length > 0 && (
                <div>
                  <h4 className="font-bold text-rose-600 flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> บทเรียนค้างที่ต้องเคลียร์
                  </h4>
                  <div className="space-y-1.5 pl-1">
                    {nextWeekPlan.unfinishedLessons.map((l) => (
                      <Link
                        to={`/lessons/${l.id}`}
                        key={l.id}
                        className="block text-slate-800 hover:text-blue-600 truncate py-1 border-b border-slate-100"
                      >
                        &bull; {l.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming lessons */}
              <div>
                <h4 className="font-bold text-blue-600 flex items-center gap-1.5 mb-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> บทเรียนแนะนำถัดไป
                </h4>
                <div className="space-y-1.5 pl-1">
                  {nextWeekPlan.upcomingLessons.length > 0 ? (
                    nextWeekPlan.upcomingLessons.map((l) => (
                      <Link
                        to={`/lessons/${l.id}`}
                        key={l.id}
                        className="block text-slate-800 hover:text-blue-600 truncate py-1 border-b border-slate-100"
                      >
                        &bull; {l.title}
                      </Link>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400">ครบตามเป้าหมายของเดือนนี้แล้ว</p>
                  )}
                </div>
              </div>

              {/* Milestones to hit */}
              {nextWeekPlan.milestones.length > 0 && (
                <div>
                  <h4 className="font-bold text-purple-600 flex items-center gap-1.5 mb-1.5">
                    <Target className="h-3.5 w-3.5" /> Milestone ประจำเดือน
                  </h4>
                  <div className="space-y-1.5 pl-1">
                    {nextWeekPlan.milestones.slice(0, 2).map((m) => (
                      <div key={m.id} className="py-1 border-b border-slate-100 text-slate-800">
                        <span className="font-semibold">&bull; {m.title}</span>
                        <p className="text-[10px] text-slate-500 pl-2">{m.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                to="/planner"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <span>จัดตารางเรียนสัปดาห์หน้า</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal Integration */}
      <ReviewSessionModal
        reviewItem={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
      />
    </div>
  );
};
