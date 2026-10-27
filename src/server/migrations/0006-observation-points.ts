// Numbered forward-only migration (ADR 0007): the observation point a sighting was made from (sighting-log-k4m7q).
// Purely additive: old sightings keep observation_point_id NULL ("Standort unbekannt"), no backfill.
export default `
CREATE TABLE observation_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,              -- rounded to 4 decimals
  lon REAL NOT NULL,              -- rounded to 4 decimals
  radius_km REAL NOT NULL,
  place TEXT NOT NULL,            -- label only, not part of the identity
  first_used_at TEXT NOT NULL,    -- UTC ISO-8601
  UNIQUE (lat, lon, radius_km)
);
ALTER TABLE sightings ADD COLUMN observation_point_id INTEGER REFERENCES observation_points(id);
CREATE INDEX sightings_observation_point ON sightings (observation_point_id, icao24);
`;
