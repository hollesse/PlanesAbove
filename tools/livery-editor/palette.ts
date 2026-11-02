import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { FIELD_DEFAULTS } from '../../src/client/ui/domain/livery-render';

// Airline palette: every colour already used in the saved liveries of one airline plus the open draft.
// Pure derivation, no file format of its own. Logos carry no colour; colour fields still at the renderer default are not counted.

const HEX = /^#[0-9a-f]{6}$/i;
const DEFAULTS = new Set<string>(Object.values(FIELD_DEFAULTS).map((c) => c.toLowerCase()));

function colorsOf(file: unknown): string[] {
  if (typeof file !== 'object' || file === null) return [];
  const f = file as { fields?: Record<string, unknown>; layers?: unknown };
  const out: string[] = [];
  if (Array.isArray(f.layers)) for (const l of f.layers) {
    if (typeof l === 'object' && l !== null && (l as { type?: unknown }).type === 'path') out.push(String((l as { color?: unknown }).color));
  }
  // a colour field still at the renderer default is no choice of the airline (a blank board must give an empty palette)
  const fields = f.fields && typeof f.fields === 'object' ? Object.values(f.fields).map(String).filter((c) => !DEFAULTS.has(c.toLowerCase())) : [];
  return [...out, ...fields].filter((c) => HEX.test(c)).map((c) => c.toLowerCase());
}

/**
 * Colours of airline `liveryId`, de-duplicated case-insensitively (shown lower case), most frequent first,
 * ties by first occurrence. `files` are the saved files keyed `<livery>/<typklasse>`; `current` is the open draft and
 * replaces the saved file of the same key (so the draft is counted live, not twice).
 */
export function airlinePalette(liveryId: string, files: Readonly<Record<string, unknown>>, current: LiveryFile): string[] {
  const draftKey = `${current.livery}/${current.typklasse}`;
  const sources: unknown[] = Object.entries(files).filter(([k]) => k.startsWith(`${liveryId}/`) && k !== draftKey).map(([, v]) => v);
  if (current.livery === liveryId) sources.push(current);
  const count = new Map<string, number>();
  for (const s of sources) for (const c of colorsOf(s)) count.set(c, (count.get(c) ?? 0) + 1);
  return [...count.entries()].map(([c, n], i) => ({ c, n, i })).sort((a, b) => b.n - a.n || a.i - b.i).map((e) => e.c);
}
