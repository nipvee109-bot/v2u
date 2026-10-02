import { format } from 'date-fns';
import type {
  Lesson,
  StudySession,
  LearningSession,
  UnclearTopic,
  WeeklyGoal,
  ReviewItem,
  StudyGoal,
  Resource,
  SubjectId,
} from '../types';
import { initialWeeklyGoal } from '../data/initialData';
import type { StudentProfile } from '../route/types';
import { normalizeStudentProfile } from '../route/engine';

/**
 * Backup schema history:
 *   v1–v3 legacy shapes (migrated)
 *   v4    full payload + count-based checksum
 *   v5    + studentProfile (V2U route: starting point, target, daily time);
 *         checksum also covers the profile (Phase 45B)
 */
export const CURRENT_SCHEMA_VERSION = 5;
export const BACKUP_STORAGE_KEY = 'engineering_study_hub_snapshots';
export const MAX_BACKUP_SNAPSHOTS = 5;

export interface FullBackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  checksum: string;
  metadata: {
    totalLessons: number;
    completedLessons: number;
    totalSessions: number;
    totalStudyMinutes: number;
    exportedBy: string;
  };
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  unclearTopics: UnclearTopic[];
  weeklyGoal: WeeklyGoal;
  reviewQueue: ReviewItem[];
  goals: StudyGoal[];
  resources: Resource[];
  hasCompletedOnboarding: boolean;
  /** v5+: V2U route profile. null when the student has not set one. */
  studentProfile: StudentProfile | null;
}

export interface ValidationStats {
  lessonsCount: number;
  completedLessonsCount: number;
  sessionsCount: number;
  learningSessionsCount: number;
  unclearTopicsCount: number;
  notesCount: number;
  reviewsCount: number;
  goalsCount: number;
  resourcesCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedVersion: number;
  stats: ValidationStats;
  migratedPayload?: FullBackupPayload;
}

export interface BackupSnapshot {
  id: string;
  createdAt: string;
  reason: 'auto_before_import' | 'auto_before_reset' | 'manual';
  label: string;
  stats: ValidationStats;
  payload: FullBackupPayload;
}

/**
 * Computes a simple checksum hash for payload integrity verification.
 */
export function computePayloadChecksum(payload: Partial<FullBackupPayload>): string {
  let str = `${payload.schemaVersion || 0}_${(payload.lessons || []).length}_${
    (payload.sessions || []).length
  }_${(payload.reviewQueue || []).length}_${(payload.goals || []).length}_${
    (payload.resources || []).length
  }`;
  // v5+: include the route profile so it cannot be altered silently.
  // v4 files keep the original formula and still verify.
  if ((payload.schemaVersion || 0) >= 5) {
    const p = payload.studentProfile;
    str += p ? `_${p.educationLevel}|${p.programId}|${p.targetId}|${p.availableMinutes}` : '_noprofile';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

export type ChecksumStatus = 'valid' | 'missing' | 'mismatch';

/**
 * Verifies the checksum recorded in a raw (pre-migration) backup object.
 * Only v4+ files carry a checksum; older files (or an empty checksum) are 'missing'.
 */
export function verifyPayloadChecksum(raw: unknown): ChecksumStatus {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'missing';
  const obj = raw as Partial<FullBackupPayload>;
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 4) return 'missing';
  if (typeof obj.checksum !== 'string' || obj.checksum.trim() === '') return 'missing';
  return computePayloadChecksum(obj) === obj.checksum ? 'valid' : 'mismatch';
}

/**
 * Detects the schema version of incoming raw data.
 */
export function detectSchemaVersion(raw: unknown): number {
  if (Array.isArray(raw)) {
    return 1; // Legacy v1: raw array of lessons
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.schemaVersion === 'number') {
      return obj.schemaVersion;
    }
    if (obj.goals || obj.resources) {
      return 3;
    }
    if (obj.sessions || obj.reviewQueue || obj.learningSessionsHistory) {
      return 2;
    }
    if (obj.lessons) {
      return 1;
    }
  }
  return 0; // Unknown or invalid
}

/**
 * Sanitizes and repairs a single lesson object ensuring no missing fields.
 */
export function sanitizeLesson(raw: unknown, index: number): Lesson {
  const l = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = typeof l.id === 'string' && l.id.trim() ? l.id : `lesson-${index + 1}`;
  const title = typeof l.title === 'string' && l.title.trim() ? l.title : `บทเรียนที่ ${index + 1}`;
  const subjectId = (
    typeof l.subjectId === 'string' &&
    ['math', 'programming', 'physics', 'tgat3', 'ai'].includes(l.subjectId)
      ? l.subjectId
      : 'programming'
  ) as SubjectId;

  const validStatuses = ['NOT STARTED', 'IN PROGRESS', 'COMPLETED'];
  const status = (
    typeof l.status === 'string' && validStatuses.includes(l.status)
      ? l.status
      : 'NOT STARTED'
  ) as Lesson['status'];

  const validDiffs = ['Easy', 'Medium', 'Hard'];
  const difficulty = (
    typeof l.difficulty === 'string' && validDiffs.includes(l.difficulty)
      ? l.difficulty
      : 'Medium'
  ) as Lesson['difficulty'];

  return {
    id,
    title,
    subjectId,
    month: typeof l.month === 'number' && l.month >= 1 && l.month <= 6 ? l.month : 1,
    week: typeof l.week === 'number' && l.week >= 1 ? l.week : 1,
    durationHours: typeof l.durationHours === 'number' && l.durationHours > 0 ? l.durationHours : 1.5,
    difficulty,
    status,
    notes: typeof l.notes === 'string' ? l.notes : '',
    learnedNotes: typeof l.learnedNotes === 'string' ? l.learnedNotes : '',
    stillUnclearNotes: typeof l.stillUnclearNotes === 'string' ? l.stillUnclearNotes : '',
    reviewNotes: typeof l.reviewNotes === 'string' ? l.reviewNotes : '',
    completedAt: typeof l.completedAt === 'string' ? l.completedAt : undefined,
    actualStudyMinutes: typeof l.actualStudyMinutes === 'number' ? l.actualStudyMinutes : undefined,
    quizScore: typeof l.quizScore === 'number' ? l.quizScore : undefined,
    resources: Array.isArray(l.resources) ? l.resources : [],
    images: Array.isArray(l.images) ? l.images : [],
    quizAttempts: Array.isArray(l.quizAttempts) ? l.quizAttempts : [],
    confidence: typeof l.confidence === 'string' ? (l.confidence as any) : undefined,
    masteryScore: typeof l.masteryScore === 'number' ? (l.masteryScore as any) : undefined,
    firstStudiedAt: typeof l.firstStudiedAt === 'string' ? l.firstStudiedAt : undefined,
    lastStudiedAt: typeof l.lastStudiedAt === 'string' ? l.lastStudiedAt : undefined,
    totalStudyMinutes: typeof l.totalStudyMinutes === 'number' ? l.totalStudyMinutes : undefined,
    studyCount: typeof l.studyCount === 'number' ? l.studyCount : undefined,
    nextReviewAt: typeof l.nextReviewAt === 'string' ? l.nextReviewAt : undefined,
    reviewCount: typeof l.reviewCount === 'number' ? l.reviewCount : undefined,
  };
}

/**
 * Deterministically migrates and upgrades any valid payload to CURRENT_SCHEMA_VERSION (4).
 */
export function migrateToLatestSchema(raw: unknown): {
  payload: FullBackupPayload;
  warnings: string[];
} {
  const warnings: string[] = [];
  const detectedVer = detectSchemaVersion(raw);

  let rawObj: Record<string, unknown> = {};
  if (Array.isArray(raw)) {
    warnings.push('ตรวจพบไฟล์สำรองเวอร์ชัน 1 (อาร์เรย์บทเรียน): กำลังอัปเกรดเป็นเวอร์ชันล่าสุด');
    rawObj = { lessons: raw };
  } else if (raw && typeof raw === 'object') {
    rawObj = raw as Record<string, unknown>;
    if (detectedVer < CURRENT_SCHEMA_VERSION) {
      warnings.push(`ตรวจพบไฟล์สำรองเวอร์ชัน ${detectedVer}: กำลังอัปเกรดเป็นเวอร์ชัน ${CURRENT_SCHEMA_VERSION}`);
    }
  }

  // 1. Lessons
  const rawLessons = Array.isArray(rawObj.lessons) ? rawObj.lessons : [];
  const lessons: Lesson[] = rawLessons.map((l, idx) => sanitizeLesson(l, idx));

  // 2. Sessions
  const rawSessions = Array.isArray(rawObj.sessions) ? rawObj.sessions : [];
  const sessions: StudySession[] = rawSessions.map((s, idx) => {
    const item = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' && item.id ? item.id : `session-${idx + 1}`,
      date: typeof item.date === 'string' ? item.date : format(new Date(), 'yyyy-MM-dd'),
      startTime: typeof item.startTime === 'string' ? item.startTime : '19:00',
      endTime: typeof item.endTime === 'string' ? item.endTime : '21:00',
      plannedMinutes: typeof item.plannedMinutes === 'number' ? item.plannedMinutes : 60,
      actualMinutes: typeof item.actualMinutes === 'number' ? item.actualMinutes : undefined,
      lessonId: typeof item.lessonId === 'string' ? item.lessonId : undefined,
      subjectId: (typeof item.subjectId === 'string' ? item.subjectId : 'programming') as SubjectId,
      title: typeof item.title === 'string' ? item.title : `เซสชันการเรียน #${idx + 1}`,
      status: (typeof item.status === 'string' ? item.status : 'planned') as any,
      priority: (typeof item.priority === 'string' ? item.priority : 'Medium') as any,
      type: (typeof item.type === 'string' ? item.type : 'learn') as any,
      notes: typeof item.notes === 'string' ? item.notes : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    };
  });

  // 3. Learning Sessions History
  const rawHistory = Array.isArray(rawObj.learningSessionsHistory) ? rawObj.learningSessionsHistory : [];
  const learningSessionsHistory: LearningSession[] = rawHistory.map((ls, idx) => {
    const item = (ls && typeof ls === 'object' ? ls : {}) as Record<string, unknown>;
    return {
      sessionId: typeof item.sessionId === 'string' ? item.sessionId : `ls-${idx + 1}`,
      lessonId: typeof item.lessonId === 'string' ? item.lessonId : '',
      plannedSessionId: typeof item.plannedSessionId === 'string' ? item.plannedSessionId : undefined,
      startedAt: typeof item.startedAt === 'string' ? item.startedAt : new Date().toISOString(),
      completedAt: typeof item.completedAt === 'string' ? item.completedAt : undefined,
      accumulatedSeconds: typeof item.accumulatedSeconds === 'number' ? item.accumulatedSeconds : 0,
      actualSeconds: typeof item.actualSeconds === 'number' ? item.actualSeconds : 0,
      status: (typeof item.status === 'string' ? item.status : 'completed') as any,
      lastHeartbeatAt: typeof item.lastHeartbeatAt === 'string' ? item.lastHeartbeatAt : new Date().toISOString(),
      notesDraft: (item.notesDraft && typeof item.notesDraft === 'object' ? item.notesDraft : {}) as any,
    };
  });

  // 4. Unclear Topics
  const rawUnclear = Array.isArray(rawObj.unclearTopics) ? rawObj.unclearTopics : [];
  const unclearTopics: UnclearTopic[] = rawUnclear.map((u, idx) => {
    const item = (u && typeof u === 'object' ? u : {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' ? item.id : `unclear-${idx + 1}`,
      topic: typeof item.topic === 'string' ? item.topic : 'หัวข้อที่ยังไม่เข้าใจ',
      details: typeof item.details === 'string' ? item.details : '',
      subjectId: (typeof item.subjectId === 'string' ? item.subjectId : 'programming') as SubjectId,
      priority: (typeof item.priority === 'string' ? item.priority : 'Medium') as any,
      status: (typeof item.status === 'string' ? item.status : 'Not Understood') as any,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    };
  });

  // 5. Weekly Goal
  const rawWeeklyGoal = (rawObj.weeklyGoal && typeof rawObj.weeklyGoal === 'object'
    ? rawObj.weeklyGoal
    : {}) as Record<string, unknown>;
  const weeklyGoal: WeeklyGoal = {
    targetHours: typeof rawWeeklyGoal.targetHours === 'number' ? rawWeeklyGoal.targetHours : initialWeeklyGoal.targetHours,
    targetLessons: typeof rawWeeklyGoal.targetLessons === 'number' ? rawWeeklyGoal.targetLessons : initialWeeklyGoal.targetLessons,
    targetReviews: typeof rawWeeklyGoal.targetReviews === 'number' ? rawWeeklyGoal.targetReviews : initialWeeklyGoal.targetReviews,
  };

  // 6. Review Queue
  const rawReviews = Array.isArray(rawObj.reviewQueue) ? rawObj.reviewQueue : [];
  const reviewQueue: ReviewItem[] = rawReviews.map((r, idx) => {
    const item = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' ? item.id : `rev-${idx + 1}`,
      lessonId: typeof item.lessonId === 'string' ? item.lessonId : '',
      topic: typeof item.topic === 'string' ? item.topic : 'หัวข้อทบทวน',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      lastReviewedAt: typeof item.lastReviewedAt === 'string' ? item.lastReviewedAt : undefined,
      nextReviewAt: typeof item.nextReviewAt === 'string' ? item.nextReviewAt : new Date().toISOString(),
      reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 0,
      status: (typeof item.status === 'string' ? item.status : 'pending') as any,
      reason: (typeof item.reason === 'string' ? item.reason : 'spaced_repetition') as any,
      priority: (typeof item.priority === 'string' ? item.priority : 'Medium') as any,
    };
  });

  // 7. Goals
  const rawGoals = Array.isArray(rawObj.goals) ? rawObj.goals : [];
  const goals: StudyGoal[] = rawGoals.map((g, idx) => {
    const item = (g && typeof g === 'object' ? g : {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' ? item.id : `goal-${idx + 1}`,
      title: typeof item.title === 'string' ? item.title : 'เป้าหมายการเรียน',
      description: typeof item.description === 'string' ? item.description : undefined,
      type: (typeof item.type === 'string' ? item.type : 'study_hours') as any,
      scope: (typeof item.scope === 'string' ? item.scope : 'six_month') as any,
      targetValue: typeof item.targetValue === 'number' ? item.targetValue : 10,
      currentValue: typeof item.currentValue === 'number' ? item.currentValue : 0,
      unit: typeof item.unit === 'string' ? item.unit : 'หน่วย',
      startDate: typeof item.startDate === 'string' ? item.startDate : format(new Date(), 'yyyy-MM-dd'),
      targetDate: typeof item.targetDate === 'string' ? item.targetDate : format(new Date(), 'yyyy-MM-dd'),
      status: (typeof item.status === 'string' ? item.status : 'in_progress') as any,
      subjectId: typeof item.subjectId === 'string' ? (item.subjectId as SubjectId) : undefined,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    };
  });

  // 8. Resources
  const rawResources = Array.isArray(rawObj.resources) ? rawObj.resources : [];
  const resources: Resource[] = rawResources.map((res, idx) => {
    const item = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' ? item.id : `res-${idx + 1}`,
      title: typeof item.title === 'string' ? item.title : 'แหล่งเรียนรู้',
      url: typeof item.url === 'string' ? item.url : 'https://example.com',
      type: (typeof item.type === 'string' ? item.type : 'website') as any,
      subject: typeof item.subject === 'string' ? (item.subject as SubjectId) : undefined,
      lessonId: typeof item.lessonId === 'string' ? item.lessonId : undefined,
      thumbnail: typeof item.thumbnail === 'string' ? item.thumbnail : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      favorite: Boolean(item.favorite),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      lastOpened: typeof item.lastOpened === 'string' ? item.lastOpened : undefined,
    };
  });

  const hasCompletedOnboarding = Boolean(rawObj.hasCompletedOnboarding ?? (lessons.length > 0 && lessons.some((l) => l.status === 'COMPLETED')));

  // 9. V2U route profile (v5+). Older files have none → null (current profile is kept on import).
  const rawProfile = rawObj.studentProfile;
  const studentProfile: StudentProfile | null =
    rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)
      ? normalizeStudentProfile(rawProfile as Partial<StudentProfile>)
      : null;
  if (!studentProfile && !Array.isArray(raw)) {
    warnings.push('ไฟล์นี้ไม่มีข้อมูลเส้นทาง (จุดเริ่มต้น/เป้าหมาย/เวลาเรียน) — จะคงค่าปัจจุบันไว้');
  }

  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED');
  const totalStudyMinutes = lessons.reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);

  const payload: FullBackupPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: typeof rawObj.exportedAt === 'string' ? rawObj.exportedAt : new Date().toISOString(),
    appVersion: '1.0.0',
    checksum: '',
    metadata: {
      totalLessons: lessons.length,
      completedLessons: completedLessons.length,
      totalSessions: sessions.length,
      totalStudyMinutes,
      exportedBy: 'V2U',
    },
    lessons,
    sessions,
    learningSessionsHistory,
    unclearTopics,
    weeklyGoal,
    reviewQueue,
    goals,
    resources,
    hasCompletedOnboarding,
    studentProfile,
  };

  payload.checksum = computePayloadChecksum(payload);

  return { payload, warnings };
}

/**
 * Validates any raw import JSON string without throwing unhandled exceptions.
 */
export function validateAndParseImport(jsonString: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!jsonString || !jsonString.trim()) {
    return {
      isValid: false,
      errors: ['ไฟล์ว่างเปล่า (Empty File) กรุณาเลือกไฟล์สำรองข้อมูล JSON ที่ถูกต้อง'],
      warnings: [],
      detectedVersion: 0,
      stats: {
        lessonsCount: 0,
        completedLessonsCount: 0,
        sessionsCount: 0,
        learningSessionsCount: 0,
        unclearTopicsCount: 0,
        notesCount: 0,
        reviewsCount: 0,
        goalsCount: 0,
        resourcesCount: 0,
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`รูปแบบไฟล์ JSON ไม่ถูกต้อง (Syntax Error): ${err?.message || 'ไม่สามารถแปลงข้อความเป็น JSON ได้'}`],
      warnings: [],
      detectedVersion: 0,
      stats: {
        lessonsCount: 0,
        completedLessonsCount: 0,
        sessionsCount: 0,
        learningSessionsCount: 0,
        unclearTopicsCount: 0,
        notesCount: 0,
        reviewsCount: 0,
        goalsCount: 0,
        resourcesCount: 0,
      },
    };
  }

  if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    return {
      isValid: false,
      errors: ['โครงสร้างไฟล์ไม่ถูกต้อง (Expected an Object or Array)'],
      warnings: [],
      detectedVersion: 0,
      stats: {
        lessonsCount: 0,
        completedLessonsCount: 0,
        sessionsCount: 0,
        learningSessionsCount: 0,
        unclearTopicsCount: 0,
        notesCount: 0,
        reviewsCount: 0,
        goalsCount: 0,
        resourcesCount: 0,
      },
    };
  }

  const detectedVersion = detectSchemaVersion(parsed);

  // Integrity: a recorded checksum must match the file contents.
  if (verifyPayloadChecksum(parsed) === 'mismatch') {
    return {
      isValid: false,
      errors: ['ไฟล์สำรองข้อมูลไม่สมบูรณ์หรือถูกแก้ไข (checksum ไม่ตรงกัน) — ไม่สามารถนำเข้าได้'],
      warnings: [],
      detectedVersion,
      stats: {
        lessonsCount: 0,
        completedLessonsCount: 0,
        sessionsCount: 0,
        learningSessionsCount: 0,
        unclearTopicsCount: 0,
        notesCount: 0,
        reviewsCount: 0,
        goalsCount: 0,
        resourcesCount: 0,
      },
    };
  }

  const { payload, warnings: migrationWarnings } = migrateToLatestSchema(parsed);
  warnings.push(...migrationWarnings);

  const notesCount = payload.lessons.filter((l) => (l.learnedNotes && l.learnedNotes.trim().length > 0) || (l.notes && l.notes.trim().length > 0)).length;

  const stats: ValidationStats = {
    lessonsCount: payload.lessons.length,
    completedLessonsCount: payload.lessons.filter((l) => l.status === 'COMPLETED').length,
    sessionsCount: payload.sessions.length,
    learningSessionsCount: payload.learningSessionsHistory.length,
    unclearTopicsCount: payload.unclearTopics.length,
    notesCount,
    reviewsCount: payload.reviewQueue.length,
    goalsCount: payload.goals.length,
    resourcesCount: payload.resources.length,
  };

  // Integrity checks
  if (stats.lessonsCount === 0 && stats.sessionsCount === 0 && stats.goalsCount === 0) {
    warnings.push('ไม่พบบทเรียนหรือตารางเรียนในไฟล์นำเข้า (ข้อมูลเริ่มต้นอาจถูกนำไปใช้)');
  }

  return {
    isValid: true,
    errors,
    warnings,
    detectedVersion,
    stats,
    migratedPayload: payload,
  };
}

/**
 * Creates an automatic local backup snapshot in localStorage before destructive changes.
 */
export function createLocalBackupSnapshot(
  payload: FullBackupPayload,
  reason: BackupSnapshot['reason'],
  label?: string
): BackupSnapshot {
  const id = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const defaultLabel =
    reason === 'auto_before_import'
      ? `สำรองอัตโนมัติก่อนนำเข้า (${format(new Date(), 'dd/MM/yyyy HH:mm')})`
      : reason === 'auto_before_reset'
      ? `สำรองอัตโนมัติก่อนรีเซ็ต (${format(new Date(), 'dd/MM/yyyy HH:mm')})`
      : `สำรองด้วยตนเอง (${format(new Date(), 'dd/MM/yyyy HH:mm')})`;

  const stats: ValidationStats = {
    lessonsCount: payload.lessons.length,
    completedLessonsCount: payload.lessons.filter((l) => l.status === 'COMPLETED').length,
    sessionsCount: payload.sessions.length,
    learningSessionsCount: payload.learningSessionsHistory.length,
    unclearTopicsCount: payload.unclearTopics.length,
    notesCount: payload.lessons.filter((l) => l.learnedNotes || l.notes).length,
    reviewsCount: payload.reviewQueue.length,
    goalsCount: payload.goals.length,
    resourcesCount: payload.resources.length,
  };

  const snapshot: BackupSnapshot = {
    id,
    createdAt: now,
    reason,
    label: label || defaultLabel,
    stats,
    payload,
  };

  try {
    const existingSnapshots = getLocalBackupSnapshots();
    const updated = [snapshot, ...existingSnapshots].slice(0, MAX_BACKUP_SNAPSHOTS);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not persist local backup snapshot to localStorage:', err);
  }

  return snapshot;
}

/**
 * Retrieves all stored local backup snapshots.
 */
export function getLocalBackupSnapshots(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Merges imported payload into existing store state preventing duplicate IDs.
 */
export function mergePayloadWithExisting(
  existing: FullBackupPayload,
  imported: FullBackupPayload
): FullBackupPayload {
  const existingLessonIds = new Set(existing.lessons.map((l) => l.id));
  const mergedLessons = [
    ...existing.lessons.map((el) => {
      const match = imported.lessons.find((il) => il.id === el.id);
      if (!match) return el;
      // Overwrite/update if imported has higher mastery or completion
      return {
        ...el,
        ...match,
        actualStudyMinutes: Math.max(el.actualStudyMinutes || 0, match.actualStudyMinutes || 0),
      };
    }),
    ...imported.lessons.filter((il) => !existingLessonIds.has(il.id)),
  ];

  const existingSessionIds = new Set(existing.sessions.map((s) => s.id));
  const mergedSessions = [
    ...existing.sessions,
    ...imported.sessions.filter((s) => !existingSessionIds.has(s.id)),
  ];

  const existingLsIds = new Set(existing.learningSessionsHistory.map((ls) => ls.sessionId));
  const mergedHistory = [
    ...existing.learningSessionsHistory,
    ...imported.learningSessionsHistory.filter((ls) => !existingLsIds.has(ls.sessionId)),
  ];

  const existingUnclearIds = new Set(existing.unclearTopics.map((u) => u.id));
  const mergedUnclear = [
    ...existing.unclearTopics,
    ...imported.unclearTopics.filter((u) => !existingUnclearIds.has(u.id)),
  ];

  const existingReviewIds = new Set(existing.reviewQueue.map((r) => r.id));
  const mergedReviews = [
    ...existing.reviewQueue,
    ...imported.reviewQueue.filter((r) => !existingReviewIds.has(r.id)),
  ];

  const existingGoalIds = new Set(existing.goals.map((g) => g.id));
  const mergedGoals = [
    ...existing.goals,
    ...imported.goals.filter((g) => !existingGoalIds.has(g.id)),
  ];

  const existingResourceIds = new Set(existing.resources.map((r) => r.id));
  const mergedResources = [
    ...existing.resources,
    ...imported.resources.filter((r) => !existingResourceIds.has(r.id)),
  ];

  const completedCount = mergedLessons.filter((l) => l.status === 'COMPLETED').length;
  const totalMinutes = mergedLessons.reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);

  const mergedPayload: FullBackupPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    checksum: '',
    metadata: {
      totalLessons: mergedLessons.length,
      completedLessons: completedCount,
      totalSessions: mergedSessions.length,
      totalStudyMinutes: totalMinutes,
      exportedBy: 'V2U (Merged)',
    },
    lessons: mergedLessons,
    sessions: mergedSessions,
    learningSessionsHistory: mergedHistory,
    unclearTopics: mergedUnclear,
    weeklyGoal: imported.weeklyGoal || existing.weeklyGoal,
    reviewQueue: mergedReviews,
    goals: mergedGoals,
    resources: mergedResources,
    hasCompletedOnboarding: existing.hasCompletedOnboarding || imported.hasCompletedOnboarding,
    studentProfile: imported.studentProfile ?? existing.studentProfile ?? null,
  };

  mergedPayload.checksum = computePayloadChecksum(mergedPayload);
  return mergedPayload;
}

/**
 * Creates a clean, standard export payload from the current store state.
 */
export function createExportPayload(state: {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  unclearTopics: UnclearTopic[];
  weeklyGoal: WeeklyGoal;
  reviewQueue: ReviewItem[];
  goals: StudyGoal[];
  resources: Resource[];
  hasCompletedOnboarding?: boolean;
  studentProfile?: StudentProfile | null;
}): FullBackupPayload {
  const completedLessons = (state.lessons || []).filter((l) => l.status === 'COMPLETED').length;
  const totalMinutes = (state.lessons || []).reduce((acc, l) => acc + (l.actualStudyMinutes || 0), 0);

  const payload: FullBackupPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    checksum: '',
    metadata: {
      totalLessons: (state.lessons || []).length,
      completedLessons,
      totalSessions: (state.sessions || []).length,
      totalStudyMinutes: totalMinutes,
      exportedBy: 'V2U',
    },
    lessons: state.lessons || [],
    sessions: state.sessions || [],
    learningSessionsHistory: state.learningSessionsHistory || [],
    unclearTopics: state.unclearTopics || [],
    weeklyGoal: state.weeklyGoal || initialWeeklyGoal,
    reviewQueue: state.reviewQueue || [],
    goals: state.goals || [],
    resources: state.resources || [],
    hasCompletedOnboarding: !!state.hasCompletedOnboarding,
    studentProfile: state.studentProfile ? normalizeStudentProfile(state.studentProfile) : null,
  };

  payload.checksum = computePayloadChecksum(payload);
  return payload;
}

/**
 * Deletes a single local backup snapshot by ID.
 */
export function deleteLocalBackupSnapshot(snapshotId: string): void {
  try {
    const existing = getLocalBackupSnapshots();
    const updated = existing.filter((s) => s.id !== snapshotId);
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete snapshot:', err);
  }
}
