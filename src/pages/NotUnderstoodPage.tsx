import { useState } from 'react';
import { useStore } from '../store/useStore';
import { SUBJECTS } from '../types';
import type { SubjectId } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function NotUnderstoodPage() {
  const { unclearTopics, addUnclearTopic, updateUnclearTopic, deleteUnclearTopic } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ topic: '', details: '', subjectId: 'math' as SubjectId, priority: 'Medium' as 'Low'|'Medium'|'High' });

  const handleAdd = () => {
    if (!newTopic.topic.trim()) return;
    addUnclearTopic({
      id: uuidv4(),
      topic: newTopic.topic,
      details: newTopic.details,
      subjectId: newTopic.subjectId,
      priority: newTopic.priority,
      status: 'Not Understood',
      createdAt: new Date().toISOString()
    });
    setNewTopic({ topic: '', details: '', subjectId: 'math', priority: 'Medium' });
    setShowAddForm(false);
  };

  const pendingCount = unclearTopics.filter(t => t.status !== 'Understood').length;
  const highPriorityCount = unclearTopics.filter(t => t.priority === 'High' && t.status !== 'Understood').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      {/* ═══════════ Premium Hero Banner ═══════════ */}
      <div className="bg-gradient-to-br from-[#0B1120] via-[#131C31] to-[#0B1120] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-400/20">
              <Plus className="w-3.5 h-3.5 text-rose-400" />
              <span>Knowledge Debt & Clarification Notebook</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              สิ่งที่ยังไม่เข้าใจ
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              จดบันทึกหัวข้อและสมการที่ยังติดขัด เพื่อนำกลับมาทบทวนซ้ำและปิดจุดอ่อนก่อนสอบ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-300">รอทำความเข้าใจ</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {pendingCount} เรื่อง {highPriorityCount > 0 && <span className="text-rose-400 text-xs font-normal">({highPriorityCount} สำคัญสูง)</span>}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowAddForm(true)} 
              className="min-h-[44px] flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" aria-hidden="true" /> เพิ่มหัวข้อ
            </button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-4 text-slate-900">เพิ่มหัวข้อใหม่</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="unclear-topic-input" className="block text-sm font-medium text-gray-700 mb-1">
                หัวข้อ
              </label>
              <input 
                id="unclear-topic-input"
                type="text" 
                value={newTopic.topic} 
                onChange={e => setNewTopic({...newTopic, topic: e.target.value})} 
                className="w-full p-2.5 border border-gray-300 rounded-xl" 
                placeholder="เช่น สมการกำลังสอง" 
              />
            </div>
            <div>
              <label htmlFor="unclear-subject-select" className="block text-sm font-medium text-gray-700 mb-1">
                วิชา
              </label>
              <select 
                id="unclear-subject-select"
                value={newTopic.subjectId} 
                onChange={e => setNewTopic({...newTopic, subjectId: e.target.value as SubjectId})} 
                className="w-full p-2.5 border border-gray-300 rounded-xl"
              >
                {Object.values(SUBJECTS).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="unclear-details-input" className="block text-sm font-medium text-gray-700 mb-1">
                รายละเอียด (สิ่งที่ไม่เข้าใจ)
              </label>
              <textarea 
                id="unclear-details-input"
                value={newTopic.details} 
                onChange={e => setNewTopic({...newTopic, details: e.target.value})} 
                className="w-full p-2.5 border border-gray-300 rounded-xl" 
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="unclear-priority-select" className="block text-sm font-medium text-gray-700 mb-1">
                ระดับความสำคัญ
              </label>
              <select 
                id="unclear-priority-select"
                value={newTopic.priority} 
                onChange={e => setNewTopic({...newTopic, priority: e.target.value as 'Low'|'Medium'|'High'})} 
                className="w-full p-2.5 border border-gray-300 rounded-xl"
              >
                <option value="Low">ต่ำ (Low)</option>
                <option value="Medium">ปานกลาง (Medium)</option>
                <option value="High">สูง (High)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleAdd} 
              className="min-h-[44px] bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              บันทึก
            </button>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="min-h-[44px] bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto responsive-scroll-x">
          <table className="w-full text-left text-sm min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
              <tr>
                <th className="px-6 py-4 font-medium">เรื่อง</th>
                <th className="px-6 py-4 font-medium">วิชา</th>
                <th className="px-6 py-4 font-medium">ระดับ</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {unclearTopics.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">ยังไม่มีรายการสิ่งที่ไม่เข้าใจ เยี่ยมมาก!</td></tr>
              )}
              {unclearTopics.map(topic => (
                <tr key={topic.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{topic.topic}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{topic.details}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full text-white ${SUBJECTS[topic.subjectId]?.color || 'bg-gray-500'}`}>
                      {SUBJECTS[topic.subjectId]?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${topic.priority === 'High' ? 'text-red-500' : topic.priority === 'Medium' ? 'text-orange-500' : 'text-green-500'}`}>
                      {topic.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={topic.status} 
                      onChange={e => updateUnclearTopic(topic.id, { status: e.target.value as any })}
                      aria-label={`สถานะความเข้าใจของ ${topic.topic}`}
                      className="text-xs bg-transparent border border-gray-300 rounded-lg py-1 px-2 min-h-[36px]"
                    >
                      <option value="Not Understood">ยังไม่เข้าใจ</option>
                      <option value="Reviewing">กำลังทบทวน</option>
                      <option value="Understood">เข้าใจแล้ว</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { if(confirm('ลบรายการนี้?')) deleteUnclearTopic(topic.id) }} 
                      aria-label={`ลบหัวข้อ ${topic.topic}`}
                      className="w-9 h-9 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
