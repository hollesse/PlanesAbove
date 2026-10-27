// Numbered forward-only migration (ADR 0007). SQL lives in a TS string so Vitest, esbuild and Node load it identically.
export default `
-- Sichtungsprotokoll (owned by sighting-log): one row per flight per visit.
CREATE TABLE sightings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icao24 TEXT NOT NULL,
  callsign TEXT,
  airline TEXT,
  type_code TEXT,
  typklasse TEXT NOT NULL,
  livery_present INTEGER NOT NULL,
  route TEXT,
  slot INTEGER,            -- Auswahl slot (1 or 2) when the flight was one of the two shown, else NULL
  closest_distance_km REAL NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_seen_ms INTEGER NOT NULL
);
CREATE INDEX sightings_icao24_last_seen ON sightings (icao24, last_seen_ms);

-- Type codes / airline prefixes without a table entry (ADR 0010 #5).
CREATE TABLE unmapped_keys (
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (kind, key)
);
`;
