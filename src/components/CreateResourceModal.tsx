import React, { useState, useEffect } from 'react';
import { X, Link2, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import type { Resource, ResourceType, SubjectId } from '../types';
import { SUBJECTS } from '../types';
import { useStore } from '../store/useStore';
import { isValidUrl, isDuplicateResource, getAutoThumbnail } from '../utils/resourceUtils';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: Resource | null;
  defaultSubject?: SubjectId;
  defaultLessonId?: string;
}

const RESOURCE_TYPES: { id: ResourceType; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'website', label: 'เว็บไซต์ (Website)' },
  { id: 'document', label: 'เอกสาร (PDF/Document)' },
  { id: 'image', label: 'รูปภาพ / ชาร์ต (Image)' },
  { id: 'other', label: 'อื่นๆ (Other)' },
];

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  initialResource,
  defaultSubject = 'math',
  defaultLessonId,
}) => {
  const { lessons, addResource, updateResource, getAllResources } = useStore();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ResourceType>('youtube');
  const [subject, setSubject] = useState<SubjectId>(defaultSubject);
  const [lessonId, setLessonId] = useState<string>(defaultLessonId || '');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect type if URL looks like youtube
  const handleUrlChange = (val: string) => {
    setUrl(val);
    setError(null);
    if (val.includes('youtube.com') || val.includes('youtu.be')) {
      setType('youtube');
      const autoThumb = getAutoThumbnail(val, 'youtube');
      if (autoThumb && !thumbnail) {
        setThumbnail(autoThumb);
      }
    }
  };

  const handleFetchThumbnail = () => {
    const autoThumb = getAutoThumbnail(url, type);
    if (autoThumb) {
      setThumbnail(autoThumb);
    } else {
      setError('ไม่สามารถดึงภาพปกอัตโนมัติจาก URL นี้ได้ (รองรับเฉพาะ YouTube)');
    }
  };

  useEffect(() => {
    if (initialResource) {
      setTitle(initialResource.title);
      setUrl(initialResource.url);
      setType(initialResource.type || 'youtube');
      setSubject(initialResource.subject || defaultSubject);
      setLessonId(initialResource.lessonId || '');
      setThumbnail(initialResource.thumbnail || '');
      setDescription(initialResource.description || '');
      setFavorite(!!initialResource.favorite);
      setError(null);
    } else {
      setTitle('');
      setUrl('');
      setType('youtube');
      setSubject(defaultSubject);
      setLessonId(defaultLessonId || '');
      setThumbnail('');
      setDescription('');
      setFavorite(false);
      setError(null);
    }
  }, [initialResource, isOpen, defaultSubject, defaultLessonId]);

  if (!isOpen) return null;

  // Filter lessons based on selected subject
  const subjectLessons = lessons.filter((l) => l.subjectId === subject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle) {
      setError('กรุณากรอกชื่อแหล่งเรียนรู้');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError('กรุณากรอก URL ที่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)');
      return;
    }

    const allResources = getAllResources();
    if (isDuplicateResource(trimmedUrl, initialResource?.id, allResources)) {
      setError('มีแหล่งเรียนรู้นี้อยู่ในระบบแล้ว (ตรวจพบ URL ซ้ำ)');
      return;
    }

    const finalThumbnail = getAutoThumbnail(trimmedUrl, type, thumbnail);

    if (initialResource) {
      const res = updateResource(initialResource.id, {
        title: trimmedTitle,
        url: trimmedUrl,
        type,
        subject,
        lessonId: lessonId || undefined,
        thumbnail: finalThumbnail,
        description: description.trim() || undefined,
        favorite,
      });

      if (!res.success) {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึก');
        return;
      }
    } else {
      const res = addResource({
        id: '',
        title: trimmedTitle,
        url: trimmedUrl,
        type,
        subject,
        lessonId: lessonId || undefined,
        thumbnail: finalThumbnail,
        description: description.trim() || undefined,
        favorite,
      });

      if (!res.success) {
        setError(res.error || 'เกิดข้อผิดพลาดในการเพิ่มแหล่งเรียนรู้');
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialResource ? 'แก้ไขแหล่งเรียนรู้' : 'เพิ่มแหล่งเรียนรู้ใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                จัดเก็บวิดีโอ, ชีทสรุป, บทความ, หรือรูปภาพเพื่อใช้ทบทวน
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              ชื่อแหล่งเรียนรู้ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น MIT Linear Algebra Lecture 1 หรือ ชีทสรุปสูตรฟิสิกส์"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              URL ลิงก์ <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Grid: Type & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                ประเภทสื่อ
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                วิชาที่เกี่ยวข้อง
              </label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value as SubjectId);
                  setLessonId('');
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(SUBJECTS).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linked Lesson */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              เชื่อมโยงกับบทเรียน (ถ้ามี)
            </label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- ไม่เชื่อมโยง (แหล่งเรียนรู้ทั่วไป) --</option>
              {subjectLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (เดือนที่ {l.month})
                </option>
              ))}
            </select>
          </div>

          {/* Thumbnail URL with Auto Fetch */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                ภาพหน้าปก (URL)
              </label>
              {(url.includes('youtube.com') || url.includes('youtu.be')) && (
                <button
                  type="button"
                  onClick={handleFetchThumbnail}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  <Sparkles className="h-3 w-3" />
                  ดึงภาพปก YouTube อัตโนมัติ
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://... (เว้นว่างไว้เพื่อให้ระบบดึงให้อัตโนมัติ)"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 pl-9 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              คำอธิบาย / โน้ตย่อ
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุว่าคลิปนี้หรือชีทนี้เน้นเรื่องอะไร เช่น เทคนิคการแก้โจทย์แนวนี้..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="favorite-toggle"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="h-4 w-4 rounded-sm border-slate-300 text-amber-500 focus:ring-amber-400"
            />
            <label htmlFor="favorite-toggle" className="cursor-pointer text-xs font-medium text-slate-700">
              บันทึกเป็นรายการโปรด (Starred / Favorite)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              {initialResource ? 'บันทึกการแก้ไข' : 'เพิ่มแหล่งเรียนรู้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
