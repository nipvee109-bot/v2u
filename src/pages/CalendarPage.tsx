import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { SUBJECTS } from '../types';
import { Link } from 'react-router-dom';

export function CalendarPage() {
  const { lessons } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <ChevronRight className="w-5 h-5 text-gray-600" />
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
        const cloneDay = day;
        
        // Find lessons for this day. Assuming lesson.date is ISO string or not set.
        // For mock purpose, let's map week/month to some pseudo dates or just rely on actual `lesson.date`.
        const dayLessons = lessons.filter(l => l.date && isSameDay(parseISO(l.date), cloneDay));

        days.push(
          <div
            className={`min-h-[100px] p-2 border border-gray-100 ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}
            key={day.toString()}
          >
            <div className="flex justify-between items-start">
               <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                 {formattedDate}
               </span>
               <button className="text-gray-300 hover:text-blue-500"><Plus className="w-4 h-4" /></button>
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
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">ปฏิทินการเรียน</h1>
        <p className="text-slate-300 text-sm mt-1">วางแผนและติดตามการเรียนในแต่ละวัน</p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
