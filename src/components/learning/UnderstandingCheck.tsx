import { useMemo } from 'react';
import { Check, X, ArrowRight, RotateCcw, PartyPopper, ClipboardCheck } from 'lucide-react';
import type { InteractiveLesson, PlayerState, UnderstandingSummary } from '../../interactive/types';
import { checkChoice, summarize } from '../../interactive/engine';
import type { PlayerAction } from '../../interactive/engine';

interface CheckProps {
  lesson: InteractiveLesson;
  state: PlayerState;
  dispatch: (a: PlayerAction) => void;
  onSubmit: (summary: UnderstandingSummary) => void;
  /** Where the learner came from, so they can go back without losing anything */
  onBack?: () => void;
}

/** "เช็กความเข้าใจ" — the same check after reading, watching or learning with V2U. */
export function UnderstandingCheck({ lesson, state, dispatch, onSubmit, onBack }: CheckProps) {
  const allAnswered = lesson.finalCheck.every((f) => state.finalAnswers[f.id] !== undefined);
  return (
    <section aria-labelledby="final-check" className="space-y-4" data-testid="final-check">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <ClipboardCheck className="h-4 w-4" /> ก่อนไปต่อ
        </p>
        <h3 id="final-check" className="mt-0.5 text-xl font-bold text-ink">
          เช็กความเข้าใจ
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {lesson.finalCheck.length} ข้อสั้น ๆ — V2U ใช้ผลนี้ตัดสินว่าเข้าใจจริงไหม ไม่ใช่แค่เปิดดูหรือดูคลิปจบ
        </p>
      </div>

      {lesson.finalCheck.map((f, n) => {
        const picked = state.finalAnswers[f.id];
        return (
          <fieldset key={f.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <legend className="sr-only">ข้อ {n + 1}</legend>
            <p className="text-xs font-semibold text-slate-500">ข้อ {n + 1}</p>
            <p className="mt-0.5 text-base font-semibold text-ink break-words">{f.prompt}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {f.choices.map((c, k) => {
                const chosen = picked === k;
                const showRight = state.finished && k === f.correctIndex;
                const showWrong = state.finished && chosen && k !== f.correctIndex;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={state.finished}
                    aria-pressed={chosen}
                    onClick={() => dispatch({ type: 'final', itemId: f.id, choice: k })}
                    className={`flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border-2 px-4 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                      showRight
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : showWrong
                          ? 'border-amber-400 bg-amber-50 text-amber-900'
                          : chosen
                            ? 'border-brand-500 bg-brand-50 text-brand-900'
                            : 'border-slate-200 bg-white text-ink hover:border-brand-300'
                    }`}
                  >
                    <span className="break-words">{c}</span>
                    {showRight && <Check className="h-4 w-4 shrink-0" />}
                    {showWrong && <X className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {state.finished && (
              <p className={`mt-3 text-sm ${checkChoice(f, picked ?? -1) ? 'text-emerald-800' : 'text-amber-900'}`}>
                {checkChoice(f, picked ?? -1) ? '✓ ' : '△ '}
                {f.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {!state.finished && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="min-h-[48px] rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              ← กลับไปเรียนต่อ
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
            className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            ส่งคำตอบ <ArrowRight className="h-4 w-4" />
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
}

/** Completion: what is understood, what can be done, what to review — then the next step. */
export function LessonCompletion({ lesson, state, onReviewWeak, onNext, nextLabel }: DoneProps) {
  const s = useMemo(() => summarize(lesson, state), [lesson, state]);
  const passed = s.score >= 70 && s.confused.length === 0;
  return (
    <section aria-labelledby="lesson-done" className="space-y-4" data-testid="lesson-complete">
      <div className={`rounded-3xl p-6 text-center sm:p-8 ${passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-200/80'}`}>
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${passed ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
          {passed ? <PartyPopper className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
        </span>
        <h3 id="lesson-done" className="mt-3 text-2xl font-bold text-ink">
          {passed ? 'เรียบร้อย' : 'ใกล้แล้ว'}
        </h3>
        <p className="mt-1 text-sm text-slate-700">
          {passed ? `คุณผ่านภารกิจ “${lesson.mission.title}” แล้ว` : 'ยังมีบางจุดที่ควรทบทวนก่อนไปบทถัดไป'} · เช็กความเข้าใจได้ {s.score}%
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-sm font-bold text-emerald-700">✓ สิ่งที่เข้าใจ</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {s.understood.length ? s.understood.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-slate-500">ยังไม่มี — ลองทบทวนแล้วเช็กใหม่</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-sm font-bold text-emerald-700">✓ สิ่งที่ทำได้</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {s.canDo.length ? s.canDo.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-slate-500">จะนับเมื่อเช็กถูกครบทุกข้อ</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-sm font-bold text-amber-700">△ ควรทบทวน</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {s.review.length ? s.review.map((x) => <li key={x} className="break-words">{x}</li>) : <li className="text-slate-500">ไม่มี</li>}
          </ul>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {s.confused.length > 0 && (
          <button type="button" onClick={onReviewWeak} className="min-h-[52px] rounded-2xl border-2 border-brand-200 bg-white px-5 text-sm font-bold text-brand-700 hover:bg-brand-50">
            ทบทวนจุดที่ยังไม่เข้าใจ
          </button>
        )}
        <button type="button" onClick={onNext} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700">
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
