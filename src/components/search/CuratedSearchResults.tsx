import { Link } from 'react-router-dom';
import { searchCurated, SEARCH_GROUP_LABEL } from '../../search/engine';
import type { SearchGroup } from '../../search/engine';

const ORDER: SearchGroup[] = ['lesson', 'video', 'reading', 'practice'];

/** @ค้นหา — results from V2U's curated registry, grouped; web search kept apart. */
export function CuratedSearchResults({ query }: { query: string }) {
  if (!query.trim()) return null;
  const res = searchCurated(query);
  return (
    <section aria-label="ผลจากเนื้อหาที่ V2U คัดไว้" className="space-y-5">
      <h2 className="text-base font-bold text-ink">จากเนื้อหาที่ V2U คัดไว้ <span className="font-medium text-slate-500">({res.total})</span></h2>
      {res.total === 0 && <p className="text-xs text-slate-500">ไม่พบในเนื้อหาของ V2U</p>}
      {ORDER.filter((g) => res.groups[g].length > 0).map((g) => (
        <div key={g} data-group={g}>
          <h3 className="mb-2 text-xs font-semibold text-slate-500">{SEARCH_GROUP_LABEL[g]} · {res.groups[g].length}</h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            {res.groups[g].slice(0, 8).map((h) => (
              <li key={`${g}-${h.id}`}>
                <Link to={h.href} className="flex min-h-[56px] flex-col justify-center px-4 py-2.5 hover:bg-slate-50">
                  <span className="block text-sm font-semibold text-ink break-words">{h.title}</span>
                  <span className="block text-[11px] text-slate-500 break-words">{h.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3">
        <a href={res.external.href} target="_blank" rel="noopener noreferrer" data-external="true" className="inline-flex min-h-[32px] items-center text-xs font-semibold text-slate-600 underline">
          {res.external.label}
        </a>
      </div>
    </section>
  );
}
