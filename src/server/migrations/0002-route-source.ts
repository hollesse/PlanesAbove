// Numbered forward-only migration (ADR 0007, ADR 0016): which source knew a sighting's route.
// adsbdb results are never persisted: for 'adsbdb' rows `route` stays NULL; only VRS text is stored.
export default `
ALTER TABLE sightings ADD COLUMN route_source TEXT;  -- 'vrs' | 'adsbdb' | NULL
UPDATE sightings SET route_source = 'vrs' WHERE route IS NOT NULL;
`;
