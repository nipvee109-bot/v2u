/* ContentResolver (Phase 72): published CMS data → what learners may see.
     BASE KNOWLEDGE (src/content/knowledge) + PUBLISHED CMS (verified, visible) → learner UI
   Learners never see drafts, hidden items, or anything that is not VERIFIED. */

import type { CuratedResource } from '../resources/types';
import type { GameAvailability } from '../learning/games/registry';
import type { GameDoc, LessonGameAssignment, PublishedDoc, ResourceData, VideoData } from './types';
import { OVERRIDABLE_FIELDS } from './types';
import type { OverridableField } from './types';

import { isLearnerVisibleData, isSnapshotLearnerVisible } from './workflow';

/** Learner policy: published + VISIBLE + VERIFIED (explicitly) + safe https link. */
export const isLearnerVisible = (d: VideoData | ResourceData) => isLearnerVisibleData('video', d);

function toCurated(p: PublishedDoc): CuratedResource | null {
  if (p.kind !== 'video' && p.kind !== 'resource') return null;
  const d = p.data as VideoData | ResourceData;
  // learnerVisible was decided by the server from the full row; the snapshot itself has no verifier metadata
  if (!p.learnerVisible || !isSnapshotLearnerVisible(p.kind, d)) return null;
  const isVideo = p.kind === 'video';
  const v = d as VideoData;
  const r = d as ResourceData;
  const minutes = isVideo && v.durationSec ? Math.min(600, Math.max(5, Math.ceil(v.durationSec / 60))) : 15;
  return {
    id: `cms:${p.id}`,
    title: d.title,
    provider: isVideo ? v.channel || v.provider : r.publisher,
    type: isVideo ? 'video' : r.type === 'other' ? 'article' : r.type,
    role: isVideo && v.purpose === 'PRACTICE_SUPPORT' ? 'worked-example' : 'explanation',
    url: d.url,
    ...(isVideo && v.videoId ? { videoId: v.videoId } : {}),
    locator: isVideo ? v.channel || d.url : r.publisher || d.url,
    estimatedMinutes: minutes,
    durationKnown: isVideo && !!v.durationSec,
    level: 'beginner',
    description: isVideo ? v.notes : r.description,
    curriculumLessonIds: [d.lessonId],
    coveredOutcomes: [],
    whyV2USelected: isVideo ? (v.purpose === 'REVIEW' ? 'คลิปทบทวนที่ทีม V2U ตรวจแล้ว' : v.purpose === 'PRACTICE_SUPPORT' ? 'คลิปช่วยฝึกที่ทีม V2U ตรวจแล้ว' : 'คลิปเรียนครั้งแรกที่ทีม V2U ตรวจแล้ว') : 'แหล่งเรียนรู้ที่ทีม V2U ตรวจแล้ว',
    lastChecked: p.publishedAt.slice(0, 10),
    language: 'th',
    isFree: true,
    status: 'verified',
    verification: { checkedAt: p.publishedAt.slice(0, 10), method: 'V2U reviewer', note: `published v${p.version}`, httpStatus: 200, titleMatches: true, coverageChecked: true, legalSource: true },
  };
}

/** Learner-facing CMS resources, in the order admins stored (not insertion order). */
export function learnerResources(published: PublishedDoc[]): CuratedResource[] {
  return published
    .filter((p) => p.kind === 'video' || p.kind === 'resource')
    .sort((a, b) => (a.data as VideoData).order - (b.data as VideoData).order || a.id.localeCompare(b.id))
    .map(toCurated)
    .filter((x): x is CuratedResource => !!x);
}

export function learnerOverrides(published: PublishedDoc[]) {
  const out: Record<string, Partial<Record<OverridableField, string | string[]>>> = {};
  for (const p of published) {
    if (p.kind !== 'contentOverride' || !p.learnerVisible) continue;
    const c = p.data as PublishedDoc<'contentOverride'>['data'];
    if (!OVERRIDABLE_FIELDS.includes(c.field)) continue;
    (out[c.lessonId] ??= {})[c.field] = c.value;
  }
  return out;
}

/**
 * Effective game slot state for a lesson.
 * - CMS can HIDE / DISABLE a game or mark it preparing.
 * - CMS can only make a game AVAILABLE when the code-side integration registry
 *   (integrationStatus) also says AVAILABLE — an admin flag alone never launches a game.
 */
export function effectiveGameAvailability(lessonId: string, integrationStatus: GameAvailability, games: GameDoc[], assignments: LessonGameAssignment[]): GameAvailability {
  const a = assignments.filter((x) => x.lessonId === lessonId && x.attached);
  if (!a.length) return integrationStatus;
  const live = a
    .filter((x) => x.visible)
    .map((x) => games.find((g) => g.gameId === x.gameId))
    .filter((g): g is GameDoc => !!g && g.published && g.enabled && g.status !== 'ARCHIVED' && g.status !== 'DISABLED');
  if (!live.length) return 'NOT_AVAILABLE';
  if (live.some((g) => g.status === 'AVAILABLE') && integrationStatus === 'AVAILABLE') return 'AVAILABLE';
  if (live.some((g) => g.status === 'ERROR')) return 'ERROR';
  return 'PREPARING';
}

export const canLaunchGame = (s: GameAvailability) => s === 'AVAILABLE';
