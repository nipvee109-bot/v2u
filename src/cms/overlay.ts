/* Published-CMS overlay (Phase 72). In-memory only (never persisted, never mixed into
   learner state). Filled by the app after reading `cmsPublished` / games; empty when no
   backend is configured, so V2U behaves exactly as before. */

import type { CuratedResource } from '../resources/types';
import type { GameDoc, LessonGameAssignment } from './types';
import type { OverridableField } from './types';

export interface CmsOverlayState {
  /** Learner-visible CMS resources/videos, already filtered by resolver policy */
  resources: CuratedResource[];
  /** Published controlled-content overrides: lessonId → field → value */
  overrides: Record<string, Partial<Record<OverridableField, string | string[]>>>;
  games: GameDoc[];
  assignments: LessonGameAssignment[];
  loaded: boolean;
}

const EMPTY: CmsOverlayState = { resources: [], overrides: {}, games: [], assignments: [], loaded: false };
let state: CmsOverlayState = EMPTY;
const listeners = new Set<() => void>();

export const getCmsOverlay = () => state;
export function setCmsOverlay(next: Partial<CmsOverlayState>) {
  state = { ...state, ...next, loaded: true };
  listeners.forEach((l) => l());
}
export function resetCmsOverlay() {
  state = EMPTY;
  listeners.forEach((l) => l());
}
export function subscribeCmsOverlay(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
