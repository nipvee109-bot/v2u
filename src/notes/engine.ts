/* =========================================================================
   V2U personal notes engine (Phase 55) — pure
   Summaries are assembled ONLY from the learner's notes, the lesson's
   existing V2U content, the chosen video's metadata and the checked result.
   Nothing is generated or guessed.
   ========================================================================= */

import { CURRICULUM } from '../curriculum/data';
import type { LearningNotesData, NoteType, PersonalSummary, StudyNote, VideoProgress } from './types';

export const NOTE_TYPE_META: Record<NoteType, { icon: string; label: string; short: string }> = {
  understood: { icon: '📝', label: 'สิ่งที่ฉันเข้าใจ', short: 'เข้าใจ' },
  trick: { icon: '💡', label: 'ทริค / เทคนิค', short: 'ทริค' },
  unclear: { icon: '❓', label: 'สิ่งที่ยังไม่เข้าใจ', short: 'ยังไม่เข้าใจ' },
  important: { icon: '⭐', label: 'สิ่งสำคัญ', short: 'สำคัญ' },
  note: { icon: '🗒️', label: 'โน้ตทั่วไป', short: 'โน้ต' },
};
export const NOTE_TYPES: NoteType[] = ['understood', 'trick', 'unclear', 'important', 'note'];

export const REFLECTION_LABEL: Record<NonNullable<VideoProgress['reflection']>, string> = {
  'not-yet': 'ยังไม่เข้าใจ',
  somewhat: 'พอเข้าใจ',
  understood: 'เข้าใจแล้ว',
  'can-teach': 'อธิบายให้คนอื่นได้',
};

export const EMPTY_NOTES_DATA: LearningNotesData = { notes: [], summaries: {}, videoProgress: {} };

export const progressKey = (lessonId: string, videoKey: string) => `${lessonId}|${videoKey}`;

export function notesForLesson(notes: StudyNote[], lessonId: string): StudyNote[] {
  return notes.filter((n) => n.lessonId === lessonId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ── Personal summary ─────────────────────────────────────────────────── */

export interface SummaryInput {
  lessonId: string;
  notes: StudyNote[];
  videoTitle?: string;
  /** From the understanding check, if taken */
  check?: { understood: string[]; confused: string[]; score: number };
}

export function buildPersonalSummary({ lessonId, notes, videoTitle, check }: SummaryInput): string {
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  const mine = notesForLesson(notes, lessonId);
  const of = (t: NoteType) => mine.filter((n) => n.type === t).map((n) => n.text.trim()).filter(Boolean);
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- (ยังไม่มี)');
  if (mine.length === 0 && !check) return 'ยังไม่มีข้อมูลเพียงพอสำหรับสรุป — ลองจดโน้ตระหว่างเรียน หรือทำเช็กความเข้าใจก่อน';
  const learned = [...of('understood'), ...of('note'), ...(check?.understood ?? []).map((s) => `เช็กแล้วเข้าใจ: ${s}`)];
  const doubts = [...of('unclear'), ...(check?.confused ?? []).map((s) => `เช็กแล้วยังสับสน: ${s}`)];
  return [
    '🧠 สรุปของฉัน',
    '',
    `บท: ${lesson?.title ?? lessonId}`,
    ...(videoTitle ? [`เรียนจาก: ${videoTitle}`] : []),
    ...(check ? [`เช็กความเข้าใจ: ${check.score}%`] : []),
    '',
    'ฉันได้เรียนรู้:',
    list(learned),
    '',
    '💡 ทริคที่ฉันจด:',
    list(of('trick')),
    '',
    '⭐ สิ่งสำคัญ:',
    list(of('important')),
    '',
    '❓ สิ่งที่ฉันยังสงสัย:',
    list(doubts),
  ].join('\n');
}

/** The saved summary if the learner edited it; otherwise a fresh draft from current notes. */
export function currentSummary(saved: PersonalSummary | undefined, input: SummaryInput): string {
  return saved?.edited ? saved.text : buildPersonalSummary(input);
}

/* ── Notes → the existing session notes (so the existing review engine sees them) ── */

export function notesToSessionDraft(notes: StudyNote[], lessonId: string): { learnedNotes: string; stillUnclearNotes: string } {
  const mine = notesForLesson(notes, lessonId);
  const line = (n: StudyNote) => `${NOTE_TYPE_META[n.type].icon} ${n.text.trim()}`;
  return {
    learnedNotes: mine.filter((n) => n.type !== 'unclear').map(line).join('\n'),
    stillUnclearNotes: mine.filter((n) => n.type === 'unclear').map((n) => n.text.trim()).join('\n'),
  };
}

/** Combine notes-derived draft with a check note (no duplicates, nothing dropped). */
export function mergeIntoDraft(d: { learnedNotes: string; stillUnclearNotes: string }, checkNote: string): { learnedNotes?: string; stillUnclearNotes?: string } {
  const unclear = [d.stillUnclearNotes, checkNote].filter((x) => x.trim()).join('\n');
  return {
    ...(d.learnedNotes.trim() ? { learnedNotes: d.learnedNotes } : {}),
    ...(unclear ? { stillUnclearNotes: unclear } : {}),
  };
}

/* ── Personal knowledge: "สิ่งที่คุณเคยบอกว่ายังไม่เข้าใจ" ─────────────── */

export interface UnclearSignal {
  lessonId: string;
  lessonTitle: string;
  /** Skill it maps to — only when the mapping is supported by data */
  skillId?: string;
  skillTitle?: string;
  /** How sure the link to a skill is */
  mapping: 'skill' | 'lesson-only';
  notes: StudyNote[];
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '');

/**
 * Group "ยังไม่เข้าใจ" notes. The lesson is always known (the note was written
 * in it). A skill is attached only if the lesson has exactly one skill, or the
 * note names one of THAT lesson's skills (title/description) — never a guess
 * across the whole curriculum.
 */
export function getUnclearSignals(notes: StudyNote[]): UnclearSignal[] {
  const groups = new Map<string, UnclearSignal>();
  for (const n of notes.filter((x) => x.type === 'unclear' && x.text.trim())) {
    const lesson = CURRICULUM.lessons.find((l) => l.id === n.lessonId);
    if (!lesson) continue;
    const skills = CURRICULUM.skills.filter((s) => lesson.skillIds.includes(s.id));
    const t = norm(n.text);
    const named = skills.filter((s) => t.includes(norm(s.title)) || norm(s.description).split(/[,·]/).some((d) => d.length >= 4 && t.includes(d)));
    const skill = skills.length === 1 ? skills[0] : named.length === 1 ? named[0] : undefined;
    const key = `${lesson.id}|${skill?.id ?? ''}`;
    const g = groups.get(key) ?? {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      skillId: skill?.id,
      skillTitle: skill?.title,
      mapping: skill ? ('skill' as const) : ('lesson-only' as const),
      notes: [],
    };
    g.notes.push(n);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.notes.length - a.notes.length);
}

/* ── Backup helpers ───────────────────────────────────────────────────── */

const NOTE_TYPE_SET = new Set<NoteType>(NOTE_TYPES);
const STATES = new Set(['not-started', 'learning', 'watched', 'checked', 'done']);
const REFLECTIONS = new Set(['not-yet', 'somewhat', 'understood', 'can-teach']);

/** Accepts anything; returns clean data (unknown fields dropped). */
export function sanitizeNotesData(raw: unknown): LearningNotesData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_NOTES_DATA };
  const r = raw as Record<string, unknown>;
  const notes: StudyNote[] = Array.isArray(r.notes)
    ? r.notes
        .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
        .filter((n) => typeof n.id === 'string' && typeof n.lessonId === 'string' && typeof n.text === 'string' && NOTE_TYPE_SET.has(n.type as NoteType))
        .map((n) => ({
          id: n.id as string,
          lessonId: n.lessonId as string,
          type: n.type as NoteType,
          text: n.text as string,
          ...(typeof n.videoKey === 'string' ? { videoKey: n.videoKey } : {}),
          ...(typeof n.timestampSeconds === 'number' && n.timestampSeconds >= 0 ? { timestampSeconds: n.timestampSeconds } : {}),
          createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(0).toISOString(),
          updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : typeof n.createdAt === 'string' ? n.createdAt : new Date(0).toISOString(),
        }))
    : [];
  const summaries: Record<string, PersonalSummary> = {};
  if (r.summaries && typeof r.summaries === 'object') {
    for (const [k, v] of Object.entries(r.summaries as Record<string, unknown>)) {
      const s = v as Record<string, unknown>;
      if (s && typeof s.text === 'string') summaries[k] = { lessonId: k, text: s.text, edited: s.edited === true, updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date(0).toISOString() };
    }
  }
  const videoProgress: Record<string, VideoProgress> = {};
  if (r.videoProgress && typeof r.videoProgress === 'object') {
    for (const [k, v] of Object.entries(r.videoProgress as Record<string, unknown>)) {
      const p = v as Record<string, unknown>;
      if (p && STATES.has(p.state as string))
        videoProgress[k] = {
          state: p.state as VideoProgress['state'],
          ...(REFLECTIONS.has(p.reflection as string) ? { reflection: p.reflection as VideoProgress['reflection'] } : {}),
          ...(typeof p.skipped === 'boolean' ? { skipped: p.skipped } : {}),
          updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date(0).toISOString(),
        };
    }
  }
  return { notes, summaries, videoProgress };
}

export function hasNotesData(d?: LearningNotesData | null): boolean {
  return !!d && (d.notes.length > 0 || Object.keys(d.summaries).length > 0 || Object.keys(d.videoProgress).length > 0);
}
