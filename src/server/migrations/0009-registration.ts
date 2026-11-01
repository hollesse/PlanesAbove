// Numbered forward-only migration (ADR 0007, ADR 0033 amendment): the aircraft registration from the flight feed, nullable, no backfill (sighting-log-r3kw8).
export default `
ALTER TABLE sightings ADD COLUMN registration TEXT;
`;
