import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { pngSize, saveLogo, svgProblem } from './logo-save';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>';
function png(w: number, h: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}
let dir: string;
beforeEach(() => { dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'logos-')), 'logos'); });

describe('saveLogo', () => {
  it('writes a valid SVG atomically', () => {
    const r = saveLogo({ name: 'acme', kind: 'svg', data: SVG }, dir);
    expect(r.status).toBe(200);
    expect(r.written).toEqual([path.join(dir, 'acme.svg')]);
    expect(fs.readFileSync(path.join(dir, 'acme.svg'), 'utf8')).toBe(SVG);
    expect(fs.readdirSync(dir)).toEqual(['acme.svg']);
  });
  it('writes a PNG plus a wrapper SVG with the IHDR dimensions', () => {
    const r = saveLogo({ name: 'acme', kind: 'png', data: png(320, 160).toString('base64') }, dir);
    expect(r.status).toBe(200);
    expect(r.written).toHaveLength(2);
    const svg = fs.readFileSync(path.join(dir, 'acme.svg'), 'utf8');
    expect(svg).toContain('<image href="acme.png"');
    expect(svg).toContain('width="320" height="160"');
    expect(svg).toContain('viewBox="0 0 320 160"');
  });
  it.each(['../evil', 'Acme', '', '-x', 'a'.repeat(33), 'a/b'])('rejects name %j', (name) => {
    expect(saveLogo({ name, kind: 'svg', data: SVG }, dir).status).toBe(400);
  });
  it('rejects a bad PNG signature', () => {
    expect(saveLogo({ name: 'acme', kind: 'png', data: Buffer.from('not a png at all, really').toString('base64') }, dir).status).toBe(400);
  });
  it('rejects files over 512 KB', () => {
    expect(saveLogo({ name: 'acme', kind: 'svg', data: SVG + ' '.repeat(513 * 1024) }, dir).status).toBe(413);
  });
  it('never overwrites an existing logo (409)', () => {
    expect(saveLogo({ name: 'acme', kind: 'svg', data: SVG }, dir).status).toBe(200);
    expect(saveLogo({ name: 'acme', kind: 'svg', data: SVG.replace('rect', 'circle') }, dir).status).toBe(409);
    expect(fs.readFileSync(path.join(dir, 'acme.svg'), 'utf8')).toBe(SVG);
  });
});

describe('svgProblem', () => {
  it.each([
    ['script element', '<svg viewBox="0 0 1 1"><script>x</script></svg>'],
    ['on* attribute', '<svg viewBox="0 0 1 1"><rect onclick="x()"/></svg>'],
    ['external href', '<svg viewBox="0 0 1 1"><image href="http://x/y.png"/></svg>'],
    ['external xlink:href', '<svg viewBox="0 0 1 1"><use xlink:href="evil.svg#a"/></svg>'],
    ['slash-separated on* attribute', '<svg viewBox="0 0 1 1"><image/onerror="alert(1)" href="#x"/></svg>'],
    ['quote-separated on* attribute', '<svg viewBox="0 0 1 1"><rect fill="red"onclick="x()"/></svg>'],
    ['unquoted javascript href', '<svg viewBox="0 0 1 1"><a href=javascript:alert(1)><rect/></a></svg>'],
    ['mixed-case spaced javascript href', '<svg viewBox="0 0 1 1"><a href=" JaVa\tScRiPt:alert(1)"><rect/></a></svg>'],
    ['unquoted external href', '<svg viewBox="0 0 1 1"><image href=http://evil/x.png /></svg>'],
    ['foreignObject', '<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>'],
    ['iframe', '<svg viewBox="0 0 1 1"><iframe src="#"/></svg>'],
    ['embed', '<svg viewBox="0 0 1 1"><embed src="#"/></svg>'],
    ['object', '<svg viewBox="0 0 1 1"><object data="#"/></svg>'],
    ['use with external href', '<svg viewBox="0 0 1 1"><use href="https://evil/a.svg#a"/></svg>'],
    ['style block with url()', '<svg viewBox="0 0 1 1"><style>rect{fill:url(http://evil/x)}</style></svg>'],
    ['style block with expression()', '<svg viewBox="0 0 1 1"><style>rect{width:expression(alert(1))}</style></svg>'],
    ['style attribute with url()', '<svg viewBox="0 0 1 1"><rect style="fill:url(http://evil/x)"/></svg>'],
    ['missing viewBox', '<svg><rect/></svg>'],
    ['not svg', 'hello'],
  ])('rejects %s', (_n, text) => expect(svgProblem(text)).not.toBeNull());
  it('accepts harmless style and fill urls to fragments are still inspected conservatively', () => {
    expect(svgProblem('<svg viewBox="0 0 1 1"><style>rect{fill:red}</style><rect style="fill:blue"/></svg>')).toBeNull();
  });
  it('accepts fragment and data hrefs', () => {
    expect(svgProblem('<svg viewBox="0 0 1 1"><use href="#a"/><image href="data:image/png;base64,AAAA"/></svg>')).toBeNull();
  });
});
describe('pngSize', () => { it('reads IHDR', () => expect(pngSize(png(5, 7))).toEqual({ w: 5, h: 7 })); });
