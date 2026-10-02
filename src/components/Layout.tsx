import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BottomNav } from './BottomNav';
import { TopNav } from './navigation/TopNav';
import { useStore } from '../store/useStore';
import { OfflineIndicator } from './OfflineIndicator';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { lessons, activeLearningSession } = useStore();

  const activeLesson = activeLearningSession ? lessons.find(l => l.id === activeLearningSession.lessonId) : null;
  const completedCount = lessons.filter((l) => l.status === 'COMPLETED').length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayFormatted = format(new Date(), 'd MMM yyyy', { locale: th });

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

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <OfflineIndicator />
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/90 px-3.5 sm:px-4 lg:px-6 backdrop-blur-xl">
          {/* Left section: V2U brand + desktop primary nav */}
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link to="/" aria-label="V2U หน้าหลัก" className="flex items-center gap-2 shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <GraduationCap className="h-4.5 w-4.5" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold text-slate-900">V2U</span>
                <span className="hidden text-[10px] font-medium text-slate-500 sm:block lg:hidden xl:block">เส้นทางสายอาชีพสู่มหาวิทยาลัย</span>
              </span>
            </Link>
            <TopNav />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Today's date */}
            <span className="hidden text-xs font-medium text-slate-500 2xl:block">
              {todayFormatted}
            </span>

            {/* Progress stat pill */}
            <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 sm:flex md:hidden xl:flex text-slate-700">
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
            <form onSubmit={handleSearch} className="hidden lg:block" role="search">
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
                    searchFocused ? 'w-64' : 'w-44'
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

            {/* Avatar → ฉัน */}
            <Link
              to="/me"
              aria-label="โปรไฟล์ผู้ใช้งาน"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              S
            </Link>
          </div>
        </header>

        {/* Main scrollable content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-4 pt-5 pb-24 sm:pt-6 md:pb-6 lg:px-6 xl:px-8 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile primary navigation */}
      <BottomNav />
    </div>
  );
}
