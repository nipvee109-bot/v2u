import { RowGroup, ScreenHeader } from '../ui';
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
  return <ScreenHeader title={title} subtitle={subtitle} />;
}

export function HubLinkList({ heading, links }: { heading?: string; links: HubLink[] }) {
  return (
    <section className="space-y-3">
      {heading && <h2 className="text-base font-bold text-ink">{heading}</h2>}
      <RowGroup
        label={heading}
        items={links.map((l) => ({ key: `${l.to}|${l.title}`, to: l.to, title: l.title, meta: l.description, icon: l.icon, trailing: l.badge }))}
      />
    </section>
  );
}

export function CountBadge({ count, tone = 'blue' }: { count: number; tone?: 'blue' | 'red' }) {
  if (count <= 0) return null;
  const cls = tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{count}</span>;
}
