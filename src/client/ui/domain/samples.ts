// Sample planes and flights taken from the Screens drafts (used by stories, pages and tests).
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
  A: { operator: 'Lufthansa', callsign: 'LH400', aircraft: 'Airbus A320neo', registration: 'D-AIBI', route: 'Frankfurt → New York', altitudeM: 11300, speedKmh: 870, phase: 'level' },
  B: { operator: 'Privat', aircraft: 'Business-Jet', registration: 'D-CGEO', route: null, altitudeM: 11300, speedKmh: 870, phase: 'level' },
  C: { operator: 'Condor', callsign: 'DE2032', aircraft: 'Airbus A330', registration: 'D-AIYC', route: 'Frankfurt → Cancún', altitudeM: 11900, speedKmh: 905, phase: 'climb' },
  D: { operator: 'Ryanair', callsign: 'FR1724', aircraft: 'Boeing 737-800', registration: 'EI-DCL', route: 'Köln → Palma', altitudeM: 9400, speedKmh: 790, phase: 'descent' },
  E: { operator: 'Condor', callsign: 'DE1512', aircraft: 'Airbus A321', registration: 'D-AIAD', route: 'Frankfurt → Lissabon', altitudeM: 10700, speedKmh: 840, phase: 'climb' },
  F: { operator: 'easyJet', callsign: 'U24321', aircraft: 'Airbus A320', registration: 'G-EZWX', route: 'Berlin → London', altitudeM: 10100, speedKmh: 820, phase: 'level' },
};

export const RECENT_TEXT = 'Zuletzt: Lufthansa LH400 · vor 6 Min';
