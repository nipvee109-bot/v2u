import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
