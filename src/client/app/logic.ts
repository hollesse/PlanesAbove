// Pure client logic (unit-tested): backoff, nightly reload, stale text, state -> screen props, tap resolution.
import type { SceneState } from '../../shared/state';
import type { ScreenProps } from '../ui';

const CAP_MS = 60_000;

/** Delay until the next poll: the normal cadence, or capped exponential backoff after failures (ADR 0008). */
export const backoffMs = (failures: number, baseMs: number): number => (failures <= 0 ? baseMs : Math.min(CAP_MS, baseMs * 2 ** failures));

export const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Nightly reload (default 04:00 local) bounds browser memory growth. `lastReloadDay` = day key of the last reload (or of page load). */
export function reloadDue(now: Date, reloadAt: string, lastReloadDay: string | null): { due: boolean; day: string } {
  const [hh, mm] = reloadAt.split(':').map(Number);
  const day = dayKey(now);
  const afterTime = now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm;
  return { due: afterTime && lastReloadDay !== day, day };
}

/** Veraltet-Zustand der Kopfzeile: the server says the source is down, or we could not reach the server for `staleAfterMs`. `since` = time of the last good Stand. */
export function staleSince(state: SceneState, msSinceLastSuccessfulPoll: number, staleAfterMs: number): { since: string } | undefined {
  return state.stale || msSinceLastSuccessfulPoll > staleAfterMs ? { since: state.clock } : undefined;
}

export function toScreenProps(state: SceneState, stale: { since: string } | undefined): ScreenProps {
  return {
    aspect: '4:3',
    sky: state.sky,
    place: state.place,
    clock: state.clock,
    planes: state.planes.map((p) => ({ plane: { type: p.plane.type, livery: p.plane.livery }, flight: p.flight })),
    recent: state.recent,
    stale,
  };
}

interface Box { left: number; top: number; right: number; bottom: number }
const inside = (p: { x: number; y: number }, b: Box): boolean => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

/** Index (0/1) of the plane a tap belongs to: its silhouette or its text. Single plane: anywhere on plane or bar. */
export function tapTarget(planeCount: number, point: { x: number; y: number }, planeBoxes: Box[], textBoxes: Box[]): number | undefined {
  if (planeCount === 0) return undefined;
  for (let i = 0; i < planeCount; i++) if ((planeBoxes[i] && inside(point, planeBoxes[i])) || (textBoxes[i] && inside(point, textBoxes[i]))) return i;
  return undefined;
}
