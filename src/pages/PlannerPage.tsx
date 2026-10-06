import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Target,
  Edit2,
  Trash2,
  Scissors,
  RotateCcw,
  BarChart3,
  BookOpen,
  X,
  Play,
  Check,
  FastForward,
  Brain,
  CalendarCheck
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  isSameMonth
} from 'date-fns';
import { th } from 'date-fns/locale';
import { SUBJECTS } from '../types';
import type { SubjectId, StudySession, StudySessionType, StudySessionStatus, ReviewItem } from '../types';
import { ReviewSessionModal } from '../components/ReviewSessionModal';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

type TabView = 'today' | 'week' | 'month';

export function PlannerPage() {
  const { 
    sessions = [], 
    lessons, 
    weeklyGoal, 
    reviewQueue = [],
    getDueReviewItems,
    addSession, 
    updateSession, 
    deleteSession, 
    rescheduleSession, 
    completeSession, 
    skipSession,
    splitSession,
    setWeeklyGoal 
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabView>('today');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDayOnMobile, setSelectedDayOnMobile] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Review Engine state
  const [activeReviewItem, setActiveReviewItem] = useState<ReviewItem | null>(null);
  const { overdue: reviewOverdue, dueToday: reviewDueToday, upcoming: reviewUpcoming } = getDueReviewItems();
  const totalReviewDueCount = reviewOverdue.length + reviewDueToday.length;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [reschedulingSession, setReschedulingSession] = useState<StudySession | null>(null);
  const [completingSession, setCompletingSession] = useState<StudySession | null>(null);
  const [actualMinutesInput, setActualMinutesInput] = useState<number>(60);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Form state for Add/Edit
  const [formSubjectId, setFormSubjectId] = useState<SubjectId>('math');
  const [formLessonId, setFormLessonId] = useState<string>('custom');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formType, setFormType] = useState<StudySessionType>('learn');
  const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('10:30');
  const [formPlannedMinutes, setFormPlannedMinutes] = useState<number>(90);
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Keyboard accessibility: Escape key closes active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (completingSession) setCompletingSession(null);
        if (reschedulingSession) setReschedulingSession(null);
        if (isGoalModalOpen) setIsGoalModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, completingSession, reschedulingSession, isGoalModalOpen]);

  // Compute dynamic status: if date < today and status === 'planned', it's overdue
  const processedSessions = useMemo(() => {
    return sessions.map((s) => {
      if (s.status === 'planned' && s.date < todayStr) {
        return { ...s, status: 'overdue' as StudySessionStatus };
      }
      return s;
    });
  }, [sessions, todayStr]);

  // Today sessions
  const todaySessions = useMemo(() => {
    return processedSessions
      .filter((s) => s.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [processedSessions, todayStr]);

  // Overdue / Unfinished sessions queue
  const unfinishedQueue = useMemo(() => {
    return processedSessions.filter((s) => s.status === 'overdue' || (s.date === todayStr && s.status === 'in_progress'));
  }, [processedSessions, todayStr]);

  // Week calculation
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekSessions = useMemo(() => {
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(weekEnd, 'yyyy-MM-dd');
    return processedSessions.filter((s) => s.date >= startStr && s.date <= endStr);
  }, [processedSessions, weekStart, weekEnd]);

  // Pre-index processed sessions by date for O(1) day cell lookups
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (let i = 0; i < processedSessions.length; i++) {
      const s = processedSessions[i];
      let list = map.get(s.date);
      if (!list) {
        list = [];
        map.set(s.date, list);
      }
      list.push(s);
    }
    return map;
  }, [processedSessions]);

  // Pre-index active review queue by nextReviewAt date (YYYY-MM-DD) for O(1) lookup
  const reviewsByDate = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (let i = 0; i < (reviewQueue || []).length; i++) {
      const r = reviewQueue[i];
      if (r.status !== 'completed') {
        const d = r.nextReviewAt.split('T')[0];
        let list = map.get(d);
        if (!list) {
          list = [];
          map.set(d, list);
        }
        list.push(r);
      }
    }
    return map;
  }, [reviewQueue]);

  // Weekly Summary Stats
  const weeklyPlannedMinutes = weekSessions.reduce((acc, s) => acc + s.plannedMinutes, 0);
  const weeklyCompletedMinutes = weekSessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes), 0);
  const weeklyRemainingMinutes = Math.max(0, weeklyPlannedMinutes - weeklyCompletedMinutes);
  const weeklyPlannedHours = Math.round((weeklyPlannedMinutes / 60) * 10) / 10;
  const weeklyCompletedHours = Math.round((weeklyCompletedMinutes / 60) * 10) / 10;
  const weeklyRemainingHours = Math.round((weeklyRemainingMinutes / 60) * 10) / 10;
  const weeklyCompletionRate = weeklyPlannedMinutes > 0 ? Math.round((weeklyCompletedMinutes / weeklyPlannedMinutes) * 100) : 0;

  // Completed lessons and reviews in this week
  const completedLessonsInWeek = weekSessions.filter((s) => s.status === 'completed' && s.type === 'learn').length;
  const completedReviewsInWeek = weekSessions.filter((s) => s.status === 'completed' && (s.type === 'review' || s.type === 'quiz')).length;

  // Weekly Subject distribution
  const subjectDistribution = useMemo(() => {
    const dist: Record<SubjectId, { plannedMin: number; completedMin: number }> = {
      math: { plannedMin: 0, completedMin: 0 },
      programming: { plannedMin: 0, completedMin: 0 },
      physics: { plannedMin: 0, completedMin: 0 },
      tgat3: { plannedMin: 0, completedMin: 0 },
      ai: { plannedMin: 0, completedMin: 0 },
      web: { plannedMin: 0, completedMin: 0 },
    };

    weekSessions.forEach((s) => {
      if (dist[s.subjectId]) {
        dist[s.subjectId].plannedMin += s.plannedMinutes;
        if (s.status === 'completed') {
          dist[s.subjectId].completedMin += s.actualMinutes || s.plannedMinutes;
        }
      }
    });

    return dist;
  }, [weekSessions]);

  // Daily Workload threshold helper
  const getDayWorkload = (minutes: number) => {
    const hours = minutes / 60;
    if (hours === 0) return { label: 'วันพัก', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    if (hours <= 2) return { label: 'เบา (Light)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (hours <= 4) return { label: 'ปกติ (Normal)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'หนัก (Heavy)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Open Add Modal
  const handleOpenAddModal = (presetDate?: string) => {
    setEditingSession(null);
    setFormSubjectId('math');
    setFormLessonId('custom');
    setFormTitle('');
    setFormType('learn');
    setFormDate(presetDate || todayStr);
    setFormStartTime('09:00');
    setFormEndTime('10:30');
    setFormPlannedMinutes(90);
    setFormPriority('Medium');
    setFormNotes('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (session: StudySession) => {
    setEditingSession(session);
    setFormSubjectId(session.subjectId);
    setFormLessonId(session.lessonId || 'custom');
    setFormTitle(session.title);
    setFormType(session.type);
    setFormDate(session.date);
    setFormStartTime(session.startTime);
    setFormEndTime(session.endTime);
    setFormPlannedMinutes(session.plannedMinutes);
    setFormPriority(session.priority);
    setFormNotes(session.notes || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Time change calculator
  const handleTimeChange = (start: string, end: string) => {
    setFormStartTime(start);
    setFormEndTime(end);
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const totalStart = (sh || 0) * 60 + (sm || 0);
    const totalEnd = (eh || 0) * 60 + (em || 0);
    if (totalEnd > totalStart) {
      setFormPlannedMinutes(totalEnd - totalStart);
    }
  };

  // Save Session (Add / Edit)
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('กรุณาระบุชื่อบทเรียนหรือหัวข้อ');
      return;
    }

    const [sh, sm] = formStartTime.split(':').map(Number);
    const [eh, em] = formEndTime.split(':').map(Number);
    const totalStart = (sh || 0) * 60 + (sm || 0);
    const totalEnd = (eh || 0) * 60 + (em || 0);

    if (totalEnd <= totalStart) {
      setFormError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    if (formPlannedMinutes <= 0) {
      setFormError('ระยะเวลาการเรียนต้องมากกว่า 0 นาที');
      return;
    }

    // Check collision warning
    const hasCollision = sessions.some((s) => {
      if (editingSession && s.id === editingSession.id) return false;
      if (s.date !== formDate) return false;
      const [sSh, sSm] = s.startTime.split(':').map(Number);
      const [sEh, sEm] = s.endTime.split(':').map(Number);
      const sStart = (sSh || 0) * 60 + (sSm || 0);
      const sEnd = (sEh || 0) * 60 + (sEm || 0);
      return totalStart < sEnd && totalEnd > sStart;
    });

    if (hasCollision && !confirm('มีเวลาเรียนซ้อนทับกับรายการอื่นในวันนี้ ต้องการบันทึกต่อไปหรือไม่?')) {
      return;
    }

    if (editingSession) {
      updateSession(editingSession.id, {
        subjectId: formSubjectId,
        lessonId: formLessonId === 'custom' ? undefined : formLessonId,
        title: formTitle.trim(),
        type: formType,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        plannedMinutes: formPlannedMinutes,
        priority: formPriority,
        notes: formNotes.trim(),
      });
    } else {
      const newSession: StudySession = {
        id: uuidv4(),
        subjectId: formSubjectId,
        lessonId: formLessonId === 'custom' ? undefined : formLessonId,
        title: formTitle.trim(),
        type: formType,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        plannedMinutes: formPlannedMinutes,
        priority: formPriority,
        notes: formNotes.trim(),
        status: 'planned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addSession(newSession);
    }

    setIsAddModalOpen(false);
  };

  // Delete session handler
  const handleDeleteSession = (id: string, title: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบแผนการเรียน "${title}"?`)) {
      deleteSession(id);
    }
  };

  // Complete session handler
  const handleOpenCompleteModal = (session: StudySession) => {
    setCompletingSession(session);
    setActualMinutesInput(session.actualMinutes || session.plannedMinutes);
  };

  const handleConfirmComplete = () => {
    if (completingSession) {
      completeSession(completingSession.id, actualMinutesInput);
      setCompletingSession(null);
    }
  };

  // Reschedule handler
  const handleConfirmReschedule = (newDate: string) => {
    if (reschedulingSession) {
      rescheduleSession(reschedulingSession.id, newDate);
      setReschedulingSession(null);
    }
  };

  // Type badge helper
  const renderTypeBadge = (type: StudySessionType) => {
    const config = {
      learn: { label: 'เรียนเนื้อหา', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      review: { label: 'ทบทวน', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      quiz: { label: 'ทำแบบทดสอบ', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      practice: { label: 'ฝึกโจทย์', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      exam: { label: 'จำลองสอบ', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    }[type] || { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };

    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  // Priority badge helper
  const renderPriorityBadge = (priority: 'Low' | 'Medium' | 'High') => {
    const config = {
      High: 'bg-rose-50 text-rose-700 border-rose-200',
      Medium: 'bg-amber-50 text-amber-700 border-amber-200',
      Low: 'bg-slate-100 text-slate-600 border-slate-200',
    }[priority];
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config}`}>
        {priority === 'High' ? 'สูง' : priority === 'Medium' ? 'กลาง' : 'ต่ำ'}
      </span>
    );
  };

  // Status badge helper
  const renderStatusBadge = (status: StudySessionStatus) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> เสร็จแล้ว</span>;
      case 'overdue':
        return <span className="text-xs font-semibold text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> ค้างทบทวน</span>;
      case 'in_progress':
        return <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5 animate-spin" /> กำลังเรียน</span>;
      case 'skipped':
        return <span className="text-xs font-semibold text-slate-400">ข้ามแล้ว</span>;
      default:
        return <span className="text-xs font-semibold text-slate-600">รอดำเนินการ</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* ═══════════ Premium Hero Banner ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/20">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Study Planner & Workload Organizer</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ตารางและแผนการเรียน
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              วางแผน จัดสรรเวลา และติดตามความสมดุลของการอ่านหนังสือตามแผน Roadmap 6 เดือน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Link
              to="/weekly-review"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur-md transition-all shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-indigo-300" /> สรุปรายสัปดาห์
            </Link>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur-md transition-all shadow-xs"
            >
              <Target className="w-4 h-4 text-purple-300" /> เป้าหมายสัปดาห์
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> เพิ่มแผนการเรียน
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Tabs Navigation */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="bg-slate-200/70 p-1.5 rounded-2xl inline-flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'today'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-4 h-4" /> วันนี้ ({todaySessions.length})
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> สัปดาห์นี้ (Smart Planner)
          </button>
          <button
            onClick={() => setActiveTab('month')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'month'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> ปฏิทินเดือน
          </button>
        </div>
      </div>

      {/* Unfinished / Overdue Queue Alert */}
      {unfinishedQueue.length > 0 && activeTab !== 'month' && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                มี {unfinishedQueue.length} รายการที่ค้างทบทวน / เลยกำหนด
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                คุณสามารถเลือกเลื่อนไปเรียนวันนี้ ย้ายวัน หรือแบ่งเซสชันให้เล็กลงได้
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unfinishedQueue.slice(0, 3).map((s) => (
              <div key={s.id} className="bg-white/90 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xs">
                <span className="text-xs font-semibold text-slate-800 max-w-[150px] truncate">{s.title}</span>
                <button
                  onClick={() => rescheduleSession(s.id, todayStr)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  เรียนวันนี้
                </button>
                <button
                  onClick={() => setReschedulingSession(s)}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-800"
                >
                  ย้ายวัน
                </button>
                <button
                  onClick={() => skipSession(s.id)}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
                >
                  ข้าม
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================
          TAB 1: TODAY VIEW
          ================================================== */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Today KPI Summary Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-xs font-medium text-slate-400">บทเรียนวันนี้</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{todaySessions.length} บท</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-xs font-medium text-slate-400">เวลาที่วางแผน</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {Math.round((todaySessions.reduce((acc, s) => acc + s.plannedMinutes, 0) / 60) * 10) / 10} ชม.
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-xs font-medium text-slate-400">เรียนเสร็จแล้ว</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {Math.round((todaySessions.filter((s) => s.status === 'completed').reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes), 0) / 60) * 10) / 10} ชม.
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-xs font-medium text-slate-400">คงเหลือ</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {todaySessions.filter((s) => s.status !== 'completed' && s.status !== 'skipped').length} รายการ
              </p>
            </div>
          </div>

          {/* Today Review Section */}
          <div className="bg-white rounded-2xl border border-purple-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    คิวทบทวนเนื้อหาวันนี้ (Review Queue)
                    {totalReviewDueCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                        {totalReviewDueCount} หัวข้อ
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {totalReviewDueCount > 0
                      ? `มี ${totalReviewDueCount} รายการถึงกำหนด (เลยกำหนด ${reviewOverdue.length}, ครบกำหนดวันนี้ ${reviewDueToday.length})`
                      : 'ไม่มีรายการค้างทบทวนสำหรับวันนี้'}
                  </p>
                </div>
              </div>
              {totalReviewDueCount > 0 && (
                <button
                  onClick={() => setActiveReviewItem(reviewOverdue[0] || reviewDueToday[0])}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>เริ่มทบทวนตอนนี้</span>
                </button>
              )}
            </div>

            {totalReviewDueCount > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...reviewOverdue, ...reviewDueToday].map((rev) => {
                  const parentL = lessons.find((l) => l.id === rev.lessonId);
                  const isOv = rev.status === 'overdue' || rev.nextReviewAt.split('T')[0] < todayStr;
                  const itemSubject = parentL ? SUBJECTS[parentL.subjectId] : null;

                  return (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/40 hover:bg-purple-50 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">{rev.topic}</p>
                          {isOv && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold shrink-0">
                              เลยกำหนด
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                          {itemSubject && (
                            <span className="font-semibold text-slate-600">
                              {itemSubject.name.split('/')[0]}
                            </span>
                          )}
                          <span>&middot;</span>
                          <span>รอบที่ {rev.reviewCount + 1}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveReviewItem(rev)}
                        className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white border border-purple-200 text-purple-700 text-xs font-bold rounded-lg shrink-0 transition-colors shadow-xs"
                      >
                        ทบทวน
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-3 px-4 bg-purple-50/40 rounded-xl border border-dashed border-purple-200/70 text-xs text-purple-700 flex items-center justify-between">
                <span>ยินดีด้วย! คุณทบทวนเนื้อหาครบตามกำหนดแล้ว</span>
                {reviewUpcoming.length > 0 && (
                  <span className="text-[11px] text-purple-600 font-medium">
                    คิวถัดไป: {format(new Date(reviewUpcoming[0].nextReviewAt), 'd MMM', { locale: th })} ({reviewUpcoming[0].topic})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Today Timeline List */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  แผนการเรียนวันนี้ ({format(new Date(), 'EEEEที่ d MMMM yyyy', { locale: th })})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">จัดลำดับตามเวลาเริ่มเรียน</p>
              </div>
              <button
                onClick={() => handleOpenAddModal(todayStr)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มเซสชันสำหรับวันนี้
              </button>
            </div>

            {todaySessions.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">ยังไม่มีแผนการเรียนในวันนี้</p>
                <p className="text-xs text-slate-400 mt-1">สร้างแผนเพื่อควบคุมเวลาและโฟกัสกับสิ่งที่สำคัญ</p>
                <button
                  onClick={() => handleOpenAddModal(todayStr)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-all"
                >
                  + เพิ่มแผนวันนี้
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {todaySessions.map((session) => {
                  const subject = SUBJECTS[session.subjectId];
                  const isCompleted = session.status === 'completed';
                  return (
                    <div
                      key={session.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCompleted
                          ? 'bg-slate-50/60 border-slate-200/70 opacity-80'
                          : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Left: Time & Subject badge */}
                      <div className="flex items-start gap-4">
                        <div className="text-center shrink-0 w-24 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/60">
                          <p className="text-xs font-bold text-slate-900">{session.startTime} - {session.endTime}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{session.plannedMinutes} นาที</p>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${subject.color}`}>
                              {subject.name}
                            </span>
                            {renderTypeBadge(session.type)}
                            {renderPriorityBadge(session.priority)}
                            {renderStatusBadge(session.status)}
                          </div>
                          <h3 className={`text-base font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                            {session.title}
                          </h3>
                          {session.notes && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                              โน้ต: {session.notes}
                            </p>
                          )}
                          {isCompleted && session.actualMinutes && (
                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                              เรียนจริงไป {session.actualMinutes} นาที
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {!isCompleted ? (
                          <>
                            {session.lessonId ? (
                              <Link
                                to={`/lessons/${session.lessonId}`}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                              >
                                <Play className="w-3.5 h-3.5" /> เริ่มเรียน
                              </Link>
                            ) : null}
                            <button
                              onClick={() => handleOpenCompleteModal(session)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" /> ทำเสร็จ
                            </button>
                            <button
                              onClick={() => setReschedulingSession(session)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                              title="เลื่อนเวลา"
                            >
                              <FastForward className="w-3.5 h-3.5" />
                            </button>
                            {session.plannedMinutes >= 60 && (
                              <button
                                onClick={() => splitSession(session.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                                title="แบ่ง session (Split 2 ส่วน)"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => updateSession(session.id, { status: 'planned', actualMinutes: undefined })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> ทำใหม่
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(session)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          TAB 2: SMART WEEKLY PLANNER (Phase 6)
          ================================================== */}
      {activeTab === 'week' && (
        <div className="space-y-6">
          {/* Week Navigation Header */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentWeekDate(subWeeks(currentWeekDate, 1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  สัปดาห์: {format(weekStart, 'd MMM', { locale: th })} – {format(weekEnd, 'd MMM yyyy', { locale: th })}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">วางแผน Workload ให้สมดุล ไม่หนักหรือเบาเกินไป</p>
              </div>
              <button
                onClick={() => setCurrentWeekDate(addWeeks(currentWeekDate, 1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <button
              onClick={() => setCurrentWeekDate(new Date())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors self-start sm:self-auto"
            >
              สัปดาห์ปัจจุบัน
            </button>
          </div>

          {/* Weekly Summary & Goal Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Summary KPI */}
            <div className="bg-gradient-to-br from-[#0B1120] to-[#1E293B] text-white p-6 rounded-2xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Weekly Summary</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{weeklyCompletionRate}% เสร็จสิ้น</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400">วางแผน</span>
                  <p className="text-lg font-bold text-white mt-0.5">{weeklyPlannedHours}h</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400">เรียนจบแล้ว</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{weeklyCompletedHours}h</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400">คงเหลือ</span>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{weeklyRemainingHours}h</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>ความก้าวหน้าทั้งสัปดาห์</span>
                  <span>{weeklyCompletedHours} / {weeklyPlannedHours} ชม.</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${weeklyCompletionRate}%` }} />
                </div>
              </div>
            </div>

            {/* Weekly Goals Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" /> เป้าหมายสัปดาห์นี้
                </h3>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  ปรับเป้าหมาย
                </button>
              </div>

              {/* Hours Goal */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">เวลาเรียนรวม</span>
                  <span className="font-bold text-slate-900">{weeklyCompletedHours} / {weeklyGoal?.targetHours || 18} ชม.</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((weeklyCompletedHours / (weeklyGoal?.targetHours || 18)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Lessons Goal */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">บทเรียนใหม่ที่จบ</span>
                  <span className="font-bold text-slate-900">{completedLessonsInWeek} / {weeklyGoal?.targetLessons || 6} บท</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((completedLessonsInWeek / (weeklyGoal?.targetLessons || 6)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Reviews Goal */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">การทบทวน / ทำโจทย์</span>
                  <span className="font-bold text-slate-900">{completedReviewsInWeek} / {weeklyGoal?.targetReviews || 4} ครั้ง</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((completedReviewsInWeek / (weeklyGoal?.targetReviews || 4)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Subject Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" /> สัดส่วนวิชาในสัปดาห์นี้
              </h3>
              <div className="space-y-2">
                {Object.entries(SUBJECTS).map(([id, info]) => {
                  const dist = subjectDistribution[id as SubjectId];
                  const plannedH = Math.round((dist.plannedMin / 60) * 10) / 10;
                  const completedH = Math.round((dist.completedMin / 60) * 10) / 10;
                  const percent = weeklyPlannedMinutes > 0 ? Math.round((dist.plannedMin / weeklyPlannedMinutes) * 100) : 0;
                  return (
                    <div key={id} className="text-xs">
                      <div className="flex justify-between font-medium mb-1">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <span className={`w-2 h-2 rounded-full ${info.color}`} /> {info.name}
                        </span>
                        <span className="text-slate-500">{completedH}h / {plannedH}h ({percent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${info.color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unfinished Session Queue (Phase 6) */}
          {unfinishedQueue.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      เซสชันที่ค้าง / ยังไม่เสร็จสิ้น (Unfinished Sessions Queue)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เลือกย้ายไปพรุ่งนี้, ย้ายวันอื่น, แบ่งเซสชันย่อย หรือข้าม
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {unfinishedQueue.length} รายการ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {unfinishedQueue.map((s) => {
                  const subject = SUBJECTS[s.subjectId];
                  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                  return (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded text-white ${subject.color}`}>
                            {subject.name.split('/')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400">{s.plannedMinutes} นาที ({s.date})</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{s.title}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => rescheduleSession(s.id, tomorrowStr)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold text-center transition-colors"
                        >
                          → เลื่อนไปพรุ่งนี้
                        </button>
                        <button
                          onClick={() => setReschedulingSession(s)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold text-center transition-colors"
                        >
                          📅 เลื่อนวันอื่น
                        </button>
                        {s.plannedMinutes >= 60 ? (
                          <button
                            onClick={() => splitSession(s.id)}
                            className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 rounded-lg text-[10px] font-semibold text-center transition-colors"
                          >
                            ✂️ แบ่งเซสชัน
                          </button>
                        ) : (
                          <button
                            onClick={() => rescheduleSession(s.id, todayStr)}
                            className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 rounded-lg text-[10px] font-semibold text-center transition-colors"
                          >
                            ⚡ เรียนวันนี้
                          </button>
                        )}
                        <button
                          onClick={() => skipSession(s.id)}
                          className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 rounded-lg text-[10px] font-semibold text-center transition-colors"
                        >
                          ✕ ข้าม
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Day Selector (Horizontal Scroller) */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {weekDays.map((day) => {
              const dStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDayOnMobile === dStr;
              const isCurr = isToday(day);
              const daySess = sessionsByDate.get(dStr) || [];
              return (
                <button
                  key={dStr}
                  onClick={() => setSelectedDayOnMobile(dStr)}
                  className={`px-3 py-2 rounded-xl text-center shrink-0 border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isCurr
                      ? 'bg-white text-blue-700 border-blue-400 font-bold'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-medium opacity-80">{format(day, 'EEE', { locale: th })}</p>
                  <p className="text-sm font-bold mt-0.5">{format(day, 'd')}</p>
                  <span className={`text-[9px] mt-1 block px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                    {daySess.length} เซสชัน
                  </span>
                </button>
              );
            })}
          </div>

          {/* 7 Days Workload Grid (Desktop full grid, Mobile filtered) */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3.5">
            {weekDays.map((day) => {
              const dStr = format(day, 'yyyy-MM-dd');
              const daySessions = (sessionsByDate.get(dStr) || []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
              const dayMinutes = daySessions.reduce((acc, s) => acc + s.plannedMinutes, 0);
              const workload = getDayWorkload(dayMinutes);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dStr}
                  className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                    isCurrentDay
                      ? 'border-blue-400 ring-2 ring-blue-500/10'
                      : 'border-slate-200/70 hover:border-slate-300'
                  } ${
                    // On mobile, hide other days if not selected
                    selectedDayOnMobile !== dStr ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  {/* Day Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className={`text-xs font-bold uppercase ${isCurrentDay ? 'text-blue-600' : 'text-slate-600'}`}>
                          {format(day, 'EEEE', { locale: th })}
                        </span>
                        <p className="text-lg font-extrabold text-slate-900 leading-tight">
                          {format(day, 'd MMM', { locale: th })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workload.color}`}>
                        {workload.label}
                      </span>
                    </div>

                    {(() => {
                      const dayReviews = reviewsByDate.get(dStr) || [];
                      return (
                        <>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 py-2">
                            <span>
                              {daySessions.length} เซสชัน
                              {dayReviews.length > 0 && ` · ${dayReviews.length} ทบทวน`}
                            </span>
                            <span className="font-semibold text-slate-700">{Math.round((dayMinutes / 60) * 10) / 10} ชม.</span>
                          </div>

                          {/* Sessions & Reviews list */}
                          <div className="space-y-2 mt-1 min-h-[140px]">
                            {/* Day Reviews if any */}
                            {dayReviews.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {dayReviews.map((rev) => (
                                  <div
                                    key={rev.id}
                                    onClick={() => setActiveReviewItem(rev)}
                                    className="p-2 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-900 cursor-pointer transition-all flex items-center justify-between gap-1 text-[11px] shadow-2xs"
                                    title="คลิกเพื่อเริ่มทบทวนแบบ Active Recall"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Brain className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span className="font-bold truncate">{rev.topic}</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded font-bold shrink-0">
                                      ทบทวน
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {daySessions.length === 0 && dayReviews.length === 0 ? (
                              <p className="text-[11px] text-slate-300 text-center py-8 italic">วันพัก ไม่มีแผน</p>
                            ) : (
                              daySessions.map((session) => {
                          const subject = SUBJECTS[session.subjectId];
                          const isDone = session.status === 'completed';
                          return (
                            <div
                              key={session.id}
                              className={`p-2.5 rounded-xl border text-xs transition-all ${
                                isDone
                                  ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded text-white ${subject.color}`}>
                                  {subject.name.split('/')[0]}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">{session.startTime}</span>
                              </div>
                              <p className={`font-bold line-clamp-1 ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {session.title}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 text-[10px]">
                                <span className="text-slate-400">{session.plannedMinutes}m</span>
                                <div className="flex items-center gap-1">
                                  {!isDone && (
                                    <button
                                      onClick={() => handleOpenCompleteModal(session)}
                                      className="text-emerald-600 hover:text-emerald-700 font-bold"
                                      title="ทำเสร็จ"
                                    >
                                      ✓
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditModal(session)}
                                    className="text-slate-400 hover:text-slate-600"
                                    title="แก้ไข"
                                  >
                                    ✎
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

                  {/* Add button for this day */}
                  <button
                    onClick={() => handleOpenAddModal(dStr)}
                    className="w-full mt-3 py-1.5 rounded-xl border border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่ม
                  </button>
                </div>
              );
            })}
          </div>

          {/* Workload Threshold Legend */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-bold text-slate-800">
              เกณฑ์ประเมินระดับภาระงานรายวัน (Daily Workload Thresholds):
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Rest day (0 ชม.)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Light day (&le; 2 ชม.)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Normal day (2 - 4 ชม.)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Heavy day (&gt; 4 ชม.)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          TAB 3: MONTHLY CALENDAR VIEW
          ================================================== */}
      {activeTab === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentMonthDate(addMonths(currentMonthDate, -1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">
                {format(currentMonthDate, 'MMMM yyyy', { locale: th })}
              </h2>
              <button
                onClick={() => setCurrentMonthDate(addMonths(currentMonthDate, 1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <button
              onClick={() => setCurrentMonthDate(new Date())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              เดือนนี้
            </button>
          </div>

          {/* Month grid */}
          <div className="overflow-x-auto responsive-scroll-x -mx-2 sm:mx-0">
            <div className="min-w-[620px] grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map((dayName) => (
              <div key={dayName} className="bg-slate-50 py-2.5 text-center text-xs font-bold text-slate-600">
                {dayName}
              </div>
            ))}

            {(() => {
              const mStart = startOfMonth(currentMonthDate);
              const mEnd = endOfMonth(mStart);
              const cStart = startOfWeek(mStart, { weekStartsOn: 1 });
              const cEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
              const cDays = eachDayOfInterval({ start: cStart, end: cEnd });

              return cDays.map((day) => {
                const dStr = format(day, 'yyyy-MM-dd');
                const isCurrMonth = isSameMonth(day, mStart);
                const isCurDay = isToday(day);
                const daySess = sessionsByDate.get(dStr) || [];
                const dayReviews = reviewsByDate.get(dStr) || [];

                return (
                  <div
                    key={dStr}
                    onClick={() => handleOpenAddModal(dStr)}
                    className={`min-h-[110px] p-2 bg-white flex flex-col justify-between cursor-pointer hover:bg-blue-50/30 transition-colors ${
                      !isCurrMonth ? 'bg-slate-50/50 text-slate-300' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isCurDay ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {(daySess.length > 0 || dayReviews.length > 0) && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {daySess.length + dayReviews.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1">
                      {daySess.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate text-white ${
                            SUBJECTS[s.subjectId]?.color || 'bg-slate-500'
                          }`}
                        >
                          {s.startTime} {s.title}
                        </div>
                      ))}
                      {dayReviews.length > 0 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReviewItem(dayReviews[0]);
                          }}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate bg-purple-100 text-purple-800 hover:bg-purple-200 flex items-center gap-1 transition-colors"
                          title={`มีทบทวน ${dayReviews.length} รายการ (คลิกเพื่อเริ่ม)`}
                        >
                          <Brain className="w-2.5 h-2.5 shrink-0 text-purple-700" />
                          <span>ทบทวน {dayReviews.length} บท</span>
                        </div>
                      )}
                      {daySess.length > 2 && (
                        <p className="text-[9px] text-slate-400 font-medium pl-1">
                          +{daySess.length - 2} รายการเพิ่มเติม
                        </p>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL: ADD / EDIT SESSION
          ================================================== */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-session-modal-title"
        >
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 id="add-session-modal-title" className="text-base font-bold text-slate-900">
                {editingSession ? 'แก้ไขแผนการเรียน' : 'เพิ่มแผนการเรียนใหม่'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="ปิดหน้าต่างเพิ่มแผนการเรียน"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-6 space-y-4">
              {formError && (
                <div 
                  role="alert" 
                  className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200"
                >
                  {formError}
                </div>
              )}

              {/* Subject selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">วิชา</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SUBJECTS).map(([id, info]) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => {
                        setFormSubjectId(id as SubjectId);
                        setFormLessonId('custom');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        formSubjectId === id
                          ? `${info.color} text-white border-transparent shadow-xs`
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {info.name.split('/')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Dropdown */}
              <div>
                <label htmlFor="planner-form-lesson-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกบทเรียนจากระบบ หรือ กำหนดเอง
                </label>
                <select
                  id="planner-form-lesson-select"
                  value={formLessonId}
                  onChange={(e) => {
                    const lId = e.target.value;
                    setFormLessonId(lId);
                    if (lId !== 'custom') {
                      const sel = lessons.find((l) => l.id === lId);
                      if (sel) setFormTitle(sel.title);
                    }
                  }}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="custom">✏️ กำหนดหัวข้ออิสระ (Custom Task)</option>
                  {lessons
                    .filter((l) => l.subjectId === formSubjectId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} (เดือน {l.month})
                      </option>
                    ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="planner-form-title-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อหัวข้อ / สิ่งที่จะทำ
                </label>
                <input
                  id="planner-form-title-input"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น ทำโจทย์สมการเชิงเส้น 20 ข้อ"
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="planner-form-type-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                    ประเภทกิจกรรม
                  </label>
                  <select
                    id="planner-form-type-select"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as StudySessionType)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="learn">เรียนเนื้อหาใหม่</option>
                    <option value="review">ทบทวนบทเรียน</option>
                    <option value="practice">ฝึกทำโจทย์</option>
                    <option value="quiz">ทำแบบทดสอบ</option>
                    <option value="exam">จำลองสอบเสมือนจริง</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="planner-form-priority-select" className="block text-xs font-bold text-slate-700 mb-1.5">
                    ความสำคัญ (Priority)
                  </label>
                  <select
                    id="planner-form-priority-select"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="High">สูง (สำคัญมาก)</option>
                    <option value="Medium">ปานกลาง</option>
                    <option value="Low">ต่ำ</option>
                  </select>
                </div>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="planner-form-date-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                    วันที่
                  </label>
                  <input
                    id="planner-form-date-input"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="planner-form-starttime-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                    เวลาเริ่ม
                  </label>
                  <input
                    id="planner-form-starttime-input"
                    type="time"
                    value={formStartTime}
                    onChange={(e) => handleTimeChange(e.target.value, formEndTime)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="planner-form-endtime-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                    เวลาเสร็จ
                  </label>
                  <input
                    id="planner-form-endtime-input"
                    type="time"
                    value={formEndTime}
                    onChange={(e) => handleTimeChange(formStartTime, e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Duration info */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <span>ระยะเวลาที่วางแผน:</span>
                <span className="font-bold text-blue-600">{formPlannedMinutes} นาที ({Math.round((formPlannedMinutes / 60) * 10) / 10} ชม.)</span>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="planner-form-notes-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  บันทึกเพิ่มเติม
                </label>
                <textarea
                  id="planner-form-notes-input"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="เช่น ทำแบบฝึกหัดท้ายบทที่ 3 ข้อ 1-10"
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 resize-none h-16"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
                >
                  {editingSession ? 'บันทึกการแก้ไข' : 'เพิ่มลงตาราง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL: COMPLETE SESSION
          ================================================== */}
      {completingSession && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-session-title"
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 id="complete-session-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" /> บันทึกการเรียนเสร็จสิ้น
            </h3>
            <p className="text-xs text-slate-600">
              บทเรียน: <span className="font-bold text-slate-900">{completingSession.title}</span>
            </p>
            <div>
              <label htmlFor="complete-actual-minutes-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                เวลาที่ใช้เรียนจริง (นาที)
              </label>
              <input
                id="complete-actual-minutes-input"
                type="number"
                value={actualMinutesInput}
                onChange={(e) => setActualMinutesInput(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500"
                min={1}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                เวลาที่วางแผนไว้เดิม: {completingSession.plannedMinutes} นาที
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCompletingSession(null)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmComplete}
                className="min-h-[44px] px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all"
              >
                ยืนยันเรียนจบแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL: RESCHEDULE SESSION
          ================================================== */}
      {reschedulingSession && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-session-title"
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 id="reschedule-session-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FastForward className="w-5 h-5 text-blue-600" aria-hidden="true" /> เลื่อนเวลาเรียน
            </h3>
            <p className="text-xs text-slate-600">
              บทเรียน: <span className="font-bold text-slate-900">{reschedulingSession.title}</span>
            </p>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">เลือกวันที่ต้องการย้ายไป:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConfirmReschedule(todayStr)}
                  className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 text-center transition-all flex items-center justify-center"
                >
                  เรียนวันนี้ ({format(new Date(), 'd MMM')})
                </button>
                <button
                  onClick={() => handleConfirmReschedule(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                  className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 text-center transition-all flex items-center justify-center"
                >
                  พรุ่งนี้ ({format(addDays(new Date(), 1), 'd MMM')})
                </button>
                <button
                  onClick={() => handleConfirmReschedule(format(addDays(weekEnd, -1), 'yyyy-MM-dd'))}
                  className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 text-center transition-all flex items-center justify-center"
                >
                  วันเสาร์นี้
                </button>
                <button
                  onClick={() => handleConfirmReschedule(format(weekEnd, 'yyyy-MM-dd'))}
                  className="min-h-[44px] p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 text-center transition-all flex items-center justify-center"
                >
                  วันอาทิตย์นี้
                </button>
              </div>

              <div className="pt-2">
                <label htmlFor="reschedule-custom-date" className="block text-xs font-bold text-slate-700 mb-1">
                  หรือเลือกวันที่กำหนดเอง:
                </label>
                <input
                  id="reschedule-custom-date"
                  type="date"
                  defaultValue={todayStr}
                  onChange={(e) => {
                    if (e.target.value) handleConfirmReschedule(e.target.value);
                  }}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReschedulingSession(null)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL: WEEKLY GOAL SETTINGS
          ================================================== */}
      {isGoalModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-goal-modal-title"
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 id="weekly-goal-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" aria-hidden="true" /> ตั้งเป้าหมายสัปดาห์ (Weekly Goals)
            </h3>
            <p className="text-xs text-slate-500">
              กำหนดเป้าหมายเพื่อเป็นเกณฑ์วัดความก้าวหน้าและการรักษาวินัยในแต่ละสัปดาห์
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="targetHoursInput" className="block text-xs font-bold text-slate-700 mb-1">
                  เป้าหมายชั่วโมงเรียนรวม (ชม./สัปดาห์)
                </label>
                <input
                  type="number"
                  defaultValue={weeklyGoal?.targetHours || 18}
                  id="targetHoursInput"
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500"
                  min={1}
                />
              </div>
              <div>
                <label htmlFor="targetLessonsInput" className="block text-xs font-bold text-slate-700 mb-1">
                  เป้าหมายจำนวนบทเรียนใหม่ที่จบ (บท/สัปดาห์)
                </label>
                <input
                  type="number"
                  defaultValue={weeklyGoal?.targetLessons || 6}
                  id="targetLessonsInput"
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500"
                  min={1}
                />
              </div>
              <div>
                <label htmlFor="targetReviewsInput" className="block text-xs font-bold text-slate-700 mb-1">
                  เป้าหมายจำนวนครั้งทบทวน / ทำโจทย์ (ครั้ง/สัปดาห์)
                </label>
                <input
                  type="number"
                  defaultValue={weeklyGoal?.targetReviews || 4}
                  id="targetReviewsInput"
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500"
                  min={1}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const thEl = document.getElementById('targetHoursInput') as HTMLInputElement;
                  const tlEl = document.getElementById('targetLessonsInput') as HTMLInputElement;
                  const trEl = document.getElementById('targetReviewsInput') as HTMLInputElement;
                  setWeeklyGoal({
                    targetHours: Number(thEl?.value || 18),
                    targetLessons: Number(tlEl?.value || 6),
                    targetReviews: Number(trEl?.value || 4),
                  });
                  setIsGoalModalOpen(false);
                }}
                className="min-h-[44px] px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-all"
              >
                บันทึกเป้าหมาย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Session Modal */}
      <ReviewSessionModal
        reviewItem={activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onNext={() => {
          const fresh = getDueReviewItems();
          const next = [...fresh.overdue, ...fresh.dueToday].filter((r) => r.id !== activeReviewItem?.id);
          setActiveReviewItem(next.length > 0 ? next[0] : null);
        }}
        hasMoreDue={totalReviewDueCount > 1}
      />
    </div>
  );
}

// Helper for adding months
function addMonths(date: Date, count: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
}
