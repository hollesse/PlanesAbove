// PhotoSource over the Wikimedia Commons API (keyless, descriptive User-Agent required): full-text search in the File namespace for the
// registration. The search is fuzzy, so a hit only counts when the file title or description contains the registration exactly
// (D-AIXA must not match D-AIXAB). Needs a registration; without one nothing is asked. Only metadata; the iPad loads the thumb itself (ADR 0029).
import { SourceError } from '../model';
import { isNotFound, obj, str, unavailableFrom, type Photo, type PhotoLookup, type PhotoQuery, type PhotoSource } from '../photo-source';
import { guardedFetch, type Fetch } from './http';

/** Requested preview width: the iPad Pro overlay is ~1800 physical pixels wide, so 1600 px stays sharp (Commons scales on demand). */
const PREVIEW_WIDTH_PX = 1600;
const BASE = 'https://commons.wikimedia.org/w/api.php';

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&nbsp;': ' ' };
/** extmetadata values are HTML: drop tags, decode the common entities. */
const plain = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#0?39|nbsp);/g, (m) => ENTITIES[m] ?? m).replace(/\s+/g, ' ').trim();
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** DateTimeOriginal is free text ("2019-05-04 14:22:11", "2019-05-04", ...): take a leading ISO-like date, else null. */
function parseTaken(text: string): number | null {
  const m = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return Number.isNaN(t) ? null : t;
}
const meta = (m: Record<string, unknown> | null, key: string): string => plain(str(obj(m?.[key])?.value));

export class CommonsPhotoSource implements PhotoSource {
  readonly name = 'commons';
  constructor(private readonly o: { fetch: Fetch; userAgent: string; timeoutMs: number; baseUrl?: string }) {}

  async lookup(q: PhotoQuery): Promise<PhotoLookup> {
    const reg = q.registration?.trim().toUpperCase();
    if (!reg) return { photos: [] };
    try { return { photos: await this.search(reg) }; } catch (e) { return unavailableFrom(e); }
  }

  private async search(reg: string): Promise<Photo[]> {
    const url = `${this.o.baseUrl ?? BASE}?action=query&generator=search&gsrsearch=${encodeURIComponent(reg)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url%7Cextmetadata%7Ctimestamp&iiurlwidth=${PREVIEW_WIDTH_PX}&format=json`;
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await guardedFetch(this.o.fetch, url, { headers: { 'User-Agent': this.o.userAgent, Accept: 'application/json' } }, this.o.timeoutMs);
    } catch (e) { if (isNotFound(e)) return []; throw e; }
    let body: unknown;
    try { body = JSON.parse(await res.text()); } catch { throw new SourceError('parse', 'commons: invalid JSON'); }
    const b = obj(body);
    if (!b) throw new SourceError('parse', 'commons: not an object');
    if (b.error) throw new SourceError('parse', 'commons: API error');
    const pages = obj(obj(b.query)?.pages);
    if (!pages) return []; // no `query` = nothing found
    const exact = new RegExp(`(?<![A-Z0-9])${escapeRe(reg)}(?![A-Z0-9])`, 'i');
    const dated = Object.values(pages)
      .map(obj)
      .filter((p): p is Record<string, unknown> => p !== null)
      .sort((a, c) => (Number(a.index) || 0) - (Number(c.index) || 0))
      .flatMap((p): { photo: Photo; ms: number }[] => {
        const info = obj(Array.isArray(p.imageinfo) ? p.imageinfo[0] : null);
        const m = obj(info?.extmetadata);
        const title = str(p.title);
        const thumb = str(info?.thumburl) || str(info?.url);
        const pageUrl = str(info?.descriptionurl);
        if (!info || !thumb || !pageUrl) return [];
        if (!exact.test(title) && !exact.test(meta(m, 'ImageDescription'))) return []; // fuzzy-search mis-hit: another aircraft
        const artist = meta(m, 'Artist');
        const w = Number(info.thumbwidth); const h = Number(info.thumbheight);
        const size = w > 0 && h > 0 ? { size: { width: w, height: h } } : {};
        const uploaded = Date.parse(str(info.timestamp));
        const taken = parseTaken(meta(m, 'DateTimeOriginal')) ?? (Number.isNaN(uploaded) ? null : uploaded);
        const ms = taken ?? 0; // undated photos sort last and carry no date
        const date = taken === null ? {} : { date: new Date(taken).toISOString() };
        return [{ ms, photo: { id: String(p.pageid ?? pageUrl), thumbUrl: thumb, imageUrl: thumb, photographer: artist, source: this.name, pageUrl, licenceText: [artist, meta(m, 'LicenseShortName'), 'Wikimedia Commons'].filter(Boolean).join(' · '), ...size, ...date } }];
      });
    return dated.sort((a, c) => c.ms - a.ms).map((d) => d.photo); // newest first (stable: search relevance breaks ties)
  }
}
