import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  BookMarked, 
  PlayCircle, 
  Globe, 
  FileText, 
  Sparkles, 
  Layers, 
  Filter,
  GraduationCap
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Resource, ResourceType, ResourceRole, SubjectId } from '../types';
import { SUBJECTS } from '../types';
import { ResourceCard } from '../components/ResourceCard';
import { CreateResourceModal } from '../components/CreateResourceModal';
import { AssignLessonModal } from '../components/AssignLessonModal';
import { ResourceDiscoveryModal } from '../components/study/ResourceDiscoveryModal';
import { CoursePlaylistView } from '../components/study/CoursePlaylistView';

export const ResourcesPage: React.FC = () => {
  const { getAllResources, deleteResource, toggleFavoriteResource, lessons, resources, courses } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');
  const [selectedRole, setSelectedRole] = useState<ResourceRole | 'ALL'>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<'resources' | 'courses'>('resources');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [assigningResource, setAssigningResource] = useState<Resource | null>(null);

  // Memoized unified resources
  const allResources = useMemo(() => getAllResources(), [getAllResources, resources, lessons]);

  // Fast O(1) lesson lookup map
  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  // Statistics
  const stats = useMemo(() => {
    const total = allResources.length;
    let youtubeCount = 0;
    let docAndWebCount = 0;
    let favoriteCount = 0;

    for (let i = 0; i < allResources.length; i++) {
      const r = allResources[i];
      if (r.type === 'youtube') youtubeCount++;
      if (r.type === 'document' || r.type === 'website') docAndWebCount++;
      if (r.favorite) favoriteCount++;
    }

    return { total, youtubeCount, docAndWebCount, favoriteCount };
  }, [allResources]);

  // Filtered resources with deferred search for 60fps input responsiveness
  const filteredResources = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();

    return allResources.filter((r) => {
      // Favorites filter
      if (onlyFavorites && !r.favorite) {
        return false;
      }

      // Subject filter
      if (selectedSubject !== 'ALL' && r.subject !== selectedSubject) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && r.type !== selectedType) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'ALL' && r.role !== selectedRole) {
        return false;
      }

      // Search query filter (title, url, description, or linked lesson name)
      if (q) {
        const titleMatch = r.title.toLowerCase().includes(q);
        const urlMatch = r.url.toLowerCase().includes(q);
        const descMatch = r.description ? r.description.toLowerCase().includes(q) : false;
        
        let lessonMatch = false;
        if (r.lessonId) {
          const lesson = lessonMap.get(r.lessonId);
          if (lesson && lesson.title.toLowerCase().includes(q)) {
            lessonMatch = true;
          }
        }

        if (!titleMatch && !urlMatch && !descMatch && !lessonMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allResources, deferredSearchQuery, selectedSubject, selectedType, selectedRole, onlyFavorites, lessonMap]);

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setIsModalOpen(true);
  };

  const handleDelete = (resource: Resource) => {
    if (window.confirm(`ต้องการลบแหล่งเรียนรู้ "${resource.title}" ใช่หรือไม่?`)) {
      deleteResource(resource.id);
    }
  };

  const handleOpenAdd = () => {
    setEditingResource(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
              <BookMarked className="h-3.5 w-3.5" />
              <span>Phase 14 &middot; Centralized Resource Library</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              คลังแหล่งเรียนรู้ (Resource Library)
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              ศูนย์รวมคลิป YouTube, ชีทสรุป, เว็บไซต์อ้างอิง และภาพแผนภูมิ สำหรับเตรียมสอบวิศวะ เชื่อมโยงตรงสู่ทุกบทเรียน
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setIsDiscoveryOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600/90 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-600 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-indigo-200" />
              <span>ค้นหาแหล่งเรียน (Discovery)</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มแหล่งเรียนรู้</span>
            </button>
          </div>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">สื่อทั้งหมด</div>
            <div className="text-xl font-bold text-slate-900">{stats.total} รายการ</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">YouTube Clips</div>
            <div className="text-xl font-bold text-slate-900">{stats.youtubeCount} คลิป</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">เอกสาร & เว็บ</div>
            <div className="text-xl font-bold text-slate-900">{stats.docAndWebCount} รายการ</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Star className="h-5 w-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs text-slate-500">รายการโปรด</div>
            <div className="text-xl font-bold text-slate-900">{stats.favoriteCount} รายการ</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Resources vs Courses & Playlists */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'resources'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>สื่อการเรียนรายชิ้น ({stats.total})</span>
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'courses'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>คอร์ส & เพลย์ลิสต์ ({courses.length})</span>
        </button>
      </div>

      {activeTab === 'courses' ? (
        <CoursePlaylistView />
      ) : (
        <>
          {/* Filter and Search Controls */}
          <div className="card p-4 space-y-4">
            {/* Search Bar + Favorites Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <label htmlFor="resource-library-search" className="sr-only">
              ค้นหาตามชื่อคลิป ลิงก์ คำอธิบาย หรือบทเรียน
            </label>
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              id="resource-library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อคลิป, ลิงก์ URL, คำอธิบาย, หรือบทเรียนที่เกี่ยวข้อง..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            aria-pressed={onlyFavorites}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              onlyFavorites
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Star className={`h-4 w-4 ${onlyFavorites ? 'fill-white' : ''}`} aria-hidden="true" />
            <span>{onlyFavorites ? 'กำลังแสดงเฉพาะรายการโปรด' : 'เฉพาะรายการโปรด'}</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Subject Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> วิชา:
            </span>
            <button
              onClick={() => setSelectedSubject('ALL')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedSubject === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              ทุกวิชา
            </button>
            {Object.entries(SUBJECTS).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setSelectedSubject(id as SubjectId)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  selectedSubject === id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${info.color}`} />
                <span>{info.name}</span>
              </button>
            ))}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1">ประเภท:</span>
            <button
              onClick={() => setSelectedType('ALL')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedType('youtube')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedType === 'youtube'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <PlayCircle className="h-3 w-3" />
              <span>YouTube</span>
            </button>
            <button
              onClick={() => setSelectedType('website')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedType === 'website'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>เว็บไซต์</span>
            </button>
            <button
              onClick={() => setSelectedType('pdf')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedType === 'pdf'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => setSelectedType('document')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedType === 'document'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>เอกสาร</span>
            </button>
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> บทบาทในบทเรียน:
          </span>
          <button
            onClick={() => setSelectedRole('ALL')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedRole === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            ทุกบทบาท
          </button>
          <button
            onClick={() => setSelectedRole('primary')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedRole === 'primary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            แหล่งเรียนหลัก (Primary)
          </button>
          <button
            onClick={() => setSelectedRole('alternative')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedRole === 'alternative'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            ทางเลือก (Alternative)
          </button>
          <button
            onClick={() => setSelectedRole('practice')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedRole === 'practice'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            แบบฝึกหัด (Practice)
          </button>
          <button
            onClick={() => setSelectedRole('reference')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              selectedRole === 'reference'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            อ้างอิง (Reference)
          </button>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            ไม่พบแหล่งเรียนรู้ตามเงื่อนไขที่เลือก
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ลองปรับเปลี่ยนคำค้นหา หรือกดเคลียร์ตัวกรองวิชาและประเภทสื่อเพื่อดูรายการทั้งหมด
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('ALL');
                setSelectedType('ALL');
                setSelectedRole('ALL');
                setOnlyFavorites(false);
              }}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              รีเซ็ตตัวกรองทั้งหมด
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={() => toggleFavoriteResource(resource.id)}
              onAssignLesson={(r) => setAssigningResource(r)}
            />
          ))}
        </div>
      )}
      </>
      )}

      {/* Create / Edit Modal */}
      <CreateResourceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingResource(null);
        }}
        initialResource={editingResource}
      />

      {/* Assign to Lesson Modal */}
      <AssignLessonModal
        isOpen={Boolean(assigningResource)}
        resource={assigningResource}
        onClose={() => setAssigningResource(null)}
      />

      {/* Resource Discovery Modal */}
      <ResourceDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
      />
    </div>
  );
};
