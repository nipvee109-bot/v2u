import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, GraduationCap, MapPin, Flag, ListChecks, ArrowRight, Clock, Trophy, RotateCcw, Gauge, CheckCircle2, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getNextStep, buildNextStepRoute } from '../utils/nextStep';
import { shouldShowOnboarding } from '../utils/onboardingUtils';
import { StudyOnboardingModal } from '../components/onboarding/StudyOnboardingModal';
import { useNextStepParams } from '../hooks/useNextStep';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { usePathway } from '../hooks/usePathway';
import { StatusPill } from '../components/pathway/PathwayBits';
import { SUBJECT_LABEL } from '../diagnostic/engine';
import { SubjectMark } from '../components/ui/subject';
import { JourneyStrip } from '../components/pathway/JourneyStrip';
import { TimeBudgetPicker } from '../components/TimeBudgetPicker';
import { getRouteTarget, normalizeStudentProfile } from '../route/engine';
import { LoopStrip, PlanBar, ProgressBar, Section, Stat, Surface, Chip } from '../components/ui';

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

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <header className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-700">จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-[30px]">ก้าวต่อไปของคุณ</h1>
        </div>
        {/* where I am · goal · time — all from the same next-step data */}
        <dl className="grid gap-3 rounded-2xl border border-ink/[0.08] bg-white/80 p-3.5 shadow-card backdrop-blur-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink/[0.08] sm:p-0" data-testid="home-summary">
          <div className="flex items-start gap-2.5 sm:p-4">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="min-w-0"><dt className="text-[11px] font-semibold text-brand-700">ตอนนี้คุณอยู่ที่</dt><dd className="text-sm font-semibold text-ink break-words">{step.current.label}</dd></div>
          </div>
          <div className="flex items-start gap-2.5 sm:p-4">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-dest" aria-hidden="true" />
            <div className="min-w-0"><dt className="text-[11px] font-semibold text-dest-ink">เป้าหมาย</dt><dd className="text-sm font-semibold text-ink break-words">{step.goal.label}</dd></div>
          </div>
          <div className="flex items-start gap-2.5 sm:p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
            <div className="min-w-0"><dt className="text-[11px] font-semibold text-ink-3">เวลา</dt><dd className="text-sm font-semibold text-ink break-words">{step.goal.detail.split(' · ')[0]} · วันละ {budget} นาที</dd></div>
          </div>
        </dl>
      </header>

      {/* Mobile: one column in reading order. Desktop: next step + what is missing | route + progress */}
      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
      {/* Today's single next step */}
      <section
        aria-labelledby="next-step-today"
        className="order-1 lg:order-none relative overflow-hidden rounded-3xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-5 text-white shadow-lg shadow-brand-900/20 sm:p-7"
      >
        <LoopStrip current="today" onDark />
        <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-100"><Navigation className="h-3.5 w-3.5" aria-hidden="true" /> วันนี้ควรทำอะไร</p>
        <h2 id="next-step-today" className="mt-1 font-display text-xl font-bold leading-snug sm:text-[28px] break-words">
          {step.todayAction}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {step.minutes !== undefined && (
            <Chip tone="onDark">
              <Clock className="h-3.5 w-3.5" /> {step.minutes} นาที
            </Chip>
          )}
          {step.curriculum && <span className="text-xs text-brand-100 break-words">{step.curriculum.path}</span>}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/90 break-words">
          <span className="font-semibold text-white">ทำไม: </span>
          {step.reason}
        </p>
        {step.outcome && (
          <p className="mt-2 flex items-start gap-2 text-sm text-white/90">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span className="break-words">
              <span className="font-semibold text-white">ได้อะไร: </span>
              {step.outcome}
            </span>
          </p>
        )}

        {step.plan && (
          <div className="mt-4" aria-label="แผนที่ V2U จัดให้">
            <PlanBar onDark segments={step.plan.steps.map((ps) => ({ label: ps.label, minutes: ps.minutes }))} />
          </div>
        )}

        {(rec || (step.curriculum && (step.curriculum.missingPrerequisiteTitles.length > 0 || (!step.outcome && step.curriculum.learningOutcomes.length > 0)))) && (
          <details className="group mt-4 rounded-2xl bg-white/10 text-sm">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3.5 text-xs font-semibold text-white">
              เรียนจากอะไร และควรรู้อะไรก่อน
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="space-y-1.5 px-3.5 pb-3.5 text-xs text-white/85">
              {rec && (
                <p className="break-words">
                  <span className="font-semibold text-white">แนะนำ: </span>
                  {rec.title} — {rec.whyV2USelected}
                </p>
              )}
              {!step.outcome && step.curriculum && step.curriculum.learningOutcomes.length > 0 && (
                <p className="break-words">เรียนจบแล้วจะทำได้: {step.curriculum.learningOutcomes.join(' · ')}</p>
              )}
              {step.curriculum && step.curriculum.missingPrerequisiteTitles.length > 0 && (
                <p className="text-amber-200 break-words">ควรปูพื้นก่อน: {step.curriculum.missingPrerequisiteTitles.join(', ')}</p>
              )}
            </div>
          </details>
        )}

        <button
          type="button"
          onClick={handleStart}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-bold text-brand-800 shadow-md transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:w-auto"
        >
          {step.ctaLabel}
          <ArrowRight className="h-5 w-5" />
        </button>
              {route && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <JourneyStrip route={route} onDark />
          </div>
        )}
      </section>

      <section aria-labelledby="home-now" className="order-2 lg:order-none rounded-2xl border border-ink/[0.08] bg-white p-4 shadow-card sm:p-5" data-testid="home-now">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="home-now" className="text-base font-bold text-ink">📊 ตอนนี้</h2>
          <p className="text-xs text-slate-600 break-words">
            🎯 {goalText ?? <span className="text-slate-500">ยังไม่ได้ตั้งเป้าหมาย · <Link to="/me" className="font-semibold text-brand-700">ตั้งเป้าหมาย</Link></span>}
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {pathway.subjects.map((p) => (
            <li key={p.subjectId} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink"><SubjectMark subjectId={p.subjectId} size="sm" /> <span className="break-words">{SUBJECT_LABEL[p.subjectId]}</span></span>
              <StatusPill status={p.status} />
            </li>
          ))}
        </ul>
        {needsDiagnostic && (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="diagnostic-prompt">
            <p className="text-sm text-brand-900">
              <b className="font-semibold">ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน</b> — ไม่หักคะแนน ใช้จัดเส้นทางให้ตรงกับคุณ ข้ามได้
            </p>
            <Link to="/me/diagnostic" className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-2xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700">
              วัดระดับ
            </Link>
          </div>
        )}
      </section>

      <Section className="order-5 lg:order-none"
        title={
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-amber-600" />
            <span id="home-missing">ยังขาดอะไร</span>
          </span>
        }
        action={
          <Link to="/route" className="inline-flex min-h-[44px] items-center text-xs font-semibold text-brand-700">
            ดูเส้นทางทั้งหมด
          </Link>
        }
      >
        {step.missing.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-ink/[0.08] bg-white shadow-card">
            {step.missing.map((m) => (
              <li key={m} className="flex min-h-[48px] items-center gap-3 px-4 py-2.5 text-sm text-slate-800">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="break-words">{m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Surface tone="good">
            <p className="text-sm text-emerald-900">ไม่มีอะไรค้าง — คุณอยู่ในเส้นทางที่ดี</p>
          </Surface>
        )}
      </Section>

        </div>
        <aside aria-label="เส้นทางและความคืบหน้า" className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-6">
      {/* Journey: where I am → where I'm going */}
      <Surface as="section" aria-label="เส้นทางของคุณ" padded={false} className="order-2 lg:order-none p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-brand-600" /> ตอนนี้อยู่ตรงไหน
            </p>
            <p id="home-current" className="mt-1 text-sm font-bold text-ink break-words">{step.current.label}</p>
          </div>
          <ArrowRight className="mt-5 h-4 w-4 text-slate-300" aria-hidden="true" />
          <div className="min-w-0 text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-slate-500">
              <Flag className="h-3.5 w-3.5 text-emerald-600" /> เป้าหมายคืออะไร
            </p>
            <p id="home-goal" className="mt-1 text-sm font-bold text-ink break-words">{step.goal.label}</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={step.current.progressPercent} label={`ความคืบหน้าในเส้นทาง ${step.current.progressPercent}%`} />
          <p className="mt-1.5 text-xs text-slate-500 break-words">{step.current.detail}</p>
        </div>
        {!studentProfile && (
          <Link to="/route" className="mt-2 inline-flex min-h-[32px] items-center text-xs font-semibold text-brand-700 underline">
            บอกระดับชั้นและสาขาของคุณ เพื่อให้เส้นทางตรงกับคุณ
          </Link>
        )}
      </Surface>

      <Surface as="section" aria-label="เวลาที่มีวันนี้" padded={false} className="order-3 lg:order-none p-4">
        <TimeBudgetPicker label="วันนี้มีเวลาเท่าไหร่?" value={budget} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
      </Surface>

      <Section title="ภาพรวมตอนนี้" id="home-status" className="order-4 lg:order-none">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat icon={Gauge} label="ความคืบหน้า" value={`${step.current.progressPercent}%`} />
          <Stat icon={CheckCircle2} tone="good" label="เรียนจบ" value={`${completed}/${lessons.length}`} hint="บท" />
          <Stat icon={RotateCcw} tone={dueCount > 0 ? 'warn' : 'plain'} label="ทบทวนวันนี้" value={dueCount} hint={dueCount > 0 ? 'ถึงรอบแล้ว' : 'ไม่มีค้าง'} />
        </div>
      </Section>

        </aside>
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
