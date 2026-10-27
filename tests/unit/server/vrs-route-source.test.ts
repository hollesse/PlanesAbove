// @vitest-environment node
// Contract tests for the offline VRS standing-data route source against a recorded fixture subset (tests/fixtures/vrs, 2026-10-27).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/server/clock';
import { createLogger } from '../../../src/server/logger';
import type { Fetch } from '../../../src/server/modules/airspace/adapters/http';
import { parseCsv } from '../../../src/server/modules/airspace/adapters/vrs-csv';
import { VrsRouteSource, loadIndex } from '../../../src/server/modules/airspace/adapters/vrs-route-source';
import { snapshotPaths, tarFiles } from '../../../src/server/modules/airspace/adapters/vrs-snapshot';
import { RouteService } from '../../../src/server/modules/airspace/route-service';

const FIXTURE = path.resolve(import.meta.dirname, '../../fixtures/vrs');
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-vrs-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function walk(d: string, base = d): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]));
}
function tarHeader(name: string, size: number): Buffer {
  const h = Buffer.alloc(512);
  h.write(name, 0); h.write('0000644\0', 100); h.write(size.toString(8).padStart(11, '0') + '\0', 124); h.write('0', 156); h.write('ustar\0', 257);
  return h;
}
/** tar.gz shaped like the GitHub tarball: one top-level dir, plus files we must ignore. */
function makeTarball(files: Record<string, Buffer | string>): Buffer {
  const parts: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    parts.push(tarHeader(name, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(parts));
}
const fixtureTarball = (): Buffer => makeTarball({
  'standing-data-main/README.md': 'ignored',
  'standing-data-main/other/x.csv': 'ignored',
  ...Object.fromEntries(walk(FIXTURE).filter((f) => f.endsWith('.csv')).map((f) => [`standing-data-main/${f}`, fs.readFileSync(path.join(FIXTURE, f))])),
});
const okFetch = (tgz: Buffer): Fetch => async () => ({ ok: true, status: 200, text: async () => '', arrayBuffer: async () => tgz.buffer.slice(tgz.byteOffset, tgz.byteOffset + tgz.length) as ArrayBuffer });
const failFetch: Fetch = async () => { throw Object.assign(new Error('offline'), { name: 'TypeError' }); };
const copySnapshot = (): void => fs.cpSync(FIXTURE, snapshotPaths(dir).root, { recursive: true });

function mk(f: Fetch, clock = new FakeClock(Date.parse('2026-10-27T10:00:00Z'))) {
  const lines: Record<string, unknown>[] = [];
  const log = createLogger(clock, 'debug', (l) => lines.push(JSON.parse(l)));
  const src = new VrsRouteSource({ fetch: f, dataDir: dir, userAgent: 'test', timeoutMs: 1000, clock, log, refreshMs: 24 * 3_600_000 });
  return { src, lines, clock, warns: () => lines.filter((l) => l.level === 'warn') };
}

describe('CSV parsing', () => {
  it('strips the UTF-8 BOM, handles quotes, skips blank lines', () => {
    expect(parseCsv('﻿a,b\n\n"x, y",z\n')).toEqual([['a', 'b'], ['x, y', 'z']]);
  });
});

describe('index from the recorded fixture', () => {
  const idx = (): NonNullable<ReturnType<typeof loadIndex>> => loadIndex(FIXTURE)!;
  it('merges -all and split files (RYR-1, RYR-6) and skips broken rows', () => {
    expect(idx().routes.get('DLH400')).toEqual(['EDDF', 'KJFK']);
    expect(idx().routes.get('RYR6ZM')).toEqual(['LEAL', 'EGBB']);
    expect(idx().routes.has('RYR1AB')).toBe(true);
    expect(idx().routes.has('DLH8BROKEN')).toBe(false);
    expect(idx().routes.has('EWG9UX')).toBe(false);
  });
  it('resolves airports to city names and coordinates (quoted fields intact)', () => {
    expect(idx().airports.get('KJFK')).toMatchObject({ city: 'New York, NY', lat: 40.639801, lon: -73.7789 });
  });
  it('returns null when there is no snapshot directory', () => { expect(loadIndex(path.join(dir, 'nope'))).toBeNull(); });
});

describe('VrsRouteSource lookups', () => {
  it('known callsigns resolve to routes, multi-leg keeps all legs, unknown ones are null', async () => {
    copySnapshot();
    const { src } = mk(failFetch);
    src.start();
    expect(await src.lookup('DLH400')).toMatchObject({ from: { city: 'Frankfurt-am-Main' }, to: { city: 'New York, NY' } });
    expect((await src.lookup('dlh9multi'))?.legs?.map((l) => l.city)).toEqual(['Frankfurt-am-Main', 'Birmingham', 'New York, NY']);
    expect(await src.lookup('EWG9UX')).toBeNull();
    expect(await src.lookup('DLH7UNKNOWNAP')).toBeNull(); // unknown ICAO -> Route unbekannt, no error
  });
  it('an implausible route is stated as Route unbekannt (ADR 0005)', async () => {
    copySnapshot();
    const { src, clock } = mk(failFetch);
    src.start();
    const svc = new RouteService(src, clock, { ttlMs: 1000, negativeTtlMs: 1000 });
    expect(await svc.routeFor('RYR6ZM', { lat: 52.3, lon: -1.8 })).toBe('Alicante → Birmingham');
    clock.advance(10_000);
    expect(await svc.routeFor('RYR6ZM', { lat: -33.9, lon: 151.2 })).toBeNull();
  });
});

describe('snapshot lifecycle', () => {
  it('starts offline with an existing snapshot: builds the index, warns about the failed refresh', async () => {
    copySnapshot();
    const { src, warns } = mk(failFetch);
    src.start();
    await src.refresh();
    expect(await src.lookup('DLH400')).not.toBeNull();
    expect(warns().some((w) => /refresh failed/.test(String(w.msg)))).toBe(true);
  });
  it('starts with no snapshot and no network: warns, every lookup is Route unbekannt', async () => {
    const { src, warns } = mk(failFetch);
    src.start();
    await src.refresh();
    expect(await src.lookup('DLH400')).toBeNull();
    expect(warns().some((w) => /snapshot missing/.test(String(w.msg)))).toBe(true);
  });
  it('downloads the tarball into dataDir/vrs-standing-data (routes/ and airports/ only), swapping atomically', async () => {
    const { src } = mk(okFetch(fixtureTarball()));
    expect(await src.refresh()).toBe(true);
    const root = snapshotPaths(dir).root;
    expect(fs.existsSync(path.join(root, 'routes/schema-01/D/DLH-all.csv'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'airports/schema-01/K/KJ.csv'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'README.md'))).toBe(false);
    expect(fs.existsSync(snapshotPaths(dir).tmp)).toBe(false);
    expect(await src.lookup('RYR6ZM')).not.toBeNull();
  });
  it('an aborted download leaves the old snapshot unchanged and readable', async () => {
    copySnapshot();
    const before = walk(snapshotPaths(dir).root).sort();
    const bad = makeTarball({ 'standing-data-main/routes/schema-01/A/AAA-all.csv': 'x' }); // no airports -> invalid, aborts before the swap
    for (const f of [failFetch, okFetch(bad), okFetch(Buffer.from('not gzip'))]) {
      const { src, warns } = mk(f);
      src.start();
      expect(await src.refresh()).toBe(false);
      expect(warns().length).toBeGreaterThan(0);
      expect(walk(snapshotPaths(dir).root).filter((x) => x !== 'fetched-at.txt').sort()).toEqual(before);
      expect(fs.existsSync(snapshotPaths(dir).tmp)).toBe(false);
      expect(await src.lookup('DLH400')).not.toBeNull(); // previous index kept
    }
  });
  it('a failed refresh keeps the previous index and logs warn', async () => {
    copySnapshot();
    let fail = false;
    const tgz = fixtureTarball();
    const f: Fetch = (u, i) => (fail ? failFetch(u, i) : okFetch(tgz)(u, i));
    const { src, warns } = mk(f);
    src.start();
    await src.refresh();
    const n = warns().length;
    fail = true;
    expect(await src.refresh()).toBe(false);
    expect(warns().length).toBe(n + 1);
    expect(await src.lookup('DLH400')).not.toBeNull();
  });
  it('triggers a refresh after the configured interval (FakeClock)', async () => {
    copySnapshot();
    fs.writeFileSync(path.join(snapshotPaths(dir).root, 'fetched-at.txt'), String(Date.parse('2026-10-27T10:00:00Z')));
    let calls = 0;
    const tgz = fixtureTarball();
    const f: Fetch = (u, i) => { calls++; return okFetch(tgz)(u, i); };
    const { src, clock } = mk(f);
    const cancel = src.start();
    expect(calls).toBe(0); // fresh snapshot: no startup download
    await clock.advance(23 * 3_600_000);
    expect(calls).toBe(0);
    await clock.advance(2 * 3_600_000);
    expect(calls).toBe(1); // only the clock timer drove it
    cancel();
  });
  it('tarFiles yields regular files only', () => {
    const names = [...tarFiles(zlib.gunzipSync(makeTarball({ 'a/b.csv': 'hi', 'c.txt': 'yo' })))].map((f) => f.name);
    expect(names).toEqual(['a/b.csv', 'c.txt']);
  });
});
