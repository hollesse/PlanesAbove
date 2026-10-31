/** Foto-Datensatz, Form des `Photo`-Modells aus airspace-gw6w9 / ADR 0029 (das iPad laedt Bilder direkt vom Quell-Host). */
export interface Photo {
  id: string;
  thumbUrl: string;
  imageUrl: string;
  photographer: string;
  source: string;
  pageUrl: string;
  /** Pflichtanzeige: Attributionstext exakt wie geliefert (Fotograf, Plattform, Lizenz), nie gekuerzt. */
  licenceText: string;
}

const svgUri = (label: string, a: string, b: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="533" viewBox="0 0 800 533"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="533" fill="url(#g)"/><text x="400" y="280" font-family="sans-serif" font-size="34" text-anchor="middle" fill="#ffffff" fill-opacity="0.85">${label}</text></svg>`,
  )}`;

/** Beispieldaten NUR fuer Storybook/Tests: Platzhalter-Grafiken, keine echten Fotos, keine Hotlinks. */
export const SAMPLE_PHOTOS: Photo[] = [
  { id: 'sample-1', thumbUrl: svgUri('Beispielbild 1', '#5b87b5', '#c9d9e8'), imageUrl: svgUri('Beispielbild 1 (kein echtes Foto)', '#5b87b5', '#c9d9e8'), photographer: 'Beispiel-Fotograf A', source: 'Beispiel-Plattform', pageUrl: 'beispiel.example/foto/1', licenceText: 'Foto: Beispiel-Fotograf A · Beispiel-Plattform · CC BY-SA 4.0' },
  { id: 'sample-2', thumbUrl: svgUri('Beispielbild 2', '#c0774a', '#f0d9b5'), imageUrl: svgUri('Beispielbild 2 (kein echtes Foto)', '#c0774a', '#f0d9b5'), photographer: 'Beispiel-Fotograf B', source: 'Beispiel-Plattform', pageUrl: 'beispiel.example/foto/2', licenceText: 'Foto: Beispiel-Fotograf B · Beispiel-Plattform · mit freundlicher Genehmigung' },
  { id: 'sample-3', thumbUrl: svgUri('Beispielbild 3', '#3f6b4f', '#b7d3b0'), imageUrl: svgUri('Beispielbild 3 (kein echtes Foto)', '#3f6b4f', '#b7d3b0'), photographer: 'Beispiel-Fotograf C', source: 'Beispiel-Plattform', pageUrl: 'beispiel.example/foto/3', licenceText: 'Foto: Beispiel-Fotograf C · Beispiel-Plattform · CC BY 2.0' },
];
