// PhotoSource over Airport-Data.com (keyless, no published terms - the operator opted in on 2026-10-31, credit + link always shown):
// GET /api/ac_thumb.json?m=<HEX>&n=5, fallback r=<REG>. Only metadata; the iPad loads `image` itself (ADR 0029).
import { SourceError } from '../model';
import { isNotFound, obj, str, unavailableFrom, type Photo, type PhotoLookup, type PhotoQuery, type PhotoSource } from '../photo-source';
import { guardedFetch, type Fetch } from './http';

const BASE = 'https://airport-data.com/api/ac_thumb.json';

export class AirportDataPhotoSource implements PhotoSource {
  readonly name = 'airport-data';
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; baseUrl?: string }) {}

  async lookup(q: PhotoQuery): Promise<PhotoLookup> {
    try {
      let photos = await this.get('m=' + encodeURIComponent(q.icao24.trim().toUpperCase()));
      if (photos.length === 0 && q.registration?.trim()) photos = await this.get('r=' + encodeURIComponent(q.registration.trim().toUpperCase()));
      return { photos };
    } catch (e) { return unavailableFrom(e); }
  }

  private async get(param: string): Promise<Photo[]> {
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await guardedFetch(this.o.fetch, `${this.o.baseUrl ?? BASE}?${param}&n=5`, { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) { if (isNotFound(e)) return []; throw e; }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'airport-data: invalid JSON'); }
    const b = obj(body);
    if (!b) throw new SourceError('parse', 'airport-data: not an object');
    if (b.status === 404 || b.data === undefined || b.data === null) return []; // {"status":404,...} / no `data` = no photo
    if (!Array.isArray(b.data)) throw new SourceError('parse', 'airport-data: data is not an array');
    return b.data.flatMap((p): Photo[] => {
      const o = obj(p);
      const image = str(o?.image);
      const link = str(o?.link);
      if (!o || !image || !link) return [];
      const photographer = str(o.photographer);
      return [{ id: link, thumbUrl: image, imageUrl: image, photographer, source: this.name, pageUrl: link, licenceText: `${photographer ? `© ${photographer} · ` : ''}airport-data.com` }];
    });
  }
}
