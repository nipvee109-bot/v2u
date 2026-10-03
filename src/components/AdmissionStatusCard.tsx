import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLearningRecords } from '../hooks/useLearningRecords';
import { buildStudentRoute } from '../route/engine';
import { createSkillReadinessProvider, getSkillGaps, getSubjectSkillGaps } from '../skills/engine';
import {
  CHECK_LABEL,
  buildStudentAdmissionState,
  evaluateAdmissionPath,
  getPathsForRouteTarget,
  isValidGpax,
} from '../admission/engine';
import type { RequirementCheck } from '../admission/types';

const CHECKS: RequirementCheck[] = ['met', 'gap', 'unknown'];
const DOT: Record<RequirementCheck, string> = { met: 'bg-emerald-500', gap: 'bg-amber-500', unknown: 'bg-slate-300' };

/** ฉัน → "ข้อมูลของฉันตอนนี้เป็นอย่างไร?" — GPAX + admission checklist summary. */
export function AdmissionStatusCard() {
  const { lessons, studentProfile, admissionInputs, setGpax } = useStore();
  const records = useLearningRecords();
  const route = buildStudentRoute({
    profile: studentProfile,
    storeLessons: lessons,
    readiness: createSkillReadinessProvider(records),
    checklist: admissionInputs?.checklist,
  });
  const gpax = admissionInputs?.gpax ?? null;
  const [draft, setDraft] = useState(gpax === null ? '' : gpax.toFixed(2));
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const text = draft.trim();
    if (text === '') {
      setGpax(null);
      setError(null);
      return;
    }
    const n = Number(text);
    if (!isValidGpax(n)) {
      setError('เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 – 4.00');
      return;
    }
    setError(null);
    setGpax(n);
    setDraft(n.toFixed(2));
  };

  const items = route.steps.flatMap((s) => s.checklist ?? []);
  const counts: Record<RequirementCheck, number> = { met: 0, gap: 0, unknown: 0 };
  items.forEach((i) => counts[i.status]++);

  // Verified admission data only (none is shipped until checked against an official source)
  const paths = getPathsForRouteTarget(route.target.id);
  const state = buildStudentAdmissionState(
    route.profile,
    getSubjectSkillGaps({ storeLessons: lessons, records }),
    getSkillGaps({ storeLessons: lessons, records }),
    {},
    admissionInputs
  );

  return (
    <section aria-labelledby="admission-status" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5">
      <h2 id="admission-status" className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <ClipboardCheck className="h-4 w-4 text-blue-600" /> ข้อมูลของฉันตอนนี้เป็นอย่างไร?
      </h2>

      <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor="gpax-input">
        เกรดเฉลี่ยสะสม (GPAX)
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id="gpax-input"
          type="number"
          inputMode="decimal"
          min={0}
          max={4}
          step={0.01}
          placeholder="ยังไม่ได้กรอก"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'gpax-error' : undefined}
          className="w-32 rounded-xl border border-slate-300 px-3 py-2.5 min-h-[44px] text-sm text-slate-900"
        />
        <span className="text-xs text-slate-500">{gpax === null ? CHECK_LABEL.unknown : `บันทึกแล้ว ${gpax.toFixed(2)}`}</span>
      </div>
      {error && (
        <p id="gpax-error" role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs font-semibold text-slate-600">สอบ · Portfolio · การสมัคร</p>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
        {CHECKS.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${DOT[c]}`} aria-hidden="true" />
            {CHECK_LABEL[c]} {counts[c]}
          </span>
        ))}
      </p>
      <Link to="/route" className="mt-1 inline-block text-xs font-semibold text-blue-700 underline">
        อัปเดตรายการในหน้าเส้นทาง
      </Link>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {paths.length === 0 ? (
          <p>
            ยังไม่มีเกณฑ์รับสมัครของ{route.target.title}ที่ยืนยันจากแหล่งทางการ — V2U ใช้เส้นทางทั่วไปไปก่อน และจะเปิดให้กรอกคะแนนสอบเมื่อมีข้อมูลที่ตรวจสอบแล้ว
          </p>
        ) : (
          <ul className="space-y-1">
            {paths.map((p) => {
              const e = evaluateAdmissionPath(p, state);
              return (
                <li key={p.id}>
                  <span className="font-semibold text-slate-800">{p.name}</span> — {CHECK_LABEL.met} {e.metCount} ·{' '}
                  {CHECK_LABEL.gap} {e.gapCount} · {CHECK_LABEL.unknown} {e.unknownCount}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
