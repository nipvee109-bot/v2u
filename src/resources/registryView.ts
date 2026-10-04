/* Trusted-resource view (content audit). A read-only projection of the existing
   registry in the status vocabulary of the research brief. Nothing here changes a
   resource, its recommendation, or the video player.

   VERIFIED requires the actual content to have been opened and inspected —
   a link that merely loads is not enough. Video summaries require the video,
   official captions or a transcript; until then the summary is SUMMARY_PENDING. */

import { allResources } from './engine';
import type { CuratedResource } from './types';
import { CURRICULUM } from '../curriculum/data';
import { DISCOVERED_RESOURCES } from './discovered';
import type { DiscoveredResource } from './discovered';
import { YOUTUBE_CANDIDATES } from './youtubeCandidates';
import type { YouTubeCandidate } from './youtubeCandidates';

export type RegistryStatus = 'DISCOVERED' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'DEPRECATED' | 'UNAVAILABLE';
export type SummaryStatus = 'SUMMARY_READY' | 'SUMMARY_PENDING' | 'NOT_A_VIDEO';

export interface RegistryRecord {
  id: string;
  title: string;
  publisher: string;
  /** Only a checked url, or a search-found candidate (labelled by status) */
  url?: string;
  type: CuratedResource['type'] | 'simulation';
  language: CuratedResource['language'];
  subjectId?: string;
  topicIds: string[];
  lessonIds: string[];
  skillIds: string[];
  durationMinutes?: number;
  dateChecked: string;
  verificationStatus: RegistryStatus;
  actualContentInspected: boolean;
  summaryStatus: SummaryStatus;
  embedSupport: 'youtube' | 'none' | 'unknown';
  qualityNotes: string;
  limitations: string[];
  provenance: string;
}

const inspected = (r: CuratedResource) =>
  !!r.verification && r.verification.coverageChecked === true && r.verification.titleMatches === true && (r.verification.httpStatus ?? 0) >= 200 && (r.verification.httpStatus ?? 0) < 300;

export function registryStatus(r: CuratedResource): RegistryStatus {
  if (r.status === 'deprecated') return 'DEPRECATED';
  if (r.verification?.httpStatus && (r.verification.httpStatus < 200 || r.verification.httpStatus >= 300)) return 'UNAVAILABLE';
  if ((r.status === 'verified' || r.status === 'active') && inspected(r)) return 'VERIFIED';
  if (r.candidateUrl || r.candidateVideoUrl || r.status === 'verified' || r.status === 'active') return 'VERIFICATION_PENDING';
  return 'DISCOVERED';
}

export function toRegistryRecord(r: CuratedResource): RegistryRecord {
  const lessons = CURRICULUM.lessons.filter((l) => r.curriculumLessonIds.includes(l.id));
  const status = registryStatus(r);
  const limitations: string[] = [];
  if (status !== 'VERIFIED') limitations.push('ยังไม่ได้เปิดดูเนื้อหาจริง — ใช้เป็นแหล่งเสริมเท่านั้น');
  if (!r.durationKnown) limitations.push('ยังไม่ได้ยืนยันความยาว');
  return {
    id: r.id,
    title: r.title,
    publisher: r.provider,
    url: r.url ?? r.candidateVideoUrl ?? r.candidateUrl,
    type: r.type,
    language: r.language,
    subjectId: lessons[0]?.subjectId,
    topicIds: [...new Set(lessons.map((l) => l.topicId))],
    lessonIds: r.curriculumLessonIds,
    skillIds: [...new Set(lessons.flatMap((l) => l.skillIds))],
    durationMinutes: r.durationKnown ? r.estimatedMinutes : undefined,
    dateChecked: r.verification?.checkedAt ?? r.lastChecked,
    verificationStatus: status,
    actualContentInspected: status === 'VERIFIED',
    summaryStatus: r.type !== 'video' ? 'NOT_A_VIDEO' : status === 'VERIFIED' ? 'SUMMARY_READY' : 'SUMMARY_PENDING',
    embedSupport: r.videoId || r.candidateVideoUrl ? 'youtube' : r.type === 'video' ? 'unknown' : 'none',
    qualityNotes: r.whyV2USelected,
    limitations,
    provenance: r.verification ? `${r.verification.method} (${r.verification.checkedAt})` : r.urlProvenance || r.videoProvenance ? `search result: "${(r.videoProvenance ?? r.urlProvenance)!.query}"` : 'curated by name/locator only',
  };
}

/** Research backlog: content inspected from the publisher's source, live page not opened → never VERIFIED. */
export function discoveredToRecord(d: DiscoveredResource): RegistryRecord {
  const lessons = CURRICULUM.lessons.filter((l) => d.lessonIds.includes(l.id));
  return {
    id: d.id,
    title: d.title,
    publisher: d.publisher,
    url: d.url,
    type: d.type,
    language: d.language,
    subjectId: lessons[0]?.subjectId,
    topicIds: [...new Set(lessons.map((l) => l.topicId))],
    lessonIds: d.lessonIds,
    skillIds: [...new Set(lessons.flatMap((l) => l.skillIds))],
    dateChecked: d.dateChecked,
    verificationStatus: 'VERIFICATION_PENDING',
    actualContentInspected: false,
    summaryStatus: d.type === 'video' ? 'SUMMARY_PENDING' : 'NOT_A_VIDEO',
    embedSupport: 'none',
    qualityNotes: d.qualityNotes,
    limitations: d.limitations,
    provenance: d.contentInspected,
  };
}

export function youtubeCandidateToRecord(y: YouTubeCandidate): RegistryRecord {
  const lesson = CURRICULUM.lessons.find((l) => l.id === y.lessonId);
  return {
    id: `yt-${y.lessonId}-${y.videoId}`,
    title: y.title,
    publisher: y.channel ?? 'ยังไม่ทราบช่อง (ยังไม่ได้เปิดดู)',
    url: y.watchUrl,
    type: 'video',
    language: y.language,
    subjectId: lesson?.subjectId,
    topicIds: lesson ? [lesson.topicId] : [],
    lessonIds: [y.lessonId],
    skillIds: lesson?.skillIds ?? [],
    dateChecked: y.provenance.foundAt,
    verificationStatus: 'VERIFICATION_PENDING',
    actualContentInspected: false,
    summaryStatus: 'SUMMARY_PENDING',
    embedSupport: 'youtube',
    qualityNotes: `ลำดับตรวจ #${y.candidateRank} ในบทนี้ (ยังไม่ได้รีวิวคุณภาพ)`,
    limitations: ['พบจากผลการค้นหาเท่านั้น ยังไม่ได้ดูคลิป ไม่ทราบช่อง ความยาว คำบรรยาย หรือการฝัง'],
    provenance: `search result: "${y.provenance.query}"`,
  };
}

export const registryRecords = (): RegistryRecord[] => [
  ...allResources().map(toRegistryRecord),
  ...DISCOVERED_RESOURCES.map(discoveredToRecord),
  // a backlog clip that an older registry record already points at is listed once (under that record)
  ...YOUTUBE_CANDIDATES.filter((y) => !allResources().some((r) => r.candidateVideoUrl?.includes(y.videoId))).map(youtubeCandidateToRecord),
];

/** Unique pending YouTube videos across the backlog and the registry (each video id counted once). */
export function pendingVideoIds(): string[] {
  const ids = new Set(YOUTUBE_CANDIDATES.map((y) => y.videoId));
  for (const r of allResources()) {
    const m = r.candidateVideoUrl?.match(/[?&]v=([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m && registryStatus(r) !== 'VERIFIED') ids.add(m[1] ?? m[2]);
  }
  return [...ids];
}
