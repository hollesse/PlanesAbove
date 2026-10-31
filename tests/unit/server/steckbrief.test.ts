// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { numberToGerman, spokenCallsign, spokenType, composeSpeechParts, roundAltitudeM } from '../../../src/server/modules/sky-scene/steckbrief';

describe('numberToGerman', () => {
  it.each([[0, 'null'], [1, 'eins'], [7, 'sieben'], [11, 'elf'], [16, 'sechzehn'], [17, 'siebzehn'], [21, 'einundzwanzig'], [30, 'dreißig'], [100, 'einhundert'], [101, 'einhunderteins'], [320, 'dreihundertzwanzig'], [737, 'siebenhundertsiebenunddreißig'], [1000, 'eintausend'], [2000, 'zweitausend'], [9400, 'neuntausendvierhundert'], [11300, 'elftausenddreihundert'], [12000, 'zwölftausend']])('%i -> %s', (n, w) => {
    expect(numberToGerman(n)).toBe(w);
  });
});

describe('pronunciation dictionary', () => {
  it('spells callsigns letter by letter and digits as words', () => {
    expect(spokenCallsign('DLH400')).toBe('D L H vier null null');
    expect(spokenCallsign('EZY25YP')).toBe('E Z Y zwei fünf Y P');
  });
  it('speaks aircraft types with number words ("A380" -> "A dreihundertachtzig")', () => {
    expect(spokenType('Airbus A380')).toBe('Airbus A dreihundertachtzig');
    expect(spokenType('Airbus A320neo')).toBe('Airbus A dreihundertzwanzig Neo');
    expect(spokenType('Boeing 737-800')).toBe('Boeing sieben drei sieben achthundert');
  });
});

describe('Boeing digit-wise pronunciation (sky-scene-d4n9p)', () => {
  it.each([
    ['Boeing 747', 'Boeing sieben vier sieben'],
    ['Boeing 747-10', 'Boeing sieben vier sieben zehn'],
    ['Boeing 747-400', 'Boeing sieben vier sieben vierhundert'],
    ['Boeing 737-800', 'Boeing sieben drei sieben achthundert'],
    ['Boeing 787-9', 'Boeing sieben acht sieben neun'],
    ['Boeing 737 MAX 8', 'Boeing sieben drei sieben Max acht'],
    ['Airbus A320neo', 'Airbus A dreihundertzwanzig Neo'],
  ])('%s', (n, e) => expect(spokenType(n)).toBe(e));
  it('article: eine Boeing, ein Airbus', () => {
    expect(composeSpeechParts({ typeName: 'Boeing 747-400' })[0]).toBe('Das ist eine Boeing sieben vier sieben vierhundert.');
    expect(composeSpeechParts({ typeName: 'Airbus A320' })[0]).toMatch(/^Das ist ein Airbus/);
  });
});

describe('composeSpeechParts (Satzbausteine, sky-scene-b7w2n)', () => {
  const full = { airlineName: 'Lufthansa', typeName: 'Airbus A320', routeLegs: ['Frankfurt (FRA)', 'Istanbul (IST)'], altitudeM: 7480, verticalRateMs: -8 };
  it('builds the four blocks for airline, type, route, altitude and descent', () => {
    expect(composeSpeechParts(full)).toEqual(['Das ist ein Airbus A dreihundertzwanzig der Lufthansa.', 'Er fliegt von Frankfurt nach Istanbul.', 'Das Flugzeug fliegt in siebentausendfünfhundert Metern Höhe.', 'Es befindet sich gerade im Sinkflug.']);
  });
  it('climb above +5 m/s; level or unknown rate gives no phase block', () => {
    expect(composeSpeechParts({ ...full, verticalRateMs: 8 }).slice(-1)[0]).toBe('Es befindet sich gerade im Steigflug.');
    for (const v of [4.9, -4.9, 0, undefined]) expect(composeSpeechParts({ ...full, verticalRateMs: v })).toHaveLength(3);
    expect(composeSpeechParts({ ...full, verticalRateMs: 3 }, 2.5).slice(-1)[0]).toBe('Es befindet sich gerade im Steigflug.');
  });
  it('never speaks the callsign; handles missing airline and/or type', () => {
    const noAirline = composeSpeechParts({ typeName: 'Airbus A320', altitudeM: 7480, callsign: 'DLH4EH' } as never);
    expect(noAirline[0]).toBe('Das ist ein Airbus A dreihundertzwanzig.');
    expect(noAirline.join(' ')).not.toMatch(/D L H|DLH/);
    expect(composeSpeechParts({ airlineName: 'Lufthansa' })[0]).toBe('Das ist ein Flugzeug der Lufthansa.');
    expect(composeSpeechParts({})).toEqual(['Das ist ein Flugzeug.']);
  });
  it('route: only first and last city; unknown, one-leg or label without IATA code gives no block; altitude 0 gives no block', () => {
    expect(composeSpeechParts({ routeLegs: ['Frankfurt (FRA)', 'Wien (VIE)', 'Istanbul (IST)'] })[1]).toBe('Er fliegt von Frankfurt nach Istanbul.');
    expect(composeSpeechParts({})).toHaveLength(1);
    expect(composeSpeechParts({ routeLegs: ['Frankfurt (FRA)', 'EDXX'] })).toHaveLength(1);
    expect(composeSpeechParts({ altitudeM: 0 })).toHaveLength(1);
  });
  it('rounds altitude to 500 m, below 1000 m to 100 m', () => {
    expect([7480, 7240, 850].map(roundAltitudeM)).toEqual([7500, 7000, 900]);
  });
});
