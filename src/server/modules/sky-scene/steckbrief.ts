// Steckbrief speech text (German, adapter-independent; ADR 0012): short sentences, spelled-out numbers, pronunciation dictionary.
const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** German cardinal for 0..999999 ("elftausenddreihundert"). Standalone 1 is "eins", "ein" inside compounds. */
export function numberToGerman(n: number): string {
  if (n < 0 || !Number.isInteger(n) || n > 999999) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) { const o = n % 10; return (o ? `${n % 10 === 1 ? 'ein' : ONES[o]}und` : '') + TENS[Math.floor(n / 10)]; }
  const lead = (m: number): string => (m === 1 ? 'ein' : numberToGerman(m));
  if (n < 1000) { const r = n % 100; return `${lead(Math.floor(n / 100))}hundert${r ? numberToGerman(r) : ''}`; }
  const r = n % 1000;
  return `${lead(Math.floor(n / 1000))}tausend${r ? numberToGerman(r) : ''}`;
}

export function spokenCallsign(callsign: string): string {
  return [...callsign.trim().toUpperCase()].map((c) => (/[0-9]/.test(c) ? ONES[Number(c)] : c)).join(' ');
}

/** "Airbus A320neo" -> "Airbus A dreihundertzwanzig Neo". */
export function spokenType(name: string): string {
  // Boeing model series is spoken digit by digit ("Boeing sieben vier sieben"); the variant after the dash stays a number word.
  const boeing = /^(\s*Boeing\s+)(\d{3})(?!\d)(.*)$/i.exec(name);
  if (boeing) {
    const series = [...boeing[2]].map((c) => ONES[Number(c)]).join(' ');
    const rest = spokenType(boeing[3].replace(/^-/, ' ')).trim();
    return `Boeing ${series}${rest ? ` ${rest}` : ''}`;
  }
  return name
    .replace(/([A-Za-z])(?=\d)/g, '$1 ')
    .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\d+/g, (d) => numberToGerman(Number(d)))
    .replace(/\b(neo|max)\b/gi, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SpeechFacts {
  airlineName?: string; typeName?: string; altitudeM?: number; verticalRateMs?: number;
  /** Codes for the readable cache layout (sky-scene-jpjt2): aircraft type code, airline ICAO prefix. */
  typeCode?: string; airlineIcao?: string;
  /** Display labels of the route legs in order ("Frankfurt (FRA)"); only first and last are spoken. */
  routeLegs?: string[];
  /** Aircraft class; a helicopter is spoken as "Hubschrauber" instead of "Flugzeug". */
  typklasse?: string;
}
/** One sentence block: `kategorie`/`schluessel` name its place in the speech cache folder, `text` is what is spoken. */
export interface SpeechPart { kategorie: string; schluessel: string; text: string }

/** File-name safe slug: only [A-Za-z0-9_-]. */
export function slug(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

/** Altitude rounded for speech: 500 m steps, 100 m steps below 1000 m. */
export function roundAltitudeM(m: number): number {
  const step = m < 1000 ? 100 : 500;
  return Math.round(m / step) * step;
}

/** IATA code in a leg label's parentheses ("Frankfurt (FRA)" -> "FRA"), if any. */
function codeOfLabel(label: string): string | undefined {
  const m = /\(([A-Z0-9]{3,4})\)\s*$/.exec(label.trim());
  return m ? m[1] : undefined;
}

/** City name of a leg label: the label without its parenthesised IATA code; undefined when the label has no code (airport not in the table). */
export function cityOfLabel(label: string): string | undefined {
  const m = /^(.*?)\s*\([A-Z0-9]{3,4}\)\s*$/.exec(label.trim());
  return m && m[1] ? m[1] : undefined;
}

/**
 * Steckbrief as fixed sentence blocks (sky-scene-b7w2n): each block is rendered and cached on its own. The callsign is never spoken.
 * `phaseMinRateMs`: climb/descent block only beyond this vertical rate (default 5 m/s).
 */
export function composeSpeechParts(f: SpeechFacts, phaseMinRateMs = 5): SpeechPart[] {
  const parts: SpeechPart[] = [];
  const heli = f.typklasse === 'helicopter';
  const noun = heli ? 'Hubschrauber' : 'Flugzeug';
  // Helicopter blocks get their own cache keys, the aircraft keys stay unchanged.
  const keyPrefix = heli ? 'hubschrauber-' : '';
  const type = f.typeName ? spokenType(f.typeName) : '';
  const airlineKey = f.airlineName ? `_${slug(f.airlineIcao ?? f.airlineName)}` : '';
  if (type) parts.push({ kategorie: 'typ-airline', schluessel: `${slug(f.typeCode ?? f.typeName ?? '')}${airlineKey}`, text: `Das ist ${/^Boeing\b/.test(type) ? 'eine' : 'ein'} ${type}${f.airlineName ? ` der ${f.airlineName}` : ''}.` });
  else parts.push({ kategorie: 'typ-airline', schluessel: `${noun}${airlineKey}`, text: `Das ist ein ${noun}${f.airlineName ? ` der ${f.airlineName}` : ''}.` });
  if (f.routeLegs && f.routeLegs.length >= 2) {
    const last = f.routeLegs.length - 1;
    const from = cityOfLabel(f.routeLegs[0]); const to = cityOfLabel(f.routeLegs[last]);
    if (from && to) {
      const code = (i: number, c: string): string => slug(codeOfLabel(f.routeLegs![i]) || c);
      parts.push({ kategorie: 'route', schluessel: `${code(0, from)}-${code(last, to)}`, text: `Er fliegt von ${from} nach ${to}.` });
    }
  }
  if (typeof f.altitudeM === 'number' && f.altitudeM > 0) {
    const r = roundAltitudeM(f.altitudeM);
    if (r > 0) parts.push({ kategorie: 'hoehe', schluessel: `${keyPrefix}${r}`, text: `${heli ? 'Der' : 'Das'} ${noun} fliegt in ${numberToGerman(r)} Metern Höhe.` });
  }
  if (typeof f.verticalRateMs === 'number') {
    if (f.verticalRateMs > phaseMinRateMs) parts.push({ kategorie: 'phase', schluessel: `${keyPrefix}steigflug`, text: `${heli ? 'Er' : 'Es'} befindet sich gerade im Steigflug.` });
    else if (f.verticalRateMs < -phaseMinRateMs) parts.push({ kategorie: 'phase', schluessel: `${keyPrefix}sinkflug`, text: `${heli ? 'Er' : 'Es'} befindet sich gerade im Sinkflug.` });
  }
  return parts;
}
