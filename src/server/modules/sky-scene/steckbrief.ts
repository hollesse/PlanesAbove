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
  return name
    .replace(/([A-Za-z])(?=\d)/g, '$1 ')
    .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\d+/g, (d) => numberToGerman(Number(d)))
    .replace(/\b(neo|max)\b/gi, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SpeechFacts { airlineName?: string; callsign?: string; typeName?: string; altitudeM?: number }

export function composeSpeech(f: SpeechFacts): string {
  const parts: string[] = [];
  if (f.airlineName) parts.push(f.airlineName);
  else if (f.callsign) parts.push(spokenCallsign(f.callsign));
  if (f.typeName) parts.push(spokenType(f.typeName));
  if (typeof f.altitudeM === 'number' && f.altitudeM > 0) {
    const step = f.altitudeM < 1000 ? 50 : 100;
    parts.push(`Höhe: ${numberToGerman(Math.round(f.altitudeM / step) * step)} Meter`);
  }
  return parts.length ? parts.map((p) => `${p}.`).join(' ') : 'Ein Flugzeug.';
}
