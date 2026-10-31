// PhotoSource over the Planespotters.net photo API (keyless): GET /pub/photos/hex/<HEX>, fallback /pub/photos/reg/<REG>.
// Only metadata: the iPad loads thumbnail_large straight from t.plnspttrs.net (terms: unchanged URL, credit next to the image, link to `link`; ADR 0029).
import { SourceError } from '../model';
import { isNotFound, obj, str, unavailableFrom, type Photo, type PhotoLookup, type PhotoQuery, type PhotoSource } from '../photo-source';
import { guardedFetch, type Fetch } from './http';

const BASE = 'https://api.planespotters.net/pub/photos/';

export class PlanespottersPhotoSource implements PhotoSource {
  readonly name = 'planespotters';
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; baseUrl?: string }) {}

  async lookup(q: PhotoQuery): Promise<PhotoLookup> {
    try {
      let photos = await this.get('hex/' + encodeURIComponent(q.icao24.trim().toUpperCase()));
      if (photos.length === 0 && q.registration?.trim()) photos = await this.get('reg/' + encodeURIComponent(q.registration.trim().toUpperCase()));
      return { photos };
    } catch (e) { return unavailableFrom(e); }
  }

  private async get(path: string): Promise<Photo[]> {
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await guardedFetch(this.o.fetch, (this.o.baseUrl ?? BASE) + path, { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) { if (isNotFound(e)) return []; throw e; }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'planespotters: invalid JSON'); }
    const list = obj(body)?.photos;
    if (!Array.isArray(list)) throw new SourceError('parse', 'planespotters: no photos array');
    return list.flatMap((p): Photo[] => {
      const o = obj(p);
      const thumb = str(obj(o?.thumbnail)?.src);
      const large = str(obj(o?.thumbnail_large)?.src) || thumb;
      const link = str(o?.link);
      if (!o || !thumb || !link) return [];
      const photographer = str(o.photographer);
      return [{ id: str(o.id) || link, thumbUrl: thumb, imageUrl: large, photographer, source: this.name, pageUrl: link, licenceText: `${photographer ? `© ${photographer} · ` : ''}planespotters.net` }];
    });
  }
}
