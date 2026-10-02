import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { EDUCATION_LEVELS } from '../../route/types';
import type { EducationLevel, StudentProfile } from '../../route/types';
import { VOCATIONAL_PROGRAMS } from '../../route/data';
import { resolvePlanningHorizon } from '../../route/engine';
import { HorizonPicker } from '../HorizonPicker';
import { TimeBudgetPicker } from '../TimeBudgetPicker';

const NOT_SET = 'ยังไม่ได้ตั้ง';
type GoalKey = 'targetUniversity' | 'targetFaculty' | 'targetMajor';

/** A free-text goal field — saved as the learner typed it, never filled in by V2U. */
function GoalField({ k, label, placeholder, profile }: { k: GoalKey; label: string; placeholder: string; profile: StudentProfile | null }) {
  const setStudentProfile = useStore((s) => s.setStudentProfile);
  const [v, setV] = useState(profile?.[k] ?? '');
  const save = () => {
    const t = v.trim();
    if (t !== (profile?.[k] ?? '')) setStudentProfile({ [k]: t || undefined } as Partial<StudentProfile>);
  };
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      <input
        value={v}
        maxLength={120}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder={placeholder}
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-brand-500"
      />
      {!profile?.[k] && <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{NOT_SET}</span>}
    </label>
  );
}

/** ข้อมูลของฉัน — all onboarding fields, editable any time. Missing = shown as not set. */
export function ProfileEditor() {
  const { studentProfile, setStudentProfile } = useStore();
  const p = studentProfile;
  const horizon = resolvePlanningHorizon(p);
  const select = 'mt-1 min-h-[48px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-normal text-ink';
  return (
    <section aria-labelledby="me-profile" className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5" data-testid="profile-editor">
      <div>
        <h2 id="me-profile" className="text-base font-bold text-ink">ข้อมูลของฉัน</h2>
        <p className="text-xs text-slate-500">V2U ใช้ข้อมูลนี้จัดเส้นทาง — ช่องที่ว่างไว้จะแสดงว่า “{NOT_SET}” และกลับมากรอกทีหลังได้</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">
          ระดับการศึกษา
          <select value={p?.educationLevel ?? ''} onChange={(e) => setStudentProfile({ educationLevel: e.target.value as EducationLevel })} className={select}>
            {!p && <option value="">— {NOT_SET} —</option>}
            {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          สาขาที่เรียนสายอาชีพ
          <select value={p?.programId ?? ''} onChange={(e) => setStudentProfile({ programId: e.target.value })} className={select}>
            {!p && <option value="">— {NOT_SET} —</option>}
            {VOCATIONAL_PROGRAMS.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
        <GoalField k="targetUniversity" label="มหาวิทยาลัยเป้าหมาย" placeholder="เช่น ชื่อมหาวิทยาลัยที่อยากเข้า" profile={p} />
        <GoalField k="targetFaculty" label="คณะเป้าหมาย" placeholder="เช่น วิศวกรรมศาสตร์" profile={p} />
        <GoalField k="targetMajor" label="สาขาเป้าหมาย" placeholder="เช่น วิศวกรรมคอมพิวเตอร์" profile={p} />
      </div>
      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        ตอนนี้ V2U มีเส้นทางเตรียมเนื้อหาสำหรับวิศวกรรมคอมพิวเตอร์เท่านั้น (คณิต · ฟิสิกส์ · Programming) — V2U ไม่สร้างเกณฑ์รับเข้าของมหาวิทยาลัยขึ้นเอง
      </p>
      <div>
        <HorizonPicker value={p?.planningHorizon} onChange={(h) => setStudentProfile({ planningHorizon: h })} />
        <p className="mt-1 text-xs text-slate-500">{horizon.isDefault ? `ระยะเวลาก่อนสอบ/สมัคร: ${NOT_SET}` : `เหลือเวลาประมาณ ${horizon.months} เดือน`}</p>
      </div>
      <div>
        <TimeBudgetPicker label="เรียนได้วันละเท่าไหร่?" value={p?.availableMinutes ?? 30} onChange={(m) => setStudentProfile({ availableMinutes: m })} />
        {!p && <p className="mt-1 text-xs text-slate-500">เวลาเรียนต่อวัน: {NOT_SET}</p>}
      </div>
    </section>
  );
}
