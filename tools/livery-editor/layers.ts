import type { LiveryFile } from '../../src/client/ui/domain/livery-file';

// Pure layer logic of the layer panel. `file.layers` runs bottom -> top (ADR 0032 section 1); the panel lists top first.
// "Up" therefore means towards the end of the array. Every function returns a new value and never mutates its input.

export type Direction = 'up' | 'down';
type Layer = LiveryFile['layers'][number];

/** Swap the item at `index` with its neighbour above (towards the end) or below; stops at the edges. */
export function moveItem<T>(items: readonly T[], index: number, dir: Direction): T[] {
  const to = dir === 'up' ? index + 1 : index - 1;
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return [...items];
  const out = [...items];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}
export const removeItem = <T>(items: readonly T[], index: number): T[] => items.filter((_, i) => i !== index);

const withLayers = (file: LiveryFile, layers: Layer[]): LiveryFile => ({ ...file, layers });
const mapLayer = (file: LiveryFile, index: number, f: (l: Layer) => Layer): LiveryFile => withLayers(file, file.layers.map((l, i) => (i === index ? f(l) : l)));

export const moveLayer = (file: LiveryFile, index: number, dir: Direction): LiveryFile => withLayers(file, moveItem(file.layers, index, dir));
export const removeLayer = (file: LiveryFile, index: number): LiveryFile => withLayers(file, removeItem(file.layers, index));
/** Only path layers carry a colour; a logo layer is returned unchanged. */
export const recolorLayer = (file: LiveryFile, index: number, color: string): LiveryFile =>
  mapLayer(file, index, (l) => (l.type === 'path' ? { ...l, color } : l));
/** An empty (or blank) name removes the name again; names are cut to the schema's 40 characters. */
export function renameLayer(file: LiveryFile, index: number, name: string): LiveryFile {
  const n = name.trim().slice(0, NAME_MAX);
  return mapLayer(file, index, (l) => { const { name: _old, ...rest } = l; return (n ? { ...rest, name: n } : rest) as Layer; });
}
export const NAME_MAX = 40;

/** Panel label: the layer's name, else "Pfad n" counted from the bottom for paths, the logo name (`src`) for logos. */
export function layerLabel(file: LiveryFile, index: number): string {
  const l = file.layers[index];
  if (l.name) return l.name;
  if (l.type === 'logo') return l.src;
  const n = file.layers.slice(0, index + 1).filter((x) => x.type === l.type).length;
  return `Pfad ${n}`;
}

/** The file as the board draws it: hidden layers (editor state, `hidden[i]` parallel to `layers`) are left out. The saved file keeps them. */
export const visibleFile = (file: LiveryFile, hidden: readonly boolean[]): LiveryFile =>
  withLayers(file, file.layers.filter((_, i) => !hidden[i]));
