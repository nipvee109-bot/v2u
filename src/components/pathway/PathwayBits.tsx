import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { KIcon, Pill } from '../v2u/kit';
import { LST, ST, stOf, subOf } from '../v2u/tokens';
import type { LstKey } from '../v2u/tokens';
import { useStore } from '../../store/useStore';
import { findStudyLesson, isCurriculumLessonCompleted } from '../../curriculum/engine';
import type { Lesson } from '../../types';
import type { ProfileStatus, SubjectProfile } from '../../diagnostic/types';
import { PROFILE_STATUS_LABEL } from '../../diagnostic/types';
import { SUBJECT_LABEL, SUBJECT_ORDER, describeCounts, getCurriculumMap, subjectProgress } from '../../diagnostic/engine';
import type { LessonGap, PathwayRecommendation } from '../../diagnostic/engine';
import type { CurriculumSubjectId } from '../../curriculum/types';
import { SubjectMark } from '../ui/subject';
import { subjectStyle } from '../ui/subjectStyle';

const TONE: Record<ProfileStatus, string> = {
  ready: 'bg-ok-soft text-ok border-ok/25',
  developing: 'bg-dev-soft text-dev border-dev/25',
  'needs-review': 'bg-rev-soft text-rev border-rev/25',
  'not-assessed': 'bg-none-soft text-none border-none/25',
};

/** Status icon (design reference): filled ✓ · half circle · return arrow · dashed circle */
export function StatusIcon({ status, className = 'h-3.5 w-3.5' }: { status: ProfileStatus; className?: string }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', className, 'aria-hidden': true as const, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (status === 'ready') return <svg {...p}><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="m8 12.3 2.7 2.7L16 9.5" stroke="#fff" strokeWidth="2.4" /></svg>;
  if (status === 'developing') return <svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" /></svg>;
  if (status === 'needs-review') return <svg {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6" /><path d="M4 4v4.6h4.6" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="8.5" strokeDasharray="3 3.2" /></svg>;
}

/** Status in words AND colour AND icon (never colour only). */
export function StatusPill({ status, label }: { status: ProfileStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[status]}`} data-status={status}>
      <StatusIcon status={status} />
      {label ?? PROFILE_STATUS_LABEL[status]}
    </span>
  );
}

/** Stacked bar: share of the subject's skills per status (real counts, not a score). */
export function SubjectBar({ p }: { p: SubjectProfile }) {
  const s = subjectProgress(p);
  const seg = (w: number, c: string) => (w > 0 ? <span className={c} style={{ width: `${w * 100}%` }} /> : null);
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-none-soft" role="img" aria-label={`${p.title}: ${describeCounts(p)}`}>
      {seg(s.ready, 'bg-ok')}
      {seg(s.developing, 'bg-dev')}
      {seg(s.review, 'bg-dest')}
    </div>
  );
}

export function SubjectStatusCard({ p, detailed = false, highlight = false }: { p: SubjectProfile; detailed?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-[var(--surface)] p-4 shadow-card sm:p-5 ${highlight ? 'border-brand-300 ring-2 ring-brand-100' : 'border-[var(--line)]'}`} data-testid="subject-status" data-subject={p.subjectId}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2.5 font-display text-base font-bold text-ink">
          <SubjectMark subjectId={p.subjectId} size="sm" />
          <span className="break-words">{SUBJECT_LABEL[p.subjectId]}</span>
        </p>
        <StatusPill status={p.status} />
      </div>
      <div className="mt-3"><SubjectBar p={p} /></div>
      <p className="mt-2 text-xs text-[var(--ink-2)]">{describeCounts(p)}{p.skipped && p.status === 'not-assessed' ? ' · ข้ามการวัดไว้ก่อน' : ''}</p>
      {detailed && (
        <ul className="mt-3 space-y-1.5">
          {p.skills.map((s) => (
            <li key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words text-[var(--ink)]">{s.title}</span>
              <StatusPill status={s.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "ให้ V2U จัดให้" (design: --hero-2 card) — subject, lesson, time, why; the learner can still change it. */
export function AutoRecommendation({ rec, onManual }: { rec: PathwayRecommendation | null; onManual: () => void }) {
  const [alt, setAlt] = useState(false);
  const sub = rec ? subOf(rec.subjectId) : null;
  return (
    <section
      aria-labelledby="auto-h"
      className="relative flex flex-col gap-3.5 overflow-hidden text-white"
      style={{ padding: 22, borderRadius: 24, background: 'radial-gradient(360px 220px at 100% 0%,rgba(132,150,255,.5),transparent 70%),linear-gradient(140deg,#0b1135 0%,#1a2490 100%)', boxShadow: 'var(--shadow-lg)' }}
      data-testid="auto-pick"
      data-subject={rec?.subjectId}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-[38px] w-[38px] place-items-center rounded-xl" style={{ background: 'rgba(255,255,255,.12)', color: '#f5c04d' }}><KIcon name="sparkle" size={20} /></span>
        <h2 id="auto-h" className="font-display text-[19px] font-bold">ให้ V2U จัดให้</h2>
      </div>
      {rec && sub ? (
        <>
          <div className="flex flex-col gap-1.5 rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}>
            <span className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: '#c9d1ff' }}>
              <span style={{ color: '#fff' }}><KIcon name={sub.k} size={14} /></span> {SUBJECT_LABEL[rec.subjectId]} · ก้าวต่อไปที่แนะนำ · ประมาณ {rec.minutes} นาทีวันนี้
            </span>
            <span className="font-display text-lg font-semibold leading-snug break-words">{rec.lesson.title}</span>
            <span className="text-[13px] break-words" style={{ color: '#d5dbff' }}>แนะนำเพราะ {rec.reasons.join(' · ')}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Link to={`/learn/curriculum/${rec.lesson.id}?from=next&min=${rec.minutes}`} className="inline-flex h-12 items-center gap-2.5 rounded-[14px] bg-[var(--surface)] px-5 font-bold" style={{ color: '#16207a' }}>
              เริ่มบทนี้ <KIcon name="arrowR" size={18} />
            </Link>
            {rec.alternatives.length > 0 && (
              <button type="button" onClick={() => setAlt((x) => !x)} aria-expanded={alt} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold" style={{ border: '1px solid rgba(255,255,255,.25)' }}>
                <KIcon name="refresh" size={16} /> เปลี่ยนสิ่งที่แนะนำ
              </button>
            )}
            <button type="button" onClick={onManual} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold" style={{ color: '#d5dbff' }}>
              <KIcon name="target" size={16} /> เลือกเอง
            </button>
          </div>
          {rec.suggestDiagnostic && (
            <Link to={`/me/diagnostic?subject=${rec.subjectId}`} className="inline-flex min-h-[44px] items-center text-xs font-semibold underline" style={{ color: '#d5dbff' }}>
              หรือวัดพื้นฐาน{SUBJECT_LABEL[rec.subjectId]}ก่อน (ไม่หักคะแนน)
            </Link>
          )}
          {alt && (
            <ul className="flex flex-col gap-2" data-testid="alternatives">
              {rec.alternatives.map((a) => (
                <li key={a.lesson.id}>
                  <Link to={`/learn/curriculum/${a.lesson.id}`} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl px-4 py-2" style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-bold break-words"><KIcon name={subOf(a.lesson.subjectId).k} size={14} /> {a.lesson.title}</span>
                      <span className="block text-xs break-words" style={{ color: '#d5dbff' }}>{a.reason}</span>
                    </span>
                    <KIcon name="chevR" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 rounded-2xl p-3.5" style={{ border: '1px dashed rgba(255,255,255,.25)' }}>
            <span className="font-semibold">ยังจัดบทให้ไม่ได้</span>
            <span className="text-[13px]" style={{ color: '#d5dbff' }}>ตอนนี้ไม่มีบทที่ขาดในเส้นทาง — ไปทบทวนหรือวัดระดับซ้ำได้</span>
          </div>
          <Link to="/me/diagnostic" className="mt-auto inline-flex h-12 items-center gap-2.5 self-start rounded-[14px] bg-[var(--surface)] px-5 font-bold" style={{ color: '#16207a' }}>
            วัดระดับซ้ำ <KIcon name="arrowR" size={18} />
          </Link>
        </>
      )}
    </section>
  );
}

/** Lesson state for the subject list (design LST), from real gaps, store progress and the pathway pick only. */
function lessonState(gap: LessonGap | undefined, study: Lesson | undefined, done: boolean, isRec: boolean): LstKey {
  if (gap?.state === 'blocked') return 'locked';
  if (isRec) return 'rec';
  if (done && gap?.state === 'gap') return 'review';
  if (gap?.state === 'known' || done) return 'done';
  if (study?.status === 'IN PROGRESS') return 'progress';
  if (gap && gap.missingSkills.length > 0 && gap.missingSkills.every((m) => m.status === 'not-assessed')) return 'none';
  return 'ready';
}

/** "ฉันอยากเลือกเอง" — design Subject screen: subject tabs → lesson list with real status (only the chosen subject). */
export function ManualPicker({ subject, onSubject, gaps, recLessonId, profile, onBack }: {
  subject: CurriculumSubjectId | null;
  onSubject: (s: CurriculumSubjectId | null) => void;
  gaps: LessonGap[];
  recLessonId?: string;
  profile?: SubjectProfile;
  onBack: () => void;
}) {
  const storeLessons = useStore((st) => st.lessons);
  const map = getCurriculumMap();
  const s = map.find((x) => x.subjectId === subject);
  const cs = subject ? subOf(subject) : null;
  const rows = s ? s.topics.flatMap(({ topic, lessons }) => lessons.map((x) => ({ topic, ...x }))) : [];
  const doneN = rows.filter((r) => isCurriculumLessonCompleted(r.lesson, storeLessons)).length;
  const st = profile ? ST[stOf(profile.status)] : null;
  return (
    <div className="flex flex-col gap-[22px]" data-testid="manual-pick">
      <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1 self-start text-[13px] font-semibold" style={{ color: 'var(--brand-ink)' }}>
        <KIcon name="chevL" size={16} /> เรียน
      </button>
      <div role="tablist" aria-label="เลือกวิชา" className="flex max-w-full gap-1.5 self-start overflow-x-auto rounded-[14px] p-1" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        {SUBJECT_ORDER.map((id) => {
          const a = subject === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={a} aria-pressed={a} data-subject={id} onClick={() => onSubject(id)}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 text-sm font-semibold transition-colors"
              style={{ background: a ? 'var(--brand)' : 'transparent', color: a ? 'var(--on-brand)' : 'var(--ink-2)' }}>
              <KIcon name={subOf(id).k} size={16} /> {SUBJECT_LABEL[id]}
            </button>
          );
        })}
      </div>
      {s && cs && (
        <>
          <header className="flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px]" style={{ background: cs.soft, color: cs.c }}><KIcon name={cs.k} size={28} /></span>
            <div className="min-w-0 flex-[1_1_220px]">
              <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,1.6vw + 18px,32px)', color: 'var(--ink)' }}>{SUBJECT_LABEL[s.subjectId]}</h1>
              <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{rows.length} บทเรียน · เรียนจบ {doneN} บท</p>
            </div>
            {st && <Pill c={st.c} soft={st.soft} icon={st.k}>{st.label}</Pill>}
          </header>
          <ol className="flex flex-col gap-2.5" data-testid="manual-topics">
            {rows.map(({ topic, lesson, prerequisites }, i) => {
              const gap = gaps.find((g) => g.lesson.id === lesson.id);
              const done = isCurriculumLessonCompleted(lesson, storeLessons);
              const k = lessonState(gap, findStudyLesson(lesson, storeLessons), done, lesson.id === recLessonId);
              const l = LST[k];
              const label = k === 'done' && !done ? 'รู้แล้ว' : k === 'locked' ? `ควรเรียนก่อน: ${prerequisites.map((p) => p.title).join(', ')}` : l.label;
              const rec = k === 'rec', locked = k === 'locked';
              return (
                <li key={lesson.id}>
                  <Link
                    to={`/learn/curriculum/${lesson.id}`}
                    data-lesson={lesson.id}
                    data-state={k}
                    className="flex w-full flex-wrap items-center gap-3.5 p-4 transition-transform hover:-translate-y-px"
                    style={{ borderRadius: 18, background: locked ? 'transparent' : 'var(--surface)', border: rec ? '2px solid var(--brand)' : locked ? '1px dashed var(--line-2)' : '1px solid var(--line)', boxShadow: locked ? 'none' : rec ? '0 0 0 5px var(--brand-soft),var(--shadow)' : 'var(--shadow)', opacity: locked ? 0.82 : 1 }}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-mono text-[13px] font-semibold" style={{ background: k === 'done' ? 'var(--ok-soft)' : rec ? 'var(--brand)' : cs.soft, color: k === 'done' ? 'var(--ok)' : rec ? 'var(--on-brand)' : cs.c }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                      {rec && <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ letterSpacing: '.06em', color: 'var(--brand-ink)' }}><KIcon name="sparkle" size={12} /> V2U แนะนำบทนี้</span>}
                      <span className="text-[15px] font-semibold leading-snug break-words" style={{ color: 'var(--ink)' }}>{lesson.title}</span>
                      <span className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>หัวข้อ {topic.title} · ประมาณ {lesson.estimatedMinutes} นาที</span>
                    </span>
                    <span className="ml-auto max-w-full">
                      <span className="inline-flex min-h-[26px] max-w-full items-center gap-1.5 rounded-full py-0.5 pl-[7px] pr-2.5 text-xs font-semibold" style={{ background: l.soft, color: l.c, border: locked ? '1px solid var(--line-2)' : 'none' }}>
                        <KIcon name={l.k} size={14} /> <span className="break-words">{label}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-3.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {(Object.keys(LST) as LstKey[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5"><span style={{ color: LST[k].c }}><KIcon name={LST[k].k} size={14} /></span>{LST[k].label}</span>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>เลือกบทแล้วเลือกวิธีเรียนได้ในหน้าบท (อ่าน · ดูคลิป · เรียนกับ V2U) — บทที่มีกุญแจเรียนได้ แต่ควรเรียนบทก่อนหน้าก่อน</p>
        </>
      )}
    </div>
  );
}

/** เป้าหมาย → สิ่งที่รู้แล้ว → สิ่งที่ยังขาด → บทที่แนะนำ — one column per subject. */
export function PathwayOverview({
  subjects,
  bySubject,
  goal,
}: {
  subjects: SubjectProfile[];
  bySubject: { subjectId: CurriculumSubjectId; rec: PathwayRecommendation | null }[];
  goal: string;
}) {
  return (
    <section aria-labelledby="route-pathway" className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-card sm:p-6" data-testid="pathway-overview">
      <h2 id="route-pathway" className="font-display text-lg font-bold text-ink">เส้นทางแยกตามวิชา</h2>
      <p className="mt-0.5 text-xs text-ink-3 break-words">🎯 {goal} · แถบสีคือสัดส่วนทักษะที่พร้อม (เขียว) กำลังพัฒนา (น้ำเงิน) ต้องทบทวน (เหลือง) ส่วนสีเทาคือยังไม่ได้วัด — คำนวณจากข้อมูลจริงเท่านั้น</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {subjects.map((p) => {
          const known = p.skills.filter((s) => s.status === 'ready');
          const missing = p.skills.filter((s) => s.status !== 'ready');
          const rec = bySubject.find((b) => b.subjectId === p.subjectId)?.rec;
          return (
            <div key={p.subjectId} className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-surface-2 p-4 pt-5`} data-subject={p.subjectId}>
              <span className={`absolute inset-x-0 top-0 h-1 ${subjectStyle(p.subjectId).fill}`} aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-2.5 font-display font-bold text-ink"><SubjectMark subjectId={p.subjectId} size="sm" /> <span className="break-words">{SUBJECT_LABEL[p.subjectId]}</span></p>
                <StatusPill status={p.status} />
              </div>
              <SubjectBar p={p} />
              <div>
                <p className="text-xs font-semibold text-ok">สิ่งที่รู้แล้ว</p>
                <p className="text-sm text-ink-2 break-words">{known.length ? known.map((s) => s.title).join(', ') : 'ยังไม่มีข้อมูลว่ารู้แล้ว'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-rev">สิ่งที่ยังขาด</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {missing.length ? missing.map((s) => <StatusPill key={s.skillId} status={s.status} label={`${s.title} · ${PROFILE_STATUS_LABEL[s.status]}`} />) : <li className="text-sm text-[var(--ink-2)]">ครบแล้ว</li>}
                </ul>
              </div>
              <div className="mt-auto border-t border-[var(--line)] pt-3">
                <p className="text-xs font-semibold text-ink-3">บทที่แนะนำในวิชานี้</p>
                {rec ? (
                  <Link to={`/learn/curriculum/${rec.lesson.id}`} className="mt-1 flex min-h-[48px] items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--brand-ink)] shadow-card hover:bg-[var(--brand-soft)]">
                    <span className="break-words">{rec.lesson.title}</span> <ChevronRight className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-[var(--ink-2)]">ไม่มีบทที่ขาดในวิชานี้</p>
                )}
                {p.status === 'not-assessed' && (
                  <Link to={`/me/diagnostic?subject=${p.subjectId}`} className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--brand-ink)]">วัดพื้นฐาน{SUBJECT_LABEL[p.subjectId]} (ไม่หักคะแนน)</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
