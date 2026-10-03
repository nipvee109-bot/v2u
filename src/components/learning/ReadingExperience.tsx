import { useEffect, useRef, useState } from 'react';
import { BookOpen, Lightbulb, AlertTriangle, ChevronDown, ArrowRight, Clock, FlaskConical, Check, X } from 'lucide-react';
import type { OriginalLesson } from '../../content/types';
import { useReadingProgress } from '../../interactive/usePlayer';
import { checkTyped } from '../../interactive/engine';
import { ProgressBar } from '../ui';
import { READING_SECTIONS as SECTIONS } from './meta';
import { EquationCard } from './InteractivePlayer';
import { CodeExplained, ErrorExample, FormulaCardView, PracticeItem } from './SubjectBlocks';
import { getLessonKnowledge } from '../../content/knowledge';
import { KnowledgeBoundary, KnowledgeDetailed, KnowledgeExamples, KnowledgeMistakes, KnowledgePracticeList, KnowledgeRules, KnowledgeSources, KnowledgeSummary } from './KnowledgeBlocks';

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
          <p className="mt-1 font-mono text-sm text-[var(--ok)] break-words">{answer}</p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-[40px] text-xs font-semibold text-[var(--brand-ink)]">
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
          className="min-h-[44px] w-24 rounded-xl border-2 border-[var(--line-2)] px-3 font-mono outline-none focus:border-[var(--brand)]"
        />
        <button type="submit" disabled={!value.trim()} className="min-h-[44px] rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-white disabled:bg-[var(--surface-3)] disabled:text-[var(--ink-3)]">
          ตรวจคำตอบ
        </button>
        {state === 'right' && <span className="flex items-center gap-1 text-sm font-semibold text-[var(--ok)]"><Check className="h-4 w-4" /> ถูกต้อง</span>}
        {state === 'wrong' && (
          <span className="flex items-center gap-1 text-sm font-semibold text-[var(--rev)]">
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
    <p className="flex items-center gap-2.5 font-display text-[19px] font-semibold text-[var(--ink)]">
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[var(--brand-soft)] font-mono text-xs font-semibold text-[var(--brand-ink)]">{String(sectionNumber(id)).padStart(2, '0')}</span>
      {children}
    </p>
  );
}

/** "อ่านกับ V2U" — short but real understanding, in 8 small parts. */
export function ReadingExperience({
  content,
  outcomes,
  onDone,
  subjectId,
  prerequisites = [],
}: {
  content: OriginalLesson;
  outcomes: string[];
  onDone: () => void;
  subjectId?: 'math' | 'programming' | 'physics';
  /** Titles of the lessons to know first (from the curriculum) */
  prerequisites?: string[];
}) {
  const isCode = subjectId === 'programming';
  // Phase 62: researched knowledge for this lesson (same data the understanding check uses)
  const k = getLessonKnowledge(content.lessonId);
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
  const card = 'scroll-mt-28 rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-[clamp(18px,2vw,26px)]';

  return (
    <article aria-label="อ่านกับ V2U" className="space-y-5" data-testid="reading-mode">
      <header className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-5 sm:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-ink)]">
          <BookOpen className="h-4 w-4" /> อ่านกับ V2U · สั้น แต่เข้าใจจริง
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-3)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> อ่านประมาณ {content.readingMinutes} นาที
          </span>
          <span>เขียนโดย V2U · ฉบับ {content.version}</span>
        </div>
        {outcomes.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--ink-3)]">อ่านจบแล้วจะ</p>
            <ul className="mt-1.5 space-y-1 text-sm text-[var(--ink-2)]">
              {outcomes.map((o) => (
                <li key={o} className="flex gap-2 break-words">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <nav aria-label="หัวข้อในบท" className="sticky top-0 z-10 -mx-1 rounded-[18px] border border-[var(--line)] bg-[var(--nav-bg)] px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ProgressBar value={pct} size="sm" label={`อ่านแล้ว ${pct}%`} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--ink-2)]">อ่านแล้ว {pct}%</span>
        </div>
        <ul className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <a href={`#read-${content.lessonId}-${s.id}`} className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold ${seen.includes(s.id) ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]' : 'bg-[var(--surface-3)] text-[var(--ink-2)]'}`}>
                {seen.includes(s.id) ? '✓' : i + 1} {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section {...sec('understand')} className={card}>
        <Head id="understand">สิ่งที่ต้องเข้าใจ</Head>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)] break-words">{content.what}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {content.keyTerms.map((k) => (
            <span key={k.term} className="rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-xs text-[var(--ink-2)]">
              <b className="font-semibold">{k.term}</b> — {k.meaning}
            </span>
          ))}
        </div>
        {(content.prereqNote || prerequisites.length > 0) && (
          <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-4" data-testid="prereq">
            <p className="text-xs font-semibold text-[var(--ink-3)]">สิ่งที่ต้องรู้ก่อน</p>
            {prerequisites.length > 0 ? (
              <p className="mt-1 text-sm font-semibold text-ink break-words">{prerequisites.join(' · ')}</p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-ink">เริ่มบทนี้ได้เลย ไม่ต้องเรียนบทอื่นก่อน</p>
            )}
            {content.prereqNote && <p className="mt-1 text-sm text-[var(--ink-2)] break-words">{content.prereqNote}</p>}
          </div>
        )}
        {k && <KnowledgeBoundary k={k} />}
      </section>

      <section {...sec('principle')} className={card}>
        <Head id="principle">หลักคิด</Head>
        <p className="mt-2 flex items-start gap-2 rounded-2xl border-l-4 border-[var(--rev)] bg-[var(--rev-soft)] px-4 py-3 text-[15px] font-medium text-[var(--ink)]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rev)]" />
          <span className="break-words">{content.principle ?? content.summary}</span>
        </p>
        {content.formulas?.map((f) => (
          <div key={f.expr} className="mt-3">
            <FormulaCardView f={f} />
          </div>
        ))}
        {!isCode && !content.formulas?.length && content.examples[0] && (
          <div className="mt-3">
            <EquationCard lines={[content.examples[0].problem, ...content.examples[0].steps]} caption="ตัวอย่างหลักคิด" />
          </div>
        )}
        {k && <KnowledgeRules k={k} />}
      </section>

      <section {...sec('simple')} className={card}>
        <Head id="simple">อธิบายแบบง่าย</Head>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)] break-words">{content.simple ?? content.why}</p>
        {content.simple && (
          <p className="mt-3 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-2)] break-words">
            <b className="font-semibold text-ink">ทำไมต้องรู้:</b> {content.why}
          </p>
        )}
        {k && <KnowledgeDetailed k={k} />}
      </section>

      <section {...sec('example')} className="scroll-mt-28 space-y-3">
        <div className="px-1">
          <Head id="example">ตัวอย่าง</Head>
        </div>
        {content.code?.map((c, i) => <CodeExplained key={c.code} ex={c} n={i + 1} />)}
        {content.errorExample && <ErrorExample e={content.errorExample} />}
        {content.examples.map((e, i) => (
          <details key={e.problem} className="group rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]" open={i === 0}>
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
              <span className="font-mono text-base font-semibold text-ink break-words">{e.problem}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand-ink)]">
                วิธีทำ <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <ol className="space-y-1 border-t border-[var(--line)] px-5 py-4 font-mono text-sm text-[var(--ink-2)]">
              {e.steps.map((s, k) => (
                <li key={s} className="flex gap-3">
                  <span className="w-5 shrink-0 text-right text-[var(--ink-3)]">{k + 1}</span>
                  <span className="break-words">{s}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
        {k && <KnowledgeExamples k={k} />}
      </section>

      <section {...sec('steps')} className={card}>
        <Head id="steps">วิธีคิดทีละขั้น</Head>
        <ol className="mt-3 space-y-2">
          {content.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5 text-[15px] text-[var(--ink)] break-words">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section {...sec('mistakes')} className="scroll-mt-28 rounded-[22px] border border-[var(--err-soft)] bg-[var(--err-soft)] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--err)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold">{sectionNumber('mistakes')}</span>
          <AlertTriangle className="h-4 w-4" /> จุดที่มักพลาด
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink)]">
          {content.mistakes.map((m) => (
            <li key={m} className="break-words">✕ {m}</li>
          ))}
        </ul>
        {k && <KnowledgeMistakes k={k} />}
      </section>

      <section {...sec('try')} className={card}>
        <Head id="try">
          <FlaskConical className="h-4 w-4" /> ลองทำ
        </Head>
        <ul className="mt-1 divide-y divide-[var(--line)]">
          {content.tryIt.map((t) => (
            <TryItem key={t.prompt} prompt={t.prompt} answer={t.answer} />
          ))}
        </ul>
        {content.practice && content.practice.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)] pt-4" data-testid="practice">
            <p className="text-sm font-bold text-ink">แบบฝึก</p>
            <p className="text-xs text-[var(--ink-3)]">ฝึกเรื่องเดียวกับที่เพิ่งเรียน ทำเองก่อนแล้วค่อยเปิดดู</p>
            <ul className="divide-y divide-[var(--line)]">
              {content.practice.map((t) => (
                <PracticeItem key={t.prompt} item={t} code={isCode} />
              ))}
            </ul>
          </div>
        )}
        {k && <KnowledgePracticeList k={k} code={isCode} />}
      </section>

      <section {...sec('check')} className={card}>
        <Head id="check">เช็กความเข้าใจ</Head>
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {content.check.map((t) => (
            <li key={t.prompt}>
              <details>
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm text-ink">
                  <span className="break-words">{t.prompt}</span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--brand-ink)]">ดูคำตอบ</span>
                </summary>
                <p className="pb-3 text-sm text-[var(--ok)] break-words">{t.answer}</p>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl border border-[var(--line-2)] bg-[var(--surface)] p-4" data-testid="reading-summary">
          <p className="text-xs font-semibold text-[var(--ink-3)]">สรุป</p>
          <p className="mt-1 text-[15px] text-ink break-words">{content.summary}</p>
        </div>
        {k && <KnowledgeSummary k={k} />}
        <div className="mt-4 rounded-2xl bg-[var(--brand-soft)] p-4 text-center">
          <p className="text-sm text-[var(--brand-ink)]">อ่านจบแล้ว — การอ่านอย่างเดียวยังไม่ได้แปลว่าเข้าใจ</p>
          <button type="button" onClick={onDone} className="mt-3 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[var(--brand)] px-6 text-sm font-bold text-white hover:bg-[var(--brand-hi)]">
            ไปเช็กความเข้าใจ <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--ink-3)]">ต่อไป: {content.next}</p>
        {k && <KnowledgeSources k={k} />}
      </section>
    </article>
  );
}
