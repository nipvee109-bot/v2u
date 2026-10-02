import { useEffect, useRef } from 'react';
import { BookOpen, Lightbulb, AlertTriangle, ChevronDown, ArrowRight, Clock } from 'lucide-react';
import type { OriginalLesson } from '../../content/types';
import { useReadingProgress } from '../../interactive/usePlayer';
import { ProgressBar } from '../ui';
import { READING_SECTIONS as SECTIONS } from './meta';



/** "อ่าน" — V2U's own explanation, laid out as a guided read with progress. */
export function ReadingExperience({ content, outcomes, onDone }: { content: OriginalLesson; outcomes: string[]; onDone: () => void }) {
  const [seen, mark] = useReadingProgress(content.lessonId);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const pct = Math.round((seen.length / SECTIONS.length) * 100);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && mark((e.target as HTMLElement).dataset.section!)),
      { rootMargin: '0px 0px -40% 0px' }
    );
    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [mark]);

  const sec = (id: string) => ({
    id: `read-${content.lessonId}-${id}`,
    'data-section': id,
    ref: (el: HTMLElement | null) => {
      refs.current[id] = el;
    },
  });

  return (
    <article aria-label="อ่านบทเรียนจาก V2U" className="space-y-5" data-testid="reading-mode">
      {/* Hero */}
      <header className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <BookOpen className="h-4 w-4" /> อ่านกับ V2U
        </p>
        <p className="mt-2 text-lg font-semibold leading-relaxed text-ink break-words">{content.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> อ่านประมาณ {content.readingMinutes} นาที
          </span>
          <span>เขียนโดย V2U · ฉบับ {content.version}</span>
        </div>
        {outcomes.length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">อ่านจบแล้วจะ</p>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
              {outcomes.map((o) => (
                <li key={o} className="flex gap-2 break-words">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Sticky progress + section nav */}
      <nav aria-label="หัวข้อในบท" className="sticky top-0 z-10 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ProgressBar value={pct} size="sm" label={`อ่านแล้ว ${pct}%`} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-600">อ่านแล้ว {pct}%</span>
        </div>
        <ul className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#read-${content.lessonId}-${s.id}`}
                className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold ${
                  seen.includes(s.id) ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {seen.includes(s.id) && '✓ '}
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* WHAT + WHY as concept cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <section {...sec('what')} className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5">
          <p className="text-xs font-semibold text-brand-700">คืออะไร</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-800 break-words">{content.what}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {content.keyTerms.map((k) => (
              <span key={k.term} title={k.meaning} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                <b className="font-semibold">{k.term}</b> — {k.meaning}
              </span>
            ))}
          </div>
        </section>
        <section {...sec('why')} className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5">
          <p className="text-xs font-semibold text-brand-700">ทำไมต้องรู้</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-800 break-words">{content.why}</p>
        </section>
      </div>

      {/* HOW */}
      <section {...sec('how')} className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold text-brand-700">ทำอย่างไร — ทีละขั้น</p>
        <ol className="mt-3 space-y-2">
          {content.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5 text-[15px] text-slate-800 break-words">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span className="break-words">{content.summary}</span>
        </p>
      </section>

      {/* EXAMPLE */}
      <section {...sec('example')} className="scroll-mt-28 space-y-3">
        <p className="px-1 text-xs font-semibold text-brand-700">ตัวอย่าง</p>
        {content.examples.map((e, i) => (
          <details key={e.problem} className="group rounded-3xl border border-slate-200/80 bg-white" open={i === 0}>
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
              <span className="font-mono text-base font-semibold text-ink break-words">{e.problem}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700">
                วิธีทำ <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <ol className="space-y-1 border-t border-slate-100 px-5 py-4 font-mono text-sm text-slate-700">
              {e.steps.map((s, k) => (
                <li key={s} className="flex gap-3">
                  <span className="w-5 shrink-0 text-right text-slate-400">{k + 1}</span>
                  <span className="break-words">{s}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> จุดที่มักพลาด
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-rose-950">
            {content.mistakes.map((m) => (
              <li key={m} className="break-words">✕ {m}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* TRY + CHECK (mini checks with reveal) */}
      <section {...sec('try')} className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5">
        <p className="text-xs font-semibold text-brand-700">ลองทำเอง</p>
        <ul className="mt-2 divide-y divide-slate-100">
          {content.tryIt.map((t) => (
            <li key={t.prompt}>
              <details className="group">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2">
                  <span className="font-mono text-sm text-ink break-words">{t.prompt}</span>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">ดูเฉลย</span>
                </summary>
                <p className="pb-3 font-mono text-sm text-emerald-700 break-words">{t.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section {...sec('check')} className="scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5">
        <p className="text-xs font-semibold text-brand-700">เช็กสั้น ๆ</p>
        <ul className="mt-2 divide-y divide-slate-100">
          {content.check.map((t) => (
            <li key={t.prompt}>
              <details>
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm text-ink">
                  <span className="break-words">{t.prompt}</span>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">ดูคำตอบ</span>
                </summary>
                <p className="pb-3 text-sm text-emerald-700 break-words">{t.answer}</p>
              </details>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">ต่อไป: {content.next}</p>
      </section>

      <div className="rounded-3xl bg-brand-50 p-5 text-center">
        <p className="text-sm text-brand-900">อ่านจบแล้ว ลองเช็กว่าเข้าใจจริงไหม</p>
        <button
          type="button"
          onClick={onDone}
          className="mt-3 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700"
        >
          ไปเช็กความเข้าใจ <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
