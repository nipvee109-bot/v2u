import { useId } from 'react';
import { TIME_BUDGETS } from '../resources/types';
import type { TimeBudgetMinutes } from '../resources/types';

interface TimeBudgetPickerProps {
  value: TimeBudgetMinutes;
  onChange: (minutes: TimeBudgetMinutes) => void;
  label?: string;
}

/** "คุณมีเวลาเท่าไหร่?" — 15 / 30 / 60 / 120 minute selector (touch friendly). */
export function TimeBudgetPicker({ value, onChange, label = 'คุณมีเวลาเท่าไหร่?' }: TimeBudgetPickerProps) {
  const id = useId();
  return (
    <div>
      <p id={id} className="text-sm font-bold text-slate-900">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="mt-2 grid grid-cols-4 gap-1.5">
        {TIME_BUDGETS.map((b) => (
          <button
            key={b.minutes}
            type="button"
            role="radio"
            aria-checked={value === b.minutes}
            onClick={() => onChange(b.minutes)}
            className={`rounded-xl border px-2 py-2 min-h-[44px] text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              value === b.minutes ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
