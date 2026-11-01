import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LiveryFileSchema, type LiveryFile } from '../../src/client/ui/domain/livery-file';

const sample: LiveryFile = {
  version: 1, livery: 'spike', typklasse: 'narrowbody',
  fields: { engines: '#c9cccb', wings: '#e1e3e1', tailplane: '#e1e3e1' },
  layers: [{ type: 'path', points: [[1, 2], [3, 4], [5, 6], [7, 8]], via: [null, [4, 3], null, null], color: '#d6001c' }, { type: 'logo', src: 'lufthansa', x: 1, y: 2, scale: 0.5, rotation: 10 }],
};

describe('livery file schema (ADR 0032)', () => {
  it('survives a JSON roundtrip unchanged', () => {
    expect(LiveryFileSchema.parse(JSON.parse(JSON.stringify(sample)))).toEqual(sample);
  });
  it('rejects broken files', () => {
    const bad = (patch: object) => expect(LiveryFileSchema.safeParse({ ...sample, ...patch }).success).toBe(false);
    bad({ livery: '../x' });
    bad({ typklasse: 'zeppelin' });
    bad({ version: 2 });
    bad({ layers: [{ type: 'path', points: [[0, 0], [1, 1]], color: '#000000' }] });
    bad({ layers: [{ type: 'path', points: [[0, 0], [1, 1], [2, 0]], color: 'red' }] });
    bad({ fields: { engines: '#c9cccb', rotor: '#000000' } });
  });
  it('every committed livery file is valid and sits at <liveryId>/<typklasse>.json', () => {
    const root = path.resolve('src/client/ui/assets/liveries');
    for (const id of fs.readdirSync(root)) for (const f of fs.readdirSync(path.join(root, id))) {
      const file = LiveryFileSchema.parse(JSON.parse(fs.readFileSync(path.join(root, id, f), 'utf8')));
      expect(`${file.livery}/${file.typklasse}.json`).toBe(`${id}/${f}`);
    }
  });
});
