// Numbered forward-only migration (ADR 0007): where the displayed type code came from (airspace-t4x9k).
// 'flight' = the flight source's own type, 'override' = own correction table, 'hexdb' = live hexdb cross-check.
// Only this label is stored: type_code stays the flight source's value and no hexdb value is ever persisted (ADR 0016 amendment).
export default `
ALTER TABLE sightings ADD COLUMN type_source TEXT NOT NULL DEFAULT 'flight';
`;
