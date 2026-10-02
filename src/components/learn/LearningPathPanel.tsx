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
    <section aria-label="สื่อของบทนี้" className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
      <p className="text-xs font-bold text-blue-900">สื่อของบทนี้ที่ V2U จัดให้</p>
      {path.primary && <ResourceLink r={path.primary} heading="เริ่มจากตรงนี้" />}
      <Link to={`/learn/curriculum/${lessonId}?mode=original`} className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-blue-700 hover:bg-blue-50">
        อ่านบทเรียน V2U: {path.original.summary.slice(0, 60)}… ({path.original.readingMinutes} นาที)
      </Link>
      {next && <p className="text-[11px] text-slate-600">เรียนต่อ: {next.title}</p>}
    </section>
  );
}
