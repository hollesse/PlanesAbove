// The Takt: poll the flight source, select, enrich, log sightings, and hold the current scene state (ADR 0004/0005).
import type { Clock } from '../../clock';
import { flightMaxAgeMs, type Config } from '../../config';
import type { Logger } from '../../logger';
import type { SceneState, ScenePlane } from '../../../shared/state';
import type { FlightPhase } from '../airspace/model';
import { SourceError, type FlightSource, type Flugzeug } from '../airspace/model';
import type { RouteInfo, RouteService } from '../airspace/route-service';
import { selectNearest } from '../airspace/selection';
import { resolveAirline, resolveLivery, resolveTypeClass, type Tables } from '../airspace/typeclass';
import type { SightingRepository } from '../sighting-log/repository';
import type { AudioService } from './audio-service';
import { assignSlots, emptySlots, type Slots } from './slots';
import { composeSpeech } from './steckbrief';

export interface FlightHealth { lastSuccessAt: number | null; lastTickAt: number | null; consecutiveFailures: number; lastErrorClass: string | null }

const climbOrDescent = (rateMs: number | undefined): FlightPhase => (rateMs === undefined ? 'level' : rateMs > 2.5 ? 'climb' : rateMs < -2.5 ? 'descent' : 'level');

export class SkyService {
  private planes: ScenePlane[] = [];
  private slots: Slots = emptySlots();
  private readonly bootAt: number;
  readonly health: FlightHealth = { lastSuccessAt: null, lastTickAt: null, consecutiveFailures: 0, lastErrorClass: null };

  constructor(private readonly d: {
    config: Config; clock: Clock; log: Logger; flight: FlightSource; routes: RouteService; tables: Tables;
    sightings: SightingRepository; audio: AudioService; buildId: string; timeZone?: string;
  }) { this.bootAt = d.clock.now(); }

  /** One 30 s Takt. Never throws: a failed source keeps the last good scene; it only counts as stale once the last success is older than flightMaxAge. */
  async tick(): Promise<void> {
    const { config, clock, log, flight } = this.d;
    const now = clock.now();
    this.health.lastTickAt = now;
    let aircraft: Flugzeug[];
    try {
      aircraft = await flight.fetchAircraft(config.location, config.radiusKm);
    } catch (e) {
      const cls = e instanceof SourceError ? e.errorClass : 'network';
      if (this.health.consecutiveFailures === 0) log.warn('flight source failed', { source: flight.name, errorClass: cls });
      this.health.consecutiveFailures++;
      this.health.lastErrorClass = cls;
      return;
    }
    if (this.health.consecutiveFailures > 0) log.info('flight source recovered', { source: flight.name, failures: this.health.consecutiveFailures });
    this.health.consecutiveFailures = 0;
    this.health.lastErrorClass = null;
    this.health.lastSuccessAt = now;

    const inRadius = selectNearest(aircraft, config.location, config.radiusKm, Number.MAX_SAFE_INTEGER);
    // Slot-Haltezeit (ADR 0017). Half a Takt is shaved off so clock jitter cannot extend the hold into Takt N+1.
    const holdMs = (config.scene.slotHoldTakte - 0.5) * config.pollIntervalSeconds * 1000;
    this.slots = assignSlots(this.slots, inRadius, now, holdMs);
    const byId = new Map(inRadius.map((c) => [c.aircraft.icao24, c]));
    const slotOf = new Map<string, number>();
    this.slots.forEach((h, i) => { if (h) slotOf.set(h.icao24, i + 1); });
    const chosen = this.slots.flatMap((h) => (h ? [byId.get(h.icao24)!] : []));
    const planes: ScenePlane[] = [];
    const routeById = new Map<string, RouteInfo | null>();
    for (const c of chosen) {
      const a = c.aircraft;
      const route = await this.d.routes.routeInfoFor(a.callsign, a);
      routeById.set(a.icao24, route);
      planes.push(this.toScenePlane(a, route?.text ?? null));
    }
    inRadius.forEach((c) => this.recordSighting(c.aircraft, c.distanceKm, routeById.get(c.aircraft.icao24) ?? null, slotOf.get(c.aircraft.icao24) ?? null, now));
    this.planes = planes;
  }

  private identify(a: Flugzeug) {
    const t = this.d.tables;
    const tc = resolveTypeClass(t, a.typeCode, a.emitterCategory);
    const airline = resolveAirline(t, a.callsign);
    const livery = resolveLivery(t, airline?.prefix, tc.typklasse, this.d.config.liveries.enabled);
    return { tc, airline, livery };
  }

  private toScenePlane(a: Flugzeug, route: string | null): ScenePlane {
    const { tc, airline, livery } = this.identify(a);
    const altitudeM = a.altitudeM ?? 0;
    const text = composeSpeech({ airlineName: airline?.name, callsign: a.callsign, typeName: tc.typeName, altitudeM: a.altitudeM });
    return {
      icao24: a.icao24,
      plane: { type: tc.typklasse, livery: livery.liveryId },
      flight: {
        operator: airline?.name ?? '',
        callsign: a.callsign,
        aircraft: tc.typeName ?? a.typeCode ?? 'Flugzeug',
        registration: a.registration ?? '',
        route,
        altitudeM,
        speedKmh: a.speedKmh ?? 0,
        phase: climbOrDescent(a.verticalRateMs),
      },
      speech: { text, ...this.d.audio.register(text) },
    };
  }

  private recordSighting(a: Flugzeug, distanceKm: number, routeInfo: RouteInfo | null, slot: number | null, now: number): void {
    const { tc, airline, livery } = this.identify(a);
    // adsbdb text must never reach SQLite (its terms, ADR 0016): only the source is recorded for it.
    const route = routeInfo?.source === 'vrs' ? routeInfo.text : null;
    const verdict = this.d.sightings.observe({ icao24: a.icao24, callsign: a.callsign, airline: airline?.name, typeCode: a.typeCode, typklasse: tc.typklasse, liveryPresent: livery.present, distanceKm, route, routeSource: routeInfo?.source ?? null, slot }, now);
    if (verdict === 'new') {
      if (tc.unmapped && a.typeCode) this.d.sightings.reportUnmapped('type', a.typeCode);
      if (airline && !airline.name) this.d.sightings.reportUnmapped('airline', airline.prefix);
    }
  }

  private recentText(now: number): string | undefined {
    const s = this.d.sightings.latest();
    if (!s) return undefined;
    const minutes = Math.max(0, Math.floor((now - s.lastSeenAtMs) / 60_000));
    const who = [s.airline, s.callsign].filter(Boolean).join(' ') || 'Flugzeug';
    return `Zuletzt: ${who} · ${minutes === 0 ? 'gerade eben' : `vor ${minutes} Min`}`;
  }

  state(): SceneState {
    const { config, clock } = this.d;
    const now = clock.now();
    const clockLabel = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: this.d.timeZone }).format(new Date(this.health.lastSuccessAt ?? now));
    return {
      buildId: this.d.buildId,
      serverTime: now,
      stale: now - (this.health.lastSuccessAt ?? this.bootAt) > flightMaxAgeMs(config),
      lastSuccessAt: this.health.lastSuccessAt,
      place: config.place,
      clock: clockLabel,
      sky: config.sky,
      planes: this.planes,
      recent: this.planes.length === 0 ? this.recentText(now) : undefined,
      client: config.client,
    };
  }
}
