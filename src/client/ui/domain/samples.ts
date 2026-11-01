// Sample planes and realistic flights in the real display format (ICAO callsigns, "Stadt (IATA)" routes); used by stories, pages and tests.
import type { FlightInfo } from './flight';
import type { PaintedPlaneProps } from '../molecules/painted-plane';

export const SAMPLE_PLACE = 'Kirchstrasse 17';
export const SAMPLE_CLOCK = '10:08';

export type SampleKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const SAMPLE_PLANES: Record<SampleKey, PaintedPlaneProps> = {
  A: { type: 'narrowbody', livery: 'lh', logo: 'lufthansa' },
  B: { type: 'business-jet', livery: 'def', logo: null },
  C: { type: 'widebody', livery: 'condor', logo: null },
  D: { type: 'narrowbody', livery: 'ryan', logo: null },
  E: { type: 'narrowbody', livery: 'condor', logo: null },
  F: { type: 'narrowbody', livery: 'easy', logo: null },
};

export const SAMPLE_FLIGHTS: Record<SampleKey, FlightInfo> = {
  A: { operator: 'Lufthansa', callsign: 'DLH1450', aircraft: 'Airbus A320neo', registration: 'D-AINA', route: 'Frankfurt (FRA) → Thessaloniki (SKG)', altitudeM: 11300, speedKmh: 870, phase: 'level' },
  B: { operator: 'NetJets Europe', callsign: 'NJE7GT', aircraft: 'Embraer Phenom 300', registration: 'CS-PHJ', route: null, altitudeM: 11300, speedKmh: 870, phase: 'level' },
  C: { operator: 'Condor', callsign: 'CFG2032', aircraft: 'Airbus A330-900', registration: 'D-ANRA', route: 'Frankfurt (FRA) → Montego Bay (MBJ)', via: ['Varadero'], altitudeM: 11900, speedKmh: 905, phase: 'climb' },
  D: { operator: 'Ryanair', callsign: 'RYR3TL', aircraft: 'Boeing 737-800', registration: 'EI-DCL', route: 'Hahn (HHN) → Palma de Mallorca (PMI)', altitudeM: 9400, speedKmh: 790, phase: 'descent' },
  E: { operator: 'Condor', callsign: 'CFG1512', aircraft: 'Airbus A321', registration: 'D-AIAD', route: 'Frankfurt (FRA) → Barcelona (BCN)', altitudeM: 10700, speedKmh: 840, phase: 'climb' },
  F: { operator: 'easyJet', callsign: 'EZY8216', aircraft: 'Airbus A320', registration: 'G-EZWX', route: 'Berlin (BER) → London (LGW)', altitudeM: 10100, speedKmh: 820, phase: 'level' },
};

export const RECENT_TEXT = 'Zuletzt: Lufthansa DLH1450 · vor 6 Min';
