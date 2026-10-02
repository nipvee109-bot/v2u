import { useEffect, useRef, useState } from 'react';
import { BookOpen, Lightbulb, AlertTriangle, ChevronDown, ArrowRight, Clock, FlaskConical, Check, X } from 'lucide-react';
import type { OriginalLesson } from '../../content/types';
import { useReadingProgress } from '../../interactive/usePlayer';
import { checkTyped } from '../../interactive/engine';
import { ProgressBar } from '../ui';
import { READING_SECTIONS as SECTIONS } from './meta';
import { EquationCard } from './InteractivePlayer';

/** "x = 5" → typed check; anything else → reveal. Only for answers V2U can check honestly. */
function TryItem({ prompt, answer }: { prompt: string; answer: string }) {
  const m = answer.match(/^\s*([a-zA-Z])\s*=\s*(-?\d+(?:\.\d+)?)\s*$/);
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const [open, setOpen] = useState(false);
  if (!m) {
    return (
      <li className="py-3">
        <p className="font-mono text-sm text-ink break-words">{prompt}</p>
        {open ? (
          <p className="mt-1 font-mono text-sm text-emerald-700 break-words">{answer}</p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-[40px] text-xs font-semibold text-brand-700">
            ดูเฉลย
          </button>
        )}
      </li>
    );
  }
  const check = () => setState(checkTyped({ kind: 'typed', prompt, accept: [m[2]], hint: '', workedSteps: [], explanation: '' }, value) ? 'right' : 'wrong');
  return (
    <li className="py-3">
      <p className="font-mono text-sm text-ink break-words">{prompt}</p>
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <span className="font-mono font-semibold text-ink">{m[1]} =</span>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState('idle');
          }}
          aria-label={`${prompt} ${m[1]} =`}
          className="min-h-[44px] w-24 rounded-xl border-2 border-slate-200 px-3 font-mono outline-none focus:border-brand-500"
        />
        <button type="submit" disabled={!value.trim()} className="min-h-[44px] rounded-xl bg-brand-600 px-4 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500">
          ตรวจคำตอบ
        </button>
        {state === 'right' && <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> ถูกต้อง</span>}
        {state === 'wrong' && (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">
            <X className="h-4 w-4" /> ยังไม่ใช่ — ลองย้อนดู “วิธีคิดทีละขั้น”
          </span>
        )}
      </form>
    </li>
  );
}

const sectionNumber = (id: string) => SECTIONS.findIndex((s) => s.id === id) + 1;

/** Numbered section heading (module-level so React keeps its identity between renders). */
function Head({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold text-brand-700">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold">{sectionNumber(id)}</span>
      {children}
    </p>
  );
}

/** "อ่านกับ V2U" — short but real understanding, in 8 small parts. */
export function ReadingExperience({ content, outcomes, onDone }: { content: OriginalLesson; outcomes: string[]; onDone: () => void }) {
  const [seen, mark] = useReadingProgress(content.lessonId);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const pct = Math.round((seen.filter((s) => SECTIONS.some((x) => x.id === s)).length / SECTIONS.length) * 100);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && mark((e.target as HTMLElement).dataset.section!)), {
      rootMargin: '0px 0px -40% 0px',
    });
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
  const card = 'scroll-mt-28 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6';

  return (
    <article aria-label="อ่านกับ V2U" className="space-y-5" data-testid="reading-mode">
      <header className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <BookOpen className="h-4 w-4" /> อ่านกับ V2U · สั้น แต่เข้าใจจริง
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
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

      <nav aria-label="หัวข้อในบท" className="sticky top-0 z-10 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ProgressBar value={pct} size="sm" label={`อ่านแล้ว ${pct}%`} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-600">อ่านแล้ว {pct}%</span>
        </div>
        <ul className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <a href={`#read-${content.lessonId}-${s.id}`} className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold ${seen.includes(s.id) ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                {seen.includes(s.id) ? '✓' : i + 1} {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section {...sec('understand')} className={card}>
        <Head id="understand">สิ่งที่ต้องเข้าใจ</Head>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-800 break-words">{content.what}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {content.keyTerms.map((k) => (
            <span key={k.term} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              <b className="font-semibold">{k.term}</b> — {k.meaning}
            </span>
          ))}
        </div>
      </section>

      <section {...sec('principle')} className={card}>
        <Head id="principle">หลักคิด</Head>
        <p className="mt-2 flex items-start gap-2 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-[15px] font-medium text-amber-950">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span className="break-words">{content.summary}</span>
        </p>
        {content.examples[0] && (
          <div className="mt-3">
            <EquationCard lines={[content.examples[0].problem, ...content.examples[0].steps]} caption="ตัวอย่างหลักคิด" />
          </div>
        )}
      </section>

      <section {...sec('simple')} className={card}>
        <Head id="simple">อธิบายแบบง่าย</Head>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-800 break-words">{content.why}</p>
      </section>

      <section {...sec('example')} className="scroll-mt-28 space-y-3">
        <div className="px-1">
          <Head id="example">ตัวอย่าง</Head>
        </div>
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
      </section>

      <section {...sec('steps')} className={card}>
        <Head id="steps">วิธีคิดทีละขั้น</Head>
        <ol className="mt-3 space-y-2">
          {content.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5 text-[15px] text-slate-800 break-words">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section {...sec('mistakes')} className="scroll-mt-28 rounded-3xl border border-rose-200 bg-rose-50/60 p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold text-rose-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold">{sectionNumber('mistakes')}</span>
          <AlertTriangle className="h-4 w-4" /> จุดที่มักพลาด
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-rose-950">
          {content.mistakes.map((m) => (
            <li key={m} className="break-words">✕ {m}</li>
          ))}
        </ul>
      </section>

      <section {...sec('try')} className={card}>
        <Head id="try">
          <FlaskConical className="h-4 w-4" /> ลองทำ
        </Head>
        <ul className="mt-1 divide-y divide-slate-100">
          {content.tryIt.map((t) => (
            <TryItem key={t.prompt} prompt={t.prompt} answer={t.answer} />
          ))}
        </ul>
      </section>

      <section {...sec('check')} className={card}>
        <Head id="check">เช็กความเข้าใจ</Head>
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
        <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-center">
          <p className="text-sm text-brand-900">อ่านจบแล้ว — การอ่านอย่างเดียวยังไม่ได้แปลว่าเข้าใจ</p>
          <button type="button" onClick={onDone} className="mt-3 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700">
            ไปเช็กความเข้าใจ <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">ต่อไป: {content.next}</p>
      </section>
    </article>
  );
}
