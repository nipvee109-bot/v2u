import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ExternalLink, 
  PlayCircle, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  GraduationCap, 
  Sparkles,
  Layers,
  FolderOpen
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { SubjectId } from '../../types';
import { SUBJECTS } from '../../types';
import { computeCourseProgress, buildCourseFromOutline } from '../../utils/courseUtils';
import { useNavigate } from 'react-router-dom';

export const CoursePlaylistView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    courses, 
    toggleCourseItemCompleted, 
    addCourse, 
    deleteCourse,
    addModuleToCourse,
    addItemToCourseModule
  } = useStore();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<string | null>(null);

  // New Course Form State
  const [newTitle, setNewTitle] = useState('');
  const [newProvider, setNewProvider] = useState('YouTube');
  const [newSubject, setNewSubject] = useState<SubjectId>('programming');
  const [newDescription, setNewDescription] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newItemsText, setNewItemsText] = useState('');

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState('');

  // New Item Form State
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('45');
  const [newItemUrl, setNewItemUrl] = useState('');

  const currentCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  const stats = useMemo(() => {
    if (!currentCourse) return null;
    return computeCourseProgress(currentCourse);
  }, [currentCourse]);

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Parse outline if provided line-by-line
    const lines = newItemsText.split('\n').map((l) => l.trim()).filter(Boolean);
    const initialItems = lines.length > 0 
      ? lines.map((line) => ({ title: line, durationMinutes: 45 }))
      : [{ title: 'Lecture 1: Introduction & Overview', durationMinutes: 45 }];

    const generated = buildCourseFromOutline({
      title: newTitle.trim(),
      description: newDescription.trim() || `หลักสูตร ${newTitle.trim()} โดย ${newProvider}`,
      provider: newProvider,
      subjectId: newSubject,
      sourceUrl: newSourceUrl.trim() || undefined,
      modules: [
        {
          title: 'Module 1: เนื้อหาเริ่มต้น (Fundamentals)',
          items: initialItems,
        },
      ],
    });

    const newId = addCourse(generated);
    setSelectedCourseId(newId);
    setIsAddCourseModalOpen(false);

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewSourceUrl('');
    setNewItemsText('');
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !currentCourse) return;
    addModuleToCourse(currentCourse.id, newModuleTitle.trim());
    setNewModuleTitle('');
    setIsAddModuleModalOpen(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !currentCourse || !isAddItemModalOpen) return;
    addItemToCourseModule(currentCourse.id, isAddItemModalOpen, {
      title: newItemTitle.trim(),
      durationMinutes: parseInt(newItemDuration, 10) || 45,
      sourceUrl: newItemUrl.trim() || undefined,
    });
    setNewItemTitle('');
    setNewItemDuration('45');
    setNewItemUrl('');
    setIsAddItemModalOpen(null);
  };

  const handleLaunchStudyRoom = (item: { sourceUrl?: string; lessonId?: string; title: string }) => {
    if (item.lessonId) {
      navigate(`/study-room/${item.lessonId}`);
    } else if (item.sourceUrl) {
      // Launch external or open with generic lesson
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (courses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
        <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">ยังไม่มีคอร์สหรือเพลย์ลิสต์</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          เพิ่มคอร์สเรียนหรือเพลย์ลิสต์ YouTube เพื่อจัดโครงสร้างการเรียนแบบเป็นระบบ
        </p>
        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          สร้างคอร์สใหม่
        </button>
      </div>
    );
  }

  const subjectMeta = currentCourse ? SUBJECTS[currentCourse.subjectId] : null;

  return (
    <div className="space-y-6">
      {/* Course Selector Tabs & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-thin">
          {courses.map((course) => {
            const isSelected = course.id === (currentCourse?.id || '');
            const cProgress = computeCourseProgress(course);
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{course.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  {cProgress.progressPercent}%
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          เพิ่มคอร์ส / เพลย์ลิสต์
        </button>
      </div>

      {currentCourse && stats && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Course Banner & Stats Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 dark:from-slate-800/80 dark:to-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {currentCourse.provider}
                  </span>
                  {subjectMeta && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {subjectMeta.name}
                    </span>
                  )}
                  {currentCourse.sourceUrl && (
                    <a
                      href={currentCourse.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      เปิดหน้าต้นทาง
                    </a>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {currentCourse.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                  {currentCourse.description}
                </p>
              </div>

              {/* Progress Summary Card */}
              <div className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 min-w-[240px] shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ความคืบหน้ารวม</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {stats.progressPercent}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${stats.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {stats.completedItems} / {stats.totalItems} บทเรียน
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    เหลือ {Math.round(stats.remainingMinutes / 60 * 10) / 10} ชม.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modules List */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                โครงสร้างเนื้อหา & โมดูล ({currentCourse.modules?.length || 0} โมดูล)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddModuleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มโมดูล
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`ต้องการลบคอร์ส "${currentCourse.title}" หรือไม่?`)) {
                      deleteCourse(currentCourse.id);
                      setSelectedCourseId(courses.filter((c) => c.id !== currentCourse.id)[0]?.id || '');
                    }
                  }}
                  className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  title="ลบคอร์สนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {currentCourse.modules?.map((mod, modIdx) => {
              const isCollapsed = collapsedModules[mod.id];
              const completedCount = mod.items.filter((i) => i.completed).length;
              const allModCompleted = mod.items.length > 0 && completedCount === mod.items.length;

              return (
                <div
                  key={mod.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 transition"
                >
                  {/* Module Header */}
                  <div
                    onClick={() => toggleModuleCollapse(mod.id)}
                    className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-700/40 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronUp className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            โมดูล {modIdx + 1}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            {mod.title}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          สำเร็จแล้ว {completedCount} จาก {mod.items.length} บทเรียน
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {allModCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          เสร็จสิ้น
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {Math.round((completedCount / (mod.items.length || 1)) * 100)}%
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddItemModalOpen(mod.id);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-white dark:hover:bg-slate-700 transition"
                        title="เพิ่มบทเรียนในโมดูลนี้"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Module Items List */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/60 p-2">
                      {mod.items.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          ยังไม่มีบทเรียนในโมดูลนี้ คลิกปุ่ม + ด้านบนเพื่อเพิ่มบทเรียน
                        </div>
                      ) : (
                        mod.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition ${
                              item.completed
                                ? 'bg-slate-50/50 dark:bg-slate-800/40 opacity-80'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleCourseItemCompleted(currentCourse.id, mod.id, item.id)
                                }
                                className="mt-0.5 sm:mt-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
                              >
                                {item.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              <div>
                                <span className="text-xs text-slate-400 mr-2">
                                  {modIdx + 1}.{itemIdx + 1}
                                </span>
                                <span
                                  className={`text-sm font-medium ${
                                    item.completed
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.durationMinutes} นาที
                                  </span>
                                  {item.completedAt && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      • สำเร็จเมื่อ {new Date(item.completedAt).toLocaleDateString('th-TH')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(item.sourceUrl || item.lessonId) && (
                                <button
                                  type="button"
                                  onClick={() => handleLaunchStudyRoom(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>เริ่มเรียน</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Add New Course */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              เพิ่มคอร์สหรือเพลย์ลิสต์ใหม่
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อคอร์ส / เพลย์ลิสต์
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น CS50x Harvard, MIT 18.06 Linear Algebra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ผู้ให้บริการ / แพลตฟอร์ม
                  </label>
                  <input
                    type="text"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    placeholder="เช่น YouTube, MIT OCW, Coursera"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดวิชา
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as SubjectId)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(SUBJECTS).map(([k, s]) => (
                      <option key={k} value={k}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL ต้นทาง (ถ้ามี)
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายชื่อบทเรียน (1 บรรทัดต่อ 1 บทเรียน)
                </label>
                <textarea
                  rows={4}
                  value={newItemsText}
                  onChange={(e) => setNewItemsText(e.target.value)}
                  placeholder={"Lecture 1: Introduction\nLecture 2: Core Concepts\nLecture 3: Deep Dive"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition"
                >
                  สร้างคอร์ส
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Module */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              เพิ่มโมดูลใหม่ในคอร์สนี้
            </h3>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อโมดูล / หัวข้อหลัก
                </label>
                <input
                  type="text"
                  required
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="เช่น Module 2: Advanced Data Structures"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModuleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition"
                >
                  บันทึกโมดูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Item into Module */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              เพิ่มบทเรียนในโมดูล
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อบทเรียน
                </label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="เช่น Lecture 4: Balanced Binary Search Trees"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ระยะเวลาโดยประมาณ (นาที)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={newItemDuration}
                  onChange={(e) => setNewItemDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL คลิป หรือ เอกสาร (ถ้ามี)
                </label>
                <input
                  type="url"
                  value={newItemUrl}
                  onChange={(e) => setNewItemUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition"
                >
                  เพิ่มบทเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
