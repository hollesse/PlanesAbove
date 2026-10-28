// Which plane transition to play between two applied states (ADR 0020). Pure: compares icao24 and array position only.
// The wire array is compacted (slots are stable under ADR 0017, array indexes are not), so never assume slot numbers.
// Fallback is always the hard cut, never the "closest" spec (it would animate a plane in the wrong slot).
export type TransitionPick = string | 'cut' | 'same';

export function pickTransition(prev: { icao24: string }[] | undefined, next: { icao24: string }[]): TransitionPick {
  if (!prev) return 'cut';
  const p = prev.map((x) => x.icao24);
  const n = next.map((x) => x.icao24);
  if (p.length === n.length && p.every((id, i) => id === n[i])) return 'same';
  if (p.length === 0) return n.length === 1 ? 'empty-to-one' : n.length === 2 ? 'empty-to-two' : 'cut';
  if (p.length === 1) {
    if (n.length === 0) return 'one-to-empty';
    if (n.length === 1) return 'switch-one';
    if (n.length === 2 && n[0] === p[0]) return 'one-to-two';
    return 'cut';
  }
  if (p.length === 2) {
    if (n.length === 0) return 'two-to-empty';
    if (n.length === 1) return n[0] === p[0] ? 'two-to-one-b' : n[0] === p[1] ? 'two-to-one-a' : 'cut';
    if (n.length === 2) {
      const keep0 = n[0] === p[0]; const keep1 = n[1] === p[1];
      if (keep0 && !keep1 && n[1] !== p[0]) return 'switch-two-2';
      if (!keep0 && keep1 && n[0] !== p[1]) return 'switch-two-1';
      if (!keep0 && !keep1 && !n.includes(p[0]) && !n.includes(p[1])) return 'switch-two-both';
    }
  }
  return 'cut';
}
