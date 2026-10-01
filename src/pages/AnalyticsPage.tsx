import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type {
  AnalyticsDateRange,
  DailyStudyPoint,
  QuizTrendPoint,
  SubjectId,
} from '../types';
import { computeLearningAnalytics } from '../utils/analyticsUtils';
import { StudyTimeChart } from '../components/analytics/StudyTimeChart';
import { QuizTrendChart } from '../components/analytics/QuizTrendChart';
import { SubjectDistributionChart } from '../components/analytics/SubjectDistributionChart';
import { PlannedVsActualChart } from '../components/analytics/PlannedVsActualChart';
import { AnalyticsDetailModal } from '../components/analytics/AnalyticsDetailModal';
import {
  BarChart3,
  Clock,
  Calendar,
  CheckCircle2,
  Award,
  RotateCcw,
  Target,
  Sparkles,
  PieChart,
  Brain,
  TrendingUp,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { lessons, sessions, learningSessionsHistory, reviewQueue } = useStore();

  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('30d');

  // Drill-down modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DailyStudyPoint | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizTrendPoint | null>(null);

  // Compute analytics
  const report = useMemo(() => {
    return computeLearningAnalytics({
      dateRange,
      lessons,
      sessions,
      learningSessionsHistory,
      reviewQueue,
    });
  }, [dateRange, lessons, sessions, learningSessionsHistory, reviewQueue]);

  // Click handlers for drill-down
  const handleSelectDay = (day: DailyStudyPoint) => {
    setSelectedDay(day);
    setSelectedSubjectId(null);
    setSelectedQuiz(null);
    setIsDetailModalOpen(true);
  };

  const handleSelectSubject = (subjectId: SubjectId) => {
    setSelectedSubjectId(subjectId);
    setSelectedDay(null);
    setSelectedQuiz(null);
    setIsDetailModalOpen(true);
  };

  const handleSelectQuiz = (quiz: QuizTrendPoint) => {
    setSelectedQuiz(quiz);
    setSelectedDay(null);
    setSelectedSubjectId(null);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDay(null);
    setSelectedSubjectId(null);
    setSelectedQuiz(null);
  };

  // Top Subject calculation
  const topSubject = useMemo(() => {
    const sorted = [...report.subjectAllocation].sort((a, b) => b.minutes - a.minutes);
    return sorted[0];
  }, [report.subjectAllocation]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Date Filter */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Phase 16 &middot; Real-Data Learning Analytics</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              สถิติและการวิเคราะห์การเรียนรู้
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              รายงานเชิงลึกจากข้อมูลจริง: เวลาเรียนเฉลี่ย ความต่อเนื่อง วินัยตามแผน และระดับความเข้าใจในเนื้อหา
            </p>
          </div>

          {/* Date Filter Segmented Controls */}
          <div className="flex items-center rounded-2xl bg-white/10 p-1 backdrop-blur-xs shrink-0 self-start md:self-auto">
            <button
              onClick={() => setDateRange('7d')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                dateRange === '7d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              7 วัน
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                dateRange === '30d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              30 วัน
            </button>
            <button
              onClick={() => setDateRange('90d')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                dateRange === '90d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              90 วัน
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                dateRange === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              ทั้งหมด (All)
            </button>
          </div>
        </div>
      </div>

      {/* 10 Core Metrics Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Metric 1: Total Study Hours */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>1. เวลาเรียนรวม</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.totalStudyHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {report.totalStudyMinutes} นาที ในช่วงที่เลือก
          </p>
        </div>

        {/* Metric 2: Average Daily Study */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>2. เฉลี่ยต่อวัน</span>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.averageDailyStudyHours} <span className="text-xs font-normal text-slate-500">ชม./วัน</span>
          </div>
          <p className="text-[11px] text-slate-400">
            ({report.averageDailyActiveHours} ชม. ในวันที่เรียนจริง)
          </p>
        </div>

        {/* Metric 3: Weekly Study */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>3. เรียนรอบสัปดาห์</span>
            <TrendingUp className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.weeklyStudyHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {report.weeklyHoursChangePercent !== undefined ? (
              <span className={report.weeklyHoursChangePercent >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                {report.weeklyHoursChangePercent >= 0 ? `+${report.weeklyHoursChangePercent}%` : `${report.weeklyHoursChangePercent}%`} vs สัปดาห์ก่อน
              </span>
            ) : (
              '7 วันล่าสุด'
            )}
          </p>
        </div>

        {/* Metric 4: Monthly Study */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>4. เรียนรอบเดือน</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.monthlyStudyHours} <span className="text-xs font-normal text-slate-500">ชม.</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {report.monthlyHoursChangePercent !== undefined ? (
              <span className={report.monthlyHoursChangePercent >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                {report.monthlyHoursChangePercent >= 0 ? `+${report.monthlyHoursChangePercent}%` : `${report.monthlyHoursChangePercent}%`} vs เดือนก่อน
              </span>
            ) : (
              '30 วันล่าสุด'
            )}
          </p>
        </div>

        {/* Metric 5: Lessons Completed */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>5. บทเรียนที่จบ</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.lessonsCompletedCount} <span className="text-xs font-normal text-slate-500">บท</span>
          </div>
          <p className="text-[11px] text-slate-400">
            สำเร็จตามเกณฑ์ประเมิน
          </p>
        </div>

        {/* Metric 6: Quiz Trend */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>6. คะแนน Quiz เฉลี่ย</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.quizScoreAverage !== undefined ? (
              `${report.quizScoreAverage}%`
            ) : (
              <span className="text-xs text-slate-400 font-normal">ไม่มีทดสอบ</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {report.quizScoreChangePercent !== undefined ? (
              <span className={report.quizScoreChangePercent >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                {report.quizScoreChangePercent >= 0 ? `+${report.quizScoreChangePercent}%` : `${report.quizScoreChangePercent}%`} แนวโน้ม
              </span>
            ) : (
              `${report.quizTrendPoints.length} ครั้งที่ทำ`
            )}
          </p>
        </div>

        {/* Metric 7: Review Completion */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>7. ทบทวน Spaced</span>
            <RotateCcw className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.reviewCompletionRate}%
          </div>
          <p className="text-[11px] text-slate-400">
            {report.reviewsCompletedCount} จาก {report.reviewsTotalDueCount} รอบกำหนด
          </p>
        </div>

        {/* Metric 8: Mastery Distribution */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>8. ระดับความเข้าใจ</span>
            <Brain className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.masteryDistribution.filter((m) => m.score >= 3).reduce((acc, curr) => acc + curr.percentage, 0)}%
          </div>
          <p className="text-[11px] text-slate-400">
            ระดับทำโจทย์ & ประยุกต์ได้
          </p>
        </div>

        {/* Metric 9: Subject Allocation */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>9. วิชาที่เน้นสุด</span>
            <PieChart className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 truncate">
            {topSubject?.name || 'ไม่มีข้อมูล'}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {topSubject ? `${topSubject.hours} ชม. (${topSubject.percentage}%)` : '-'}
          </p>
        </div>

        {/* Metric 10: Planned vs Actual Adherence */}
        <div className="card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>10. วินัยตามแผน</span>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {report.plannedVsActual.adherencePercent}%
          </div>
          <p className="text-[11px] text-slate-400">
            {report.plannedVsActual.totalActualHours} / {report.plannedVsActual.totalPlannedHours} ชม.
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="space-y-6">
        {/* Chart 1: Study Time Over Time (7-day / 30-day view) */}
        <StudyTimeChart
          data={dateRange === '7d' ? report.dailyStudyPoints.slice(-7) : report.dailyStudyPoints.slice(-30)}
          averageDailyHours={report.averageDailyStudyHours}
          onSelectDay={handleSelectDay}
        />

        {/* Grid: Quiz Trend + Planned vs Actual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 2: Quiz Trend */}
          <QuizTrendChart
            data={report.quizTrendPoints}
            averageScore={report.quizScoreAverage}
            scoreChangePercent={report.quizScoreChangePercent}
            onSelectQuiz={handleSelectQuiz}
          />

          {/* Chart 4: Planned vs Actual */}
          <PlannedVsActualChart
            points={report.plannedVsActualPoints}
            totalPlannedHours={report.plannedVsActual.totalPlannedHours}
            totalActualHours={report.plannedVsActual.totalActualHours}
            overallAdherencePercent={report.plannedVsActual.adherencePercent}
          />
        </div>

        {/* Chart 3: Subject Distribution */}
        <SubjectDistributionChart
          data={report.subjectAllocation}
          totalStudyHours={report.totalStudyHours}
          onSelectSubject={handleSelectSubject}
        />

        {/* Chart 5: Mastery Level Distribution Breakdown */}
        <div className="card p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                การกระจายระดับความเข้าใจ (Mastery Scale 0-4 Distribution)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ตอบคำถาม: ระดับความเข้าใจของเนื้อหาทั้งหมดอยู่ในระดับใด? เข้าใจอย่างถ่องแท้แล้วกี่บท?
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
              รวม {lessons.length} บทเรียน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {report.masteryDistribution.map((m) => (
              <div
                key={m.score}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    ระดับ {m.score}: {m.title}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{m.count} บท</span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full ${m.barColor} transition-all duration-500`}
                    style={{ width: `${m.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{m.level}</span>
                  <span className="font-semibold text-slate-700">{m.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down Interactive Modal */}
      <AnalyticsDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        selectedDay={selectedDay}
        selectedSubjectId={selectedSubjectId}
        selectedQuiz={selectedQuiz}
        lessons={lessons}
      />
    </div>
  );
};
