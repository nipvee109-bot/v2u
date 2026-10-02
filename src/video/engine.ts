/* =========================================================================
   V2U Video Learning (Phase 55) — pure, no React
   -------------------------------------------------------------------------
   Videos come ONLY from existing mappings:
     curated registry  (curriculumLessonIds, role, language, status)
     the learner's own lesson resources (store; YouTube links they added)
   Order and reasons use real data (prerequisites, sequence, completion,
   weak skills, time, language, link status). There is no quality score.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { getMissingPrerequisites, isCurriculumLessonCompleted } from '../curriculum/engine';
import type { CurriculumLesson } from '../curriculum/types';
import { getResourcesForLesson, linkStateLabel } from '../resources/engine';
import type { CuratedResource } from '../resources/types';
import type { Lesson, Resource } from '../types';
import { parseYouTubeVideoId } from './youtube';

export type VideoGroup = 'recommended' | 'basics' | 'practice' | 'next';
export const VIDEO_GROUP_LABEL: Record<VideoGroup, string> = {
  recommended: 'แนะนำ',
  basics: 'พื้นฐาน',
  practice: 'ฝึกทำโจทย์',
  next: 'ต่อไป',
};

export type VideoProgressState = 'not-started' | 'learning' | 'watched' | 'checked' | 'done';
export const VIDEO_STATE_LABEL: Record<VideoProgressState, string> = {
  'not-started': 'ยังไม่เริ่ม',
  learning: 'กำลังเรียน',
  watched: 'ดูจบแล้ว',
  checked: 'เช็กความเข้าใจแล้ว',
  done: 'เรียนจบ',
};

export interface VideoItem {
  /** `curated:<id>` or `own:<id>` */
  key: string;
  source: 'curated' | 'own';
  resourceId: string;
  lessonId: string;
  title: string;
  provider: string;
  minutes?: number;
  /** Duration was confirmed at the source (otherwise "about"). */
  durationKnown: boolean;
  language?: 'th' | 'en';
  /** 'พื้นฐาน' for explanations, 'ฝึกทำโจทย์' for worked examples */
  group: Exclude<VideoGroup, 'recommended' | 'next'>;
  /** Plain-Thai link state, e.g. "ยังไม่ได้ตรวจลิงก์" */
  linkState: string;
  checked: boolean;
  /** Can be played inside V2U (a real YouTube URL with a parseable id). */
  embeddable: boolean;
  /** Parsed YouTube id — only from a real URL, never guessed */
  videoId?: string;
  /** URL the player embeds (checked url, or the candidate YouTube upload) */
  embedUrl?: string;
  /** Checked url only (verified/active) */
  url?: string;
  /** Unchecked link found by search (labelled, never treated as checked). */
  candidateUrl?: string;
  locator?: string;
  why?: string;
}

const isVideo = (r: CuratedResource) => r.type === 'video' || r.type === 'course';

export function curatedToVideo(r: CuratedResource, lessonId: string): VideoItem {
  const checked = (r.status === 'active' || r.status === 'verified') && !!r.url;
  // Phase 57: play in V2U only from a real YouTube URL; embedding never changes the status
  const embedUrl = checked && parseYouTubeVideoId(r.url) ? r.url : parseYouTubeVideoId(r.candidateVideoUrl) ? r.candidateVideoUrl : undefined;
  const videoId = parseYouTubeVideoId(embedUrl) ?? undefined;
  return {
    key: `curated:${r.id}`,
    source: 'curated',
    resourceId: r.id,
    lessonId,
    title: r.title,
    provider: r.provider,
    minutes: r.estimatedMinutes,
    durationKnown: r.durationKnown === true,
    language: r.language,
    group: r.role === 'worked-example' ? 'practice' : 'basics',
    linkState: linkStateLabel(r),
    checked,
    embeddable: !!videoId,
    videoId,
    embedUrl: videoId ? embedUrl : undefined,
    url: checked ? r.url : undefined,
    candidateUrl: checked ? undefined : r.candidateUrl,
    locator: r.locator,
    why: r.whyV2USelected,
  };
}

export function ownToVideo(r: Resource, lessonId: string): VideoItem | null {
  if (r.type !== 'youtube' || !r.url) return null;
  const videoId = parseYouTubeVideoId(r.url) ?? undefined;
  return {
    key: `own:${r.id}`,
    source: 'own',
    resourceId: r.id,
    lessonId,
    title: r.title,
    provider: r.provider || 'สื่อที่คุณเพิ่มเอง',
    durationKnown: false,
    group: 'basics',
    linkState: 'ลิงก์ที่คุณเพิ่มเอง',
    checked: false,
    embeddable: !!videoId,
    videoId,
    embedUrl: videoId ? r.url : undefined,
    url: r.url,
  };
}

/** Curated videos mapped to the lesson (deprecated excluded), in V2U's trust/Thai order. */
export function getLessonVideos(lessonId: string, ownResources: Resource[] = []): VideoItem[] {
  const curated = getResourcesForLesson(lessonId).filter(isVideo).map((r) => curatedToVideo(r, lessonId));
  const own = ownResources.map((r) => ownToVideo(r, lessonId)).filter((x): x is VideoItem => !!x);
  return [...curated, ...own];
}

/**
 * The lesson's own video sequence: basics first, then practice (role from the
 * registry). Only real mappings — one video means a sequence of one.
 */
export function getLessonVideoSequence(lessonId: string, ownResources: Resource[] = []): VideoItem[] {
  const all = getLessonVideos(lessonId, ownResources);
  const rank = (v: VideoItem) => (v.source === 'own' ? 2 : v.group === 'basics' ? 0 : 1);
  return [...all].sort((a, b) => rank(a) - rank(b));
}

export function sequenceLabel(v: VideoItem): string {
  return v.source === 'own' ? 'สื่อของคุณ' : v.group === 'basics' ? 'พื้นฐาน' : 'ฝึกทำโจทย์';
}

/** Lessons that list this lesson as a prerequisite (what it unlocks). */
export function unlocks(lessonId: string): CurriculumLesson[] {
  return CURRICULUM.lessons.filter((l) => l.prerequisites.includes(lessonId));
}

const topicOrder = () => CURRICULUM.topics.flatMap((t) => t.lessonIds);
export function nextLessonId(lessonId: string): string | undefined {
  const o = topicOrder();
  const i = o.indexOf(lessonId);
  return i >= 0 ? o[i + 1] : undefined;
}

/** Grouped list for "เลือกเอง". Empty groups are omitted by the UI. */
export function groupVideos(lessonId: string, ownResources: Resource[] = [], recommendedKey?: string): Record<VideoGroup, VideoItem[]> {
  const all = getLessonVideos(lessonId, ownResources);
  const next = nextLessonId(lessonId);
  return {
    recommended: all.filter((v) => v.key === recommendedKey),
    basics: all.filter((v) => v.group === 'basics' && v.key !== recommendedKey),
    practice: all.filter((v) => v.group === 'practice' && v.key !== recommendedKey),
    next: next ? getLessonVideos(next).slice(0, 2) : [],
  };
}

/* ── Topic path (uses the EXISTING prerequisite data; nothing is locked) ── */

export type PathItemStatus = 'done' | 'current' | 'available' | 'wait';
export const PATH_STATUS_LABEL: Record<PathItemStatus, string> = {
  done: 'เรียนแล้ว',
  current: 'กำลังเรียน',
  available: 'เรียนต่อได้',
  wait: 'ยังควรรอ',
};

export interface PathItem {
  lessonId: string;
  title: string;
  level: CurriculumLesson['level'];
  status: PathItemStatus;
  /** Plain-Thai explanation of the status */
  note: string;
  videoCount: number;
}

export function getTopicVideoPath(currentLessonId: string, storeLessons: Lesson[]): PathItem[] {
  const current = CURRICULUM.lessons.find((l) => l.id === currentLessonId);
  if (!current) return [];
  const topic = CURRICULUM.topics.find((t) => t.id === current.topicId);
  const ids = topic?.lessonIds ?? [current.id];
  // include the lessons this one unlocks, so learners see what comes after
  const after = unlocks(current.id).map((l) => l.id).filter((id) => !ids.includes(id));
  return [...ids, ...after.slice(0, 2)].map((id) => {
    const l = CURRICULUM.lessons.find((x) => x.id === id)!;
    const missing = getMissingPrerequisites(l, storeLessons);
    const done = isCurriculumLessonCompleted(l, storeLessons);
    const status: PathItemStatus = id === currentLessonId ? 'current' : done ? 'done' : missing.length > 0 ? 'wait' : 'available';
    const note =
      status === 'current'
        ? 'กำลังเรียน'
        : status === 'done'
          ? 'เรียนแล้ว'
          : status === 'wait'
            ? `ยังควรรอ เพราะต้องผ่าน ${missing.map((m) => m.title).join(', ')} ก่อน`
            : unlocks(currentLessonId).some((u) => u.id === id)
              ? 'เรียนต่อได้หลังบทนี้'
              : 'เรียนต่อได้';
    return { lessonId: id, title: l.title, level: l.level, status, note, videoCount: getLessonVideos(id).length };
  });
}

/* ── Recommendation (ordered rules, explained — no arbitrary score) ──── */

export interface RecommendInput {
  lessonId: string;
  storeLessons: Lesson[];
  ownResources?: Resource[];
  /** Today's study minutes */
  availableMinutes?: number;
  language?: 'th' | 'en';
  /** Video keys the learner already finished */
  watchedKeys?: string[];
  /** Video keys the learner chose to skip (a choice, not evidence of anything) */
  skippedKeys?: string[];
  /** Curriculum skill ids that are weak right now */
  weakSkillIds?: string[];
}

export interface Recommendation {
  video: VideoItem;
  /** For which lesson (may be a prerequisite of the requested lesson) */
  lessonId: string;
  reasons: string[];
  /** 1-based position in that lesson's video sequence, and its length */
  position: number;
  of: number;
  estimatedMinutes?: number;
}

export function getRecommendedVideo(input: RecommendInput): Recommendation | null {
  const { storeLessons, availableMinutes, language = 'th', watchedKeys = [], skippedKeys = [], weakSkillIds = [] } = input;
  const lesson = CURRICULUM.lessons.find((l) => l.id === input.lessonId);
  if (!lesson) return null;
  const reasons: string[] = [];

  // 1) Prerequisite readiness: missing groundwork with its own videos comes first
  let target = lesson;
  const missing = getMissingPrerequisites(lesson, storeLessons).filter((m) => getLessonVideos(m.id).length > 0);
  if (missing.length > 0) {
    target = missing[0];
    reasons.push(`บท “${lesson.title}” ต้องใช้ “${target.title}” เป็นพื้นฐาน และคุณยังไม่ได้เรียนบทนั้น`);
  }

  const seq = getLessonVideoSequence(target.id, target.id === lesson.id ? input.ownResources : []);
  if (seq.length === 0) return null;
  const weak = weakSkillIds.some((s) => target.skillIds.includes(s));

  // 2) Candidates: not yet watched; deprecated already excluded by the registry engine
  const fresh = seq.filter((v) => !watchedKeys.includes(v.key) && !skippedKeys.includes(v.key));
  const pool = fresh.length > 0 ? fresh : seq;
  // 3) Ordered preferences: weak → practice first; else basics first; then language; then fits time
  const fits = (v: VideoItem) => availableMinutes === undefined || v.minutes === undefined || v.minutes <= availableMinutes;
  const pref = (v: VideoItem) => [
    weak ? (v.group === 'practice' ? 0 : 1) : v.group === 'basics' ? 0 : 1,
    v.language === language ? 0 : 1,
    fits(v) ? 0 : 1,
    v.source === 'own' ? 1 : 0,
  ];
  const pick = [...pool].sort((a, b) => {
    const pa = pref(a);
    const pb = pref(b);
    for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return 0;
  })[0];

  // Reasons — facts only
  if (target.id === lesson.id) {
    const after = unlocks(lesson.id);
    reasons.push(
      after.length > 0
        ? `คุณกำลังเริ่มเรื่อง “${lesson.title}” และบทนี้เป็นพื้นฐานก่อน “${after[0].title}”`
        : `คุณกำลังเรียนเรื่อง “${lesson.title}”`
    );
  }
  if (weak) reasons.push(pick.group === 'practice' ? 'คุณยังไม่แม่นทักษะในบทนี้ คลิปนี้เน้นฝึกทำโจทย์' : 'คุณยังไม่แม่นทักษะในบทนี้ เริ่มจากพื้นฐานอีกครั้ง');
  else if (pick.group === 'basics') reasons.push('เป็นคลิปพื้นฐาน เหมาะเป็นคลิปแรกของบท');
  if ((watchedKeys.length > 0 || skippedKeys.length > 0) && fresh.length > 0) reasons.push('เป็นคลิปที่คุณยังไม่ได้ดูและไม่ได้ข้ามไว้');
  if (pick.language === 'th') reasons.push('เป็นภาษาไทย');
  if (availableMinutes !== undefined && pick.minutes !== undefined) {
    reasons.push(
      pick.minutes <= availableMinutes
        ? `${pick.durationKnown ? '' : 'ประมาณ '}${pick.minutes} นาที พอดีกับเวลา ${availableMinutes} นาทีของคุณ`
        : `ยาว${pick.durationKnown ? '' : 'ประมาณ'} ${pick.minutes} นาที มากกว่าเวลาที่มี — ดูเฉพาะช่วงที่ตรงบทได้`
    );
  }
  if (!pick.checked) reasons.push(`${pick.linkState} — V2U ยังไม่ได้เปิดตรวจคลิปนี้`);

  return {
    video: pick,
    lessonId: target.id,
    reasons,
    position: seq.findIndex((v) => v.key === pick.key) + 1,
    of: seq.length,
    estimatedMinutes: pick.minutes,
  };
}

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
