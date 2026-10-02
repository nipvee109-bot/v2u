import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, CalendarCheck, Settings as SettingsIcon, ArrowDownUp, Flag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubLinkList } from '../../components/navigation/HubLinkList';
import { AdmissionStatusCard } from '../../components/AdmissionStatusCard';
import { ReadinessCard } from '../../components/ReadinessCard';
import { useNextStep } from '../../hooks/useNextStep';
import { ProgressRing, ScreenHeader, Surface } from '../../components/ui';

/** ฉัน — who I am in the journey, readiness, progress, settings and import/export. */
export function MeHub() {
  const { lessons, studentProfile } = useStore();
  const step = useNextStep();
  const completed = lessons.filter((l) => l.status === 'COMPLETED').length;

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <ScreenHeader title="ฉัน" subtitle={`เรียนจบ ${completed}/${lessons.length} บท · ความพร้อมดูได้ด้านล่าง`} />

      <div className="space-y-6 sm:space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6 sm:space-y-8">
      <Surface as="section" aria-label="ข้อมูลของฉัน" className="flex items-center gap-4">
        <ProgressRing value={step.current.progressPercent} size={72} label={`ความคืบหน้าในเส้นทาง ${step.current.progressPercent}%`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{studentProfile?.educationLevel ? `นักเรียน ${studentProfile.educationLevel}` : 'ยังไม่ได้บอกระดับชั้น'}</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-sm font-bold text-ink break-words">
            <Flag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {step.goal.label}
          </p>
          <p className="mt-1 text-xs text-slate-600 break-words">{step.current.label}</p>
          <Link to="/route" className="mt-1 inline-flex min-h-[32px] items-center text-xs font-semibold text-brand-700">
            {studentProfile ? 'แก้ไขเส้นทาง' : 'ตั้งค่าเส้นทางของฉัน'}
          </Link>
        </div>
      </Surface>

      <ReadinessCard />
        </div>
        <div className="space-y-6 sm:space-y-8">
      <AdmissionStatusCard />
      <HubLinkList
        heading="ความก้าวหน้า"
        links={[
          { to: '/progress', title: 'บันทึกความก้าวหน้า', description: 'ประวัติการเรียนของคุณ', icon: TrendingUp },
          { to: '/analytics', title: 'สถิติการเรียนรู้', description: 'เวลาเรียน คะแนน และความพร้อมแต่ละวิชา', icon: BarChart3 },
          { to: '/weekly-review', title: 'สรุปรายสัปดาห์', description: 'สัปดาห์นี้ทำอะไรไปบ้าง', icon: CalendarCheck },
        ]}
      />
      <HubLinkList
        heading="บัญชีและข้อมูล"
        links={[
          { to: '/settings', title: 'ตั้งค่า', description: 'ปรับแต่งการใช้งาน', icon: SettingsIcon },
          { to: '/settings?section=data', title: 'นำเข้า / ส่งออกข้อมูล', description: 'สำรองหรือย้ายข้อมูลการเรียน', icon: ArrowDownUp },
        ]}
      />
        </div>
      </div>
    </div>
  );
}
