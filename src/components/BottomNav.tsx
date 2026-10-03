import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV, isPrimaryNavActive } from './navigation/primaryNav';
import { NAV_ICON } from './navigation/navKeys';
import { KIcon } from './v2u/kit';

/** Mobile primary navigation (design reference bottom bar) — 5 items, hidden from md up. */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t"
      style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderColor: 'var(--line)', padding: '6px 4px calc(6px + env(safe-area-inset-bottom))' }}
    >
      <ul className="grid grid-cols-5">
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryNavActive(item, pathname);
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] rounded-xl text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{ minHeight: 54, color: active ? 'var(--brand-ink)' : 'var(--ink-3)' }}
              >
                <span className="flex items-center justify-center rounded-full transition-colors" style={{ width: 52, height: 30, background: active ? 'var(--brand-soft)' : 'transparent' }}>
                  <KIcon name={NAV_ICON[item.to]} size={20} />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
