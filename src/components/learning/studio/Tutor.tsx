import { useState } from 'react';
import type { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import { Mark } from '../../v2u/kit';
import { DiagramView } from '../Diagrams';
import type { LessonKnowledge } from '../../../content/knowledge';
import type { LearningMode } from '../../../interactive/types';

/* V2U Tutor (Phase 64): a smart senior tutor — short, friendly, explains why.
   Used sparingly: one line per chunk, never a chat stream. */

export function TutorBubble({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'try' }) {
  const bg = tone === 'good' ? 'var(--ok-soft)' : tone === 'try' ? 'var(--rev-soft)' : 'var(--brand-soft)';
  return (
    <div className="flex items-start gap-3" data-testid="tutor">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        <Mark size={32} />
      </span>
      <p className="min-w-0 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] leading-relaxed text-[var(--ink)] break-words" style={{ background: bg }}>
        <span className="sr-only">V2U: </span>
        {children}
      </p>
    </div>
  );
}

export type HelpKind = 'simpler' | 'visual' | 'example' | 'hint' | 'other' | 'back';

const HELP: { kind: HelpKind; label: string }[] = [
  { kind: 'simpler', label: 'อธิบายให้ง่ายกว่านี้' },
  { kind: 'visual', label: 'ดูเป็นภาพ' },
  { kind: 'example', label: 'ดูตัวอย่าง' },
  { kind: 'hint', label: 'ขอคำใบ้' },
  { kind: 'other', label: 'ลองอีกวิธี' },
  { kind: 'back', label: 'กลับไปแนวคิดก่อนหน้า' },
];

interface HelpProps {
  k: LessonKnowledge;
  simple?: string;
  /** Hint text of the current question (undefined when this chunk has none) */
  hint?: string;
  onHint?: () => void;
  onVisual?: () => void;
  onBack?: () => void;
  onModeChange?: (m: LearningMode) => void;
}

/** "ยังงงอยู่?" — help that changes the explanation, never the learner's mastery. */
export function AdaptiveHelp({ k, simple, hint, onHint, onVisual, onBack, onModeChange }: HelpProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HelpKind | null>(null);
  const ex = k.workedExamples[0];
  const diagram = k.diagrams?.[0];
  const pick = (h: HelpKind) => {
    setKind(h);
    if (h === 'hint' && hint) onHint?.();
    if (h === 'back') onBack?.();
  };
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] p-3" data-testid="adaptive-help">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--surface-3)]"
      >
        <Lightbulb className="h-4 w-4" /> ยังงงอยู่? เลือกวิธีช่วยได้
      </button>
      {open && (
        <div className="mt-2">
          <div role="group" aria-label="วิธีช่วยให้เข้าใจ" className="flex flex-wrap gap-2">
            {HELP.map((h) => (
              <button
                key={h.kind}
                type="button"
                aria-pressed={kind === h.kind}
                onClick={() => pick(h.kind)}
                className={`min-h-[44px] rounded-xl border px-3 text-sm font-medium ${kind === h.kind ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]'}`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <div aria-live="polite" className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
            {kind === 'simpler' && <p data-testid="help-simpler">{simple ?? k.analogy ?? k.detailed[0]}</p>}
            {kind === 'visual' &&
              (diagram ? (
                <DiagramView d={diagram} />
              ) : (
                <div>
                  {k.analogy && <p>{k.analogy}</p>}
                  {onVisual && (
                    <button type="button" onClick={onVisual} className="mt-2 min-h-[44px] rounded-xl bg-[var(--brand-soft)] px-3 font-semibold text-[var(--brand-ink)]">
                      ไปที่การทดลองแบบเห็นภาพ
                    </button>
                  )}
                </div>
              ))}
            {kind === 'example' && ex && (
              <div data-testid="help-example">
                <p className="font-semibold">{ex.problem}</p>
                {ex.code && <pre style={{ fontVariantLigatures: "none" }} className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] text-slate-100">{ex.code}</pre>}
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {ex.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="mt-1 font-semibold whitespace-pre-line">คำตอบ: {ex.answer}</p>
              </div>
            )}
            {kind === 'hint' && <p data-testid="help-hint">{hint ?? 'ขั้นนี้ยังไม่มีคำถาม ลองทำตามที่ V2U ชวนไว้ด้านบนได้เลย'}</p>}
            {kind === 'other' && (
              <div className="flex flex-wrap gap-2">
                <p className="w-full">เปลี่ยนวิธีเรียนได้ ความคืบหน้าในบทนี้ยังอยู่ครบ</p>
                <button type="button" onClick={() => onModeChange?.('read')} className="min-h-[44px] rounded-xl border border-[var(--line)] px-3 font-semibold">
                  อ่านบทเรียน
                </button>
                <button type="button" onClick={() => onModeChange?.('video')} className="min-h-[44px] rounded-xl border border-[var(--line)] px-3 font-semibold">
                  ดูคลิป
                </button>
              </div>
            )}
            {kind === 'back' && !onBack && <p>นี่คือแนวคิดแรกของบทแล้ว</p>}
          </div>
        </div>
      )}
    </div>
  );
}
