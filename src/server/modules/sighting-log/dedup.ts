/** One entry per flight per visit: a flight is "new" unless it was seen within the last `gapMs` (ADR 0007). */
export class SightingDedup {
  private lastSeen = new Map<string, number>();
  constructor(private readonly gapMs: number, hydrate: Record<string, number> = {}) {
    for (const [k, v] of Object.entries(hydrate)) this.lastSeen.set(k, v);
  }
  observe(icao24: string, nowMs: number): 'new' | 'seen' {
    const prev = this.lastSeen.get(icao24);
    this.lastSeen.set(icao24, nowMs);
    return prev !== undefined && nowMs - prev <= this.gapMs ? 'seen' : 'new';
  }
}
