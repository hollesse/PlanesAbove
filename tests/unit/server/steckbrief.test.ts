// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { numberToGerman, spokenCallsign, spokenType, composeSpeech } from '../../../src/server/modules/sky-scene/steckbrief';

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
    expect(spokenType('Boeing 737-800')).toBe('Boeing siebenhundertsiebenunddreißig achthundert');
  });
});

describe('composeSpeech (Airline oder Callsign, Typ, Hoehe)', () => {
  it('names the airline when known and rounds altitude to hundreds', () => {
    expect(composeSpeech({ airlineName: 'Lufthansa', callsign: 'DLH400', typeName: 'Airbus A320neo', altitudeM: 11312 })).toBe('Lufthansa. Airbus A dreihundertzwanzig Neo. Höhe: elftausenddreihundert Meter.');
  });
  it('falls back to the spelled callsign and omits unknown parts', () => {
    expect(composeSpeech({ callsign: 'CHX77', typeName: 'Hubschrauber', altitudeM: 425 })).toBe('C H X sieben sieben. Hubschrauber. Höhe: vierhundertfünfzig Meter.');
    expect(composeSpeech({})).toBe('Ein Flugzeug.');
  });
});
