// Numbered forward-only migration (ADR 0007, ADR 0019): one row per request to a budgeted flight source (adsb.lol, airspace-b9r4w).
// Own bookkeeping only; the daily counter is derived from these events (UTC day), so it survives restarts.
export default `
CREATE TABLE flight_source_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- e.g. 'adsb-lol'
  ts INTEGER NOT NULL,            -- epoch ms of the request
  status INTEGER                  -- HTTP status; NULL for timeout/network errors
);
CREATE INDEX flight_source_calls_source_ts ON flight_source_calls (source, ts);
`;
