import { AlarmClock, CalendarClock, HelpCircle, RotateCcw, Target } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubHeader, HubLinkList, CountBadge } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSkillGaps } from '../../skills/engine';

/** ทบทวน — due reviews, review questions (inside each review room) and not-understood topics. */
export function ReviewHub() {
  const { getDueReviewItems, unclearTopics = [], lessons } = useStore();
  const records = useLearningRecords();
  const weakSkills = getSkillGaps({ storeLessons: lessons, records }).filter((g) => g.status === 'needs-review' && g.studyLessonIds.length > 0);
  const { overdue, dueToday, upcoming } = getDueReviewItems();

  const toLink = (icon: HubLink['icon'], description: string) => (item: { id: string; topic: string }): HubLink => ({
    to: `/review/${item.id}`,
    title: item.topic,
    description,
    icon,
  });

  const unclearCount = unclearTopics.filter((t) => t.status !== 'Understood').length;

  return (
    <div className="mx-auto max-w-5xl">
      <HubHeader title="ทบทวน" subtitle="ทบทวนตามจังหวะที่เหมาะสม เพื่อให้จำได้จนถึงวันสอบ" />
      {overdue.length > 0 && (
        <HubLinkList heading={`เลยเวลาทบทวน (${overdue.length})`} links={overdue.map(toLink(AlarmClock, 'ควรทบทวนก่อน'))} />
      )}
      {weakSkills.length > 0 && (
        <HubLinkList
          heading={`ทักษะที่ต้องทบทวน (${weakSkills.length})`}
          links={weakSkills.map((g) => ({
            to: `/lessons/${g.studyLessonIds[0]}`,
            title: g.skill.title,
            description: g.reason === 'overdue-review' ? 'ถึงเวลาทบทวนแล้ว' : g.reason === 'low-quiz' ? 'คะแนนแบบทดสอบยังไม่ผ่าน' : 'ยังไม่แม่น',
            icon: Target,
          }))}
        />
      )}
      <HubLinkList
        heading={`ถึงรอบวันนี้ (${dueToday.length})`}
        links={
          dueToday.length > 0
            ? dueToday.map(toLink(RotateCcw, 'ทบทวนพร้อมคำถามทบทวน'))
            : [{ to: '/', title: 'วันนี้ไม่มีเรื่องที่ถึงรอบ', description: 'กลับไปดูก้าวต่อไปของคุณ', icon: RotateCcw }]
        }
      />
      <HubLinkList
        heading="อื่น ๆ"
        links={[
          {
            to: '/not-understood',
            title: 'สิ่งที่ยังไม่แม่น',
            description: 'เรื่องที่คุณบันทึกว่ายังไม่เข้าใจ',
            icon: HelpCircle,
            badge: <CountBadge count={unclearCount} tone="red" />,
          },
          ...upcoming.slice(0, 5).map(toLink(CalendarClock, 'รอบทบทวนถัดไป')),
        ]}
      />
    </div>
  );
}
