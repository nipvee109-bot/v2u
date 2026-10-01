import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, GraduationCap, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Sidebar } from './Sidebar';
import { useStore } from '../store/useStore';

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#EFF3F8]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-xl lg:px-6">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors md:hidden"
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
            <span className="hidden text-xs font-medium text-slate-400 lg:block">
              {todayFormatted}
            </span>

            {/* Progress stat pill */}
            <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 sm:flex">
              <span className="text-xs font-semibold text-slate-700">{progressPercent}%</span>
              <span className="text-xs text-slate-400">&middot;</span>
              <span className="text-xs text-slate-500">
                {completedCount}/{totalCount} บท
              </span>
            </div>

            {/* Active Learning Session live pill */}
            {activeLesson && activeLearningSession && activeLearningSession.status !== 'completed' && activeLearningSession.status !== 'abandoned' && (
              <Link
                to={`/lessons/${activeLesson.id}`}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden lg:inline truncate max-w-[130px]">{activeLesson.title}</span>
                <span className="text-[11px] font-mono text-emerald-800">
                  {activeLearningSession.status === 'paused' ? 'พักชั่วคราว' : 'กำลังเรียน'}
                </span>
              </Link>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={`rounded-xl border border-slate-200/60 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${
                    searchFocused ? 'w-72' : 'w-56'
                  }`}
                />
              </div>
            </form>

            {/* Notification bell */}
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Avatar */}
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105">
              S
            </button>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
