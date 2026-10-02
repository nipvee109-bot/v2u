import { useId, useState } from 'react';
import { HORIZON_PRESET_MONTHS, MAX_HORIZON_MONTHS, MIN_HORIZON_MONTHS } from '../route/types';
import type { PlanningHorizon } from '../route/types';

interface HorizonPickerProps {
  /** undefined = the student has not chosen yet */
  value?: PlanningHorizon;
  onChange: (h: PlanningHorizon) => void;
}

/** "อยากไปถึงเป้าหมายภายในกี่เดือน?" — presets plus a custom number of months. */
export function HorizonPicker({ value, onChange }: HorizonPickerProps) {
  const id = useId();
  const isCustom = value ? !value.preset : false;
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [draft, setDraft] = useState(value && !value.preset ? String(value.months) : '');
  const [error, setError] = useState<string | null>(null);

  const commitCustom = () => {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < MIN_HORIZON_MONTHS || n > MAX_HORIZON_MONTHS) {
      setError(`ใส่จำนวนเดือน ${MIN_HORIZON_MONTHS}–${MAX_HORIZON_MONTHS}`);
      return;
    }
    setError(null);
    onChange({ months: n, preset: false });
  };

  const btn = (active: boolean) =>
    `rounded-xl border px-2 py-2 min-h-[44px] text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  return (
    <div>
      <p id={id} className="text-sm font-bold text-slate-900">
        อยากไปถึงเป้าหมายภายในกี่เดือน?
      </p>
      <div role="radiogroup" aria-labelledby={id} className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {HORIZON_PRESET_MONTHS.map((m) => {
          const active = !!value && value.preset && value.months === m && !customOpen;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setCustomOpen(false);
                setError(null);
                onChange({ months: m, preset: true });
              }}
              className={btn(active)}
            >
              {m} เดือน
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={customOpen || isCustom}
          onClick={() => setCustomOpen(true)}
          className={btn(customOpen || isCustom)}
        >
          กำหนดเอง
        </button>
      </div>
      {(customOpen || isCustom) && (
        <div className="mt-2 flex items-center gap-2">
          <label htmlFor={`${id}-custom`} className="text-xs font-semibold text-slate-600">
            จำนวนเดือน
          </label>
          <input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={MIN_HORIZON_MONTHS}
            max={MAX_HORIZON_MONTHS}
            step={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => e.key === 'Enter' && commitCustom()}
            aria-invalid={error ? true : undefined}
            className="w-24 rounded-xl border border-slate-300 px-3 py-2 min-h-[44px] text-sm text-slate-900"
          />
          {error && (
            <span role="alert" className="text-xs text-red-600">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
