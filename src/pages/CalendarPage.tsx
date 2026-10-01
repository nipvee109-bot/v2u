import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { SUBJECTS } from '../types';
import type { Lesson } from '../types';
import { Link } from 'react-router-dom';

export function CalendarPage() {
  const { lessons } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Pre-index lessons by date string (YYYY-MM-DD) for O(1) cell lookup
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      if (l.date) {
        const key = l.date.split('T')[0];
        let list = map.get(key);
        if (!list) {
          list = [];
          map.set(key, list);
        }
        list.push(l);
      }
    }
    return map;
  }, [lessons]);

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" aria-hidden="true" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-semibold text-sm text-gray-500 py-2" key={i}>
          {format(addDays(startDate, i), 'EEE', { locale: th })}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayLessons = lessonsByDate.get(dayKey) || [];
        const isCurrentDay = dayKey === todayStr;

        days.push(
          <div
            className={`min-h-[100px] p-2 border border-gray-100 ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}
            key={day.toString()}
          >
            <div className="flex justify-between items-start">
               <span className={`text-sm font-medium ${isCurrentDay ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                 {formattedDate}
               </span>
               <button 
                 className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                 aria-label={`เพิ่มกิจกรรมวันที่ ${formattedDate}`}
               >
                 <Plus className="w-4 h-4" aria-hidden="true" />
               </button>
            </div>
            <div className="mt-2 space-y-1">
              {dayLessons.map(l => (
                <Link to={`/lessons/${l.id}`} key={l.id} className={`block text-[10px] p-1 rounded truncate text-white ${SUBJECTS[l.subjectId]?.color || 'bg-gray-500'}`}>
                  {l.title}
                </Link>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">{rows}</div>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      {/* ═══════════ Premium Hero Banner ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/20">
              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Learning Calendar & Timeline</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ปฏิทินการเรียนรู้
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              ภาพรวมกำหนดการอ่านหนังสือ ทบทวน Spaced Repetition และเซสชันการเรียนรู้ตลอดทั้งเดือน
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-300">เดือนปัจจุบัน</div>
                <div className="text-sm font-bold text-white">
                  {format(currentMonth, 'MMMM yyyy', { locale: th })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200/70">
        {renderHeader()}
        <div className="overflow-x-auto responsive-scroll-x -mx-2 sm:mx-0 px-2 sm:px-0">
          <div className="min-w-[580px]">
            {renderDays()}
            {renderCells()}
          </div>
        </div>
      </div>
    </div>
  );
}
