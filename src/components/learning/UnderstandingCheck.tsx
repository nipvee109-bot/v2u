import { useMemo } from 'react';
import { KIcon } from '../v2u/kit';
import { CodeBlock } from './SubjectBlocks';
import type { InteractiveLesson, PlayerState, UnderstandingSummary } from '../../interactive/types';
import { checkChoice, summarize } from '../../interactive/engine';
import type { PlayerAction } from '../../interactive/engine';
import type { LearningMode } from '../../interactive/types';
import { MODE_META } from './meta';

interface CheckProps {
  lesson: InteractiveLesson;
  state: PlayerState;
  dispatch: (a: PlayerAction) => void;
  onSubmit: (summary: UnderstandingSummary) => void;
  /** Where the learner came from, so they can go back without losing anything */
  onBack?: () => void;
}

/** "เช็กความเข้าใจ" (design: Understanding check) — the same check after reading, watching or learning with V2U. */
export function UnderstandingCheck({ lesson, state, dispatch, onSubmit, onBack }: CheckProps) {
  const allAnswered = lesson.finalCheck.every((f) => state.finalAnswers[f.id] !== undefined);
  const card = { padding: 'clamp(18px,2.2vw,28px)', borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow)' } as const;
  return (
    <section aria-labelledby="final-check" className="mx-auto flex w-full max-w-[720px] flex-col gap-[18px]" data-testid="final-check">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ letterSpacing: '.06em', color: 'var(--brand-ink)' }}><KIcon name="quiz" size={16} /> ก่อนไปต่อ</span>
        <h3 id="final-check" className="font-display text-[22px] font-bold" style={{ color: 'var(--ink)' }}>เช็กความเข้าใจ</h3>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
          ไม่ใช่การสอบ ตอบตามที่คิดจริง — {lesson.finalCheck.length} ข้อสั้น ๆ V2U ใช้ผลนี้ตัดสินว่าเข้าใจจริงไหม ไม่ใช่แค่เปิดดูหรือดูคลิปจบ
        </p>
      </div>

      {lesson.finalCheck.map((f, n) => {
        const picked = state.finalAnswers[f.id];
        const ok = state.finished && checkChoice(f, picked ?? -1);
        return (
          <fieldset key={f.id} className="flex flex-col gap-3.5" style={{ ...card, border: `1px solid ${state.finished ? (ok ? 'var(--ok)' : 'var(--rev)') : picked !== undefined ? 'var(--brand)' : 'var(--line)'}` }}>
            <legend className="sr-only">ข้อ {n + 1}</legend>
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] font-mono text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>{String(n + 1).padStart(2, '0')}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>ข้อ {n + 1}</span>
            </div>
            <p className="font-display font-semibold leading-snug break-words" style={{ fontSize: 'clamp(18px,1vw + 14px,22px)', color: 'var(--ink)' }}>{f.prompt}</p>
            {f.code && <CodeBlock code={f.code} />}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
              {f.choices.map((c, k) => {
                const chosen = picked === k;
                const showRight = state.finished && k === f.correctIndex;
                const showWrong = state.finished && chosen && k !== f.correctIndex;
                const bd = showRight ? 'var(--ok)' : showWrong ? 'var(--rev)' : chosen ? 'var(--brand)' : 'var(--line-2)';
                const bg = showRight ? 'var(--ok-soft)' : showWrong ? 'var(--rev-soft)' : chosen ? 'var(--brand-soft)' : 'var(--surface)';
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={state.finished}
                    aria-pressed={chosen}
                    onClick={() => dispatch({ type: 'final', itemId: f.id, choice: k })}
                    className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] py-1.5 pl-2 pr-3.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
                    style={{ border: `1.5px solid ${bd}`, background: bg, color: 'var(--ink)' }}
                  >
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] font-mono text-[13px] font-semibold" style={{ background: chosen || showRight ? bd : 'var(--surface-3)', color: chosen || showRight ? '#fff' : 'var(--ink-2)' }}>
                      {showRight ? <KIcon name="check" size={14} w={2.6} /> : showWrong ? <KIcon name="x" size={14} w={2.6} /> : 'ABCDEF'[k]}
                    </span>
                    <span className="break-words">{c}</span>
                  </button>
                );
              })}
            </div>
            {state.finished && (
              <p className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm break-words" style={{ background: ok ? 'var(--ok-soft)' : 'var(--rev-soft)', color: 'var(--ink)' }}>
                <span style={{ color: ok ? 'var(--ok)' : 'var(--rev)', marginTop: 2 }}><KIcon name={ok ? 'sOk' : 'sRev'} size={16} /></span>
                {f.explanation}
              </p>
            )}
            {state.finished && !ok && f.misconceptions?.find((m) => m.choice === picked) && (
              <p className="mt-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm break-words" data-testid="check-misconception">
                <b>จุดที่มักพลาด:</b> {f.misconceptions.find((m) => m.choice === picked)!.mistake}
                <span className="mt-1 block text-[var(--ink-2)]">แก้ยังไง: {f.misconceptions.find((m) => m.choice === picked)!.fix}</span>
              </p>
            )}
          </fieldset>
        );
      })}

      {!state.finished && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="inline-flex min-h-[48px] items-center gap-1 rounded-xl px-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
              <KIcon name="chevL" size={16} /> กลับไปเรียนต่อ
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!allAnswered}
            onClick={() => {
              dispatch({ type: 'finish' });
              onSubmit(summarize(lesson, { ...state, finished: true }));
            }}
            className="inline-flex h-[50px] items-center gap-2 rounded-[14px] px-6 font-bold disabled:cursor-not-allowed"
            style={{ background: allAnswered ? 'var(--brand)' : 'var(--surface-3)', color: allAnswered ? 'var(--on-brand)' : 'var(--ink-3)' }}
          >
            ส่งคำตอบ <KIcon name="arrowR" size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

interface DoneProps {
  lesson: InteractiveLesson;
  state: PlayerState;
  onReviewWeak: () => void;
  onNext: () => void;
  nextLabel: string;
  /** What the learner did today and what still needs work (notes + check). */
  recap?: { done: string[]; weak: string[] };
  /** Phase 56: other ways to learn this when the check shows it didn't land */
  alternatives?: { mode: LearningMode; reason: string }[];
  onTryMode?: (m: LearningMode) => void;
}

/** Completion: what is understood, what can be done, what to review — then the next step. */
export function LessonCompletion({ lesson, state, onReviewWeak, onNext, nextLabel, recap, alternatives = [], onTryMode }: DoneProps) {
  const s = useMemo(() => summarize(lesson, state), [lesson, state]);
  const passed = s.score >= 70 && s.confused.length === 0;
  return (
    <section aria-labelledby="lesson-done" className="space-y-4" data-testid="lesson-complete">
      <div className="rounded-[22px] p-6 text-center sm:p-8" style={{ background: passed ? 'var(--ok-soft)' : 'var(--surface)', border: '1px solid var(--line)' }}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: passed ? 'var(--ok)' : 'var(--rev-soft)', color: passed ? '#fff' : 'var(--rev)' }}>
          <KIcon name={passed ? 'check' : 'sRev'} size={26} w={2.4} />
        </span>
        <h3 id="lesson-done" className="mt-3 font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
          {passed ? 'เรียบร้อย' : 'ใกล้แล้ว'}
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {passed ? `คุณผ่านภารกิจ “${lesson.mission.title}” แล้ว` : 'ยังมีบางจุดที่ควรทบทวนก่อนไปบทถัดไป'} · เช็กความเข้าใจได้ {s.score}%
        </p>
      </div>

      {(() => {
        // Phase 66: misconceptions behind the wrong choices actually picked (from the lesson's own mistakes)
        const seen = lesson.finalCheck
          .map((f) => f.misconceptions?.find((m) => m.choice === state.finalAnswers[f.id] && m.choice !== f.correctIndex))
          .filter((m): m is NonNullable<typeof m> => !!m)
          .filter((m, i, all) => all.findIndex((x) => x.mistake === m.mistake) === i);
        return seen.length > 0 ? (
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" data-testid="completion-misconceptions">
            <p className="text-sm font-bold text-[var(--rev)]">จุดที่อาจพลาดจากคำตอบของคุณ</p>
            <ul className="mt-2 space-y-2 text-sm">
              {seen.map((m) => (
                <li key={m.mistake} data-testid="check-misconception" className="break-words">
                  <b>{m.mistake}</b>
                  <span className="block text-[var(--ink-2)]">แก้ยังไง: {m.fix}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      })()}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm font-bold text-[var(--ok)]">✓ สิ่งที่เข้าใจ</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-2)]">
            {s.understood.length ? s.understood.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-[var(--ink-3)]">ยังไม่มี — ลองทบทวนแล้วเช็กใหม่</li>}
          </ul>
        </div>
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm font-bold text-[var(--ok)]">✓ สิ่งที่ทำได้</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-2)]">
            {s.canDo.length ? s.canDo.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-[var(--ink-3)]">จะนับเมื่อเช็กถูกครบทุกข้อ</li>}
          </ul>
        </div>
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm font-bold text-[var(--rev)]">△ ควรทบทวน</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-2)]">
            {s.review.length ? s.review.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-[var(--ink-3)]">ไม่มี</li>}
          </ul>
        </div>
      </div>

      {recap && (
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] text-sm" data-testid="session-recap">
          <p className="font-bold text-ink">วันนี้คุณเรียน:</p>
          <ul className="mt-1.5 space-y-0.5 text-[var(--ink-2)]">
            {recap.done.map((d) => (
              <li key={d}>✓ {d}</li>
            ))}
          </ul>
          {recap.weak.length > 0 && (
            <>
              <p className="mt-3 font-bold text-[var(--rev)]">แต่ยังมีจุดที่ควรทบทวน:</p>
              <ul className="mt-1 space-y-0.5 text-[var(--ink)]">
                {recap.weak.map((w) => (
                  <li key={w} className="break-words">△ {w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {alternatives.length > 0 && onTryMode && (
        <div className="rounded-[18px] bg-[var(--brand-soft)] p-4" data-testid="try-another-way">
          <p className="text-sm font-bold text-[var(--brand-ink)]">ลองวิธีอื่นไหม? — ถ้าวิธีหนึ่งไม่เวิร์ก ให้ลองอีกวิธีหนึ่ง</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {alternatives.map((a) => (
              <button key={a.mode} type="button" data-mode={a.mode} onClick={() => onTryMode(a.mode)} className="min-h-[56px] rounded-[14px] border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2 text-left hover:border-[var(--brand)]">
                <span className="block text-sm font-bold text-[var(--brand-ink)]">{MODE_META[a.mode].title}</span>
                <span className="block text-xs text-[var(--ink-3)] break-words">{a.reason}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {(s.confused.length > 0 || (recap?.weak.length ?? 0) > 0) && (
          <button type="button" onClick={onReviewWeak} className="min-h-[50px] rounded-[14px] border border-[var(--line-2)] bg-[var(--surface)] px-5 text-sm font-bold text-[var(--ink)]">
            ทบทวนจุดที่ยังไม่เข้าใจ
          </button>
        )}
        <button type="button" onClick={onNext} className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[var(--brand)] px-6 text-sm font-bold text-[var(--on-brand)]">
          {nextLabel} <KIcon name="arrowR" size={16} />
        </button>
      </div>
    </section>
  );
}
