import fs from 'node:fs';
import path from 'node:path';

// Logo upload: the second, equally narrow write path of the editor (ADR 0035 point 3). Validates name, size and content,
// derives the target from the name only (never a client path), never overwrites, writes atomically.

export interface LogoSaveResult { status: number; message: string; written?: string[]; svg?: string }

export const LOGO_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const MAX_LOGO_BYTES = 512 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Why an SVG text is unsafe to embed, or null. */
export function svgProblem(text: string): string | null {
  if (!/<svg[\s>]/i.test(text)) return 'Keine SVG-Datei.';
  if (/<script/i.test(text)) return 'SVG enthält ein script-Element.';
  if (/<\s*(?:foreignObject|iframe|embed|object|applet|meta|link)\b/i.test(text)) return 'SVG enthält ein unzulässiges Element.';
  if (/[\s/"'`]on[a-z]+\s*=/i.test(text)) return 'SVG enthält Ereignis-Attribute (on…=).';
  for (const m of text.matchAll(/(?:^|[^a-z0-9_-])(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const v = (m[1] ?? m[2] ?? m[3] ?? '').replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
    if (!v.startsWith('#') && !v.startsWith('data:')) return 'SVG verweist auf externe Ressourcen.';
  }
  const CSS_BAD = /url\(|expression\(|@import/i;
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)(?:<\/style|$)/gi)) if (CSS_BAD.test(m[1])) return 'SVG-style-Block enthält url()/expression().';
  for (const m of text.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) if (CSS_BAD.test(m[1] ?? m[2] ?? m[3] ?? '')) return 'SVG-style-Attribut enthält url()/expression().';
  if (!/^<svg[^>]*?\sviewBox="/i.test(text.replace(/^[\s\S]*?(?=<svg[\s>])/i, ''))) return 'SVG braucht ein viewBox-Attribut.';
  return null;
}

/** Width/height from the PNG's IHDR chunk, or null. */
export function pngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return w > 0 && h > 0 ? { w, h } : null;
}

const atomicWrite = (target: string, data: string | Buffer) => {
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, target);
};

/** Body: `{ name, kind: 'svg' | 'png', data }` — data is the SVG text, or the PNG as base64. */
export function saveLogo(body: unknown, logosDir: string): LogoSaveResult {
  const b = (body ?? {}) as { name?: unknown; kind?: unknown; data?: unknown };
  if (typeof b.name !== 'string' || !LOGO_NAME.test(b.name)) return { status: 400, message: 'Ungültiger Logo-Name (erlaubt: a-z, 0-9, Bindestrich, max. 32 Zeichen).' };
  if ((b.kind !== 'svg' && b.kind !== 'png') || typeof b.data !== 'string') return { status: 400, message: 'Ungültige Anfrage (kind svg|png und data erwartet).' };
  const name = b.name;

  const root = path.resolve(logosDir);
  const svgTarget = path.resolve(root, `${name}.svg`);
  const pngTarget = path.resolve(root, `${name}.png`);
  if (!svgTarget.startsWith(root + path.sep) || !pngTarget.startsWith(root + path.sep)) return { status: 400, message: 'Zielpfad außerhalb des erlaubten Verzeichnisses.' };

  let svgText: string;
  let png: Buffer | null = null;
  if (b.kind === 'svg') {
    if (Buffer.byteLength(b.data) > MAX_LOGO_BYTES) return { status: 413, message: 'Datei zu groß (max. 512 KB).' };
    const problem = svgProblem(b.data);
    if (problem) return { status: 400, message: problem };
    svgText = b.data;
  } else {
    png = Buffer.from(b.data, 'base64');
    if (png.length > MAX_LOGO_BYTES) return { status: 413, message: 'Datei zu groß (max. 512 KB).' };
    if (png.length < 8 || !png.subarray(0, 8).equals(PNG_MAGIC)) return { status: 400, message: 'Keine gültige PNG-Datei.' };
    const size = pngSize(png);
    if (!size) return { status: 400, message: 'PNG-Kopf (IHDR) nicht lesbar.' };
    svgText = `<svg data-anchor="logo-tail-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.w} ${size.h}"><image href="${name}.png" x="0" y="0" width="${size.w}" height="${size.h}"></image></svg>`;
  }

  if (fs.existsSync(svgTarget) || fs.existsSync(pngTarget)) return { status: 409, message: `Logo „${name}“ existiert bereits.` };
  fs.mkdirSync(root, { recursive: true });
  const written: string[] = [];
  if (png) { atomicWrite(pngTarget, png); written.push(pngTarget); }
  atomicWrite(svgTarget, svgText);
  written.push(svgTarget);
  return { status: 200, message: `Logo „${name}“ gespeichert.`, written, svg: svgText };
}
