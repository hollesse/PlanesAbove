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
  plugin.configureServer({ middlewares: { use: (p: string, h: typeof handler) => { if (p === '/__livery-editor/save') handler = h; } } });
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

describe('logo endpoint', () => {
  const svg = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
  function postTo(endpoint: string, rebuild: (r: string) => void, payload: unknown) {
    const handlers: Record<string, (req: unknown, res: unknown) => void> = {};
    (liveryWritePlugin(root, rebuild) as any).configureServer({ middlewares: { use: (p: string, h: any) => { handlers[p] = h; } } });
    const req: any = new EventEmitter(); req.method = 'POST';
    const res: any = { statusCode: 0, setHeader() {}, end() {} };
    handlers[endpoint](req, res);
    req.emit('data', JSON.stringify(payload)); req.emit('end');
    return res.statusCode as number;
  }
  const savedLogos = process.env.LIVERY_EDITOR_LOGOS_OUT;
  afterEach(() => { if (savedLogos === undefined) delete process.env.LIVERY_EDITOR_LOGOS_OUT; else process.env.LIVERY_EDITOR_LOGOS_OUT = savedLogos; });
  it('writes into svg/logos and rebuilds', () => {
    delete process.env.LIVERY_EDITOR_LOGOS_OUT;
    const calls: string[] = [];
    expect(postTo('/__livery-editor/logo', (r) => calls.push(r), { name: 'acme', kind: 'svg', data: svg })).toBe(200);
    expect(calls).toEqual([root]);
    expect(fs.existsSync(path.join(root, 'src/client/ui/assets/svg/logos/acme.svg'))).toBe(true);
  });
  it('does not rebuild for a LIVERY_EDITOR_LOGOS_OUT throwaway directory', () => {
    process.env.LIVERY_EDITOR_LOGOS_OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'logos-out-'));
    const calls: string[] = [];
    expect(postTo('/__livery-editor/logo', (r) => calls.push(r), { name: 'acme', kind: 'svg', data: svg })).toBe(200);
    expect(calls).toEqual([]);
  });
});
