import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Calendar as CalendarIcon,
  BookOpen,
  AlertCircle,
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Map as MapIcon,
  GraduationCap,
  Zap,
  PlayCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { SubjectId } from '../types';
import { Link } from 'react-router-dom';
import {
  format,
  isSameDay,
  subDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
} from 'date-fns';
import { th } from 'date-fns/locale';

// ─── Subject icon mapping ───────────────────────────────────────────
const subjectIconMap: Record<SubjectId, typeof BookOpen> = {
  math: TrendingUp,
  programming: Zap,
  physics: GraduationCap,
  tgat3: BookOpen,
  ai: Zap,
};

// ─── Subject raw color mapping (for inline styles) ──────────────────
const subjectRawColor: Record<SubjectId, string> = {
  math: '#3b82f6',
  programming: '#10b981',
  physics: '#f97316',
  tgat3: '#a855f7',
  ai: '#ef4444',
};

// ─── Subject bg class mapping ───────────────────────────────────────
const subjectBgClass: Record<SubjectId, string> = {
  math: 'bg-math',
  programming: 'bg-programming',
  physics: 'bg-physics',
  tgat3: 'bg-tgat',
  ai: 'bg-ai',
};

// ─── 6-Month Roadmap labels ─────────────────────────────────────────
const monthLabels = [
  'พื้นฐานเข้มข้น',
  'เนื้อหาขั้นกลาง',
  'เนื้อหาขั้นสูง',
  'คณิต + AI Prep',
  'Computer Eng',
  'AI & Final Project',
];

export function Dashboard() {
  const { lessons, unclearTopics, sessions = [] } = useStore();
  const [calendarDate] = useState(new Date());

  // ── Derived data ────────────────────────────────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayPlannedSessions = sessions.filter((s) => s.date === todayStr);
  const todayPlannedHours = Math.round((todayPlannedSessions.reduce((acc, s) => acc + s.plannedMinutes, 0) / 60) * 10) / 10;
  const todayCompletedHours = Math.round(
    (todayPlannedSessions
      .filter((s) => s.status === 'completed')
      .reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes), 0) /
      60) *
      10
  ) / 10;
  const overdueSessionsCount = sessions.filter(
    (s) => s.status === 'overdue' || (s.status === 'planned' && s.date < todayStr)
  ).length;

  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED');
  const todayLessons = lessons
    .filter(
      (l) =>
        l.status === 'IN PROGRESS' ||
        (l.month === 1 && l.status === 'NOT STARTED')
    )
    .slice(0, 3);
  const urgentUnclear = unclearTopics
    .filter((t) => t.status !== 'Understood')
    .slice(0, 5);
  const allResources = lessons
    .flatMap((l) =>
      l.resources.map((r) => ({
        ...r,
        lessonId: l.id,
        lessonTitle: l.title,
      }))
    )
    .reverse()
    .slice(0, 4);

  // ── Streak calculation ──────────────────────────────────────────
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

  // ── Progress ────────────────────────────────────────────────────
  const totalLessons = lessons.length;
  const progressPercent =
    totalLessons > 0
      ? Math.round((completedLessons.length / totalLessons) * 100)
      : 0;

  // ── Study hours ─────────────────────────────────────────────────
  const totalMinutes = completedLessons.reduce(
    (acc, l) => acc + (l.actualStudyMinutes || 0),
    0
  );
  const totalHoursDisplay = (totalMinutes / 60).toFixed(1);

  // ── Subject progress ───────────────────────────────────────────
  const subjectProgress = (Object.keys(SUBJECTS) as SubjectId[]).map(
    (subjectId) => {
      const subjectLessons = lessons.filter((l) => l.subjectId === subjectId);
      const completed = subjectLessons.filter(
        (l) => l.status === 'COMPLETED'
      ).length;
      const total = subjectLessons.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...SUBJECTS[subjectId],
        completed,
        total,
        percent,
      };
    }
  );

  // ── Month-level progress for roadmap ────────────────────────────
  const monthProgress = Array.from({ length: 6 }, (_, i) => {
    const month = i + 1;
    const monthLessons = lessons.filter((l) => l.month === month);
    const completed = monthLessons.filter(
      (l) => l.status === 'COMPLETED'
    ).length;
    const total = monthLessons.length;
    return { month, completed, total, label: monthLabels[i] };
  });

  // ── Mini calendar ──────────────────────────────────────────────
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let cursor = calStart;
  while (cursor <= calEnd) {
    calendarDays.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const hasCompletedOnDay = (day: Date) =>
    completedLessons.some(
      (l) => l.completedAt && isSameDay(parseISO(l.completedAt), day)
    );

  const hasLessonOnDay = (day: Date) => {
    const dStr = format(day, 'yyyy-MM-dd');
    return (
      lessons.some((l) => l.date && isSameDay(parseISO(l.date), day)) ||
      sessions.some((s) => s.date === dStr)
    );
  };

  // ── Difficulty color helpers ────────────────────────────────────
  const difficultyStyle = (d: string) => {
    switch (d) {
      case 'Easy':
        return 'bg-emerald-50 text-emerald-600';
      case 'Medium':
        return 'bg-amber-50 text-amber-600';
      case 'Hard':
        return 'bg-rose-50 text-rose-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  const priorityStyle = (p: string) => {
    switch (p) {
      case 'High':
        return 'bg-rose-50 text-rose-600';
      case 'Medium':
        return 'bg-amber-50 text-amber-600';
      case 'Low':
        return 'bg-emerald-50 text-emerald-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  const resourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <PlayCircle className="w-5 h-5 text-rose-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <ExternalLink className="w-5 h-5 text-slate-400" />;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ═══════════ ROW 1: Welcome Hero ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Greeting */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">สวัสดีครับ!</h1>
            <p className="text-white/60 text-sm max-w-md">
              มาเรียนรู้และพัฒนาตัวเองกันต่อ — ทุกก้าวเล็กๆ สำคัญเสมอ
            </p>
            <div className="flex items-center gap-2 mt-3">
              <MapIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">
                เดือนที่ 1/6
              </span>
              <span className="text-white/30 text-xs">
                — แผนเตรียมตัวสอบวิศวะ
              </span>
            </div>
          </div>

          {/* Right: Stat mini-cards */}
          <div className="flex flex-wrap gap-3">
            {/* Streak */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-4 min-w-[130px]">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-white/50 font-medium">
                  Streak
                </span>
              </div>
              <p className="text-2xl font-bold">
                {streak}{' '}
                <span className="text-sm font-normal text-white/50">วัน</span>
              </p>
            </div>

            {/* Progress */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-4 min-w-[130px]">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-white/50 font-medium">
                  Progress
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold">{progressPercent}%</p>
                {/* Tiny circular indicator */}
                <svg width="32" height="32" className="-rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(progressPercent / 100) * 75.4} 75.4`}
                  />
                </svg>
              </div>
            </div>

            {/* Study Hours */}
            <div className="bg-white/[0.07] backdrop-blur border border-white/[0.08] rounded-2xl p-4 min-w-[130px]">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50 font-medium">
                  Study Hours
                </span>
              </div>
              <p className="text-2xl font-bold">
                {totalHoursDisplay}{' '}
                <span className="text-sm font-normal text-white/50">ชม.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdueSessionsCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                มี {overdueSessionsCount} รายการในตารางที่เลยกำหนดหรือค้างทบทวน
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                ย้ายไปเรียนวันนี้ หรือจัดสัดส่วนใหม่ในระบบวางแผนการเรียน
              </p>
            </div>
          </div>
          <Link
            to="/planner"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors"
          >
            เปิดตาราง &rarr;
          </Link>
        </div>
      )}

      {/* ═══════════ ROW 2: Today's Study + Subject Progress ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Today's Study */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarIcon className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  วันนี้ต้องเรียนอะไร?
                </h2>
                {todayPlannedSessions.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {todayPlannedSessions.length} เซสชัน &middot; แผน {todayPlannedHours} ชม. &middot; เสร็จแล้ว {todayCompletedHours} ชม.
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/planner"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              ตารางเรียนเต็ม <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayPlannedSessions.length > 0 ? (
            <div className="space-y-3">
              {todayPlannedSessions.map((session) => {
                const SubjectIcon = subjectIconMap[session.subjectId] || BookOpen;
                const isCompleted = session.status === 'completed';
                return (
                  <div
                    key={session.id}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-200 group ${
                      isCompleted
                        ? 'bg-slate-50/60 border-slate-100 opacity-75'
                        : 'bg-white border-slate-200/70 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Subject icon square */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${subjectRawColor[session.subjectId]}18`,
                      }}
                    >
                      <SubjectIcon
                        className="w-5 h-5"
                        style={{
                          color: subjectRawColor[session.subjectId],
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {session.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {session.startTime} - {session.endTime} ({session.plannedMinutes} นาที)
                        </span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${priorityStyle(session.priority)}`}>
                          {session.priority === 'High' ? 'สำคัญสูง' : session.priority === 'Medium' ? 'ปานกลาง' : 'ทั่วไป'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {SUBJECTS[session.subjectId].name.split('/')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    {isCompleted ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> เสร็จแล้ว
                      </span>
                    ) : session.lessonId ? (
                      <Link
                        to={`/lessons/${session.lessonId}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 shadow-xs flex-shrink-0"
                      >
                        เริ่มเรียน
                      </Link>
                    ) : (
                      <Link
                        to="/planner"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 flex-shrink-0"
                      >
                        ดูแผน
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : todayLessons.length > 0 ? (
            <div className="space-y-3">
              {todayLessons.map((lesson) => {
                const SubjectIcon = subjectIconMap[lesson.subjectId] || BookOpen;
                return (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200/70 hover:bg-slate-50/80 transition-all duration-200 group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${subjectRawColor[lesson.subjectId]}18`,
                      }}
                    >
                      <SubjectIcon
                        className="w-5 h-5"
                        style={{
                          color: subjectRawColor[lesson.subjectId],
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.durationHours} ชม.
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyStyle(
                            lesson.difficulty
                          )}`}
                        >
                          {lesson.difficulty}
                        </span>
                        <span className="text-xs text-slate-400">
                          {SUBJECTS[lesson.subjectId].name}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 opacity-80 group-hover:opacity-100 flex-shrink-0"
                    >
                      เริ่มเรียน
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">
                ไม่มีบทเรียนที่ต้องเรียนวันนี้
              </p>
              <Link
                to="/planner"
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                + วางแผนการเรียนวันนี้
              </Link>
            </div>
          )}
        </div>

        {/* Subject Progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              ความก้าวหน้าแยกวิชา
            </h2>
          </div>

          <div className="space-y-4">
            {subjectProgress.map((subject) => (
              <div key={subject.id}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: subjectRawColor[subject.id],
                    }}
                  />
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                    {subject.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {subject.completed}/{subject.total}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                    {subject.percent}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${subjectBgClass[subject.id]}`}
                    style={{ width: `${subject.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 3: Roadmap + Calendar ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 6-Month Roadmap */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <MapIcon className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                แผนเตรียมตัว 6 เดือน
              </h2>
            </div>
            <Link
              to="/roadmap"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              ดูแผน <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {monthProgress.map((m) => {
              const pct =
                m.total > 0
                  ? Math.round((m.completed / m.total) * 100)
                  : 0;
              return (
                <div
                  key={m.month}
                  className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                      {m.month}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        เดือนที่ {m.month}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                        {m.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">
                      {m.completed}/{m.total}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarIcon className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 capitalize">
              {format(calendarDate, 'LLLL yyyy', { locale: th })}
            </h2>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium text-slate-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, calendarDate);
              const completed = hasCompletedOnDay(day);
              const hasLesson = hasLessonOnDay(day);

              let cellClasses =
                'w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full relative transition-all duration-200';

              if (!isCurrentMonth) {
                cellClasses += ' text-slate-300';
              } else if (isToday) {
                cellClasses +=
                  ' bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20';
              } else if (completed) {
                cellClasses +=
                  ' bg-emerald-100 text-emerald-700 font-semibold';
              } else {
                cellClasses += ' text-slate-600 hover:bg-slate-50';
              }

              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className={cellClasses}>{format(day, 'd')}</div>
                  {/* Dot indicator for lesson days */}
                  {hasLesson && !completed && isCurrentMonth && !isToday && (
                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer link */}
          <Link
            to="/calendar"
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 rounded-xl hover:bg-blue-50/50 transition-all duration-200"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            ดูปฏิทินเต็ม
          </Link>
        </div>
      </div>

      {/* ═══════════ ROW 4: Unclear Topics + Recent Resources ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unclear Topics */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                สิ่งที่ยังไม่เข้าใจ
              </h2>
            </div>
            <Link
              to="/not-understood"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {urgentUnclear.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-slate-500 font-medium text-sm">
                ไม่มีหัวข้อที่ยังไม่เข้าใจ
              </p>
              <p className="text-slate-400 text-xs mt-1">
                เก่งมาก! ทำความเข้าใจได้ครบทุกเรื่อง
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {urgentUnclear.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {item.topic}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {SUBJECTS[item.subjectId].name}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${priorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Resources */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              ทรัพยากรล่าสุด
            </h2>
          </div>

          {allResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium text-sm">
                ยังไม่มีทรัพยากรที่เพิ่มไว้
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allResources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/80 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                    {resourceIcon(resource.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {resource.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {resource.lessonTitle}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
