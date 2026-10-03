import { JourneyStrip } from '../../components/pathway/JourneyStrip';
import { usePathway } from '../../hooks/usePathway';
import { PathwayOverview } from '../../components/pathway/PathwayBits';
import { Map, Target, CalendarDays, CheckCircle2, CircleDot, Circle, Lock, ArrowRight, Clock, Lightbulb, Trophy } from 'lucide-react';
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
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';
import { LoopStrip, PlanBar, ProgressBar } from '../../components/ui';

const SKILL_STATUS_ORDER: SkillStatus[] = ['ready', 'developing', 'needs-review', 'not-learned'];
const SKILL_DOT: Record<SkillStatus, string> = {
  ready: 'bg-emerald-500',
  developing: 'bg-blue-500',
  'needs-review': 'bg-amber-500',
  'not-learned': 'bg-slate-300',
};

const STATUS_UI: Record<RequirementStatus, { label: string; icon: typeof Circle; cls: string }> = {
  done: { label: 'ผ่านแล้ว', icon: CheckCircle2, cls: 'text-emerald-600' },
  'in-progress': { label: 'กำลังทำ', icon: CircleDot, cls: 'text-brand-600' },
  'not-started': { label: 'ยังไม่เริ่ม', icon: Circle, cls: 'text-slate-400' },
  locked: { label: 'รอขั้นก่อนหน้า', icon: Lock, cls: 'text-slate-300' },
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

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      {confirmModal}
      <HubHeader title="เส้นทาง" subtitle="จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ" />

{/* Journey summary */}
      <section aria-label="สรุปเส้นทาง" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">เริ่มจาก</p>
            <p className="mt-0.5 text-sm font-bold text-ink break-words">{profile.educationLevel} · {VOCATIONAL_PROGRAMS.find((p) => p.id === profile.programId)?.title ?? 'สาขาอื่น'}</p>
          </div>
          <ArrowRight className="mt-5 h-4 w-4 text-slate-300" aria-hidden="true" />
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium text-slate-500">ไปสู่</p>
            <p className="mt-0.5 text-sm font-bold text-ink break-words">{route.target.title}</p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={route.steps.length ? (route.completedCount / route.steps.length) * 100 : 0} label={`ผ่านแล้ว ${route.completedCount} จาก ${route.steps.length} ขั้น`} />
          <p className="mt-1.5 text-xs text-slate-500">ผ่านแล้ว {route.completedCount}/{route.steps.length} ขั้น · ตอนนี้: {currentStep ? currentStep.requirement.title : 'ครบทุกขั้นแล้ว'}</p>
        </div>
              <div className="mt-4 border-t border-ink/[0.06] pt-4">
          <JourneyStrip route={route} />
        </div>
      </section>

      <PathwayOverview subjects={pathway.subjects} bySubject={pathway.bySubject} goal={`${route.target.faculty} · ${route.target.title}`} />

      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-8">
      {/* Route stages */}
      <section aria-labelledby="route-steps" className="order-3 lg:order-none">
        <h2 id="route-steps" className="mb-3 text-base font-bold text-ink">
          เส้นทางทั้งหมด · ผ่านแล้ว {route.completedCount}/{route.steps.length}
        </h2>
        <ol className="relative ml-3 space-y-3 border-l-2 border-slate-200 pl-6">
          {route.steps.map((s) => {
            const ui = STATUS_UI[s.status];
            const Icon = ui.icon;
            const isCurrent = s.requirement.id === route.currentRequirementId;
            return (
              <li
                key={s.requirement.id}
                aria-current={isCurrent ? 'step' : undefined}
                className={`relative rounded-2xl border bg-white p-3.5 sm:p-4 ${isCurrent ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200/80'}`}
              >
                <span className="absolute -left-[37px] top-4 flex h-6 w-6 items-center justify-center rounded-full bg-canvas" aria-hidden="true">
                  <Icon className={`h-5 w-5 ${ui.cls}`} />
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-ink">{s.requirement.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {ui.label}
                      {isCurrent && ' · ตอนนี้อยู่ตรงนี้'}
                      {s.note && ` · ${s.note}`}
                    </p>
                  </div>
                  {s.readinessPercent !== undefined && (
                    <span className="text-xs font-bold text-slate-700">
                      {s.readinessPercent}% / {s.targetPercent}%
                    </span>
                  )}
                </div>
                {s.readinessPercent !== undefined && s.targetPercent !== undefined && (
                  <div className="mt-2.5">
                    <ProgressBar value={s.readinessPercent} target={s.targetPercent} size="sm" label={`ความพร้อม ${s.readinessPercent}% จากเป้าหมาย ${s.targetPercent}%`} />
                  </div>
                )}
                {(() => {
                  const gap = subjectGaps.find((g) => g.subjectId === s.requirement.subjectId);
                  if (!gap) return null;
                  return (
                    <details className="mt-2">
                      <summary className="flex cursor-pointer list-none flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 min-h-[32px] items-center">
                        {SKILL_STATUS_ORDER.map((st) => (
                          <span key={st} className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${SKILL_DOT[st]}`} aria-hidden="true" />
                            {SKILL_STATUS_LABEL[st]} {gap.counts[st]}
                          </span>
                        ))}
                        <span className="font-semibold text-blue-700">ดูทักษะ</span>
                      </summary>
                      <ul className="mt-1.5 space-y-1">
                        {gap.skills.map((g) => (
                          <li key={g.skill.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-800">{g.skill.title}</span>
                            <span className="flex shrink-0 items-center gap-1 text-slate-600">
                              <span className={`h-2 w-2 rounded-full ${SKILL_DOT[g.status]}`} aria-hidden="true" />
                              {SKILL_STATUS_LABEL[g.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })()}
                {s.checklist && s.checklist.length > 0 && (
                  <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 px-2.5">
                    {s.checklist.map((c) => (
                      <ChecklistAnswerControl
                        key={c.key}
                        label={c.item}
                        status={c.status}
                        onChange={(answer) => setChecklistAnswer(c.key, answer)}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 6-month overview */}
      <section aria-labelledby="route-months" className="order-6 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-months" className="text-base font-bold text-ink">ภาพรวมเส้นทางของคุณ · {roadmap.horizon.months} เดือน (ประมาณ)</h2>
        <ol className="mt-2 space-y-1 text-xs lg:flex lg:gap-2 lg:space-y-0 lg:overflow-x-auto lg:pb-1">
          {roadmap.months.map((m) => (
            <li key={m.index} className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 lg:min-w-[150px] lg:flex-1 lg:flex-col lg:gap-1.5 lg:border lg:border-slate-200/80 lg:p-3 ${m.isCurrent ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700'}`}>
              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.isCurrent ? 'bg-brand-600' : 'bg-slate-300'}`} aria-hidden="true" />
              <span className="w-16 shrink-0">เดือนที่ {m.index}</span>
              <span className="min-w-0">{m.focus}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* V2U arranges the route */}
      <section aria-labelledby="route-period" className="order-4 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-period" className="text-base font-bold text-ink">V2U จัดเส้นทางให้</h2>
        <p
          className={`mt-1 text-sm ${
            roadmap.fit.status === 'over' ? 'text-amber-800' : roadmap.fit.status === 'tight' ? 'text-amber-700' : 'text-emerald-800'
          }`}
        >
          {roadmap.fit.status === 'over'
            ? `จากเวลาที่คุณมี แผน ${roadmap.horizon.months} เดือนอาจไม่พอสำหรับสิ่งที่ยังต้องเตรียม — V2U จัดลำดับเรื่องสำคัญก่อน`
            : roadmap.fit.status === 'tight'
              ? `เวลาค่อนข้างพอดี — V2U จัดเรื่องสำคัญก่อน และจะเหลือเวลาเตรียมสอบไม่มาก`
              : 'แผนนี้สามารถเดินตามเวลาที่คุณตั้งไว้ได้'}
        </p>
        {roadmap.fit.estimatedWeeks > 0 && (
          <p className="mt-0.5 text-xs text-slate-500">
            จากเวลาวันละ {roadmap.dailyMinutes} นาที เนื้อหาที่ต้องเรียนใช้ประมาณ{' '}
            {roadmap.fit.estimatedMonths.min === roadmap.fit.estimatedMonths.max || roadmap.fit.estimatedMonths.min === 0
              ? `${roadmap.fit.estimatedMonths.max} เดือน`
              : `${roadmap.fit.estimatedMonths.min}–${roadmap.fit.estimatedMonths.max} เดือน`}{' '}
            (ยังไม่รวมการเตรียมสอบและ Portfolio)
          </p>
        )}
        {(roadmap.fit.status === 'over' || roadmap.fit.status === 'tight') && (roadmap.fit.suggestedDailyMinutes || roadmap.fit.suggestedMonths) && (
          <p className="mt-1 text-xs text-slate-700">
            แนะนำ:{' '}
            {[
              roadmap.fit.suggestedDailyMinutes ? `เพิ่มเวลาเป็นวันละ ${roadmap.fit.suggestedDailyMinutes} นาที` : null,
              roadmap.fit.suggestedMonths && roadmap.fit.suggestedMonths > roadmap.horizon.months ? `หรือขยายเป็นประมาณ ${roadmap.fit.suggestedMonths} เดือน` : null,
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
        )}
        <p className="mt-2 text-sm text-slate-800">ช่วงนี้: {roadmap.currentMonth.focus}</p>
        {currentPhase?.remainingMinutes ? (
          <p className="mt-0.5 text-xs text-slate-500">
            {currentPhase.title} เหลืองานประมาณ {Math.ceil(currentPhase.remainingMinutes / 60)} ชั่วโมง
          </p>
        ) : null}
        {roadmap.beyondHorizon.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-blue-700 min-h-[32px] flex items-center">
              ถ้ามีเวลา ({roadmap.beyondHorizon.length} เรื่องที่อาจไม่ทันในเวลาที่ตั้งไว้)
            </summary>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
              {roadmap.beyondHorizon.map((a, i) => (
                <li key={`${a.curriculumLessonId ?? a.skillId ?? a.title}-${i}`}>• {a.title}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* This week */}
      <section aria-labelledby="route-week" className="order-5 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-week" className="text-base font-bold text-ink">
          สัปดาห์นี้ · ประมาณ {roadmap.thisWeek.plannedMinutes} จาก {roadmap.thisWeek.budgetMinutes} นาที
        </h2>
        <ol className="mt-2 space-y-1 text-xs text-slate-700">
          {roadmap.thisWeek.actions.map((a: RoadmapAction, i) => (
            <li key={`${a.kind}-${a.curriculumLessonId ?? a.skillId ?? a.title}-${i}`} className="flex justify-between gap-2">
              <span className={i === 0 ? 'font-bold text-slate-900' : ''}>
                {i + 1}. {a.title}
                {i === 0 && ' (วันนี้)'}
              </span>
              {a.minutes !== undefined && <span className="shrink-0 text-slate-500">{a.minutes} นาที</span>}
            </li>
          ))}
        </ol>
      </section>

        </div>
        <aside aria-label="วันนี้และการตั้งค่าเส้นทาง" className="contents lg:flex lg:flex-col lg:gap-6">
      {/* Today's step on the route */}
      <section aria-labelledby="route-today" className="order-1 lg:order-none rounded-3xl v2u-hero bg-gradient-to-br from-navy via-navy-2 to-brand-700 p-5 text-white shadow-lg shadow-brand-900/15 sm:p-6">
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
            className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-bold text-brand-800 shadow-md hover:bg-brand-50 sm:w-auto"
          >
            {today.ctaLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* What is missing (same list Home uses) */}
      <section aria-labelledby="route-gaps" className="order-2 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-gaps" className="text-base font-bold text-ink">ยังขาดอะไร</h2>
        {today.missing.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100 text-sm text-slate-800">
            {today.missing.map((m) => (
              <li key={m} className="flex min-h-[40px] items-center gap-2.5 py-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="break-words">{m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-700">ไม่มีอะไรค้าง</p>
        )}
      </section>

      {/* How much time */}
      <section aria-labelledby="route-time" className="order-7 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-time" className="sr-only">มีเวลาเท่าไร</h2>
        <HorizonPicker value={profile.planningHorizon} onChange={(h) => setStudentProfile({ planningHorizon: h })} />
        <p className="mt-1.5 text-xs text-slate-500">
          {roadmap.horizon.isDefault
            ? `ยังไม่ได้ตั้งระยะเวลา — ตอนนี้ V2U วางแผนคร่าว ๆ ไว้ ${roadmap.horizon.months} เดือน`
            : `คุณตั้งเป้าหมายไว้ใน ${roadmap.horizon.months} เดือน`}
        </p>
        <div className="mt-3">
          <TimeBudgetPicker label="เรียนได้วันละเท่าไหร่?" value={profile.availableMinutes} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        </div>
      </section>

      {/* Starting point → target */}
      <section aria-labelledby="route-start" className="order-8 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-start" className="text-base font-bold text-ink">ฉันอยู่ตรงไหน</h2>
        <p className="text-xs text-slate-500">จุดเริ่มต้นของคุณ — เปลี่ยนได้ตลอด</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            ระดับชั้น
            <select
              value={profile.educationLevel}
              onChange={(e) => setStudentProfile({ educationLevel: e.target.value as EducationLevel })}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-slate-900"
            >
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            สาขาที่เรียน
            <select
              value={profile.programId}
              onChange={(e) => setStudentProfile({ programId: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 min-h-[44px] text-sm text-slate-900"
            >
              {VOCATIONAL_PROGRAMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-800">
          <span className="font-bold">ตอนนี้อยู่ที่:</span> {currentStep ? currentStep.requirement.title : `ผ่านแล้ว ${route.completedCount}/${route.steps.length} ขั้น`}
          {currentStep?.readinessPercent !== undefined && ` · ความพร้อม ${currentStep.readinessPercent}% จากเป้าหมาย ${currentStep.targetPercent}%`}
        </p>
      </section>

      {/* Where am I going */}
      <section aria-labelledby="route-target" className="order-9 lg:order-none rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
        <h2 id="route-target" className="text-base font-bold text-ink">กำลังไปไหน</h2>
        <p className="mt-1 text-sm text-slate-800">
          {route.target.faculty} · {route.target.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
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
