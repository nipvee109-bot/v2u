import type { ChecklistItemStatus } from '../route/types';
import { CHECK_LABEL } from '../admission/engine';

interface ChecklistAnswerControlProps {
  label: string;
  status: ChecklistItemStatus;
  /** null clears the answer back to "ยังไม่ทราบ". */
  onChange: (answer: 'met' | 'gap' | null) => void;
}

const CHIP: Record<ChecklistItemStatus, string> = {
  met: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  gap: 'bg-amber-50 text-amber-800 border-amber-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
};

/** One checklist item: the student answers ผ่าน / ยังขาด; unanswered = ยังไม่ทราบ. */
export function ChecklistAnswerControl({ label, status, onChange }: ChecklistAnswerControlProps) {
  const toggle = (answer: 'met' | 'gap') => onChange(status === answer ? null : answer);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
      <span className="min-w-0 flex-1 text-xs text-slate-800">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CHIP[status]}`}>{CHECK_LABEL[status]}</span>
        {(['met', 'gap'] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={status === a}
            aria-label={`${label}: ${CHECK_LABEL[a]}`}
            onClick={() => toggle(a)}
            className={`rounded-lg border px-2.5 min-h-[36px] text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              status === a
                ? a === 'met'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-amber-500 bg-amber-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {CHECK_LABEL[a]}
          </button>
        ))}
      </span>
    </div>
  );
}
