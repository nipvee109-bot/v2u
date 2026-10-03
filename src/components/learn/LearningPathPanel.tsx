import { Link } from 'react-router-dom';
import { getLearningPath } from '../../content/engine';
import { CURRICULUM } from '../../curriculum/data';
import { ResourceLink } from './ResourceLink';

/** Study Room side panel: what to learn with for this curriculum lesson. */
export function LearningPathPanel({ lessonId }: { lessonId: string }) {
  const path = getLearningPath(lessonId);
  if (!path) return null;
  const next = path.nextLessonId ? CURRICULUM.lessons.find((l) => l.id === path.nextLessonId) : undefined;
  return (
    <section aria-label="สื่อของบทนี้" className="space-y-2.5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <p className="text-sm font-bold text-brand-900">สื่อของบทนี้ที่ V2U จัดให้</p>
      {path.primary && <ResourceLink r={path.primary} heading="เริ่มจากตรงนี้" />}
      <Link to={`/learn/curriculum/${lessonId}?mode=read`} className="flex min-h-[48px] items-center rounded-2xl border border-ink/[0.08] bg-white shadow-card px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 break-words">
        อ่านบทเรียน V2U: {path.original.summary.slice(0, 60)}… ({path.original.readingMinutes} นาที)
      </Link>
      {next && <p className="text-[11px] text-slate-600">เรียนต่อ: {next.title}</p>}
    </section>
  );
}
