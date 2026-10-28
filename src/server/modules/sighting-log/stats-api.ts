// Read-only HTTP endpoints GET /api/stats/routes and /api/stats/liveries (LAN-only, ADR 0008); evaluation stays in route-stats / livery-stats.
import type http from 'node:http';
import { formatLiveryStats, liveryStats } from './livery-stats';
import { formatRouteStats, routeStats } from './route-stats';
import { inspectStatsDb, parseStatsParams, type PrepDb } from './stats-common';

/** Returns true when the request was a stats request and has been answered. */
export function handleStatsRequest(db: PrepDb, nowMs: number, req: http.IncomingMessage, res: http.ServerResponse, url: URL): boolean {
  if (req.method !== 'GET' || (url.pathname !== '/api/stats/routes' && url.pathname !== '/api/stats/liveries')) return false;
  const reply = (status: number, type: string, body: string): true => { res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' }).end(body); return true; };
  const params = parseStatsParams({ days: url.searchParams.get('days') ?? undefined, standort: url.searchParams.get('standort') });
  if (!params.ok) return reply(400, 'application/json', JSON.stringify({ error: params.error }));
  const prep = inspectStatsDb(db);
  if (!prep.ok) return reply(500, 'application/json', JSON.stringify({ error: prep.error }));
  const opts = { days: params.days, nowMs, standort: params.standort, hasPoints: prep.hasPoints };
  const text = url.searchParams.get('format') === 'text';
  if (url.pathname === '/api/stats/routes') {
    const s = routeStats(prep.routeDb, opts);
    return text ? reply(200, 'text/plain', formatRouteStats(s)) : reply(200, 'application/json', JSON.stringify(s));
  }
  const s = liveryStats(db, opts);
  return text ? reply(200, 'text/plain', formatLiveryStats(s)) : reply(200, 'application/json', JSON.stringify(s));
}
