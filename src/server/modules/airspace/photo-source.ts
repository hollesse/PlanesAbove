// PhotoSource port (ADR 0029): real photos of one concrete aircraft, as JSON metadata only. The server never fetches, stores or proxies
// image bytes - the iPad loads `thumbUrl` / `imageUrl` straight from the source's host. Results live only in memory (PhotoService).
import { SourceError, type SourceErrorClass } from './model';

export interface Photo {
  /** Stable per source (dedup key together with `source`). */
  id: string;
  thumbUrl: string;
  imageUrl: string;
  photographer: string;
  /** Name of the photo source that delivered it (planespotters | commons | airport-data). */
  source: string;
  /** Page the credit has to link to (plane photo page / Commons file page). */
  pageUrl: string;
  /** Ready-made credit line shown next to the image. */
  licenceText: string;
  /** Pixel size of `imageUrl` as the source's response states it (not measured; absent when the source gives none). */
  size?: { width: number; height: number };
}

export interface PhotoQuery { icao24: string; registration?: string }

/** `{ photos: [] }` is "Kein Foto" (a regular state); `unavailable` is a failure (timeout, network, 429, 5xx, broken JSON) and is never cached. */
export type PhotoLookup = { photos: Photo[] } | { unavailable: true; errorClass?: SourceErrorClass; retryAfterMs?: number };

export interface PhotoSource {
  readonly name: string;
  lookup(q: PhotoQuery): Promise<PhotoLookup>;
}

export const PHOTO_SOURCE_NAMES = ['commons', 'airport-data', 'planespotters'] as const;
export type PhotoSourceName = (typeof PHOTO_SOURCE_NAMES)[number];

/** Maps any thrown failure of a source call to the port's `unavailable` answer. */
export function unavailableFrom(e: unknown): { unavailable: true; errorClass: SourceErrorClass; retryAfterMs?: number } {
  const se = e instanceof SourceError ? e : new SourceError('network', (e as Error)?.message);
  return { unavailable: true, errorClass: se.errorClass, ...(se.retryAfterMs !== undefined && { retryAfterMs: se.retryAfterMs }) };
}

export const isNotFound = (e: unknown): boolean => e instanceof SourceError && e.errorClass === 'http-4xx' && e.message === 'HTTP 404';

export const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
