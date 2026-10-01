import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useStore } from '../store/useStore';
import { Search, Bell, UserCircle, Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lessons } = useStore();
  const navigate = useNavigate();

  const completed = lessons.filter(l => l.status === 'COMPLETED').length;
  const total = lessons.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) navigate(`/search?q=${searchQuery}`);
  };

  return (
    <div className="flex h-screen bg-[#F5F8FC] overflow-hidden font-sans text-slate-800">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden bg-slate-900 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-900 text-lg leading-tight">Engineering Study Hub</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">6-Month Roadmap to Computer Engineering / AI</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3">
               <div className="text-right">
                 <p className="text-xs font-bold text-gray-500">Overall Progress</p>
                 <p className="text-sm font-bold text-blue-600">{progress}% <span className="text-gray-400 text-xs font-normal">({completed}/{total})</span></p>
               </div>
               <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 rounded-full" style={{width: `${progress}%`}}></div>
               </div>
            </div>

            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ค้นหา..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-48 pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm outline-none transition-all"
              />
            </form>

            <div className="flex items-center gap-3 border-l border-gray-100 pl-6">
               <button className="text-gray-400 hover:text-blue-600 transition-colors relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
               </button>
               <button className="text-gray-400 hover:text-blue-600 transition-colors">
                 <UserCircle className="w-6 h-6" />
               </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
