import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Download, Upload, RotateCcw, Monitor, Moon, Sun } from 'lucide-react';

export function Settings() {
  const { theme, setTheme, lessons, unclearTopics, sessions, weeklyGoal, importData, resetToInitial } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = { lessons, unclearTopics, sessions, weeklyGoal };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'engineering-study-hub-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData && typeof importedData === 'object') {
           if (Array.isArray(importedData)) {
              importData({ lessons: importedData, unclearTopics: [] });
           } else {
              importData({
                lessons: importedData.lessons || [],
                unclearTopics: importedData.unclearTopics || [],
                sessions: importedData.sessions,
                weeklyGoal: importedData.weeklyGoal,
              });
           }
           alert('นำเข้าข้อมูลสำเร็จ');
        } else {
           alert('ไฟล์ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า / สำรองข้อมูล</h1>
      
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        
        {/* Theme Settings */}
        <div>
           <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Monitor className="w-5 h-5" /> ธีมหน้าจอ (Theme)</h2>
           <p className="text-sm text-gray-500 mb-4">เลือกรูปแบบการแสดงผลของแอปพลิเคชัน</p>
           <div className="flex gap-3">
             <button onClick={() => setTheme('light')} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-600'}`}>
               <Sun className="w-6 h-6" /> สว่าง (Light)
             </button>
             <button onClick={() => setTheme('dark')} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${theme === 'dark' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-600'}`}>
               <Moon className="w-6 h-6" /> มืด (Dark)
             </button>
             <button onClick={() => setTheme('system')} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${theme === 'system' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-600'}`}>
               <Monitor className="w-6 h-6" /> ระบบ (System)
             </button>
           </div>
        </div>

        <hr className="border-gray-100" />

        {/* Export Data */}
        <div>
           <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Download className="w-5 h-5 text-blue-600" /> ส่งออกข้อมูล (Export)</h2>
           <p className="text-sm text-gray-500 mb-4">ดาวน์โหลดข้อมูลบทเรียน, โน้ต, และความคืบหน้าทั้งหมดเป็นไฟล์ JSON เพื่อเก็บสำรองไว้</p>
           <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm font-medium">
             <Download className="w-4 h-4" /> Export Backup
           </button>
        </div>

        <hr className="border-gray-100" />

        {/* Import Data */}
        <div>
           <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Upload className="w-5 h-5 text-green-600" /> นำเข้าข้อมูล (Import)</h2>
           <p className="text-sm text-gray-500 mb-4 text-red-500">คำเตือน: การนำเข้าข้อมูลจะเขียนทับ (Overwrite) ข้อมูลปัจจุบันทั้งหมดในเครื่อง</p>
           <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-gray-800 px-5 py-2.5 rounded-xl hover:bg-gray-50 border border-gray-200 shadow-sm font-medium">
             <Upload className="w-4 h-4" /> Import Backup
           </button>
        </div>

        <hr className="border-gray-100" />

        {/* Reset */}
        <div>
           <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2"><RotateCcw className="w-5 h-5" /> รีเซ็ตข้อมูล (Reset to Default)</h2>
           <p className="text-sm text-gray-500 mb-4">ลบข้อมูลทั้งหมดและกลับไปใช้แผนการเรียนเริ่มต้น (แนะนำให้ Export ข้อมูลก่อนทำการรีเซ็ต)</p>
           <button onClick={() => { if(confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) resetToInitial(); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl hover:bg-red-100 border border-red-200 font-medium">
             <RotateCcw className="w-4 h-4" /> Reset Data
           </button>
        </div>
      </div>
    </div>
  );
}
