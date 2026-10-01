import { useState, useMemo } from 'react';
import { useStore, computeLessonLearningRecord } from '../store/useStore';
import { 
  Flame, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Award,
  HelpCircle,
  Layers
} from 'lucide-react';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import type { ReviewItem } from '../types';
import { format, isSameDay, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import { SubjectMasterySummaryCards } from '../components/SubjectMasterySummaryCards';
import { TopicsNeedingAttentionCard } from '../components/TopicsNeedingAttentionCard';
import { TopicMasteryMatrix } from '../components/TopicMasteryMatrix';
import { MasteryScaleGuideModal } from '../components/MasteryScaleGuideModal';
import { ReviewSessionModal } from '../components/ReviewSessionModal';

type ActiveTab = 'overview' | 'matrix' | 'history';

export function ProgressPage() {
  const { 
    lessons, 
    learningSessionsHistory = [], 
    sessions = [],
    reviewQueue = [],
    createReviewItemForLesson,
    getSubjectMasterySummaries,
    getTopicsNeedingAttention,
    getDueReviewItems
  } = useStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeReviewItem, setActiveReviewItem] = useState<ReviewItem | null>(null);

  // ── Metrics Computation ──────────────────────────────────────────
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.status === 'COMPLETED');
  const completionRate = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  // Study hours
  const totalStudyMinutes = lessons.reduce((acc, l) => {
    const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
    return acc + record.totalStudyMinutes;
  }, 0);
  const totalHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  // Assessments (Quiz)
  const quizScores = lessons
    .map(l => computeLessonLearningRecord(l, learningSessionsHistory, sessions).quizBestScore)
    .filter((s): s is number => s !== undefined);
  const averageQuizScore = quizScores.length > 0 
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : undefined;

  // Mastery (0-4 Scale)
  const allRecords = useMemo(() => {
    return lessons.map(l => {
      const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
      return {
        lesson: l,
        record,
        masteryScore: record.masteryScore ?? 0,
      };
    });
  }, [lessons, learningSessionsHistory, sessions]);

  const totalMasteryPoints = allRecords.reduce((acc, r) => acc + r.masteryScore, 0);
  const overallAverageMastery = totalLessons > 0 ? Math.round((totalMasteryPoints / totalLessons) * 10) / 10 : 0;
  const overallMasteryPercent = Math.round((overallAverageMastery / 4) * 100);

  // Confidence distribution
  const highConfidenceCount = allRecords.filter(r => r.record.confidence === 'High').length;
  const mediumConfidenceCount = allRecords.filter(r => r.record.confidence === 'Medium').length;

  // Streak
  const calculateStreak = () => {
    let streak = 0; 
    let checkDate = new Date();
    while (true) {
      if (completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate))) {
        streak++; 
        checkDate = subDays(checkDate, 1);
      } else {
        if (streak === 0 && isSameDay(checkDate, new Date())) {
          checkDate = subDays(checkDate, 1);
          if (completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate))) {
            streak++;
            checkDate = subDays(checkDate, 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };
  const streak = calculateStreak();

  const sortedHistory = [...completedLessons].sort(
    (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  );

  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const ct = completedLessons.filter(l => l.completedAt && isSameDay(parseISO(l.completedAt), date));
    return {
      date,
      count: ct.length,
      hours: ct.reduce((a, l) => a + (l.actualStudyMinutes || l.durationHours * 60), 0) / 60,
    };
  });

  // Subject summaries & topics needing attention
  const subjectSummaries = useMemo(() => getSubjectMasterySummaries(), [lessons, learningSessionsHistory, sessions]);
  const topicsNeedingAttention = useMemo(() => getTopicsNeedingAttention(), [lessons, learningSessionsHistory, sessions, reviewQueue]);

  // Matrix items mapping
  const matrixItems = useMemo(() => {
    const attentionMap = new Map(topicsNeedingAttention.map(t => [t.lessonId, t.reasons]));
    return allRecords.map(item => ({
      lesson: item.lesson,
      record: item.record,
      masteryScore: item.masteryScore,
      needsAttention: attentionMap.has(item.lesson.id),
      attentionReasons: attentionMap.get(item.lesson.id) || [],
    }));
  }, [allRecords, topicsNeedingAttention]);

  // Handler for review from cards or matrix
  const handleStartReview = (lessonId: string, _title?: string) => {
    let revItem = reviewQueue.find(r => r.lessonId === lessonId && r.status !== 'completed');
    if (!revItem) {
      revItem = createReviewItemForLesson(lessonId, 'spaced_repetition');
    }
    setActiveReviewItem(revItem);
  };

  const dueItems = getDueReviewItems();
  const totalDueCount = dueItems.overdue.length + dueItems.dueToday.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* ═══════════ Hero: 5 Core Metrics ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">บันทึกความก้าวหน้า & ระดับความเข้าใจ</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Mastery Tracking
              </span>
            </div>
            <p className="text-white/60 text-xs sm:text-sm mt-1">
              ระบบแยกการเรียนจบ (Completion) ออกจากระดับความเข้าใจแท้จริง (Mastery 0–4)
            </p>
          </div>

          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <HelpCircle className="w-4 h-4 text-purple-300" />
            <span>เกณฑ์ประเมิน 0–4</span>
          </button>
        </div>

        {/* 5 Core Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 relative z-10">
          {/* 1. Completion */}
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-4 border border-white/[0.08]">
            <div className="bg-blue-500/15 w-8 h-8 rounded-lg flex items-center justify-center mb-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <p className="text-white/60 text-xs font-medium">การเรียนจบ (Completion)</p>
            <p className="text-xl font-bold mt-0.5">{completionRate}%</p>
            <p className="text-[10px] text-white/50 mt-0.5">{completedLessons.length}/{totalLessons} บท</p>
          </div>

          {/* 2. Study Hours */}
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-4 border border-white/[0.08]">
            <div className="bg-emerald-500/15 w-8 h-8 rounded-lg flex items-center justify-center mb-2.5">
              <Clock className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <p className="text-white/60 text-xs font-medium">เรียนจริง (Study)</p>
            <p className="text-xl font-bold mt-0.5">{totalHours} ชม.</p>
            <p className="text-[10px] text-white/50 mt-0.5">บันทึกเวลาจริง</p>
          </div>

          {/* 3. Assessment */}
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-4 border border-white/[0.08]">
            <div className="bg-amber-500/15 w-8 h-8 rounded-lg flex items-center justify-center mb-2.5">
              <TrendingUp className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <p className="text-white/60 text-xs font-medium">แบบทดสอบ (Quiz)</p>
            <p className="text-xl font-bold mt-0.5">
              {averageQuizScore !== undefined ? `${averageQuizScore}%` : '-'}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {quizScores.length > 0 ? `ทำไป ${quizScores.length} บท` : 'ยังไม่มีผลสอบ'}
            </p>
          </div>

          {/* 4. Mastery */}
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-4 border border-purple-400/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="bg-purple-500/20 w-8 h-8 rounded-lg flex items-center justify-center mb-2.5">
              <Award className="w-4.5 h-4.5 text-purple-300" />
            </div>
            <p className="text-purple-200 text-xs font-bold">ระดับความเข้าใจ (Mastery)</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{overallAverageMastery}/4.0</p>
            <p className="text-[10px] text-purple-300 mt-0.5">{overallMasteryPercent}% ตามเกณฑ์</p>
          </div>

          {/* 5. Confidence */}
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-4 border border-white/[0.08] col-span-2 md:col-span-1">
            <div className="bg-orange-500/15 w-8 h-8 rounded-lg flex items-center justify-center mb-2.5">
              <Flame className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <p className="text-white/60 text-xs font-medium">Streak & มั่นใจ</p>
            <p className="text-xl font-bold mt-0.5">{streak} วัน</p>
            <p className="text-[10px] text-white/50 mt-0.5">
              มั่นใจสูง {highConfidenceCount} &middot; ปานกลาง {mediumConfidenceCount}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ Tab Navigation ═══════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> สรุปภาพรวมรายวิชา & สิ่งที่ต้องใส่ใจ
          {topicsNeedingAttention.length > 0 && (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {topicsNeedingAttention.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> เมทริกซ์ความเชี่ยวชาญรายบท (Topic Matrix)
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> สถิติเวลา & ประวัติการเรียน
        </button>
      </div>

      {/* ═══════════ TAB 1: OVERVIEW & ATTENTION ═══════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Topics Needing Attention */}
          <TopicsNeedingAttentionCard
            items={topicsNeedingAttention}
            onStartReview={handleStartReview}
          />

          {/* Subject Summaries */}
          <SubjectMasterySummaryCards
            summaries={subjectSummaries}
            onSelectSubject={() => setActiveTab('matrix')}
          />
        </div>
      )}

      {/* ═══════════ TAB 2: TOPIC MASTERY MATRIX ═══════════ */}
      {activeTab === 'matrix' && (
        <div className="animate-in fade-in-50 duration-200">
          <TopicMasteryMatrix
            items={matrixItems}
            onStartReview={handleStartReview}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        </div>
      )}

      {/* ═══════════ TAB 3: STUDY TIME & HISTORY ═══════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 7-day chart */}
            <div className="lg:col-span-2 card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-400" /> สถิติเวลาเรียนจริง 7 วันย้อนหลัง
              </h2>
              <div className="flex items-end justify-between h-36 gap-3 mb-4">
                {past7Days.map((day, idx) => {
                  const maxH = Math.max(...past7Days.map(d => d.hours), 3);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full bg-slate-100 rounded-lg relative flex items-end justify-center" style={{ height: '100%' }}>
                        <div
                          className="w-full rounded-lg transition-all duration-500 bg-blue-500 group-hover:bg-blue-600"
                          style={{
                            height: day.hours > 0 ? `${(day.hours / maxH) * 100}%` : '2px',
                            minHeight: day.hours > 0 ? '8px' : '2px',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {format(day.date, 'EE', { locale: th })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject Distribution */}
            <div className="card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-6">สัดส่วนบทที่เรียนจบ</h2>
              <div className="space-y-4">
                {Object.values(SUBJECTS).map((subject) => {
                  const count = completedLessons.filter(l => l.subjectId === subject.id).length;
                  if (count === 0) return null;
                  const percent = Math.round((count / Math.max(completedLessons.length, 1)) * 100);
                  return (
                    <div key={subject.id}>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                        <span>{subject.name}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${subject.color} rounded-full`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {completedLessons.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีข้อมูลการเรียนจบ</p>
                )}
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-5">ประวัติการเรียนล่าสุด</h2>
            <div className="space-y-0 divide-y divide-slate-100">
              {sortedHistory.length === 0 && (
                <p className="text-slate-400 text-sm py-6 text-center">ยังไม่มีประวัติการเรียนจบ</p>
              )}
              {sortedHistory.map((lesson) => {
                const record = computeLessonLearningRecord(lesson, learningSessionsHistory, sessions);
                const masteryScore = record.masteryScore ?? 0;

                return (
                  <div key={lesson.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${SUBJECTS[lesson.subjectId]?.color || 'bg-slate-400'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{lesson.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {SUBJECTS[lesson.subjectId]?.name} &middot; เรียนไป {record.totalStudyMinutes} นาที &middot; Quiz {record.quizBestScore !== undefined ? `${record.quizBestScore}%` : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${MASTERY_SCALE[masteryScore].badgeClass}`}>
                        Mastery {masteryScore}/4
                      </span>
                      <p className="text-xs font-medium text-slate-400">
                        {lesson.completedAt ? format(parseISO(lesson.completedAt), 'dd MMM yy', { locale: th }) : '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mastery Scale Guide Modal */}
      <MasteryScaleGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Review Session Modal */}
      <ReviewSessionModal
        reviewItem={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onNext={() => {
          const freshDue = getDueReviewItems();
          const nextList = [...freshDue.overdue, ...freshDue.dueToday].filter(r => r.id !== activeReviewItem?.id);
          setActiveReviewItem(nextList.length > 0 ? nextList[0] : null);
        }}
        hasMoreDue={totalDueCount > 1}
      />
    </div>
  );
}
