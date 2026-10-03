import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Shuffle, Hand, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import type { ProfileStatus, SubjectProfile } from '../../diagnostic/types';
import { PROFILE_STATUS_LABEL } from '../../diagnostic/types';
import { SUBJECT_EMOJI, SUBJECT_LABEL, SUBJECT_ORDER, describeCounts, getCurriculumMap, subjectProgress } from '../../diagnostic/engine';
import type { LessonGap, PathwayRecommendation } from '../../diagnostic/engine';
import type { CurriculumSubjectId } from '../../curriculum/types';
import { SubjectMark, SubjectTag } from '../ui/subject';
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
    <div className={`rounded-2xl border bg-white p-4 shadow-card sm:p-5 ${highlight ? 'border-brand-300 ring-2 ring-brand-100' : 'border-ink/[0.08]'}`} data-testid="subject-status" data-subject={p.subjectId}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2.5 font-display text-base font-bold text-ink">
          <SubjectMark subjectId={p.subjectId} size="sm" />
          <span className="break-words">{SUBJECT_LABEL[p.subjectId]}</span>
        </p>
        <StatusPill status={p.status} />
      </div>
      <div className="mt-3"><SubjectBar p={p} /></div>
      <p className="mt-2 text-xs text-slate-600">{describeCounts(p)}{p.skipped && p.status === 'not-assessed' ? ' · ข้ามการวัดไว้ก่อน' : ''}</p>
      {detailed && (
        <ul className="mt-3 space-y-1.5">
          {p.skills.map((s) => (
            <li key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words text-slate-800">{s.title}</span>
              <StatusPill status={s.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "✨ ให้ V2U จัดให้" — subject, lesson, time, why; the learner can still change it. */
export function AutoRecommendation({ rec, onManual }: { rec: PathwayRecommendation | null; onManual: () => void }) {
  const [alt, setAlt] = useState(false);
  if (!rec) {
    return (
      <div className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-5" data-testid="auto-pick">
        <p className="text-sm text-slate-700">ตอนนี้ไม่มีบทที่ขาดในเส้นทาง — ไปทบทวนหรือวัดระดับซ้ำได้</p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-5 text-white sm:p-6" data-testid="auto-pick" data-subject={rec.subjectId}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-100"><Sparkles className="h-4 w-4" /> ก้าวต่อไปที่แนะนำ</p>
      <p className="mt-2 font-display text-xl font-bold break-words sm:text-2xl">{rec.lesson.title}</p>
      <p className="mt-2 flex flex-wrap gap-1.5">
        <SubjectTag subjectId={rec.subjectId} label={SUBJECT_LABEL[rec.subjectId]} onDark />
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs font-semibold"><Clock className="h-3.5 w-3.5" /> ประมาณ {rec.minutes} นาทีวันนี้</span>
      </p>
      <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/95 break-words">แนะนำเพราะ {rec.reasons.join(' · ')}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link to={`/learn/curriculum/${rec.lesson.id}?from=next&min=${rec.minutes}`} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-brand-800">
          เริ่มเรียน <ArrowRight className="h-4 w-4" />
        </Link>
        {rec.alternatives.length > 0 && (
          <button type="button" onClick={() => setAlt((x) => !x)} aria-expanded={alt} className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-white/30 px-4 text-sm font-semibold">
            <Shuffle className="h-4 w-4" /> เปลี่ยนสิ่งที่แนะนำ
          </button>
        )}
        <button type="button" onClick={onManual} className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white/90">
          <Hand className="h-4 w-4" /> เลือกเอง
        </button>
      </div>
      {rec.suggestDiagnostic && (
        <Link to={`/me/diagnostic?subject=${rec.subjectId}`} className="mt-3 inline-flex min-h-[44px] items-center text-xs font-semibold text-white underline">
          หรือวัดพื้นฐาน{SUBJECT_LABEL[rec.subjectId]}ก่อน (ไม่หักคะแนน)
        </Link>
      )}
      {alt && (
        <ul className="mt-3 space-y-2" data-testid="alternatives">
          {rec.alternatives.map((a) => (
            <li key={a.lesson.id}>
              <Link to={`/learn/curriculum/${a.lesson.id}`} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2 hover:bg-white/15">
                <span className="min-w-0">
                  <span className="block text-sm font-bold break-words">{SUBJECT_EMOJI[a.lesson.subjectId]} {a.lesson.title}</span>
                  <span className="block text-xs text-white/80 break-words">{a.reason}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "ฉันอยากเลือกเอง": subject → topic → lesson (only the chosen subject is shown). */
export function ManualPicker({ subject, onSubject, gaps }: { subject: CurriculumSubjectId | null; onSubject: (s: CurriculumSubjectId | null) => void; gaps: LessonGap[] }) {
  const map = getCurriculumMap();
  const s = map.find((x) => x.subjectId === subject);
  const stateOf = (id: string) => gaps.find((g) => g.lesson.id === id)?.state;
  return (
    <div className="space-y-4" data-testid="manual-pick">
      <div>
        <p className="font-display text-sm font-bold text-ink">📚 เลือกวิชา</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SUBJECT_ORDER.map((id) => (
            <button key={id} type="button" aria-pressed={subject === id} data-subject={id} onClick={() => onSubject(subject === id ? null : id)}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl border-2 px-4 text-left font-display text-sm font-bold shadow-card transition-colors ${subject === id ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-ink/[0.08] bg-white text-ink hover:border-brand-300'}`}>
              <SubjectMark subjectId={id} />
              <span className="min-w-0 break-words">{SUBJECT_LABEL[id]}</span>
            </button>
          ))}
        </div>
      </div>
      {s && (
        <div className="space-y-3" data-testid="manual-topics">
          {s.topics.map(({ topic, lessons }) => (
            <section key={topic.id} className="rounded-2xl border border-ink/[0.08] bg-white p-4 shadow-card">
              <p className="text-xs font-semibold text-ink-3">หัวข้อ</p>
              <p className="font-display text-sm font-bold text-ink">{topic.title}</p>
              <ul className="mt-2 divide-y divide-ink/[0.06]">
                {lessons.map(({ lesson, prerequisites }) => {
                  const st = stateOf(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link to={`/learn/curriculum/${lesson.id}`} className="flex min-h-[56px] items-center gap-3 py-2" data-lesson={lesson.id}>
                        {st === 'known' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" /> : st === 'blocked' ? <Lock className="h-5 w-5 shrink-0 text-none" /> : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-brand-500" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink break-words">{lesson.title}</span>
                          <span className="block text-xs text-slate-500 break-words">
                            {lesson.estimatedMinutes} นาที
                            {st === 'known' ? ' · รู้แล้ว' : st === 'blocked' ? ` · ควรเรียนก่อน: ${prerequisites.map((p) => p.title).join(', ')}` : ' · พร้อมเรียน'}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-xs text-slate-500">เลือกบทแล้วเลือกวิธีเรียนได้ในหน้าบท (อ่าน · ดูคลิป · เรียนกับ V2U) — บทที่มีกุญแจเรียนได้ แต่ควรเรียนบทก่อนหน้าก่อน</p>
        </div>
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
    <section aria-labelledby="route-pathway" className="rounded-3xl border border-ink/[0.08] bg-white p-4 shadow-card sm:p-6" data-testid="pathway-overview">
      <h2 id="route-pathway" className="font-display text-lg font-bold text-ink">เส้นทางแยกตามวิชา</h2>
      <p className="mt-0.5 text-xs text-ink-3 break-words">🎯 {goal} · แถบสีคือสัดส่วนทักษะที่พร้อม (เขียว) กำลังพัฒนา (น้ำเงิน) ต้องทบทวน (เหลือง) ส่วนสีเทาคือยังไม่ได้วัด — คำนวณจากข้อมูลจริงเท่านั้น</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {subjects.map((p) => {
          const known = p.skills.filter((s) => s.status === 'ready');
          const missing = p.skills.filter((s) => s.status !== 'ready');
          const rec = bySubject.find((b) => b.subjectId === p.subjectId)?.rec;
          return (
            <div key={p.subjectId} className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-ink/[0.06] bg-surface-2 p-4 pt-5`} data-subject={p.subjectId}>
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
                  {missing.length ? missing.map((s) => <StatusPill key={s.skillId} status={s.status} label={`${s.title} · ${PROFILE_STATUS_LABEL[s.status]}`} />) : <li className="text-sm text-slate-600">ครบแล้ว</li>}
                </ul>
              </div>
              <div className="mt-auto border-t border-ink/[0.08] pt-3">
                <p className="text-xs font-semibold text-ink-3">บทที่แนะนำในวิชานี้</p>
                {rec ? (
                  <Link to={`/learn/curriculum/${rec.lesson.id}`} className="mt-1 flex min-h-[48px] items-center justify-between gap-2 rounded-xl border border-ink/[0.06] bg-white px-3 py-2 text-sm font-semibold text-brand-800 shadow-card hover:bg-brand-50">
                    <span className="break-words">{rec.lesson.title}</span> <ChevronRight className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">ไม่มีบทที่ขาดในวิชานี้</p>
                )}
                {p.status === 'not-assessed' && (
                  <Link to={`/me/diagnostic?subject=${p.subjectId}`} className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-brand-700">วัดพื้นฐาน{SUBJECT_LABEL[p.subjectId]} (ไม่หักคะแนน)</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
