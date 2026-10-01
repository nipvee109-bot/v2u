import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { SUBJECTS } from '../types';
import type { SubjectId } from '../types';
import { CheckCircle, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function SubjectPage() {
  const { id } = useParams<{ id: SubjectId }>();
  const { lessons, addLesson, updateLesson } = useStore();
  
  if (!id || !SUBJECTS[id]) return <div>ไม่พบวิชา</div>;
  
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
    <div className="space-y-6">
      <div className={`${subject.color} rounded-2xl p-8 text-white shadow-lg`}>
        <h1 className="text-3xl font-bold">{subject.name}</h1>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 bg-white/20 rounded-full h-3">
             <div className="bg-white h-full rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="font-bold">{progressPercent}%</span>
        </div>
        <p className="mt-2 text-sm text-white/80">
          เรียนแล้ว {completedCount} จากทั้งหมด {subjectLessons.length} บท
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">บทเรียนทั้งหมด</h2>
        <button 
          onClick={handleAddLesson}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" /> เพิ่มบทเรียน
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjectLessons.map(lesson => (
          <div key={lesson.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow relative">
             <div className="flex justify-between items-start mb-3">
               <span className={`text-xs px-2 py-1 rounded-full ${lesson.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : lesson.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                 {lesson.status}
               </span>
               <span className="text-sm text-gray-500">{lesson.durationHours} ชม.</span>
             </div>
             <h3 className="font-bold text-lg text-gray-900 mb-2">{lesson.title}</h3>
             <p className="text-gray-500 text-sm mb-4 line-clamp-2">{lesson.description || 'ไม่มีคำอธิบาย'}</p>
             
             <div className="flex gap-2">
                <Link to={`/lessons/${lesson.id}`} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-colors">
                  ดูรายละเอียด / แก้ไข
                </Link>
                {lesson.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => updateLesson(lesson.id, { status: 'COMPLETED' })}
                    className="flex-none w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
