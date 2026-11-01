/** Kennzeichen-Callsign rule (airspace-fehby): small aircraft that send their registration as callsign get no route lookup (adsbdb returns stale, random routes for them). */
const norm = (s: string) => s.trim().toUpperCase().replace(/-/g, '');
const GERMAN_REGISTRATION = /^D[A-Z]{4}$/;

export function isRegistrationCallsign(callsign: string | undefined, registration?: string): boolean {
  if (!callsign) return false;
  const cs = norm(callsign);
  if (!cs) return false;
  if (registration && norm(registration)) return cs === norm(registration);
  return GERMAN_REGISTRATION.test(cs);
}
