import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Map, 
  BookOpen, 
  Code, 
  Zap, 
  Brain, 
  Target,
  AlertCircle,
  BarChart2,
  Settings,
  GraduationCap,
  X
} from 'lucide-react';

const mainNavItems = [
  { to: '/', icon: Home, label: 'หน้าหลัก' },
  { to: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
  { to: '/roadmap', icon: Map, label: 'แผน 6 เดือน' },
  { to: '/not-understood', icon: AlertCircle, label: 'สิ่งที่ยังไม่เข้าใจ' },
  { to: '/progress', icon: BarChart2, label: 'บันทึกความก้าวหน้า' },
];

const subjectNavItems = [
  { to: '/subjects/math', icon: BookOpen, label: 'คณิตศาสตร์' },
  { to: '/subjects/programming', icon: Code, label: 'Programming' },
  { to: '/subjects/physics', icon: Zap, label: 'ฟิสิกส์' },
  { to: '/subjects/tgat3', icon: Target, label: 'TGAT 3' },
  { to: '/subjects/ai', icon: Brain, label: 'AI / Machine Learning' },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col shadow-2xl">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Study Hub</h1>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide pb-6">
        <div>
           <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">เมนูหลัก</p>
           <div className="space-y-1">
             {mainNavItems.map((item) => (
               <NavLink
                 key={item.to}
                 to={item.to}
                 onClick={onClose}
                 className={({ isActive }) =>
                   `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                     isActive
                       ? 'bg-blue-600/10 text-blue-400 font-bold'
                       : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                   }`
                 }
               >
                 <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${item.to === '/' ? 'text-blue-500' : ''}`} />
                 {item.label}
               </NavLink>
             ))}
           </div>
        </div>

        <div>
           <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">วิชาเรียน</p>
           <div className="space-y-1">
             {subjectNavItems.map((item) => (
               <NavLink
                 key={item.to}
                 to={item.to}
                 onClick={onClose}
                 className={({ isActive }) =>
                   `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                     isActive
                       ? 'bg-blue-600/10 text-blue-400 font-bold'
                       : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                   }`
                 }
               >
                 <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                 {item.label}
               </NavLink>
             ))}
           </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-blue-600/10 text-blue-400 font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`
          }
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
          การตั้งค่า / สำรองข้อมูล
        </NavLink>
      </div>
    </aside>
  );
}
