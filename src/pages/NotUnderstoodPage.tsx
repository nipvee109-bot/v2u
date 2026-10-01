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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-navy-900 text-white p-6 rounded-2xl shadow-sm bg-slate-900">
        <div>
          <h1 className="text-2xl font-bold">สิ่งที่ยังไม่เข้าใจ</h1>
          <p className="text-sm text-slate-300 mt-1">จดบันทึกหัวข้อที่ต้องกลับมาทบทวนเพิ่มเติม</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
          <Plus className="w-5 h-5" /> เพิ่มหัวข้อ
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-4">เพิ่มหัวข้อใหม่</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
              <input type="text" value={newTopic.topic} onChange={e => setNewTopic({...newTopic, topic: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="เช่น สมการกำลังสอง" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วิชา</label>
              <select value={newTopic.subjectId} onChange={e => setNewTopic({...newTopic, subjectId: e.target.value as SubjectId})} className="w-full p-2 border border-gray-300 rounded-lg">
                {Object.values(SUBJECTS).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (สิ่งที่ไม่เข้าใจ)</label>
              <textarea value={newTopic.details} onChange={e => setNewTopic({...newTopic, details: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" rows={3}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความสำคัญ</label>
              <select value={newTopic.priority} onChange={e => setNewTopic({...newTopic, priority: e.target.value as 'Low'|'Medium'|'High'})} className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="Low">ต่ำ (Low)</option>
                <option value="Medium">ปานกลาง (Medium)</option>
                <option value="High">สูง (High)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">บันทึก</button>
            <button onClick={() => setShowAddForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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
                      className="text-xs bg-transparent border-gray-300 rounded-lg py-1 px-2"
                    >
                      <option value="Not Understood">ยังไม่เข้าใจ</option>
                      <option value="Reviewing">กำลังทบทวน</option>
                      <option value="Understood">เข้าใจแล้ว</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { if(confirm('ลบรายการนี้?')) deleteUnclearTopic(topic.id) }} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
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
