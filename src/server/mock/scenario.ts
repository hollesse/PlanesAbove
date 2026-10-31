// Mock mode (ADR 0004): JSON scenario files drive fake flight/route/TTS adapters by the (injectable) clock.
import fs from 'node:fs';
import { destinationPoint } from '../modules/airspace/geo';
import { SourceError, type FlightSource, type Flugzeug, type LatLon, type Route, type RouteSource, type SourceErrorClass } from '../modules/airspace/model';
import type { FakeSpeechBehaviour } from '../modules/sky-scene/fake-speech';
import type { Clock } from '../clock';
import type { Photo, PhotoLookup, PhotoQuery, PhotoSource } from '../modules/airspace/photo-source';

export interface ScenarioPlane {
  icao24: string; callsign?: string; typeCode?: string; registration?: string; category?: string;
  distanceKm: number; bearingDeg: number; altitudeFt?: number; speedKt?: number; verticalRateFpm?: number; onGround?: boolean;
}

export interface ScenarioStep {
  /** Seconds after scenario start at which this step takes effect. */
  at: number;
  planes?: ScenarioPlane[];
  /** Source failure from here on (null clears it). */
  failure?: SourceErrorClass | null;
  /** callsign -> route cities. Replaces the table. */
  routes?: Record<string, { from: string; to: string }>;
  tts?: { durationMs: number; failure?: FakeSpeechBehaviour['failure'] };
  /** icao24 -> photos served by the mock photo source (test infrastructure for GET /api/photos/:icao24). Replaces the table; a hex without an entry has no photo ("Kein Foto"). */
  photos?: Record<string, Photo[]>;
}

export interface Scenario { name: string; startTime: string; steps: ScenarioStep[] }

export interface ScenarioState { planes: ScenarioPlane[]; failure: SourceErrorClass | null; routes: Record<string, { from: string; to: string }>; tts: { durationMs: number; failure?: FakeSpeechBehaviour['failure'] }; photos: Record<string, Photo[]> }

export const loadScenario = (file: string): Scenario => parseScenario(fs.readFileSync(file, 'utf8'));

export function parseScenario(text: string): Scenario {
  const s = JSON.parse(text) as Scenario;
  if (!s.name || !Array.isArray(s.steps) || Number.isNaN(Date.parse(s.startTime))) throw new Error('Invalid scenario: needs name, startTime and steps[]');
  return { ...s, steps: [...s.steps].sort((a, b) => a.at - b.at) };
}

export class ScenarioDriver {
  readonly startMs: number;
  constructor(readonly scenario: Scenario, private readonly clock: Clock, private readonly startedAtMs: number) { this.startMs = Date.parse(scenario.startTime); }

  /** The merged scenario state at the current clock reading. */
  current(): ScenarioState {
    const offsetS = (this.clock.now() - this.startedAtMs) / 1000;
    const st: ScenarioState = { planes: [], failure: null, routes: {}, tts: { durationMs: 800 }, photos: {} };
    for (const step of this.scenario.steps) {
      if (step.at > offsetS) break;
      if (step.planes) st.planes = step.planes;
      if (step.failure !== undefined) st.failure = step.failure;
      if (step.routes) st.routes = step.routes;
      if (step.tts) st.tts = step.tts;
      if (step.photos) st.photos = step.photos;
    }
    return st;
  }
}

export class ScenarioFlightSource implements FlightSource {
  readonly name = 'scenario';
  constructor(private readonly driver: ScenarioDriver) {}
  async fetchAircraft(center: LatLon): Promise<Flugzeug[]> {
    const st = this.driver.current();
    if (st.failure) throw new SourceError(st.failure);
    return st.planes.map((p) => {
      const pos = destinationPoint(center, p.distanceKm, p.bearingDeg);
      return {
        icao24: p.icao24, callsign: p.callsign, typeCode: p.typeCode, registration: p.registration, emitterCategory: p.category,
        lat: pos.lat, lon: pos.lon, onGround: p.onGround ?? false,
        altitudeM: p.altitudeFt !== undefined ? p.altitudeFt * 0.3048 : undefined, speedKmh: p.speedKt !== undefined ? p.speedKt * 1.852 : undefined,
        verticalRateMs: p.verticalRateFpm !== undefined ? p.verticalRateFpm * 0.00508 : undefined,
      };
    });
  }
}

export class ScenarioRouteSource implements RouteSource {
  readonly name = 'scenario';
  constructor(private readonly driver: ScenarioDriver) {}
  async lookup(callsign: string): Promise<Route | null> {
    const r = this.driver.current().routes[callsign];
    return r ? { from: { name: r.from, city: r.from }, to: { name: r.to, city: r.to }, vendorPlausible: true } : null;
  }
}

/** Mock-mode photo source: serves the scenario's `photos` table (hex -> Photo[]). */
export class ScenarioPhotoSource implements PhotoSource {
  readonly name = 'scenario';
  constructor(private readonly driver: ScenarioDriver) {}
  async lookup(q: PhotoQuery): Promise<PhotoLookup> { return { photos: this.driver.current().photos[q.icao24.toLowerCase()] ?? [] }; }
}
