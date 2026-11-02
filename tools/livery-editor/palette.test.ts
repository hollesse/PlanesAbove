import { describe, expect, it } from 'vitest';
import type { LiveryFile } from '../../src/client/ui/domain/livery-file';
import { airlinePalette } from './palette';

const path = (color: string) => ({ type: 'path', points: [[0, 0], [1, 0], [1, 1]], color });
const file = (livery: string, typklasse: string, layers: unknown[], fields = {}) => ({ version: 1, livery, typklasse, fields, layers });
const draft = (livery: string, layers: unknown[] = [], fields = {}, typklasse = 'narrowbody') => file(livery, typklasse, layers, fields) as unknown as LiveryFile;

describe('airlinePalette', () => {
  it('empty input gives an empty list', () => {
    expect(airlinePalette('x', {}, draft('y'))).toEqual([]);
  });
  it('collects across all type classes, most frequent first, ties by first occurrence', () => {
    const files = {
      'x/narrowbody': file('x', 'narrowbody', [path('#111111'), path('#222222')]),
      'x/widebody': file('x', 'widebody', [path('#222222'), path('#333333')]),
    };
    expect(airlinePalette('x', files, draft('other'))).toEqual(['#222222', '#111111', '#333333']);
  });
  it('merges upper and lower case and shows lower case', () => {
    const files = { 'x/narrowbody': file('x', 'narrowbody', [path('#1A1476'), path('#1a1476'), path('#ABCDEF')]) };
    expect(airlinePalette('x', files, draft('other'))).toEqual(['#1a1476', '#abcdef']);
  });
  it('counts the colour fields', () => {
    const files = { 'x/narrowbody': file('x', 'narrowbody', [], { engines: '#123456', wings: '#ABCDEF', tailplane: '#E1E3E1' }) };
    expect(airlinePalette('x', files, draft('other'))).toEqual(['#123456', '#abcdef']);
  });
  it('does not count colour fields still at the renderer default', () => {
    expect(airlinePalette('x', {}, draft('x', [], { engines: '#C9CCCB', wings: '#e1e3e1' }))).toEqual([]);
  });
  it('ignores logo layers and other airlines', () => {
    const files = {
      'x/narrowbody': file('x', 'narrowbody', [{ type: 'logo', src: 'a', color: '#999999' }, path('#111111')]),
      'xy/narrowbody': file('xy', 'narrowbody', [path('#555555')]),
      'y/narrowbody': file('y', 'narrowbody', [path('#666666')]),
    };
    expect(airlinePalette('x', files, draft('other'))).toEqual(['#111111']);
  });
  it('includes the open draft live and does not count its saved version twice', () => {
    const files = {
      'x/narrowbody': file('x', 'narrowbody', [path('#111111')]),
      'x/widebody': file('x', 'widebody', [path('#222222')]),
    };
    const d = draft('x', [path('#333333')]);
    expect(airlinePalette('x', files, d)).toEqual(['#222222', '#333333']);
  });
});
