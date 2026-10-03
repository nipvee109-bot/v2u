import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV, isPrimaryNavActive } from './primaryNav';
import { NAV_ICON } from './navKeys';
import { KIcon } from '../v2u/kit';

/** Tablet primary navigation (V2U) — inline bar, 768–1023px. Desktop uses DesktopSidebar. */
export function TopNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="เมนูหลัก" className="hidden md:block lg:hidden">
      <ul className="flex items-center gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryNavActive(item, pathname);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:bg-[var(--surface-2)]"
                style={{ background: active ? 'var(--brand-soft)' : undefined, color: active ? 'var(--brand-ink)' : 'var(--ink-2)' }}
              >
                <KIcon name={NAV_ICON[item.to]} size={18} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
