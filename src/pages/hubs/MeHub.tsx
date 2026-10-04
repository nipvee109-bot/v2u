import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { AdmissionStatusCard } from '../../components/AdmissionStatusCard';
import { ReadinessCard } from '../../components/ReadinessCard';
import { ProfileEditor } from '../../components/pathway/ProfileEditor';
import { usePathway } from '../../hooks/usePathway';
import { useNextStep } from '../../hooks/useNextStep';
import { SUBJECT_LABEL } from '../../diagnostic/engine';
import { VOCATIONAL_PROGRAMS } from '../../route/data';
import { resolvePlanningHorizon } from '../../route/engine';
import { KIcon } from '../../components/v2u/kit';
import type { IconName } from '../../components/v2u/kit';
import { ST, subOf } from '../../components/v2u/tokens';
import { AccountCard } from '../../components/account/AccountCard';

const NOT_SET = 'ยังไม่ได้ตั้ง';

/** ฉัน (design: Me) — journey hero, goals, skill status per subject, profile, readiness, settings. */
export function MeHub() {
  const { lessons, studentProfile: p } = useStore();
  const step = useNextStep();
  const pathway = usePathway();
  const completed = lessons.filter((l) => l.status === 'COMPLETED').length;
  const program = VOCATIONAL_PROGRAMS.find((x) => x.id === p?.programId)?.title;
  const horizon = resolvePlanningHorizon(p);
  const card = { padding: 20, borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' } as const;
  const goalFields = [
    ['ระดับการศึกษา', p?.educationLevel],
    ['สาขาเดิม', program],
    ['มหาวิทยาลัยเป้าหมาย', p?.targetUniversity],
    ['คณะ · สาขา', [p?.targetFaculty, p?.targetMajor].filter(Boolean).join(' · ') || undefined],
    ['เวลาที่เหลือ', p ? `${horizon.isDefault ? NOT_SET : `ประมาณ ${horizon.months} เดือน`} · วันละ ${p.availableMinutes ?? 30} นาที` : undefined],
  ] as const;
  const notAssessed = pathway.subjects.find((s) => s.status === 'not-assessed');
  const settings: { to: string; k: IconName; label: string }[] = [
    { to: '/settings', k: 'gauge', label: 'ตั้งค่า (รวมธีม)' },
    { to: '/settings?section=data', k: 'download', label: 'นำเข้า / ส่งออกข้อมูลของฉัน' },
    { to: '/progress', k: 'note', label: 'บันทึกความก้าวหน้า' },
    { to: '/analytics', k: 'target', label: 'สถิติการเรียนรู้' },
    { to: '/weekly-review', k: 'calendar', label: 'สรุปรายสัปดาห์' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-[22px] lg:max-w-6xl">
      <section className="relative flex flex-wrap items-center gap-[18px] overflow-hidden text-white" style={{ padding: 'clamp(20px,2.4vw,32px)', borderRadius: 26, background: 'radial-gradient(420px 240px at 100% 0%,rgba(132,150,255,.5),transparent 70%),linear-gradient(135deg,#0b1135 0%,#1a2490 100%)', boxShadow: 'var(--shadow-lg)' }}>
        <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[22px]" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)' }}><KIcon name="user" size={30} w={1.6} /></span>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <span className="text-xs font-semibold" style={{ letterSpacing: '.08em', color: '#c9d1ff' }}>ฉัน</span>
          <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(22px,1.4vw + 16px,30px)' }}>การเดินทางของฉัน</h1>
          <span className="flex flex-wrap items-center gap-2 text-sm" style={{ color: '#d5dbff' }}>
            {p ? `${p.educationLevel} ${program ?? ''}` : 'ยังไม่ได้บอกระดับชั้น'} <span style={{ color: '#f5c04d' }}><KIcon name="arrowR" size={16} /></span> {step.goal.label}
          </span>
          <span className="text-xs" style={{ color: '#c9d1ff' }}>เรียนจบ {completed}/{lessons.length} บท · ความคืบหน้าในเส้นทาง {step.current.progressPercent}%</span>
        </div>
        <a href="#me-profile" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold" style={{ border: '1px solid rgba(255,255,255,.25)' }}>
          <KIcon name="pen" size={16} /> แก้ไขโปรไฟล์
        </a>
      </section>

      <AccountCard />

      <section aria-labelledby="goal-h" className="flex flex-col gap-3.5" style={card}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px]" style={{ background: 'var(--dest-soft)', color: 'var(--dest)' }}><KIcon name="target" size={18} /></span>
          <h2 id="goal-h" className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>เป้าหมายของฉัน</h2>
        </div>
        <dl className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
          {goalFields.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 rounded-[14px] px-3.5 py-3" style={{ background: 'var(--surface-2)' }}>
              <dt className="text-xs font-semibold" style={{ color: 'var(--ink-3)' }}>{k}</dt>
              <dd className="text-sm font-semibold break-words" style={{ color: v ? 'var(--ink)' : 'var(--ink-3)' }}>{v || NOT_SET}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="me-diagnostic" className="flex flex-col gap-4" style={card} data-testid="me-diagnostic">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}><KIcon name="gauge" size={18} /></span>
            <h2 id="me-diagnostic" className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>การวัดระดับของฉัน</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/me/diagnostic" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold" style={{ border: '1px solid var(--line-2)', color: 'var(--ink)' }}>
              <KIcon name="refresh" size={16} /> {pathway.hasDiagnostic ? 'วัดใหม่' : 'เริ่มวัดระดับ'}
            </Link>
            {notAssessed && (
              <Link to={`/me/diagnostic?subject=${notAssessed.subjectId}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
                วัด{SUBJECT_LABEL[notAssessed.subjectId]} <KIcon name="arrowR" size={16} />
              </Link>
            )}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>แยกตามวิชา ไม่รวมเป็นคะแนนเดียว · วัดใหม่จะเก็บผลเดิมไว้เป็นประวัติ · ผลการเรียนและการเช็กความเข้าใจที่ใหม่กว่าจะปรับสถานะให้อัตโนมัติ</p>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {pathway.subjects.map((sp) => {
            const sb = subOf(sp.subjectId);
            const cells = [
              ['ready', ST.ok],
              ['developing', ST.dev],
              ['needs-review', ST.rev],
              ['not-assessed', ST.none],
            ] as const;
            return (
              <div key={sp.subjectId} className="flex flex-col gap-3.5 rounded-[18px] p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }} data-testid="subject-status" data-subject={sp.subjectId}>
                <div className="flex items-center gap-3">
                  <span className="grid h-[42px] w-[42px] place-items-center rounded-[13px]" style={{ background: sb.soft, color: sb.c }}><KIcon name={sb.k} size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{SUBJECT_LABEL[sp.subjectId]}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{sp.skills.length} ทักษะ{sp.skipped && sp.status === 'not-assessed' ? ' · ข้ามการวัดไว้ก่อน' : ''}</p>
                  </div>
                </div>
                <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" style={{ background: 'var(--none-soft)' }} role="img" aria-label={cells.map(([k, st]) => `${st.label} ${sp.counts[k]}`).join(' · ')}>
                  {cells.map(([k, st]) => (sp.counts[k] > 0 && k !== 'not-assessed' ? <span key={k} style={{ flex: sp.counts[k], background: st.c }} /> : null))}
                  {sp.counts['not-assessed'] > 0 && <span style={{ flex: sp.counts['not-assessed'] }} />}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {cells.map(([k, st]) => (
                    <span key={k} className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--surface)', opacity: sp.counts[k] ? 1 : 0.6 }}>
                      <span style={{ color: st.c }}><KIcon name={st.k} size={16} /></span>
                      <span className="font-display text-[17px] font-bold leading-none" style={{ color: 'var(--ink)' }}>{sp.counts[k]}</span>
                      <span className="min-w-0 text-xs" style={{ color: 'var(--ink-2)' }}>{st.label}</span>
                    </span>
                  ))}
                </div>
                <details>
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>ดูทักษะทั้งหมด <KIcon name="chevD" size={14} /></summary>
                  <ul className="mt-1 space-y-1.5">
                    {sp.skills.map((s) => {
                      const st = ST[s.status === 'ready' ? 'ok' : s.status === 'developing' ? 'dev' : s.status === 'needs-review' ? 'rev' : 'none'];
                      return (
                        <li key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 break-words" style={{ color: 'var(--ink)' }}>{s.title}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: st.c }} data-status={s.status}><KIcon name={st.k} size={14} /> {st.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div id="me-profile-wrap" className="flex flex-col gap-[22px] scroll-mt-20">
          <ProfileEditor />
          <ReadinessCard />
        </div>
        <div className="flex flex-col gap-[22px]">
          <AdmissionStatusCard />
          <section aria-label="การตั้งค่า" className="flex flex-col overflow-hidden" style={{ borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
            {settings.map((x, i) => (
              <Link key={x.to} to={x.to} className="flex min-h-[56px] items-center gap-3.5 px-4 hover:bg-[var(--surface-2)]" style={{ borderTop: i ? '1px solid var(--line)' : 'none', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--ink-2)' }}><KIcon name={x.k} size={20} /></span>
                <span className="flex-1 font-medium">{x.label}</span>
                <span style={{ color: 'var(--ink-3)' }}><KIcon name="chevR" size={16} /></span>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
