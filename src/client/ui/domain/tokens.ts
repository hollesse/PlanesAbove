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

export const FONTS = {
  display: { family: 'Archivo', weights: [900], role: 'Route, Plakette, Überschriften' },
  mono: { family: 'IBM Plex Mono', weights: [400, 500], role: 'Eyebrow, Meta, Kopfzeile' },
} as const;
