import { Map, Target, CalendarDays, Flag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getDashboardRoadmapStatus } from '../../utils/dashboardUtils';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';

/** เส้นทาง — 6-month roadmap, goals and planner. */
export function RouteHub() {
  const { lessons } = useStore();
  const roadmap = getDashboardRoadmapStatus({ lessons });

  return (
    <div className="mx-auto max-w-5xl">
      <HubHeader title="เส้นทาง" subtitle="จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ" />

      <section aria-label="ตำแหน่งปัจจุบันบนเส้นทาง" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
          <Flag className="h-4 w-4" />
          <span>ตอนนี้: เดือนที่ {roadmap.currentMonth} จาก 6</span>
        </div>
        <p className="mt-1 text-sm font-bold text-slate-900">{roadmap.monthTitle}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${roadmap.progressPercent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          เดือนนี้เรียนจบ {roadmap.completedLessonsCount}/{roadmap.totalLessonsCount} บท ({roadmap.progressPercent}%)
        </p>
      </section>

      <HubLinkList
        links={[
          { to: '/roadmap', title: 'แผน 6 เดือน', description: 'ภาพรวมเส้นทางทั้งหมดและหมุดหมายแต่ละเดือน', icon: Map },
          { to: '/goals', title: 'เป้าหมาย', description: 'ตั้งและติดตามเป้าหมายของคุณ', icon: Target },
          { to: '/planner', title: 'ตารางเรียน & แผน', description: 'วางแผนเวลาเรียนแต่ละวัน', icon: CalendarDays },
        ]}
      />
    </div>
  );
}
