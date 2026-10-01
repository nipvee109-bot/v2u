import { useStore } from '../store/useStore';
import { PlayCircle, Calendar as CalendarIcon, BookOpen, AlertCircle } from 'lucide-react';
import { SUBJECTS } from '../types';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { lessons, unclearTopics } = useStore();
  
  const completedLessons = lessons.filter(l => l.status === 'COMPLETED').length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const todayLessons = lessons.filter(l => l.status === 'IN PROGRESS' || (l.month === 1 && l.status === 'NOT STARTED')).slice(0, 3);
  const urgentUnclear = unclearTopics.filter(t => t.status !== 'Understood').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Banner - Dark Navy */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-3 rounded-xl">
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Engineering Study Hub</h1>
            <p className="text-slate-400 mt-1 text-sm">6-Month Roadmap to Computer Engineering / AI</p>
          </div>
        </div>
        <div className="flex gap-6 items-center flex-wrap">
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">เดือนที่ 1 / 6</p>
            <p className="text-sm font-semibold">1 ต.ค. - 31 ต.ค.</p>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">ความคืบหน้าภาพรวม</span>
              <span className="font-bold text-blue-400">{progressPercent}%</span>
            </div>
            <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 flex gap-4">
             <div>
               <p className="text-xs text-slate-400">เรียนแล้ว</p>
               <p className="text-sm font-semibold">{completedLessons} บท</p>
             </div>
             <div>
               <p className="text-xs text-slate-400">ทั้งหมด</p>
               <p className="text-sm font-semibold">{totalLessons} บท</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Study */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-blue-600" /> วันนี้ต้องเรียนอะไร?
             </h2>
             <span className="text-xs text-blue-600 font-medium cursor-pointer">ดูทั้งหมด &rarr;</span>
          </div>
          <div className="space-y-3">
            {todayLessons.map(lesson => (
              <div key={lesson.id} className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SUBJECTS[lesson.subjectId].color} text-white`}>
                    {SUBJECTS[lesson.subjectId].name}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{lesson.status === 'IN PROGRESS' ? 'กำลังเรียน' : 'เริ่มวันนี้'}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900 mb-1">{lesson.title}</h3>
                <div className="text-xs text-gray-500 mb-3 flex gap-3">
                  <span>⏱ {lesson.durationHours} ชั่วโมง</span>
                  <span className="flex items-center gap-1 text-green-600">● ระดับ {lesson.difficulty === 'Easy' ? 'ง่าย' : lesson.difficulty === 'Medium' ? 'ปานกลาง' : 'ยาก'}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Link to={`/lessons/${lesson.id}`} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium flex justify-center items-center gap-1 hover:bg-blue-700 transition-colors">
                    <PlayCircle className="w-3.5 h-3.5" /> เริ่มเรียน
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-slate-600" /> ตารางเรียนรายสัปดาห์
             </h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-xs text-left">
               <thead className="text-slate-500 bg-slate-50">
                 <tr>
                   <th className="px-3 py-2 rounded-l-lg font-medium">วัน</th>
                   <th className="px-3 py-2 font-medium">วิชา / กิจกรรม</th>
                   <th className="px-3 py-2 text-center rounded-r-lg font-medium">สถานะ</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'].map((day, i) => (
                   <tr key={day} className="hover:bg-slate-50/50">
                     <td className={`px-3 py-2.5 font-medium ${day === 'อาทิตย์' ? 'text-red-500' : 'text-slate-700'}`}>{day}</td>
                     <td className="px-3 py-2.5">
                       {i === 6 ? <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">พักผ่อน / ทบทวน</span> : 
                        <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${i%2===0?'bg-blue-500':'bg-green-500'}`}></span> ตามแผน</span>}
                     </td>
                     <td className="px-3 py-2.5 text-center">
                       <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" disabled={i>1} defaultChecked={i===0} />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Progress by Subject */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">ความคืบหน้าแยกตามวิชา</h2>
          <div className="space-y-4">
             {Object.values(SUBJECTS).map(subject => {
                const subLessons = lessons.filter(l => l.subjectId === subject.id);
                const subCompleted = subLessons.filter(l => l.status === 'COMPLETED').length;
                const percent = subLessons.length ? Math.round((subCompleted/subLessons.length)*100) : 0;
                return (
                  <div key={subject.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold ${subject.color}`}>
                           {subject.name.substring(0,2)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${subject.color}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
             })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Things I Don't Understand */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> สิ่งที่ยังไม่เข้าใจ
              </h2>
              <Link to="/not-understood" className="text-xs text-blue-600 font-medium">ดูทั้งหมด &rarr;</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                 <thead className="text-slate-500 bg-slate-50">
                   <tr>
                     <th className="px-3 py-2 font-medium rounded-l-lg">เรื่อง</th>
                     <th className="px-3 py-2 font-medium">วิชา</th>
                     <th className="px-3 py-2 font-medium">ระดับ</th>
                     <th className="px-3 py-2 font-medium rounded-r-lg">สถานะ</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {urgentUnclear.length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-center text-slate-400">ยังไม่มีรายการ</td></tr>
                    ) : (
                      urgentUnclear.map(u => (
                        <tr key={u.id}>
                          <td className="px-3 py-2.5 font-medium">{u.topic}</td>
                          <td className="px-3 py-2.5 text-slate-500">{SUBJECTS[u.subjectId]?.name}</td>
                          <td className="px-3 py-2.5"><span className={u.priority==='High'?'text-red-500':u.priority==='Medium'?'text-orange-500':'text-green-500'}>{u.priority}</span></td>
                          <td className="px-3 py-2.5">
                             <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px]">{u.status === 'Not Understood' ? 'ยังไม่เข้าใจ' : 'กำลังทบทวน'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
}
