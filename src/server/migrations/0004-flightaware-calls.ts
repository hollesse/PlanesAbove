// Numbered forward-only migration (ADR 0007, ADR 0018): one row per call to FlightAware AeroAPI - the airspace BC's own call-event log.
// Own bookkeeping only (no FlightAware data, no key): it backs the hard monthly budget. Failed calls are logged too, with cost 0.
export default `
CREATE TABLE flightaware_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,            -- epoch ms of the call
  endpoint TEXT NOT NULL,         -- 'flights' | 'usage'
  status INTEGER,                 -- HTTP status; NULL for timeout/network errors
  result_sets INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0
);
CREATE INDEX flightaware_calls_ts ON flightaware_calls (ts);
`;
