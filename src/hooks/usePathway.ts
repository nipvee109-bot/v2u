import { useStore } from '../store/useStore';
import { useLearningRecords } from './useLearningRecords';
import { getSubjectProfiles, recommendPathway, computeLessonGaps, SUBJECT_ORDER } from '../diagnostic/engine';
import type { CurriculumSubjectId } from '../curriculum/types';

/** Per-subject skill profile + pathway, from the same store data as the next step. */
export function usePathway(subjectId?: CurriculumSubjectId) {
  const { lessons, studentProfile, diagnostic } = useStore();
  const records = useLearningRecords();
  const params = { storeLessons: lessons, records, diagnostic, profile: studentProfile, subjectId };
  return {
    subjects: getSubjectProfiles(params),
    recommendation: recommendPathway(params),
    gaps: computeLessonGaps(params).gaps,
    /** Best next lesson inside each subject (for the route view) */
    bySubject: SUBJECT_ORDER.map((s) => ({ subjectId: s, rec: recommendPathway({ ...params, subjectId: s }) })),
    hasDiagnostic: (diagnostic?.attempts.length ?? 0) > 0,
    profileSet: !!studentProfile,
  };
}
