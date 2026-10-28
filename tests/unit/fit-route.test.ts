import { describe, expect, it } from 'vitest';
import { breakBeforeArrow, nameTier } from '../../src/client/ui/organisms/fit-route';

describe('Lange Route (Variante D)', () => {
  it('picks the name tier by the longest label', () => {
    expect(nameTier('Köln (CGN) → Palma (PMI)')).toBe(1);
    expect(nameTier('Frankfurt (FRA) → New York (JFK)')).toBe(1);
    expect(nameTier('Frankfurt (FRA) → Johannesburg (JNB)')).toBe(0.8);
    expect(nameTier('Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)')).toBe(0.65);
  });

  it('breaks only before the arrow, never inside a name', () => {
    const el = document.createElement('div');
    el.textContent = 'Santiago de Compostela (SCQ) → Jerez de la Frontera (XRY)';
    expect(breakBeforeArrow(el)).toBe(true);
    expect([...el.querySelectorAll('.pa-route-line')].map((l) => l.textContent)).toEqual(['Santiago de Compostela (SCQ)', '→ Jerez de la Frontera (XRY)']);
    const none = document.createElement('div');
    none.textContent = 'Route unbekannt';
    expect(breakBeforeArrow(none)).toBe(false);
  });
});
