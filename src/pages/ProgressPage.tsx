import { useStore } from '../store/useStore';
import { Flame, Clock, CheckCircle2, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { SUBJECTS } from '../types';
import { format, isSameDay, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function ProgressPage() {
  const { lessons } = useStore();
  
  const completedLessons = lessons.filter(l => l.status === 'COMPLETED' && l.completedAt);
  const totalHours = completedLessons.reduce((acc, l) => acc + (l.durationHours || 0), 0);

  // Streak logic (same as dashboard)
  const calculateStreak = () => {
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const hasCompleted = completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate));
      if (hasCompleted) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        if (streak === 0 && isSameDay(checkDate, new Date())) {
           checkDate = subDays(checkDate, 1);
           const hasCompletedYesterday = completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate));
           if (hasCompletedYesterday) {
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
  const sortedHistory = [...completedLessons].sort((a,b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  // Past 7 days activity
  const past7Days = Array.from({length: 7}).map((_, i) => {
     const date = subDays(new Date(), 6 - i);
     const completedToday = completedLessons.filter(l => l.completedAt && isSameDay(parseISO(l.completedAt), date));
     return {
        date,
        count: completedToday.length,
        hours: completedToday.reduce((acc, l) => acc + (l.durationHours || 0), 0)
     };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
         <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">บันทึกความก้าวหน้า</h1>
            <p className="text-slate-300">ติดตามสถิติการเรียนของคุณในทุกๆ วัน</p>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
               <div className="text-slate-300 text-xs mb-1 flex items-center gap-1"><Flame className="w-4 h-4 text-orange-400" /> Study Streak</div>
               <div className="text-2xl font-bold">{streak} วัน</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
               <div className="text-slate-300 text-xs mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-400" /> บทเรียนที่จบแล้ว</div>
               <div className="text-2xl font-bold">{completedLessons.length} บท</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
               <div className="text-slate-300 text-xs mb-1 flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400" /> เวลาเรียนรวม</div>
               <div className="text-2xl font-bold">{totalHours} ชม.</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
               <div className="text-slate-300 text-xs mb-1 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-purple-400" /> เฉลี่ยต่อวัน (7 วัน)</div>
               <div className="text-2xl font-bold">
                  {Math.round((past7Days.reduce((acc, d) => acc + d.hours, 0) / 7) * 10) / 10} ชม.
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Activity Graph / Heatmap mockup */}
         <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-gray-400" /> สถิติ 7 วันย้อนหลัง</h2>
            <div className="flex items-end justify-between h-40 gap-2 mb-4">
               {past7Days.map((day, idx) => {
                  const maxHours = Math.max(...past7Days.map(d => d.hours), 4); // min scale 4h
                  const height = `${(day.hours / maxHours) * 100}%`;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                       <div className="w-full bg-gray-100 rounded-t-lg relative flex items-end justify-center min-h-[4px]">
                          <div className={`w-full rounded-t-lg transition-all duration-500 ${day.hours > 0 ? 'bg-blue-500' : 'bg-transparent'}`} style={{height: day.hours > 0 ? height : '0%'}}></div>
                          <div className="absolute -top-8 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                             {day.hours} ชม.
                          </div>
                       </div>
                       <div className="text-[10px] text-gray-400 font-medium">
                          {format(day.date, 'EE', {locale: th})}
                       </div>
                    </div>
                  )
               })}
            </div>
         </div>

         {/* Subject Distribution */}
         <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
             <h2 className="text-lg font-bold text-gray-900 mb-6">สัดส่วนวิชาที่จบแล้ว</h2>
             <div className="space-y-4">
                {Object.values(SUBJECTS).map(subject => {
                   const count = completedLessons.filter(l => l.subjectId === subject.id).length;
                   const percent = completedLessons.length ? Math.round((count / completedLessons.length) * 100) : 0;
                   if (count === 0) return null;
                   return (
                      <div key={subject.id}>
                         <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                            <span>{subject.name}</span>
                            <span>{percent}%</span>
                         </div>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${subject.color}`} style={{width: `${percent}%`}}></div>
                         </div>
                      </div>
                   )
                })}
                {completedLessons.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>}
             </div>
         </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
         <h2 className="text-lg font-bold text-gray-900 mb-6">ประวัติการเรียน (History)</h2>
         <div className="space-y-4">
            {sortedHistory.length === 0 && <p className="text-gray-500 text-sm">ยังไม่มีประวัติการเรียน</p>}
            {sortedHistory.map(lesson => (
               <div key={lesson.id} className="flex gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${SUBJECTS[lesson.subjectId]?.color || 'bg-gray-500'}`}>
                     <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                     <h4 className="font-bold text-gray-900 text-base">{lesson.title}</h4>
                     <p className="text-sm text-gray-500 mt-1">วิชา: {SUBJECTS[lesson.subjectId]?.name} • ใช้เวลา {lesson.durationHours} ชั่วโมง</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-bold text-gray-400">{format(parseISO(lesson.completedAt!), 'dd MMM yyyy', {locale: th})}</p>
                     <p className="text-[10px] text-gray-400">{format(parseISO(lesson.completedAt!), 'HH:mm')}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
}
