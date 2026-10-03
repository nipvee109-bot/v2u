import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Mark, KIcon } from './v2u/kit';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BottomNav } from './BottomNav';
import { TopNav } from './navigation/TopNav';
import { DesktopSidebar } from './navigation/DesktopSidebar';
import { useStore } from '../store/useStore';
import { OfflineIndicator } from './OfflineIndicator';
import { learningHubPathFor } from '../curriculum/engine';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { lessons, activeLearningSession, getDueReviewItems } = useStore();
  const { overdue, dueToday } = getDueReviewItems();
  const dueCount = overdue.length + dueToday.length;

  const activeLesson = activeLearningSession ? lessons.find(l => l.id === activeLearningSession.lessonId) : null;
  // Green chip returns to the Learning Hub for this lesson (legacy page only for non-curriculum lessons)
  const activeHref = activeLesson
    ? learningHubPathFor(activeLesson, lessons, activeLearningSession?.curriculumLessonId) ?? `/lessons/${activeLesson.id}`
    : '/learn';

  const todayFormatted = format(new Date(), 'd MMM yyyy', { locale: th });


  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Design background: dot grid fading toward the bottom (body carries the glow) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{ backgroundImage: 'radial-gradient(var(--dot) 1px, transparent 1.2px)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 70%)' }}
      />
      {/* Keyboard Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold text-xs"
      >
        ข้ามไปยังเนื้อหาหลัก (Skip to main content)
      </a>

      {/* Desktop (≥1024px) primary navigation */}
      <DesktopSidebar />

      {/* Main content area */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        <OfflineIndicator />
        {/* Header (design: 58px frosted bar; brand mark on phone/tablet) */}
        <header
          className="sticky top-0 z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4 lg:h-16 lg:px-8"
          style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderColor: 'var(--line)' }}
        >
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link to="/" aria-label="V2U เส้นทางสายอาชีพสู่มหาวิทยาลัย — หน้าหลัก" className="flex items-center gap-2.5 shrink-0 lg:hidden">
              <Mark size={34} />
              <span className="font-display text-[18px] font-bold" style={{ color: 'var(--ink)' }}>V2U</span>
            </Link>
            <TopNav />
            <span className="hidden text-[13px] font-medium lg:block" style={{ color: 'var(--ink-3)' }}>{todayFormatted}</span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Active Learning Session live pill */}
            {activeLesson && activeLearningSession && activeLearningSession.status !== 'completed' && activeLearningSession.status !== 'abandoned' && (
              <Link
                to={activeHref}
                data-testid="live-session-chip"
                aria-label={`กลับไปเรียนบทนี้: ${activeLesson.title}`}
                title="กลับไปเรียนบทนี้"
                className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-full bg-[var(--ok-soft)] text-xs font-bold text-[var(--ok)] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-pulse" />
                <span className="hidden lg:inline truncate max-w-[130px]">{activeLesson.title}</span>
                <span className="text-[11px] font-mono font-semibold ">
                  {activeLearningSession.status === 'paused' ? 'กลับไปเรียนบทนี้' : 'กำลังเรียน'}
                </span>
              </Link>
            )}

            {/* Search (phone/tablet; desktop search lives in the sidebar) */}
            <Link
              to="/search"
              aria-label="ค้นหา"
              className="rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors lg:hidden"
            >
              <KIcon name="search" size={20} />
            </Link>

            {/* Review reminder: dot only when something is actually due (Phase 49) */}
            <Link
              to="/review"
              aria-label={dueCount > 0 ? `ถึงเวลาทบทวน ${dueCount} เรื่อง` : 'ทบทวน — ไม่มีเรื่องที่ถึงรอบ'}
              className="relative rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors focus:ring-2 focus:ring-blue-500"
            >
              <KIcon name="refresh" size={20} />
              {dueCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--rev)] ring-2 ring-[var(--surface)]" aria-hidden="true" />}
            </Link>

            {/* Avatar → ฉัน */}
            <Link
              to="/me"
              aria-label="โปรไฟล์ผู้ใช้งาน"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand-ink)] transition-transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <KIcon name="user" size={18} />
            </Link>
          </div>
        </header>

        {/* Main scrollable content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-5 pb-28 sm:px-6 sm:pt-8 md:pb-10 lg:px-10 xl:px-12 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile primary navigation */}
      <BottomNav />
    </div>
  );
}
