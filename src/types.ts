export type SubjectId = 'math' | 'programming' | 'physics' | 'tgat3' | 'ai';

export type ResourceType = 'youtube' | 'website' | 'pdf' | 'document' | 'image' | 'other';

export type ResourceRole = 'primary' | 'alternative' | 'practice' | 'reference';

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  role?: ResourceRole;
  provider?: string;
  subject?: SubjectId;
  subjectId?: SubjectId;
  lessonId?: string;
  topicId?: string;
  thumbnail?: string;
  description?: string;
  duration?: number | string;
  createdAt?: string;
  updatedAt?: string;
  favorite?: boolean;
  lastOpened?: string;
}

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';
export type MasteryLevel = 'Novice' | 'Familiar' | 'Proficient' | 'Mastered';
export type MasteryScore = 0 | 1 | 2 | 3 | 4;

export interface MasteryScaleInfo {
  score: MasteryScore;
  title: string;
  shortDescription: string;
  fullDescription: string;
  criteria: string;
  badgeClass: string;
  barColor: string;
  textColor: string;
}

export const MASTERY_SCALE: Record<MasteryScore, MasteryScaleInfo> = {
  0: {
    score: 0,
    title: 'ยังไม่เรียน',
    shortDescription: 'ยังไม่ได้เริ่มศึกษา',
    fullDescription: 'ยังไม่ได้เริ่มศึกษาเนื้อหาในบทเรียนนี้ หรือยังไม่มีบันทึกการเรียนรู้จริง',
    criteria: 'สถานะ NOT STARTED และยังไม่มีเวลาเรียนจริงหรือคะแนนทดสอบ',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    barColor: 'bg-slate-200',
    textColor: 'text-slate-500',
  },
  1: {
    score: 1,
    title: 'พอรู้ว่าคืออะไร',
    shortDescription: 'ทราบแนวคิดคร่าวๆ',
    fullDescription: 'ทราบภาพรวม นิยาม หรือคำศัพท์พื้นฐาน แต่ยังไม่สามารถอธิบายรายละเอียดหรือขั้นตอนได้ด้วยตนเอง',
    criteria: 'เริ่มเรียนแล้ว หรืออ่านเนื้อหาบางส่วน แต่ยังไม่ได้ทดสอบหรือทบทวน',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    barColor: 'bg-sky-400',
    textColor: 'text-sky-600',
  },
  2: {
    score: 2,
    title: 'อธิบายพื้นฐานได้',
    shortDescription: 'อธิบายหลักการสำคัญได้',
    fullDescription: 'เข้าใจกลไกและหลักการสำคัญ สามารถสรุปประเด็นหลักและอธิบายแนวคิดพื้นฐานได้ถูกต้อง',
    criteria: 'เรียนจบและมีบันทึกสรุป หรือคะแนน Quiz เบื้องต้น (>= 50%) หรือผ่านการทบทวน 1 รอบ',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    barColor: 'bg-amber-400',
    textColor: 'text-amber-600',
  },
  3: {
    score: 3,
    title: 'ทำโจทย์/ใช้งานได้',
    shortDescription: 'แก้โจทย์หรือเขียนโค้ดได้',
    fullDescription: 'สามารถนำทฤษฎีไปลงมือปฏิบัติ ทำโจทย์ปัญหา หรือเขียนโค้ดแก้ปัญหามาตรฐานได้อย่างถูกต้อง',
    criteria: 'คะแนน Quiz >= 70% และมีความมั่นใจระดับปานกลางขึ้นไป โดยไม่มีจุดติดค้างสำคัญ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
  },
  4: {
    score: 4,
    title: 'อธิบายและประยุกต์ได้',
    shortDescription: 'ประยุกต์ขั้นสูง & ถ่ายทอดได้',
    fullDescription: 'มีความเข้าใจระดับโครงสร้าง สามารถวิเคราะห์ เชื่อมโยงบริบท ประยุกต์โจทย์ซับซ้อน และถ่ายทอดให้ผู้อื่นได้',
    criteria: 'คะแนน Quiz >= 85% + ผ่าน Spaced Review อย่างน้อย 1 รอบ (จำได้) + มีบันทึกความเข้าใจลึกซึ้ง',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    barColor: 'bg-purple-600',
    textColor: 'text-purple-600',
  },
};

export interface QuizAttempt {
  id: string;
  timestamp: string; // ISO string
  score: number; // percentage 0-100
  notes?: string;
}

export interface LearningRecord {
  lessonId: string;
  subjectId: SubjectId;
  firstStudiedAt?: string;
  lastStudiedAt?: string;
  totalStudyMinutes: number;
  studyCount: number;
  completionStatus: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  quizBestScore?: number;
  quizLatestScore?: number;
  confidence: ConfidenceLevel;
  mastery: MasteryLevel;
  masteryScore?: MasteryScore;
  reviewCount: number;
  nextReviewAt?: string;
  /** Phase 56: skills the LATEST understanding check found shaky (evidence, not self-report). */
  confusedSkillIds?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  subjectId: SubjectId;
  month: number;
  week: number;
  date?: string; 
  durationHours: number;
  description?: string;
  status: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  notes: string;
  learnedNotes?: string;
  stillUnclearNotes?: string;
  reviewNotes?: string;
  completedAt?: string;
  actualStudyMinutes?: number;
  quizScore?: number;
  resources: Resource[];
  images: string[];

  // Phase 9 & 11: Per Lesson Memory & Mastery Fields
  quizAttempts?: QuizAttempt[];
  confidence?: ConfidenceLevel;
  mastery?: MasteryLevel;
  masteryScore?: MasteryScore;
  firstStudiedAt?: string;
  lastStudiedAt?: string;
  totalStudyMinutes?: number;
  studyCount?: number;
  reviewCount?: number;
  nextReviewAt?: string;
  timestampedNotes?: TimestampedNote[];
  /**
   * Phase 50: which curriculum lessons inside this study lesson are actually
   * done. Undefined = legacy data (status COMPLETED counts for all of them).
   */
  completedCurriculumLessonIds?: string[];
}

export interface TimestampedNote {
  id: string;
  lessonId: string;
  sessionId?: string;
  timestampSeconds: number; // e.g. 822 for 00:13:42
  timestampDisplay: string; // e.g. "00:13:42"
  content: string;
  createdAt: string;
}

export interface UnclearTopic {
  id: string;
  topic: string;
  details: string;
  subjectId: SubjectId;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Not Understood' | 'Reviewing' | 'Understood';
  createdAt: string;
}

export interface SubjectInfo {
  id: SubjectId;
  name: string;
  color: string;
}

export const SUBJECTS: Record<SubjectId, SubjectInfo> = {
  math: { id: 'math', name: 'คณิตศาสตร์', color: 'bg-math' },
  programming: { id: 'programming', name: 'Programming / Python', color: 'bg-programming' },
  physics: { id: 'physics', name: 'ฟิสิกส์', color: 'bg-physics' },
  tgat3: { id: 'tgat3', name: 'TGAT 3', color: 'bg-tgat' },
  ai: { id: 'ai', name: 'AI / Machine Learning', color: 'bg-ai' },
};

/* ==================================================
   Study Planner & Smart Weekly Planner Models
   ================================================== */

export type StudySessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped' | 'overdue';

export type StudySessionType = 'learn' | 'review' | 'quiz' | 'practice' | 'exam';

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  plannedMinutes: number;
  actualMinutes?: number;
  lessonId?: string;
  subjectId: SubjectId;
  title: string;
  status: StudySessionStatus;
  priority: 'Low' | 'Medium' | 'High';
  type: StudySessionType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WeeklyGoal {
  targetHours: number;
  targetLessons: number;
  targetReviews: number;
}

/* ==================================================
   Six Month Roadmap Engine Models
   ================================================== */

export interface Milestone {
  id: string;
  month: number;
  title: string;
  description: string;
  targetDate?: string;
  subjectId: SubjectId;
  lessonKeywords?: string[];
}

export interface MonthRoadmapInfo {
  month: number;
  title: string;
  subtitle: string;
  description: string;
  targetHours: number;
  focusSubjects: SubjectId[];
  milestones: Milestone[];
}

/* ==================================================
   Learning Session Engine Models (Source of Truth)
   ================================================== */

export interface LearningSession {
  sessionId: string;
  plannedSessionId?: string;
  /** Phase 49: minutes planned for this sitting (student's daily time). */
  plannedMinutes?: number;
  /** Phase 50: the curriculum lesson this sitting was for (from the next step). */
  curriculumLessonId?: string;
  /** Phase 54: how the learner chose to study (อ่าน / ดูคลิป / เรียนกับ V2U). */
  learningMode?: 'read' | 'video' | 'v2u';
  /** Phase 54: result of V2U's understanding check in this sitting. */
  understandingCheck?: { score: number; understood: string[]; confused: string[]; checkedAt: string };
  lessonId: string;
  startedAt: string; // ISO timestamp
  pausedAt?: string; // ISO timestamp
  resumedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  accumulatedSeconds: number;
  actualSeconds: number;
  source?: Resource;
  resourcesUsed?: Resource[];
  timestampedNotes?: TimestampedNote[];
  notesDraft?: {
    learnedNotes?: string;
    stillUnclearNotes?: string;
    reviewNotes?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  lastHeartbeatAt: string;
  quizScore?: number;
  confidenceRating?: ConfidenceLevel;
}

/* ==================================================
   Phase 10: Review Engine & Spaced Repetition Models
   ================================================== */

export type ReviewStatus = 'pending' | 'completed' | 'overdue' | 'skipped';

export type ReviewReason = 'spaced_repetition' | 'low_quiz_score' | 'unclear_topic' | 'manual';

export type ReviewOutcome = 'remembered' | 'partially' | 'unsure' | 'forgot';

export interface ReviewItem {
  id: string;
  lessonId: string;
  topic: string;
  createdAt: string; // ISO string
  lastReviewedAt?: string; // ISO string
  nextReviewAt: string; // ISO string
  reviewCount: number;
  status: ReviewStatus;
  reason: ReviewReason;
  priority: 'Low' | 'Medium' | 'High';
}

/* ==================================================
   Phase 11: Mastery Tracking Models
   ================================================== */

export interface SubjectMasterySummary {
  subjectId: SubjectId;
  totalLessons: number;
  completedLessons: number;
  completionRate: number; // 0-100%
  actualStudyHours: number;
  averageQuizScore?: number;
  averageMasteryScore: number; // 0.0 - 4.0
  masteryDistribution: Record<MasteryScore, number>;
}

export interface TopicAttentionItem {
  lessonId: string;
  topic: string;
  subjectId: SubjectId;
  masteryScore: MasteryScore;
  completionStatus: 'NOT STARTED' | 'IN PROGRESS' | 'COMPLETED';
  quizScore?: number;
  unclearCount: number;
  isOverdueReview: boolean;
  reasons: string[];
}

/* ==================================================
   Phase 12: Knowledge Gap Analysis Models
   ================================================== */

export type KnowledgeGapReasonCode =
  | 'low_quiz'
  | 'repeated_unclear'
  | 'low_mastery'
  | 'review_overdue'
  | 'never_reviewed';

export interface KnowledgeGapReasonItem {
  code: KnowledgeGapReasonCode;
  label: string;
  description: string;
  severity: 'critical' | 'moderate' | 'minor';
}

export type KnowledgeGapSeverity = 'critical' | 'moderate' | 'minor';

export interface KnowledgeGap {
  id: string;
  topic: string;
  subject: SubjectId;
  relatedLessonIds: string[];
  reasons: KnowledgeGapReasonItem[];
  mastery: MasteryScore;
  lastStudied?: string;
  lastReviewed?: string;
  quizScore?: number;
  severity: KnowledgeGapSeverity;
  scoreWeight: number;
  unclearCount: number;
  unclearNotes?: string;
  learnedNotes?: string;
  reviewNotes?: string;
}

/* ==================================================
   Phase 13: Study Goal System Models
   ================================================== */

export type GoalType = 
  | 'study_hours'
  | 'lessons_completed'
  | 'subject_milestones'
  | 'review_consistency'
  | 'quiz_target'
  | 'custom';

export type GoalScope = 'daily' | 'weekly' | 'monthly' | 'six_month';

export type GoalStatus = 'in_progress' | 'completed' | 'expired';

export interface StudyGoal {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  scope: GoalScope;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD (Deadline)
  status: GoalStatus;
  subjectId?: SubjectId;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  customProgress?: number;
}

export interface CalculatedGoalProgress {
  currentValue: number;
  progressPercent: number;
  remainingValue: number;
  remainingDays: number;
  status: GoalStatus;
  recentActivityText?: string;
}

/* ==================================================
   Phase 15: Weekly Learning Review Models
   ================================================== */

export interface WeeklySubjectSummary {
  subjectId: SubjectId;
  studyMinutes: number;
  studyHours: number;
  sessionsCount: number;
  completedLessonsCount: number;
  quizAttemptsCount: number;
  averageQuizScore?: number;
}

export interface WeeklyReviewSummary {
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  weekNumber: number;
  totalStudyMinutes: number;
  totalStudyHours: number;
  sessionsCount: number;
  completedLessonsCount: number;
  completedLessons: Lesson[];
  quizAttemptsCount: number;
  averageQuizScore?: number;
  reviewsCompletedCount: number;
  reviewsOverdueCount: number;
  studyTimeVsTargetPercent?: number;
}

export interface WeeklyMemoryItem {
  id: string;
  lessonId: string;
  lessonTitle: string;
  subjectId: SubjectId;
  learnedNotes: string;
  date: string;
}

export interface WeeklyStudiedItem {
  id: string;
  title: string;
  subjectId: SubjectId;
  date: string;
  durationMinutes: number;
  type: 'lesson' | 'session';
  status: string;
  quizScore?: number;
}

export interface WeeklyNextWeekPlan {
  unfinishedLessons: Lesson[];
  upcomingLessons: Lesson[];
  reviewDueItems: ReviewItem[];
  milestones: Milestone[];
  goalsDueSoon: StudyGoal[];
}

export interface WeeklyReviewReport {
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  summary: WeeklyReviewSummary;
  subjectBreakdown: Record<SubjectId, WeeklySubjectSummary>;
  studiedItems: WeeklyStudiedItem[];
  learnedNotesList: WeeklyMemoryItem[];
  unclearTopicsList: UnclearTopic[];
  nextWeekPlan: WeeklyNextWeekPlan;
}

/* ==================================================
   Phase 16: Learning Analytics Models
   ================================================== */

export type AnalyticsDateRange = '7d' | '30d' | '90d' | 'all';

export interface DailyStudyPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "จ. 28 ก.ย."
  dayOfWeek: string;
  hours: number;
  minutes: number;
  sessionsCount: number;
  lessonsCompletedCount: number;
  isWeekend: boolean;
  isToday: boolean;
  subjectsStudied: SubjectId[];
  details: {
    id: string;
    title: string;
    subjectId: SubjectId;
    minutes: number;
    type: 'session' | 'lesson';
  }[];
}

export interface QuizTrendPoint {
  id: string;
  date: string;
  label: string;
  score: number;
  lessonId: string;
  lessonTitle: string;
  subjectId: SubjectId;
  notes?: string;
}

export interface SubjectAllocationItem {
  subjectId: SubjectId;
  name: string;
  color: string;
  hours: number;
  minutes: number;
  percentage: number;
  lessonsCount: number;
  sessionsCount: number;
  avgQuizScore?: number;
}

export interface PlannedVsActualPoint {
  date: string;
  label: string;
  plannedMinutes: number;
  actualMinutes: number;
  plannedHours: number;
  actualHours: number;
  adherencePercent: number;
}

export interface MasteryDistributionStats {
  score: MasteryScore;
  level: MasteryLevel;
  title: string;
  count: number;
  percentage: number;
  badgeClass: string;
  barColor: string;
}

export interface LearningAnalyticsReport {
  dateRange: AnalyticsDateRange;
  startDate: string;
  endDate: string;
  totalDays: number;
  activeStudyDaysCount: number;
  
  // 10 Core Metrics
  totalStudyHours: number;
  totalStudyMinutes: number;
  averageDailyStudyHours: number;
  averageDailyActiveHours: number;
  weeklyStudyHours: number;
  weeklyHoursChangePercent?: number;
  monthlyStudyHours: number;
  monthlyHoursChangePercent?: number;
  lessonsCompletedCount: number;
  quizScoreAverage?: number;
  quizScoreChangePercent?: number;
  reviewCompletionRate: number;
  reviewsCompletedCount: number;
  reviewsTotalDueCount: number;
  masteryDistribution: MasteryDistributionStats[];
  subjectAllocation: SubjectAllocationItem[];
  plannedVsActual: {
    totalPlannedHours: number;
    totalActualHours: number;
    adherencePercent: number;
  };

  // Chart series data
  dailyStudyPoints: DailyStudyPoint[];
  quizTrendPoints: QuizTrendPoint[];
  plannedVsActualPoints: PlannedVsActualPoint[];
}

/* ==================================================
   Phase 18: Study Onboarding Models
   ================================================== */

export type PreferredTimeSlot = 'morning' | 'afternoon' | 'evening';

export interface OnboardingPreferences {
  mainGoalTitle: string;
  targetFaculty?: string;
  selectedSubjects: SubjectId[];
  weeklyTargetHours: number;
  preferredDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  preferredTimeSlot: PreferredTimeSlot;
}

export interface GeneratedPlanSessionPreview {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  dayLabel: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  subjectId: SubjectId;
  lessonId: string;
  lessonTitle: string;
}

/* ==================================================
   Phase 38: Course & Playlist Hierarchy Models
   ================================================== */

export interface CourseItem {
  id: string;
  title: string;
  durationMinutes: number;
  resourceId?: string;
  sourceUrl?: string;
  lessonId?: string;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  items: CourseItem[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  provider: string; // e.g., 'MIT OCW', 'YouTube', 'Coursera', 'Harvard edX'
  subjectId: SubjectId;
  thumbnail?: string;
  sourceUrl?: string;
  modules: CourseModule[];
  createdAt: string;
  updatedAt: string;
}

