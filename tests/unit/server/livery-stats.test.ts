// @vitest-environment node
// Lackierungs-Statistik: airlines shown with the default livery, unmapped prefixes, sightings without airline, and the CLI.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../../src/server/db';
import { formatLiveryStats, liveryStats } from '../../../src/server/modules/sighting-log/livery-stats';
import { SightingRepository } from '../../../src/server/modules/sighting-log/repository';

const NOW = Date.parse('2026-10-27T12:00:00Z');
const seed = (opts: { dropUnmapped?: boolean } = {}) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 's.db');
  const db = openDatabase(file);
  const repo = new SightingRepository(db, 1800_000, { lat: 50.05, lon: 8.57, radiusKm: 30, place: 'dem Haus' });
  const b = { typklasse: 'widebody', liveryPresent: false, distanceKm: 1, route: null, slot: 1 };
  const obs = (icao24: string, callsign: string | null, airline: string | null, o: object = {}, at = NOW - 1000) => repo.observe({ ...b, icao24, callsign, airline, ...o } as never, at);
  obs('a1', 'UAE1', 'Emirates', { typklasse: 'double-decker' });
  obs('a2', 'UAE2', 'Emirates', { typklasse: 'double-decker' });
  obs('a3', 'UAE3', 'Emirates');
  obs('s1', 'SXS5', 'SunExpress', { typklasse: 'narrow' });
  obs('p1', 'DLH4', 'Lufthansa', { liveryPresent: true });
  obs('l1', 'DLH5', 'Lufthansa', { typklasse: 'light-aircraft' });
  obs('g1', 'GLD1', 'Glider Co', { typklasse: 'glider' });
  obs('n1', 'DEABC', null, { typklasse: 'narrow' });
  obs('ns', 'UAE9', 'Emirates', { slot: null });
  obs('old', 'UAE8', 'Emirates', {}, NOW - 30 * 86_400_000);
  repo.reportUnmapped('airline', 'EXS'); repo.reportUnmapped('airline', 'EXS'); repo.reportUnmapped('airline', 'KLC'); repo.reportUnmapped('type', 'ZZZZ');
  if (opts.dropUnmapped) db.exec('DROP TABLE unmapped_keys');
  db.pragma('wal_checkpoint(TRUNCATE)');
  return { db, file, repo };
};

describe('liveryStats', () => {
  it('counts default-livery sightings per airline with Typklassen, excluding light-aircraft/glider, no-slot and out-of-window sightings', () => {
    const { db } = seed();
    const s = liveryStats(db, { days: 7, nowMs: NOW });
    expect(s.airlines).toEqual([
      { name: 'Emirates', prefix: 'UAE', count: 3, byTypklasse: { 'double-decker': 2, widebody: 1 } },
      { name: 'SunExpress', prefix: 'SXS', count: 1, byTypklasse: { narrow: 1 } }]);
    expect(s.withoutAirline).toBe(1);
    expect(s.unmappedPrefixes).toEqual([{ prefix: 'EXS', count: 2 }, { prefix: 'KLC', count: 1 }]);
    expect(s.presentShare).toBe(0.167); // 1 of 6
  });
  it('respects the time window', () => {
    const { db } = seed();
    expect(liveryStats(db, { days: 60, nowMs: NOW }).airlines[0]).toMatchObject({ name: 'Emirates', count: 4 });
  });
  it('filters by Standort', () => {
    const { db, file } = seed();
    expect(liveryStats(db, { days: 7, nowMs: NOW, standort: 'unbekannt' }).airlines).toEqual([]);
    expect(liveryStats(db, { days: 7, nowMs: NOW, standort: 'alle' }).airlines).toHaveLength(2);
    expect(liveryStats(db, { days: 7, nowMs: NOW, standort: 1 }).airlines).toHaveLength(2);
    expect(liveryStats(db, { days: 7, nowMs: NOW, standort: 999 }).airlines).toEqual([]);
    expect(liveryStats(db, { days: 7, nowMs: NOW }).standort).toBe(1);
    expect(file).toBeTruthy();
  });
  it('handles an empty database', () => {
    const db = openDatabase(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'e.db'));
    expect(liveryStats(db, { days: 7, nowMs: NOW })).toMatchObject({ airlines: [], unmappedPrefixes: [], withoutAirline: 0, presentShare: 0 });
  });
  it('survives a missing unmapped_keys table', () => {
    const { db } = seed({ dropUnmapped: true });
    expect(liveryStats(db, { days: 7, nowMs: NOW }).unmappedPrefixes).toEqual([]);
  });
  it('formats the four sections', () => {
    const { db } = seed();
    const t = formatLiveryStats(liveryStats(db, { days: 7, nowMs: NOW }));
    expect(t).toContain('Lackierung vorhanden: 17%');
    expect(t).toContain('Emirates UAE 3 (double-decker 2, widebody 1)');
    expect(t).toContain('EXS 2');
    expect(t).toContain('Sichtungen ohne Airline (Standard-Lackierung): 1');
  });
});

describe('stats:liveries CLI', () => {
  const cli = (...args: string[]) => spawnSync(process.execPath, [path.resolve(import.meta.dirname, '../../../scripts/stats-liveries.mjs'), ...args], { encoding: 'utf8' });
  it('--json has the stable keys; text works; missing --db fails; old DB without unmapped_keys works', () => {
    const { file } = seed();
    const r = cli('--db', file, '--days', '36500', '--json');
    expect(r.status).toBe(0);
    expect(Object.keys(JSON.parse(r.stdout))).toEqual(['standort', 'standorte', 'airlines', 'unmappedPrefixes', 'withoutAirline', 'presentShare']);
    expect(cli('--db', file, '--days', '36500').stdout).toContain('Emirates UAE');
    expect(cli().status).not.toBe(0);
    const old = seed({ dropUnmapped: true });
    expect(cli('--db', old.file, '--days', '36500').status).toBe(0);
  });
});
