import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, GraduationCap, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Sidebar } from './Sidebar';
import { useStore } from '../store/useStore';
import { OfflineIndicator } from './OfflineIndicator';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { lessons, activeLearningSession } = useStore();

  const activeLesson = activeLearningSession ? lessons.find(l => l.id === activeLearningSession.lessonId) : null;
  const completedCount = lessons.filter((l) => l.status === 'COMPLETED').length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayFormatted = format(new Date(), 'd MMM yyyy', { locale: th });

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#EFF3F8]">
      {/* Keyboard Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold text-xs"
      >
        ข้ามไปยังเนื้อหาหลัก (Skip to main content)
      </a>

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="เมนูนำทางหลัก"
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <OfflineIndicator />
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/90 px-3.5 sm:px-4 lg:px-6 backdrop-blur-xl">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="เปิดเมนูนำทาง"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
              className="rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors md:hidden focus:ring-2 focus:ring-blue-500"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 sm:flex md:hidden">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">วิศวะต่อ</span>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Today's date */}
            <span className="hidden text-xs font-medium text-slate-500 lg:block">
              {todayFormatted}
            </span>

            {/* Progress stat pill */}
            <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 sm:flex text-slate-700">
              <span className="text-xs font-semibold">{progressPercent}%</span>
              <span className="text-xs text-slate-400">&middot;</span>
              <span className="text-xs text-slate-600">
                {completedCount}/{totalCount} บท
              </span>
            </div>

            {/* Active Learning Session live pill */}
            {activeLesson && activeLearningSession && activeLearningSession.status !== 'completed' && activeLearningSession.status !== 'abandoned' && (
              <Link
                to={`/lessons/${activeLesson.id}`}
                aria-label={`เซสชันที่กำลังเรียนอยู่: ${activeLesson.title}`}
                className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-full bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="hidden lg:inline truncate max-w-[130px]">{activeLesson.title}</span>
                <span className="text-[11px] font-mono font-semibold text-emerald-900">
                  {activeLearningSession.status === 'paused' ? 'พักชั่วคราว' : 'กำลังเรียน'}
                </span>
              </Link>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:block" role="search">
              <div className="relative">
                <label htmlFor="header-search-input" className="sr-only">
                  ค้นหาบทเรียนและเนื้อหา
                </label>
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  id="header-search-input"
                  type="search"
                  placeholder="ค้นหา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={`rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 ${
                    searchFocused ? 'w-72' : 'w-56'
                  }`}
                />
              </div>
            </form>

            {/* Notification bell */}
            <button
              type="button"
              aria-label="การแจ้งเตือน"
              className="relative rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:ring-2 focus:ring-blue-500"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
            </button>

            {/* Avatar */}
            <button
              type="button"
              aria-label="โปรไฟล์ผู้ใช้งาน"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              S
            </button>
          </div>
        </header>

        {/* Main scrollable content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-4 py-5 sm:py-6 lg:px-6 xl:px-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
