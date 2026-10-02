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
import { ChecklistAnswerControl } from '../../components/ChecklistAnswerControl';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSubjectSkillGaps, SKILL_STATUS_LABEL } from '../../skills/engine';
import type { SkillStatus } from '../../skills/engine';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';

const SKILL_STATUS_ORDER: SkillStatus[] = ['ready', 'developing', 'needs-review', 'not-learned'];
const SKILL_DOT: Record<SkillStatus, string> = {
  ready: 'bg-emerald-500',
  developing: 'bg-blue-500',
  'needs-review': 'bg-amber-500',
  'not-learned': 'bg-slate-300',
};

const STATUS_UI: Record<RequirementStatus, { label: string; icon: typeof Circle; cls: string }> = {
  done: { label: 'ผ่านแล้ว', icon: CheckCircle2, cls: 'text-emerald-600' },
  'in-progress': { label: 'กำลังทำ', icon: CircleDot, cls: 'text-blue-600' },
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
  const currentPhase = roadmap.phases.find((p) => p.requirementId === roadmap.currentPhaseId);
  const currentStep = route.steps.find((s) => s.requirement.id === route.currentRequirementId);

  return (
    <div className="mx-auto max-w-3xl">
      {confirmModal}
      <HubHeader title="เส้นทาง" subtitle="จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ" />

      {/* Starting point → target */}
      <section aria-labelledby="route-start" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-start" className="text-sm font-bold text-slate-900">ฉันอยู่ตรงไหน</h2>
        <p className="text-xs text-slate-500">จุดเริ่มต้นของคุณ</p>
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
      <section aria-labelledby="route-target" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-target" className="text-sm font-bold text-slate-900">กำลังไปไหน</h2>
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

      {/* This period */}
      <section aria-labelledby="route-period" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-period" className="text-sm font-bold text-slate-900">ช่วงนี้ต้องทำอะไร</h2>
        <p className="mt-1 text-sm text-slate-800">
          เดือนนี้: {roadmap.currentMonth.focus}
        </p>
        {currentPhase?.remainingMinutes ? (
          <p className="mt-0.5 text-xs text-slate-500">
            {currentPhase.title} เหลืองานประมาณ {Math.ceil(currentPhase.remainingMinutes / 60)} ชั่วโมง · ถ้าเรียนวันละ {profile.availableMinutes} นาที ใช้เวลาราว{' '}
            {(currentPhase.endWeek ?? 1) - (currentPhase.startWeek ?? 1) + 1} สัปดาห์
          </p>
        ) : null}
        {!roadmap.fitsInHorizon && (
          <p className="mt-1 text-xs text-amber-700">
            ด้วยเวลาวันละ {profile.availableMinutes} นาที วิชาพื้นฐานต้องใช้ราว {roadmap.subjectWeeksNeeded} สัปดาห์ ซึ่งเกิน 6 เดือน — ลองเพิ่มเวลาต่อวัน
          </p>
        )}
      </section>

      {/* This week */}
      <section aria-labelledby="route-week" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-week" className="text-sm font-bold text-slate-900">
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

      {/* Today's step on the route */}
      <section aria-labelledby="route-today" className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <h2 id="route-today" className="text-sm font-bold text-blue-900">วันนี้ควรทำอะไร</h2>
        <div className="mt-2">
          <TimeBudgetPicker value={profile.availableMinutes} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        </div>
        <div className="mt-3">
          <p className="text-base font-extrabold text-slate-900">{today.todayAction}</p>
          {today.minutes !== undefined && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5" /> {today.minutes} นาที
            </p>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <span className="font-bold">เหตุผล: </span>
              {today.reason}
            </span>
          </p>
          {today.outcome && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600">
              <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                <span className="font-bold">ได้อะไร: </span>
                {today.outcome}
              </span>
            </p>
          )}
          {today.plan && (
            <ol className="mt-2 space-y-0.5 text-xs text-slate-700">
              {today.plan.steps.map((ps, i) => (
                <li key={`${ps.kind}-${i}`}>
                  {i + 1}. {ps.label} — {ps.minutes} นาที
                </li>
              ))}
            </ol>
          )}
          <button
            type="button"
            onClick={() => start(today)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-white hover:bg-blue-700"
          >
            {today.ctaLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 6-month overview */}
      <section aria-labelledby="route-months" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-months" className="text-sm font-bold text-slate-900">ภาพรวม 6 เดือน (ประมาณ)</h2>
        <ol className="mt-2 space-y-1 text-xs">
          {roadmap.months.map((m) => (
            <li key={m.index} className={`flex gap-2 ${m.isCurrent ? 'font-bold text-blue-800' : 'text-slate-700'}`}>
              <span className="w-16 shrink-0">เดือนที่ {m.index}</span>
              <span className="min-w-0">{m.focus}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Route stages */}
      <section aria-labelledby="route-steps" className="mb-6">
        <h2 id="route-steps" className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          เส้นทางทั้งหมด · ผ่านแล้ว {route.completedCount}/{route.steps.length}
        </h2>
        <ol className="space-y-2">
          {route.steps.map((s) => {
            const ui = STATUS_UI[s.status];
            const Icon = ui.icon;
            const isCurrent = s.requirement.id === route.currentRequirementId;
            return (
              <li
                key={s.requirement.id}
                aria-current={isCurrent ? 'step' : undefined}
                className={`rounded-2xl border bg-white p-3.5 shadow-xs ${isCurrent ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-5 w-5 shrink-0 ${ui.cls}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{s.requirement.title}</p>
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
                  <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${s.readinessPercent}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-emerald-600" style={{ left: `${s.targetPercent}%` }} />
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

      <HubLinkList
        heading="เครื่องมือวางแผน"
        links={[
          { to: '/roadmap', title: 'แผน 6 เดือน', description: 'ภาพรวมเส้นทางทั้งหมดและหมุดหมายแต่ละเดือน', icon: Map },
          { to: '/goals', title: 'เป้าหมาย', description: 'ตั้งและติดตามเป้าหมายของคุณ', icon: Target },
          { to: '/planner', title: 'ตารางเรียน & แผน', description: 'วางแผนเวลาเรียนแต่ละวัน', icon: CalendarDays },
        ]}
      />
    </div>
  );
}
