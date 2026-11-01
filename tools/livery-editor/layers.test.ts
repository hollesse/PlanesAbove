import { describe, expect, it } from 'vitest';
import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { layerLabel, moveItem, moveLayer, recolorLayer, removeItem, removeLayer, renameLayer, visibleFile } from './layers';
import { renderLiverySvg } from '../../src/client/ui/domain/livery-render';

const p = (color: string, name?: string) => ({ type: 'path' as const, points: [[0, 0], [10, 0], [10, 10]] as [number, number][], color, ...(name ? { name } : {}) });
const file = (): LiveryFile => ({ version: 1, livery: 'x', typklasse: 'narrowbody', fields: {}, layers: [p('#111111'), p('#222222'), p('#333333')] });
const colors = (f: LiveryFile) => f.layers.map((l) => (l.type === 'path' ? l.color : ''));

describe('layer logic', () => {
  it('moves up/down by swapping neighbours and stops at the edges', () => {
    expect(colors(moveLayer(file(), 0, 'up'))).toEqual(['#222222', '#111111', '#333333']);
    expect(colors(moveLayer(file(), 2, 'down'))).toEqual(['#111111', '#333333', '#222222']);
    expect(colors(moveLayer(file(), 2, 'up'))).toEqual(['#111111', '#222222', '#333333']);
    expect(colors(moveLayer(file(), 0, 'down'))).toEqual(['#111111', '#222222', '#333333']);
    expect(moveItem([1, 2], 5, 'up')).toEqual([1, 2]);
  });
  it('removes exactly the one layer', () => {
    expect(colors(removeLayer(file(), 1))).toEqual(['#111111', '#333333']);
    expect(removeItem([true, false], 0)).toEqual([false]);
  });
  it('recolours and renames only the addressed layer, purely', () => {
    const f = file();
    const r = recolorLayer(f, 1, '#abcdef');
    expect(colors(r)).toEqual(['#111111', '#abcdef', '#333333']);
    expect(r.layers[0]).toBe(f.layers[0]);
    expect(colors(f)).toEqual(['#111111', '#222222', '#333333']);
    const n = renameLayer(f, 2, ' Heck ');
    expect(n.layers[2].name).toBe('Heck');
    expect(n.layers[0].name).toBeUndefined();
    expect(f.layers[2].name).toBeUndefined();
    expect('name' in renameLayer(n, 2, '  ').layers[2]).toBe(false);
    expect(renameLayer(f, 0, 'x'.repeat(60)).layers[0].name).toHaveLength(40);
  });
  it('labels unnamed layers "Pfad n" from the bottom', () => {
    const f = renameLayer(file(), 0, 'Streifen');
    expect([0, 1, 2].map((i) => layerLabel(f, i))).toEqual(['Streifen', 'Pfad 2', 'Pfad 3']);
  });
  it('labels an unnamed logo layer with its logo name', () => {
    const f: LiveryFile = { ...file(), layers: [...file().layers, { type: 'logo', src: 'lufthansa', x: 0, y: 0, scale: 1, rotation: 0 }] };
    expect(layerLabel(f, 3)).toBe('lufthansa');
    expect(layerLabel(renameLayer(f, 3, 'Heck'), 3)).toBe('Heck');
  });
  it('labels an unnamed logo layer with its logo name', () => {
    const f: LiveryFile = { ...file(), layers: [...file().layers, { type: 'logo', src: 'lufthansa', x: 0, y: 0, scale: 1, rotation: 0 }] };
    expect(layerLabel(f, 3)).toBe('lufthansa');
    expect(layerLabel(renameLayer(f, 3, 'Heck'), 3)).toBe('Heck');
  });
  it('hiding drops a layer from the render but not from the file', () => {
    const f = file();
    const shown = visibleFile(f, [false, true, false]);
    expect(shown.layers).toHaveLength(2);
    expect(f.layers).toHaveLength(3);
    expect(renderLiverySvg(shown)).not.toContain('#222222');
    expect(renderLiverySvg(f)).toContain('#222222');
  });
});
