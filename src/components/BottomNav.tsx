import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV, isPrimaryNavActive } from './navigation/primaryNav';

/** Mobile primary navigation (V2U) — 5 items, hidden from md breakpoint up. */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16">
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
