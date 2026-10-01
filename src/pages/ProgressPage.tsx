import { useStore } from '../store/useStore';
import { Flame, Clock, CheckCircle2, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { SUBJECTS } from '../types';
import { format, isSameDay, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function ProgressPage() {
  const { lessons } = useStore();
  const completedLessons = lessons.filter(l => l.status === 'COMPLETED' && l.completedAt);
  const totalHours = Math.round(completedLessons.reduce((acc, l) => acc + (l.actualStudyMinutes || l.durationHours * 60), 0) / 60 * 10) / 10;

  const calculateStreak = () => {
    let streak = 0; let checkDate = new Date();
    while (true) {
      if (completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate))) { streak++; checkDate = subDays(checkDate, 1); }
      else { if (streak === 0 && isSameDay(checkDate, new Date())) { checkDate = subDays(checkDate, 1); if (completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate))) { streak++; checkDate = subDays(checkDate, 1); continue; } } break; }
    }
    return streak;
  };
  const streak = calculateStreak();
  const sortedHistory = [...completedLessons].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  const past7Days = Array.from({ length: 7 }).map((_, i) => { const date = subDays(new Date(), 6 - i); const ct = completedLessons.filter(l => l.completedAt && isSameDay(parseISO(l.completedAt), date)); return { date, count: ct.length, hours: ct.reduce((a, l) => a + (l.actualStudyMinutes || l.durationHours * 60), 0) / 60 }; });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <h1 className="text-2xl font-bold mb-6 relative z-10">บันทึกความก้าวหน้า</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {[{ icon: Flame, label: 'Study Streak', value: `${streak} วัน`, color: 'text-orange-400', bg: 'bg-orange-500/15' },
            { icon: CheckCircle2, label: 'บทที่จบ', value: `${completedLessons.length} บท`, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
            { icon: Clock, label: 'ชั่วโมงรวม', value: `${totalHours} ชม.`, color: 'text-blue-400', bg: 'bg-blue-500/15' },
            { icon: TrendingUp, label: 'เฉลี่ย/วัน', value: `${Math.round(past7Days.reduce((a, d) => a + d.hours, 0) / 7 * 10) / 10} ชม.`, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.07] backdrop-blur rounded-xl p-4 border border-white/[0.08]">
              <div className={`${s.bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-white/60 text-xs mb-0.5">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-day chart */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-slate-400" /> สถิติ 7 วันย้อนหลัง</h2>
          <div className="flex items-end justify-between h-36 gap-3 mb-4">
            {past7Days.map((day, idx) => {
              const maxH = Math.max(...past7Days.map(d => d.hours), 3);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 rounded-lg relative flex items-end justify-center" style={{ height: '100%' }}>
                    <div className="w-full rounded-lg transition-all duration-500 bg-blue-500 group-hover:bg-blue-600" style={{ height: day.hours > 0 ? `${(day.hours / maxH) * 100}%` : '2px', minHeight: day.hours > 0 ? '8px' : '2px' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{format(day.date, 'EE', { locale: th })}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Subject distribution */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-6">สัดส่วนวิชาที่จบ</h2>
          <div className="space-y-4">
            {Object.values(SUBJECTS).map(subject => {
              const count = completedLessons.filter(l => l.subjectId === subject.id).length;
              if (count === 0) return null;
              const percent = Math.round((count / Math.max(completedLessons.length, 1)) * 100);
              return (
                <div key={subject.id}>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1"><span>{subject.name}</span><span>{percent}%</span></div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${subject.color} rounded-full`} style={{ width: `${percent}%` }} /></div>
                </div>
              );
            })}
            {completedLessons.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีข้อมูล</p>}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-slate-900 mb-5">ประวัติการเรียน</h2>
        <div className="space-y-0 divide-y divide-slate-100">
          {sortedHistory.length === 0 && <p className="text-slate-400 text-sm py-6 text-center">ยังไม่มีประวัติ</p>}
          {sortedHistory.map(lesson => (
            <div key={lesson.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${SUBJECTS[lesson.subjectId]?.color || 'bg-slate-400'}`}><CheckCircle2 className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{lesson.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{SUBJECTS[lesson.subjectId]?.name} &middot; {lesson.actualStudyMinutes || lesson.durationHours * 60} นาที</p>
              </div>
              <div className="text-right flex-shrink-0"><p className="text-xs font-medium text-slate-500">{format(parseISO(lesson.completedAt!), 'dd MMM yy', { locale: th })}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
