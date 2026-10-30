// Numbered forward-only migration (ADR 0007): characters sent to the metered speech adapter per calendar month (sky-scene-t6h2p).
export default `
CREATE TABLE speech_usage (
  month TEXT PRIMARY KEY,
  characters INTEGER NOT NULL
);
`;
