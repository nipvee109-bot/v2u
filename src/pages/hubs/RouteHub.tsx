import { JourneyStrip } from '../../components/pathway/JourneyStrip';
import { usePathway } from '../../hooks/usePathway';
import { PathwayOverview } from '../../components/pathway/PathwayBits';
import { useState } from 'react';
import { Map, Target, CalendarDays, ArrowRight, Clock, Lightbulb, Trophy } from 'lucide-react';
import { KIcon, Pill } from '../../components/v2u/kit';
import type { IconName } from '../../components/v2u/kit';
import { subOf } from '../../components/v2u/tokens';
import { useStore } from '../../store/useStore';
import { buildNextStepRoute } from '../../utils/nextStep';
import { buildRoadmap } from '../../roadmap/engine';
import type { RoadmapAction } from '../../roadmap/types';
import { useNextStepParams } from '../../hooks/useNextStep';
import { useStartNextStep } from '../../hooks/useStartNextStep';
import { EDUCATION_LEVELS } from '../../route/types';
import type { EducationLevel, RequirementStatus } from '../../route/types';
import { VOCATIONAL_PROGRAMS } from '../../route/data';
import { TimeBudgetPicker } from '../../components/TimeBudgetPicker';
import { HorizonPicker } from '../../components/HorizonPicker';
import { ChecklistAnswerControl } from '../../components/ChecklistAnswerControl';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSubjectSkillGaps, SKILL_STATUS_LABEL } from '../../skills/engine';
import type { SkillStatus } from '../../skills/engine';
import { HubLinkList } from '../../components/navigation/HubLinkList';
import { LoopStrip, PlanBar, ProgressBar } from '../../components/ui';

const SKILL_STATUS_ORDER: SkillStatus[] = ['ready', 'developing', 'needs-review', 'not-learned'];
const SKILL_DOT: Record<SkillStatus, string> = {
  ready: 'var(--ok)',
  developing: 'var(--dev)',
  'needs-review': 'var(--rev)',
  'not-learned': 'var(--none)',
};

const STATUS_UI: Record<RequirementStatus, { label: string; k: IconName; c: string; soft: string }> = {
  done: { label: 'ผ่านแล้ว', k: 'sOk', c: 'var(--ok)', soft: 'var(--ok-soft)' },
  'in-progress': { label: 'กำลังทำ', k: 'sDev', c: 'var(--dev)', soft: 'var(--dev-soft)' },
  'not-started': { label: 'ยังไม่เริ่ม', k: 'sNone', c: 'var(--none)', soft: 'var(--none-soft)' },
  locked: { label: 'รอขั้นก่อนหน้า', k: 'lock', c: 'var(--ink-3)', soft: 'transparent' },
};

/** เส้นทาง — starting point → target → requirements → today's step. */
export function RouteHub() {
  const { lessons, setStudentProfile, setChecklistAnswer } = useStore();
  const records = useLearningRecords();
  // Same inputs as Home → the same next action (single source of truth)
  const params = useNextStepParams();
  const route = buildNextStepRoute(params)!;
  const roadmap = buildRoadmap(params);
  const today = roadmap.today;
  const { start, confirmModal } = useStartNextStep();
  const subjectGaps = getSubjectSkillGaps({ storeLessons: lessons, records });
  const { profile } = route;
  const pathway = usePathway();
  const currentPhase = roadmap.phases.find((p) => p.requirementId === roadmap.currentPhaseId);
  const currentStep = route.steps.find((s) => s.requirement.id === route.currentRequirementId);
  const [sel, setSel] = useState<string | undefined>(undefined);
  const selStep = route.steps.find((s) => s.requirement.id === (sel ?? route.currentRequirementId)) ?? currentStep;
  const selMissing = selStep?.requirement.subjectId ? subjectGaps.find((g) => g.subjectId === selStep.requirement.subjectId)?.skills.filter((g) => g.status !== 'ready') ?? [] : [];
  const selBlockedBy = selStep && selStep.status === 'locked' ? route.steps.filter((x) => selStep.requirement.dependsOn.includes(x.requirement.id) && x.status !== 'done').map((x) => x.requirement.title) : [];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-[22px] lg:max-w-6xl">
      {confirmModal}
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold" style={{ letterSpacing: '.08em', color: 'var(--brand-ink)' }}>เส้นทาง</span>
        <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)' }}>เส้นทางของฉัน</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ</p>
      </header>

      {/* From → to (design) */}
      <section aria-label="สรุปเส้นทาง" className="flex flex-col gap-4" style={{ padding: 20, borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold" style={{ letterSpacing: '.08em', color: 'var(--ink-3)' }}>จากจุดที่คุณอยู่</span>
            <span className="font-display text-[17px] font-semibold leading-snug break-words" style={{ color: 'var(--ink)' }}>{profile.educationLevel}</span>
            <span className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>{VOCATIONAL_PROGRAMS.find((p) => p.id === profile.programId)?.title ?? 'สาขาอื่น'}</span>
          </div>
          <span aria-hidden="true" className="flex items-center gap-1.5" style={{ color: 'var(--brand)' }}>
            <span className="h-0.5" style={{ width: 'clamp(24px,8vw,140px)', background: 'repeating-linear-gradient(90deg,var(--brand) 0 6px,transparent 6px 12px)', backgroundSize: '12px 2px', animation: 'v2uDash 1.6s linear infinite' }} />
            <KIcon name="arrowR" size={20} />
          </span>
          <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
            <span className="text-[11px] font-semibold" style={{ letterSpacing: '.08em', color: 'var(--dest-ink)' }}>สู่มหาวิทยาลัย</span>
            <span className="font-display text-[17px] font-semibold leading-snug break-words" style={{ color: 'var(--ink)' }}>{route.target.title}</span>
            <span className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>{route.target.faculty}</span>
          </div>
        </div>
        <div>
          <ProgressBar value={route.steps.length ? (route.completedCount / route.steps.length) * 100 : 0} label={`ผ่านแล้ว ${route.completedCount} จาก ${route.steps.length} ขั้น`} />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>ผ่านแล้ว {route.completedCount}/{route.steps.length} ขั้น · ตอนนี้: {currentStep ? currentStep.requirement.title : 'ครบทุกขั้นแล้ว'}</p>
        </div>
        <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <JourneyStrip route={route} />
        </div>
      </section>

      <PathwayOverview subjects={pathway.subjects} bySubject={pathway.bySubject} goal={`${route.target.faculty} · ${route.target.title}`} />

      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
      {/* Route stages (design: vertical node list) */}
      <section aria-labelledby="route-steps" className="order-3 lg:order-none">
        <h2 id="route-steps" className="mb-3 font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          เส้นทางทั้งหมด · ผ่านแล้ว {route.completedCount}/{route.steps.length}
        </h2>
        <ol aria-label="ขั้นในเส้นทาง" className="flex min-w-0 flex-col">
          {route.steps.map((s, i) => {
            const ui = STATUS_UI[s.status];
            const isCurrent = s.requirement.id === route.currentRequirementId;
            const done = s.status === 'done';
            const locked = s.status === 'locked';
            const last = i === route.steps.length - 1;
            const gap = subjectGaps.find((g) => g.subjectId === s.requirement.subjectId);
            return (
              <li key={s.requirement.id} aria-current={isCurrent ? 'step' : undefined} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3.5" data-step={s.requirement.id}>
                <div className="flex flex-col items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]" style={done ? { background: 'var(--ok)', color: '#fff' } : isCurrent ? { background: 'var(--brand)', color: 'var(--on-brand)', boxShadow: '0 0 0 5px var(--brand-soft)', animation: 'v2uPulse 2s ease-in-out infinite' } : { background: 'var(--surface)', color: 'var(--ink-3)', border: locked ? '1.5px dashed var(--line-2)' : '1.5px solid var(--line-2)' }}>
                    <KIcon name={done ? 'check' : locked ? 'lock' : isCurrent ? 'nav' : s.requirement.subjectId ? subOf(s.requirement.subjectId).k : 'flag'} size={18} />
                  </span>
                  {!last && <span className="min-h-[14px] w-0.5 flex-1" style={{ background: done ? 'var(--ok)' : 'var(--line-2)' }} />}
                </div>
                <div className="min-w-0 pb-3.5">
                  <div className="flex flex-col gap-2 px-4 py-3.5" style={{ borderRadius: 18, background: locked ? 'transparent' : 'var(--surface)', border: isCurrent ? '2px solid var(--brand)' : locked ? '1px dashed var(--line-2)' : '1px solid var(--line)', boxShadow: locked ? 'none' : 'var(--shadow)', opacity: locked ? 0.85 : 1 }}>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <button type="button" onClick={() => setSel(s.requirement.id)} aria-pressed={sel === s.requirement.id} className="flex min-h-[44px] min-w-0 flex-col items-start gap-0.5 text-left">
                        <span className="text-[11px] font-semibold" style={{ letterSpacing: '.08em', color: 'var(--ink-3)' }}>ขั้นที่ {i + 1}{isCurrent && ' · ตอนนี้อยู่ตรงนี้'}</span>
                        <span className="text-[15px] font-semibold break-words" style={{ color: 'var(--ink)' }}>{s.requirement.title}</span>
                      </button>
                      <span className="flex flex-wrap gap-1.5">
                        {isCurrent && <Pill c="var(--on-brand)" soft="var(--brand)" icon="sparkle">แนะนำ</Pill>}
                        <Pill c={ui.c} soft={ui.soft} icon={ui.k} bd={locked ? '1px solid var(--line-2)' : undefined}>{ui.label}</Pill>
                      </span>
                    </div>
                    {s.note && <p className="text-xs break-words" style={{ color: 'var(--ink-3)' }}>{s.note}</p>}
                    {s.readinessPercent !== undefined && s.targetPercent !== undefined && (
                      <span className="flex items-center gap-2">
                        <span className="h-[5px] w-24 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}><span className="block h-full rounded-full" style={{ width: `${s.readinessPercent}%`, background: done ? 'var(--ok)' : 'var(--brand)' }} /></span>
                        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>ความพร้อม {s.readinessPercent}% / {s.targetPercent}%</span>
                      </span>
                    )}
                    {gap && (
                      <details>
                        <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--ink-2)' }}>
                          {SKILL_STATUS_ORDER.map((st) => (
                            <span key={st} className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ background: SKILL_DOT[st] }} aria-hidden="true" />
                              {SKILL_STATUS_LABEL[st]} {gap.counts[st]}
                            </span>
                          ))}
                          <span className="font-semibold" style={{ color: 'var(--brand-ink)' }}>ดูทักษะ</span>
                        </summary>
                        <ul className="mt-1.5 space-y-1">
                          {gap.skills.map((g) => (
                            <li key={g.skill.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="break-words" style={{ color: 'var(--ink)' }}>{g.skill.title}</span>
                              <span className="flex shrink-0 items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                                <span className="h-2 w-2 rounded-full" style={{ background: SKILL_DOT[g.status] }} aria-hidden="true" />
                                {SKILL_STATUS_LABEL[g.status]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {s.checklist && s.checklist.length > 0 && (
                      <div className="divide-y rounded-xl px-2.5" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                        {s.checklist.map((c) => (
                          <ChecklistAnswerControl key={c.key} label={c.item} status={c.status} onChange={(answer) => setChecklistAnswer(c.key, answer)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 6-month overview */}
      <section aria-labelledby="route-months" className="order-6 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-months" className="text-base font-bold text-ink">ภาพรวมเส้นทางของคุณ · {roadmap.horizon.months} เดือน (ประมาณ)</h2>
        <ol className="mt-2 space-y-1 text-xs lg:flex lg:gap-2 lg:space-y-0 lg:overflow-x-auto lg:pb-1">
          {roadmap.months.map((m) => (
            <li key={m.index} className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 lg:min-w-[150px] lg:flex-1 lg:flex-col lg:gap-1.5 lg:border lg:border-[var(--line-2)]/80 lg:p-3 ${m.isCurrent ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand-ink)]' : 'text-[var(--ink-2)]'}`}>
              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.isCurrent ? 'bg-[var(--brand)]' : 'bg-slate-300'}`} aria-hidden="true" />
              <span className="w-16 shrink-0">เดือนที่ {m.index}</span>
              <span className="min-w-0">{m.focus}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* V2U arranges the route */}
      <section aria-labelledby="route-period" className="order-4 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-period" className="text-base font-bold text-ink">V2U จัดเส้นทางให้</h2>
        <p
          className={`mt-1 text-sm ${
            roadmap.fit.status === 'over' ? 'text-[var(--rev)]' : roadmap.fit.status === 'tight' ? 'text-[var(--rev)]' : 'text-[var(--ok)]'
          }`}
        >
          {roadmap.fit.status === 'over'
            ? `จากเวลาที่คุณมี แผน ${roadmap.horizon.months} เดือนอาจไม่พอสำหรับสิ่งที่ยังต้องเตรียม — V2U จัดลำดับเรื่องสำคัญก่อน`
            : roadmap.fit.status === 'tight'
              ? `เวลาค่อนข้างพอดี — V2U จัดเรื่องสำคัญก่อน และจะเหลือเวลาเตรียมสอบไม่มาก`
              : 'แผนนี้สามารถเดินตามเวลาที่คุณตั้งไว้ได้'}
        </p>
        {roadmap.fit.estimatedWeeks > 0 && (
          <p className="mt-0.5 text-xs text-[var(--ink-3)]">
            จากเวลาวันละ {roadmap.dailyMinutes} นาที เนื้อหาที่ต้องเรียนใช้ประมาณ{' '}
            {roadmap.fit.estimatedMonths.min === roadmap.fit.estimatedMonths.max || roadmap.fit.estimatedMonths.min === 0
              ? `${roadmap.fit.estimatedMonths.max} เดือน`
              : `${roadmap.fit.estimatedMonths.min}–${roadmap.fit.estimatedMonths.max} เดือน`}{' '}
            (ยังไม่รวมการเตรียมสอบและ Portfolio)
          </p>
        )}
        {(roadmap.fit.status === 'over' || roadmap.fit.status === 'tight') && (roadmap.fit.suggestedDailyMinutes || roadmap.fit.suggestedMonths) && (
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            แนะนำ:{' '}
            {[
              roadmap.fit.suggestedDailyMinutes ? `เพิ่มเวลาเป็นวันละ ${roadmap.fit.suggestedDailyMinutes} นาที` : null,
              roadmap.fit.suggestedMonths && roadmap.fit.suggestedMonths > roadmap.horizon.months ? `หรือขยายเป็นประมาณ ${roadmap.fit.suggestedMonths} เดือน` : null,
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
        )}
        <p className="mt-2 text-sm text-[var(--ink)]">ช่วงนี้: {roadmap.currentMonth.focus}</p>
        {currentPhase?.remainingMinutes ? (
          <p className="mt-0.5 text-xs text-[var(--ink-3)]">
            {currentPhase.title} เหลืองานประมาณ {Math.ceil(currentPhase.remainingMinutes / 60)} ชั่วโมง
          </p>
        ) : null}
        {roadmap.beyondHorizon.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-blue-700 min-h-[32px] flex items-center">
              ถ้ามีเวลา ({roadmap.beyondHorizon.length} เรื่องที่อาจไม่ทันในเวลาที่ตั้งไว้)
            </summary>
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--ink-2)]">
              {roadmap.beyondHorizon.map((a, i) => (
                <li key={`${a.curriculumLessonId ?? a.skillId ?? a.title}-${i}`}>• {a.title}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* This week */}
      <section aria-labelledby="route-week" className="order-5 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-week" className="text-base font-bold text-ink">
          สัปดาห์นี้ · ประมาณ {roadmap.thisWeek.plannedMinutes} จาก {roadmap.thisWeek.budgetMinutes} นาที
        </h2>
        <ol className="mt-2 space-y-1 text-xs text-[var(--ink-2)]">
          {roadmap.thisWeek.actions.map((a: RoadmapAction, i) => (
            <li key={`${a.kind}-${a.curriculumLessonId ?? a.skillId ?? a.title}-${i}`} className="flex justify-between gap-2">
              <span className={i === 0 ? 'font-bold text-[var(--ink)]' : ''}>
                {i + 1}. {a.title}
                {i === 0 && ' (วันนี้)'}
              </span>
              {a.minutes !== undefined && <span className="shrink-0 text-[var(--ink-3)]">{a.minutes} นาที</span>}
            </li>
          ))}
        </ol>
      </section>

        </div>
        <aside aria-label="วันนี้และการตั้งค่าเส้นทาง" className="contents lg:flex lg:flex-col lg:gap-6">
      {/* Today's step on the route */}
      <section aria-labelledby="route-today" className="order-1 lg:order-none v2u-hero relative overflow-hidden p-[clamp(20px,2.4vw,28px)] text-white" style={{ borderRadius: 24, background: 'var(--hero-2)', boxShadow: 'var(--shadow-lg)' }}>
        <LoopStrip current="today" onDark />
        <h2 id="route-today" className="mt-4 text-xs font-semibold text-brand-100">วันนี้ควรทำอะไร</h2>
        <div className="mt-1">
          <p className="text-xl font-bold leading-snug break-words">{today.todayAction}</p>
          {today.minutes !== undefined && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/85">
              <Clock className="h-3.5 w-3.5" /> {today.minutes} นาที
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-sm text-white/90">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              <span className="font-bold">เหตุผล: </span>
              {today.reason}
            </span>
          </p>
          {today.outcome && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-white/85">
              <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>
                <span className="font-bold">ได้อะไร: </span>
                {today.outcome}
              </span>
            </p>
          )}
          {today.plan && (
            <div className="mt-4">
              <PlanBar onDark segments={today.plan.steps.map((ps) => ({ label: ps.label, minutes: ps.minutes }))} />
            </div>
          )}
          <button
            type="button"
            onClick={() => start(today)}
            className="mt-5 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--surface)] px-6 text-base font-bold sm:w-auto" style={{ color: '#16207a' }}
          >
            {today.ctaLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Selected step (design: sticky detail aside) */}
      {selStep && (
        <section aria-labelledby="route-detail" className="order-2 lg:order-none flex flex-col gap-4" style={{ padding: 22, borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)' }} data-testid="route-detail">
          <span className="text-[11px] font-semibold" style={{ letterSpacing: '.08em', color: 'var(--ink-3)' }}>
            ขั้นที่ {route.steps.indexOf(selStep) + 1}{selStep.requirement.id === route.currentRequirementId ? ' · ตอนนี้อยู่ตรงนี้' : ''}
          </span>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}><KIcon name={selStep.requirement.subjectId ? subOf(selStep.requirement.subjectId).k : 'flag'} size={20} /></span>
            <h2 id="route-detail" className="font-display text-[21px] font-bold leading-tight break-words" style={{ color: 'var(--ink)' }}>{selStep.requirement.title}</h2>
          </div>
          <span className="self-start"><Pill c={STATUS_UI[selStep.status].c} soft={STATUS_UI[selStep.status].soft} icon={STATUS_UI[selStep.status].k}>{STATUS_UI[selStep.status].label}</Pill></span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>ขั้นนี้คืออะไร</span>
            <span className="text-sm break-words" style={{ color: 'var(--ink)' }}>{selStep.requirement.description}</span>
          </div>
          {selStep.readinessPercent !== undefined && (
            <div className="flex flex-col gap-2 rounded-[14px] p-3.5" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>ความคืบหน้า</span>
                <span className="font-display text-xl font-bold" style={{ color: 'var(--ink)' }}>{selStep.readinessPercent}% <span className="font-sans text-xs font-medium" style={{ color: 'var(--ink-3)' }}>จากเป้าหมาย {selStep.targetPercent}%</span></span>
              </div>
              <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}><span className="block h-full rounded-full" style={{ width: `${selStep.readinessPercent}%`, background: 'var(--brand)' }} /></span>
            </div>
          )}
          {selMissing.length > 0 && (
            <div className="flex flex-col">
              <span className="pb-1.5 text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>ทักษะที่ยังขาด</span>
              {selMissing.map((m) => (
                <span key={m.skill.id} className="flex items-center gap-2 py-1.5 text-sm" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--none)' }}><KIcon name="sNone" size={16} /></span><span className="break-words">{m.skill.title}</span>
                </span>
              ))}
            </div>
          )}
          {selBlockedBy.length > 0 && (
            <p className="flex items-center gap-2.5 rounded-[14px] p-3 text-[13px]" style={{ border: '1px dashed var(--line-2)', color: 'var(--ink-2)' }}>
              <KIcon name="lock" size={16} /> เริ่มได้หลังจาก “{selBlockedBy.join('”, “')}”
            </p>
          )}
        </section>
      )}

      {/* What is missing (same list Home uses) */}
      <section aria-labelledby="route-gaps" className="order-2 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-gaps" className="text-base font-bold text-ink">ยังขาดอะไร</h2>
        {today.missing.length > 0 ? (
          <ul className="mt-2 divide-y divide-[var(--line)] text-sm text-[var(--ink)]">
            {today.missing.map((m) => (
              <li key={m} className="flex min-h-[40px] items-center gap-2.5 py-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--rev)]" aria-hidden="true" />
                <span className="break-words">{m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--ink-2)]">ไม่มีอะไรค้าง</p>
        )}
      </section>

      {/* How much time */}
      <section aria-labelledby="route-time" className="order-7 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-time" className="sr-only">มีเวลาเท่าไร</h2>
        <HorizonPicker value={profile.planningHorizon} onChange={(h) => setStudentProfile({ planningHorizon: h })} />
        <p className="mt-1.5 text-xs text-[var(--ink-3)]">
          {roadmap.horizon.isDefault
            ? `ยังไม่ได้ตั้งระยะเวลา — ตอนนี้ V2U วางแผนคร่าว ๆ ไว้ ${roadmap.horizon.months} เดือน`
            : `คุณตั้งเป้าหมายไว้ใน ${roadmap.horizon.months} เดือน`}
        </p>
        <div className="mt-3">
          <TimeBudgetPicker label="เรียนได้วันละเท่าไหร่?" value={profile.availableMinutes} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        </div>
      </section>

      {/* Starting point → target */}
      <section aria-labelledby="route-start" className="order-8 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-start" className="text-base font-bold text-ink">ฉันอยู่ตรงไหน</h2>
        <p className="text-xs text-[var(--ink-3)]">จุดเริ่มต้นของคุณ — เปลี่ยนได้ตลอด</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[var(--ink-2)]">
            ระดับชั้น
            <select
              value={profile.educationLevel}
              onChange={(e) => setStudentProfile({ educationLevel: e.target.value as EducationLevel })}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-[var(--surface)] px-3 py-2.5 min-h-[44px] text-sm text-[var(--ink)]"
            >
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--ink-2)]">
            สาขาที่เรียน
            <select
              value={profile.programId}
              onChange={(e) => setStudentProfile({ programId: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-[var(--surface)] px-3 py-2.5 min-h-[44px] text-sm text-[var(--ink)]"
            >
              {VOCATIONAL_PROGRAMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-[var(--ink)]">
          <span className="font-bold">ตอนนี้อยู่ที่:</span> {currentStep ? currentStep.requirement.title : `ผ่านแล้ว ${route.completedCount}/${route.steps.length} ขั้น`}
          {currentStep?.readinessPercent !== undefined && ` · ความพร้อม ${currentStep.readinessPercent}% จากเป้าหมาย ${currentStep.targetPercent}%`}
        </p>
      </section>

      {/* Where am I going */}
      <section aria-labelledby="route-target" className="order-9 lg:order-none rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 sm:p-5">
        <h2 id="route-target" className="text-base font-bold text-ink">กำลังไปไหน</h2>
        <p className="mt-1 text-sm text-[var(--ink)]">
          {route.target.faculty} · {route.target.title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--ink-3)]">
          {route.horizon} ·{' '}
          {roadmap.basis.kind === 'admission-path'
            ? `ตามเกณฑ์ที่ยืนยันแล้ว: ${roadmap.basis.pathName}`
            : 'ใช้เส้นทางทั่วไป (ยังไม่มีเกณฑ์รับสมัครที่ยืนยันจากแหล่งทางการ)'}
        </p>
      </section>

      <div className="order-[10] lg:order-none">
      <HubLinkList
        heading="เครื่องมือวางแผน"
        links={[
          { to: '/roadmap', title: 'ลำดับเนื้อหาตามหลักสูตร', description: 'เนื้อหาทั้งหมดเรียงเป็นช่วง ๆ — ระยะเวลาจริงดูได้ในแผนของคุณด้านบน', icon: Map },
          { to: '/goals', title: 'เป้าหมาย', description: 'ตั้งและติดตามเป้าหมายของคุณ', icon: Target },
          { to: '/planner', title: 'ตารางเรียน & แผน', description: 'วางแผนเวลาเรียนแต่ละวัน', icon: CalendarDays },
        ]}
      />
      </div>
        </aside>
      </div>
    </div>
  );
}
