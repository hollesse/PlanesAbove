// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { numberToGerman, spokenCallsign, spokenType, composeSpeechParts, roundAltitudeM } from '../../../src/server/modules/sky-scene/steckbrief';

const partsOf = (...a: Parameters<typeof composeSpeechParts>): string[] => composeSpeechParts(...a).map((p) => p.text);

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
    expect(partsOf({ typeName: 'Boeing 747-400' })[0]).toBe('Das ist eine Boeing sieben vier sieben vierhundert.');
    expect(partsOf({ typeName: 'Airbus A320' })[0]).toMatch(/^Das ist ein Airbus/);
  });
});

describe('composeSpeechParts (Satzbausteine, sky-scene-b7w2n)', () => {
  const full = { airlineName: 'Lufthansa', typeName: 'Airbus A320', routeLegs: ['Frankfurt (FRA)', 'Istanbul (IST)'], altitudeM: 7480, verticalRateMs: -8 };
  it('builds the four blocks for airline, type, route, altitude and descent', () => {
    expect(partsOf(full)).toEqual(['Das ist ein Airbus A dreihundertzwanzig der Lufthansa.', 'Er fliegt von Frankfurt nach Istanbul.', 'Das Flugzeug fliegt in siebentausendfünfhundert Metern Höhe.', 'Es befindet sich gerade im Sinkflug.']);
  });
  it('climb above +5 m/s; level or unknown rate gives no phase block', () => {
    expect(partsOf({ ...full, verticalRateMs: 8 }).slice(-1)[0]).toBe('Es befindet sich gerade im Steigflug.');
    for (const v of [4.9, -4.9, 0, undefined]) expect(partsOf({ ...full, verticalRateMs: v })).toHaveLength(3);
    expect(partsOf({ ...full, verticalRateMs: 3 }, 2.5).slice(-1)[0]).toBe('Es befindet sich gerade im Steigflug.');
  });
  it('never speaks the callsign; handles missing airline and/or type', () => {
    const noAirline = partsOf({ typeName: 'Airbus A320', altitudeM: 7480, callsign: 'DLH4EH' } as never);
    expect(noAirline[0]).toBe('Das ist ein Airbus A dreihundertzwanzig.');
    expect(noAirline.join(' ')).not.toMatch(/D L H|DLH/);
    expect(partsOf({ airlineName: 'Lufthansa' })[0]).toBe('Das ist ein Flugzeug der Lufthansa.');
    expect(partsOf({})).toEqual(['Das ist ein Flugzeug.']);
  });
  it('route: only first and last city; unknown, one-leg or label without IATA code gives no block; altitude 0 gives no block', () => {
    expect(partsOf({ routeLegs: ['Frankfurt (FRA)', 'Wien (VIE)', 'Istanbul (IST)'] })[1]).toBe('Er fliegt von Frankfurt nach Istanbul.');
    expect(partsOf({})).toHaveLength(1);
    expect(partsOf({ routeLegs: ['Frankfurt (FRA)', 'EDXX'] })).toHaveLength(1);
    expect(partsOf({ altitudeM: 0 })).toHaveLength(1);
  });
  it('helicopter: "Hubschrauber" with masculine article and pronoun', () => {
    expect(partsOf({ typklasse: 'helicopter', airlineName: 'ADAC', altitudeM: 480, verticalRateMs: 6 })).toEqual(['Das ist ein Hubschrauber der ADAC.', 'Der Hubschrauber fliegt in fünfhundert Metern Höhe.', 'Er befindet sich gerade im Steigflug.']);
    expect(partsOf({ typklasse: 'helicopter', typeName: 'Airbus H145', altitudeM: 480 })[1]).toBe('Der Hubschrauber fliegt in fünfhundert Metern Höhe.');
  });
  it('rounds altitude to 500 m, below 1000 m to 100 m', () => {
    expect([7480, 7240, 850].map(roundAltitudeM)).toEqual([7500, 7000, 900]);
  });
});

describe('cache layout of the blocks (sky-scene-jpjt2)', () => {
  const key = (f: Parameters<typeof composeSpeechParts>[0], i: number): string => { const p = composeSpeechParts(f)[i]; return `${p.kategorie}/${p.schluessel}`; };
  it('typ-airline: type code and airline ICAO; without airline, without type', () => {
    const f = { typeName: 'Airbus A320', typeCode: 'A320', airlineName: 'Lufthansa', airlineIcao: 'DLH' };
    expect(key(f, 0)).toBe('typ-airline/A320_DLH');
    expect(key({ ...f, airlineName: undefined, airlineIcao: undefined }, 0)).toBe('typ-airline/A320');
    expect(key({ airlineName: 'Lufthansa', airlineIcao: 'DLH' }, 0)).toBe('typ-airline/Flugzeug_DLH');
    expect(key({}, 0)).toBe('typ-airline/Flugzeug');
    expect(key({ typklasse: 'helicopter' }, 0)).toBe('typ-airline/Hubschrauber');
  });
  it('helicopter altitude and phase blocks have their own keys', () => {
    expect(key({ typklasse: 'helicopter', altitudeM: 3480 }, 1)).toBe('hoehe/hubschrauber-3500');
    expect(key({ typklasse: 'helicopter', altitudeM: 3480, verticalRateMs: -9 }, 2)).toBe('phase/hubschrauber-sinkflug');
  });
  it('route: IATA from the label; altitude and phase keys', () => {
    expect(key({ routeLegs: ['Frankfurt (FRA)', 'Istanbul (IST)'] }, 1)).toBe('route/FRA-IST');
    expect(key({ altitudeM: 3480 }, 1)).toBe('hoehe/3500');
    expect(key({ altitudeM: 3480, verticalRateMs: 9 }, 2)).toBe('phase/steigflug');
    expect(key({ altitudeM: 3480, verticalRateMs: -9 }, 2)).toBe('phase/sinkflug');
  });
  it('slugifies keys to [A-Za-z0-9_-]', () => {
    expect(key({ typeName: 'X', typeCode: 'B7/38', airlineName: 'Ö', airlineIcao: 'a b' }, 0)).toMatch(/^typ-airline\/[A-Za-z0-9_-]+$/);
  });
});
