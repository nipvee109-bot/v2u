import { EMPTY_NOTES_DATA, progressKey, sanitizeNotesData } from '../notes/engine';
import type { LearningNotesData, StudyNote, VideoProgress } from '../notes/types';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Lesson, 
  UnclearTopic, 
  StudySession, 
  WeeklyGoal, 
  LearningSession, 
  Resource,
  ConfidenceLevel,
  MasteryLevel,
  MasteryScore,
  SubjectMasterySummary,
  TopicAttentionItem,
  SubjectId,
  QuizAttempt,
  LearningRecord,
  ReviewItem,
  ReviewReason,
  ReviewOutcome,
  KnowledgeGapReasonItem,
  KnowledgeGapSeverity,
  KnowledgeGap,
  StudyGoal,
  CalculatedGoalProgress,
  GoalStatus,
  WeeklyReviewReport,
  OnboardingPreferences,
  TimestampedNote,
  Course,
  CourseModule,
  CourseItem
} from '../types';
import type { StudentProfile } from '../route/types';
import type { DiagnosticAttempt, DiagnosticData } from '../diagnostic/types';
import { EMPTY_DIAGNOSTIC } from '../diagnostic/types';
import { sanitizeDiagnosticData } from '../diagnostic/engine';
import type { CurriculumSubjectId } from '../curriculum/types';
import { DEFAULT_STUDENT_PROFILE } from '../route/data';
import { budgetFromWeeklyHours } from '../route/engine';
import { creditCurriculumLesson, skillIdsForTitles } from '../curriculum/engine';
import type { StudentAdmissionInputs } from '../admission/types';
import { EMPTY_ADMISSION_INPUTS, normalizeAdmissionInputs } from '../admission/engine';
import { 
  SUBJECTS,
  MASTERY_SCALE
} from '../types';
import { initialLessons, initialWeeklyGoal, initialGoals, createInitialGoals } from '../data/initialData';
import { initialCourses, createInitialCourses } from '../data/initialCourses';
import { 
  isValidUrl, 
  isDuplicateResource, 
  getAutoThumbnail 
} from '../utils/resourceUtils';
import { computeWeeklyReview } from '../utils/weeklyReviewUtils';
import { generateFirstWeekPlan, buildOnboardingMainGoal } from '../utils/onboardingUtils';

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export function computeNextReviewDate(
  currentReviewCount: number,
  outcome: ReviewOutcome
): { nextReviewAt: string; nextReviewCount: number; intervalDays: number } {
  const now = new Date();
  let intervalDays = 1;
  let nextReviewCount = currentReviewCount;

  switch (outcome) {
    case 'remembered': {
      nextReviewCount = currentReviewCount + 1;
      if (nextReviewCount === 1) intervalDays = 3;
      else if (nextReviewCount === 2) intervalDays = 7;
      else if (nextReviewCount === 3) intervalDays = 14;
      else intervalDays = 30;
      break;
    }
    case 'partially': {
      nextReviewCount = currentReviewCount + 1;
      if (nextReviewCount === 1) intervalDays = 1;
      else if (nextReviewCount === 2) intervalDays = 3;
      else if (nextReviewCount === 3) intervalDays = 7;
      else if (nextReviewCount === 4) intervalDays = 14;
      else intervalDays = 30;
      break;
    }
    case 'unsure': {
      nextReviewCount = currentReviewCount;
      intervalDays = currentReviewCount > 1 ? 3 : 1;
      break;
    }
    case 'forgot': {
      nextReviewCount = 0;
      intervalDays = 1;
      break;
    }
  }

  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    nextReviewAt: nextDate.toISOString(),
    nextReviewCount,
    intervalDays,
  };
}

export function computeSessionElapsedSeconds(session: LearningSession): number {
  if (session.status === 'completed' || session.status === 'abandoned') {
    return session.actualSeconds;
  }
  if (session.status === 'paused') {
    return session.accumulatedSeconds;
  }
  // status === 'active'
  const activeStart = new Date(session.resumedAt || session.startedAt).getTime();
  const now = Date.now();
  const deltaSeconds = Math.max(0, Math.floor((now - activeStart) / 1000));
  return session.accumulatedSeconds + deltaSeconds;
}

export function scoreToMasteryLevel(score: MasteryScore): MasteryLevel {
  switch (score) {
    case 4:
      return 'Mastered';
    case 3:
      return 'Proficient';
    case 2:
      return 'Familiar';
    case 1:
    case 0:
    default:
      return 'Novice';
  }
}

export function calculateDeterministicMasteryScore(params: {
  status: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  totalStudyMinutes: number;
  quizBestScore?: number;
  quizLatestScore?: number;
  confidence: ConfidenceLevel;
  reviewCount: number;
  lastReviewOutcome?: ReviewOutcome;
  hasLearnedNotes?: boolean;
  hasUnclearNotes?: boolean;
  unclearTopicsCount?: number;
}): MasteryScore {
  const {
    status,
    totalStudyMinutes,
    quizBestScore,
    quizLatestScore,
    confidence,
    reviewCount,
    lastReviewOutcome,
    hasLearnedNotes = false,
    unclearTopicsCount = 0,
  } = params;

  // Signal 0: Has the user even started?
  if (status === 'NOT STARTED' && totalStudyMinutes === 0 && quizBestScore === undefined && reviewCount === 0) {
    return 0;
  }

  // Blocker check: forgot during recent review, or multiple severe unclear points with low confidence
  const hasSevereBlocker = lastReviewOutcome === 'forgot' || (unclearTopicsCount > 1 && confidence === 'Low');

  // Level 4 (อธิบายและประยุกต์ได้):
  // - Completed lesson
  // - Strong assessment: best quiz >= 85% (and latest quiz >= 75%)
  // - Verified memory retention: review count >= 1, last review != 'forgot' && != 'unsure'
  // - Confidence 'High' (or 'Medium' with quiz >= 90%)
  // - Meaningful notes recorded (hasLearnedNotes)
  // - No severe blockers
  if (
    status === 'COMPLETED' &&
    quizBestScore !== undefined &&
    quizBestScore >= 85 &&
    (quizLatestScore === undefined || quizLatestScore >= 75) &&
    reviewCount >= 1 &&
    lastReviewOutcome !== 'forgot' &&
    lastReviewOutcome !== 'unsure' &&
    (confidence === 'High' || (confidence === 'Medium' && quizBestScore >= 90)) &&
    hasLearnedNotes &&
    !hasSevereBlocker
  ) {
    return 4;
  }

  // Level 3 (ทำโจทย์/ใช้งานได้):
  // - Completed lesson
  // - Practical application: Quiz score >= 70% OR (quiz >= 60% AND reviewCount >= 1 AND lastReviewOutcome !== 'forgot')
  // - Confidence >= 'Medium'
  // - Has invested study time (totalStudyMinutes > 0)
  // - Not severely blocked
  if (
    status === 'COMPLETED' &&
    ((quizBestScore !== undefined && quizBestScore >= 70) ||
     (quizBestScore !== undefined && quizBestScore >= 60 && reviewCount >= 1 && lastReviewOutcome !== 'forgot')) &&
    confidence !== 'Low' &&
    !hasSevereBlocker
  ) {
    return 3;
  }

  // Level 2 (อธิบายพื้นฐานได้):
  // - Completed lesson with basic understanding (quiz >= 50% OR confidence >= 'Medium' OR reviewCount >= 1 OR hasLearnedNotes)
  //   OR In-progress with substantial study time (>= 45 mins) and quiz >= 50%
  if (
    (status === 'COMPLETED' &&
      ((quizBestScore !== undefined && quizBestScore >= 50) ||
       confidence !== 'Low' ||
       reviewCount >= 1 ||
       hasLearnedNotes)) ||
    (status === 'IN PROGRESS' && quizBestScore !== undefined && quizBestScore >= 50) ||
    (status === 'IN PROGRESS' && totalStudyMinutes >= 45 && confidence !== 'Low')
  ) {
    return 2;
  }

  // Level 1 (พอรู้ว่าคืออะไร):
  // Started studying, in progress, or completed with low quiz / low confidence / no notes
  return 1;
}

/* ==================================================
   Phase 21: High-Performance Indexed Lookups & Debounced Persistence
   ================================================== */

export function buildSessionsIndex(
  learningSessionsHistory: LearningSession[] = [],
  studyPlannerSessions: StudySession[] = []
) {
  const learningMap = new Map<string, LearningSession[]>();
  for (let i = 0; i < learningSessionsHistory.length; i++) {
    const s = learningSessionsHistory[i];
    if (s.lessonId && s.status === 'completed') {
      let list = learningMap.get(s.lessonId);
      if (!list) {
        list = [];
        learningMap.set(s.lessonId, list);
      }
      list.push(s);
    }
  }

  const plannerMap = new Map<string, StudySession[]>();
  for (let i = 0; i < studyPlannerSessions.length; i++) {
    const s = studyPlannerSessions[i];
    if (s.lessonId && s.status === 'completed') {
      let list = plannerMap.get(s.lessonId);
      if (!list) {
        list = [];
        plannerMap.set(s.lessonId, list);
      }
      list.push(s);
    }
  }

  return { learningMap, plannerMap };
}

export const createDebouncedStorageEngine = (delay = 200) => {
  let pendingValue: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (key: string) => {
    if (pendingValue !== null && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, pendingValue);
      } catch (e) {
        console.error('Failed to write to localStorage:', e);
      }
      pendingValue = null;
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => flush('engineering-study-hub-storage'));
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush('engineering-study-hub-storage');
    });
  }

  return {
    getItem: (name: string): string | null => {
      if (pendingValue !== null && name === 'engineering-study-hub-storage') {
        return pendingValue;
      }
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      pendingValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        flush(name);
      }, delay);
    },
    removeItem: (name: string): void => {
      pendingValue = null;
      if (timer) clearTimeout(timer);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    },
  };
};

export function computeLessonLearningRecord(
  lesson: Lesson,
  learningSessionsHistory: LearningSession[] = [],
  studyPlannerSessions: StudySession[] = []
): LearningRecord {
  const lessonLearningSessions = learningSessionsHistory.filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );
  const lessonPlannerSessions = studyPlannerSessions.filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );

  const sessionMinutes = lessonLearningSessions.reduce(
    (acc, s) => acc + Math.round(s.actualSeconds / 60),
    0
  );
  const totalStudyMinutes = Math.max(
    lesson.totalStudyMinutes || 0,
    lesson.actualStudyMinutes || 0,
    sessionMinutes
  );

  const studyCount = Math.max(
    lesson.studyCount || 0,
    lessonLearningSessions.length,
    (lesson.status === 'COMPLETED' ? 1 : 0)
  );

  const allCompletedDates: string[] = [
    ...(lesson.completedAt ? [lesson.completedAt] : []),
    ...(lesson.firstStudiedAt ? [lesson.firstStudiedAt] : []),
    ...(lesson.lastStudiedAt ? [lesson.lastStudiedAt] : []),
    ...lessonLearningSessions.map((s) => s.completedAt).filter((d): d is string => Boolean(d)),
    ...lessonPlannerSessions.map((s) => s.completedAt).filter((d): d is string => Boolean(d)),
  ].sort();

  const firstStudiedAt = lesson.firstStudiedAt || allCompletedDates[0] || (lesson.status !== 'NOT STARTED' ? lesson.completedAt : undefined);
  const lastStudiedAt = allCompletedDates[allCompletedDates.length - 1] || lesson.lastStudiedAt || lesson.completedAt;

  const attempts = lesson.quizAttempts || [];
  const quizScores = [
    ...(lesson.quizScore !== undefined ? [lesson.quizScore] : []),
    ...attempts.map((a) => a.score),
  ];
  const quizBestScore = quizScores.length > 0 ? Math.max(...quizScores) : undefined;
  const quizLatestScore = attempts.length > 0 ? attempts[attempts.length - 1].score : lesson.quizScore;

  const confidence: ConfidenceLevel = lesson.confidence || (lesson.status === 'COMPLETED' ? 'Medium' : 'Low');
  const reviewCount = lesson.reviewCount || 0;

  // Next review date calculation via spaced repetition
  let nextReviewAt = lesson.nextReviewAt;
  if (!nextReviewAt && lastStudiedAt) {
    const daysToAdd = reviewCount === 0 ? 3 : reviewCount === 1 ? 7 : 14;
    const reviewDate = new Date(new Date(lastStudiedAt).getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    nextReviewAt = reviewDate.toISOString();
  }

  // Extract review outcome from review notes if present
  let lastReviewOutcome: ReviewOutcome | undefined;
  if (lesson.reviewNotes) {
    if (lesson.reviewNotes.includes('(จำได้)')) lastReviewOutcome = 'remembered';
    else if (lesson.reviewNotes.includes('(พอจำได้)')) lastReviewOutcome = 'partially';
    else if (lesson.reviewNotes.includes('(ยังไม่แม่น)')) lastReviewOutcome = 'unsure';
    else if (lesson.reviewNotes.includes('(จำไม่ได้)')) lastReviewOutcome = 'forgot';
  }

  const hasLearnedNotes = Boolean(lesson.learnedNotes && lesson.learnedNotes.trim().length > 10);
  const hasUnclearNotes = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 0);

  // Deterministic 0-4 Mastery calculation
  const calculatedMasteryScore: MasteryScore = calculateDeterministicMasteryScore({
    status: lesson.status,
    totalStudyMinutes,
    quizBestScore,
    quizLatestScore,
    confidence,
    reviewCount,
    lastReviewOutcome,
    hasLearnedNotes,
    hasUnclearNotes,
  });

  // Phase 56: the latest V2U understanding check names the shaky skills (titles → ids)
  const lastChecked = [...lessonLearningSessions]
    .filter((s) => s.understandingCheck)
    .sort((a, b) => (b.understandingCheck!.checkedAt || '').localeCompare(a.understandingCheck!.checkedAt || ''))[0];
  const confusedSkillIds = skillIdsForTitles(lastChecked?.understandingCheck?.confused ?? []);

  const masteryScore = lesson.masteryScore !== undefined ? lesson.masteryScore : calculatedMasteryScore;
  const calculatedMastery: MasteryLevel = scoreToMasteryLevel(masteryScore);
  const mastery: MasteryLevel = calculatedMastery;

  return {
    lessonId: lesson.id,
    subjectId: lesson.subjectId,
    firstStudiedAt,
    lastStudiedAt,
    totalStudyMinutes,
    studyCount,
    completionStatus: lesson.status,
    quizBestScore,
    quizLatestScore,
    confidence,
    mastery,
    masteryScore,
    reviewCount,
    nextReviewAt,
    ...(confusedSkillIds.length ? { confusedSkillIds } : {}),
  };
}

interface StoreState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  lessons: Lesson[];
  unclearTopics: UnclearTopic[];
  sessions: StudySession[];
  weeklyGoal: WeeklyGoal;
  
  // Learning Session Engine State
  activeLearningSession: LearningSession | null;
  learningSessionsHistory: LearningSession[];
  
  // Lesson actions
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  setLessonConfidence: (lessonId: string, confidence: ConfidenceLevel) => void;
  recordLessonReview: (lessonId: string, notes?: string) => void;
  recordQuizAttempt: (lessonId: string, score: number, notes?: string) => void;
  getLearningRecord: (lessonId: string) => LearningRecord | null;
  
  // Unclear Topic actions
  addUnclearTopic: (topic: UnclearTopic) => void;
  updateUnclearTopic: (id: string, topic: Partial<UnclearTopic>) => void;
  deleteUnclearTopic: (id: string) => void;
  
  // Study Planner Session actions
  addSession: (session: StudySession) => void;
  updateSession: (id: string, session: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  rescheduleSession: (id: string, newDate: string, startTime?: string, endTime?: string) => void;
  completeSession: (id: string, actualMinutes?: number) => void;
  skipSession: (id: string) => void;
  splitSession: (id: string) => void;
  setWeeklyGoal: (goal: Partial<WeeklyGoal>) => void;

  // Learning Session Engine Actions
  startLearningSession: (params: {
    lessonId: string;
    plannedSessionId?: string;
    plannedMinutes?: number;
    curriculumLessonId?: string;
    source?: Resource;
  }) => LearningSession;
  pauseLearningSession: () => void;
  resumeLearningSession: () => void;
  updateLearningSessionDraft: (draft: Partial<NonNullable<LearningSession['notesDraft']>>) => void;
  /** Phase 54: record the learning mode chosen for the active sitting. */
  setLearningMode: (mode: NonNullable<LearningSession['learningMode']>) => void;
  /** Phase 54: record V2U's understanding check for the active sitting. */
  recordUnderstandingCheck: (check: Omit<NonNullable<LearningSession['understandingCheck']>, 'checkedAt'>) => void;
  finishLearningSession: (actualStudyMinutes?: number, quizScore?: number, confidence?: ConfidenceLevel) => void;
  abandonLearningSession: () => void;
  recoverLearningSession: (confirmedMinutes?: number) => void;
  heartbeatLearningSession: () => void;
  switchSessionResource: (resource: Resource) => void;
  addTimestampedNote: (lessonId: string, note: { timestampSeconds: number; timestampDisplay: string; content: string }) => TimestampedNote;
  deleteTimestampedNote: (lessonId: string, noteId: string) => void;

  // Review Engine State
  reviewQueue: ReviewItem[];

  // Review Engine Actions
  addReviewItem: (item: ReviewItem) => void;
  updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void;
  deleteReviewItem: (id: string) => void;
  createReviewItemForLesson: (lessonId: string, reason?: ReviewReason, priority?: 'Low' | 'Medium' | 'High') => ReviewItem;
  submitReviewOutcome: (reviewItemId: string, outcome: ReviewOutcome, notes?: string) => void;
  getDueReviewItems: () => { overdue: ReviewItem[]; dueToday: ReviewItem[]; upcoming: ReviewItem[] };

  // Phase 11: Mastery Tracking Actions & Getters
  setLessonMasteryScore: (lessonId: string, score: MasteryScore) => void;
  getSubjectMasterySummaries: () => SubjectMasterySummary[];
  getTopicsNeedingAttention: () => TopicAttentionItem[];

  // Phase 12: Knowledge Gap Analysis Actions & Getters
  getKnowledgeGaps: () => KnowledgeGap[];

  // Phase 13: Study Goal System State & Actions
  goals: StudyGoal[];
  addGoal: (goal: StudyGoal) => void;
  updateGoal: (id: string, updates: Partial<StudyGoal>) => void;
  deleteGoal: (id: string) => void;
  calculateGoalProgress: (goal: StudyGoal) => CalculatedGoalProgress;
  getCalculatedGoals: () => (StudyGoal & CalculatedGoalProgress)[];

  // Phase 14: Resource Library State & Actions
  resources: Resource[];
  addResource: (resource: Resource) => { success: boolean; error?: string };
  updateResource: (id: string, updates: Partial<Resource>) => { success: boolean; error?: string };
  deleteResource: (id: string) => void;
  toggleFavoriteResource: (id: string) => void;
  recordResourceOpened: (id: string) => void;
  getAllResources: () => Resource[];

  // Phase 15: Weekly Learning Review
  getWeeklyReviewReport: (targetDate?: Date | string) => WeeklyReviewReport;

  // Phase 18: Study Onboarding State & Actions
  hasCompletedOnboarding: boolean;

  // Phase 43: V2U Route — starting point, target and daily time (null until set)
  studentProfile: StudentProfile | null;
  setStudentProfile: (patch: Partial<StudentProfile>) => void;

  // Phase 60: per-subject diagnostic history (latest sitting per subject is used)
  diagnostic: DiagnosticData;
  recordDiagnosticAttempt: (subjectId: CurriculumSubjectId, answers: Record<string, number | null>) => DiagnosticAttempt;
  setDiagnosticSkipped: (subjectId: CurriculumSubjectId, skipped: boolean) => void;

  // Phase 46C: what the student has told V2U (never inferred)
  admissionInputs: StudentAdmissionInputs;
  /** Phase 55: personal study notes, summaries and video progress */
  learningNotes: LearningNotesData;
  addStudyNote: (note: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>) => StudyNote;
  updateStudyNote: (id: string, patch: Partial<Pick<StudyNote, 'text' | 'type'>>) => void;
  deleteStudyNote: (id: string) => void;
  savePersonalSummary: (lessonId: string, text: string) => void;
  setVideoProgress: (lessonId: string, videoKey: string, patch: Partial<Omit<VideoProgress, 'updatedAt'>>) => void;
  setGpax: (gpax: number | null) => void;
  setExamScore: (examId: string, score: number | null) => void;
  setChecklistAnswer: (key: string, answer: 'met' | 'gap' | null) => void;
  completeOnboarding: (prefs: OnboardingPreferences) => { firstLessonId?: string };
  skipOnboarding: () => void;
  resetOnboarding: () => void;

  // Phase 38: Course & Playlist Hierarchy
  courses: Course[];
  addCourse: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  toggleCourseItemCompleted: (courseId: string, moduleId: string, itemId: string) => void;
  addModuleToCourse: (courseId: string, title: string) => string;
  addItemToCourseModule: (courseId: string, moduleId: string, item: Omit<CourseItem, 'id' | 'order' | 'completed'>) => string;

  // Import / Export / Reset
  importData: (data: {
    lessons: Lesson[];
    unclearTopics: UnclearTopic[];
    sessions?: StudySession[];
    weeklyGoal?: WeeklyGoal;
    learningSessionsHistory?: LearningSession[];
    reviewQueue?: ReviewItem[];
    goals?: StudyGoal[];
    resources?: Resource[];
    courses?: Course[];
    hasCompletedOnboarding?: boolean;
    /** v5 backups: restored when present; undefined/null keeps the current profile. */
    studentProfile?: StudentProfile | null;
    /** v5 backups with admission inputs: restored when present, kept otherwise. */
    admissionInputs?: StudentAdmissionInputs | null;
    /** Phase 55: restored when present, kept otherwise. */
    learningNotes?: LearningNotesData | null;
    diagnostic?: DiagnosticData | null;
  }) => void;
  resetToInitial: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      hasCompletedOnboarding: false,
      admissionInputs: EMPTY_ADMISSION_INPUTS,
      learningNotes: EMPTY_NOTES_DATA,
      diagnostic: EMPTY_DIAGNOSTIC,
      recordDiagnosticAttempt: (subjectId, answers) => {
        const attempt: DiagnosticAttempt = { id: `diag-${subjectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, subjectId, takenAt: new Date().toISOString(), answers: { ...answers } };
        set((state) => {
          const d = sanitizeDiagnosticData(state.diagnostic);
          // History is kept: "วัดใหม่" adds a sitting, it never deletes the old ones
          return { diagnostic: { attempts: [...d.attempts, attempt], skippedSubjects: d.skippedSubjects.filter((x) => x !== subjectId) } };
        });
        return attempt;
      },
      setDiagnosticSkipped: (subjectId, skipped) =>
        set((state) => {
          const d = sanitizeDiagnosticData(state.diagnostic);
          const rest = d.skippedSubjects.filter((x) => x !== subjectId);
          return { diagnostic: { ...d, skippedSubjects: skipped ? [...rest, subjectId] : rest } };
        }),
      addStudyNote: (input) => {
        const now = new Date().toISOString();
        const note: StudyNote = { ...input, text: input.text.trim(), id: uuidv4(), createdAt: now, updatedAt: now };
        set((state) => ({ learningNotes: { ...(state.learningNotes ?? EMPTY_NOTES_DATA), notes: [...(state.learningNotes?.notes ?? []), note] } }));
        return note;
      },
      updateStudyNote: (id, patch) =>
        set((state) => {
          const d = state.learningNotes ?? EMPTY_NOTES_DATA;
          const now = new Date().toISOString();
          return { learningNotes: { ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, ...patch, ...(patch.text !== undefined ? { text: patch.text.trim() } : {}), updatedAt: now } : n)) } };
        }),
      deleteStudyNote: (id) =>
        set((state) => {
          const d = state.learningNotes ?? EMPTY_NOTES_DATA;
          return { learningNotes: { ...d, notes: d.notes.filter((n) => n.id !== id) } };
        }),
      savePersonalSummary: (lessonId, text) =>
        set((state) => {
          const d = state.learningNotes ?? EMPTY_NOTES_DATA;
          return { learningNotes: { ...d, summaries: { ...d.summaries, [lessonId]: { lessonId, text, edited: true, updatedAt: new Date().toISOString() } } } };
        }),
      setVideoProgress: (lessonId, videoKey, patch) =>
        set((state) => {
          const d = state.learningNotes ?? EMPTY_NOTES_DATA;
          const key = progressKey(lessonId, videoKey);
          const prev = d.videoProgress[key] ?? { state: 'not-started' as const, updatedAt: '' };
          return { learningNotes: { ...d, videoProgress: { ...d.videoProgress, [key]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } } };
        }),
      setGpax: (gpax) =>
        set((state) => ({
          admissionInputs: normalizeAdmissionInputs({ ...(state.admissionInputs ?? EMPTY_ADMISSION_INPUTS), gpax }),
        })),
      setExamScore: (examId, score) =>
        set((state) => {
          const current = state.admissionInputs ?? EMPTY_ADMISSION_INPUTS;
          const examScores = { ...current.examScores };
          if (score === null) delete examScores[examId];
          else examScores[examId] = score;
          return { admissionInputs: normalizeAdmissionInputs({ ...current, examScores }) };
        }),
      setChecklistAnswer: (key, answer) =>
        set((state) => {
          const current = state.admissionInputs ?? EMPTY_ADMISSION_INPUTS;
          const checklist = { ...current.checklist };
          if (answer === null) delete checklist[key];
          else checklist[key] = answer;
          return { admissionInputs: normalizeAdmissionInputs({ ...current, checklist }) };
        }),
      studentProfile: null,
      setStudentProfile: (patch) =>
        set((state) => ({
          studentProfile: { ...(state.studentProfile ?? DEFAULT_STUDENT_PROFILE), ...patch },
        })),
      lessons: initialLessons,
      unclearTopics: [],
      // Phase 49: fresh installs start without demo history (no fake sessions/reviews/links)
      sessions: [],
      weeklyGoal: initialWeeklyGoal,
      activeLearningSession: null,
      learningSessionsHistory: [],
      reviewQueue: [],
      goals: initialGoals,
      resources: [],
      courses: initialCourses,

      // Lesson Actions
      addLesson: (lesson) =>
        set((state) => ({ lessons: [...state.lessons, lesson] })),
      updateLesson: (id, updatedLesson) =>
        set((state) => ({
          lessons: state.lessons.map((lesson) => {
            if (lesson.id === id) {
              const merged: Lesson = { ...lesson, ...updatedLesson };
              if (updatedLesson.status === 'COMPLETED' && lesson.status !== 'COMPLETED' && !merged.completedAt) {
                merged.completedAt = new Date().toISOString();
              }
              const record = computeLessonLearningRecord(merged, state.learningSessionsHistory, state.sessions);
              return {
                ...merged,
                mastery: merged.mastery || record.mastery,
              };
            }
            return lesson;
          }),
        })),
      deleteLesson: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((lesson) => lesson.id !== id),
        })),

      setLessonConfidence: (lessonId, confidence) =>
        set((state) => ({
          lessons: state.lessons.map((l) => (l.id === lessonId ? { ...l, confidence } : l)),
        })),

      recordLessonReview: (lessonId, notes) => {
        const now = new Date().toISOString();
        set((state) => ({
          lessons: state.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const currentReviewCount = l.reviewCount || 0;
            const nextCount = currentReviewCount + 1;
            const daysToAdd = nextCount === 1 ? 3 : nextCount === 2 ? 7 : 14;
            const nextReviewDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
            const noteEntry = notes ? `[${new Date().toLocaleDateString('th-TH')}] ${notes}` : '';
            const updatedReviewNotes = noteEntry 
              ? (l.reviewNotes ? `${l.reviewNotes}\n• ${noteEntry}` : `• ${noteEntry}`)
              : l.reviewNotes;

            const updatedLesson: Lesson = {
              ...l,
              lastStudiedAt: now,
              reviewCount: nextCount,
              nextReviewAt: nextReviewDate,
              reviewNotes: updatedReviewNotes,
            };

            const record = computeLessonLearningRecord(updatedLesson, state.learningSessionsHistory, state.sessions);
            return {
              ...updatedLesson,
              mastery: record.mastery,
            };
          }),
        }));
      },

      recordQuizAttempt: (lessonId, score, notes) => {
        const now = new Date().toISOString();
        const attempt: QuizAttempt = {
          id: uuidv4(),
          timestamp: now,
          score,
          notes,
        };
        set((state) => ({
          lessons: state.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const attempts = [...(l.quizAttempts || []), attempt];
            const updatedLesson: Lesson = {
              ...l,
              quizScore: score,
              quizAttempts: attempts,
              lastStudiedAt: now,
            };
            const record = computeLessonLearningRecord(updatedLesson, state.learningSessionsHistory, state.sessions);
            return {
              ...updatedLesson,
              mastery: record.mastery,
            };
          }),
        }));
      },

      getLearningRecord: (lessonId) => {
        const lesson = get().lessons.find((l) => l.id === lessonId);
        if (!lesson) return null;
        return computeLessonLearningRecord(lesson, get().learningSessionsHistory, get().sessions);
      },

      // Review Engine Actions
      addReviewItem: (item) =>
        set((state) => ({ reviewQueue: [item, ...(state.reviewQueue || [])] })),

      updateReviewItem: (id, updates) =>
        set((state) => ({
          reviewQueue: (state.reviewQueue || []).map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteReviewItem: (id) =>
        set((state) => ({
          reviewQueue: (state.reviewQueue || []).filter((r) => r.id !== id),
        })),

      createReviewItemForLesson: (lessonId, reason = 'spaced_repetition', priority = 'Medium') => {
        const lesson = get().lessons.find((l) => l.id === lessonId);
        const topic = lesson?.title || 'บทเรียน';
        const now = new Date();
        const nextDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
        const newItem: ReviewItem = {
          id: uuidv4(),
          lessonId,
          topic,
          createdAt: now.toISOString(),
          nextReviewAt: nextDate,
          reviewCount: 0,
          status: 'pending',
          reason,
          priority,
        };
        set((state) => ({
          reviewQueue: [newItem, ...(state.reviewQueue || [])],
        }));
        return newItem;
      },

      submitReviewOutcome: (reviewItemId, outcome, notes) => {
        const state = get();
        const currentItem = (state.reviewQueue || []).find((r) => r.id === reviewItemId);
        if (!currentItem) return;

        const now = new Date().toISOString();
        const { nextReviewAt, nextReviewCount } = computeNextReviewDate(currentItem.reviewCount, outcome);

        const updatedItem: ReviewItem = {
          ...currentItem,
          lastReviewedAt: now,
          nextReviewAt,
          reviewCount: nextReviewCount,
          status: outcome === 'forgot' ? 'pending' : 'completed',
        };

        // Also update the lesson
        const targetLesson = state.lessons.find((l) => l.id === currentItem.lessonId);
        let updatedLessons = state.lessons;
        if (targetLesson) {
          const outcomeLabel = outcome === 'remembered' ? 'จำได้' : outcome === 'partially' ? 'พอจำได้' : outcome === 'unsure' ? 'ยังไม่แม่น' : 'จำไม่ได้';
          const noteEntry = notes ? `[${new Date().toLocaleDateString('th-TH')}] (${outcomeLabel}) ${notes}` : `[${new Date().toLocaleDateString('th-TH')}] (${outcomeLabel})`;
          const updatedReviewNotes = targetLesson.reviewNotes ? `${targetLesson.reviewNotes}\n• ${noteEntry}` : `• ${noteEntry}`;

          const updatedLesson: Lesson = {
            ...targetLesson,
            lastStudiedAt: now,
            reviewCount: nextReviewCount,
            nextReviewAt,
            reviewNotes: updatedReviewNotes,
            masteryScore: outcome === 'forgot' ? undefined : targetLesson.masteryScore,
          };
          const record = computeLessonLearningRecord(updatedLesson, state.learningSessionsHistory, state.sessions);
          updatedLessons = state.lessons.map((l) => (l.id === currentItem.lessonId ? { 
            ...updatedLesson, 
            mastery: record.mastery,
            masteryScore: record.masteryScore,
          } : l));
        }

        set({
          reviewQueue: (state.reviewQueue || []).map((r) => (r.id === reviewItemId ? updatedItem : r)),
          lessons: updatedLessons,
        });
      },

      getDueReviewItems: () => {
        const queue = get().reviewQueue || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const overdue: ReviewItem[] = [];
        const dueToday: ReviewItem[] = [];
        const upcoming: ReviewItem[] = [];

        queue.forEach((item) => {
          if (item.status === 'completed' || item.status === 'skipped') return;
          const itemDateStr = item.nextReviewAt.split('T')[0];
          if (itemDateStr < todayStr) {
            overdue.push({ ...item, status: 'overdue' });
          } else if (itemDateStr === todayStr) {
            dueToday.push(item);
          } else {
            upcoming.push(item);
          }
        });

        return { overdue, dueToday, upcoming };
      },

      // Phase 11: Mastery Tracking Actions & Getters
      setLessonMasteryScore: (lessonId, score) => {
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  masteryScore: score,
                  mastery: scoreToMasteryLevel(score),
                }
              : l
          ),
        }));
      },

      getSubjectMasterySummaries: () => {
        const state = get();
        const { learningMap, plannerMap } = buildSessionsIndex(state.learningSessionsHistory, state.sessions);
        const subjects = Object.keys(SUBJECTS) as SubjectId[];

        return subjects.map((subId) => {
          const subLessons = state.lessons.filter((l) => l.subjectId === subId);
          const totalLessons = subLessons.length;
          const completedLessons = subLessons.filter((l) => l.status === 'COMPLETED').length;
          const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

          let actualStudyMinutes = 0;
          const quizScores: number[] = [];
          const distribution: Record<MasteryScore, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
          let sumMastery = 0;

          for (let i = 0; i < subLessons.length; i++) {
            const l = subLessons[i];
            const record = computeLessonLearningRecord(
              l,
              learningMap.get(l.id) || [],
              plannerMap.get(l.id) || []
            );
            actualStudyMinutes += record.totalStudyMinutes;
            if (record.quizBestScore !== undefined) {
              quizScores.push(record.quizBestScore);
            }
            const score = record.masteryScore ?? 0;
            distribution[score] = (distribution[score] || 0) + 1;
            sumMastery += score;
          }

          const actualStudyHours = Math.round((actualStudyMinutes / 60) * 10) / 10;
          const averageQuizScore = quizScores.length > 0
            ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
            : undefined;
          const averageMasteryScore = totalLessons > 0
            ? Math.round((sumMastery / totalLessons) * 10) / 10
            : 0;

          return {
            subjectId: subId,
            totalLessons,
            completedLessons,
            completionRate,
            actualStudyHours,
            averageQuizScore,
            averageMasteryScore,
            masteryDistribution: distribution,
          };
        });
      },

      getTopicsNeedingAttention: () => {
        const state = get();
        const { learningMap, plannerMap } = buildSessionsIndex(state.learningSessionsHistory, state.sessions);
        const todayStr = new Date().toISOString().split('T')[0];
        const items: TopicAttentionItem[] = [];

        // Pre-index overdue reviews by lessonId
        const overdueLessonsSet = new Set<string>();
        (state.reviewQueue || []).forEach((r) => {
          if (r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr) {
            overdueLessonsSet.add(r.lessonId);
          }
        });

        // Pre-index unclear topics by subjectId
        const unclearBySubject = new Map<SubjectId, UnclearTopic[]>();
        (state.unclearTopics || []).forEach((u) => {
          let list = unclearBySubject.get(u.subjectId);
          if (!list) {
            list = [];
            unclearBySubject.set(u.subjectId, list);
          }
          list.push(u);
        });

        state.lessons.forEach((lesson) => {
          const record = computeLessonLearningRecord(
            lesson,
            learningMap.get(lesson.id) || [],
            plannerMap.get(lesson.id) || []
          );
          const score = record.masteryScore ?? 0;
          const reasons: string[] = [];

          // Signal 1: Low mastery despite being started or completed
          if (lesson.status === 'COMPLETED' && score <= 2) {
            reasons.push(`เรียนจบแล้วแต่ระดับความเข้าใจยังอยู่ระดับ ${score}/4 (${MASTERY_SCALE[score].title})`);
          } else if (lesson.status === 'IN PROGRESS' && score <= 1 && record.totalStudyMinutes >= 45) {
            reasons.push(`กำลังเรียนและใช้เวลาไปแล้ว ${Math.round(record.totalStudyMinutes / 60)} ชม. แต่ยังอยู่ระดับ ${score}/4`);
          }

          // Signal 2: Low quiz score (< 60%)
          if (record.quizBestScore !== undefined && record.quizBestScore < 60) {
            reasons.push(`คะแนนแบบทดสอบ ${record.quizBestScore}% (ต่ำกว่าเกณฑ์ 60%)`);
          }

          // Signal 3: Unclear topics or repeated unclear notes
          const subjectUnclears = unclearBySubject.get(lesson.subjectId) || [];
          const lessonTitleLower = lesson.title.toLowerCase();
          const unclearForLesson = subjectUnclears.filter(
            (u) => (u.topic.toLowerCase().includes(lessonTitleLower) || lessonTitleLower.includes(u.topic.toLowerCase())) ||
                   (u.status !== 'Understood' && lesson.stillUnclearNotes && lesson.stillUnclearNotes.length > 5)
          );
          const hasUnclearNotes = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 5);
          const unclearCount = unclearForLesson.length + (hasUnclearNotes ? 1 : 0);

          if (unclearCount > 0) {
            reasons.push(`มีบันทึกจุดที่ยังไม่เข้าใจ ${unclearCount} รายการ`);
          }

          // Signal 4: Overdue review in reviewQueue
          const isOverdueReview = overdueLessonsSet.has(lesson.id);

          if (isOverdueReview) {
            reasons.push('มีรอบทบทวนที่เลยกำหนดเวลา (Overdue Review)');
          }

          if (reasons.length > 0) {
            items.push({
              lessonId: lesson.id,
              topic: lesson.title,
              subjectId: lesson.subjectId,
              masteryScore: score,
              completionStatus: lesson.status,
              quizScore: record.quizBestScore,
              unclearCount,
              isOverdueReview,
              reasons,
            });
          }
        });

        // Sort: overdue reviews first, then most reasons, then lowest mastery
        return items.sort((a, b) => {
          if (a.isOverdueReview !== b.isOverdueReview) {
            return a.isOverdueReview ? -1 : 1;
          }
          if (a.reasons.length !== b.reasons.length) {
            return b.reasons.length - a.reasons.length;
          }
          return a.masteryScore - b.masteryScore;
        });
      },

      // Phase 12: Knowledge Gap Analysis Actions & Getters
      getKnowledgeGaps: () => {
        const state = get();
        const todayStr = new Date().toISOString().split('T')[0];
        const gaps: KnowledgeGap[] = [];
        const processedLessonIds = new Set<string>();
        const { learningMap, plannerMap } = buildSessionsIndex(state.learningSessionsHistory, state.sessions);

        // Pre-index reviewQueue by lessonId
        const reviewsByLesson = new Map<string, ReviewItem[]>();
        (state.reviewQueue || []).forEach((r) => {
          let list = reviewsByLesson.get(r.lessonId);
          if (!list) {
            list = [];
            reviewsByLesson.set(r.lessonId, list);
          }
          list.push(r);
        });

        // Pre-index unclearTopics by subjectId
        const unclearBySubject = new Map<SubjectId, UnclearTopic[]>();
        (state.unclearTopics || []).forEach((u) => {
          let list = unclearBySubject.get(u.subjectId);
          if (!list) {
            list = [];
            unclearBySubject.set(u.subjectId, list);
          }
          list.push(u);
        });

        // 1. Scan lessons
        state.lessons.forEach((lesson) => {
          const record = computeLessonLearningRecord(
            lesson,
            learningMap.get(lesson.id) || [],
            plannerMap.get(lesson.id) || []
          );
          const mastery = record.masteryScore ?? 0;
          const quizScore = record.quizBestScore;
          const lastStudied = record.lastStudiedAt || lesson.lastStudiedAt || lesson.completedAt;

          // Check overdue Spaced Reviews for this lesson
          const lessonReviews = reviewsByLesson.get(lesson.id) || [];
          const overdueReviews = lessonReviews.filter(
            (r) => r.status !== 'completed' && r.nextReviewAt.split('T')[0] < todayStr
          );
          const isOverdueReview = overdueReviews.length > 0;
          let overdueDays = 0;
          if (isOverdueReview) {
            const todayTime = new Date(todayStr).getTime();
            const oldestDueTime = Math.min(...overdueReviews.map((r) => new Date(r.nextReviewAt.split('T')[0]).getTime()));
            overdueDays = Math.max(1, Math.round((todayTime - oldestDueTime) / (1000 * 60 * 60 * 24)));
          }

          // Check last reviewed timestamp from reviewQueue or lesson reviewNotes
          const reviewedWithDate = lessonReviews.filter((r) => r.lastReviewedAt);
          const lastReviewed = reviewedWithDate.length > 0
            ? reviewedWithDate.sort((a, b) => new Date(b.lastReviewedAt!).getTime() - new Date(a.lastReviewedAt!).getTime())[0].lastReviewedAt
            : undefined;

          // Find unclear topics correlated with this lesson
          const subjectUnclears = unclearBySubject.get(lesson.subjectId) || [];
          const lessonTitleLower = lesson.title.toLowerCase();
          const matchingUnclear = subjectUnclears.filter(
            (u) => u.status !== 'Understood' && 
                   (u.topic.toLowerCase().includes(lessonTitleLower) || lessonTitleLower.includes(u.topic.toLowerCase()))
          );
          const hasStillUnclearNotes = Boolean(lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 0);
          const unclearCount = matchingUnclear.length + (hasStillUnclearNotes ? 1 : 0);

          const reasons: KnowledgeGapReasonItem[] = [];

          // Reason 1: Low quiz score (< 60%)
          if (quizScore !== undefined && quizScore < 60) {
            reasons.push({
              code: 'low_quiz',
              label: `คะแนนแบบทดสอบต่ำกว่าเกณฑ์ (${quizScore}%)`,
              description: `ผลการทดสอบได้ ${quizScore}% ซึ่งต่ำกว่าเกณฑ์ 60% ควรทำความเข้าใจเนื้อหาใหม่และฝึกทำโจทย์`,
              severity: quizScore < 50 ? 'critical' : 'moderate',
            });
          }

          // Reason 2: Repeated unclear / unresolved questions
          if (unclearCount > 0) {
            reasons.push({
              code: 'repeated_unclear',
              label: `มีประเด็นที่ยังไม่เข้าใจ (${unclearCount} รายการ)`,
              description: `มีบันทึกประเด็นที่ยังไม่เข้าใจค้างอยู่ ${unclearCount} รายการ ควรกลับไปอ่านหรือขอคำแนะนำเพิ่มเติม`,
              severity: unclearCount >= 2 ? 'critical' : 'moderate',
            });
          }

          // Reason 3: Low mastery
          if (lesson.status === 'COMPLETED' && mastery <= 2) {
            reasons.push({
              code: 'low_mastery',
              label: `ระดับความเข้าใจต่ำกว่าเกณฑ์ (${mastery}/4 - ${MASTERY_SCALE[mastery].title})`,
              description: `เรียนจบแล้วแต่ระดับความเข้าใจยังอยู่ระดับ ${mastery}/4 ควรทบทวนเพื่อพัฒนาสู่ระดับประยุกต์ใช้งานได้`,
              severity: mastery <= 1 ? 'critical' : 'moderate',
            });
          } else if (lesson.status === 'IN PROGRESS' && (record.totalStudyMinutes >= 45 || (lesson.actualStudyMinutes || 0) >= 45) && mastery <= 1) {
            reasons.push({
              code: 'low_mastery',
              label: `ระดับความเข้าใจพัฒนาช้า (${mastery}/4 - ${MASTERY_SCALE[mastery].title})`,
              description: `กำลังเรียนและใช้เวลาไปแล้ว ${Math.round(record.totalStudyMinutes / 60)} ชม. แต่ความเข้าใจยังอยู่ระดับ ${mastery}/4`,
              severity: 'moderate',
            });
          }

          // Reason 4: Review overdue
          if (isOverdueReview) {
            reasons.push({
              code: 'review_overdue',
              label: `เลยกำหนดทบทวน Spaced Review (${overdueDays} วัน)`,
              description: `เลยกำหนดทบทวนมาแล้ว ${overdueDays} วัน อาจทำให้ข้อมูลลืมเลือนตามเส้นโค้งการลืม (Forgetting Curve)`,
              severity: overdueDays >= 3 ? 'critical' : 'moderate',
            });
          }

          // Reason 5: Never reviewed
          if (lesson.status === 'COMPLETED' && (record.reviewCount === 0 || (lesson.reviewCount || 0) === 0)) {
            reasons.push({
              code: 'never_reviewed',
              label: 'เรียนจบแล้วแต่ยังไม่เคยทบทวน (0 รอบ)',
              description: 'ยังไม่มีประวัติการทบทวนแบบ Active Recall เพื่อฝังความจำระยะยาว',
              severity: 'minor',
            });
          }

          if (reasons.length > 0) {
            processedLessonIds.add(lesson.id);

            // Compute overall severity
            const hasCritical = reasons.some((r) => r.severity === 'critical');
            const hasModerate = reasons.some((r) => r.severity === 'moderate');
            const severity: KnowledgeGapSeverity = (hasCritical || reasons.length >= 3)
              ? 'critical'
              : (hasModerate || reasons.length >= 2)
              ? 'moderate'
              : 'minor';

            // Compute deterministic scoreWeight
            let scoreWeight = 0;
            if (isOverdueReview) scoreWeight += 45 + Math.min(30, overdueDays * 5);
            if (quizScore !== undefined && quizScore < 60) scoreWeight += 40 + Math.max(0, 60 - quizScore);
            if (unclearCount > 0) scoreWeight += 35 + unclearCount * 5;
            scoreWeight += (4 - mastery) * 10;
            if (reasons.some((r) => r.code === 'never_reviewed')) scoreWeight += 20;
            if (severity === 'critical') scoreWeight += 30;
            else if (severity === 'moderate') scoreWeight += 15;

            gaps.push({
              id: `gap-${lesson.id}`,
              topic: lesson.title,
              subject: lesson.subjectId,
              relatedLessonIds: [lesson.id],
              reasons,
              mastery,
              lastStudied,
              lastReviewed,
              quizScore,
              severity,
              scoreWeight,
              unclearCount,
              unclearNotes: lesson.stillUnclearNotes,
              learnedNotes: lesson.learnedNotes || lesson.notes,
              reviewNotes: lesson.reviewNotes,
            });
          }
        });

        // 2. Scan orphaned unclearTopics that didn't match any processed lesson
        (state.unclearTopics || []).forEach((u) => {
          if (u.status !== 'Understood') {
            const alreadyLinked = gaps.some((g) =>
              g.subject === u.subjectId && (g.topic.toLowerCase().includes(u.topic.toLowerCase()) || u.topic.toLowerCase().includes(g.topic.toLowerCase()))
            );

            if (!alreadyLinked) {
              const severity: KnowledgeGapSeverity = u.priority === 'High' ? 'critical' : u.priority === 'Medium' ? 'moderate' : 'minor';
              gaps.push({
                id: `gap-unclear-${u.id}`,
                topic: u.topic,
                subject: u.subjectId,
                relatedLessonIds: [],
                reasons: [
                  {
                    code: 'repeated_unclear',
                    label: `มีข้อสงสัยติดค้าง: ${u.topic}`,
                    description: u.details || 'บันทึกไว้ในหัวข้อที่ยังไม่เข้าใจ',
                    severity,
                  },
                ],
                mastery: 0,
                lastStudied: u.createdAt,
                lastReviewed: undefined,
                quizScore: undefined,
                severity,
                scoreWeight: u.priority === 'High' ? 65 : u.priority === 'Medium' ? 45 : 30,
                unclearCount: 1,
                unclearNotes: u.details,
                learnedNotes: undefined,
                reviewNotes: undefined,
              });
            }
          }
        });

        // Sort descending by scoreWeight, then most recent lastStudied
        return gaps.sort((a, b) => {
          if (b.scoreWeight !== a.scoreWeight) {
            return b.scoreWeight - a.scoreWeight;
          }
          const timeA = a.lastStudied ? new Date(a.lastStudied).getTime() : 0;
          const timeB = b.lastStudied ? new Date(b.lastStudied).getTime() : 0;
          return timeB - timeA;
        });
      },

      // Phase 13: Study Goal System Actions & Auto-Progress
      addGoal: (goal) =>
        set((state) => ({ goals: [goal, ...(state.goals || [])] })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: (state.goals || []).map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: (state.goals || []).filter((g) => g.id !== id),
        })),

      calculateGoalProgress: (goal: StudyGoal): CalculatedGoalProgress => {
        const state = get();
        const todayStr = new Date().toISOString().split('T')[0];

        // Normalize date strings
        const startDayStr = goal.startDate.includes('T') ? goal.startDate.split('T')[0] : goal.startDate;
        const targetDayStr = goal.targetDate.includes('T') ? goal.targetDate.split('T')[0] : goal.targetDate;

        const todayTime = new Date(todayStr).getTime();
        const targetTime = new Date(targetDayStr).getTime();
        const remainingDays = Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));

        let currentValue = 0;
        let recentActivityText: string | undefined;

        switch (goal.type) {
          case 'study_hours': {
            // Real source 1: Completed learning sessions
            const completedLearningSessions = (state.learningSessionsHistory || []).filter((s) => {
              if (s.status !== 'completed' || !s.completedAt) return false;
              const dateStr = s.completedAt.split('T')[0];
              if (dateStr < startDayStr || dateStr > targetDayStr) return false;
              if (goal.subjectId) {
                const l = state.lessons.find((les) => les.id === s.lessonId);
                return l?.subjectId === goal.subjectId;
              }
              return true;
            });

            // Real source 2: Completed study planner sessions (exclude if already in learning sessions)
            const completedPlannerSessions = (state.sessions || []).filter((s) => {
              if (s.status !== 'completed') return false;
              const dateStr = s.completedAt ? s.completedAt.split('T')[0] : s.date;
              if (dateStr < startDayStr || dateStr > targetDayStr) return false;
              if (goal.subjectId && s.subjectId !== goal.subjectId) return false;
              const alreadyInLearning = completedLearningSessions.some(ls => ls.plannedSessionId === s.id);
              return !alreadyInLearning;
            });

            const minutesLearning = completedLearningSessions.reduce((acc, s) => acc + Math.round((s.actualSeconds || 0) / 60), 0);
            const minutesPlanner = completedPlannerSessions.reduce((acc, s) => acc + (s.actualMinutes || s.plannedMinutes || 0), 0);
            const totalMinutes = minutesLearning + minutesPlanner;

            currentValue = Math.round((totalMinutes / 60) * 10) / 10;

            const allCompletedSessions = [
              ...completedLearningSessions.map(s => ({
                title: state.lessons.find(l => l.id === s.lessonId)?.title || 'เซสชันเรียน',
                date: s.completedAt!,
                minutes: Math.round(s.actualSeconds / 60),
              })),
              ...completedPlannerSessions.map(s => ({
                title: s.title,
                date: s.completedAt || s.date,
                minutes: s.actualMinutes || s.plannedMinutes,
              })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (allCompletedSessions.length > 0) {
              const latest = allCompletedSessions[0];
              recentActivityText = `เรียน ${latest.minutes} นาที (${latest.title})`;
            }
            break;
          }

          case 'lessons_completed': {
            const completedLessons = state.lessons.filter((l) => {
              if (l.status !== 'COMPLETED' || !l.completedAt) return false;
              const dateStr = l.completedAt.split('T')[0];
              if (dateStr < startDayStr || dateStr > targetDayStr) return false;
              if (goal.subjectId && l.subjectId !== goal.subjectId) return false;
              return true;
            });

            currentValue = completedLessons.length;
            if (completedLessons.length > 0) {
              const latest = [...completedLessons].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
              recentActivityText = `เรียนจบ: ${latest.title}`;
            }
            break;
          }

          case 'subject_milestones': {
            const targetSubject = goal.subjectId;
            const completedLessons = state.lessons.filter((l) => {
              if (l.status !== 'COMPLETED' || !l.completedAt) return false;
              if (targetSubject && l.subjectId !== targetSubject) return false;
              if (goal.scope !== 'six_month') {
                const dateStr = l.completedAt.split('T')[0];
                if (dateStr < startDayStr || dateStr > targetDayStr) return false;
              }
              return true;
            });

            currentValue = completedLessons.length;
            if (completedLessons.length > 0) {
              const latest = [...completedLessons].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
              recentActivityText = `จบวิชา: ${latest.title}`;
            }
            break;
          }

          case 'review_consistency': {
            const reviewedItems = (state.reviewQueue || []).filter((r) => {
              if (!r.lastReviewedAt) return false;
              const dateStr = r.lastReviewedAt.split('T')[0];
              return dateStr >= startDayStr && dateStr <= targetDayStr;
            });

            const reviewSessions = (state.sessions || []).filter((s) => {
              if (s.type !== 'review' || s.status !== 'completed') return false;
              const dateStr = s.completedAt ? s.completedAt.split('T')[0] : s.date;
              return dateStr >= startDayStr && dateStr <= targetDayStr;
            });

            currentValue = reviewedItems.length + reviewSessions.length;
            if (reviewedItems.length > 0) {
              const latest = [...reviewedItems].sort((a, b) => new Date(b.lastReviewedAt!).getTime() - new Date(a.lastReviewedAt!).getTime())[0];
              recentActivityText = `ทบทวน: ${latest.topic}`;
            }
            break;
          }

          case 'quiz_target': {
            const allAttempts: { score: number; timestamp: string; title: string }[] = [];
            state.lessons.forEach((l) => {
              if (goal.subjectId && l.subjectId !== goal.subjectId) return;
              (l.quizAttempts || []).forEach((a) => {
                const dateStr = a.timestamp.split('T')[0];
                if (dateStr >= startDayStr && dateStr <= targetDayStr) {
                  allAttempts.push({ score: a.score, timestamp: a.timestamp, title: l.title });
                }
              });
              if ((!l.quizAttempts || l.quizAttempts.length === 0) && l.quizScore !== undefined && l.completedAt) {
                const dateStr = l.completedAt.split('T')[0];
                if (dateStr >= startDayStr && dateStr <= targetDayStr) {
                  allAttempts.push({ score: l.quizScore, timestamp: l.completedAt, title: l.title });
                }
              }
            });

            if (goal.unit === '%') {
              currentValue = allAttempts.length > 0
                ? Math.round(allAttempts.reduce((acc, a) => acc + a.score, 0) / allAttempts.length)
                : 0;
            } else {
              currentValue = allAttempts.filter((a) => a.score >= 70).length;
            }

            if (allAttempts.length > 0) {
              const latest = allAttempts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              recentActivityText = `แบบทดสอบได้ ${latest.score}% (${latest.title})`;
            }
            break;
          }

          case 'custom':
          default: {
            currentValue = goal.customProgress ?? goal.currentValue ?? 0;
            if (goal.customProgress !== undefined) {
              recentActivityText = `อัปเดตล่าสุด: ${currentValue} ${goal.unit}`;
            }
            break;
          }
        }

        // QA: Zero values & progress computation
        let progressPercent = 0;
        if (goal.targetValue > 0) {
          progressPercent = Math.min(100, Math.round((currentValue / goal.targetValue) * 100));
        } else {
          progressPercent = currentValue > 0 ? 100 : 0;
        }

        const remainingValue = Math.max(0, Math.round((goal.targetValue - currentValue) * 10) / 10);

        // QA: Completed & Expired status
        let status: GoalStatus = 'in_progress';
        if (goal.targetValue > 0 && currentValue >= goal.targetValue) {
          status = 'completed';
        } else if (todayStr > targetDayStr) {
          status = 'expired';
        } else {
          status = 'in_progress';
        }

        return {
          currentValue,
          progressPercent,
          remainingValue,
          remainingDays,
          status,
          recentActivityText,
        };
      },

      getCalculatedGoals: () => {
        const state = get();
        const rawGoals = state.goals || [];

        const calculated = rawGoals.map((g) => {
          const progress = state.calculateGoalProgress(g);
          return {
            ...g,
            ...progress,
          };
        });

        // Sort: in_progress first (sorted by remainingDays ascending), then completed, then expired
        return calculated.sort((a, b) => {
          const statusOrder: Record<GoalStatus, number> = {
            in_progress: 1,
            completed: 2,
            expired: 3,
          };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          if (a.status === 'in_progress') {
            return a.remainingDays - b.remainingDays;
          }
          return new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime();
        });
      },

      // Phase 14: Resource Library Actions
      getAllResources: () => {
        const state = get();
        const resMap = new Map<string, Resource>();

        // 1. Add all from state.resources
        (state.resources || []).forEach((r) => {
          if (r && r.id) {
            resMap.set(r.id, r);
          }
        });

        // 2. Also merge any embedded lesson resources (for backward compatibility)
        (state.lessons || []).forEach((lesson) => {
          (lesson.resources || []).forEach((lr) => {
            if (lr && lr.id) {
              if (!resMap.has(lr.id)) {
                resMap.set(lr.id, {
                  ...lr,
                  lessonId: lr.lessonId || lesson.id,
                  subject: lr.subject || lesson.subjectId,
                  createdAt: lr.createdAt || new Date().toISOString(),
                });
              }
            }
          });
        });

        return Array.from(resMap.values());
      },

      addResource: (resource) => {
        if (!resource.title || !resource.title.trim()) {
          return { success: false, error: 'กรุณากรอกชื่อแหล่งเรียนรู้' };
        }
        if (!isValidUrl(resource.url)) {
          return { success: false, error: 'URL ไม่ถูกต้อง กรุณากรอก URL ที่ขึ้นต้นด้วย http:// หรือ https://' };
        }
        const allCurrent = get().getAllResources();
        if (isDuplicateResource(resource.url, resource.id, allCurrent)) {
          return { success: false, error: 'มีแหล่งเรียนรู้ที่ใช้ URL นี้อยู่ในระบบแล้ว' };
        }

        const id = resource.id || uuidv4();
        const thumbnail = getAutoThumbnail(resource.url, resource.type, resource.thumbnail);
        const now = new Date().toISOString();

        const newResource: Resource = {
          ...resource,
          id,
          thumbnail,
          createdAt: resource.createdAt || now,
          favorite: !!resource.favorite,
        };

        set((state) => {
          const updatedResources = [newResource, ...(state.resources || [])];

          let updatedLessons = state.lessons;
          if (newResource.lessonId) {
            updatedLessons = state.lessons.map((lesson) => {
              if (lesson.id === newResource.lessonId) {
                const existsInLesson = (lesson.resources || []).some((r) => r.id === id);
                return {
                  ...lesson,
                  resources: existsInLesson
                    ? lesson.resources.map((r) => (r.id === id ? newResource : r))
                    : [...(lesson.resources || []), newResource],
                };
              }
              return lesson;
            });
          }

          return {
            resources: updatedResources,
            lessons: updatedLessons,
          };
        });

        return { success: true };
      },

      updateResource: (id, updates) => {
        if (updates.url !== undefined && !isValidUrl(updates.url)) {
          return { success: false, error: 'URL ไม่ถูกต้อง กรุณากรอก URL ที่ขึ้นต้นด้วย http:// หรือ https://' };
        }
        const allCurrent = get().getAllResources();
        if (updates.url && isDuplicateResource(updates.url, id, allCurrent)) {
          return { success: false, error: 'มีแหล่งเรียนรู้ที่ใช้ URL นี้อยู่ในระบบแล้ว' };
        }

        set((state) => {
          let foundResource = (state.resources || []).find((r) => r.id === id);
          if (!foundResource) {
            for (const l of state.lessons) {
              const found = (l.resources || []).find((r) => r.id === id);
              if (found) {
                foundResource = { ...found, lessonId: found.lessonId || l.id, subject: found.subject || l.subjectId };
                break;
              }
            }
          }

          const mergedResource: Resource = {
            ...(foundResource || { id, title: '', url: '', type: 'other', subject: 'math' }),
            ...updates,
            id,
          };

          if (updates.url || updates.type || updates.thumbnail !== undefined) {
            mergedResource.thumbnail = getAutoThumbnail(
              mergedResource.url,
              mergedResource.type,
              mergedResource.thumbnail
            );
          }

          const updatedResources = (state.resources || []).some((r) => r.id === id)
            ? state.resources.map((r) => (r.id === id ? mergedResource : r))
            : [mergedResource, ...(state.resources || [])];

          const updatedLessons = state.lessons.map((lesson) => {
            const hasInLesson = (lesson.resources || []).some((r) => r.id === id);
            const shouldBeInLesson = mergedResource.lessonId === lesson.id;

            if (shouldBeInLesson) {
              return {
                ...lesson,
                resources: hasInLesson
                  ? lesson.resources.map((r) => (r.id === id ? mergedResource : r))
                  : [...(lesson.resources || []), mergedResource],
              };
            } else if (hasInLesson) {
              return {
                ...lesson,
                resources: lesson.resources.filter((r) => r.id !== id),
              };
            }
            return lesson;
          });

          return {
            resources: updatedResources,
            lessons: updatedLessons,
          };
        });

        return { success: true };
      },

      deleteResource: (id) =>
        set((state) => ({
          resources: (state.resources || []).filter((r) => r.id !== id),
          lessons: state.lessons.map((lesson) => ({
            ...lesson,
            resources: (lesson.resources || []).filter((r) => r.id !== id),
          })),
        })),

      toggleFavoriteResource: (id) =>
        set((state) => {
          let currentFav = false;
          const resInState = (state.resources || []).find((r) => r.id === id);
          if (resInState) {
            currentFav = !!resInState.favorite;
          } else {
            for (const l of state.lessons) {
              const found = (l.resources || []).find((r) => r.id === id);
              if (found) {
                currentFav = !!found.favorite;
                break;
              }
            }
          }
          const newFav = !currentFav;

          return {
            resources: (state.resources || []).map((r) =>
              r.id === id ? { ...r, favorite: newFav } : r
            ),
            lessons: state.lessons.map((lesson) => ({
              ...lesson,
              resources: (lesson.resources || []).map((r) =>
                r.id === id ? { ...r, favorite: newFav } : r
              ),
            })),
          };
        }),

      recordResourceOpened: (id) =>
        set((state) => {
          const now = new Date().toISOString();
          return {
            resources: (state.resources || []).map((r) =>
              r.id === id ? { ...r, lastOpened: now } : r
            ),
            lessons: state.lessons.map((lesson) => ({
              ...lesson,
              resources: (lesson.resources || []).map((r) =>
                r.id === id ? { ...r, lastOpened: now } : r
              ),
            })),
          };
        }),

      // Phase 15: Weekly Learning Review
      getWeeklyReviewReport: (targetDate) => {
        const state = get();
        return computeWeeklyReview({
          targetDate,
          lessons: state.lessons,
          sessions: state.sessions,
          learningSessionsHistory: state.learningSessionsHistory,
          reviewQueue: state.reviewQueue,
          unclearTopics: state.unclearTopics,
          goals: state.goals,
          weeklyGoal: state.weeklyGoal,
        });
      },

      // Unclear Topic Actions
      addUnclearTopic: (topic) => 
        set((state) => ({ unclearTopics: [...state.unclearTopics, topic] })),
      updateUnclearTopic: (id, updatedTopic) =>
        set((state) => ({
          unclearTopics: state.unclearTopics.map((topic) =>
            topic.id === id ? { ...topic, ...updatedTopic } : topic
          ),
        })),
      deleteUnclearTopic: (id) =>
        set((state) => ({
          unclearTopics: state.unclearTopics.filter((topic) => topic.id !== id),
        })),

      // Study Planner Session Actions
      addSession: (session) =>
        set((state) => ({ sessions: [...(state.sessions || []), session] })),
      updateSession: (id, updatedSession) =>
        set((state) => ({
          sessions: (state.sessions || []).map((session) =>
            session.id === id ? { ...session, ...updatedSession, updatedAt: new Date().toISOString() } : session
          ),
        })),
      deleteSession: (id) =>
        set((state) => ({
          sessions: (state.sessions || []).filter((session) => session.id !== id),
        })),
      rescheduleSession: (id, newDate, startTime, endTime) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) => {
            if (s.id !== id) return s;
            const updated: StudySession = {
              ...s,
              date: newDate,
              status: 'planned',
              updatedAt: new Date().toISOString(),
            };
            if (startTime) updated.startTime = startTime;
            if (endTime) updated.endTime = endTime;
            return updated;
          }),
        })),
      completeSession: (id, actualMinutes) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) => {
            if (s.id !== id) return s;
            const completedAt = new Date().toISOString();
            return {
              ...s,
              status: 'completed',
              actualMinutes: actualMinutes ?? s.plannedMinutes,
              completedAt,
              updatedAt: completedAt,
            };
          }),
        })),
      skipSession: (id) =>
        set((state) => ({
          sessions: (state.sessions || []).map((s) =>
            s.id === id ? { ...s, status: 'skipped', updatedAt: new Date().toISOString() } : s
          ),
        })),
      splitSession: (id) =>
        set((state) => {
          const session = (state.sessions || []).find((s) => s.id === id);
          if (!session || session.plannedMinutes <= 30) return state;

          const halfMinutes = Math.floor(session.plannedMinutes / 2);
          const [startH, startM] = session.startTime.split(':').map(Number);
          const startTotal = (startH || 0) * 60 + (startM || 0);
          const midTotal = startTotal + halfMinutes;
          const midH = Math.floor(midTotal / 60) % 24;
          const midM = midTotal % 60;
          const midTime = `${midH.toString().padStart(2, '0')}:${midM.toString().padStart(2, '0')}`;

          const part1: StudySession = {
            ...session,
            title: `${session.title} (Part 1)`,
            endTime: midTime,
            plannedMinutes: halfMinutes,
            updatedAt: new Date().toISOString(),
          };

          const part2: StudySession = {
            ...session,
            id: uuidv4(),
            title: `${session.title} (Part 2)`,
            startTime: midTime,
            endTime: session.endTime,
            plannedMinutes: session.plannedMinutes - halfMinutes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            sessions: state.sessions.map((s) => (s.id === id ? part1 : s)).concat(part2),
          };
        }),
      setWeeklyGoal: (goal) =>
        set((state) => ({
          weeklyGoal: { ...(state.weeklyGoal || initialWeeklyGoal), ...goal },
        })),

      // Learning Session Engine Actions
      startLearningSession: ({ lessonId, plannedSessionId, plannedMinutes, curriculumLessonId, source }) => {
        const now = new Date().toISOString();
        const newSession: LearningSession = {
          sessionId: uuidv4(),
          plannedSessionId,
          ...(plannedMinutes ? { plannedMinutes } : {}),
          ...(curriculumLessonId ? { curriculumLessonId } : {}),
          lessonId,
          startedAt: now,
          accumulatedSeconds: 0,
          actualSeconds: 0,
          source,
          status: 'active',
          lastHeartbeatAt: now,
        };

        // Also mark lesson as IN PROGRESS
        set((state) => ({
          activeLearningSession: newSession,
          lessons: state.lessons.map((l) =>
            l.id === lessonId ? { ...l, status: 'IN PROGRESS' } : l
          ),
          sessions: plannedSessionId
            ? (state.sessions || []).map((s) =>
                s.id === plannedSessionId ? { ...s, status: 'in_progress' } : s
              )
            : state.sessions,
        }));

        return newSession;
      },

      pauseLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'active') return;

        const now = new Date().toISOString();
        const activeStart = new Date(current.resumedAt || current.startedAt).getTime();
        const deltaSeconds = Math.max(0, Math.floor((Date.now() - activeStart) / 1000));
        const accumulated = current.accumulatedSeconds + deltaSeconds;

        const updated: LearningSession = {
          ...current,
          status: 'paused',
          pausedAt: now,
          accumulatedSeconds: accumulated,
          actualSeconds: accumulated,
          lastHeartbeatAt: now,
        };

        set({ activeLearningSession: updated });
      },

      resumeLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'paused') return;

        const now = new Date().toISOString();
        const updated: LearningSession = {
          ...current,
          status: 'active',
          resumedAt: now,
          pausedAt: undefined,
          lastHeartbeatAt: now,
        };

        set({ activeLearningSession: updated });
      },

      setLearningMode: (mode) => {
        const current = get().activeLearningSession;
        if (!current) return;
        set({ activeLearningSession: { ...current, learningMode: mode, lastHeartbeatAt: new Date().toISOString() } });
      },

      recordUnderstandingCheck: (check) => {
        const current = get().activeLearningSession;
        if (!current) return;
        const now = new Date().toISOString();
        set({ activeLearningSession: { ...current, understandingCheck: { ...check, checkedAt: now }, lastHeartbeatAt: now } });
      },

      updateLearningSessionDraft: (draft) => {
        const current = get().activeLearningSession;
        if (!current) return;

        set({
          activeLearningSession: {
            ...current,
            notesDraft: { ...(current.notesDraft || {}), ...draft },
            lastHeartbeatAt: new Date().toISOString(),
          },
        });
      },

      finishLearningSession: (actualStudyMinutes, quizScore, confidence) => {
        const current = get().activeLearningSession;
        if (!current) return;

        const now = new Date().toISOString();
        const finalSeconds = computeSessionElapsedSeconds(current);
        const calculatedMinutes = actualStudyMinutes ?? Math.max(1, Math.round(finalSeconds / 60));

        const completedSession: LearningSession = {
          ...current,
          status: 'completed',
          completedAt: now,
          actualSeconds: finalSeconds,
          lastHeartbeatAt: now,
          quizScore: quizScore !== undefined ? quizScore : current.quizScore,
          confidenceRating: confidence !== undefined ? confidence : current.confidenceRating,
        };

        const quizAttempt: QuizAttempt | null = quizScore !== undefined ? {
          id: uuidv4(),
          timestamp: now,
          score: quizScore,
        } : null;

        // Update the lesson
        set((state) => {
          const updatedHistory = [completedSession, ...(state.learningSessionsHistory || [])];
          const updatedLessons = state.lessons.map((l) => {
            if (l.id === current.lessonId) {
              const prevAttempts = l.quizAttempts || [];
              const newAttempts = quizAttempt ? [...prevAttempts, quizAttempt] : prevAttempts;
              const newStudyCount = (l.studyCount || 0) + 1;
              const newTotalMinutes = (l.totalStudyMinutes || l.actualStudyMinutes || 0) + calculatedMinutes;
              const daysToAdd = (l.reviewCount || 0) === 0 ? 3 : (l.reviewCount || 0) === 1 ? 7 : 14;
              const nextReviewDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

              // Phase 50: credit only the curriculum lesson actually studied
              const credited = creditCurriculumLesson(l, state.lessons, current.curriculumLessonId);
              const merged: Lesson = {
                ...l,
                ...(credited ? { completedCurriculumLessonIds: credited } : {}),
                status: 'COMPLETED',
                completedAt: now,
                firstStudiedAt: l.firstStudiedAt || current.startedAt || now,
                lastStudiedAt: now,
                actualStudyMinutes: calculatedMinutes,
                totalStudyMinutes: newTotalMinutes,
                studyCount: newStudyCount,
                nextReviewAt: nextReviewDate,
                confidence: confidence ?? l.confidence,
                quizScore: quizScore ?? l.quizScore,
                quizAttempts: newAttempts,
                learnedNotes: current.notesDraft?.learnedNotes ?? l.learnedNotes,
                stillUnclearNotes: current.notesDraft?.stillUnclearNotes ?? l.stillUnclearNotes,
                reviewNotes: current.notesDraft?.reviewNotes ?? l.reviewNotes,
              };

              const record = computeLessonLearningRecord(merged, updatedHistory, state.sessions);
              return {
                ...merged,
                mastery: record.mastery,
              };
            }
            return l;
          });

          // Update review queue for this lesson
          let updatedReviewQueue = state.reviewQueue || [];
          const existingReviewIndex = updatedReviewQueue.findIndex(r => r.lessonId === current.lessonId && r.status !== 'completed');
          const reviewReason: ReviewReason = (quizScore !== undefined && quizScore < 70) 
            ? 'low_quiz_score' 
            : (current.notesDraft?.stillUnclearNotes ? 'unclear_topic' : 'spaced_repetition');
          const reviewPriority: 'Low' | 'Medium' | 'High' = (quizScore !== undefined && quizScore < 70) || current.notesDraft?.stillUnclearNotes ? 'High' : 'Medium';
          const targetLesson = state.lessons.find(l => l.id === current.lessonId);
          const lessonTitle = targetLesson?.title || 'บทเรียน';

          // First interval is 1 day or 3 days depending on quiz score
          const intervalDays = (quizScore !== undefined && quizScore >= 90) ? 3 : 1;
          const nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

          if (existingReviewIndex >= 0) {
            const existing = updatedReviewQueue[existingReviewIndex];
            updatedReviewQueue = updatedReviewQueue.map((r, i) => i === existingReviewIndex ? {
              ...existing,
              nextReviewAt: nextReviewDate,
              status: 'pending',
              reason: reviewReason,
              priority: reviewPriority,
            } : r);
          } else {
            const newReviewItem: ReviewItem = {
              id: uuidv4(),
              lessonId: current.lessonId,
              topic: lessonTitle,
              createdAt: now,
              nextReviewAt: nextReviewDate,
              reviewCount: 0,
              status: 'pending',
              reason: reviewReason,
              priority: reviewPriority,
            };
            updatedReviewQueue = [newReviewItem, ...updatedReviewQueue];
          }

          return {
            activeLearningSession: null,
            learningSessionsHistory: updatedHistory,
            lessons: updatedLessons,
            reviewQueue: updatedReviewQueue,
            sessions: current.plannedSessionId
              ? (state.sessions || []).map((s) =>
                  s.id === current.plannedSessionId
                    ? {
                        ...s,
                        status: 'completed',
                        actualMinutes: calculatedMinutes,
                        completedAt: now,
                      }
                    : s
                )
              : state.sessions,
          };
        });
      },

      abandonLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current) return;

        const abandoned: LearningSession = {
          ...current,
          status: 'abandoned',
          lastHeartbeatAt: new Date().toISOString(),
        };

        set((state) => ({
          activeLearningSession: null,
          learningSessionsHistory: [abandoned, ...(state.learningSessionsHistory || [])],
        }));
      },

      recoverLearningSession: (confirmedMinutes) => {
        const current = get().activeLearningSession;
        if (!current) return;

        if (confirmedMinutes !== undefined) {
          // User confirmed session is finished with specified minutes
          get().finishLearningSession(confirmedMinutes);
        } else {
          // User chooses to continue learning
          const now = new Date().toISOString();
          set({
            activeLearningSession: {
              ...current,
              status: 'active',
              resumedAt: now,
              pausedAt: undefined,
              lastHeartbeatAt: now,
            },
          });
        }
      },

      heartbeatLearningSession: () => {
        const current = get().activeLearningSession;
        if (!current || current.status !== 'active') return;

        set({
          activeLearningSession: {
            ...current,
            actualSeconds: computeSessionElapsedSeconds(current),
            lastHeartbeatAt: new Date().toISOString(),
          },
        });
      },

      switchSessionResource: (resource) => {
        const current = get().activeLearningSession;
        if (!current) return;
        const used = current.resourcesUsed || [];
        const isAlreadyInUsed = used.some((r) => r.id === resource.id);
        const updatedUsed = isAlreadyInUsed ? used : [...used, resource];

        set({
          activeLearningSession: {
            ...current,
            source: resource,
            resourcesUsed: updatedUsed,
            lastHeartbeatAt: new Date().toISOString(),
          },
        });
      },

      addTimestampedNote: (lessonId, noteData) => {
        const currentSession = get().activeLearningSession;
        const note: TimestampedNote = {
          id: uuidv4(),
          lessonId,
          sessionId: currentSession?.sessionId,
          timestampSeconds: noteData.timestampSeconds,
          timestampDisplay: noteData.timestampDisplay,
          content: noteData.content.trim(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === lessonId
              ? { ...l, timestampedNotes: [...(l.timestampedNotes || []), note] }
              : l
          ),
          activeLearningSession:
            state.activeLearningSession && state.activeLearningSession.lessonId === lessonId
              ? {
                  ...state.activeLearningSession,
                  timestampedNotes: [
                    ...(state.activeLearningSession.timestampedNotes || []),
                    note,
                  ],
                }
              : state.activeLearningSession,
        }));

        return note;
      },

      deleteTimestampedNote: (lessonId, noteId) => {
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  timestampedNotes: (l.timestampedNotes || []).filter(
                    (n) => n.id !== noteId
                  ),
                }
              : l
          ),
          activeLearningSession:
            state.activeLearningSession && state.activeLearningSession.lessonId === lessonId
              ? {
                  ...state.activeLearningSession,
                  timestampedNotes: (state.activeLearningSession.timestampedNotes || []).filter(
                    (n) => n.id !== noteId
                  ),
                }
              : state.activeLearningSession,
        }));
      },

      // Phase 18: Study Onboarding Actions
      completeOnboarding: (prefs: OnboardingPreferences) => {
        const { lessons } = get();
        const firstWeekSessions = generateFirstWeekPlan({ preferences: prefs, lessons });

        const newSessions: StudySession[] = firstWeekSessions.map((fws) => ({
          id: uuidv4(),
          date: fws.date,
          startTime: fws.startTime,
          endTime: fws.endTime,
          plannedMinutes: fws.plannedMinutes,
          lessonId: fws.lessonId,
          subjectId: fws.subjectId,
          title: `เรียน ${fws.lessonTitle}`,
          status: 'planned' as const,
          priority: 'High' as const,
          type: 'learn' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        const mainGoal = buildOnboardingMainGoal(prefs);

        const updatedWeeklyGoal: WeeklyGoal = {
          targetHours: prefs.weeklyTargetHours,
          targetLessons: prefs.preferredDays.length,
          targetReviews: Math.max(3, Math.round(prefs.preferredDays.length * 0.75)),
        };

        set((state) => ({
          hasCompletedOnboarding: true,
          sessions: [...state.sessions, ...newSessions],
          goals: [...state.goals, mainGoal],
          weeklyGoal: updatedWeeklyGoal,
          // Phase 49: the time chosen in onboarding becomes V2U's daily time
          studentProfile: {
            ...(state.studentProfile ?? DEFAULT_STUDENT_PROFILE),
            availableMinutes: budgetFromWeeklyHours(prefs.weeklyTargetHours),
          },
        }));

        const firstLessonId = firstWeekSessions[0]?.lessonId || lessons[0]?.id;
        return { firstLessonId };
      },
      skipOnboarding: () =>
        set({ hasCompletedOnboarding: true }),
      resetOnboarding: () =>
        set({ hasCompletedOnboarding: false }),

      // Phase 38: Course & Playlist Hierarchy Actions
      addCourse: (courseData) => {
        const id = `course-${Date.now()}`;
        const now = new Date().toISOString();
        const newCourse: Course = {
          ...courseData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ courses: [newCourse, ...state.courses] }));
        return id;
      },

      updateCourse: (id, updates) => {
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      deleteCourse: (id) => {
        set((state) => ({
          courses: state.courses.filter((c) => c.id !== id),
        }));
      },

      toggleCourseItemCompleted: (courseId, moduleId, itemId) => {
        set((state) => ({
          courses: state.courses.map((course) => {
            if (course.id !== courseId) return course;
            return {
              ...course,
              updatedAt: new Date().toISOString(),
              modules: course.modules.map((mod) => {
                if (mod.id !== moduleId) return mod;
                return {
                  ...mod,
                  items: mod.items.map((item) => {
                    if (item.id !== itemId) return item;
                    const nextCompleted = !item.completed;
                    return {
                      ...item,
                      completed: nextCompleted,
                      completedAt: nextCompleted ? new Date().toISOString() : undefined,
                    };
                  }),
                };
              }),
            };
          }),
        }));
      },

      addModuleToCourse: (courseId, title) => {
        const moduleId = `mod-${Date.now()}`;
        set((state) => ({
          courses: state.courses.map((course) => {
            if (course.id !== courseId) return course;
            const newModule: CourseModule = {
              id: moduleId,
              title,
              order: (course.modules?.length || 0) + 1,
              items: [],
            };
            return {
              ...course,
              modules: [...(course.modules || []), newModule],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        return moduleId;
      },

      addItemToCourseModule: (courseId, moduleId, itemData) => {
        const itemId = `item-${Date.now()}`;
        set((state) => ({
          courses: state.courses.map((course) => {
            if (course.id !== courseId) return course;
            return {
              ...course,
              updatedAt: new Date().toISOString(),
              modules: course.modules.map((mod) => {
                if (mod.id !== moduleId) return mod;
                const newItem: CourseItem = {
                  ...itemData,
                  id: itemId,
                  completed: false,
                  order: (mod.items?.length || 0) + 1,
                };
                return {
                  ...mod,
                  items: [...(mod.items || []), newItem],
                };
              }),
            };
          }),
        }));
        return itemId;
      },

      // Backward compatible import
      importData: (data) =>
        set({
          lessons: data.lessons || [],
          unclearTopics: data.unclearTopics || [],
          sessions: data.sessions || [],
          weeklyGoal: data.weeklyGoal || initialWeeklyGoal,
          learningSessionsHistory: data.learningSessionsHistory || [],
          reviewQueue: data.reviewQueue || [],
          goals: data.goals || initialGoals,
          resources: data.resources || [],
          courses: data.courses || initialCourses,
          hasCompletedOnboarding: data.hasCompletedOnboarding ?? true,
          ...(data.studentProfile ? { studentProfile: data.studentProfile } : {}),
          ...(data.admissionInputs ? { admissionInputs: normalizeAdmissionInputs(data.admissionInputs) } : {}),
          ...(data.learningNotes ? { learningNotes: sanitizeNotesData(data.learningNotes) } : {}),
          ...(data.diagnostic ? { diagnostic: sanitizeDiagnosticData(data.diagnostic) } : {}),
        }),
      resetToInitial: () =>
        set({
          hasCompletedOnboarding: false,
          studentProfile: null,
          admissionInputs: EMPTY_ADMISSION_INPUTS,
          learningNotes: EMPTY_NOTES_DATA,
          diagnostic: EMPTY_DIAGNOSTIC,
          lessons: initialLessons,
          unclearTopics: [],
          sessions: [],
          weeklyGoal: initialWeeklyGoal,
          activeLearningSession: null,
          learningSessionsHistory: [],
          reviewQueue: [],
          goals: createInitialGoals(),
          resources: [],
          courses: createInitialCourses(),
        }),
    }),
    {
      name: 'engineering-study-hub-storage',
      storage: createJSONStorage(() => createDebouncedStorageEngine(200)),
    }
  )
);
