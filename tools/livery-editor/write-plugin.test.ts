import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { liveryWritePlugin } from './write-plugin';

const body = { version: 1, livery: 'spike', typklasse: 'narrowbody', fields: { engines: '#c9cccb' }, layers: [{ type: 'path', points: [[1, 1], [9, 1], [9, 9], [1, 9]], color: '#d6001c' }] };
let root: string;
const savedEnv = process.env.LIVERY_EDITOR_OUT;
beforeEach(() => { delete process.env.LIVERY_EDITOR_OUT; root = fs.mkdtempSync(path.join(os.tmpdir(), 'liv-root-')); });
afterEach(() => { if (savedEnv === undefined) delete process.env.LIVERY_EDITOR_OUT; else process.env.LIVERY_EDITOR_OUT = savedEnv; });

function post(rebuild: (r: string) => void, payload: unknown) {
  let handler: (req: unknown, res: unknown) => void = () => {};
  const plugin = liveryWritePlugin(root, rebuild) as any;
  plugin.configureServer({ middlewares: { use: (_p: string, h: typeof handler) => { handler = h; } } });
  const req: any = new EventEmitter(); req.method = 'POST';
  const res: any = { statusCode: 0, setHeader() {}, end() {} };
  handler(req, res);
  req.emit('data', JSON.stringify(payload)); req.emit('end');
  return res.statusCode as number;
}

describe('write plugin triggers build-assets after a save (ADR 0035 point 3, "ohne Neustart")', () => {
  it('runs the rebuild with the repo root after a successful save into the repo target', () => {
    const calls: string[] = [];
    expect(post((r) => calls.push(r), body)).toBe(200);
    expect(calls).toEqual([root]);
    expect(fs.existsSync(path.join(root, 'src/client/ui/assets/liveries/spike/narrowbody.json'))).toBe(true);
  });
  it('does not run the rebuild when the save is refused', () => {
    const calls: string[] = [];
    expect(post((r) => calls.push(r), { ...body, livery: '../evil' })).toBe(400);
    expect(calls).toEqual([]);
  });
  it('does not run the rebuild for a LIVERY_EDITOR_OUT throwaway directory', () => {
    process.env.LIVERY_EDITOR_OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'liv-out-'));
    const calls: string[] = [];
    expect(post((r) => calls.push(r), body)).toBe(200);
    expect(calls).toEqual([]);
  });
});
