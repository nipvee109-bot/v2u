import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

export interface HubLink {
  to: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  badge?: ReactNode;
}

/** Shared section-hub header + link list used by เรียน / ทบทวน / เส้นทาง / ฉัน. */
export function HubHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </header>
  );
}

export function HubLinkList({ heading, links }: { heading?: string; links: HubLink[] }) {
  return (
    <section className="mb-6">
      {heading && <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{heading}</h2>}
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.to}>
              <Link
                to={link.to}
                className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 min-h-[64px] shadow-xs transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">{link.title}</span>
                    {link.badge}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{link.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CountBadge({ count, tone = 'blue' }: { count: number; tone?: 'blue' | 'red' }) {
  if (count <= 0) return null;
  const cls = tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{count}</span>;
}
