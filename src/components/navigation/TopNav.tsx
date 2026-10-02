import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV, isPrimaryNavActive } from './primaryNav';

/** Tablet primary navigation (V2U) — inline bar, 768–1023px. Desktop uses DesktopSidebar. */
export function TopNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="เมนูหลัก" className="hidden md:block lg:hidden">
      <ul className="flex items-center gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
