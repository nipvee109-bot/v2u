/* =========================================================================
   V2U Search (Phase 51) — curated registry only, grouped
   บทเรียน / คลิป / อ่าน / โจทย์. External web search is a separate,
   clearly labelled link and is never mixed into V2U results.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import { getRecommendableResources, getResourceById } from '../resources/engine';
import { ORIGINAL_LESSONS } from '../content/originals';

export type SearchGroup = 'lesson' | 'video' | 'reading' | 'practice';

export const SEARCH_GROUP_LABEL: Record<SearchGroup, string> = {
  lesson: 'บทเรียน',
  video: 'คลิป',
  reading: 'อ่าน',
  practice: 'โจทย์',
};

export interface SearchHit {
  group: SearchGroup;
  id: string;
  title: string;
  subtitle: string;
  /** In-app route */
  href: string;
  /** Link status shown to the student for external resources */
  status?: 'active' | 'verified' | 'unverified';
}

export interface CuratedSearchResult {
  query: string;
  groups: Record<SearchGroup, SearchHit[]>;
  total: number;
  /** Clearly-labelled web search — not V2U-curated */
  external: { label: string; href: string };
}

const norm = (s: string) => s.toLowerCase().normalize('NFC');

export function searchCurated(query: string): CuratedSearchResult {
  const q = norm(query.trim());
  const groups: Record<SearchGroup, SearchHit[]> = { lesson: [], video: [], reading: [], practice: [] };
  const lessonTitle = (id: string) => CURRICULUM.lessons.find((l) => l.id === id)?.title ?? id;
  const hit = (...texts: (string | undefined)[]) => q.length > 0 && texts.some((t) => t && norm(t).includes(q));

  if (q) {
    for (const l of CURRICULUM.lessons) {
      const o = ORIGINAL_LESSONS.find((x) => x.lessonId === l.id);
      if (hit(l.title, l.description, ...l.learningOutcomes, o?.summary, ...(o?.keyTerms.map((k) => k.term) ?? [])))
        groups.lesson.push({ group: 'lesson', id: l.id, title: l.title, subtitle: `บทเรียน V2U · ${l.estimatedMinutes} นาที`, href: `/learn/curriculum/${l.id}` });
    }
    for (const r of getRecommendableResources()) {
      if (!hit(r.title, r.provider, r.description, ...r.curriculumLessonIds.map(lessonTitle))) continue;
      const lessonId = r.curriculumLessonIds[0];
      const g: SearchGroup = r.type === 'video' || r.type === 'course' ? 'video' : 'reading';
      groups[g].push({
        group: g,
        id: r.id,
        title: r.title,
        subtitle: `${r.provider} · ${r.language === 'th' ? 'ไทย' : 'อังกฤษ'} · ${r.status === 'unverified' ? 'ยังไม่ได้ตรวจลิงก์' : 'ตรวจลิงก์แล้ว'}`,
        href: `/learn/curriculum/${lessonId}`,
        status: r.status === 'deprecated' ? undefined : r.status,
      });
    }
    for (const ex of CURRICULUM.exercises) {
      if (hit(ex.title, lessonTitle(ex.lessonId), ...ex.items.map((i) => i.prompt)))
        groups.practice.push({ group: 'practice', id: ex.id, title: ex.title, subtitle: `${ex.items.length} ข้อ · ${lessonTitle(ex.lessonId)}`, href: `/learn/curriculum/${ex.lessonId}` });
    }
    // Thai first among resources
    for (const g of ['video', 'reading'] as const) {
      const th = (id: string) => (getResourceById(id)?.language === 'th' ? 1 : 0);
      groups[g].sort((a, b) => th(b.id) - th(a.id));
    }
  }
  const total = groups.lesson.length + groups.video.length + groups.reading.length + groups.practice.length;
  return {
    query,
    groups,
    total,
    external: { label: 'ค้นต่อบนเว็บ (นอก V2U · ยังไม่ได้คัด)', href: `https://www.google.com/search?q=${encodeURIComponent(query.trim())}` },
  };
}
