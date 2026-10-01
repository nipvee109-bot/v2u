import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Map as MapIcon,
  Award,
  Target,
  AlertTriangle,
  Compass,
  Sparkles,
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { SubjectId, ReviewItem, KnowledgeGap } from '../types';
import { ReviewSessionModal } from '../components/ReviewSessionModal';
import { KnowledgeGapSection } from '../components/KnowledgeGapSection';
import { KnowledgeGapDetailModal } from '../components/KnowledgeGapDetailModal';
import { StudyOnboardingModal } from '../components/onboarding/StudyOnboardingModal';
import { Link, useNavigate } from 'react-router-dom';
import { computeLessonLearningRecord } from '../store/useStore';
import {
  format,
  isSameDay,
  subDays,
  parseISO,
} from 'date-fns';

// Phase 17 & 18 Smart Dashboard & Onboarding Components & Utils
import {
  getSmartDashboardRecommendation,
  getDashboardRoadmapStatus,
  getDashboardWeeklySummary,
  getRecentLearningMemory,
  checkIsNewUserOnboarding,
} from '../utils/dashboardUtils';
import { shouldShowOnboarding } from '../utils/onboardingUtils';
import { OnboardingBanner } from '../components/dashboard/OnboardingBanner';
import { TodayPlanSection } from '../components/dashboard/TodayPlanSection';
import { ReviewTodaySection } from '../components/dashboard/ReviewTodaySection';
import { ContinueLearningSection } from '../components/dashboard/ContinueLearningSection';
import { WeeklySummarySection } from '../components/dashboard/WeeklySummarySection';
import { RecentMemorySection } from '../components/dashboard/RecentMemorySection';
import { DailyLearningChoice } from '../components/dashboard/DailyLearningChoice';
import { SIX_MONTH_ROADMAP } from '../data/roadmapData';

// ─── Subject raw color mapping ───────────────────────────────────────
const subjectRawColor: Record<SubjectId, string> = {
  math: '#3b82f6',
  programming: '#10b981',
  physics: '#f97316',
  tgat3: '#a855f7',
  ai: '#ef4444',
};

const subjectBgClass: Record<SubjectId, string> = {
  math: 'bg-math',
  programming: 'bg-programming',
  physics: 'bg-physics',
  tgat3: 'bg-tgat',
  ai: 'bg-ai',
};

export function Dashboard() {
  const navigate = useNavigate();
  const {
    lessons,
    sessions = [],
    learningSessionsHistory = [],
    hasCompletedOnboarding,
    getDueReviewItems,
    getKnowledgeGaps,
    getCalculatedGoals,
    createReviewItemForLesson,
    startLearningSession,
    reviewQueue = [],
    goals = [],
    unclearTopics = [],
  } = useStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // ── Onboarding State (Auto-prompt only for fresh users, never force existing users) ──
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  useEffect(() => {
    if (
      shouldShowOnboarding({
        hasCompletedOnboarding,
        lessons,
        sessions,
        learningSessionsHistory,
      })
    ) {
      setIsOnboardingModalOpen(true);
    }
  }, [hasCompletedOnboarding, lessons, sessions, learningSessionsHistory]);

  // ── 1. Smart Recommendation (Section 3: Continue Learning) ───────
  const recommendation = useMemo(() => {
    return getSmartDashboardRecommendation({
      lessons,
      sessions,
      learningSessionsHistory,
    });
  }, [lessons, sessions, learningSessionsHistory]);

  // Secondary upcoming lessons in queue (not started, excluding recommendation)
  const secondaryLessons = useMemo(() => {
    return lessons
      .filter((l) => l.status === 'NOT STARTED' && l.id !== recommendation?.lesson.id)
      .slice(0, 2);
  }, [lessons, recommendation]);

  // ── 2. 6-Month Roadmap Status (Section 7) ────────────────────────
  const roadmapStatus = useMemo(() => {
    return getDashboardRoadmapStatus({ lessons });
  }, [lessons]);

  // ── 3. Weekly Summary Snapshot (Section 6) ───────────────────────
  const weeklySummary = useMemo(() => {
    return getDashboardWeeklySummary({
      lessons,
      sessions,
      learningSessionsHistory,
      reviewQueue,
      targetWeeklyHours: 12,
    });
  }, [lessons, sessions, learningSessionsHistory, reviewQueue]);

  // ── 4. Recent Learning Memory (Section 8) ────────────────────────
  const recentMemories = useMemo(() => {
    return getRecentLearningMemory({
      lessons,
      learningSessionsHistory,
      sessions,
      limit: 3,
    });
  }, [lessons, learningSessionsHistory, sessions]);

  // ── 5. New User Onboarding Check ─────────────────────────────────
  const isNewUser = useMemo(() => {
    return checkIsNewUserOnboarding({
      lessons,
      sessions,
      learningSessionsHistory,
    });
  }, [lessons, sessions, learningSessionsHistory]);

  // ── 6. Study Goals (Section 5: Next Goal) ────────────────────────
  const allCalculatedGoals = useMemo(() => {
    return getCalculatedGoals();
  }, [goals, lessons, sessions, learningSessionsHistory, reviewQueue, getCalculatedGoals]);

  const goalTotalCount = allCalculatedGoals.length;
  const goalCompletedCount = allCalculatedGoals.filter((g) => g.status === 'completed').length;
  // Immediate active goal
  const nextActiveGoal = useMemo(() => {
    const inProgress = allCalculatedGoals.filter((g) => g.status === 'in_progress');
    if (inProgress.length > 0) return inProgress[0];
    return allCalculatedGoals[0] || null;
  }, [allCalculatedGoals]);

  // ── 7. Today's Planned Sessions (Section 1) ──────────────────────
  const todayPlannedSessions = useMemo(() => {
    return sessions
      .filter((s) => s.date === todayStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [sessions, todayStr]);

  // ── 8. Overdue Items Check (Question 2: มีอะไรค้าง?) ─────────────
  const overdueSessions = useMemo(() => {
    return sessions.filter(
      (s) => s.status === 'overdue' || (s.status === 'planned' && s.date < todayStr)
    );
  }, [sessions, todayStr]);

  // ── 9. Review Engine Queue (Section 2) ───────────────────────────
  const dueReviewItems = useMemo(() => {
    return getDueReviewItems();
  }, [reviewQueue, getDueReviewItems]);

  const { overdue: reviewOverdue, dueToday: reviewDueToday, upcoming: reviewUpcoming } = dueReviewItems;
  const totalReviewDueCount = reviewOverdue.length + reviewDueToday.length;
  const [activeReviewItem, setActiveReviewItem] = useState<ReviewItem | null>(null);

  const handleStartReviewItem = (item: ReviewItem) => {
    setActiveReviewItem(item);
  };

  const handleStartAllDue = () => {
    if (reviewOverdue.length > 0) setActiveReviewItem(reviewOverdue[0]);
    else if (reviewDueToday.length > 0) setActiveReviewItem(reviewDueToday[0]);
    else if (reviewUpcoming.length > 0) setActiveReviewItem(reviewUpcoming[0]);
  };

  const handleNextReview = () => {
    const freshDue = getDueReviewItems();
    const nextList = [...freshDue.overdue, ...freshDue.dueToday].filter(
      (r) => r.id !== activeReviewItem?.id
    );
    if (nextList.length > 0) {
      setActiveReviewItem(nextList[0]);
    } else {
      setActiveReviewItem(null);
    }
  };

  // ── 10. Knowledge Gap Analysis (Section 4) ───────────────────────
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const knowledgeGaps = useMemo(() => {
    return getKnowledgeGaps();
  }, [lessons, learningSessionsHistory, sessions, reviewQueue, unclearTopics, getKnowledgeGaps]);

  const handleGapStartReview = (lessonId: string) => {
    const existing = (reviewQueue || []).find(
      (r) => r.lessonId === lessonId && r.status !== 'completed'
    );
    if (existing) {
      setActiveReviewItem(existing);
    } else {
      const newItem = createReviewItemForLesson(lessonId, 'low_quiz_score', 'High');
      setActiveReviewItem(newItem);
    }
  };

  const handleGapReStudy = (lessonId: string) => {
    startLearningSession({ lessonId });
    navigate(`/study/${lessonId}`);
  };

  const handleGapTakeQuiz = (lessonId: string) => {
    navigate(`/lessons/${lessonId}?tab=quiz`);
  };

  const handleGapViewNotes = (lessonId: string) => {
    navigate(`/lessons/${lessonId}?tab=notebook`);
  };

  // ── 11. Core Metrics & Streak ────────────────────────────────────
  const completedLessons = useMemo(() => {
    return lessons.filter((l) => l.status === 'COMPLETED');
  }, [lessons]);

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const day = subDays(today, i);
    const hasCompleted = completedLessons.some(
      (l) => l.completedAt && isSameDay(parseISO(l.completedAt), day)
    );
    if (hasCompleted) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  const totalLessons = lessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  const totalMinutes = completedLessons.reduce(
    (acc, l) => acc + (l.actualStudyMinutes || 0),
    0
  );
  const totalHoursDisplay = (totalMinutes / 60).toFixed(1);

  const totalMasteryPoints = lessons.reduce((acc, l) => {
    const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
    return acc + (record.masteryScore ?? 0);
  }, 0);
  const overallAverageMastery =
    lessons.length > 0 ? (Math.round((totalMasteryPoints / lessons.length) * 10) / 10).toFixed(1) : '0.0';

  // Subject progress breakdown
  const subjectProgress = (Object.keys(SUBJECTS) as SubjectId[]).map((subjectId) => {
    const subjectLessons = lessons.filter((l) => l.subjectId === subjectId);
    const completed = subjectLessons.filter((l) => l.status === 'COMPLETED').length;
    const total = subjectLessons.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const subjectMasterySum = subjectLessons.reduce((acc, l) => {
      const record = computeLessonLearningRecord(l, learningSessionsHistory, sessions);
      return acc + (record.masteryScore ?? 0);
    }, 0);
    const avgMastery =
      total > 0 ? (Math.round((subjectMasterySum / total) * 10) / 10).toFixed(1) : '0.0';

    return {
      ...SUBJECTS[subjectId],
      completed,
      total,
      percent,
      avgMastery,
    };
  });

  // Month-by-month progress for roadmap cards
  const monthProgress = Array.from({ length: 6 }, (_, i) => {
    const month = i + 1;
    const monthLessons = lessons.filter((l) => l.month === month);
    const completed = monthLessons.filter((l) => l.status === 'COMPLETED').length;
    const total = monthLessons.length;
    const cfg = SIX_MONTH_ROADMAP.find((m) => m.month === month);
    return {
      month,
      completed,
      total,
      title: cfg ? cfg.title.split(':')[1]?.trim() || `เดือนที่ ${month}` : `เดือนที่ ${month}`,
      isActive: month === roadmapStatus.currentMonth,
    };
  });



  return (
    <div className="space-y-6 pb-20">
      {/* ═══════════ COMMAND CENTER HERO ═══════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] p-4 sm:p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Greeting & Roadmap position */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-semibold text-blue-300 border border-blue-400/20">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Phase 17 &middot; Smart Learning Command Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              ศูนย์ควบคุมการเรียนรู้
            </h1>
            <p className="text-white/70 text-xs md:text-sm max-w-lg">
              ตอบคำถามครบ 7 ด้าน: งานวันนี้ &middot; คิวทบทวน &middot; Roadmap &middot; จุดเสริม &middot; เป้าหมายถัดไป
            </p>

            {/* Answer 4: ตอนนี้ roadmap อยู่ตรงไหน? */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                to="/roadmap"
                aria-label={`Roadmap เดือนที่ ${roadmapStatus.currentMonth} จาก 6`}
                className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-xl bg-white/10 hover:bg-white/15 text-xs text-blue-300 border border-white/10 transition-colors focus:ring-2 focus:ring-blue-400"
              >
                <MapIcon className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                <span className="font-bold">
                  Roadmap: เดือนที่ {roadmapStatus.currentMonth}/6
                </span>
                <span className="text-white/50">&middot;</span>
                <span className="text-white/80 line-clamp-1">
                  {roadmapStatus.monthTitle.split(':')[1]?.trim() || roadmapStatus.monthTitle}
                </span>
                <ArrowRight className="w-3 h-3 text-blue-400 ml-1" aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={() => setIsOnboardingModalOpen(true)}
                aria-label="เปิดตัวช่วยสร้างแผนการเรียน 6 ขั้นตอน (Study Onboarding)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-xs text-blue-200 border border-blue-400/30 transition-colors focus:ring-2 focus:ring-blue-400"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" aria-hidden="true" />
                <span>ตัวช่วยสร้างแผน (Onboarding)</span>
              </button>
            </div>
          </div>

          {/* Right Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Streak */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-3 sm:p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <span className="text-[11px] text-white/60 font-medium">Streak</span>
              </div>
              <p className="text-xl font-bold">
                {streak} <span className="text-xs font-normal text-white/50">วัน</span>
              </p>
            </div>

            {/* Total Study Hours */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-3 sm:p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-400" aria-hidden="true" />
                <span className="text-[11px] text-white/60 font-medium">เวลาเรียน</span>
              </div>
              <p className="text-xl font-bold">
                {totalHoursDisplay} <span className="text-xs font-normal text-white/50">ชม.</span>
              </p>
            </div>

            {/* Overall Progress */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-3 sm:p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-[11px] text-white/60 font-medium">ความก้าวหน้า</span>
              </div>
              <p className="text-xl font-bold">
                {progressPercent}% <span className="text-xs font-normal text-white/50">รวม</span>
              </p>
            </div>

            {/* Mastery Score */}
            <Link
              to="/progress"
              aria-label={`ระดับความเข้าใจ Mastery เฉลี่ย ${overallAverageMastery} จาก 4.0`}
              className="bg-white/[0.07] hover:bg-white/[0.12] transition-colors backdrop-blur border border-purple-400/30 rounded-2xl p-3 sm:p-3.5 group focus:ring-2 focus:ring-purple-400 focus:outline-none"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <span className="text-[11px] text-purple-200 font-medium">Mastery</span>
              </div>
              <p className="text-xl font-bold text-white">
                {overallAverageMastery}{' '}
                <span className="text-xs font-normal text-purple-300">/ 4.0</span>
              </p>
            </Link>

            {/* Goals */}
            <Link
              to="/goals"
              aria-label={`เป้าหมายที่สำเร็จแล้ว ${goalCompletedCount} จาก ${goalTotalCount}`}
              className="col-span-2 sm:col-span-1 bg-white/[0.07] hover:bg-white/[0.12] transition-colors backdrop-blur border border-blue-400/30 rounded-2xl p-3 sm:p-3.5 group focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-4 h-4 text-blue-300 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <span className="text-[11px] text-blue-200 font-medium">เป้าหมาย</span>
              </div>
              <p className="text-xl font-bold text-white">
                {goalCompletedCount}{' '}
                <span className="text-xs font-normal text-blue-300">/ {goalTotalCount}</span>
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ EMPTY STATE / ONBOARDING ═══════════ */}
      {isNewUser && (
        <OnboardingBanner
          firstLesson={lessons[0]}
          onStartFirstLesson={(id) => {
            startLearningSession({ lessonId: id });
            navigate(`/study/${id}`);
          }}
          onOpenWizard={() => setIsOnboardingModalOpen(true)}
        />
      )}

      {/* ═══════════ ANSWER 2: มีอะไรค้าง? (OVERDUE ALERT BANNER) ═══════════ */}
      {(overdueSessions.length > 0 || reviewOverdue.length > 0) && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                2. มีงานค้างที่ต้องจัดการ: {overdueSessions.length} เซสชันค้าง &middot;{' '}
                {reviewOverdue.length} หัวข้อเลยกำหนดทบทวน
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                รีบเคลียร์คิวทบทวน Spaced Repetition หรือจัดตารางใหม่ใน Planner เพื่อรักษาความจำระยะยาว
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {reviewOverdue.length > 0 && (
              <button
                onClick={handleStartAllDue}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                เคลียร์ทบทวน ({reviewOverdue.length})
              </button>
            )}
            {overdueSessions.length > 0 && (
              <Link
                to="/planner"
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                จัดตารางใหม่ &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ PRIMARY ACTION: วันนี้อยากเรียนอะไร? (DAILY LEARNING CHOICE) ═══════════ */}
      <DailyLearningChoice
        lessons={lessons}
        sessions={sessions}
        learningSessionsHistory={learningSessionsHistory}
        reviewQueue={reviewQueue}
        onStartLesson={(lessonId, resource) => {
          startLearningSession({ lessonId, source: resource });
          navigate(`/study/${lessonId}`);
        }}
      />

      {/* ═══════════ SECTION 1: TODAY PLAN (วันนี้ต้องทำอะไร?) ═══════════ */}
      <TodayPlanSection
        todaySessions={todayPlannedSessions}
        onStartSession={(session) => {
          if (session.lessonId) {
            startLearningSession({ lessonId: session.lessonId, plannedSessionId: session.id });
            navigate(`/study/${session.lessonId}`);
          } else {
            navigate('/planner');
          }
        }}
      />

      {/* ═══════════ SECTION 2: REVIEW TODAY (วันนี้ต้องทบทวนอะไร?) ═══════════ */}
      <ReviewTodaySection
        overdue={reviewOverdue}
        dueToday={reviewDueToday}
        upcoming={reviewUpcoming}
        lessons={lessons}
        onStartReview={handleStartReviewItem}
        onStartAllDue={handleStartAllDue}
      />

      {/* ═══════════ SECTION 3: CONTINUE LEARNING (เรียนรู้ต่อ) ═══════════ */}
      <ContinueLearningSection
        recommendation={recommendation}
        secondaryLessons={secondaryLessons}
        onStartLesson={(id) => {
          startLearningSession({ lessonId: id });
          navigate(`/study/${id}`);
        }}
      />

      {/* ═══════════ SECTION 4: KNOWLEDGE GAPS (มีวิชาไหนที่ต้องกลับไปเสริม?) ═══════════ */}
      <KnowledgeGapSection
        gaps={knowledgeGaps}
        onSelectGap={(gap) => setSelectedGap(gap)}
        onStartReview={(lessonId) => handleGapStartReview(lessonId)}
        onReStudy={(lessonId) => handleGapReStudy(lessonId)}
      />

      {/* ═══════════ SECTION 5: PROGRESS & ACTIVE GOALS (เป้าหมายถัดไปคืออะไร?) ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Active Goal Card (Answer 7: เป้าหมายถัดไปคืออะไร?) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  5. เป้าหมายถัดไปคืออะไร? (Next Goal)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ความก้าวหน้าสู่เป้าหมายสำคัญที่อยู่ระหว่างดำเนินการ
                </p>
              </div>
            </div>
            <Link
              to="/goals"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>เป้าหมายทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nextActiveGoal ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase tracking-wider">
                    {nextActiveGoal.type.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">
                    {nextActiveGoal.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {nextActiveGoal.description}
                  </p>
                </div>
                <span className="text-xl font-extrabold text-blue-600 shrink-0">
                  {nextActiveGoal.progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    ปัจจุบัน: <strong className="text-slate-800">{nextActiveGoal.currentValue}</strong> / {nextActiveGoal.targetValue} {nextActiveGoal.unit}
                  </span>
                  <span>
                    เหลืออีก: <strong className="text-slate-800">{nextActiveGoal.remainingValue}</strong> {nextActiveGoal.unit}
                  </span>
                </div>
                <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, nextActiveGoal.progressPercent)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  กำหนดเสร็จ: {format(parseISO(nextActiveGoal.targetDate), 'dd/MM/yyyy')}
                </span>
                <span className="font-semibold text-blue-700">
                  {nextActiveGoal.remainingDays > 0
                    ? `เหลือเวลาอีก ${nextActiveGoal.remainingDays} วัน`
                    : 'ครบกำหนดวันนี้'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              ยังไม่มีเป้าหมายที่ตั้งไว้ คลิกเพื่อตั้งเป้าหมายแรก
            </div>
          )}

          {/* Quick link to Analytics */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span>ดูรายงานและสถิติการเรียนรู้เชิงลึก 10 มิติ</span>
            <Link
              to="/analytics"
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>เปิด Analytics Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Subject Progress Matrix */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ความก้าวหน้าแยกวิชา
                </h2>
                <p className="text-xs text-slate-400">Completion vs Mastery</p>
              </div>
            </div>
            <Link
              to="/progress"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>เมทริกซ์เต็ม</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {subjectProgress.map((sub) => (
              <div key={sub.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subjectRawColor[sub.id] }}
                    />
                    <span className="font-semibold text-slate-800">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                      M {sub.avgMastery}/4
                    </span>
                    <span className="text-slate-500 font-medium">
                      {sub.completed}/{sub.total} ({sub.percent}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${subjectBgClass[sub.id]}`}
                    style={{ width: `${sub.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ SECTION 6: WEEKLY SUMMARY (สัปดาห์นี้เรียนไปเท่าไร?) ═══════════ */}
      <WeeklySummarySection summary={weeklySummary} />

      {/* ═══════════ SECTION 7: 6-MONTH ROADMAP (ตอนนี้ roadmap อยู่ตรงไหน?) ═══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900">
                  7. แผนเตรียมตัว 6 เดือน (6-Month Roadmap)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  กำลังอยู่ในเดือนที่ {roadmapStatus.currentMonth}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {roadmapStatus.monthTitle} &middot; เป้าหมาย {roadmapStatus.targetHours} ชม. &middot; สำเร็จแล้ว {roadmapStatus.completedLessonsCount}/{roadmapStatus.totalLessonsCount} บท ({roadmapStatus.progressPercent}%)
              </p>
            </div>
          </div>

          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/70 transition-colors shrink-0"
          >
            <span>เปิด Roadmap เต็ม</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 6 Month Progression Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {monthProgress.map((m) => {
            const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
            return (
              <Link
                key={m.month}
                to={`/roadmap?month=${m.month}`}
                className={`p-3.5 rounded-2xl border transition-all text-left block ${
                  m.isActive
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                      m.isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.month}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">{pct}%</span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  เดือนที่ {m.month}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {m.title}
                </p>
                <div className="mt-2 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.isActive ? 'bg-blue-600' : 'bg-slate-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════ SECTION 8: RECENT LEARNING MEMORY ═══════════ */}
      <RecentMemorySection recentMemories={recentMemories} />

      {/* Modals */}
      <ReviewSessionModal
        reviewItem={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onNext={handleNextReview}
        hasMoreDue={totalReviewDueCount > 1}
      />

      <KnowledgeGapDetailModal
        gap={selectedGap}
        onClose={() => setSelectedGap(null)}
        onStartReview={(lessonId) => handleGapStartReview(lessonId)}
        onReStudy={(lessonId) => handleGapReStudy(lessonId)}
        onTakeQuiz={(lessonId) => handleGapTakeQuiz(lessonId)}
        onViewNotes={(lessonId) => handleGapViewNotes(lessonId)}
      />

      {/* Phase 18: Study Onboarding Wizard Modal */}
      <StudyOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        lessons={lessons}
      />
    </div>
  );
}
