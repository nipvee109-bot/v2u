import { NavLink } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  Map,
  Calculator,
  Code2,
  Atom,
  Brain,
  Cpu,
  HelpCircle,
  TrendingUp,
  Target,
  BookMarked,
  CalendarCheck,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

interface NavItemConfig {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  dot?: string;
}

const mainNav: NavItemConfig[] = [
  { to: '/', icon: LayoutDashboard, label: 'หน้าหลัก', end: true },
  { to: '/planner', icon: Calendar, label: 'ตารางเรียน & แผน' },
  { to: '/weekly-review', icon: CalendarCheck, label: 'สรุปรายสัปดาห์' },
  { to: '/roadmap', icon: Map, label: 'แผน 6 เดือน' },
];

const subjectNav: NavItemConfig[] = [
  { to: '/subjects/math', icon: Calculator, label: 'คณิตศาสตร์', dot: 'bg-blue-400' },
  { to: '/subjects/programming', icon: Code2, label: 'Programming', dot: 'bg-emerald-400' },
  { to: '/subjects/physics', icon: Atom, label: 'ฟิสิกส์', dot: 'bg-orange-400' },
  { to: '/subjects/tgat3', icon: Brain, label: 'TGAT 3', dot: 'bg-purple-400' },
  { to: '/subjects/ai', icon: Cpu, label: 'AI / Machine Learning', dot: 'bg-rose-400' },
];

const learningNav: NavItemConfig[] = [
  { to: '/analytics', icon: BarChart3, label: 'สถิติการเรียนรู้' },
  { to: '/goals', icon: Target, label: 'เป้าหมายการเรียน' },
  { to: '/resources', icon: BookMarked, label: 'คลังแหล่งเรียนรู้' },
  { to: '/not-understood', icon: HelpCircle, label: 'สิ่งที่ยังไม่เข้าใจ' },
  { to: '/progress', icon: TrendingUp, label: 'บันทึกความก้าวหน้า' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </p>
  );
}

function NavItem({ item, onClose }: { item: NavItemConfig; onClose?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[42px] text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {item.dot && (
            <span
              className={`ml-auto h-2 w-2 shrink-0 rounded-full ${item.dot} ${
                isActive ? 'opacity-100 ring-2 ring-white/30' : 'opacity-70 group-hover:opacity-100'
              } transition-opacity`}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-64 flex-col bg-[#0B1120] text-slate-100 select-none"
      aria-label="แถบนำทางหลัก (Main Navigation)"
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">วิศวะต่อ</h1>
            <p className="text-[10px] text-slate-400">Engineering Study Hub</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนูนำทาง"
            className="rounded-xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors md:hidden focus:ring-2 focus:ring-blue-400"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="รายการเมนู">
        {/* Main */}
        <SectionLabel>เมนูหลัก</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.to} item={item} onClose={onClose} />
          ))}
        </div>

        {/* Subjects */}
        <SectionLabel>วิชาเรียน</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {subjectNav.map((item) => (
            <NavItem key={item.to} item={item} onClose={onClose} />
          ))}
        </div>

        {/* Learning */}
        <SectionLabel>การเรียน</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {learningNav.map((item) => (
            <NavItem key={item.to} item={item} onClose={onClose} />
          ))}
        </div>
      </nav>

      {/* Bottom settings */}
      <div className="border-t border-white/10 px-3 py-3">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[42px] text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>การตั้งค่า</span>
        </NavLink>
      </div>
    </aside>
  );
}
