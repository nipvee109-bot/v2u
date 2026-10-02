import { Gauge } from 'lucide-react';
import { useReadiness } from '../hooks/useNextStep';
import { READINESS_LABEL } from '../readiness/engine';
import type { ReadinessStatus } from '../readiness/engine';

const CHIP: Record<ReadinessStatus, string> = {
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  developing: 'bg-blue-50 text-blue-700 border-blue-200',
  'needs-review': 'bg-amber-50 text-amber-800 border-amber-200',
  'not-learned': 'bg-slate-50 text-slate-600 border-slate-200',
};

function StatusChip({ status }: { status: ReadinessStatus }) {
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${CHIP[status]}`}>{READINESS_LABEL[status]}</span>;
}

/** ฉัน → "ตอนนี้ฉันพร้อมแค่ไหน?" — counts and statuses, no invented percentages. */
export function ReadinessCard() {
  const r = useReadiness();
  return (
    <section aria-labelledby="readiness-title" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 id="readiness-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Gauge className="h-4 w-4 text-blue-600" /> ตอนนี้ฉันพร้อมแค่ไหน?
        </h2>
        <StatusChip status={r.overall} />
      </div>
      <p className="mt-1 text-sm text-slate-700">{r.headline}</p>

      <ul className="mt-3 divide-y divide-slate-100">
        {r.subjects.map((s) => (
          <li key={s.subjectId} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
              <span className="block text-[11px] text-slate-500">
                ทักษะพร้อม {s.readySkills} จาก {s.totalSkills} · เรียนจบ {s.completedLessons} จาก {s.totalLessons} บท
              </span>
            </span>
            <StatusChip status={s.status} />
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-slate-600">
        เส้นทาง: ผ่านแล้ว {r.route.stagesDone} จาก {r.route.stagesTotal} ขั้น
        {r.route.currentStageTitle && ` · ตอนนี้: ${r.route.currentStageTitle}`}
        {r.roadmap.subjectWeeksNeeded > 0 && ` · วิชาที่เหลือใช้ราว ${r.roadmap.subjectWeeksNeeded} สัปดาห์ตามเวลาที่ตั้งไว้`}
      </p>
    </section>
  );
}
