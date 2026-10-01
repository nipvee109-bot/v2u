import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { SIX_MONTH_ROADMAP } from '../data/roadmapData';
import { SUBJECTS } from '../types';
import { Link } from 'react-router-dom';
import { 
  Map, 
  Clock, 
  Sparkles,
  ArrowRight,
  Check,
  CalendarDays
} from 'lucide-react';

export function RoadmapPage() {
  const { lessons } = useStore();
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // Overall 6-Month calculations
  const totalLessons = lessons.length;
  const totalCompleted = lessons.filter((l) => l.status === 'COMPLETED').length;
  const overallProgressPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // Selected Month Info
  const currentMonthConfig = useMemo(() => {
    return SIX_MONTH_ROADMAP.find((m) => m.month === selectedMonth) || SIX_MONTH_ROADMAP[0];
  }, [selectedMonth]);

  // Lessons in Selected Month
  const monthLessons = useMemo(() => {
    return lessons.filter((l) => l.month === selectedMonth);
  }, [lessons, selectedMonth]);

  const monthCompletedCount = useMemo(() => {
    return monthLessons.filter((l) => l.status === 'COMPLETED').length;
  }, [monthLessons]);

  const monthProgressPercent = monthLessons.length > 0 
    ? Math.round((monthCompletedCount / monthLessons.length) * 100) 
    : 0;

  // Behind schedule evaluation (neutral, supportive tone)
  // E.g. for Month 1, if week 1 has unfinished lessons
  const scheduleAnalysis = useMemo(() => {
    const uncompletedInMonth = monthLessons.filter((l) => l.status !== 'COMPLETED');
    const isCurrentActiveMonth = selectedMonth === 1; // Assuming Month 1 is initial active

    if (uncompletedInMonth.length === 0 && monthLessons.length > 0) {
      return {
        status: 'completed',
        badge: 'เรียนจบครบตามแผนเดือนนี้แล้ว',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        message: 'คุณสำเร็จบทเรียนทั้งหมดในเดือนนี้เรียบร้อยแล้ว พร้อมก้าวสู่เดือนถัดไป',
      };
    }

    if (monthProgressPercent >= 50) {
      return {
        status: 'on_track',
        badge: 'เป็นไปตามเป้าหมาย (On Track)',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        message: `สำเร็จไปแล้ว ${monthCompletedCount} จาก ${monthLessons.length} บทในเดือนนี้`,
      };
    }

    if (isCurrentActiveMonth && uncompletedInMonth.length > 0) {
      return {
        status: 'behind',
        badge: 'อยู่ระหว่างดำเนินการตามแผน',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        message: `มีบทเรียนที่ยังไม่เสร็จ ${uncompletedInMonth.length} บทจากแผนการเรียนที่กำหนดไว้ในเดือนนี้`,
      };
    }

    return {
      status: 'upcoming',
      badge: 'แผนการเรียนช่วงถัดไป',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      message: `เตรียมพร้อมสำหรับบทเรียน ${monthLessons.length} บทในเดือนนี้`,
    };
  }, [monthLessons, monthProgressPercent, monthCompletedCount, selectedMonth]);

  // Milestones with calculated progress
  const milestonesWithProgress = useMemo(() => {
    return currentMonthConfig.milestones.map((ms) => {
      // Find matching lessons by subject or keywords
      const matchedLessons = monthLessons.filter((l) => {
        if (l.subjectId !== ms.subjectId) return false;
        if (!ms.lessonKeywords || ms.lessonKeywords.length === 0) return true;
        const text = `${l.title} ${l.description || ''}`.toLowerCase();
        return ms.lessonKeywords.some((kw) => text.includes(kw.toLowerCase()));
      });

      const total = matchedLessons.length > 0 ? matchedLessons.length : 1;
      const completed = matchedLessons.filter((l) => l.status === 'COMPLETED').length;
      const percent = matchedLessons.length > 0 ? Math.round((completed / total) * 100) : 0;

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (percent === 100) status = 'completed';
      else if (percent > 0) status = 'in_progress';

      return {
        ...ms,
        matchedLessons,
        completedCount: completed,
        totalCount: matchedLessons.length,
        progressPercent: percent,
        status,
      };
    });
  }, [currentMonthConfig, monthLessons]);

  // Lessons grouped by week (Week 1, Week 2, Week 3, Week 4)
  const weeksData = useMemo(() => {
    const weeks: Record<number, typeof monthLessons> = { 1: [], 2: [], 3: [], 4: [] };
    monthLessons.forEach((l) => {
      const w = l.week || 1;
      if (!weeks[w]) weeks[w] = [];
      weeks[w].push(l);
    });
    return weeks;
  }, [monthLessons]);

  // Filter lessons if subject filter or milestone filter is active
  const filteredWeeks = useMemo(() => {
    const result: Record<number, typeof monthLessons> = {};

    Object.entries(weeksData).forEach(([wStr, lList]) => {
      const w = Number(wStr);
      let list = lList;

      if (selectedSubjectFilter !== 'all') {
        list = list.filter((l) => l.subjectId === selectedSubjectFilter);
      }

      if (selectedMilestoneId) {
        const ms = milestonesWithProgress.find((m) => m.id === selectedMilestoneId);
        if (ms) {
          const msLessonIds = new Set(ms.matchedLessons.map((ml) => ml.id));
          list = list.filter((l) => msLessonIds.has(l.id));
        }
      }

      result[w] = list;
    });

    return result;
  }, [weeksData, selectedSubjectFilter, selectedMilestoneId, milestonesWithProgress]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* ═══════════ HEADER: 6-Month Roadmap Engine ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <Map className="w-4 h-4" /> 6-Month Learning Roadmap Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              แผนการเรียน 6 เดือนสู่วิศวกรรมคอมพิวเตอร์ & AI
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              เชื่อมโยงการอ่านหนังสือในแต่ละวันเข้ากับเป้าหมายระดับเดือนและไมล์สโตนสำคัญ เพื่อให้มั่นใจว่าครอบคลุมเนื้อหาครบถ้วนก่อนสอบ
            </p>
          </div>

          {/* Macro Progress Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[220px] shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">ความก้าวหน้า 6 เดือน</span>
              <span className="text-white font-bold">{overallProgressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${overallProgressPercent}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-400">
              เรียนจบแล้ว {totalCompleted} จาก {totalLessons} บทเรียนทั้งหมด
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ 6 MONTHS SELECTOR STRIP ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SIX_MONTH_ROADMAP.map((m) => {
          const isSelected = selectedMonth === m.month;
          const mLessons = lessons.filter((l) => l.month === m.month);
          const mDone = mLessons.filter((l) => l.status === 'COMPLETED').length;
          const mPct = mLessons.length > 0 ? Math.round((mDone / mLessons.length) * 100) : 0;

          return (
            <button
              key={m.month}
              onClick={() => {
                setSelectedMonth(m.month);
                setSelectedMilestoneId(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-32 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-800 border-slate-200/70 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  Month {m.month}
                </span>
                <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                  {mPct}%
                </span>
              </div>

              <div>
                <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {m.title.split(':')[1]?.trim() || m.title}
                </p>
                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {mDone}/{mLessons.length} บท &middot; {m.targetHours}h
                </p>
              </div>

              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                <div 
                  className={`h-full rounded-full transition-all ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                  style={{ width: `${mPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════ SELECTED MONTH DETAIL & SCHEDULE ANALYSIS ═══════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                เดือนที่ {currentMonthConfig.month}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${scheduleAnalysis.color}`}>
                {scheduleAnalysis.badge}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{currentMonthConfig.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{currentMonthConfig.description}</p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[10px] text-slate-400 font-medium">เป้าหมายเวลา</span>
              <p className="text-sm font-bold text-slate-900">{currentMonthConfig.targetHours} ชม.</p>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[10px] text-slate-400 font-medium">สำเร็จแล้ว</span>
              <p className="text-sm font-bold text-emerald-600">{monthCompletedCount} / {monthLessons.length} บท</p>
            </div>
          </div>
        </div>

        {/* Supportive Status Message */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between gap-2">
          <span className="font-medium">{scheduleAnalysis.message}</span>
          <Link to="/planner" className="text-blue-600 hover:text-blue-700 font-bold shrink-0 flex items-center gap-1">
            เปิดตารางสัปดาห์ <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ═══════════ SECTION: MILESTONES (เชื่อมโยงเป้าหมาย) ═══════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              เป้าหมายสำคัญประจำเดือน (Milestones)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คำนวณความคืบหน้าจากบทเรียนจริงที่เรียนจบแล้ว (คลิกที่ Milestone เพื่อกรองดูบทเรียนที่เกี่ยวข้อง)
            </p>
          </div>
          {selectedMilestoneId && (
            <button
              onClick={() => setSelectedMilestoneId(null)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              ล้างตัวกรอง Milestone
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestonesWithProgress.map((ms) => {
            const subject = SUBJECTS[ms.subjectId];
            const isSelected = selectedMilestoneId === ms.id;
            const isCompleted = ms.status === 'completed';

            return (
              <div
                key={ms.id}
                onClick={() => setSelectedMilestoneId(isSelected ? null : ms.id)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/20 ring-2 ring-purple-500/10 shadow-xs'
                    : 'bg-white border-slate-200/70 hover:border-purple-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${subject.color}`}>
                      {subject.name.split('/')[0]}
                    </span>
                    {isCompleted ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> สำเร็จ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        {ms.completedCount}/{ms.totalCount} บท
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{ms.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{ms.description}</p>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-medium text-slate-500">
                    <span>ความก้าวหน้า</span>
                    <span className="font-bold text-slate-700">{ms.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${ms.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════ SECTION: ROADMAP → WEEK (ต้องเรียนอะไรบ้างในสัปดาห์นี้) ═══════════ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              โครงสร้างเนื้อหาแต่ละสัปดาห์ (Weekly Curriculum Breakdown)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เจาะลึก 6 เดือน &rarr; เดือน &rarr; สัปดาห์ &rarr; วิชา &rarr; บทเรียนจริง
            </p>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSubjectFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border transition-all ${
                selectedSubjectFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ทุกวิชา
            </button>
            {Object.entries(SUBJECTS).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setSelectedSubjectFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border transition-all ${
                  selectedSubjectFilter === id
                    ? `${info.color} text-white border-transparent shadow-xs`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {info.name.split('/')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Weeks Accordion / List */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((weekNum) => {
            const lessonsInWeek = filteredWeeks[weekNum] || [];
            const completedInWeek = lessonsInWeek.filter((l) => l.status === 'COMPLETED').length;
            const weekHours = lessonsInWeek.reduce((acc, l) => acc + l.durationHours, 0);

            return (
              <div 
                key={weekNum} 
                className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs space-y-4"
              >
                {/* Week Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                      W{weekNum}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        สัปดาห์ที่ {weekNum} (Week {weekNum})
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {lessonsInWeek.length} บทเรียน &middot; รวมประมาณ {weekHours} ชั่วโมง
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-500">
                      สำเร็จ {completedInWeek}/{lessonsInWeek.length} บท
                    </span>
                    <Link
                      to="/planner"
                      className="px-3 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      จัดลงตาราง
                    </Link>
                  </div>
                </div>

                {/* Lessons List in this week */}
                {lessonsInWeek.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    ไม่มีบทเรียนที่ตรงกับตัวกรองในสัปดาห์นี้
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lessonsInWeek.map((lesson) => {
                      const subject = SUBJECTS[lesson.subjectId];
                      const isCompleted = lesson.status === 'COMPLETED';

                      return (
                        <div
                          key={lesson.id}
                          className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                            isCompleted
                              ? 'bg-slate-50/70 border-slate-200/80 opacity-80'
                              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded text-white ${subject.color}`}>
                                {subject.name}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                                isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isCompleted ? '✓ เสร็จแล้ว' : 'ยังไม่เสร็จ'}
                              </span>
                            </div>
                            <h5 className={`text-xs font-bold leading-tight ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {lesson.title}
                            </h5>
                            {lesson.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{lesson.description}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" /> {lesson.durationHours} ชม. &middot; ระดับ {lesson.difficulty}
                            </span>
                            <Link
                              to={`/lessons/${lesson.id}`}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                            >
                              เข้าสู่บทเรียน &rarr;
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
