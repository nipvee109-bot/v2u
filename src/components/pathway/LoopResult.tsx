import { SubjectMark } from '../ui/subject';
import { ArrowRight, CheckCircle2, CalendarClock, RotateCcw } from 'lucide-react';
import { SUBJECT_EMOJI, SUBJECT_LABEL } from '../../diagnostic/engine';
import type { LoopOutcome } from '../../hooks/learningLoop';
import { StatusPill } from './PathwayBits';
import { MASTERY_SCALE } from '../../types';
import type { MasteryScore } from '../../types';

const MASTERY_LABEL = (n: number) => MASTERY_SCALE[n as MasteryScore]?.title ?? String(n);


const REVIEW_REASON: Record<string, string> = {
  low_quiz_score: 'เช็กความเข้าใจยังไม่ผ่าน',
  unclear_topic: 'ยังมีจุดที่สับสน',
  spaced_repetition: 'ทบทวนตามรอบเพื่อให้จำได้นาน',
};

/** “อัปเดตความเข้าใจแล้ว” — what this check changed, from the engine's real numbers. */
export function LoopResult({ outcome, onNext }: { outcome: LoopOutcome; onNext: () => void }) {
  const { next } = outcome;
  const changed = outcome.changes.filter((c) => c.before !== c.after);
  return (
    <section aria-labelledby="loop-result" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-5 sm:p-6" data-testid="loop-result" data-passed={outcome.passed}>
      <h2 id="loop-result" className="flex items-center gap-2 text-lg font-bold text-ink">
        {outcome.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <RotateCcw className="h-5 w-5 text-amber-600" />}
        อัปเดตความเข้าใจแล้ว
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        เช็กความเข้าใจได้ {outcome.score}%
        {outcome.practice && outcome.practice.total > 0 && ` · ฝึกทำเองได้ ${outcome.practice.solved}/${outcome.practice.total} ขั้น${outcome.practice.revealed ? ` (ดูเฉลย ${outcome.practice.revealed})` : ''}`}
        {outcome.passed ? ' · บทนี้นับว่าเรียนจบแล้ว' : ' · ยังไม่นับว่าเรียนจบ — ทบทวนจุดที่สับสนก่อน'}
      </p>

      <ul className="mt-4 space-y-2" data-testid="skill-changes">
        {outcome.changes.map((c) => (
          <li key={c.skillId} className="rounded-2xl bg-slate-50 px-4 py-3" data-skill={c.skillId} data-before={c.before} data-after={c.after}>
            <p className="flex items-center gap-1.5 text-xs text-ink-3"><SubjectMark subjectId={c.subjectId} size="sm" /> {SUBJECT_LABEL[c.subjectId]}</p>
            <p className="text-sm font-semibold text-ink break-words">{c.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              {c.before === c.after ? (
                <>สถานะเดิม <StatusPill status={c.after} /></>
              ) : (
                <>ก่อนหน้านี้ <StatusPill status={c.before} /> <ArrowRight className="h-3.5 w-3.5" /> ตอนนี้ <StatusPill status={c.after} /></>
              )}
            </p>
          </li>
        ))}
      </ul>
      {changed.length === 0 && <p className="mt-2 text-xs text-slate-500">ทักษะยังไม่เปลี่ยนสถานะจากครั้งนี้</p>}

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {outcome.mastery.after !== undefined && (
          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <dt className="text-xs text-slate-500">ระดับความเข้าใจของบท</dt>
            <dd className="font-semibold text-ink">
              {outcome.mastery.before !== undefined && outcome.mastery.before !== outcome.mastery.after ? `${MASTERY_LABEL(outcome.mastery.before)} → ` : ''}
              {MASTERY_LABEL(outcome.mastery.after)}
            </dd>
          </div>
        )}
        {outcome.review && (
          <div className="rounded-2xl border border-slate-200 px-4 py-3" data-testid="review-update">
            <dt className="flex items-center gap-1 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5" /> ทบทวนครั้งถัดไป</dt>
            <dd className="font-semibold text-ink">
              {new Date(outcome.review.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · {REVIEW_REASON[outcome.review.reason] ?? 'ตามรอบทบทวน'}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 rounded-2xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-4 text-white sm:p-5" data-testid="loop-next" data-subject={next.pathway?.subjectId ?? ''}>
        <p className="text-xs font-semibold text-brand-100">ก้าวต่อไปของคุณ (คำนวณใหม่แล้ว)</p>
        <p className="mt-1 text-lg font-bold break-words">
          {next.pathway ? `${SUBJECT_EMOJI[next.pathway.subjectId]} ${SUBJECT_LABEL[next.pathway.subjectId]} — ` : ''}
          {next.todayAction}
        </p>
        <p className="mt-1 text-sm text-white/90 break-words">เพราะ {next.reason}</p>
        {outcome.nextBefore && outcome.nextBefore.todayAction !== next.todayAction && (
          <p className="mt-1 text-xs text-white/75 break-words">ก่อนเช็กครั้งนี้ V2U แนะนำ: {outcome.nextBefore.todayAction}</p>
        )}
        <button type="button" onClick={onNext} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-brand-800 sm:w-auto">
          {next.ctaLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
