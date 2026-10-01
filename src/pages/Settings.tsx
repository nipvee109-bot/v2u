import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Download, Upload, RotateCcw } from 'lucide-react';

export function Settings() {
  const { lessons, unclearTopics, importData, resetToInitial } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = { lessons, unclearTopics };
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
           // Handle old array format fallback
           if (Array.isArray(importedData)) {
              importData({ lessons: importedData, unclearTopics: [] });
           } else {
              importData(importedData);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">ตั้งค่า / สำรองข้อมูล</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
           <h2 className="text-lg font-bold mb-2">ส่งออกข้อมูล (Export)</h2>
           <p className="text-sm text-gray-500 mb-4">ดาวน์โหลดข้อมูลบทเรียนและความคืบหน้าทั้งหมดเป็นไฟล์ JSON</p>
           <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
             <Download className="w-4 h-4" /> Export Data
           </button>
        </div>

        <hr className="border-gray-100" />

        <div>
           <h2 className="text-lg font-bold mb-2">นำเข้าข้อมูล (Import)</h2>
           <p className="text-sm text-gray-500 mb-4">นำเข้าข้อมูลจากไฟล์ JSON ที่เคยสำรองไว้ (ข้อมูลปัจจุบันจะถูกเขียนทับ)</p>
           <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 border border-gray-200">
             <Upload className="w-4 h-4" /> Import Data
           </button>
        </div>

        <hr className="border-gray-100" />

        <div>
           <h2 className="text-lg font-bold text-red-600 mb-2">รีเซ็ตข้อมูล (Reset)</h2>
           <p className="text-sm text-gray-500 mb-4">ลบข้อมูลทั้งหมดและกลับไปใช้แผนการเรียนเริ่มต้น</p>
           <button onClick={() => { if(confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?')) resetToInitial(); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 border border-red-200">
             <RotateCcw className="w-4 h-4" /> Reset to Default
           </button>
        </div>
      </div>
    </div>
  );
}
