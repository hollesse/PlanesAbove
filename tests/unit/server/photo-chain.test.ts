// @vitest-environment node
// PhotoSourceChain (merge, dedup, maxPhotos, partial availability, backoff) and PhotoService (memory cache, TTL), ADR 0029.
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { silentLogger } from '../../../src/server/logger';
import { PhotoService } from '../../../src/server/modules/airspace/photo-service';
import type { Photo, PhotoLookup, PhotoQuery, PhotoSource } from '../../../src/server/modules/airspace/photo-source';
import { PHOTO_BREAKER_MS, PHOTO_BREAKER_THRESHOLD, PhotoSourceChain } from '../../../src/server/modules/airspace/photo-source-chain';

const photo = (source: string, id: string, imageUrl = `https://${source}/${id}.jpg`): Photo => ({ id, source, thumbUrl: imageUrl, imageUrl, photographer: 'P', pageUrl: `https://${source}/p/${id}`, licenceText: `© P · ${source}` });
const src = (name: string, answers: PhotoLookup[] | (() => PhotoLookup)): PhotoSource & { calls: number } => {
  const s = { name, calls: 0, async lookup(_q: PhotoQuery) { s.calls++; return typeof answers === 'function' ? answers() : answers[Math.min(s.calls - 1, answers.length - 1)]; } };
  return s;
};
const DOWN: PhotoLookup = { unavailable: true, errorClass: 'timeout' };
const Q = { icao24: '3c6444', registration: 'D-AIXA' };
const mk = (sources: PhotoSource[], maxPhotos = 6, backoffMs = 300_000) => { const clock = new FakeClock(0); return { clock, chain: new PhotoSourceChain(sources, { clock, log: silentLogger, maxPhotos, backoffMs }) }; };

describe('PhotoSourceChain', () => {
  it('merges in chain order: the first source (Planespotters) comes first', async () => {
    const { chain } = mk([src('planespotters', [{ photos: [photo('planespotters', 'a')] }]), src('commons', [{ photos: [photo('commons', 'b')] }]), src('airport-data', [{ photos: [photo('airport-data', 'c')] }])]);
    const r = await chain.lookup(Q);
    expect(r.status).toBe('ok');
    expect(r.photos.map((p) => p.source)).toEqual(['planespotters', 'commons', 'airport-data']);
  });
  it('dedups per source + id and per source + imageUrl', async () => {
    const { chain } = mk([src('commons', [{ photos: [photo('commons', '1'), photo('commons', '1'), photo('commons', '2', 'https://commons/1.jpg'), photo('commons', '3')] }]), src('airport-data', [{ photos: [photo('airport-data', '1')] }])]);
    expect((await chain.lookup(Q)).photos.map((p) => `${p.source}:${p.id}`)).toEqual(['commons:1', 'commons:3', 'airport-data:1']);
  });
  it('caps at maxPhotos and spares the remaining sources once it is reached', async () => {
    const a = src('planespotters', [{ photos: [photo('planespotters', '1'), photo('planespotters', '2')] }]);
    const b = src('commons', [{ photos: [photo('commons', '1')] }]);
    const { chain } = mk([a, b], 2);
    expect((await chain.lookup(Q)).photos).toHaveLength(2);
    expect(b.calls).toBe(0);
    const c = mk([src('x', [{ photos: [1, 2, 3, 4].map((i) => photo('x', String(i))) }])], 3).chain;
    expect((await c.lookup(Q)).photos).toHaveLength(3);
  });
  it('Kein Foto: every source answered empty (also with no sources at all)', async () => {
    expect(await mk([src('a', [{ photos: [] }]), src('b', [{ photos: [] }])]).chain.lookup(Q)).toEqual({ photos: [], status: 'none', partial: false });
    expect((await mk([]).chain.lookup(Q)).status).toBe('none');
  });
  it('nicht verfügbar: every source is down, or one is down and the rest are empty (the down one might have photos)', async () => {
    expect(await mk([src('a', [DOWN]), src('b', [DOWN])]).chain.lookup(Q)).toEqual({ photos: [], status: 'unavailable', partial: true });
    expect((await mk([src('a', [DOWN]), src('b', [{ photos: [] }])]).chain.lookup(Q)).status).toBe('unavailable');
  });
  it('partial availability: photos of the healthy sources are returned, flagged partial', async () => {
    const r = await mk([src('a', [DOWN]), src('b', [{ photos: [photo('b', '1')] }])]).chain.lookup(Q);
    expect(r).toMatchObject({ status: 'ok', partial: true, photos: [{ id: '1' }] });
  });
  it('429: the source is skipped for Retry-After (else backoffMs), /healthz state backoff, then asked again', async () => {
    const a = src('a', [{ unavailable: true, errorClass: 'http-429', retryAfterMs: 120_000 }, { photos: [photo('a', '1')] }]);
    const { chain, clock } = mk([a]);
    await chain.lookup(Q);
    expect(chain.status().sources[0]).toMatchObject({ name: 'a', state: 'backoff', until: 120_000, consecutiveFailures: 1, lastErrorClass: 'http-429' });
    expect((await chain.lookup(Q)).status).toBe('unavailable');
    expect(a.calls).toBe(1);
    await clock.advance(120_001);
    expect((await chain.lookup(Q)).status).toBe('ok');
    expect(chain.status().sources[0]).toMatchObject({ state: 'ok', until: null, consecutiveFailures: 0, lastErrorClass: null });
    const b = src('b', [{ unavailable: true, errorClass: 'http-429' }]);
    const m = mk([b], 6, 300_000);
    await m.chain.lookup(Q);
    expect(m.chain.status().sources[0].until).toBe(300_000);
  });
  it('403 is reported as blocked', async () => {
    const m = mk([src('a', [{ unavailable: true, errorClass: 'http-403' }])]);
    await m.chain.lookup(Q);
    expect(m.chain.status().sources[0].state).toBe('blocked');
  });
  it('repeated other failures trip a short breaker', async () => {
    const a = src('a', [DOWN]);
    const { chain } = mk([a]);
    for (let i = 0; i < PHOTO_BREAKER_THRESHOLD; i++) await chain.lookup(Q);
    expect(chain.status().sources[0]).toMatchObject({ state: 'backoff', until: PHOTO_BREAKER_MS });
    await chain.lookup(Q);
    expect(a.calls).toBe(PHOTO_BREAKER_THRESHOLD);
  });
});

describe('PhotoService (memory cache)', () => {
  const TTL = 24 * 3_600_000;
  const mkSvc = (s: PhotoSource) => { const clock = new FakeClock(0); return { clock, svc: new PhotoService(new PhotoSourceChain([s], { clock, log: silentLogger, maxPhotos: 6, backoffMs: 1000 }), { clock, ttlMs: TTL }) }; };
  it('caches hits per hex until the TTL, case-insensitively', async () => {
    const s = src('a', [{ photos: [photo('a', '1')] }]);
    const { svc, clock } = mkSvc(s);
    await svc.get(Q); await svc.get({ icao24: '3C6444' });
    expect(s.calls).toBe(1);
    await clock.advance(TTL + 1);
    await svc.get(Q);
    expect(s.calls).toBe(2);
  });
  it('caches Kein Foto too, but never nicht verfügbar or partial answers', async () => {
    const none = src('a', [{ photos: [] }]);
    const n = mkSvc(none);
    await n.svc.get(Q); await n.svc.get(Q);
    expect(none.calls).toBe(1);
    const down = src('a', [DOWN, { photos: [photo('a', '1')] }]);
    const d = mkSvc(down);
    expect((await d.svc.get(Q)).status).toBe('unavailable');
    expect((await d.svc.get(Q)).status).toBe('ok');
    expect(down.calls).toBe(2);
    const clock = new FakeClock(0);
    const a = src('a', [DOWN]); const b = src('b', [{ photos: [photo('b', '1')] }]);
    const partial = new PhotoService(new PhotoSourceChain([a, b], { clock, log: silentLogger, maxPhotos: 6, backoffMs: 1000 }), { clock, ttlMs: TTL });
    expect((await partial.get(Q)).status).toBe('ok');
    await partial.get(Q);
    expect([a.calls, b.calls]).toEqual([2, 2]); // a partial answer is asked again
  });
  it('concurrent requests for one hex share one lookup', async () => {
    const s = src('a', [{ photos: [photo('a', '1')] }]);
    const { svc } = mkSvc(s);
    await Promise.all([svc.get(Q), svc.get(Q), svc.get(Q)]);
    expect(s.calls).toBe(1);
  });
});
