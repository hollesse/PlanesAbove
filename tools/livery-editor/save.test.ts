import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { saveLivery } from './save';

const body = { version: 1, livery: 'spike', typklasse: 'narrowbody', fields: { engines: '#c9cccb' }, layers: [{ type: 'path', points: [[1, 1], [9, 1], [9, 9], [1, 9]], color: '#d6001c' }] };
let out: string;
const listing = () => fs.readdirSync(out, { recursive: true });
beforeEach(() => { out = fs.mkdtempSync(path.join(os.tmpdir(), 'liv-out-')); });

describe('write plugin save (ADR 0035 point 3)', () => {
  it('writes exactly <id>/<typklasse>.json with the points and colour, atomically (no temp file left)', () => {
    const r = saveLivery(body, out);
    expect(r.status).toBe(200);
    expect(listing().sort()).toEqual(['spike', path.join('spike', 'narrowbody.json')]);
    const saved = JSON.parse(fs.readFileSync(path.join(out, 'spike/narrowbody.json'), 'utf8'));
    expect(saved.layers[0].points).toHaveLength(4);
    expect(saved.layers[0].color).toBe('#d6001c');
  });
  it.each(['../evil', '..', 'a/b', '/etc/x', 'A', ''])('refuses the livery id %j with 400 and writes nothing', (id) => {
    expect(saveLivery({ ...body, livery: id }, out).status).toBe(400);
    expect(listing()).toEqual([]);
  });
  it('refuses unknown Typklassen, broken schema and non-objects with 400 and writes nothing', () => {
    for (const b of [{ ...body, typklasse: '../../x' }, { ...body, layers: 'x' }, null, 'str', 42]) expect(saveLivery(b, out).status).toBe(400);
    expect(listing()).toEqual([]);
  });
});
