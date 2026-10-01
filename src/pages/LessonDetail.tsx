import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Trash2, Plus, Link as LinkIcon, FileText, CheckCircle2, AlertCircle, BookOpen, CheckCircle, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, Resource } from '../types';

type FlowStep = 'idle' | 'source_selection' | 'studying' | 'summary' | 'quiz' | 'notebook';

export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lessons, updateLesson, deleteLesson } = useStore();
  
  const existingLesson = lessons.find(l => l.id === id);
  const [lesson, setLesson] = useState<Lesson | null>(existingLesson || null);

  // Flow State
  const [step, setStep] = useState<FlowStep>(existingLesson?.status === 'COMPLETED' ? 'notebook' : 'idle');
  
  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Source Selection
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Quiz State
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  if (!lesson) return <div className="text-center py-20 text-gray-500">ไม่พบบทเรียน</div>;

  const handleDelete = () => {
    if (confirm('แน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) {
      deleteLesson(lesson.id);
      navigate(-1);
    }
  };

  const updateField = (field: keyof Lesson, value: any) => {
    const updated = { ...lesson, [field]: value };
    setLesson(updated);
    updateLesson(lesson.id, { [field]: value });
  };

  const handleStartFlow = () => {
     if (lesson.resources.length === 0) {
        setStep('studying');
        setIsTimerRunning(true);
        updateField('status', 'IN PROGRESS');
     } else {
        setStep('source_selection');
     }
  };

  const confirmSource = () => {
     setStep('studying');
     setIsTimerRunning(true);
     updateField('status', 'IN PROGRESS');
  };

  const finishStudying = () => {
     setIsTimerRunning(false);
     setStep('summary');
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishLesson = () => {
     updateField('status', 'COMPLETED');
     updateField('actualStudyMinutes', Math.round(timerSeconds / 60));
     if (quizScore !== null) {
       updateField('quizScore', quizScore);
     }
     setStep('notebook');
  };

  // Resources Handlers
  const handleAddResource = () => {
    const url = prompt('ใส่ URL (เช่น YouTube, Website, Document):');
    if (url) {
      let type: Resource['type'] = 'website';
      if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
      else if (url.includes('.pdf') || url.includes('docs.google.com')) type = 'document';

      const newResource: Resource = { 
        id: uuidv4(), type, title: type === 'youtube' ? 'YouTube Video' : 'Link / Document', url 
      };
      updateField('resources', [...lesson.resources, newResource]);
    }
  };

  const handleRemoveResource = (rId: string) => updateField('resources', lesson.resources.filter(r => r.id !== rId));

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

  // Render Functions based on steps
  const renderIdle = () => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-6">
       <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
         <BookOpen className="w-10 h-10" />
       </div>
       <div>
         <h2 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h2>
         <p className="text-gray-500">บทเรียนนี้ใช้เวลาประมาณ {lesson.durationHours} ชั่วโมง</p>
       </div>
       <button onClick={handleStartFlow} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all text-lg w-full max-w-sm">
         เริ่มเรียน
       </button>
       <div className="pt-4 border-t border-gray-100 mt-6 flex justify-center gap-4">
         <button onClick={() => setStep('notebook')} className="text-gray-500 hover:text-gray-900 text-sm font-medium underline">
           เปิดดูสมุดโน้ต (Notebook)
         </button>
       </div>
    </div>
  );

  const renderSourceSelection = () => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">ขั้นตอนที่ 1: เลือกแหล่งเรียนรู้</h2>
      <p className="text-gray-500 mb-6">คุณต้องการเริ่มเรียนจากแหล่งข้อมูลไหน?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lesson.resources.map(r => {
           const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
           const isSelected = selectedSourceId === r.id;
           return (
             <div key={r.id} onClick={() => setSelectedSourceId(r.id)} className={`cursor-pointer group relative bg-gray-50 border-2 rounded-2xl overflow-hidden transition-all ${isSelected ? 'border-blue-500 shadow-md bg-blue-50/20' : 'border-gray-100 hover:border-gray-300'}`}>
               {yId ? (
                  <div className="w-full h-32 bg-gray-200 relative">
                    <img src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`} className="w-full h-full object-cover" />
                  </div>
               ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400">
                     {r.type === 'document' ? <FileText className="w-10 h-10" /> : <LinkIcon className="w-10 h-10" />}
                  </div>
               )}
               <div className="p-4">
                 <h4 className="font-bold text-gray-900 line-clamp-1">{r.title}</h4>
                 <p className="text-xs text-gray-500 line-clamp-1 mt-1">{r.url}</p>
               </div>
               {isSelected && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1"><CheckCircle className="w-4 h-4"/></div>}
             </div>
           )
        })}
      </div>
      
      <div className="flex justify-end pt-6 border-t border-gray-100 gap-4 mt-6">
        <button onClick={() => setStep('idle')} className="px-6 py-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50">ยกเลิก</button>
        <button disabled={!selectedSourceId} onClick={confirmSource} className="bg-blue-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
          ยืนยัน เริ่มเรียน <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderStudying = () => {
    const selectedRes = lesson.resources.find(r => r.id === selectedSourceId);
    return (
      <div className="space-y-6">
         <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-500/10 animate-pulse"></div>
            <h2 className="text-lg font-bold text-slate-300 mb-6 relative z-10">กำลังเรียน: {lesson.title}</h2>
            <div className="text-6xl md:text-8xl font-mono font-light tracking-wider mb-8 relative z-10">
              {formatTime(timerSeconds)}
            </div>
            <div className="flex gap-4 relative z-10">
               {isTimerRunning ? (
                 <button onClick={() => setIsTimerRunning(false)} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-colors">
                   หยุดพัก (Pause)
                 </button>
               ) : (
                 <button onClick={() => setIsTimerRunning(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-colors">
                   เรียนต่อ (Resume)
                 </button>
               )}
               <button onClick={finishStudying} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-3 rounded-xl font-bold transition-colors">
                 เรียนจบแล้ว
               </button>
            </div>
         </div>
         {selectedRes && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
               <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">แหล่งเรียนรู้ที่กำลังใช้</p>
                  <p className="font-bold text-gray-900">{selectedRes.title}</p>
               </div>
               <a href={selectedRes.url} target="_blank" rel="noreferrer" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                 เปิดลิงก์
               </a>
            </div>
         )}
      </div>
    )
  };

  const renderSummary = () => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6 text-center">
       <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
         <CheckCircle2 className="w-10 h-10" />
       </div>
       <div>
         <h2 className="text-3xl font-bold text-gray-900 mb-2">เก่งมาก! เรียนจบแล้ว 🎉</h2>
         <p className="text-gray-500">คุณใช้เวลาเรียนไปทั้งหมด {formatTime(timerSeconds)}</p>
       </div>
       
       <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 max-w-lg mx-auto w-full">
         <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">อะไรที่ยังไม่เข้าใจ? (บันทึกด่วน)</label>
            <textarea 
              value={lesson.stillUnclearNotes || ''} 
              onChange={e => updateField('stillUnclearNotes', e.target.value)}
              placeholder="จดไว้ตรงนี้ ระบบจะนำไปใส่ในลิสต์ทบทวนให้..."
              className="w-full bg-white border border-gray-200 rounded-xl p-3 min-h-[80px] outline-none focus:border-blue-500"
            />
         </div>
       </div>

       <div className="flex justify-center gap-4 pt-6 mt-6 border-t border-gray-100">
         <button onClick={() => setStep('quiz')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all">
           ไปทำแบบทดสอบ (Quiz)
         </button>
         <button onClick={handleFinishLesson} className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">
           ข้ามไปสมุดโน้ต
         </button>
       </div>
    </div>
  );

  const renderQuiz = () => {
    // Fake Quiz Simulation
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Post-Lesson Quiz</h2>
            <span className="text-sm font-medium text-gray-500">ข้อ 1 / 1</span>
         </div>
         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
            <div className="h-full bg-indigo-500 w-full"></div>
         </div>
         
         {quizScore === null ? (
           <div className="space-y-6">
             <h3 className="text-lg font-medium text-gray-900">คุณให้คะแนนความเข้าใจในบทเรียนนี้เท่าไร? (จำลองแบบทดสอบ)</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => setQuizScore(100)} className="p-4 border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50 text-center font-bold text-gray-700 transition-colors">
                  เข้าใจแจ่มแจ้ง (100%)
                </button>
                <button onClick={() => setQuizScore(70)} className="p-4 border-2 border-gray-100 rounded-2xl hover:border-yellow-500 hover:bg-yellow-50 text-center font-bold text-gray-700 transition-colors">
                  พอเข้าใจ (70%)
                </button>
                <button onClick={() => setQuizScore(40)} className="p-4 border-2 border-gray-100 rounded-2xl hover:border-red-500 hover:bg-red-50 text-center font-bold text-gray-700 transition-colors">
                  ยังงงอยู่ (40%)
                </button>
             </div>
           </div>
         ) : (
           <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-8 border-indigo-100 text-3xl font-bold text-indigo-600">
                {quizScore}%
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">บันทึกผลการประเมินแล้ว</h3>
                <p className="text-gray-500 mt-2">คะแนนถูกบันทึกลงในสถิติของคุณ</p>
              </div>
              <button onClick={handleFinishLesson} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all mt-4">
                เสร็จสิ้นบทเรียน
              </button>
           </div>
         )}
      </div>
    );
  };

  const renderNotebook = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
        {lesson.status === 'COMPLETED' && <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>}
        <input 
          type="text" 
          value={lesson.title} 
          onChange={e => updateField('title', e.target.value)}
          className="w-full text-3xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0 mb-6 bg-transparent"
          placeholder="ชื่อบทเรียน..."
        />
        <div className="flex flex-wrap gap-4 items-center">
          <div>
             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">สถานะ</label>
             <select value={lesson.status} onChange={e => updateField('status', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-0 outline-none">
                <option value="NOT STARTED">ยังไม่เริ่ม</option>
                <option value="IN PROGRESS">กำลังเรียน</option>
                <option value="COMPLETED">เรียนจบแล้ว</option>
             </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">เวลาประเมิน (ชม.)</label>
              <input type="number" value={lesson.durationHours} onChange={e => updateField('durationHours', Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-0 outline-none w-32" />
           </div>
           {lesson.actualStudyMinutes !== undefined && (
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">เรียนจริง (นาที)</label>
                <div className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold text-gray-700">{lesson.actualStudyMinutes} นาที</div>
             </div>
           )}
           {lesson.quizScore !== undefined && (
             <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">คะแนน Quiz</label>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold">{lesson.quizScore}%</div>
             </div>
           )}
        </div>
      </div>

      {/* The Core Notebook Experience */}
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

      {/* Resources & Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">แหล่งเรียนรู้ / วิดีโอ</h3>
              <button onClick={handleAddResource} className="bg-blue-50 text-blue-700 p-2 rounded-xl hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
          </div>
          <div className="space-y-3">
              {lesson.resources.length === 0 && <p className="text-gray-400 text-sm">ยังไม่มีแหล่งเรียนรู้ที่แนบไว้</p>}
              {lesson.resources.map(r => {
                const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl group">
                     {yId ? (
                        <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} className="w-16 h-12 object-cover rounded-lg" />
                     ) : (
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 flex-shrink-0">
                          {r.type === 'document' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                        </div>
                     )}
                     <div className="flex-1 min-w-0">
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-900 hover:text-blue-600 truncate block">{r.title}</a>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{r.url}</p>
                     </div>
                     <button onClick={() => handleRemoveResource(r.id)} className="text-gray-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">รูปภาพประกอบ</h3>
              <label className="bg-gray-50 text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200">
                <Plus className="w-4 h-4" />
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
           </div>
           <div className="grid grid-cols-3 gap-3">
              {lesson.images.length === 0 && <p className="text-gray-400 text-sm col-span-full">ยังไม่มีรูปภาพ</p>}
              {lesson.images.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <img src={img} className="w-full h-full object-cover" alt="attachment" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <button onClick={() => removeImage(idx)} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg">
                       <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
        </button>
        <button onClick={handleDelete} className="flex items-center text-red-500 hover:text-red-700 text-sm font-medium transition-colors p-2">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {step === 'idle' && renderIdle()}
      {step === 'source_selection' && renderSourceSelection()}
      {step === 'studying' && renderStudying()}
      {step === 'summary' && renderSummary()}
      {step === 'quiz' && renderQuiz()}
      {step === 'notebook' && renderNotebook()}
    </div>
  );
}
