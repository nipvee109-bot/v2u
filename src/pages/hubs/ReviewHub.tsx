import { AlarmClock, CalendarClock, HelpCircle, RotateCcw, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HubHeader, HubLinkList, CountBadge } from '../../components/navigation/HubLinkList';
import type { HubLink } from '../../components/navigation/HubLinkList';
import { useLearningRecords } from '../../hooks/useLearningRecords';
import { getSkillGaps } from '../../skills/engine';
import { ButtonLink, EmptyState, Stat } from '../../components/ui';
import { Link } from 'react-router-dom';
import { getUnclearSignals } from '../../notes/engine';

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
  const studyNotes = useStore((st) => st.learningNotes?.notes) ?? [];
  // Phase 55: what the learner said they still don't get (personal signal, mapped only when data supports it)
  const signals = getUnclearSignals(studyNotes);
  const nothingDue = overdue.length === 0 && dueToday.length === 0 && weakSkills.length === 0 && signals.length === 0;

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
            description: g.reason === 'overdue-review' ? 'ถึงเวลาทบทวนแล้ว' : g.reason === 'low-quiz' ? 'คะแนนแบบทดสอบยังไม่ผ่าน' : g.reason === 'check-confused' ? 'เช็กความเข้าใจล่าสุดยังสับสน' : 'ยังไม่แม่น',
            icon: Target,
          }))}
        />
      )}
      {dueToday.length > 0 && (
        <HubLinkList heading={`ถึงรอบวันนี้ (${dueToday.length})`} links={dueToday.map(toLink(RotateCcw, 'ทบทวนพร้อมคำถามทบทวน'))} />
      )}
      {signals.length > 0 && (
        <section aria-labelledby="said-unclear" className="space-y-3" data-testid="unclear-signals">
          <h2 id="said-unclear" className="text-base font-bold text-ink">สิ่งที่คุณเคยบอกว่ายังไม่เข้าใจ</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            {signals.map((g) => (
              <li key={`${g.lessonId}|${g.skillId ?? ''}`}>
                <Link to={`/learn/curriculum/${g.lessonId}?mode=v2u`} className="flex min-h-[60px] items-start gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink break-words">“{g.notes[g.notes.length - 1].text}”</span>
                    <span className="mt-0.5 block text-xs text-slate-500 break-words">
                      บท {g.lessonTitle} ·{' '}
                      {g.mapping === 'skill' ? `ทักษะ: ${g.skillTitle}` : 'บันทึกส่วนตัว (ยังระบุทักษะไม่ได้แน่ชัด)'}
                      {g.notes.length > 1 && ` · บอกไว้ ${g.notes.length} ครั้ง`}
                    </span>
                  </span>
                  <span className="shrink-0 self-center text-xs font-semibold text-brand-700">ทบทวน</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
