/* Game registry (Phase 70) — the ONLY source of game availability.
   A lesson has a game slot state only if a game is registered for it here;
   availability is never inferred from the subject. */

export type GameAvailability = 'NOT_AVAILABLE' | 'PREPARING' | 'AVAILABLE' | 'LOADING' | 'PLAYING' | 'COMPLETED' | 'ERROR';

export interface RegisteredGame {
  gameId: string;
  title: string;
  /** Owner of the game implementation (V2U only adapts content/evidence) */
  owner: 'codex/v2u-game-lab';
  lessonIds: string[];
  contentVersion: '1.1';
  evidenceVersion: '1.1';
  /** Release state of the integration. Only AVAILABLE may ever be played by learners. */
  status: 'PREPARING' | 'AVAILABLE';
  /** Game results change V2U learning state only when this is true (not yet). */
  learningEffectsActive: false;
  /** Learner-facing line for the slot */
  slotMessage: string;
}

export const GAME_REGISTRY: RegisteredGame[] = [
  {
    gameId: 'pixel-code-battle',
    title: 'Pixel Code Battle',
    owner: 'codex/v2u-game-lab',
    lessonIds: ['prog-ctrl-conditions'],
    contentVersion: '1.1',
    evidenceVersion: '1.1',
    status: 'PREPARING',
    learningEffectsActive: false,
    slotMessage: 'กิจกรรม Pixel Code Battle กำลังเตรียม — ตอนนี้เรียนและฝึกในบทนี้ได้ครบโดยไม่ต้องใช้เกม',
  },
];

export const gamesForLesson = (lessonId: string) => GAME_REGISTRY.filter((g) => g.lessonIds.includes(lessonId));

/** Slot state for a lesson, from registered integrations only. */
export function getLessonGameAvailability(lessonId: string): GameAvailability {
  const g = gamesForLesson(lessonId);
  if (g.some((x) => x.status === 'AVAILABLE')) return 'AVAILABLE';
  if (g.some((x) => x.status === 'PREPARING')) return 'PREPARING';
  return 'NOT_AVAILABLE';
}
