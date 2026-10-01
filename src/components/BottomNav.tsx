import { NavLink } from 'react-router-dom';
import { Home, Calendar, Map, BookOpen } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        <NavLink to="/" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <Home className="h-6 w-6" />
          <span className="text-[10px] mt-1">หน้าแรก</span>
        </NavLink>
        <NavLink to="/calendar" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <Calendar className="h-6 w-6" />
          <span className="text-[10px] mt-1">ตารางเรียน</span>
        </NavLink>
        <NavLink to="/roadmap" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <Map className="h-6 w-6" />
          <span className="text-[10px] mt-1">แผน 6 เดือน</span>
        </NavLink>
        <NavLink to="/subjects/math" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <BookOpen className="h-6 w-6" />
          <span className="text-[10px] mt-1">วิชา</span>
        </NavLink>
      </div>
    </nav>
  );
}
