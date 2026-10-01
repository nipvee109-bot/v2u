import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Trash2, Plus, Link as LinkIcon, PlayCircle, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, Resource } from '../types';

export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lessons, updateLesson, deleteLesson } = useStore();
  
  const existingLesson = lessons.find(l => l.id === id);
  const [lesson, setLesson] = useState<Lesson | null>(existingLesson || null);

  if (!lesson) return <div>ไม่พบบทเรียน</div>;

  // Auto-save debounced
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
        title: type === 'youtube' ? 'YouTube Video' : 'Link/Document', 
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5 mr-2" /> ย้อนกลับ
        </button>
        <button onClick={handleDelete} className="flex items-center text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg">
          <Trash2 className="w-4 h-4 mr-2" /> ลบ
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <input 
            type="text" 
            value={lesson.title} 
            onChange={e => updateField('title', e.target.value)}
            className="w-full text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0"
            placeholder="ชื่อบทเรียน"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">สถานะ</label>
            <select 
              value={lesson.status}
              onChange={e => updateField('status', e.target.value)}
              className="w-full border-gray-200 rounded-lg shadow-sm p-2 text-sm"
            >
              <option value="NOT STARTED">ยังไม่เริ่ม</option>
              <option value="IN PROGRESS">กำลังเรียน</option>
              <option value="COMPLETED">เรียนจบแล้ว</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">เวลาเรียน (ชั่วโมง)</label>
            <input 
              type="number" 
              value={lesson.durationHours} 
              onChange={e => updateField('durationHours', Number(e.target.value))}
              className="w-full border-gray-200 rounded-lg shadow-sm p-2 text-sm"
            />
          </div>
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ระดับความยาก</label>
            <select 
              value={lesson.difficulty}
              onChange={e => updateField('difficulty', e.target.value)}
              className="w-full border-gray-200 rounded-lg shadow-sm p-2 text-sm"
            >
              <option value="Easy">ง่าย</option>
              <option value="Medium">ปานกลาง</option>
              <option value="Hard">ยาก</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">บันทึก (Notes) <span className="text-xs text-gray-400 font-normal ml-2">บันทึกอัตโนมัติ</span></label>
          <textarea 
            value={lesson.notes} 
            onChange={e => updateField('notes', e.target.value)}
            placeholder="จดบันทึกสิ่งที่คุณเรียนรู้ที่นี่..."
            className="w-full border-gray-200 rounded-xl shadow-inner p-4 min-h-[200px] bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resources */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">แหล่งเรียนรู้</h3>
            <button onClick={handleAddResource} className="bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-100">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {lesson.resources.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีลิงก์หรือไฟล์แนบ</p>}
            {lesson.resources.map(r => {
               const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
               return (
                <div key={r.id} className="group relative flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-shadow">
                  {yId && (
                    <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><PlayCircle className="w-6 h-6 text-white opacity-80" /></div>
                    </div>
                  )}
                  {!yId && (
                     <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                       {r.type === 'document' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                     </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-900 hover:text-blue-600 truncate block">
                      {r.title}
                    </a>
                    <p className="text-xs text-gray-500 truncate mt-1">{r.url}</p>
                  </div>
                  <button onClick={() => handleRemoveResource(r.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">รูปภาพประกอบ</h3>
            <label className="bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-100 cursor-pointer">
              <Plus className="w-5 h-5" />
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {lesson.images.length === 0 && <p className="text-sm text-gray-400 col-span-2">ยังไม่มีรูปภาพ (สามารถลากมาวางได้)</p>}
            {lesson.images.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                <img src={img} className="w-full h-full object-cover" alt="attachment" />
                <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
