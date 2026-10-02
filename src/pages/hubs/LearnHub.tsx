import { Calculator, Code2, Atom, Brain, Cpu, BookMarked, Search, LayoutGrid, PlayCircle, Route as RouteIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SUBJECTS } from '../../types';
import type { SubjectId } from '../../types';
import { HubHeader, HubLinkList } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';

const SUBJECT_ICONS: Record<SubjectId, HubLink['icon']> = {
  math: Calculator,
  programming: Code2,
  physics: Atom,
  tgat3: Brain,
  ai: Cpu,
};

/** เรียน — subjects, lessons, resources and the study room. */
export function LearnHub() {
  const { lessons, activeLearningSession } = useStore();

  const subjectLinks: HubLink[] = (Object.keys(SUBJECTS) as SubjectId[]).map((id) => {
    const subjectLessons = lessons.filter((l) => l.subjectId === id);
    const done = subjectLessons.filter((l) => l.status === 'COMPLETED').length;
    return {
      to: `/subjects/${id}`,
      title: SUBJECTS[id].name,
      description: `เรียนจบ ${done}/${subjectLessons.length} บท`,
      icon: SUBJECT_ICONS[id],
    };
  });

  const liveSession =
    activeLearningSession &&
    activeLearningSession.status !== 'completed' &&
    activeLearningSession.status !== 'abandoned'
      ? activeLearningSession
      : null;
  const liveLesson = liveSession ? lessons.find((l) => l.id === liveSession.lessonId) : undefined;

  const toolLinks: HubLink[] = [
    ...(liveLesson
      ? [{ to: `/study/${liveLesson.id}`, title: 'ห้องเรียน', description: `เรียนต่อ: ${liveLesson.title}`, icon: PlayCircle }]
      : []),
    { to: '/learn/curriculum', title: 'หลักสูตรวิศวกรรมคอมพิวเตอร์', description: 'วิชา → หัวข้อ → บทเรียน ที่ต้องใช้สอบเข้า', icon: RouteIcon },
    { to: '/resources', title: 'คลังแหล่งเรียนรู้', description: 'วิดีโอ เอกสาร และเว็บไซต์ที่บันทึกไว้', icon: BookMarked },
    { to: '/search', title: 'ค้นหา', description: 'ค้นหาบทเรียน คลิป เอกสาร และโจทย์ที่ V2U คัดไว้', icon: Search },
    { to: '/dashboard', title: 'ภาพรวมการเรียนแบบเต็ม', description: 'แผนวันนี้ บทที่ค้าง และสรุปทั้งหมด', icon: LayoutGrid },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <HubHeader title="เรียน" subtitle="เลือกวิชาและบทเรียนที่ต้องใช้สอบเข้ามหาวิทยาลัย" />
      <HubLinkList heading="วิชา" links={subjectLinks} />
      <HubLinkList heading="เครื่องมือการเรียน" links={toolLinks} />
    </div>
  );
}
