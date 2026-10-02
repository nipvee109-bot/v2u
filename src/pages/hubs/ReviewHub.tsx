import { AlarmClock, CalendarClock, HelpCircle, RotateCcw, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubHeader, HubLinkList, CountBadge } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSkillGaps } from '../../skills/engine';
import { ButtonLink, EmptyState, Stat } from '../../components/ui';

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
  const nothingDue = overdue.length === 0 && dueToday.length === 0 && weakSkills.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <HubHeader title="ทบทวน" subtitle="ทบทวนตามจังหวะที่เหมาะสม เพื่อให้จำได้จนถึงวันสอบ" />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Stat icon={AlarmClock} tone={overdue.length ? 'warn' : 'plain'} label="เลยเวลา" value={overdue.length} />
        <Stat icon={RotateCcw} label="ถึงรอบวันนี้" value={dueToday.length} />
        <Stat icon={CalendarClock} tone="good" label="รอบถัดไป" value={upcoming.length} />
      </div>

      <div className="space-y-6 sm:space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6 sm:space-y-8">
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
      {dueToday.length > 0 && (
        <HubLinkList heading={`ถึงรอบวันนี้ (${dueToday.length})`} links={dueToday.map(toLink(RotateCcw, 'ทบทวนพร้อมคำถามทบทวน'))} />
      )}
      {nothingDue && (
        <EmptyState
          icon={CheckCircle2}
          title="วันนี้ไม่มีเรื่องที่ถึงรอบ"
          body="เมื่อเรียนจบแต่ละบท V2U จะนัดรอบทบทวนให้เอง ระหว่างนี้ไปทำก้าวต่อไปได้เลย"
          action={
            <ButtonLink to="/">
              กลับไปดูก้าวต่อไปของคุณ <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          }
        />
      )}

        </div>
        <aside aria-label="อื่น ๆ" className="lg:sticky lg:top-0">
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
        </aside>
      </div>
    </div>
  );
}
