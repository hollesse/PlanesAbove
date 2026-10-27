// Wire format of GET /api/state (ADR 0004): the one JSON document the thin client renders.
import type { FlightInfo } from '../client/ui/domain/flight';
import type { PlaneType, SkyKey } from '../client/ui/domain/catalog';

export interface ScenePlane {
  icao24: string;
  plane: { type: PlaneType; livery: string };
  flight: FlightInfo;
  speech: { text: string; audioUrl: string; durationMs?: number };
}

export interface ClientSettings { pollIntervalSeconds: number; staleAfterMinutes: number; reloadAt: string; speechWatchdogSeconds: number }

export interface SceneState {
  buildId: string;
  serverTime: number;
  /** The last Takt could not reach the flight source: the last good scene is kept. */
  stale: boolean;
  lastSuccessAt: number | null;
  place: string;
  /** HH:MM in the server's local time zone. */
  clock: string;
  sky: SkyKey;
  planes: ScenePlane[];
  /** "Zuletzt: Lufthansa LH400 · vor 6 Min" - only meaningful when `planes` is empty. */
  recent?: string;
  client: ClientSettings;
}
