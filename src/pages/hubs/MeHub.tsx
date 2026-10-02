import { TrendingUp, BarChart3, CalendarCheck, Settings as SettingsIcon, ArrowDownUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';
import { AdmissionStatusCard } from '../../components/AdmissionStatusCard';
import { ReadinessCard } from '../../components/ReadinessCard';

/** ฉัน — progress, analytics, weekly summary, settings and import/export. */
export function MeHub() {
  const { lessons } = useStore();
  const completed = lessons.filter((l) => l.status === 'COMPLETED').length;

  return (
    <div className="mx-auto max-w-5xl">
      <HubHeader title="ฉัน" subtitle={`เรียนจบ ${completed}/${lessons.length} บท · ความพร้อมดูได้ด้านล่าง`} />
      <ReadinessCard />
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
  );
}
