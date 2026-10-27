// Registered flight-source config names, in default failover order (ADR 0019). Add a name here when adding an adapter.
export const FLIGHT_SOURCE_NAMES = ['adsb-fi', 'adsb-lol'] as const;
export type FlightSourceName = (typeof FLIGHT_SOURCE_NAMES)[number];
