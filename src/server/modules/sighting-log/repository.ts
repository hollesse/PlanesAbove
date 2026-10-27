// Sighting-log BC: owns the `sightings`, `route_lookups` and `unmapped_keys` tables; the only code that touches them (ADR 0007).
import type { Db } from '../../db';
import { SightingDedup } from './dedup';

export interface SightingInput {
  icao24: string;
  callsign?: string;
  airline?: string;
  typeCode?: string;
  typklasse: string;
  liveryPresent: boolean;
  distanceKm: number;
  /** Route text; only ever set for VRS and FlightAware routes (adsbdb/hexdb text is never persisted, ADR 0016; FlightAware Personal terms allow it, ADR 0018). */
  route: string | null;
  /** Which source knew the route, if any. */
  routeSource?: 'vrs' | 'adsbdb' | 'hexdb' | 'flightaware' | null;
  /** Auswahl slot 1 or 2 when the flight was shown, else null. */
  slot?: number | null;
}

export interface Sighting {
  id: number;
  icao24: string;
  callsign: string | null;
  airline: string | null;
  typeCode: string | null;
  typklasse: string;
  liveryPresent: boolean;
  route: string | null;
  routeSource: string | null;
  slot: number | null;
  closestDistanceKm: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSeenAtMs: number;
}

interface Row { id: number; icao24: string; callsign: string | null; airline: string | null; type_code: string | null; typklasse: string; livery_present: number; route: string | null; route_source: string | null; slot: number | null; closest_distance_km: number; first_seen_at: string; last_seen_at: string; last_seen_ms: number }
const toSighting = (r: Row): Sighting => ({ id: r.id, icao24: r.icao24, callsign: r.callsign, airline: r.airline, typeCode: r.type_code, typklasse: r.typklasse, liveryPresent: r.livery_present === 1, route: r.route, routeSource: r.route_source, slot: r.slot, closestDistanceKm: r.closest_distance_km, firstSeenAt: r.first_seen_at, lastSeenAt: r.last_seen_at, lastSeenAtMs: r.last_seen_ms });

function findOrCreatePoint(db: Db, p: ObservationPoint): number {
  const lat = round4(p.lat), lon = round4(p.lon);
  return db.transaction(() => {
    const row = db.prepare('SELECT id, place FROM observation_points WHERE lat = ? AND lon = ? AND radius_km = ?').get(lat, lon, p.radiusKm) as { id: number; place: string } | undefined;
    if (row) {
      if (row.place !== p.place) db.prepare('UPDATE observation_points SET place = ? WHERE id = ?').run(p.place, row.id);
      return row.id;
    }
    return Number(db.prepare('INSERT INTO observation_points (lat, lon, radius_km, place, first_used_at) VALUES (?,?,?,?,?)').run(lat, lon, p.radiusKm, p.place, new Date().toISOString()).lastInsertRowid);
  })();
}

/** The observation point the service looks from: identity is lat/lon (4 decimals) + radiusKm, `place` is only a label. */
export interface ObservationPoint { lat: number; lon: number; radiusKm: number; place: string }
const round4 = (x: number): number => Math.round(x * 10_000) / 10_000;

export class SightingRepository {
  private dedup: SightingDedup;
  private readonly pointId: number;
  constructor(private readonly db: Db, gapMs: number, point: ObservationPoint) {
    this.pointId = findOrCreatePoint(db, point);
    const hydrate: Record<string, number> = {};
    for (const r of db.prepare('SELECT icao24, MAX(last_seen_ms) AS ms FROM sightings WHERE observation_point_id = ? GROUP BY icao24').all(this.pointId) as { icao24: string; ms: number }[]) hydrate[r.icao24] = r.ms;
    this.dedup = new SightingDedup(gapMs, hydrate);
  }

  /** Record one observation at a Takt: inserts a row for a new visit, otherwise only extends the open visit. */
  observe(s: SightingInput, nowMs: number): 'new' | 'seen' {
    const verdict = this.dedup.observe(s.icao24, nowMs);
    // Defence in depth for the adsbdb licence boundary: route text is stored for VRS and FlightAware only.
    // Unlabelled text is never stored: only an explicit 'vrs' or 'flightaware' label lets route text through.
    const routeSource = s.routeSource ?? null;
    const route = routeSource === 'vrs' || routeSource === 'flightaware' ? s.route : null;
    const iso = new Date(nowMs).toISOString();
    if (verdict === 'new') {
      this.db.prepare('INSERT INTO sightings (icao24, callsign, airline, type_code, typklasse, livery_present, route, route_source, slot, closest_distance_km, first_seen_at, last_seen_at, last_seen_ms, observation_point_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(s.icao24, s.callsign ?? null, s.airline ?? null, s.typeCode ?? null, s.typklasse, s.liveryPresent ? 1 : 0, route, routeSource, s.slot ?? null, s.distanceKm, iso, iso, nowMs, this.pointId);
    } else {
      this.db.prepare(`UPDATE sightings SET last_seen_at = ?, last_seen_ms = ?, closest_distance_km = MIN(closest_distance_km, ?), route = CASE WHEN route_source IS NULL OR (route_source IN ('adsbdb', 'hexdb') AND ? IN ('vrs', 'flightaware')) THEN COALESCE(?, route) ELSE route END, route_source = CASE WHEN route_source IS NULL OR (route_source IN ('adsbdb', 'hexdb') AND ? IN ('vrs', 'flightaware')) THEN COALESCE(?, route_source) ELSE route_source END, slot = COALESCE(slot, ?) WHERE id = (SELECT id FROM sightings WHERE icao24 = ? AND observation_point_id = ? ORDER BY last_seen_ms DESC, id DESC LIMIT 1)`)
        .run(iso, nowMs, s.distanceKm, routeSource, route, routeSource, routeSource, s.slot ?? null, s.icao24, this.pointId);
    }
    return verdict;
  }

  /** Record what one route lookup found for the visit's sighting (findings only, ADR 0016): one row per asked source. */
  recordLookup(icao24: string, attempts: { source: string; outcome: string }[], conflict: boolean, chosen: string | null, nowMs: number): void {
    const row = this.db.prepare('SELECT id FROM sightings WHERE icao24 = ? AND observation_point_id = ? ORDER BY last_seen_ms DESC, id DESC LIMIT 1').get(icao24, this.pointId) as { id: number } | undefined;
    if (!row) return;
    const ins = this.db.prepare('INSERT INTO route_lookups (sighting_id, source, outcome, conflict, chosen, looked_up_at) VALUES (?,?,?,?,?,?)');
    const iso = new Date(nowMs).toISOString();
    this.db.transaction(() => { for (const a of attempts) ins.run(row.id, a.source, a.outcome, conflict ? 1 : 0, chosen !== null && a.source === chosen && a.outcome === 'hit' ? 1 : 0, iso); })();
  }

  list(): Sighting[] {
    return (this.db.prepare('SELECT * FROM sightings ORDER BY id').all() as Row[]).map(toSighting);
  }

  /** Stats: sightings whose route is known, from any source (route text exists only for VRS). */
  routeKnownCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM sightings WHERE route_source IS NOT NULL').get() as { n: number }).n;
  }

  latest(): Sighting | undefined {
    const r = this.db.prepare('SELECT * FROM sightings WHERE observation_point_id = ? ORDER BY last_seen_ms DESC, id DESC LIMIT 1').get(this.pointId) as Row | undefined;
    return r && toSighting(r);
  }

  reportUnmapped(kind: 'type' | 'airline', key: string): void {
    this.db.prepare('INSERT INTO unmapped_keys (kind, key, count) VALUES (?,?,1) ON CONFLICT(kind, key) DO UPDATE SET count = count + 1').run(kind, key);
  }

  unmapped(): { kind: string; key: string; count: number }[] {
    return this.db.prepare('SELECT kind, key, count FROM unmapped_keys ORDER BY kind, key').all() as { kind: string; key: string; count: number }[];
  }
}
