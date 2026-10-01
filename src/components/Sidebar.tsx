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
  GraduationCap
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'หน้าหลัก' },
  { to: '/calendar', icon: Calendar, label: 'ตารางเรียน' },
  { to: '/roadmap', icon: Map, label: 'แผน 6 เดือน' },
  { to: '/subjects/math', icon: BookOpen, label: 'คณิตศาสตร์' },
  { to: '/subjects/programming', icon: Code, label: 'Programming' },
  { to: '/subjects/physics', icon: Zap, label: 'ฟิสิกส์' },
  { to: '/subjects/tgat3', icon: Target, label: 'TGAT 3' },
  { to: '/subjects/ai', icon: Brain, label: 'AI / Machine Learning' },
  { to: '/not-understood', icon: AlertCircle, label: 'สิ่งที่ยังไม่เข้าใจ' },
  { to: '/progress', icon: BarChart2, label: 'บันทึกความก้าวหน้า' },
  { to: '/settings', icon: Settings, label: 'ตั้งค่า / นำออกข้อมูล' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen hidden md:flex flex-col sticky top-0 overflow-y-auto shadow-xl">
      <div className="p-6 flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Study Hub</h1>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-6">
        <p className="text-xs text-center text-slate-500 italic">"ไม่ต้องเก่งตั้งแต่เริ่ม แค่ไม่หยุดพยายามก็ไปได้ไกลแล้ว"</p>
      </div>
    </aside>
  );
}
