import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Clock, ArrowRight } from 'lucide-react';
import { PRIMARY_NAV, isPrimaryNavActive } from './primaryNav';
import { useNextStep } from '../../hooks/useNextStep';
import { useStore } from '../../store/useStore';
import { ProgressBar } from '../ui';

/**
 * Desktop primary navigation (≥1024px): a persistent sidebar with the same
 * 5 destinations, search, and the student's one next step always in view.
 */
export function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const step = useNextStep();
  const { getDueReviewItems } = useStore();
  const { overdue, dueToday } = getDueReviewItems();
  const due = overdue.length + dueToday.length;

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col border-r border-slate-200/70 bg-white">
      <Link to="/" aria-label="V2U เส้นทางสายอาชีพสู่มหาวิทยาลัย — หน้าหลัก" className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm shadow-brand-700/30">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight text-ink">V2U</span>
          <span className="text-[11px] text-slate-500">จากจุดที่คุณอยู่ → สู่มหาวิทยาลัย</span>
        </span>
      </Link>

      <form
        role="search"
        className="px-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          setQ('');
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="ค้นหาบทเรียน คลิป และโจทย์"
            placeholder="ค้นหา…"
            className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </form>

      <nav aria-label="เมนูหลัก" className="mt-4 px-3">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const active = isPrimaryNavActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/review' && due > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{due}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The one next step, visible from every screen */}
      <div className="mt-auto p-4">
        <Link
          to="/"
          className="block rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          <p className="text-[11px] font-semibold text-brand-100">ก้าวต่อไป</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-bold">{step.todayAction}</p>
          {step.minutes !== undefined && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <Clock className="h-3.5 w-3.5" /> {step.minutes} นาที
            </p>
          )}
          <div className="mt-3">
            <ProgressBar value={step.current.progressPercent} tone="onDark" size="sm" label={`ความคืบหน้าในเส้นทาง ${step.current.progressPercent}%`} />
          </div>
          <p className="mt-2 flex items-center justify-between text-[11px] text-white/80">
            <span>เส้นทาง {step.current.progressPercent}%</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </div>
    </aside>
  );
}
