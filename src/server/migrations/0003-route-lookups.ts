// Numbered forward-only migration (ADR 0007, ADR 0016): per sighting and per source, what the route lookup found.
// Findings only (outcome, conflict, chosen) - never airport codes or route text of adsbdb/hexdb. `source` is free text: new sources need no schema change.
export default `
CREATE TABLE route_lookups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sighting_id INTEGER NOT NULL REFERENCES sightings(id),
  source TEXT NOT NULL,                 -- 'vrs' | 'adsbdb' | 'hexdb' | ...
  outcome TEXT NOT NULL CHECK (outcome IN ('hit', 'unknown', 'unavailable', 'rejected')),
  conflict INTEGER NOT NULL DEFAULT 0,  -- 1 when two sources returned plausible but different routes in this lookup
  chosen INTEGER NOT NULL DEFAULT 0,    -- 1 for the source whose route was taken
  looked_up_at TEXT NOT NULL
);
CREATE INDEX route_lookups_sighting ON route_lookups (sighting_id);
CREATE INDEX route_lookups_time ON route_lookups (looked_up_at);
`;
