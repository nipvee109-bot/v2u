import type { MasteryScore } from '../types';
import { MASTERY_SCALE } from '../types';

interface MasteryBarProps {
  score: MasteryScore;
  showLabel?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MasteryBar({
  score,
  showLabel = true,
  showDescription = false,
  size = 'md',
  className = '',
}: MasteryBarProps) {
  const info = MASTERY_SCALE[score] || MASTERY_SCALE[0];

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const textClass = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold px-1.5 py-0.2 rounded text-[10px] ${info.badgeClass}`}
            >
              ระดับ {score}
            </span>
            <span className={`font-bold ${textClass} text-slate-800`}>
              {info.title}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">
            {score}/4
          </span>
        </div>
      )}

      {/* 5-Segment Indicator Bar (0 to 4) */}
      <div className={`grid grid-cols-4 gap-1 w-full ${heightClass}`}>
        {[1, 2, 3, 4].map((step) => {
          const isFilled = score >= step;
          let segmentBg = 'bg-slate-100';

          if (isFilled) {
            switch (step) {
              case 1:
                segmentBg = 'bg-sky-400';
                break;
              case 2:
                segmentBg = 'bg-amber-400';
                break;
              case 3:
                segmentBg = 'bg-emerald-500';
                break;
              case 4:
                segmentBg = 'bg-purple-600';
                break;
            }
          }

          return (
            <div
              key={step}
              className={`rounded-full transition-all duration-300 ${segmentBg}`}
              title={`ขั้นที่ ${step}: ${MASTERY_SCALE[step as MasteryScore].title}`}
            />
          );
        })}
      </div>

      {showDescription && (
        <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
          {info.shortDescription} &middot; <span className="text-slate-400">{info.criteria}</span>
        </p>
      )}
    </div>
  );
}

export function MasteryBadge({
  score,
  size = 'md',
}: {
  score: MasteryScore;
  size?: 'sm' | 'md';
}) {
  const info = MASTERY_SCALE[score] || MASTERY_SCALE[0];
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border ${sizeClass} ${info.badgeClass}`}
      title={`${info.title} (${info.criteria})`}
    >
      <span className="font-extrabold">{score}/4</span>
      <span>{info.title}</span>
    </span>
  );
}
