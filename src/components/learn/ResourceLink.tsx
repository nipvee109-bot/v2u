import type { CuratedResource } from '../../resources/types';
import { TYPE_LABEL } from '../../resources/engine';

/** One curated resource with an honest link state. Unchecked links are labelled. */
export function ResourceLink({ r, heading }: { r: CuratedResource; heading?: string }) {
  const checked = r.url && (r.status === 'active' || r.status === 'verified');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
      {heading && <p className="text-[11px] font-bold text-blue-800">{heading}</p>}
      <p className="font-semibold text-slate-900 break-words">{r.title}</p>
      <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
        <span>{r.provider}</span>
        <span>{TYPE_LABEL[r.type]}</span>
        <span>{r.durationKnown === false ? `ราว ${r.estimatedMinutes} นาที (ยังไม่ได้ยืนยันความยาว)` : `${r.estimatedMinutes} นาที`}</span>
        <span>{r.language === 'th' ? 'ภาษาไทย' : 'ภาษาอังกฤษ'}</span>
      </p>
      {checked ? (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-blue-700 underline">
          เปิดแหล่งเรียนรู้
        </a>
      ) : r.candidateUrl ? (
        <p className="mt-1 text-[11px] text-slate-600 break-words">
          <a href={r.candidateUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
            ลองเปิดลิงก์
          </a>{' '}
          <span className="text-amber-700">(ยังไม่ได้ตรวจลิงก์ — พบจากการค้นเว็บ)</span>
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500 break-words">
          หาได้ที่: {r.locator} <span className="text-amber-700">(ยังไม่ได้ตรวจลิงก์)</span>
        </p>
      )}
    </div>
  );
}
