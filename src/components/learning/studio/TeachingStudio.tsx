import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Dispatch } from 'react';
import type { PlayerAction } from '../../../interactive/engine';
import { canContinue, EMPTY_RESULT } from '../../../interactive/engine';
import type { InteractiveLesson, InteractiveStep, LearningMode, PlayerState } from '../../../interactive/types';
import type { StudioChunk, StudioPhase, StudioScript } from '../../../interactive/studio/types';
import { getLessonKnowledge } from '../../../content/knowledge';
import type { KnowledgeDebug, KnowledgePractice, LessonKnowledge } from '../../../content/knowledge';
import { checkPractice, INEQ_OPS, practiceFields } from '../../../interactive/studio/practiceCheck';
import { diagnoseWrong } from '../../../interactive/studio/wrongAnswer';
import { Feedback } from '../Questions';
import { getOriginalLesson } from '../../../content/originals';
import { DiagramView } from '../Diagrams';
import { EquationCard } from '../InteractivePlayer';
import { ChoiceQuestion, CodeQuestion, LabQuestion, OrderQuestion, SelfCheck, TypedQuestion } from '../Questions';
import { AdaptiveHelp, TutorBubble } from './Tutor';
import { BalanceWidget, CartLab, RobotDebug, RobotRun } from './Widgets';

/* "เรียนกับ V2U" as a teaching studio (Phase 64):
   HOOK → EXPLAIN → TRY → OBSERVE → WHY → RETRY → INDEPENDENT → SUMMARY → (existing check).
   Answers go through the existing player reducer with the authored step ids, so evidence,
   the check, mastery and the next step are exactly what they were. Nothing here declares mastery. */

const PHASES: { id: StudioPhase | 'check'; label: string }[] = [
  { id: 'understand', label: 'เข้าใจแนวคิด' },
  { id: 'try', label: 'ลองทำ' },
  { id: 'practice', label: 'ฝึกใช้' },
  { id: 'check', label: 'เช็กความเข้าใจ' },
];

const LOOK: Record<StudioScript['subject'], React.CSSProperties> = {
  // Math: clean puzzle grid · Physics: lab blueprint · Programming: pixel
  math: { backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '28px 28px', backgroundPosition: '-1px -1px' },
  physics: { backgroundImage: 'radial-gradient(var(--line) 1.2px, transparent 1.2px)', backgroundSize: '18px 18px' },
  programming: { backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 7px, var(--line) 7px 8px)', backgroundSize: '100% 8px' },
};

interface SavedStudio { idx: number; done: string[] }
const keyOf = (id: string) => `v2u-studio:${id}`;
function load(id: string): SavedStudio {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(id)) ?? '');
    if (typeof v?.idx === 'number' && Array.isArray(v.done)) return v;
  } catch { /* fresh start */ }
  return { idx: 0, done: [] };
}

const stepHint = (s?: InteractiveStep) => {
  const i = s?.interaction;
  if (!i || i.kind === 'self') return undefined;
  return i.kind === 'lab' ? i.question.hint : i.hint;
};

interface Props {
  script: StudioScript;
  lesson: InteractiveLesson;
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
  onToCheck: () => void;
  onModeChange?: (m: LearningMode) => void;
}

export function TeachingStudio({ script, lesson, state, dispatch, onToCheck, onModeChange }: Props) {
  const k = getLessonKnowledge(script.lessonId) as LessonKnowledge;
  const simple = getOriginalLesson(script.lessonId)?.simple;
  const [saved, setSaved] = useState<SavedStudio>(() => load(script.lessonId));
  useEffect(() => {
    try { localStorage.setItem(keyOf(script.lessonId), JSON.stringify(saved)); } catch { /* private mode */ }
  }, [saved, script.lessonId]);
  const chunks = script.chunks;
  const idx = Math.min(saved.idx, chunks.length - 1);
  const chunk = chunks[idx];
  const isLast = idx === chunks.length - 1;
  const go = (i: number) => {
    setSaved((s) => ({ ...s, idx: Math.max(0, Math.min(chunks.length - 1, i)) }));
    if (typeof window !== 'undefined') document.getElementById('studio-top')?.scrollIntoView?.({ block: 'nearest' });
  };
  const markDone = (id: string) => setSaved((s) => (s.done.includes(id) ? s : { ...s, done: [...s.done, id] }));

  const stepOf = (id?: string) => (id ? lesson.steps.find((s) => s.id === id) : undefined);
  const stepIdOf = (c: StudioChunk) => (c.kind === 'step' || c.kind === 'mistakes' ? c.stepId : c.kind === 'widget' && 'stepId' in c.widget ? c.widget.stepId : undefined);
  const stepReady = (id?: string) => {
    if (!id) return true;
    const i = lesson.steps.findIndex((s) => s.id === id);
    return i < 0 || canContinue(lesson, state, i);
  };
  const chunkReady = (c: StudioChunk) => (c.kind === 'practice' || c.kind === 'debug' ? saved.done.includes(c.id) : c.kind === 'widget' ? saved.done.includes(c.id) || (stepIdOf(c) !== undefined && stepReady(stepIdOf(c))) : stepReady(stepIdOf(c)));
  const ready = chunkReady(chunk);
  const current = stepOf(stepIdOf(chunk));
  const prevExplain = [...chunks.slice(0, idx)].reverse().findIndex((c) => c.kind === 'explain');
  const firstWidget = chunks.findIndex((c) => c.kind === 'widget');
  const phaseIdx = PHASES.findIndex((p) => p.id === chunk.phase);

  return (
    <div className="@container" data-testid="teaching-studio" data-subject={script.subject} id="studio-top">
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0 space-y-4">
          {/* Progress: เข้าใจแนวคิด → ลองทำ → ฝึกใช้ → เช็กความเข้าใจ */}
          <div className="rounded-[22px] v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-4 text-white sm:p-5">
            <p className="text-xs font-semibold text-brand-100">เรียนกับ V2U · {script.principle}</p>
            <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="ความคืบหน้าในบทนี้" data-testid="studio-phases">
              {PHASES.map((p, i) => (
                <li key={p.id} aria-current={i === phaseIdx ? 'step' : undefined} className="min-w-0">
                  <span className={`block h-1.5 rounded-full ${i < phaseIdx ? 'bg-white' : i === phaseIdx ? 'bg-white/80' : 'bg-white/25'}`} />
                  <span className={`mt-1 block truncate text-[11px] sm:text-xs ${i === phaseIdx ? 'font-bold text-white' : 'text-white/75'}`}>
                    {i < phaseIdx && <span className="sr-only">ผ่านแล้ว: </span>}
                    {p.label}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-white/80">ช่วงที่ {idx + 1}/{chunks.length}</p>
          </div>

          <section key={chunk.id} aria-labelledby={`chunk-${chunk.id}`} data-chunk={chunk.id} className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-6 animate-in fade-in duration-200 motion-reduce:animate-none">
            <h3 id={`chunk-${chunk.id}`} className="text-lg font-bold text-ink sm:text-xl break-words">
              {chunkTitle(chunk, current, lesson)}
            </h3>
            <div className="mt-3 flex flex-col gap-4">
              {/* Learning area first on small screens; the tutor's instruction leads on wide ones */}
              <div className="order-1 min-w-0">
                <ChunkBody chunk={chunk} k={k} lesson={lesson} state={state} dispatch={dispatch} subject={script.subject} step={current} onWidgetDone={() => markDone(chunk.id)} />
              </div>
              {'tutor' in chunk && chunk.tutor && (
                <div className="order-2 @3xl:order-first">
                  <TutorBubble>{chunk.tutor}</TutorBubble>
                </div>
              )}
              {chunk.kind !== 'hook' && chunk.kind !== 'summary' && (
                <div className="order-3">
                  <AdaptiveHelp
                    key={chunk.id}
                    k={k}
                    simple={simple}
                    hint={stepHint(current)}
                    onHint={current ? () => dispatch({ type: 'hint', stepId: current.id }) : undefined}
                    onVisual={firstWidget >= 0 && firstWidget !== idx ? () => go(firstWidget) : undefined}
                    onBack={prevExplain >= 0 ? () => go(idx - 1 - prevExplain) : undefined}
                    onModeChange={onModeChange}
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-3)] disabled:invisible">
                <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
              </button>
              <button
                type="button"
                data-testid="studio-next"
                onClick={() => (isLast ? onToCheck() : go(idx + 1))}
                disabled={!ready}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[var(--brand)] px-6 text-sm font-bold text-white shadow-sm hover:bg-[var(--brand-hi)] disabled:bg-[var(--surface-3)] disabled:text-[var(--ink-3)] disabled:shadow-none"
              >
                {isLast ? 'ไปเช็กความเข้าใจ' : chunk.kind === 'hook' ? 'เริ่มเลย' : 'ต่อไป'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {!ready && <p className="mt-2 text-right text-xs text-[var(--ink-3)]">{chunk.kind === 'widget' || chunk.kind === 'practice' || chunk.kind === 'debug' ? 'ลองทำให้ครบก่อน แล้วค่อยไปต่อ' : 'ตอบคำถามก่อน แล้วค่อยไปต่อ'}</p>}
          </section>
        </div>

        <aside aria-label="ช่วงในบทนี้" className="hidden @3xl:block">
          <div className="sticky top-0 rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" style={LOOK[script.subject]}>
            <ol className="space-y-1">
              {chunks.map((c, i) => {
                const done = i < idx;
                const reachable = i <= idx || chunks.slice(0, i).every(chunkReady);
                return (
                  <li key={c.id}>
                    <button type="button" disabled={!reachable} onClick={() => go(i)} aria-current={i === idx ? 'step' : undefined} className={`flex min-h-[36px] w-full items-start gap-2 rounded-lg bg-[var(--surface)]/90 px-1.5 py-1 text-left text-sm disabled:opacity-60 ${i === idx ? 'font-semibold text-ink' : 'text-[var(--ink-2)]'}`}>
                      {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" /> : <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${i === idx ? 'border-brand-600' : 'border-slate-300'}`} />}
                      <span className="break-words">{chunkTitle(c, stepOf(stepIdOf(c)), lesson)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function chunkTitle(c: StudioChunk, step: InteractiveStep | undefined, lesson: InteractiveLesson) {
  switch (c.kind) {
    case 'hook': return lesson.mission.title;
    case 'step': return step?.title ?? c.stepId;
    case 'example': return 'ดูตัวอย่างทีละขั้น';
    case 'summary': return 'สรุปสั้น ๆ';
    default: return c.title;
  }
}

interface BodyProps {
  chunk: StudioChunk;
  k: LessonKnowledge;
  lesson: InteractiveLesson;
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
  subject: StudioScript['subject'];
  step?: InteractiveStep;
  onWidgetDone: () => void;
}

function ChunkBody({ chunk, k, lesson, state, dispatch, subject, step, onWidgetDone }: BodyProps) {
  switch (chunk.kind) {
    case 'hook':
      return (
        <div className="rounded-2xl p-4" style={LOOK[subject]}>
          <p className="rounded-xl bg-[var(--surface)]/95 p-3 text-[15px] leading-relaxed text-[var(--ink)]">{lesson.mission.goal}</p>
          <p className="mt-2 rounded-xl bg-[var(--surface)]/95 p-3 text-sm text-[var(--ink-2)]">{k.whyItMatters}</p>
        </div>
      );
    case 'explain':
      return <ExplainBody chunk={chunk} k={k} />;
    case 'example':
      return <ExampleBody k={k} id={chunk.exampleId} />;
    case 'summary':
      return (
        <ul className="space-y-2" data-testid="studio-summary">
          {k.summary.map((s) => (
            <li key={s} className="flex gap-2 text-[15px] leading-relaxed"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--ok)]" /><span>{s}</span></li>
          ))}
          <li className="pt-2 text-sm text-[var(--ink-2)]">ต่อไปคือเช็กความเข้าใจสั้น ๆ — ผลจากตรงนั้นจะบอกว่าควรทบทวนอะไร</li>
        </ul>
      );
    case 'practice':
      return <PracticeBody key={chunk.id} items={chunk.practiceIds.map((id) => [...k.guided, ...k.independent].find((p) => p.id === id)).filter((p): p is KnowledgePractice => !!p)} code={subject === 'programming'} onDone={onWidgetDone} />;
    case 'debug': {
      const d = k.debugging?.find((x) => x.id === chunk.debugId);
      return d ? <DebugBody key={chunk.id} d={d} onDone={onWidgetDone} /> : null;
    }
    case 'mistakes':
      return (
        <div className="space-y-3">
          <ul className="space-y-2">
            {k.mistakes.map((m) => (
              <li key={m.mistake} className="rounded-2xl border border-[var(--line)] p-3 text-sm">
                <p className="font-semibold text-[var(--ink)]">✗ {m.mistake}</p>
                <p className="mt-1 text-[var(--ink-2)]"><b>ทำไมถึงพลาด:</b> {m.why}</p>
                <p className="mt-1 text-[var(--ink-2)]"><b>แก้ยังไง:</b> {m.fix}</p>
              </li>
            ))}
          </ul>
          {step && <StepBody step={step} state={state} dispatch={dispatch} />}
        </div>
      );
    case 'step':
      return step ? <StepBody step={step} state={state} dispatch={dispatch} /> : null;
    case 'widget': {
      const w = chunk.widget;
      if (w.kind === 'balance') {
        const s = lesson.steps.find((x) => x.id === w.stepId);
        const r = state.results[w.stepId] ?? EMPTY_RESULT;
        return <BalanceWidget equation={s?.visual?.lines[0] ?? ''} solved={r.solved || r.revealed} onSolved={() => { dispatch({ type: 'answer', stepId: w.stepId, correct: true }); onWidgetDone(); }} />;
      }
      if (w.kind === 'cart-lab') {
        const s = lesson.steps.find((x) => x.id === w.stepId);
        if (s?.interaction?.kind !== 'lab') return null;
        return <CartLab lab={s.interaction} vary={w.vary} result={state.results[w.stepId] ?? EMPTY_RESULT} onAnswer={(c) => dispatch({ type: 'answer', stepId: w.stepId, correct: c })} />;
      }
      if (w.kind === 'robot-run') {
        const code = w.codeFrom.exampleId ? k.workedExamples.find((e) => e.id === w.codeFrom.exampleId)?.code : [...k.guided, ...k.independent].find((p) => p.id === w.codeFrom.practiceId)?.code;
        return code ? <RobotRun code={code} values={w.values} onDone={onWidgetDone} /> : null;
      }
      const p = [...k.guided, ...k.independent].find((x) => x.id === w.practiceId);
      return p?.code ? <RobotDebug code={p.code} explanation={p.explanation} onDone={onWidgetDone} /> : null;
    }
  }
}

function ExplainBody({ chunk, k }: { chunk: Extract<StudioChunk, { kind: 'explain' }>; k: LessonKnowledge }) {
  const concepts = k.concepts.filter((c) => chunk.concepts?.includes(c.id));
  const rules = k.rules.filter((r) => chunk.rules?.includes(r.id));
  const diagram = k.diagrams?.find((d) => d.id === chunk.diagram);
  return (
    <div className="space-y-3">
      {concepts.map((c) => (
        <p key={c.id} className="text-[15px] leading-relaxed"><b className="text-ink">{c.term}</b> — {c.meaning}</p>
      ))}
      {chunk.analogy && k.analogy && <p className="rounded-2xl bg-[var(--rev-soft)] px-4 py-3 text-sm">{k.analogy}</p>}
      {rules.map((r) => (
        <div key={r.id} className="rounded-2xl border border-[var(--brand-soft)] bg-[var(--brand-soft)]/50 px-4 py-3">
          <p className="text-xs font-semibold text-[var(--brand-ink)]">{r.name}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-ink break-words whitespace-pre-line">{r.statement}</p>
          {r.notation && <p className="mt-1 text-xs text-[var(--ink-2)]">{r.notation}</p>}
        </div>
      ))}
      {chunk.detailed?.map((i) => k.detailed[i] && <p key={i} className="text-sm leading-relaxed text-[var(--ink-2)]">{k.detailed[i]}</p>)}
      {diagram && <DiagramView d={diagram} />}
    </div>
  );
}

function ExampleBody({ k, id }: { k: LessonKnowledge; id: string }) {
  const e = k.workedExamples.find((x) => x.id === id);
  const [shown, setShown] = useState(0);
  if (!e) return null;
  const all = shown >= e.steps.length;
  return (
    <div data-testid="studio-example">
      <p className="text-[15px] font-semibold text-ink break-words">{e.problem}</p>
      {e.code && <pre style={{ fontVariantLigatures: "none" }} className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] text-slate-100">{e.code}</pre>}
      <ol className="mt-3 space-y-2" aria-live="polite">
        {e.steps.slice(0, shown).map((s, i) => (
          <li key={s} className="flex gap-2 text-[15px] leading-relaxed animate-in fade-in duration-200 motion-reduce:animate-none">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-ink)]">{i + 1}</span>
            <span className="break-words">{s}</span>
          </li>
        ))}
      </ol>
      {all ? (
        <p className="mt-3 rounded-xl bg-[var(--ok-soft)] px-3 py-2 font-semibold whitespace-pre-line">คำตอบ: {e.answer}</p>
      ) : (
        <button type="button" onClick={() => setShown((n) => n + 1)} className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold hover:bg-[var(--surface-3)]">
          {shown === 0 ? 'เริ่มดูขั้นแรก' : 'ดูขั้นต่อไป'} ({shown}/{e.steps.length})
        </button>
      )}
    </div>
  );
}

function StepBody({ step, state, dispatch }: { step: InteractiveStep; state: PlayerState; dispatch: Dispatch<PlayerAction> }) {
  const result = state.results[step.id] ?? EMPTY_RESULT;
  const handlers = {
    result,
    onAnswer: (correct: boolean) => dispatch({ type: 'answer', stepId: step.id, correct }),
    onHint: () => dispatch({ type: 'hint', stepId: step.id }),
    onReveal: () => dispatch({ type: 'reveal', stepId: step.id }),
  };
  const i = step.interaction;
  return (
    <div data-testid={`studio-step-${step.id}`}>
      {step.body && <p className="text-[15px] leading-relaxed text-[var(--ink-2)] break-words">{step.body}</p>}
      {step.visual && <div className="mt-3"><EquationCard lines={step.visual.lines} caption={step.visual.caption} /></div>}
      {step.keyIdea && <p className="mt-3 rounded-2xl border-l-4 border-[var(--rev)] bg-[var(--rev-soft)] px-4 py-3 text-sm font-medium break-words">{step.keyIdea}</p>}
      {i && (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          {i.kind === 'choice' && <ChoiceQuestion key={step.id} interaction={i} {...handlers} />}
          {i.kind === 'typed' && <TypedQuestion key={step.id} interaction={i} {...handlers} />}
          {i.kind === 'order' && <OrderQuestion key={step.id} interaction={i} {...handlers} />}
          {i.kind === 'self' && <SelfCheck key={step.id} interaction={i} {...handlers} />}
          {i.kind === 'code' && <CodeQuestion key={step.id} interaction={i} {...handlers} />}
          {i.kind === 'lab' && <LabQuestion key={step.id} interaction={i} {...handlers} />}
        </div>
      )}
      {step.afterVisual && (result.solved || result.revealed) && <div className="mt-3"><EquationCard lines={step.afterVisual.lines} caption={step.afterVisual.caption} tone="solved" /></div>}
    </div>
  );
}

const CODE_STYLE = { fontVariantLigatures: 'none' } as const;
const SMALL_BTN = 'inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold';

function PracticeBody({ items, code, onDone }: { items: KnowledgePractice[]; code: boolean; onDone: () => void }) {
  const [settled, setSettled] = useState<string[]>([]);
  const settle = (id: string) =>
    setSettled((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id];
      if (next.length >= items.length) onDone();
      return next;
    });
  return (
    <div className="space-y-4" data-testid="studio-practice">
      <p className="text-xs text-[var(--ink-3)]">ทำแล้ว {settled.length}/{items.length} ข้อ · การฝึกตรงนี้ไม่นับเป็นคะแนน</p>
      {items.map((p, i) => (
        <PracticeItem key={p.id} p={p} n={i + 1} code={code} onSettled={() => settle(p.id)} />
      ))}
    </div>
  );
}

function PracticeItem({ p, n, code, onSettled }: { p: KnowledgePractice; n: number; code: boolean; onSettled: () => void }) {
  const fields = practiceFields(p);
  const [input, setInput] = useState<Record<string, string>>(() => (fields.some((f) => f.kind === 'op') ? { op: '<' } : {}) as Record<string, string>);
  const [wrong, setWrong] = useState(0);
  const [state, setState] = useState<'open' | 'correct' | 'revealed'>('open');
  const [hint, setHint] = useState(false);
  const [diag, setDiag] = useState<string | undefined>();
  const done = state !== 'open';
  const submit = () => {
    const v = checkPractice(p, input);
    if (v === 'correct') { setState('correct'); onSettled(); }
    else { setWrong((w) => w + 1); setHint(true); setDiag(diagnoseWrong(p, input)); }
  };
  const reveal = () => { setState('revealed'); onSettled(); };
  const fid = (k: string) => `pr-${p.id}-${k}`;
  return (
    <article className="rounded-2xl border border-[var(--line)] p-4" data-testid="practice-item" data-practice={p.id} data-state={state}>
      <p className="text-xs font-semibold text-[var(--brand-ink)]">ข้อ {n} · ระดับ {p.level}</p>
      <p className="mt-1 text-[15px] font-semibold text-ink break-words">{p.prompt}</p>
      {p.code && <pre style={CODE_STYLE} className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] text-slate-100">{p.code}</pre>}
      {fields.length > 0 && !done && (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {fields.map((f) =>
            f.kind === 'op' ? (
              <label key={f.key} className="text-sm">
                <span className="block text-[var(--ink-2)]">เครื่องหมาย</span>
                <select id={fid(f.key)} value={input.op} onChange={(e) => setInput((s) => ({ ...s, op: e.target.value }))} className="mt-1 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono">
                  {INEQ_OPS.map((o) => <option key={o} value={o}>x {o}</option>)}
                </select>
              </label>
            ) : f.kind === 'text' ? (
              <label key={f.key} className="w-full text-sm">
                <span className="block text-[var(--ink-2)]">{f.label} (หลายบรรทัดได้)</span>
                <textarea id={fid(f.key)} rows={2} value={input[f.key] ?? ''} onChange={(e) => setInput((s) => ({ ...s, [f.key]: e.target.value }))} className="mt-1 min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono" style={CODE_STYLE} />
              </label>
            ) : (
              <label key={f.key} className="text-sm">
                <span className="block font-mono text-[var(--ink-2)]">{f.label}</span>
                <input id={fid(f.key)} inputMode="decimal" value={input[f.key] ?? ''} onChange={(e) => setInput((s) => ({ ...s, [f.key]: e.target.value }))} className="mt-1 min-h-[44px] w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono" />
              </label>
            ),
          )}
          <button type="submit" className={`${SMALL_BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-hi)]`}>ตรวจคำตอบ</button>
        </form>
      )}
      {!done && (
        <div className="mt-2 flex flex-wrap gap-2">
          {p.hint && !hint && <button type="button" onClick={() => setHint(true)} className={`${SMALL_BTN} border border-[var(--line)]`}>ขอคำใบ้</button>}
          {(fields.length === 0 || wrong >= 2) && <button type="button" onClick={reveal} className={`${SMALL_BTN} border border-[var(--line)]`}>{code ? 'ดูผลลัพธ์และเหตุผล' : 'ดูเฉลยและเหตุผล'}</button>}
        </div>
      )}
      {!done && wrong > 0 && (
        <Feedback tone="try" title="เกือบถูกแล้ว — ลองดูอีกที">
          {diag && <span className="mb-1 block font-semibold" data-testid="practice-diagnosis">{diag}</span>}
          {p.hint ?? 'ย้อนดูหลักในบทนี้ แล้วทำทีละขั้น'}
          {wrong >= 2 && <span className="block mt-1">ถ้ายังติด เปิดดูเฉลยพร้อมเหตุผลได้ ไม่เสียคะแนน</span>}
        </Feedback>
      )}
      {!done && wrong === 0 && hint && p.hint && <p className="mt-2 rounded-xl bg-[var(--rev-soft)] px-3 py-2 text-sm">คำใบ้: {p.hint}</p>}
      {done && (
        <Feedback tone={state === 'correct' ? 'good' : 'try'} title={state === 'correct' ? 'ถูกต้อง' : 'เฉลย'}>
          <span className="block font-mono whitespace-pre-line">{p.answer}</span>
          <span className="mt-1 block">{p.explanation}</span>
        </Feedback>
      )}
    </article>
  );
}

function DebugBody({ d, onDone }: { d: KnowledgeDebug; onDone: () => void }) {
  const [stage, setStage] = useState(0);
  return (
    <div className="space-y-3" data-testid="studio-debug">
      <pre style={CODE_STYLE} className="overflow-x-auto rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] text-slate-100" aria-label="โค้ดที่มีปัญหา">{d.buggy}</pre>
      {stage === 0 && <button type="button" onClick={() => setStage(1)} className={`${SMALL_BTN} bg-[var(--brand)] text-white`}>Run — ดูว่าเกิดอะไรขึ้น</button>}
      {stage >= 1 && (
        <div className="rounded-xl border border-[var(--err)] bg-[var(--surface-3)] px-3 py-2 font-mono text-sm" role="status">
          <span className="text-[var(--ink-3)]">ผลที่ได้ &gt; </span>{d.symptom}
        </div>
      )}
      {stage === 1 && (
        <>
          <p className="text-sm text-[var(--ink-2)]">ลองคิดก่อน: บรรทัดไหนทำให้เกิดผลนี้ และควรแก้ยังไง?</p>
          <button type="button" onClick={() => { setStage(2); onDone(); }} className={`${SMALL_BTN} border border-[var(--line)]`}>ดูวิธีแก้</button>
        </>
      )}
      {stage >= 2 && (
        <>
          <pre style={CODE_STYLE} className="overflow-x-auto rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] text-slate-100" aria-label="โค้ดที่แก้แล้ว">{d.fixed}</pre>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-3)] px-3 py-2 font-mono text-sm whitespace-pre-line"><span className="text-[var(--ink-3)]">ผลลัพธ์ &gt; </span>{d.output}</div>
          <Feedback tone="good" title="ทำไมถึงแก้แบบนี้">{d.explanation}</Feedback>
        </>
      )}
    </div>
  );
}
