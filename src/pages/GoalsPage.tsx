import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { StudyGoal, GoalScope, GoalStatus } from '../types';
import { GoalCard } from '../components/GoalCard';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function GoalsPage() {
  const { 
    addGoal, 
    updateGoal, 
    deleteGoal, 
    getCalculatedGoals, 
    learningSessionsHistory = [], 
    lessons = [],
    reviewQueue = []
  } = useStore();

  const [selectedScope, setSelectedScope] = useState<GoalScope | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<GoalStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);

  // Live calculated goals from real learning records
  const calculatedGoals = getCalculatedGoals();

  // Summary Metrics
  const totalGoals = calculatedGoals.length;
  const completedGoals = calculatedGoals.filter((g) => g.status === 'completed').length;
  const inProgressGoals = calculatedGoals.filter((g) => g.status === 'in_progress').length;
  const expiredGoals = calculatedGoals.filter((g) => g.status === 'expired').length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return calculatedGoals.filter((g) => {
      if (selectedScope !== 'all' && g.scope !== selectedScope) return false;
      if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
      return true;
    });
  }, [calculatedGoals, selectedScope, selectedStatus]);

  // Overall recent learning activity across the system
  const recentActivities = useMemo(() => {
    const list: { id: string; title: string; subtitle: string; time: string; icon: typeof Clock }[] = [];

    // 1. Learning sessions
    (learningSessionsHistory || [])
      .filter((s) => s.status === 'completed' && s.completedAt)
      .slice(0, 4)
      .forEach((s) => {
        const lesson = lessons.find((l) => l.id === s.lessonId);
        list.push({
          id: `s-${s.sessionId}`,
          title: `บันทึกเวลาเรียน ${Math.round((s.actualSeconds || 0) / 60)} นาที`,
          subtitle: lesson?.title || 'เซสชันการเรียน',
          time: s.completedAt!,
          icon: Clock,
        });
      });

    // 2. Completed lessons
    lessons
      .filter((l) => l.status === 'COMPLETED' && l.completedAt)
      .slice(0, 3)
      .forEach((l) => {
        list.push({
          id: `l-${l.id}`,
          title: `เรียนจบเนื้อหา: ${l.title}`,
          subtitle: `วิชา ${l.subjectId.toUpperCase()}`,
          time: l.completedAt!,
          icon: BookOpen,
        });
      });

    // 3. Spaced Reviews
    (reviewQueue || [])
      .filter((r) => r.lastReviewedAt)
      .slice(0, 3)
      .forEach((r) => {
        list.push({
          id: `r-${r.id}`,
          title: `ทบทวน Spaced Review: ${r.topic}`,
          subtitle: `รอบที่ ${r.reviewCount}`,
          time: r.lastReviewedAt!,
          icon: CheckCircle2,
        });
      });

    return list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  }, [learningSessionsHistory, lessons, reviewQueue]);

  const handleEdit = (goal: StudyGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleSave = (goal: StudyGoal) => {
    if (editingGoal) {
      updateGoal(goal.id, goal);
    } else {
      addGoal(goal);
    }
    setEditingGoal(null);
  };

  const handleCustomProgressUpdate = (id: string, newProgress: number) => {
    updateGoal(id, { customProgress: newProgress });
  };

  return (
    <div className="space-y-6">
      
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 shadow-md shadow-blue-600/25 flex items-center justify-center text-white shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                เป้าหมายการเรียน (Study Goals)
              </h1>
              <p className="text-xs text-slate-500">
                ระบบเป้าหมาย 4 ระดับ (รายวัน, รายสัปดาห์, รายเดือน, แผน 6 เดือน) คำนวณความคืบหน้าจากบันทึกจริง
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingGoal(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างเป้าหมายใหม่</span>
        </button>
      </div>

      {/* ═══════════ METRICS SUMMARY ROW ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Goals */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">เป้าหมายทั้งหมด</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalGoals}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">ทุกช่วงเวลา</span>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700">กำลังดำเนินการ</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{inProgressGoals}</p>
          <span className="text-[11px] text-blue-600/80 mt-1 block">ยังไม่หมดเวลา</span>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700">สำเร็จแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-900">{completedGoals}</p>
            <span className="text-xs font-semibold text-emerald-700">({completionRate}%)</span>
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">บรรลุเป้าหมายครบ</span>
        </div>

        {/* Expired */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">เลยกำหนด</span>
            <AlertCircle className={`w-4 h-4 ${expiredGoals > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${expiredGoals > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {expiredGoals}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">ต้องปรับแผนใหม่</span>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (3 Cols): Filters & Goals Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Scope Filter Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setSelectedScope('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScope === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({totalGoals})
              </button>

              <button
                onClick={() => setSelectedScope('daily')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScope === 'daily'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                รายวัน ({calculatedGoals.filter((g) => g.scope === 'daily').length})
              </button>

              <button
                onClick={() => setSelectedScope('weekly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScope === 'weekly'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                รายสัปดาห์ ({calculatedGoals.filter((g) => g.scope === 'weekly').length})
              </button>

              <button
                onClick={() => setSelectedScope('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScope === 'monthly'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                รายเดือน ({calculatedGoals.filter((g) => g.scope === 'monthly').length})
              </button>

              <button
                onClick={() => setSelectedScope('six_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScope === 'six_month'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                แผน 6 เดือน ({calculatedGoals.filter((g) => g.scope === 'six_month').length})
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 shrink-0">
              {(['all', 'in_progress', 'completed', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedStatus === st
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {st === 'all'
                    ? 'ทุกสถานะ'
                    : st === 'in_progress'
                    ? 'กำลังทำ'
                    : st === 'completed'
                    ? 'สำเร็จ'
                    : 'เลยกำหนด'}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Cards Grid */}
          {filteredGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onDelete={deleteGoal}
                  onUpdateCustomProgress={handleCustomProgressUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                ไม่พบเป้าหมายที่ตรงกับเงื่อนไขตัวกรอง
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ลองเปลี่ยนตัวกรอง หรือกดปุ่มสร้างเป้าหมายใหม่เพื่อกำหนดทิศทางการเรียนของคุณ
              </p>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มเป้าหมายใหม่</span>
              </button>
            </div>
          )}

        </div>

        {/* Right Column (1 Col): Contributing Recent Activities */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  กิจกรรมที่อัปเดตเป้าหมาย
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">เรียลไทม์</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ทุกครั้งที่คุณกดจับเวลาเรียน, ทำแบบทดสอบ หรือทบทวน Spaced Review ระบบจะคำนวณเป้าหมายที่เกี่ยวข้องให้ทันที
            </p>

            <div className="space-y-2.5 pt-1">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-start gap-2.5"
                    >
                      <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {act.subtitle}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {format(parseISO(act.time), 'dd/MM/yyyy HH:mm', { locale: th })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  ยังไม่มีกิจกรรมการเรียนล่าสุด
                </div>
              )}
            </div>
          </div>

          {/* Goal Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-4 text-xs text-blue-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>เคล็ดลับการตั้งเป้าหมาย</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • <strong>เป้าหมายรายวัน (Daily)</strong> ควรตั้งให้ทำได้จริง เช่น 1.5 - 2 ชม. เพื่อรักษาวินัยต่อเนื่อง
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • <strong>เป้าหมายรายสัปดาห์ (Weekly)</strong> ช่วยชดเชยวันที่ติดธุระและเห็นภาพรวมความคืบหน้า
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • <strong>แผน 6 เดือน (6-Month)</strong> ช่วยให้ไม่หลุดจากเป้าหมายใหญ่สู่คณะวิศวะในฝัน
            </p>
          </div>
        </div>

      </div>

      {/* Create / Edit Goal Modal */}
      <CreateGoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        initialGoal={editingGoal}
      />

    </div>
  );
}
