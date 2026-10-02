import { Home, BookOpen, RotateCcw, Map, User } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * V2U primary navigation — exactly 5 destinations.
 * `matches` lists legacy path prefixes that belong to each section so the
 * correct tab stays highlighted on deep links (e.g. /lessons/:id → เรียน).
 */
export interface PrimaryNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  matches: string[];
}

export const PRIMARY_NAV: PrimaryNavItem[] = [
  { to: '/', label: 'หน้าหลัก', icon: Home, matches: [] },
  {
    to: '/learn',
    label: 'เรียน',
    icon: BookOpen,
    matches: ['/learn', '/subjects', '/lessons', '/study', '/study-room', '/resources', '/search', '/dashboard'],
  },
  {
    to: '/review',
    label: 'ทบทวน',
    icon: RotateCcw,
    matches: ['/review', '/review-room', '/not-understood'],
  },
  {
    to: '/route',
    label: 'เส้นทาง',
    icon: Map,
    matches: ['/route', '/roadmap', '/goals', '/planner', '/calendar'],
  },
  {
    to: '/me',
    label: 'ฉัน',
    icon: User,
    matches: ['/me', '/progress', '/analytics', '/weekly-review', '/settings'],
  },
];

export function isPrimaryNavActive(item: PrimaryNavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/';
  return item.matches.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
