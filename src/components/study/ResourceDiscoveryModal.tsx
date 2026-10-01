import React, { useState, useEffect, useDeferredValue } from 'react';
import {
  X,
  Search,
  Plus,
  PlayCircle,
  FileText,
  Globe,
  Layers,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { ResourceType, ResourceRole, SubjectId } from '../../types';
import { SUBJECTS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  defaultResourceProvider,
  type ResourceDiscoveryItem,
} from '../../utils/resourceDiscoveryProvider';

interface ResourceDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLessonId?: string;
  defaultSubjectId?: SubjectId;
}

export const ResourceDiscoveryModal: React.FC<ResourceDiscoveryModalProps> = ({
  isOpen,
  onClose,
  defaultLessonId,
  defaultSubjectId,
}) => {
  const { lessons, addResource } = useStore();

  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('Python Functions beginner');
  const deferredQuery = useDeferredValue(searchQuery);

  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');
  const [searchResults, setSearchResults] = useState<ResourceDiscoveryItem[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(defaultLessonId || '');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  // Manual URL state
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualType, setManualType] = useState<ResourceType>('youtube');
  const [manualRole, setManualRole] = useState<ResourceRole>('primary');
  const [manualError, setManualError] = useState<string | null>(null);

  // Sync defaultLessonId
  useEffect(() => {
    if (defaultLessonId) {
      setSelectedLessonId(defaultLessonId);
    } else if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [defaultLessonId, lessons, selectedLessonId]);

  // Execute search through provider
  useEffect(() => {
    let cancelled = false;

    defaultResourceProvider
      .search(deferredQuery, defaultSubjectId)
      .then((results) => {
        if (!cancelled) {
          setSearchResults(results);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, defaultSubjectId]);

  // Filtered results by type
  const filteredResults = searchResults.filter((item) => {
    if (selectedType !== 'ALL' && item.type !== selectedType) {
      return false;
    }
    return true;
  });

  const handleAddDiscoveredResource = (item: ResourceDiscoveryItem) => {
    if (!selectedLessonId) return;

    const targetLesson = lessons.find((l) => l.id === selectedLessonId);

    const res = addResource({
      id: '',
      title: item.title,
      url: item.url,
      type: item.type,
      role: item.suggestedRole || 'primary',
      provider: item.provider,
      subjectId: targetLesson?.subjectId || defaultSubjectId,
      subject: targetLesson?.subjectId || defaultSubjectId,
      lessonId: selectedLessonId,
      thumbnail: item.thumbnail,
      description: item.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (res.success) {
      setAddedItemIds((prev) => new Set([...prev, item.id]));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    if (!manualTitle.trim()) {
      setManualError('กรุณากรอกชื่อแหล่งเรียนรู้');
      return;
    }

    if (!manualUrl.trim() || !manualUrl.startsWith('http')) {
      setManualError('กรุณากรอก URL ที่ถูกต้องขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    const targetLesson = lessons.find((l) => l.id === selectedLessonId);

    const res = addResource({
      id: '',
      title: manualTitle.trim(),
      url: manualUrl.trim(),
      type: manualType,
      role: manualRole,
      subjectId: targetLesson?.subjectId || defaultSubjectId,
      subject: targetLesson?.subjectId || defaultSubjectId,
      lessonId: selectedLessonId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (res.success) {
      onClose();
    } else {
      setManualError(res.error || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl transition-all overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ค้นหาแหล่งเรียนรู้ (Resource Discovery)
              </h2>
              <p className="text-xs text-slate-500">
                ค้นหาวิดีโอ เอกสาร เว็บไซต์ฝึกฝน และเพิ่มเข้าสู่บทเรียนได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector & Lesson Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'search'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ค้นหาจากคลังความรู้
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'manual'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              กรอก URL เอง (Manual)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 shrink-0">เพิ่มเข้าบท:</span>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none max-w-[200px] truncate"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({SUBJECTS[l.subjectId].name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TAB 1: SEARCH DISCOVERY */}
        {activeTab === 'search' && (
          <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา เช่น Python Functions beginner, Calculus derivatives..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedType === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setSelectedType('youtube')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedType === 'youtube'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </button>
              <button
                onClick={() => setSelectedType('pdf')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedType === 'pdf'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => setSelectedType('website')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedType === 'website'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </button>
              <button
                onClick={() => setSelectedType('document')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  selectedType === 'document'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Documentation / Practice</span>
              </button>
            </div>

            {/* Results List */}
            <div className="space-y-3 pt-1">
              {filteredResults.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold">ไม่พบแหล่งเรียนรู้ตามคำค้นหา</p>
                  <p className="text-xs">ลองใช้คำค้นหาทั่วไป เช่น Python, Calculus, Physics, AI หรือสลับไปแท็บกรอก URL เอง</p>
                </div>
              ) : (
                filteredResults.map((item) => {
                  const isAdded = addedItemIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:shadow-xs"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="w-20 h-14 object-cover rounded-xl shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                            {item.type === 'pdf' ? (
                              <FileText className="w-6 h-6 text-red-500" />
                            ) : (
                              <Globe className="w-6 h-6 text-blue-500" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {item.provider}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                              {item.canEmbed ? 'เรียนในเว็บได้' : 'ลิงก์ภายนอก'}
                            </span>
                            {item.suggestedRole && (
                              <span className="text-[10px] text-slate-400">
                                บทบาท: {item.suggestedRole}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="พรีวิวในแท็บใหม่"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleAddDiscoveredResource(item)}
                          disabled={isAdded}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>เพิ่มแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>เพิ่มเข้าบทเรียน</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL URL MODE */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {manualError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                ชื่อสื่อการเรียนรู้ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="เช่น MIT Calculus Lecture 1 หรือ Python Cheat Sheet"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                URL ลิงก์ <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">ประเภท</label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as ResourceType)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="youtube">YouTube</option>
                  <option value="pdf">เอกสาร PDF</option>
                  <option value="website">เว็บไซต์ (Website)</option>
                  <option value="document">เอกสาร / บทความ</option>
                  <option value="image">รูปภาพ / ไดอะแกรม</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">บทบาทในบทเรียน</label>
                <select
                  value={manualRole}
                  onChange={(e) => setManualRole(e.target.value as ResourceRole)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="primary">แหล่งเรียนหลัก (Primary)</option>
                  <option value="alternative">ทางเลือก (Alternative)</option>
                  <option value="practice">แบบฝึกหัด (Practice)</option>
                  <option value="reference">อ้างอิง (Reference)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกแหล่งเรียนรู้นี้</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
