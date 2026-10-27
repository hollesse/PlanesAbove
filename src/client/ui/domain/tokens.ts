// Colour and typography tokens (mirrors styles/tokens.css, which is the CSS source of truth).
export const COLORS = {
  ink: { value: '#1F2A33', name: 'Tinte (dunkel)' },
  paper: { value: '#ECEBE3', name: 'Papier' },
  paperDark: { value: '#D8D6CC', name: 'Papier dunkel (Seitenhintergrund)' },
  signal: { value: '#C8313E', name: 'Signalrot' },
  skyInkLight: { value: '#F6EEDC', name: 'Himmel-Tinte hell' },
  skyInkDark: { value: '#1F2A33', name: 'Himmel-Tinte dunkel' },
  muted: { value: '#5B6670', name: 'Gedämpft' },
  planeBackdrop: { value: '#C9D6E1', name: 'Flugzeug-Hintergrund (Entwurf)' },
} as const;

export const GLOW_LAYERS = ['tight', 'mid', 'wide'] as const;
/** Schein (Variante E): Radius je Lage (mirrors --pa-sky-glow-blur-<lage> in styles/tokens.css). */
export const GLOW_BLUR = {
  tight: { token: '--pa-sky-glow-blur-tight', value: '0.3cqw', name: 'Schein-Radius eng' },
  mid: { token: '--pa-sky-glow-blur-mid', value: '1cqw', name: 'Schein-Radius mittel' },
  wide: { token: '--pa-sky-glow-blur-wide', value: '2.4cqw', name: 'Schein-Radius breit' },
} as const;
/** Schein-Farbe/Deckkraft je Tinte und Lage (mirrors --pa-sky-glow-on-<tinte>-ink-<lage>). */
export const GLOW_COLORS = {
  light: {
    tight: { token: '--pa-sky-glow-on-light-ink-tight', value: 'rgba(0, 0, 0, 0.9)', name: 'Schein heller Tinte, eng (schwarz 90 %)' },
    mid: { token: '--pa-sky-glow-on-light-ink-mid', value: 'rgba(0, 0, 0, 0.9)', name: 'Schein heller Tinte, mittel (schwarz 90 %)' },
    wide: { token: '--pa-sky-glow-on-light-ink-wide', value: 'rgba(0, 0, 0, 0.7)', name: 'Schein heller Tinte, breit (schwarz 70 %)' },
  },
  dark: {
    tight: { token: '--pa-sky-glow-on-dark-ink-tight', value: 'rgba(255, 255, 255, 0.8)', name: 'Schein dunkler Tinte, eng (weiß 80 %)' },
    mid: { token: '--pa-sky-glow-on-dark-ink-mid', value: 'rgba(255, 255, 255, 0.8)', name: 'Schein dunkler Tinte, mittel (weiß 80 %)' },
    wide: { token: '--pa-sky-glow-on-dark-ink-wide', value: 'rgba(255, 255, 255, 0.6)', name: 'Schein dunkler Tinte, breit (weiß 60 %)' },
  },
} as const;

export const FONTS = {
  display: { family: 'Archivo', weights: [900], role: 'Route, Plakette, Überschriften' },
  mono: { family: 'IBM Plex Mono', weights: [400, 500], role: 'Eyebrow, Meta, Kopfzeile' },
} as const;
