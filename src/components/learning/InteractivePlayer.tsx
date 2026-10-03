import { ArrowLeft, ArrowRight, Sparkles, Target, CheckCircle2 } from 'lucide-react';
import type { InteractiveLesson, InteractiveStep, PlayerState } from '../../interactive/types';
import { canContinue, EMPTY_RESULT } from '../../interactive/engine';
import type { PlayerAction } from '../../interactive/engine';
import { ChoiceQuestion, CodeQuestion, LabQuestion, OrderQuestion, SelfCheck, TypedQuestion } from './Questions';
import { ThemeBanner } from './ThemeBanner';

const TYPE_LABEL: Record<InteractiveStep['type'], string> = {
  concept: 'เข้าใจ',
  example: 'ดูตัวอย่าง',
  think: 'คิด',
  try: 'ลองทำ',
  challenge: 'ภารกิจย่อย',
};

export function EquationCard({ lines, caption, tone = 'plain' }: { lines: string[]; caption?: string; tone?: 'plain' | 'solved' }) {
  return (
    <figure
      className={`rounded-2xl border px-4 py-4 sm:px-6 ${tone === 'solved' ? 'border-emerald-200 bg-emerald-50/60' : 'border-brand-100 bg-brand-50/60'}`}
    >
      <div className="space-y-1">
        {lines.map((l, i) => (
          <p
            key={`${l}-${i}`}
            className={`font-mono break-words ${i === 0 ? 'text-xl font-semibold text-ink sm:text-2xl' : 'text-base text-slate-700 sm:text-lg'}`}
          >
            {l}
          </p>
        ))}
      </div>
      {caption && <figcaption className="mt-2 text-xs font-medium text-slate-500">{caption}</figcaption>}
    </figure>
  );
}

/** Progress as named dots: one per step, then the check. */
export function MissionProgress({ lesson, state, onGo }: { lesson: InteractiveLesson; state: PlayerState; onGo?: (i: number) => void }) {
  return (
    <ol aria-label="ความคืบหน้าในภารกิจ" className="flex items-center gap-1.5">
      {lesson.steps.map((s, i) => {
        const r = state.results[s.id] ?? EMPTY_RESULT;
        const done = s.interaction ? r.solved || r.revealed : i < state.stepIndex;
        const now = i === state.stepIndex;
        const reachable = i <= state.stepIndex || done;
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!onGo || !reachable}
              onClick={() => onGo?.(i)}
              aria-label={`ขั้นที่ ${i + 1}: ${s.title}${done ? ' (ทำแล้ว)' : now ? ' (ตอนนี้)' : ''}`}
              aria-current={now ? 'step' : undefined}
              className="flex h-11 min-w-[22px] items-center justify-center disabled:cursor-default"
            >
              <span
                className={`block h-2.5 rounded-full transition-all ${now ? 'w-7 bg-brand-600' : done ? 'w-2.5 bg-brand-400' : 'w-2.5 bg-slate-200'}`}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface PlayerProps {
  lesson: InteractiveLesson;
  state: PlayerState;
  dispatch: (a: PlayerAction) => void;
  onToCheck: () => void;
}

/** "เรียนกับ V2U" — one step at a time, the learner answers before moving on. */
export function InteractivePlayer({ lesson, state, dispatch, onToCheck }: PlayerProps) {
  const idx = Math.min(state.stepIndex, lesson.steps.length - 1);
  const step = lesson.steps[idx];
  const result = state.results[step.id] ?? EMPTY_RESULT;
  const isLast = idx === lesson.steps.length - 1;
  const ready = canContinue(lesson, state, idx);
  const solvedCount = lesson.steps.filter((s) => !s.interaction || state.results[s.id]?.solved).length;
  const handlers = {
    result,
    onAnswer: (correct: boolean) => dispatch({ type: 'answer', stepId: step.id, correct }),
    onHint: () => dispatch({ type: 'hint', stepId: step.id }),
    onReveal: () => dispatch({ type: 'reveal', stepId: step.id }),
    successTitle: lesson.theme?.kind === 'battle' ? '⚔️ CRITICAL HIT!' : lesson.theme?.kind === 'mission' && step.id === lesson.steps[0].id ? '🔓 ประตูเปิดแล้ว' : undefined,
  };

  return (
    <div className="@container" data-testid="v2u-player">
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-5">
          {/* Mission header */}
          <div className="rounded-3xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-5 text-white sm:p-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-100">
              <Sparkles className="h-4 w-4" /> ภารกิจ
            </p>
            <p className="mt-1 text-xl font-bold sm:text-2xl">{lesson.mission.title}</p>
            <p className="mt-1 text-sm text-white/85 break-words">{lesson.mission.goal}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <MissionProgress lesson={lesson} state={state} onGo={(i) => dispatch({ type: 'go', index: i })} />
              <span className="shrink-0 text-xs text-white/80">
                {idx + 1}/{lesson.steps.length}
              </span>
            </div>
          </div>

          {lesson.theme && <ThemeBanner lesson={lesson} state={state} />}

          {/* Step card */}
          <section key={step.id} aria-labelledby={`step-${step.id}`} className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-5 sm:p-7 animate-in fade-in slide-in-from-right-2 duration-200">
            <p className="text-xs font-semibold text-brand-700">
              ขั้นที่ {idx + 1} · {TYPE_LABEL[step.type]}
            </p>
            <h3 id={`step-${step.id}`} className="mt-0.5 text-lg font-bold text-ink sm:text-xl">
              {step.title}
            </h3>
            {step.body && <p className="mt-2 text-[15px] leading-relaxed text-slate-700 break-words">{step.body}</p>}
            {step.visual && (
              <div className="mt-4">
                <EquationCard lines={step.visual.lines} caption={step.visual.caption} />
              </div>
            )}
            {step.keyIdea && (
              <p className="mt-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 break-words">
                {step.keyIdea}
              </p>
            )}

            {step.interaction && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                {step.interaction.kind === 'choice' && <ChoiceQuestion key={step.id} interaction={step.interaction} {...handlers} />}
                {step.interaction.kind === 'typed' && <TypedQuestion key={step.id} interaction={step.interaction} {...handlers} />}
                {step.interaction.kind === 'order' && <OrderQuestion key={step.id} interaction={step.interaction} {...handlers} />}
                {step.interaction.kind === 'self' && <SelfCheck key={step.id} interaction={step.interaction} {...handlers} />}
                {step.interaction.kind === 'code' && <CodeQuestion key={step.id} interaction={step.interaction} {...handlers} />}
                {step.interaction.kind === 'lab' && <LabQuestion key={step.id} interaction={step.interaction} {...handlers} />}
              </div>
            )}

            {step.afterVisual && (result.solved || result.revealed) && (
              <div className="mt-4 animate-in fade-in duration-300">
                <EquationCard lines={step.afterVisual.lines} caption={step.afterVisual.caption} tone="solved" />
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'go', index: idx - 1 })}
                disabled={idx === 0}
                className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:invisible"
              >
                <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => (isLast ? onToCheck() : dispatch({ type: 'go', index: idx + 1 }))}
                disabled={!ready}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isLast ? 'ไปเช็กความเข้าใจ' : 'ต่อไป'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {!ready && <p className="mt-2 text-right text-xs text-slate-500">ตอบคำถามก่อน แล้วค่อยไปต่อ</p>}
          </section>
        </div>

        {/* Context panel (wide containers only) */}
        <aside aria-label="ภารกิจนี้" className="hidden @3xl:block">
          <div className="sticky top-0 space-y-3 rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Target className="h-4 w-4 text-brand-600" /> ระหว่างทาง
            </p>
            <ol className="space-y-1.5">
              {lesson.steps.map((s, i) => {
                const r = state.results[s.id] ?? EMPTY_RESULT;
                const done = s.interaction ? r.solved || r.revealed : i < state.stepIndex;
                return (
                  <li key={s.id} className={`flex items-start gap-2 text-sm ${i === idx ? 'font-semibold text-ink' : 'text-slate-600'}`}>
                    {done ? (
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${r.revealed && !r.solved ? 'text-amber-500' : 'text-emerald-600'}`} />
                    ) : (
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${i === idx ? 'border-brand-600' : 'border-slate-300'}`} />
                    )}
                    <span className="break-words">{s.title}</span>
                  </li>
                );
              })}
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-dashed border-slate-300" />
                เช็กความเข้าใจ
              </li>
            </ol>
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              ทำได้ด้วยตัวเอง {solvedCount}/{lesson.steps.length} ขั้น
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
