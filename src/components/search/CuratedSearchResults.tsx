import { Link } from 'react-router-dom';
import { searchCurated, SEARCH_GROUP_LABEL } from '../../search/engine';
import type { SearchGroup } from '../../search/engine';

const ORDER: SearchGroup[] = ['lesson', 'video', 'reading', 'practice'];

/** @ค้นหา — results from V2U's curated registry, grouped; web search kept apart. */
export function CuratedSearchResults({ query }: { query: string }) {
  if (!query.trim()) return null;
  const res = searchCurated(query);
  return (
    <section aria-label="ผลจากเนื้อหาที่ V2U คัดไว้" className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
      <h2 className="text-base font-bold text-slate-900">จากเนื้อหาที่ V2U คัดไว้ ({res.total})</h2>
      {res.total === 0 && <p className="text-xs text-slate-500">ไม่พบในเนื้อหาของ V2U</p>}
      {ORDER.filter((g) => res.groups[g].length > 0).map((g) => (
        <div key={g} data-group={g}>
          <h3 className="text-xs font-bold text-slate-700">{SEARCH_GROUP_LABEL[g]} ({res.groups[g].length})</h3>
          <ul className="mt-1 space-y-1">
            {res.groups[g].slice(0, 8).map((h) => (
              <li key={`${g}-${h.id}`}>
                <Link to={h.href} className="block rounded-xl border border-slate-200 p-2.5 hover:border-blue-400">
                  <span className="block text-sm font-semibold text-slate-900 break-words">{h.title}</span>
                  <span className="block text-[11px] text-slate-500 break-words">{h.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="border-t border-dashed border-slate-300 pt-3">
        <a href={res.external.href} target="_blank" rel="noopener noreferrer" data-external="true" className="text-xs font-semibold text-slate-600 underline">
          {res.external.label}
        </a>
      </div>
    </section>
  );
}
