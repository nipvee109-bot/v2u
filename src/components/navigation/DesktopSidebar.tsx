import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PRIMARY_NAV, isPrimaryNavActive } from './primaryNav';
import { NAV_ICON } from './navKeys';
import { useNextStep, useNextStepParams } from '../../hooks/useNextStep';
import { useStore } from '../../store/useStore';
import { buildNextStepRoute } from '../../utils/nextStep';
import { KIcon, Mark } from '../v2u/kit';

/**
 * Desktop primary navigation (≥1024px) — design reference "V2U App" sidebar:
 * 256px frosted rail, the same 5 destinations, and the destination card
 * (real route requirements as segments + the one next step).
 */
export function DesktopSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const step = useNextStep();
  const route = buildNextStepRoute(useNextStepParams());
  const { getDueReviewItems } = useStore();
  const { overdue, dueToday } = getDueReviewItems();
  const due = overdue.length + dueToday.length;

  return (
    <aside
      className="hidden lg:flex w-64 shrink-0 flex-col gap-6 border-r"
      style={{ padding: '24px 16px', background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderColor: 'var(--line)' }}
    >
      <Link to="/" aria-label="V2U เส้นทางสายอาชีพสู่มหาวิทยาลัย — หน้าหลัก" className="flex items-center gap-3 px-2">
        <Mark size={40} />
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[20px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-.01em' }}>V2U</span>
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Vocational → University</span>
        </span>
      </Link>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          setQ('');
        }}
      >
        <div className="relative">
          <KIcon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="ค้นหาบทเรียน คลิป และโจทย์"
            placeholder="ค้นหา…"
            className="min-h-[44px] w-full rounded-xl pl-9 pr-3 text-sm outline-none focus:ring-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>
      </form>

      <nav aria-label="เมนูหลัก">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isPrimaryNavActive(item, pathname);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl text-[15px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:bg-[var(--surface-2)]"
                  style={{ padding: '0 14px', background: active ? 'var(--brand-soft)' : undefined, color: active ? 'var(--brand-ink)' : 'var(--ink-2)' }}
                >
                  <KIcon name={NAV_ICON[item.to]} size={20} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/review' && due > 0 && (
                    <span className="rounded-full px-2 font-mono text-[11px] font-bold" style={{ background: 'var(--rev-soft)', color: 'var(--rev)', lineHeight: '20px' }}>{due}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ปลายทาง — real route requirements, plus the one next step */}
      <div className="mt-auto rounded-[18px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: 'var(--dest-soft)', color: 'var(--dest-ink)' }}>
            <KIcon name="cap" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--dest-ink)' }}>ปลายทาง</p>
            <p className="truncate text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{step.goal.label}</p>
          </div>
        </div>
        {route && route.steps.length > 0 && (
          <div className="mt-3 flex gap-1" aria-label={`ผ่านแล้ว ${route.completedCount} จาก ${route.steps.length} ขั้น`} role="img">
            {route.steps.map((s) => (
              <span
                key={s.requirement.id}
                className="h-[5px] flex-1 rounded-full"
                style={{ background: s.status === 'done' ? 'var(--brand)' : s.requirement.id === route.currentRequirementId ? 'var(--dest)' : 'var(--surface-3)' }}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] font-semibold" style={{ color: 'var(--ink-3)' }}>ก้าวต่อไป</p>
        <p className="line-clamp-2 text-[13px] font-semibold" style={{ color: 'var(--ink-2)' }}>{step.todayAction}</p>
        <Link
          to={'/route'}
          className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[13px] font-semibold"
          style={{ color: 'var(--brand-ink)' }}
        >
          ดูเส้นทาง <KIcon name="chevR" size={14} />
        </Link>
      </div>
    </aside>
  );
}
