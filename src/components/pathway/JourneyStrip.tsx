import { Check, GraduationCap } from 'lucide-react';
import type { StudentRoute } from '../../route/types';
import { VOCATIONAL_PROGRAMS } from '../../route/data';

/**
 * Journey visual (design reference): start → each real route requirement → destination.
 * Every node comes from the existing route (buildStudentRoute); nothing is invented.
 */
export function JourneyStrip({ route, onDark = false }: { route: StudentRoute; onDark?: boolean }) {
  const program = VOCATIONAL_PROGRAMS.find((p) => p.id === route.profile.programId)?.title ?? 'สายอาชีพ';
  const nodes = [
    { id: 'start', label: route.profile.educationLevel, sub: 'จุดเริ่มต้น', state: 'done' as const },
    ...route.steps.map((s) => ({
      id: s.requirement.id,
      label: s.requirement.title,
      sub: s.requirement.id === route.currentRequirementId ? 'คุณอยู่ที่นี่' : s.status === 'done' ? 'ผ่านแล้ว' : s.status === 'locked' ? 'รอขั้นก่อนหน้า' : s.status === 'in-progress' ? 'กำลังทำ' : 'ยังไม่เริ่ม',
      state: s.requirement.id === route.currentRequirementId ? ('now' as const) : s.status === 'done' ? ('done' as const) : ('next' as const),
    })),
    { id: 'dest', label: route.target.title, sub: 'ปลายทาง', state: 'dest' as const },
  ];
  const t = onDark
    ? { line: 'bg-white/80', dash: 'border-white/30', label: 'text-white', sub: 'text-[#c9d1ff]', done: 'bg-white text-[#16207a]', now: 'bg-[#8fa0ff] border-[3px] border-white [animation:v2uPulse_2s_ease-in-out_infinite]', next: 'border-2 border-dashed border-white/45 bg-transparent' }
    : { line: 'bg-brand-600', dash: 'border-ink/20', label: 'text-ink', sub: 'text-ink-3', done: 'bg-brand-600 text-white', now: 'bg-white ring-4 ring-brand-200 border-2 border-brand-600', next: 'border-2 border-ink/20 bg-white' };
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1" data-testid="journey-strip">
      <ol aria-label={`เส้นทางจาก ${route.profile.educationLevel} ${program} สู่ ${route.target.title}`} className="flex min-w-[560px] items-start">
        {nodes.map((n, i) => {
          const passed = n.state === 'done';
          return (
            <li key={n.id} className="relative flex flex-1 flex-col items-center text-center" aria-current={n.state === 'now' ? 'step' : undefined}>
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-3 -z-0 w-full ${passed || n.state === 'now' ? `h-0.5 ${t.line}` : `border-t-2 border-dashed ${t.dash}`}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                  n.state === 'dest' ? (onDark ? 'rounded-lg bg-[#f5c04d] text-[#0b1135]' : 'bg-dest text-navy') : n.state === 'done' ? t.done : n.state === 'now' ? t.now : t.next
                }`}
                aria-hidden="true"
              >
                {n.state === 'dest' ? <GraduationCap className="h-3.5 w-3.5" /> : n.state === 'done' ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className={`mt-2 px-1 text-[11px] font-semibold leading-tight ${t.label}`}>{n.label}</span>
              <span className={`text-[10px] leading-tight ${t.sub}`}>{n.sub}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
