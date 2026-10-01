import React, { useState, useEffect } from 'react';
import { X, Check, Link2 } from 'lucide-react';
import type { Resource, ResourceRole, SubjectId } from '../types';
import { SUBJECTS } from '../types';
import { useStore } from '../store/useStore';

interface AssignLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
}

const ROLES: { id: ResourceRole; label: string; desc: string }[] = [
  { id: 'primary', label: 'แหล่งเรียนหลัก (Primary)', desc: 'สื่อหลักที่ใช้เรียนเนื้อหาบทนี้' },
  { id: 'alternative', label: 'แหล่งเรียนทางเลือก (Alternative)', desc: 'วิดีโอหรือบทความเพิ่มเติมกรณีต้องการมุมมองอื่น' },
  { id: 'practice', label: 'แบบฝึกหัด / โจทย์ปัญหา (Practice)', desc: 'โจทย์หรือแบบฝึกหัดสำหรับฝึกทำความเข้าใจ' },
  { id: 'reference', label: 'อ้างอิง / สรุปย่อ (Reference)', desc: 'เอกสารอ้างอิง สูตร หรือชีทสรุป' },
];

export const AssignLessonModal: React.FC<AssignLessonModalProps> = ({
  isOpen,
  onClose,
  resource,
}) => {
  const { lessons, updateResource } = useStore();

  const [selectedSubject, setSelectedSubject] = useState<SubjectId>('math');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ResourceRole>('primary');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resource) {
      if (resource.lessonId) {
        setSelectedLessonId(resource.lessonId);
        const linked = lessons.find((l) => l.id === resource.lessonId);
        if (linked) setSelectedSubject(linked.subjectId);
      } else if (resource.subject) {
        setSelectedSubject(resource.subject);
        setSelectedLessonId('');
      } else if (resource.subjectId) {
        setSelectedSubject(resource.subjectId);
        setSelectedLessonId('');
      } else {
        setSelectedSubject('math');
        setSelectedLessonId('');
      }
      setSelectedRole(resource.role || 'primary');
      setSuccessMessage(null);
    }
  }, [resource, lessons, isOpen]);

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const subjectLessons = lessons.filter((l) => l.subjectId === selectedSubject);

  const handleSave = () => {
    const matchedLesson = lessons.find((l) => l.id === selectedLessonId);
    const subject = matchedLesson ? matchedLesson.subjectId : selectedSubject;

    const res = updateResource(resource.id, {
      lessonId: selectedLessonId || undefined,
      role: selectedRole,
      subject,
      subjectId: subject,
      updatedAt: new Date().toISOString(),
    });

    if (res.success) {
      setSuccessMessage('เชื่อมโยงแหล่งเรียนรู้กับบทเรียนเรียบร้อยแล้ว');
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const handleUnassign = () => {
    const res = updateResource(resource.id, {
      lessonId: undefined,
      updatedAt: new Date().toISOString(),
    });

    if (res.success) {
      setSuccessMessage('ยกเลิกการเชื่อมโยงเรียบร้อยแล้ว');
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-lesson-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="assign-lesson-modal-title" className="text-base font-bold text-slate-900">
                เชื่อมโยงแหล่งเรียนรู้กับบทเรียน
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-[280px] sm:max-w-xs">
                {resource.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Subject selector */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              เลือกวิชา
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(SUBJECTS) as SubjectId[]).map((subjId) => {
                const isSelected = selectedSubject === subjId;
                return (
                  <button
                    key={subjId}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(subjId);
                      setSelectedLessonId('');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {SUBJECTS[subjId].name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lesson selector */}
          <div>
            <label htmlFor="assign-lesson-select" className="mb-1 block text-xs font-semibold text-slate-700">
              เลือกบทเรียนในวิชา {SUBJECTS[selectedSubject].name}
            </label>
            <select
              id="assign-lesson-select"
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">-- ไม่เชื่อมโยงบทเรียน --</option>
              {subjectLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (เดือน {l.month} · {l.status})
                </option>
              ))}
            </select>
          </div>

          {/* Role selector */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              บทบาทของสื่อนี้ในบทเรียน
            </label>
            <div className="space-y-2">
              {ROLES.map((r) => {
                const isSelected = selectedRole === r.id;
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resource-role"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setSelectedRole(r.id)}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{r.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {resource.lessonId ? (
              <button
                type="button"
                onClick={handleUnassign}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
              >
                ยกเลิกการเชื่อมโยง
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                บันทึก
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
