import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Trash2, Plus, Link as LinkIcon, PlayCircle, FileText, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, Resource } from '../types';

export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lessons, updateLesson, deleteLesson } = useStore();
  
  const existingLesson = lessons.find(l => l.id === id);
  const [lesson, setLesson] = useState<Lesson | null>(existingLesson || null);

  if (!lesson) return <div className="text-center py-20 text-gray-500">ไม่พบบทเรียน</div>;

  const updateField = (field: keyof Lesson, value: any) => {
    const updated = { ...lesson, [field]: value };
    setLesson(updated);
    updateLesson(lesson.id, { [field]: value });
  };

  const handleDelete = () => {
    if (confirm('แน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) {
      deleteLesson(lesson.id);
      navigate(-1);
    }
  };

  const handleAddResource = () => {
    const url = prompt('ใส่ URL (เช่น YouTube, Website, Document):');
    if (url) {
      let type: Resource['type'] = 'website';
      if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
      else if (url.includes('.pdf') || url.includes('docs.google.com')) type = 'document';

      const newResource: Resource = { 
        id: uuidv4(), 
        type, 
        title: type === 'youtube' ? 'YouTube Video' : 'Link / Document', 
        url 
      };
      updateField('resources', [...lesson.resources, newResource]);
    }
  };

  const handleRemoveResource = (rId: string) => {
    updateField('resources', lesson.resources.filter(r => r.id !== rId));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            updateField('images', [...lesson.images, event.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...lesson.images];
    newImages.splice(index, 1);
    updateField('images', newImages);
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <ArrowLeft className="w-5 h-5 mr-2" /> ย้อนกลับ
        </button>
        <button onClick={handleDelete} className="flex items-center text-red-600 bg-white border border-red-100 hover:bg-red-50 px-4 py-2 rounded-xl shadow-sm transition-colors">
          <Trash2 className="w-4 h-4 mr-2" /> ลบเนื้อหา
        </button>
      </div>

      {/* Lesson Information */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
        {lesson.status === 'COMPLETED' && <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>}
        
        <input 
          type="text" 
          value={lesson.title} 
          onChange={e => updateField('title', e.target.value)}
          className="w-full text-3xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0 mb-6 bg-transparent"
          placeholder="ชื่อบทเรียน..."
        />

        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div className="flex-1 min-w-[150px]">
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">สถานะ</label>
             <div className="flex gap-2">
                <button onClick={() => updateField('status', 'NOT STARTED')} className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${lesson.status === 'NOT STARTED' ? 'bg-gray-100 border-gray-200 text-gray-700' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}>
                  <Circle className="w-4 h-4" /> เริ่มใหม่
                </button>
                <button onClick={() => updateField('status', 'IN PROGRESS')} className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${lesson.status === 'IN PROGRESS' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}>
                  <PlayCircle className="w-4 h-4" /> กำลังเรียน
                </button>
                <button onClick={() => updateField('status', 'COMPLETED')} className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${lesson.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-700' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}>
                  <CheckCircle2 className="w-4 h-4" /> เรียนจบแล้ว
                </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
           <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">เวลาที่ใช้ (ชม.)</label>
              <input type="number" value={lesson.durationHours} onChange={e => updateField('durationHours', Number(e.target.value))} className="w-full text-lg font-bold text-gray-900 border-none bg-transparent p-0 focus:ring-0" />
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ความยาก</label>
              <select value={lesson.difficulty} onChange={e => updateField('difficulty', e.target.value)} className="w-full text-lg font-bold text-gray-900 border-none bg-transparent p-0 focus:ring-0 cursor-pointer">
                <option value="Easy">ง่าย</option>
                <option value="Medium">ปานกลาง</option>
                <option value="Hard">ยาก</option>
              </select>
           </div>
        </div>
      </div>

      {/* Resources & Videos */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">แหล่งเรียนรู้ / วิดีโอ</h3>
            <button onClick={handleAddResource} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4" /> เพิ่มลิงก์
            </button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lesson.resources.length === 0 && <p className="text-gray-400 text-sm md:col-span-2">ยังไม่มีแหล่งเรียนรู้ที่แนบไว้</p>}
            {lesson.resources.map(r => {
               const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
               return (
                <div key={r.id} className="group relative bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  {yId ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="block relative w-full h-40 bg-gray-200">
                      <img src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors"><PlayCircle className="w-12 h-12 text-white" /></div>
                    </a>
                  ) : (
                    <div className="p-4 flex items-start gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0">
                         {r.type === 'document' ? <FileText className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
                       </div>
                       <div className="flex-1 min-w-0">
                         <a href={r.url} target="_blank" rel="noreferrer" className="text-base font-bold text-gray-900 hover:text-blue-600 truncate block">{r.title}</a>
                         <p className="text-xs text-gray-500 truncate mt-1">{r.url}</p>
                       </div>
                    </div>
                  )}
                  {yId && (
                     <div className="p-3 bg-white border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900 truncate pr-4">YouTube Video</span>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold hover:underline">เปิดดู &rarr;</a>
                     </div>
                  )}
                  <button onClick={() => handleRemoveResource(r.id)} className="absolute top-2 right-2 bg-white/90 text-gray-400 hover:text-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
         </div>
      </div>

      {/* Notes Section - The Core Notebook Experience */}
      <div className="space-y-6">
         <div className="bg-blue-50/50 p-6 md:p-8 rounded-3xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> สิ่งที่ฉันเรียนรู้จากบทนี้</h3>
            <textarea 
              value={lesson.learnedNotes || ''} 
              onChange={e => updateField('learnedNotes', e.target.value)}
              placeholder="จดสรุปเนื้อหา หรือ concept สำคัญที่เข้าใจแล้ว..."
              className="w-full bg-white border-none rounded-2xl shadow-sm p-5 min-h-[150px] outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 resize-y"
            />
         </div>
         
         <div className="bg-red-50/50 p-6 md:p-8 rounded-3xl border border-red-100">
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> สิ่งที่ยังไม่เข้าใจ</h3>
            <textarea 
              value={lesson.stillUnclearNotes || ''} 
              onChange={e => updateField('stillUnclearNotes', e.target.value)}
              placeholder="มีจุดไหนที่ยังงงอยู่บ้าง? พิมพ์ไว้เดี๋ยวกลับมาหาคำตอบทีหลัง..."
              className="w-full bg-white border-none rounded-2xl shadow-sm p-5 min-h-[120px] outline-none focus:ring-2 focus:ring-red-500 text-gray-800 resize-y"
            />
         </div>

         <div className="bg-orange-50/50 p-6 md:p-8 rounded-3xl border border-orange-100">
            <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> ต้องกลับมาทบทวนอะไร?</h3>
            <textarea 
              value={lesson.reviewNotes || ''} 
              onChange={e => updateField('reviewNotes', e.target.value)}
              placeholder="เช่น กลับไปดูสูตรหน้า 24, ฝึกเขียน loop เพิ่ม..."
              className="w-full bg-white border-none rounded-2xl shadow-sm p-5 min-h-[120px] outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 resize-y"
            />
         </div>
      </div>

      {/* Images / Attachments */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">รูปภาพประกอบ</h3>
            <label className="flex items-center gap-2 bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200">
              <Plus className="w-4 h-4" /> อัปโหลดรูปภาพ
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
         </div>
         
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {lesson.images.length === 0 && <p className="text-gray-400 text-sm col-span-full">ยังไม่มีรูปภาพ (แคปเจอร์สไลด์หรือโจทย์มาแปะไว้ที่นี่ได้)</p>}
            {lesson.images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <img src={img} className="w-full h-full object-cover" alt="attachment" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <button onClick={() => removeImage(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
         </div>
      </div>
      
    </div>
  );
}
