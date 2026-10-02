import { useCallback, useEffect, useReducer, useState } from 'react';
import { initialPlayerState, playerReducer } from './engine';
import type { PlayerAction } from './engine';
import type { PlayerState } from './types';

/* Player + reading progress survive mode switches and reloads within the tab.
   Storage is best-effort: if it is unavailable the lesson still works. */

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep in memory only */
  }
};

export type LearningStage = 'learn' | 'check' | 'done';

export function useLessonPlayer(lessonId: string) {
  const key = `v2u-player:${lessonId}`;
  const [state, dispatch] = useReducer(playerReducer, undefined, () => read<PlayerState>(key, initialPlayerState()));
  useEffect(() => write(key, state), [key, state]);
  return [state, dispatch] as [PlayerState, (a: PlayerAction) => void];
}

export function useLearningStage(lessonId: string) {
  const key = `v2u-stage:${lessonId}`;
  const [stage, setStage] = useState<LearningStage>(() => read<LearningStage>(key, 'learn'));
  const set = useCallback(
    (s: LearningStage) => {
      setStage(s);
      write(key, s);
    },
    [key]
  );
  return [stage, set] as const;
}

export function useReadingProgress(lessonId: string) {
  const key = `v2u-read:${lessonId}`;
  const [seen, setSeen] = useState<string[]>(() => read<string[]>(key, []));
  const mark = useCallback(
    (section: string) =>
      setSeen((prev) => {
        if (prev.includes(section)) return prev;
        const next = [...prev, section];
        write(key, next);
        return next;
      }),
    [key]
  );
  return [seen, mark] as const;
}
