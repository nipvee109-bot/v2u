import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  X,
  Video,
  FileText,
  Globe,
  Image as ImageIcon,
  File,
  Plus,
  Check,
} from 'lucide-react';
import type { Lesson, Resource } from '../../types';
import { SUBJECTS } from '../../types';

interface ResourceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson;
  onConfirm: (selectedResource: Resource | undefined) => void;
  onAddResource?: () => void;
}

const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Video,
  pdf: FileText,
  website: Globe,
  document: File,
  image: ImageIcon,
  other: File,
};

export const ResourceConfirmationModal: React.FC<ResourceConfirmationModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onConfirm,
  onAddResource,
}) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    lesson.resources.find((r) => r.role === 'primary')?.id || lesson.resources[0]?.id || null
  );

  if (!isOpen) return null;

  const subjectInfo = SUBJECTS[lesson.subjectId];
  const selectedResource = lesson.resources.find((r) => r.id === selectedResourceId);
  const hasResources = lesson.resources.length > 0;

  const handleStart = () => {
    onConfirm(selectedResource);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-confirm-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-6 sm:p-7 space-y-5 my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${subjectInfo?.color || 'bg-slate-100'} text-white`}>
                {subjectInfo?.name || lesson.subjectId}
              </span>
              <span className="text-[10px] text-slate-400">ยืนยันก่อนเข้าห้องเรียน</span>
            </div>
            <h3 id="resource-confirm-title" className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
              {lesson.title}
            </h3>
            {lesson.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>
            )}
          </div>
        </div>

        {/* Resource Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              เลือกสื่อการเรียนที่จะใช้
            </label>
            {onAddResource && (
              <button
                type="button"
                onClick={onAddResource}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มสื่อ
              </button>
            )}
          </div>

          {hasResources ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {lesson.resources.map((resource) => {
                const Icon = RESOURCE_TYPE_ICONS[resource.type] || File;
                const isSelected = resource.id === selectedResourceId;

                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => setSelectedResourceId(resource.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {resource.title}
                        </span>
                        {resource.role === 'primary' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold shrink-0">
                            หลัก
                          </span>
                        )}
                      </div>
                      {resource.provider && (
                        <span className="text-[10px] text-slate-400">{resource.provider}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">ยังไม่มีสื่อการเรียน</p>
              <p className="text-[10px] text-slate-400 mt-1">สามารถเรียนแบบจดโน้ตอย่างเดียวได้</p>
            </div>
          )}
        </div>

        {/* Study Info Summary */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/50">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              {lesson.durationHours} ชม. (เป้าหมาย)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              ความยาก: {lesson.difficulty === 'Easy' ? 'ง่าย' : lesson.difficulty === 'Medium' ? 'ปานกลาง' : 'ยาก'}
            </span>
            {lesson.resources.length > 0 && (
              <span className="text-slate-400">สื่อ {lesson.resources.length} รายการ</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
          >
            <Play className="w-4 h-4" />
            <span>เริ่มเรียน</span>
          </button>
        </div>
      </div>
    </div>
  );
};
