import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { learningHubPathFor } from '../../curriculum/engine';

const LessonDetail = lazy(() => import('../LessonDetail').then((m) => ({ default: m.LessonDetail })));

/**
 * /lessons/:id is a legacy deep link. Curriculum lessons now live in the Learning Hub,
 * so redirect there; anything not in the curriculum still renders the old page (never blank).
 */
export function LegacyLessonRoute() {
  const { id } = useParams();
  const lessons = useStore((s) => s.lessons);
  const session = useStore((s) => s.activeLearningSession);
  const lesson = lessons.find((l) => l.id === id);
  const hub = lesson ? learningHubPathFor(lesson, lessons, session?.lessonId === lesson.id ? session.curriculumLessonId : null) : null;
  if (hub) return <Navigate to={hub} replace />;
  return (
    <Suspense fallback={null}>
      <LessonDetail />
    </Suspense>
  );
}
