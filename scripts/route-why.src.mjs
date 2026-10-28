// Diagnose "Route unbekannt" (source; run via scripts/route-why.mjs, which bundles this with esbuild): node scripts/route-why.mjs <CALLSIGN> [--db data/planesabove.db] [--config config.yaml] [--lat .. --lon .. --alt-m .. --track .. --rate-ms ..] [--json]
// Reads SQLite read-only, asks hexdb/adsbdb/VRS once (nothing is persisted, ADR 0005/0016), fetches the live position from adsb.fi,
// and replays every plausibility check with numbers. The final verdict comes from isPlausibleRoute itself (the production rule).
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';
import { loadConfig } from '../src/server/config.ts';
import { SystemClock } from '../src/server/clock.ts';
import { silentLogger } from '../src/server/logger.ts';
import { HexdbRouteSource } from '../src/server/modules/airspace/adapters/hexdb-route-source.ts';
import { AdsbdbRouteSource } from '../src/server/modules/airspace/adapters/adsbdb-route-source.ts';
import { loadIndex } from '../src/server/modules/airspace/adapters/vrs-route-source.ts';
import { snapshotPaths } from '../src/server/modules/airspace/adapters/vrs-snapshot.ts';
import { DEFAULT_PLAUSIBILITY, formatRoute, isLegTail, isPlausibleRoute } from '../src/server/modules/airspace/route-service.ts';
import { angleDiffDeg, bearingDeg, crossTrackKm } from '../src/server/modules/airspace/geo.ts';
import { distanceKm } from '../src/server/modules/airspace/selection.ts';
import { closedAirspaceHit } from '../src/server/modules/airspace/closed-airspace.ts';

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  db: { type: 'string', default: 'data/planesabove.db' }, config: { type: 'string', default: 'config.yaml' }, json: { type: 'boolean', default: false },
  lat: { type: 'string' }, lon: { type: 'string' }, 'alt-m': { type: 'string' }, track: { type: 'string' }, 'rate-ms': { type: 'string' },
} });
const fail = (m) => { console.error(`route-why: ${m}`); process.exit(1); };
const callsign = (positionals[0] ?? '').trim().toUpperCase();
if (!callsign) fail('usage: node scripts/route-why.mjs <CALLSIGN> [--db file] [--config file] [--lat --lon --alt-m --track --rate-ms] [--json]');
const num = (v) => (v === undefined ? undefined : Number(v));

// 1. Config (home, radius, plausibility thresholds) — falls back to defaults without a config file.
let cfg = null;
try { if (fs.existsSync(values.config)) cfg = loadConfig(values.config); } catch (e) { console.error(`route-why: config ignored (${e.message})`); }
const home = cfg?.location ?? { lat: 50.45, lon: 8.09 };
const plaus = { ...DEFAULT_PLAUSIBILITY, ...(cfg?.sources?.route?.plausibility ?? {}) };
const order = cfg?.sources?.route?.order ?? ['hexdb', 'adsbdb', 'vrs'];
const dataDir = cfg?.dataDir ?? './data';
const userAgent = cfg?.sources?.userAgent ?? 'PlanesAbove/0.1 (route-why diagnosis)';
const out = { callsign, home, order, plausibility: plaus, sightings: [], live: null, sources: {}, verdicts: [] };

// 2. SQLite: last sightings + recorded lookup findings (findings only — never route text of hexdb/adsbdb).
if (fs.existsSync(values.db)) {
  const db = new Database(values.db, { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare('SELECT id, icao24, airline, type_code, typklasse, route, route_source, closest_distance_km, first_seen_at, last_seen_at FROM sightings WHERE callsign = ? ORDER BY last_seen_ms DESC LIMIT 5').all(callsign);
    const lk = db.prepare('SELECT source, outcome, conflict, chosen, looked_up_at FROM route_lookups WHERE sighting_id = ? ORDER BY looked_up_at, id');
    out.sightings = rows.map((r) => ({ ...r, lookups: lk.all(r.id) }));
  } finally { db.close(); }
} else out.dbMissing = values.db;

// 3. Live position (adsb.fi, one request, 250 km around home) unless given on the command line.
const fetchJson = async (url) => { const r = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
let obs = null;
if (values.lat && values.lon) obs = { lat: Number(values.lat), lon: Number(values.lon), altitudeM: num(values['alt-m']), trackDeg: num(values.track), verticalRateMs: num(values['rate-ms']), from: 'cli' };
else {
  try {
    const j = await fetchJson(`https://opendata.adsb.fi/api/v3/lat/${home.lat}/lon/${home.lon}/dist/135`);
    const a = (j.ac ?? []).find((x) => (x.flight ?? '').trim().toUpperCase() === callsign);
    if (a && typeof a.lat === 'number') {
      const altFt = typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_geom;
      const rate = a.geom_rate ?? a.baro_rate;
      obs = { lat: a.lat, lon: a.lon, altitudeM: altFt === undefined ? undefined : altFt * 0.3048, trackDeg: a.track, verticalRateMs: rate === undefined ? undefined : rate * 0.3048 / 60, hex: a.hex, reg: a.r, type: a.t, from: 'adsb.fi' };
    } else out.liveNote = 'adsb.fi: callsign not within 250 km of home right now (use --lat/--lon/--alt-m/--track/--rate-ms to replay a logged position)';
  } catch (e) { out.liveNote = `adsb.fi unavailable: ${e.message}`; }
}
if (obs) { out.live = { ...obs, distanceFromHomeKm: distanceKm(home, obs) }; }
if (values['alt-m'] && obs) obs.altitudeM = Number(values['alt-m']);
if (values.track && obs) obs.trackDeg = Number(values.track);
if (values['rate-ms'] && obs) obs.verticalRateMs = Number(values['rate-ms']);

// 4. Ask the free sources once (never persisted).
const clock = new SystemClock();
const sources = {
  hexdb: new HexdbRouteSource({ fetch, userAgent, timeoutMs: 8000, backoffMs: 0, clock, log: silentLogger }),
  adsbdb: new AdsbdbRouteSource({ fetch, userAgent, timeoutMs: 8000, backoffMs: 0, clock, log: silentLogger }),
  vrs: { lookup: async (cs) => { const idx = loadIndex(snapshotPaths(dataDir).root); if (!idx) throw new Error('no VRS snapshot'); const codes = idx.routes.get(cs); if (!codes) return null; const legs = codes.map((c) => idx.airports.get(c)); if (legs.some((l) => !l)) return null; return { from: legs[0], to: legs.at(-1), legs, source: 'vrs' }; } },
};
const routesByName = {};
const position = obs ? { lat: obs.lat, lon: obs.lon } : home;
for (const name of order) {
  const src = sources[name];
  if (!src) { out.sources[name] = { outcome: 'not supported by route-why (flightaware is never called here)' }; continue; }
  try {
    const r = await src.lookup(callsign, position);
    out.sources[name] = r ? { outcome: 'hit', route: formatRoute(r), legs: r.legs.map((l) => ({ city: l.city, lat: l.lat, lon: l.lon })) } : { outcome: 'unknown' };
    if (r) routesByName[name] = r;
    if (r) out.verdicts.push({ source: name, route: formatRoute(r), plausible: isPlausibleRoute(r, position, obs ?? {}, plaus), legs: r.legs.slice(1).map((to, i) => legBreakdown(r.legs[i], to)) });
  } catch (e) { out.sources[name] = { outcome: 'unavailable', detail: e.message }; }
}

// Merge rule hexdb/VRS (airspace-w1q3x): a VRS multi-leg route whose tail is the hexdb route wins.
const hx = out.verdicts.find((v) => v.source === 'hexdb'), vr = out.verdicts.find((v) => v.source === 'vrs');
if (hx?.plausible && vr?.plausible && isLegTail(routesByName.hexdb, routesByName.vrs)) out.merge = 'VRS-Mehrleg-Route gewählt, hexdb-Leg ist Endstück';
// 5. Replay each check of legPlausible with numbers (mirrors route-service.ts; the verdict above is the authoritative one).
function legBreakdown(a, b) {
  const len = distanceKm(a, b);
  const xt = crossTrackKm(a, b, position);
  const corridorKm = Math.min(plaus.corridorBaseKm + (plaus.corridorPercent / 100) * len, plaus.corridorMaxKm);
  const detour = closedAirspaceHit(a, b, plaus.closedAirspaces ?? [], plaus.closedAirspaceSampleKm ?? 100);
  const headingLimit = detour ? plaus.detourHeadingDeviationDeg : plaus.maxHeadingDeviationDeg;
  const dOrigin = distanceKm(a, position), dDest = distanceKm(position, b);
  const alt = obs?.altitudeM, vr = obs?.verticalRateMs, track = obs?.trackDeg;
  const up = plaus.climbMetersPerKm * dOrigin + plaus.profileSlackM, down = plaus.descentMetersPerKm * dDest + plaus.profileSlackM;
  const checks = {
    detour: detour ? { closedAirspace: detour, effect: 'corridor skipped, heading limit ' + headingLimit + '°' } : { none: true },
    corridor: detour ? { skipped: 'detoured leg (' + detour + ')', crossTrackKm: r1(xt), limitKm: r1(corridorKm) } : { crossTrackKm: r1(xt), limitKm: r1(corridorKm), routeLengthKm: r1(len), ok: xt <= corridorKm },
    altitudeProfile: alt === undefined ? { skipped: 'no altitude' } : { altitudeM: r1(alt), climbEnvelopeM: r1(up), descentEnvelopeM: r1(down), distanceFromOriginKm: r1(dOrigin), distanceToDestKm: r1(dDest), ok: !((up < 12500 && alt > up) || (down < 12500 && alt > down)) },
    phase: vr === undefined || alt === undefined ? { skipped: 'no vertical rate/altitude' } : { verticalRateMs: r1(vr), altitudeM: r1(alt), applies: alt < plaus.phaseMaxAltitudeM && Math.abs(vr) > plaus.phaseMinRateMs, ok: !(alt < plaus.phaseMaxAltitudeM && ((vr > plaus.phaseMinRateMs && dOrigin > plaus.maxClimbDistanceKm) || (vr < -plaus.phaseMinRateMs && dDest > plaus.maxClimbDistanceKm))) },
    heading: track === undefined || alt === undefined ? { skipped: 'no track/altitude' } : (alt <= plaus.minHeadingCheckAltitudeM || dOrigin <= plaus.originZoneKm || dDest <= plaus.destinationZoneKm) ? { skipped: 'inside airport zone or below minHeadingCheckAltitudeM' } : { trackDeg: r1(track), bearingToDestDeg: r1(bearingDeg(position, b)), deviationDeg: r1(angleDiffDeg(bearingDeg(position, b), track)), limitDeg: headingLimit, ok: angleDiffDeg(bearingDeg(position, b), track) <= headingLimit },
  };
  return { leg: `${a.city} → ${b.city}`, checks };
}
function r1(x) { return Math.round(x * 10) / 10; }

// 6. Report.
if (values.json) { process.stdout.write(JSON.stringify(out, null, 2) + '\n'); process.exit(0); }
const L = [];
L.push(`route-why ${callsign} — home ${home.lat}/${home.lon}, order [${order.join(', ')}]`);
L.push(obs ? `Position (${obs.from}): ${r1(obs.lat)}/${r1(obs.lon)}, ${obs.altitudeM === undefined ? '? m' : r1(obs.altitudeM) + ' m'}, track ${obs.trackDeg ?? '?'}°, rate ${obs.verticalRateMs === undefined ? '?' : r1(obs.verticalRateMs)} m/s${obs.reg ? `, ${obs.reg} ${obs.type ?? ''}` : ''}, ${r1(out.live.distanceFromHomeKm)} km from home` : `Position: none (${out.liveNote ?? 'no live data'}) — geometry uses home as position`);
L.push('');
L.push('SQLite findings (newest first):');
if (out.dbMissing) L.push(`  (no database at ${out.dbMissing})`);
else if (!out.sightings.length) L.push('  no sighting with this callsign');
for (const s of out.sightings) L.push(`  #${s.id} ${s.first_seen_at} ${s.icao24} ${s.type_code ?? ''} ${s.typklasse} route=${s.route ?? '-'} (${s.route_source ?? '-'}) lookups: ${s.lookups.map((l) => `${l.source}=${l.outcome}${l.chosen ? '*' : ''}${l.conflict ? '!' : ''}`).join(' ') || 'none'}`);
L.push('');
L.push('Sources now:');
for (const [n, s] of Object.entries(out.sources)) L.push(`  ${n}: ${s.outcome}${s.route ? ' ' + s.route : ''}${s.detail ? ' (' + s.detail + ')' : ''}`);
L.push('');
if (out.merge) L.push(`Zusammenführung: ${out.merge} (${hx.route} ⊂ ${vr.route})`);
if (!out.verdicts.length) L.push('No source knows this callsign → "Route unbekannt" is correct for the free sources. Alphanumeric callsigns (THY8EF, EXS75F) often only resolve via FlightAware (never called here).');
for (const v of out.verdicts) {
  L.push(`Plausibility ${v.source} ${v.route}: ${v.plausible ? 'PLAUSIBLE' : 'REJECTED'} (isPlausibleRoute)`);
  for (const leg of v.legs) {
    L.push(`  leg ${leg.leg}`);
    for (const [k, c] of Object.entries(leg.checks)) L.push(`    ${k}: ${c.skipped ? 'skipped (' + c.skipped + ')' : !('ok' in c) ? JSON.stringify(c) : (c.ok ? 'ok ' : 'FAIL ') + JSON.stringify(c)}`);
  }
}
process.stdout.write(L.join('\n') + '\n');
