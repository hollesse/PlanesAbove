import { describe, expect, it } from 'vitest';
import { formatEyebrow, formatMeta, formatNumber, formatStats, ROUTE_UNKNOWN } from '../../src/client/ui/domain/flight';
import { SAMPLE_FLIGHTS } from '../../src/client/ui/domain/samples';
import { infoBarState, renderInfoBar } from '../../src/client/ui/organisms/info-bar';
import { renderInfoRow } from '../../src/client/ui/molecules/info-row';
import { renderSceneHeader } from '../../src/client/ui/molecules/scene-header';

describe('Info-Leiste', () => {
  it('formats numbers, eyebrow, meta and stats like the drafts', () => {
    expect(formatNumber(11300)).toBe('11 300');
    expect(formatNumber(870)).toBe('870');
    expect(formatEyebrow(SAMPLE_FLIGHTS.A)).toBe('Lufthansa · LH400 · Airbus A320neo · D-AIBI');
    expect(formatEyebrow(SAMPLE_FLIGHTS.B)).toBe('Privat · Business-Jet · D-CGEO');
    expect(formatMeta(SAMPLE_FLIGHTS.A)).toBe('11 300 m hoch · 870 km/h · im Horizontalflug');
    expect(formatStats(SAMPLE_FLIGHTS.D)).toEqual(['9 400 m · 790 km/h', 'Sinkflug']);
  });

  it('state 1: one plane, route known', () => {
    const el = renderInfoBar({ variant: 'single', flight: SAMPLE_FLIGHTS.A });
    expect(el.dataset.state).toBe('single-known');
    expect(el.querySelector('.pa-route-large')!.textContent).toBe('Frankfurt → New York');
    expect(el.querySelector('.pa-route-unknown')).toBeNull();
    expect(el.querySelector('.pa-meta-small')!.textContent).toContain('im Horizontalflug');
  });

  it('state 2: one plane, route unknown', () => {
    const el = renderInfoBar({ variant: 'single', flight: SAMPLE_FLIGHTS.B });
    expect(el.dataset.state).toBe('single-unknown');
    expect(el.querySelector('.pa-route-unknown')!.textContent).toBe(ROUTE_UNKNOWN);
  });

  it('state 3: two planes, one row each with badges 1 and 2', () => {
    const el = renderInfoBar({ variant: 'double', flights: [SAMPLE_FLIGHTS.A, SAMPLE_FLIGHTS.D] });
    expect(el.dataset.state).toBe('double');
    expect([...el.querySelectorAll('.pa-badge')].map((b) => b.textContent)).toEqual(['1', '2']);
    expect([...el.querySelectorAll('.pa-info-row .pa-route-large')].map((r) => r.textContent)).toEqual(['Frankfurt → New York', 'Köln → Palma']);
  });

  it('state 4: slim "Zuletzt" bar', () => {
    const el = renderInfoBar({ variant: 'recent', text: 'Zuletzt: Lufthansa LH400 · vor 6 Min' });
    expect(el.dataset.state).toBe('recent');
    expect(el.textContent).toBe('Zuletzt: Lufthansa LH400 · vor 6 Min');
  });

  it('derives the state name from props', () => {
    expect(infoBarState({ variant: 'single', flight: SAMPLE_FLIGHTS.A })).toBe('single-known');
    expect(infoBarState({ variant: 'single', flight: SAMPLE_FLIGHTS.B })).toBe('single-unknown');
  });

  it('info row and scene header molecules', () => {
    expect(renderInfoRow({ n: 2, flight: SAMPLE_FLIGHTS.D }).querySelector('.pa-badge')!.textContent).toBe('2');
    const light = renderSceneHeader({ place: 'Kirchstrasse 17', clock: '19:42', ink: 'light' });
    expect(light.textContent).toBe('Der Himmel über Kirchstrasse 17Live · 19:42');
    expect(light.className).toContain('pa-ink-light');
    expect(renderSceneHeader({ place: 'x', clock: '1', ink: 'dark' }).className).toContain('pa-ink-dark');
  });
});
