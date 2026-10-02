import type { OriginalLesson } from '../../content/types';
import { ORIGINAL_SECTION_TITLES as T } from '../../content/types';

/** Reading mode for a V2U original lesson: time, sections, summary, key terms, examples. */
export function OriginalLessonView({ content, compact = false }: { content: OriginalLesson; compact?: boolean }) {
  const h = 'mt-6 text-base font-bold text-ink';
  return (
    <article aria-label="บทเรียนจาก V2U" className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm leading-relaxed text-slate-700 sm:p-6">
      <p className="text-[11px] font-semibold text-slate-500">
        อ่านประมาณ {content.readingMinutes} นาที · เขียนโดย V2U · ฉบับ {content.version}
      </p>
      <nav aria-label="หัวข้อในบท" className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {Object.entries(T).map(([k, v]) => (
          <a key={k} href={`#sec-${content.lessonId}-${k}`} className="inline-flex min-h-[32px] items-center rounded-full bg-slate-100 px-3 text-slate-700 hover:bg-slate-200">
            {v}
          </a>
        ))}
      </nav>
      <div className="mt-4 rounded-xl bg-brand-50 p-4">
        <p className="text-xs font-bold text-brand-800">สรุปสั้น</p>
        <p className="mt-1 break-words">{content.summary}</p>
      </div>
      <div className="mt-3">
        <p className="text-xs font-bold text-slate-900">คำสำคัญ</p>
        <dl className="mt-1 space-y-1">
          {content.keyTerms.map((k) => (
            <div key={k.term} className="break-words">
              <dt className="inline font-semibold">{k.term}: </dt>
              <dd className="inline">{k.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
      <h3 id={`sec-${content.lessonId}-what`} className={h}>{T.what}</h3>
      <p className="break-words">{content.what}</p>
      <h3 id={`sec-${content.lessonId}-why`} className={h}>{T.why}</h3>
      <p className="break-words">{content.why}</p>
      <h3 id={`sec-${content.lessonId}-steps`} className={h}>{T.steps}</h3>
      <ol className="ml-5 list-decimal space-y-0.5">
        {content.steps.map((s) => <li key={s} className="break-words">{s}</li>)}
      </ol>
      <h3 id={`sec-${content.lessonId}-examples`} className={h}>{T.examples}</h3>
      {content.examples.map((e) => (
        <div key={e.problem} className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <p className="font-semibold break-words">{e.problem}</p>
          <ol className="mt-1 ml-5 list-decimal font-mono text-[12px]">
            {e.steps.map((s) => <li key={s} className="break-words">{s}</li>)}
          </ol>
        </div>
      ))}
      {!compact && (
        <>
          <h3 id={`sec-${content.lessonId}-mistakes`} className={h}>{T.mistakes}</h3>
          <ul className="ml-5 list-disc">{content.mistakes.map((m) => <li key={m} className="break-words">{m}</li>)}</ul>
          <h3 id={`sec-${content.lessonId}-tryIt`} className={h}>{T.tryIt}</h3>
          <ul className="space-y-1">
            {content.tryIt.map((t) => (
              <li key={t.prompt}>
                <details>
                  <summary className="cursor-pointer break-words">{t.prompt}</summary>
                  <p className="ml-4 text-emerald-700 break-words">เฉลย: {t.answer}</p>
                </details>
              </li>
            ))}
          </ul>
          <h3 id={`sec-${content.lessonId}-check`} className={h}>{T.check}</h3>
          <ul className="space-y-1">
            {content.check.map((t) => (
              <li key={t.prompt}>
                <details>
                  <summary className="cursor-pointer break-words">{t.prompt}</summary>
                  <p className="ml-4 text-emerald-700 break-words">คำตอบ: {t.answer}</p>
                </details>
              </li>
            ))}
          </ul>
          <h3 id={`sec-${content.lessonId}-next`} className={h}>{T.next}</h3>
          <p className="break-words">{content.next}</p>
        </>
      )}
    </article>
  );
}
