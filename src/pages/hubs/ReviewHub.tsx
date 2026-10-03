import { useStore } from '../../store/useStore';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSkillGaps } from '../../skills/engine';
import { KIcon } from '../../components/v2u/kit';
import type { IconName } from '../../components/v2u/kit';
import { subOf } from '../../components/v2u/tokens';
import { SUBJECTS } from '../../types';
import { Link } from 'react-router-dom';
import { getUnclearSignals } from '../../notes/engine';

/** ทบทวน — due reviews, review questions (inside each review room) and not-understood topics. */
export function ReviewHub() {
  const { getDueReviewItems, unclearTopics = [], lessons } = useStore();
  const records = useLearningRecords();
  const weakSkills = getSkillGaps({ storeLessons: lessons, records }).filter((g) => g.status === 'needs-review' && g.studyLessonIds.length > 0);
  const { overdue, dueToday, upcoming } = getDueReviewItems();


  const unclearCount = unclearTopics.filter((t) => t.status !== 'Understood').length;
  const studyNotes = useStore((st) => st.learningNotes?.notes) ?? [];
  // Phase 55: what the learner said they still don't get (personal signal, mapped only when data supports it)
  const signals = getUnclearSignals(studyNotes);
  const nothingDue = overdue.length === 0 && dueToday.length === 0 && weakSkills.length === 0 && signals.length === 0;

  const lessonOf = (id: string) => lessons.find((l) => l.id === id);
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const due = [...overdue, ...dueToday];
  const h2 = 'font-display text-lg font-semibold';
  type Row = { key: string; to: string; title: string; sub: string; when: string; subjectId?: string; k?: IconName };
  const reviewRow = (when: (r: (typeof due)[number]) => string) => (r: (typeof due)[number]): Row => {
    const l = lessonOf(r.lessonId);
    return { key: r.id, to: `/review/${r.id}`, title: r.topic, sub: [l ? SUBJECTS[l.subjectId]?.name : undefined, l?.title].filter(Boolean).join(' · '), when: when(r), subjectId: l?.subjectId };
  };
  const groups: { id: string; title: string; c: string; soft: string; k: IconName; rows: Row[] }[] = [
    { id: 'overdue', title: 'เลยเวลาทบทวน', c: 'var(--rev)', soft: 'var(--rev-soft)', k: 'alert', rows: overdue.map(reviewRow((r) => `เลยมาตั้งแต่ ${fmtDay(r.nextReviewAt)} · ควรทบทวนก่อน`)) },
    {
      id: 'weak', title: 'ทักษะที่ต้องทบทวน', c: 'var(--rev)', soft: 'var(--rev-soft)', k: 'sRev',
      rows: weakSkills.map((g) => ({
        key: g.skill.id,
        to: g.lessonIds[0] ? `/learn/curriculum/${g.lessonIds[0]}` : `/lessons/${g.studyLessonIds[0]}`,
        title: g.skill.title,
        sub: SUBJECTS[g.skill.subjectId as keyof typeof SUBJECTS]?.name ?? '',
        when: g.reason === 'overdue-review' ? 'ถึงเวลาทบทวนแล้ว' : g.reason === 'low-quiz' ? 'คะแนนแบบทดสอบยังไม่ผ่าน' : g.reason === 'check-confused' ? 'เช็กความเข้าใจล่าสุดยังสับสน' : g.reason === 'review-weak' ? 'รอบทบทวนล่าสุดยังไม่แม่น' : 'ยังไม่แม่น',
        subjectId: g.skill.subjectId,
      })),
    },
    { id: 'today', title: 'ถึงรอบวันนี้', c: 'var(--brand-ink)', soft: 'var(--brand-soft)', k: 'refresh', rows: dueToday.map(reviewRow(() => 'ทบทวนพร้อมคำถามทบทวน')) },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 lg:max-w-6xl">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold" style={{ letterSpacing: '.08em', color: 'var(--brand-ink)' }}>ทบทวน</span>
        <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)' }}>ทบทวนก่อนลืม</h1>
        <p className="max-w-[60ch] text-sm" style={{ color: 'var(--ink-2)' }}>ทบทวนสั้น ๆ ตามรอบ ช่วยให้ทักษะที่เรียนแล้วไม่หลุดกลับไป จำได้จนถึงวันสอบ</p>
      </header>

      <div className="grid grid-cols-3 gap-2.5" data-testid="review-summary">
        {[
          { label: 'เลยเวลา', n: overdue.length, c: 'var(--rev)', bg: overdue.length ? 'var(--rev-soft)' : 'var(--surface)', k: 'alert' as IconName },
          { label: 'ถึงรอบวันนี้', n: dueToday.length, c: 'var(--brand-ink)', bg: 'var(--surface)', k: 'refresh' as IconName },
          { label: 'รอบถัดไป', n: upcoming.length, c: 'var(--ink-3)', bg: 'var(--surface)', k: 'calendar' as IconName },
        ].map((r) => (
          <div key={r.label} className="flex min-w-0 flex-col gap-1.5 rounded-[18px] p-3.5" style={{ background: r.bg, border: '1px solid var(--line)' }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: r.c }}><KIcon name={r.k} size={14} /> <span className="truncate">{r.label}</span></span>
            <span className="font-display text-[28px] font-bold leading-none" style={{ color: r.n ? 'var(--ink)' : 'var(--ink-3)' }}>{r.n}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          {due.length > 0 && (
            <Link to={`/review/${due[0].id}`} className="inline-flex min-h-[50px] items-center gap-2.5 self-start rounded-[14px] px-[22px] font-bold transition-transform hover:-translate-y-px" style={{ background: 'var(--brand)', color: 'var(--on-brand)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2),0 10px 20px -10px var(--brand)' }}>
              เริ่มทบทวน {due.length} รายการ <KIcon name="arrowR" size={18} />
            </Link>
          )}
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`rg-${g.id}`} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span style={{ color: g.c }}><KIcon name={g.k} size={20} /></span>
                <h2 id={`rg-${g.id}`} className={h2} style={{ color: 'var(--ink)' }}>{g.title} ({g.rows.length})</h2>
              </div>
              <ul className="flex flex-col overflow-hidden rounded-[20px]" style={{ background: 'var(--surface)', border: `1px solid ${g.id === 'overdue' ? 'var(--rev-soft)' : 'var(--line)'}`, boxShadow: 'var(--shadow)' }}>
                {g.rows.map((r, i) => {
                  const sb = r.subjectId ? subOf(r.subjectId) : null;
                  return (
                    <li key={r.key} style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                      <Link to={r.to} className="flex min-h-[60px] flex-wrap items-center gap-3.5 px-4 py-3.5 hover:bg-[var(--surface-2)]">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: sb?.soft ?? g.soft, color: sb?.c ?? g.c }}><KIcon name={sb?.k ?? g.k} size={20} /></span>
                        <span className="flex min-w-0 flex-[1_1_180px] flex-col">
                          <span className="text-[15px] font-semibold break-words" style={{ color: 'var(--ink)' }}>{r.title}</span>
                          {r.sub && <span className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>{r.sub}</span>}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: g.c }}>{r.when}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {signals.length > 0 && (
            <section aria-labelledby="said-unclear" className="flex flex-col gap-2.5" data-testid="unclear-signals">
              <div className="flex items-center gap-2.5">
                <span style={{ color: 'var(--rev)' }}><KIcon name="help" size={20} /></span>
                <h2 id="said-unclear" className={h2} style={{ color: 'var(--ink)' }}>สิ่งที่คุณเคยบอกว่ายังไม่เข้าใจ</h2>
              </div>
              <ul className="flex flex-col overflow-hidden rounded-[20px]" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
                {signals.map((g, i) => (
                  <li key={`${g.lessonId}|${g.skillId ?? ''}`} style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <Link to={`/learn/curriculum/${g.lessonId}?mode=v2u`} className="flex min-h-[60px] items-start gap-3.5 px-4 py-3.5 hover:bg-[var(--surface-2)]">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--rev-soft)', color: 'var(--rev)' }}><KIcon name="help" size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold break-words" style={{ color: 'var(--ink)' }}>“{g.notes[g.notes.length - 1].text}”</span>
                        <span className="mt-0.5 block text-xs break-words" style={{ color: 'var(--ink-3)' }}>
                          บท {g.lessonTitle} ·{' '}
                          {g.mapping === 'skill' ? `ทักษะ: ${g.skillTitle}` : 'บันทึกส่วนตัว (ยังระบุทักษะไม่ได้แน่ชัด)'}
                          {g.notes.length > 1 && ` · บอกไว้ ${g.notes.length} ครั้ง`}
                        </span>
                      </span>
                      <span className="shrink-0 self-center text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>ทบทวน</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {nothingDue && (
            <section className="flex flex-col items-center gap-3.5 rounded-3xl px-5 py-12 text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--line-2)' }} data-testid="review-empty">
              <span aria-hidden="true" className="grid h-24 w-24 place-items-center rounded-full" style={{ border: '1px dashed var(--line-2)' }}>
                <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', animation: 'v2uPop .5s ease both' }}><KIcon name="check" size={30} w={2.2} /></span>
              </span>
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>วันนี้ไม่มีอะไรต้องทบทวน</h2>
              <p className="max-w-[44ch] text-sm" style={{ color: 'var(--ink-2)' }}>
                เมื่อเรียนจบแต่ละบท V2U จะนัดรอบทบทวนให้เอง{upcoming[0] ? ` รอบถัดไปคือ “${upcoming[0].topic}” ${fmtDay(upcoming[0].nextReviewAt)}` : ''} ระหว่างนี้ไปทำก้าวต่อไปได้เลย
              </p>
              <Link to="/" className="inline-flex min-h-[46px] items-center gap-2 rounded-[14px] px-[18px] font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
                ไปก้าวต่อไปของคุณ <KIcon name="arrowR" size={16} />
              </Link>
            </section>
          )}
        </div>

        <aside aria-label="อื่น ๆ" className="flex flex-col gap-5 lg:sticky lg:top-0">
          <section aria-labelledby="up-h" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span style={{ color: 'var(--ink-3)' }}><KIcon name="calendar" size={20} /></span>
              <h2 id="up-h" className={h2} style={{ color: 'var(--ink)' }}>รอบถัดไป</h2>
            </div>
            {upcoming.length > 0 ? (
              <ul className="grid gap-2.5">
                {upcoming.slice(0, 5).map((r) => {
                  const l = lessonOf(r.lessonId);
                  const sb = l ? subOf(l.subjectId) : null;
                  return (
                    <li key={r.id}>
                      <Link to={`/review/${r.id}`} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-3.5 py-3" style={{ border: '1px dashed var(--line-2)' }}>
                        <span style={{ color: sb?.c ?? 'var(--ink-3)' }}><KIcon name={sb?.k ?? 'calendar'} size={18} /></span>
                        <span className="min-w-0 flex-1 text-sm font-medium break-words" style={{ color: 'var(--ink)' }}>{r.topic}</span>
                        <span className="whitespace-nowrap text-xs" style={{ color: 'var(--ink-3)' }}>{fmtDay(r.nextReviewAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl px-3.5 py-3 text-sm" style={{ border: '1px dashed var(--line-2)', color: 'var(--ink-3)' }}>ยังไม่มีรอบที่นัดไว้</p>
            )}
          </section>
          <Link to="/not-understood" className="flex min-h-[60px] items-center gap-3.5 rounded-[18px] px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--rev-soft)', color: 'var(--rev)' }}><KIcon name="help" size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>สิ่งที่ยังไม่แม่น</span>
              <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>เรื่องที่คุณบันทึกว่ายังไม่เข้าใจ</span>
            </span>
            {unclearCount > 0 && <span className="rounded-full px-2 font-mono text-xs font-semibold" style={{ background: 'var(--rev-soft)', color: 'var(--rev)', lineHeight: '22px' }}>{unclearCount}</span>}
            <KIcon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
