import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { SUBJECTS } from '../types';
import type { SubjectId } from '../types';
import { CheckCircle, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function SubjectPage() {
  const { id } = useParams<{ id: SubjectId }>();
  const { lessons, addLesson, updateLesson } = useStore();
  
  if (!id || !SUBJECTS[id]) return <div className="p-8 text-center text-slate-600">ไม่พบวิชา</div>;
  
  const subject = SUBJECTS[id];
  const subjectLessons = lessons.filter(l => l.subjectId === id);
  const completedCount = subjectLessons.filter(l => l.status === 'COMPLETED').length;
  const progressPercent = subjectLessons.length === 0 ? 0 : Math.round((completedCount / subjectLessons.length) * 100);

  const handleAddLesson = () => {
    const newLesson = {
      id: uuidv4(),
      title: 'บทเรียนใหม่',
      subjectId: id,
      month: 1,
      week: 1,
      durationHours: 1,
      status: 'NOT STARTED' as const,
      difficulty: 'Medium' as const,
      notes: '',
      resources: [],
      images: []
    };
    addLesson(newLesson);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className={`${subject.color} rounded-3xl p-5 sm:p-8 text-white shadow-lg`}>
        <h1 className="text-2xl sm:text-3xl font-bold">{subject.name}</h1>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
             <div className="bg-white h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="font-bold text-sm sm:text-base">{progressPercent}%</span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-white/90">
          เรียนแล้ว {completedCount} จากทั้งหมด {subjectLessons.length} บท
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">บทเรียนทั้งหมด</h2>
        <button 
          type="button"
          onClick={handleAddLesson}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors focus:ring-2 focus:ring-blue-500 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>เพิ่มบทเรียน</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjectLessons.map(lesson => (
          <div key={lesson.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between">
             <div>
               <div className="flex justify-between items-start mb-3 gap-2">
                 <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${lesson.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : lesson.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                   {lesson.status}
                 </span>
                 <span className="text-xs text-slate-500">{lesson.durationHours || 1} ชม.</span>
               </div>
               <h3 className="font-bold text-base text-slate-900 mb-2 leading-snug">{lesson.title}</h3>
               <p className="text-slate-500 text-xs mb-4 line-clamp-2">{lesson.description || 'ไม่มีคำอธิบาย'}</p>
             </div>
             
             <div className="flex items-center gap-2 pt-2">
                <Link
                  to={`/lessons/${lesson.id}`}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold flex justify-center items-center gap-2 transition-colors focus:ring-2 focus:ring-blue-500"
                >
                  ดูรายละเอียด / แก้ไข
                </Link>
                {lesson.status !== 'COMPLETED' && (
                  <button 
                    type="button"
                    onClick={() => updateLesson(lesson.id, { status: 'COMPLETED' })}
                    aria-label={`ทำเครื่องหมายว่าเรียนจบแล้วสำหรับ ${lesson.title}`}
                    className="flex-none w-11 h-11 min-h-[44px] min-w-[44px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors focus:ring-2 focus:ring-emerald-500"
                  >
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
