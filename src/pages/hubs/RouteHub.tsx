import { Link } from 'react-router-dom';
import { Map, Target, CalendarDays, CheckCircle2, CircleDot, Circle, Lock, ArrowRight, Clock, Lightbulb } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { buildStudentRoute, getRouteNextStep } from '../../route/engine';
import { EDUCATION_LEVELS } from '../../route/types';
import type { EducationLevel, RequirementStatus } from '../../route/types';
import { VOCATIONAL_PROGRAMS } from '../../route/data';
import { TimeBudgetPicker } from '../../components/TimeBudgetPicker';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';

const STATUS_UI: Record<RequirementStatus, { label: string; icon: typeof Circle; cls: string }> = {
  done: { label: 'ผ่านแล้ว', icon: CheckCircle2, cls: 'text-emerald-600' },
  'in-progress': { label: 'กำลังทำ', icon: CircleDot, cls: 'text-blue-600' },
  'not-started': { label: 'ยังไม่เริ่ม', icon: Circle, cls: 'text-slate-400' },
  locked: { label: 'รอขั้นก่อนหน้า', icon: Lock, cls: 'text-slate-300' },
};

/** เส้นทาง — starting point → target → requirements → today's step. */
export function RouteHub() {
  const { lessons, studentProfile, setStudentProfile } = useStore();
  const route = buildStudentRoute({ profile: studentProfile, storeLessons: lessons });
  const next = getRouteNextStep(route, lessons);
  const { profile } = route;

  return (
    <div className="mx-auto max-w-3xl">
      <HubHeader title="เส้นทาง" subtitle="จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ" />

      {/* Starting point → target */}
      <section aria-labelledby="route-start" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 id="route-start" className="text-sm font-bold text-slate-900">จุดเริ่มต้นของคุณ</h2>
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
          <span className="font-bold">เป้าหมาย:</span> {route.target.faculty} · {route.target.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{route.horizon}</p>
      </section>

      {/* Today's step on the route */}
      <section aria-labelledby="route-today" className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <h2 id="route-today" className="text-sm font-bold text-blue-900">วันนี้ควรทำอะไร</h2>
        <div className="mt-2">
          <TimeBudgetPicker value={profile.availableMinutes} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        </div>
        {next ? (
          <div className="mt-3">
            <p className="text-base font-extrabold text-slate-900">เรียน: {next.curriculumLessonTitle}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5" /> {next.budgetMinutes} นาที
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <span className="font-bold">เหตุผล: </span>
                {next.reason}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-slate-600">
              <span className="font-bold">เรียนจบแล้วจะทำได้: </span>
              {next.outcomes.join(' · ')}
            </p>
            {next.plan && (
              <ol className="mt-2 space-y-0.5 text-xs text-slate-700">
                {next.plan.steps.map((s, i) => (
                  <li key={`${s.kind}-${i}`}>
                    {i + 1}. {s.label} — {s.minutes} นาที
                  </li>
                ))}
              </ol>
            )}
            {next.studyLessonId && (
              <Link
                to={`/lessons/${next.studyLessonId}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-white hover:bg-blue-700"
              >
                เริ่มขั้นต่อไป <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-700">
            วิชาพื้นฐานผ่านเป้าหมายแล้ว — ขั้นต่อไปคือ {route.steps.find((s) => s.requirement.id === route.currentRequirementId)?.requirement.title ?? 'ทบทวนให้พร้อมสอบ'}
          </p>
        )}
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
                {s.requirement.checklist && (
                  <ul className="mt-2 ml-7 list-disc text-xs text-slate-600">
                    {s.requirement.checklist.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
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
