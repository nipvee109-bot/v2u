import { useState } from 'react';
import { MapPin, Flag, ListChecks, Sparkles, Lightbulb, ArrowRight, Clock, Trophy } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getNextStep } from '../utils/nextStep';
import { shouldShowOnboarding } from '../utils/onboardingUtils';
import { StudyOnboardingModal } from '../components/onboarding/StudyOnboardingModal';
import { useNextStepParams } from '../hooks/useNextStep';
import { useStartNextStep } from '../hooks/useStartNextStep';
import { TimeBudgetPicker } from '../components/TimeBudgetPicker';
import { normalizeStudentProfile } from '../route/engine';

/**
 * V2U Home — "ก้าวต่อไปของคุณ".
 * All decision logic lives in getNextStep(); this component only renders it.
 */
export function HomePage() {
  const {
    lessons,
    sessions = [],
    learningSessionsHistory = [],
    hasCompletedOnboarding,
    studentProfile,
    setStudentProfile,
  } = useStore();
  const budget = normalizeStudentProfile(studentProfile).availableMinutes;

  // Auto-prompt onboarding only for fresh users (state is hydrated synchronously from storage)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() =>
    shouldShowOnboarding({ hasCompletedOnboarding, lessons, sessions, learningSessionsHistory })
  );

  // Single source of truth shared with เส้นทาง and the Roadmap
  const step = getNextStep(useNextStepParams());
  const { start, confirmModal } = useStartNextStep();
  const handleStart = () => start(step);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="text-xs font-bold text-blue-700">V2U · เส้นทางสายอาชีพสู่มหาวิทยาลัย</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">ก้าวต่อไปของคุณ</h1>
        <p className="mt-1 text-sm text-slate-600">จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ</p>
      </header>

      {/* Today's single next step */}
      <section
        aria-labelledby="next-step-today"
        className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-5 sm:p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-blue-100">
          <Sparkles className="h-4 w-4" />
          <span>วันนี้ควรทำอะไร</span>
        </div>
        <h2 id="next-step-today" className="mt-2 text-lg sm:text-xl font-extrabold leading-snug">
          {step.todayAction}
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-blue-100">
          {step.minutes !== undefined && (
            <span className="flex items-center gap-1 font-bold text-white">
              <Clock className="h-3.5 w-3.5" /> {step.minutes} นาที
            </span>
          )}
          {step.curriculum && <span>{step.curriculum.path}</span>}
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-sm text-blue-50">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-bold">ทำไม: </span>
            {step.reason}
            {step.curriculum?.recommendedResource && (
              <span className="mt-1 block text-xs text-blue-100">
                แนะนำ: {step.curriculum.recommendedResource.title} — {step.curriculum.recommendedResource.whyV2USelected}
              </span>
            )}
            {!step.outcome && step.curriculum && step.curriculum.learningOutcomes.length > 0 && (
              <span className="mt-1 block text-xs text-blue-100">
                เรียนจบแล้วจะทำได้: {step.curriculum.learningOutcomes.join(' · ')}
              </span>
            )}
            {step.curriculum && step.curriculum.missingPrerequisiteTitles.length > 0 && (
              <span className="mt-1 block text-xs text-amber-100">
                ควรปูพื้นก่อน: {step.curriculum.missingPrerequisiteTitles.join(', ')}
              </span>
            )}
          </p>
        </div>
        {step.outcome && (
          <p className="mt-2 flex items-start gap-2 text-sm text-blue-50">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-bold">ได้อะไร: </span>
              {step.outcome}
            </span>
          </p>
        )}
        {step.plan && (
          <ol className="mt-2 space-y-0.5 text-xs text-blue-100" aria-label="แผนที่ V2U จัดให้">
            {step.plan.steps.map((ps, i) => (
              <li key={`${ps.kind}-${i}`}>
                {i + 1}. {ps.label} — {ps.minutes} นาที
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          onClick={handleStart}
          className="mt-4 flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 min-h-[48px] text-base font-extrabold text-blue-800 shadow-md transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          {step.ctaLabel}
          <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      <section aria-label="เวลาที่มีวันนี้" className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <TimeBudgetPicker
          label="วันนี้มีเวลาเท่าไหร่?"
          value={budget}
          onChange={(m) => setStudentProfile({ availableMinutes: m })}
        />
      </section>

      {/* Where am I / target / what's missing */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="home-current" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span>ตอนนี้อยู่ตรงไหน</span>
          </div>
          <p id="home-current" className="mt-1.5 text-base font-bold text-slate-900">{step.current.label}</p>
          <p className="mt-0.5 text-xs text-slate-600">{step.current.detail}</p>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${step.current.progressPercent}%` }} />
          </div>
        </section>

        <section aria-labelledby="home-goal" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Flag className="h-4 w-4 text-emerald-600" />
            <span>เป้าหมายคืออะไร</span>
          </div>
          <p id="home-goal" className="mt-1.5 text-base font-bold text-slate-900">{step.goal.label}</p>
          <p className="mt-0.5 text-xs text-slate-600">{step.goal.detail}</p>
        </section>

        <section aria-labelledby="home-missing" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <ListChecks className="h-4 w-4 text-amber-600" />
            <span id="home-missing">ยังขาดอะไร</span>
          </div>
          {step.missing.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {step.missing.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-700">ไม่มีอะไรค้าง — คุณอยู่ในเส้นทางที่ดี</p>
          )}
        </section>
      </div>

      <StudyOnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} lessons={lessons} />

      {confirmModal}
    </div>
  );
}
