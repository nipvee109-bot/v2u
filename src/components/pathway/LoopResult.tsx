import { SubjectMark } from '../ui/subject';
import { KIcon } from '../v2u/kit';
import { SUBJECT_LABEL } from '../../diagnostic/engine';
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

/** “อัปเดตความเข้าใจแล้ว” (design: Learning result) — what this check changed, from the engine's real numbers. */
export function LoopResult({ outcome, onNext }: { outcome: LoopOutcome; onNext: () => void }) {
  const { next } = outcome;
  const changed = outcome.changes.filter((c) => c.before !== c.after);
  const tone = outcome.passed ? { c: 'var(--ok)', soft: 'var(--ok-soft)', k: 'check' as const } : { c: 'var(--rev)', soft: 'var(--rev-soft)', k: 'sRev' as const };
  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-[18px]" data-testid="loop-result" data-passed={outcome.passed}>
      <section aria-labelledby="loop-result" className="relative flex flex-col items-center gap-3.5 overflow-hidden text-center" style={{ padding: 'clamp(28px,4vw,48px) clamp(18px,3vw,40px)', borderRadius: 28, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', animation: 'v2uIn .3s ease both' }}>
        <span aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(420px 200px at 50% 0%,${tone.soft},transparent 70%)` }} />
        <span aria-hidden="true" className="relative grid h-[104px] w-[104px] place-items-center rounded-full" style={{ border: '1px dashed var(--line-2)' }}>
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full text-white" style={{ background: tone.c, boxShadow: `0 0 0 10px ${tone.soft}`, animation: 'v2uPop .6s .15s ease both' }}><KIcon name={tone.k} size={32} w={2.4} /></span>
        </span>
        <h2 id="loop-result" className="relative font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,2vw + 16px,34px)', color: 'var(--ink)' }}>อัปเดตความเข้าใจแล้ว</h2>
        <p className="relative max-w-[48ch]" style={{ color: 'var(--ink-2)' }}>
          เช็กความเข้าใจได้ {outcome.score}%
          {outcome.practice && outcome.practice.total > 0 && ` · ฝึกทำเองได้ ${outcome.practice.solved}/${outcome.practice.total} ขั้น${outcome.practice.revealed ? ` (ดูเฉลย ${outcome.practice.revealed})` : ''}`}
          {outcome.passed ? ' · บทนี้นับว่าเรียนจบแล้ว' : ' · ยังไม่นับว่าเรียนจบ — ทบทวนจุดที่สับสนก่อน'}
        </p>

        <div className="relative flex w-full max-w-[520px] flex-col gap-3.5 rounded-[20px] p-[18px] text-left" style={{ background: 'var(--surface-2)' }}>
          <ul className="flex flex-col gap-3" data-testid="skill-changes">
            {outcome.changes.map((c) => (
              <li key={c.skillId} className="flex flex-col gap-2" data-skill={c.skillId} data-before={c.before} data-after={c.after}>
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-base font-bold break-words" style={{ color: 'var(--ink)' }}>{c.title}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}><SubjectMark subjectId={c.subjectId} size="sm" /> {SUBJECT_LABEL[c.subjectId]}</span>
                </div>
                <p className="flex flex-wrap items-center gap-2.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                  {c.before === c.after ? (
                    <>สถานะเดิม <StatusPill status={c.after} /></>
                  ) : (
                    <>ก่อนหน้านี้ <StatusPill status={c.before} /> <KIcon name="arrowR" size={16} /> ตอนนี้ <StatusPill status={c.after} /></>
                  )}
                </p>
              </li>
            ))}
          </ul>
          {changed.length === 0 && <p className="text-xs" style={{ color: 'var(--ink-3)' }}>ทักษะยังไม่เปลี่ยนสถานะจากครั้งนี้</p>}
          {outcome.mastery.after !== undefined && (
            <p className="flex flex-wrap items-center gap-2 pt-3 text-sm" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
              <KIcon name="gauge" size={16} /> ระดับความเข้าใจของบท:{' '}
              <span className="font-bold">
                {outcome.mastery.before !== undefined && outcome.mastery.before !== outcome.mastery.after ? `${MASTERY_LABEL(outcome.mastery.before)} → ` : ''}
                {MASTERY_LABEL(outcome.mastery.after)}
              </span>
            </p>
          )}
          {outcome.review && (
            <p className="flex flex-wrap items-center gap-2 pt-3 text-sm" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }} data-testid="review-update">
              <KIcon name="calendar" size={16} /> ทบทวนครั้งถัดไป:{' '}
              <span className="font-bold">{new Date(outcome.review.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · {REVIEW_REASON[outcome.review.reason] ?? 'ตามรอบทบทวน'}</span>
            </p>
          )}
        </div>
      </section>

      <section className="relative flex flex-wrap items-center gap-[18px] overflow-hidden text-white" style={{ padding: 'clamp(18px,2.4vw,28px)', borderRadius: 24, background: 'radial-gradient(360px 220px at 100% 0%,rgba(132,150,255,.5),transparent 70%),linear-gradient(135deg,#0b1135,#1a2490)', boxShadow: 'var(--shadow-lg)' }} data-testid="loop-next" data-subject={next.pathway?.subjectId ?? ''}>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ letterSpacing: '.08em', color: '#c9d1ff' }}><KIcon name="nav" size={16} /> ก้าวต่อไปของคุณ (คำนวณใหม่แล้ว)</span>
          <span className="font-display text-[22px] font-bold leading-tight break-words">
            {next.pathway ? `${SUBJECT_LABEL[next.pathway.subjectId]} — ` : ''}
            {next.todayAction}
          </span>
          <span className="text-[13px] break-words" style={{ color: '#d5dbff' }}>เพราะ {next.reason}</span>
          {outcome.nextBefore && outcome.nextBefore.todayAction !== next.todayAction && (
            <span className="text-xs break-words" style={{ color: '#c9d1ff' }}>ก่อนเช็กครั้งนี้ V2U แนะนำ: {outcome.nextBefore.todayAction}</span>
          )}
        </div>
        <button type="button" onClick={onNext} className="inline-flex h-[50px] items-center gap-2.5 rounded-[14px] bg-white px-[22px] font-bold" style={{ color: '#16207a', boxShadow: '0 8px 20px -8px rgba(0,0,0,.5)' }}>
          {next.ctaLabel} <KIcon name="arrowR" size={20} />
        </button>
      </section>
    </div>
  );
}
