import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getNextStep, buildNextStepRoute } from '../utils/nextStep';
import { shouldShowOnboarding } from '../utils/onboardingUtils';
import { StudyOnboardingModal } from '../components/onboarding/StudyOnboardingModal';
import { useNextStepParams } from '../hooks/useNextStep';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { usePathway } from '../hooks/usePathway';
import { SUBJECT_LABEL } from '../diagnostic/engine';
import { JourneyStrip } from '../components/pathway/JourneyStrip';
import { TimeBudgetPicker } from '../components/TimeBudgetPicker';
import { getRouteTarget, normalizeStudentProfile } from '../route/engine';
import { LoopStrip, PlanBar } from '../components/ui';
import { KIcon, Pill } from '../components/v2u/kit';
import { ST, stOf, subOf } from '../components/v2u/tokens';
import type { IconName } from '../components/v2u/kit';

/**
 * V2U Home — "ก้าวต่อไปของคุณ".
 * All decision logic lives in getNextStep(); this component only renders it.
 * Layout: journey (where → goal) · today's ONE step · time · status · what's missing.
 */
export function HomePage() {
  const {
    lessons,
    sessions = [],
    learningSessionsHistory = [],
    hasCompletedOnboarding,
    studentProfile,
    setStudentProfile,
    getDueReviewItems,
  } = useStore();
  const budget = normalizeStudentProfile(studentProfile).availableMinutes;
  const { overdue, dueToday } = getDueReviewItems();
  const dueCount = overdue.length + dueToday.length;
  const completed = lessons.filter((l) => l.status === 'COMPLETED').length;

  // Auto-prompt onboarding only for fresh users (state is hydrated synchronously from storage)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() =>
    shouldShowOnboarding({ hasCompletedOnboarding, lessons, sessions, learningSessionsHistory })
  );

  // Single source of truth shared with เส้นทาง and the Roadmap
  const step = getNextStep(useNextStepParams());
  const { start, confirmModal } = useStartNextStep();
  const handleStart = () => start(step);
  const rec = step.curriculum?.recommendedResource;
  const pathway = usePathway();
  const route = buildNextStepRoute(useNextStepParams());
  const diagnostic = useStore((st) => st.diagnostic);
  const needsDiagnostic = !pathway.hasDiagnostic && (diagnostic?.skippedSubjects.length ?? 0) < 3;
  const goalText = studentProfile
    ? [studentProfile.targetUniversity, studentProfile.targetFaculty, studentProfile.targetMajor].filter(Boolean).join(' · ') ||
      `${getRouteTarget(normalizeStudentProfile(studentProfile).targetId)?.title ?? ''} (เส้นทางที่ใช้ตอนนี้)`
    : null;

  const dueItems = [...overdue, ...dueToday];
  const lessonTitle = (id: string) => lessons.find((l) => l.id === id)?.title;
  const card = { background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)', borderRadius: 22, padding: 20 } as const;
  const eyebrow = { color: 'var(--brand-ink)', letterSpacing: '.08em' } as const;
  const summary: { k: IconName; c: string; label: string; value: string }[] = [
    { k: 'nav', c: 'var(--brand-ink)', label: 'ตอนนี้คุณอยู่ที่', value: step.current.label },
    { k: 'cap', c: 'var(--dest-ink)', label: 'เป้าหมาย', value: step.goal.label },
    { k: 'clock', c: 'var(--ink-3)', label: 'เวลาที่เหลือ', value: `${step.goal.detail.split(' · ')[0]} · วันละ ${budget} นาที` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 lg:max-w-6xl">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold" style={eyebrow}>หน้าหลัก</p>
          <h1 className="mt-1 font-display font-bold" style={{ fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)', letterSpacing: '-.01em' }}>ก้าวต่อไปของคุณ</h1>
        </div>
        {/* where I am · goal · time — all from the same next-step data */}
        <dl className="grid gap-3 sm:grid-cols-3 sm:gap-0" data-testid="home-summary">
          {summary.map((x, i) => (
            <div key={x.label} className={`flex min-w-0 items-start gap-2.5 ${i > 0 ? 'sm:border-l sm:pl-5' : ''} sm:pr-5`} style={{ borderColor: 'var(--line-2)' }}>
              <KIcon name={x.k} size={18} style={{ color: x.c, marginTop: 2 }} />
              <div className="min-w-0">
                <dt className="text-xs font-semibold" style={{ color: x.c }}>{x.label}</dt>
                <dd className="text-[15px] font-semibold break-words" style={{ color: 'var(--ink)' }}>{x.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      {/* Today's single next step — design hero */}
      <section
        aria-labelledby="next-step-today"
        className="v2u-hero relative overflow-hidden text-white"
        style={{ borderRadius: 26, padding: 'clamp(20px,2.4vw,36px)', background: 'var(--hero)', boxShadow: 'var(--shadow-lg)' }}
      >
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 hidden sm:block" width="420" height="420" viewBox="0 0 420 420" fill="none">
          {[200, 160, 120, 80].map((r) => <circle key={r} cx="210" cy="210" r={r} stroke="rgba(255,255,255,.07)" strokeWidth="1.5" />)}
        </svg>
        <div className="relative">
          <LoopStrip current="today" onDark />
          <p className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#c9d1ff' }}><KIcon name="nav" size={15} /> วันนี้ควรทำอะไร</p>
          <h2 id="next-step-today" className="mt-1.5 font-display font-bold leading-snug break-words" style={{ fontSize: 'clamp(22px,1.4vw + 16px,30px)' }}>
            {step.todayAction}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {step.minutes !== undefined && (
              <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,.12)' }}>
                <KIcon name="clock" size={14} /> {step.minutes} นาที
              </span>
            )}
            {step.curriculum && (
              <span className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold break-words" style={{ background: 'rgba(255,255,255,.12)' }}>
                <KIcon name="book" size={14} /> {step.curriculum.path}
              </span>
            )}
          </div>

          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed break-words" style={{ color: '#d5dbff' }}>
            <span className="font-semibold text-white">ทำไม: </span>
            {step.reason}
          </p>
          {step.outcome && (
            <p className="mt-2 flex max-w-[62ch] items-start gap-2 text-[15px] break-words" style={{ color: '#d5dbff' }}>
              <KIcon name="target" size={16} style={{ color: '#f5c04d', marginTop: 3 }} />
              <span><span className="font-semibold text-white">ได้อะไร: </span>{step.outcome}</span>
            </p>
          )}

          {step.plan && (
            <div className="mt-5" aria-label="แผนที่ V2U จัดให้">
              <PlanBar onDark segments={step.plan.steps.map((ps) => ({ label: ps.label, minutes: ps.minutes }))} />
            </div>
          )}

          {(rec || (step.curriculum && (step.curriculum.missingPrerequisiteTitles.length > 0 || (!step.outcome && step.curriculum.learningOutcomes.length > 0)))) && (
            <details className="group mt-4 rounded-2xl text-sm" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)' }}>
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 text-[13px] font-semibold text-white">
                <span className="flex items-center gap-2"><KIcon name="help" size={16} /> เรียนจากอะไร และควรรู้อะไรก่อน</span>
                <KIcon name="chevD" size={16} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-2 px-4 pb-4 text-[13px] sm:grid-cols-2" style={{ color: '#d5dbff' }}>
                {rec && (
                  <p className="rounded-xl p-3 break-words" style={{ background: 'rgba(255,255,255,.06)' }}>
                    <span className="block text-xs font-semibold text-white">แนะนำ: {rec.title}</span>
                    {rec.whyV2USelected}
                  </p>
                )}
                {!step.outcome && step.curriculum && step.curriculum.learningOutcomes.length > 0 && (
                  <p className="rounded-xl p-3 break-words" style={{ background: 'rgba(255,255,255,.06)' }}>เรียนจบแล้วจะทำได้: {step.curriculum.learningOutcomes.join(' · ')}</p>
                )}
                {step.curriculum && step.curriculum.missingPrerequisiteTitles.length > 0 && (
                  <p className="rounded-xl p-3 break-words" style={{ background: 'rgba(255,255,255,.06)', color: '#ffd98a' }}>ควรปูพื้นก่อน: {step.curriculum.missingPrerequisiteTitles.join(', ')}</p>
                )}
              </div>
            </details>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="mt-6 flex w-full items-center justify-center gap-2 bg-white px-6 text-base font-bold transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:w-auto"
            style={{ height: 50, borderRadius: 14, color: '#16207a', boxShadow: '0 10px 24px -10px rgba(0,0,0,.5)' }}
          >
            {step.ctaLabel}
            <KIcon name="arrowR" size={20} />
          </button>
          {route && (
            <div className="mt-7 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}>
              <JourneyStrip route={route} onDark />
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 lg:items-start">
        {/* Where on the route */}
        <aside aria-label="เส้นทางของคุณ" style={card} className="flex flex-col gap-4">
          <h2 className="font-display text-[17px] font-bold" style={{ color: 'var(--ink)' }}>คุณอยู่ตรงไหนบนเส้นทาง</h2>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}><KIcon name="nav" size={14} /> ตอนนี้อยู่ตรงไหน</p>
              <p id="home-current" className="mt-1 text-sm font-bold break-words" style={{ color: 'var(--ink)' }}>{step.current.label}</p>
            </div>
            <KIcon name="arrowR" size={16} style={{ color: 'var(--ink-3)', marginTop: 20 }} />
            <div className="min-w-0 text-right">
              <p className="flex items-center justify-end gap-1.5 text-xs font-semibold" style={{ color: 'var(--dest-ink)' }}><KIcon name="flag" size={14} /> เป้าหมายคืออะไร</p>
              <p id="home-goal" className="mt-1 text-sm font-bold break-words" style={{ color: 'var(--ink)' }}>{step.goal.label}</p>
            </div>
          </div>
          {route && (
            <ol className="flex flex-col">
              {route.steps.map((s, i) => {
                const now = s.requirement.id === route.currentRequirementId;
                const done = s.status === 'done';
                return (
                  <li key={s.requirement.id} className="relative flex gap-3 pb-3 last:pb-0" aria-current={now ? 'step' : undefined}>
                    {i < route.steps.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-6 bottom-0 w-0.5" style={{ background: done ? 'var(--brand)' : 'var(--line-2)' }} />}
                    <span
                      aria-hidden="true"
                      className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={done ? { background: 'var(--brand)', color: 'var(--on-brand)' } : now ? { background: 'var(--surface)', border: '3px solid var(--brand)', boxShadow: '0 0 0 4px var(--brand-soft)' } : { background: 'var(--surface)', border: '2px dashed var(--line-2)' }}
                    >
                      {done && <KIcon name="check" size={13} w={3} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words" style={{ color: now ? 'var(--brand-ink)' : 'var(--ink)' }}>{s.requirement.title}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{now ? 'คุณอยู่ที่นี่' : done ? 'ผ่านแล้ว' : s.status === 'locked' ? 'รอขั้นก่อนหน้า' : s.status === 'in-progress' ? 'กำลังทำ' : 'ยังไม่เริ่ม'}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }} role="progressbar" aria-valuenow={step.current.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`ความคืบหน้าในเส้นทาง ${step.current.progressPercent}%`}>
              <div className="h-full rounded-full" style={{ width: `${step.current.progressPercent}%`, background: 'var(--brand)' }} />
            </div>
            <p className="mt-1.5 text-xs break-words" style={{ color: 'var(--ink-3)' }}>{step.current.detail}</p>
          </div>
          {!studentProfile && (
            <Link to="/route" className="inline-flex min-h-[44px] items-center text-[13px] font-semibold underline" style={{ color: 'var(--brand-ink)' }}>
              บอกระดับชั้นและสาขาของคุณ เพื่อให้เส้นทางตรงกับคุณ
            </Link>
          )}
          <Link to="/route" className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold" style={{ color: 'var(--brand-ink)' }}>ดูเส้นทางทั้งหมด <KIcon name="chevR" size={14} /></Link>
        </aside>

        {/* Skill status per subject */}
        <section aria-labelledby="home-now" style={card} className="flex flex-col gap-4" data-testid="home-now">
          <div>
            <h2 id="home-now" className="font-display text-[17px] font-bold" style={{ color: 'var(--ink)' }}>การวัดระดับของฉัน</h2>
            <p className="mt-0.5 text-xs break-words" style={{ color: 'var(--ink-3)' }}>
              {goalText ? <>เป้าหมาย: {goalText}</> : <>ยังไม่ได้ตั้งเป้าหมาย · <Link to="/me" className="font-semibold" style={{ color: 'var(--brand-ink)' }}>ตั้งเป้าหมาย</Link></>}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {pathway.subjects.map((p) => {
              const sub = subOf(p.subjectId);
              const st = ST[stOf(p.status)];
              return (
                <li key={p.subjectId} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: sub.soft, color: sub.c }}><KIcon name={sub.k} size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold break-words" style={{ color: 'var(--ink)' }}>{SUBJECT_LABEL[p.subjectId]}</p>
                    <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`พร้อม ${p.counts.ready} · กำลังพัฒนา ${p.counts.developing} · ต้องทบทวน ${p.counts['needs-review']} · ยังไม่ได้วัด ${p.counts['not-assessed']}`}>
                      {p.skills.map((sk, i) => <span key={i} className="h-[5px] flex-1 rounded-full" style={{ background: ST[stOf(sk.status)].c, opacity: sk.status === 'not-assessed' ? 0.35 : 1 }} />)}
                    </div>
                  </div>
                  <span data-status={p.status}><Pill c={st.c} soft={st.soft} icon={st.k} size="sm">{st.label}</Pill></span>
                </li>
              );
            })}
          </ul>
          {needsDiagnostic && (
            <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: 'var(--brand-soft)' }} data-testid="diagnostic-prompt">
              <p className="text-[13px]" style={{ color: 'var(--brand-ink)' }}>
                <b className="font-semibold">ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน</b> — ไม่หักคะแนน ใช้จัดเส้นทางให้ตรงกับคุณ ข้ามได้
              </p>
              <Link to="/me/diagnostic" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
                <KIcon name="gauge" size={16} /> วัดระดับ
              </Link>
            </div>
          )}
        </section>

        {/* Review today */}
        <section aria-labelledby="home-review" style={card} className="flex flex-col gap-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--rev-soft)', color: 'var(--rev)' }}><KIcon name="refresh" size={20} /></span>
            <h2 id="home-review" className="flex-1 font-display text-[17px] font-bold" style={{ color: 'var(--ink)' }}>ทบทวนวันนี้</h2>
            <span className="font-mono text-lg font-bold" style={{ color: dueCount > 0 ? 'var(--rev)' : 'var(--ink-3)' }}>{dueCount}</span>
          </div>
          {dueCount > 0 ? (
            <>
              <ul className="flex flex-col gap-2">
                {dueItems.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-semibold break-words" style={{ color: 'var(--ink)' }}>{r.topic}</p>
                    {lessonTitle(r.lessonId) && <p className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>{lessonTitle(r.lessonId)}</p>}
                  </li>
                ))}
              </ul>
              <Link to="/review" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-bold" style={{ border: '1.5px solid var(--line-2)', color: 'var(--ink)' }}>
                เริ่มทบทวน <KIcon name="arrowR" size={16} />
              </Link>
            </>
          ) : (
            <p className="rounded-2xl px-4 py-5 text-center text-sm" style={{ border: '1.5px dashed var(--line-2)', color: 'var(--ink-3)' }}>
              วันนี้ไม่มีอะไรต้องทบทวน
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>เรียนจบแล้ว {completed}/{lessons.length} บท · ความคืบหน้าในเส้นทาง {step.current.progressPercent}%</p>
        </section>

        {/* What is missing */}
        <section aria-labelledby="home-missing" style={card} className="flex flex-col gap-3 md:col-span-1 xl:col-span-2">
          <div className="flex items-center gap-2">
            <KIcon name="alert" size={18} style={{ color: 'var(--rev)' }} />
            <h2 id="home-missing" className="font-display text-[17px] font-bold" style={{ color: 'var(--ink)' }}>ยังขาดอะไร</h2>
          </div>
          {step.missing.length > 0 ? (
            <ul className="flex flex-col">
              {step.missing.map((m) => (
                <li key={m} className="flex min-h-[44px] items-center gap-3 border-b py-2 text-sm last:border-0" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--rev)' }} aria-hidden="true" />
                  <span className="break-words">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
              <KIcon name="sOk" size={16} /> ไม่มีอะไรค้าง — คุณอยู่ในเส้นทางที่ดี
            </p>
          )}
        </section>

        <section aria-label="เวลาที่มีวันนี้" style={card}>
          <TimeBudgetPicker label="วันนี้มีเวลาเท่าไหร่?" value={budget} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        </section>
      </div>

      <StudyOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        lessons={lessons}
        onStartFirstLesson={() => start(step)}
      />

      {confirmModal}
    </div>
  );
}
