// Slot assignment with a minimum hold time (ADR 0017). Pure: all time comes in as `now`.
import type { Candidate } from '../airspace/selection';

export interface SlotHolder { icao24: string; holdUntil: number }
/** Two slots; the index is the stable slot identity (slot 1 = index 0). */
export type Slots = [SlotHolder | null, SlotHolder | null];

export const emptySlots = (): Slots => [null, null];

/**
 * `candidates` are the in-radius planes, nearest first (airspace `selectNearest`, horizontal distance).
 * A holder keeps its slot while `now < holdUntil` and it is still a candidate; a holder that left the radius
 * or vanished frees its slot at once. Open slots (free or hold expired) follow the normal nearest rule among
 * the planes not locked into the other slot, but an expired holder that is still among the nearest keeps its slot (no swap).
 */
export function assignSlots(previous: Slots, candidates: Candidate[], now: number, holdMs: number): Slots {
  const present = new Set(candidates.map((c) => c.aircraft.icao24));
  const next: Slots = [null, null];
  const open: number[] = [];
  previous.forEach((h, i) => {
    if (h && present.has(h.icao24) && now < h.holdUntil) next[i] = h;
    else open.push(i);
  });
  const locked = new Set(next.filter((h): h is SlotHolder => h !== null).map((h) => h.icao24));
  const pool = candidates.filter((c) => !locked.has(c.aircraft.icao24)).slice(0, open.length).map((c) => c.aircraft.icao24);
  const free: number[] = [];
  for (const i of open) {
    const h = previous[i];
    if (h && pool.includes(h.icao24)) { next[i] = h; pool.splice(pool.indexOf(h.icao24), 1); } else free.push(i);
  }
  for (const i of free) {
    const id = pool.shift();
    if (id !== undefined) next[i] = { icao24: id, holdUntil: now + holdMs };
  }
  return next;
}
