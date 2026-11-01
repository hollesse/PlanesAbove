import fs from 'node:fs';
import path from 'node:path';
import { LIVERY_ID, LiveryFileSchema } from '../../src/client/ui/domain/livery-file';

// The only write path of the editor (ADR 0035 point 3): validate with zod, derive the target from livery id + Typklasse
// (never from a client-supplied path), allow-list, traversal guard, atomic write.

export interface SaveResult { status: number; message: string; file?: string }

/** `outDir` is the allow-listed root (the repo's liveries directory, or LIVERY_EDITOR_OUT in tests). */
export function saveLivery(body: unknown, outDir: string): SaveResult {
  const idRaw = (body as { livery?: unknown } | null)?.livery;
  if (typeof idRaw !== 'string' || !LIVERY_ID.test(idRaw)) return { status: 400, message: 'Ungültige Lackierungs-ID (erlaubt: a-z, 0-9, Bindestrich).' };
  const parsed = LiveryFileSchema.safeParse(body);
  if (!parsed.success) return { status: 400, message: `Ungültige Lackierungsdatei: ${parsed.error.issues[0]?.message ?? 'Schema'}` };
  const file = parsed.data;

  const root = path.resolve(outDir);
  const target = path.resolve(root, file.livery, `${file.typklasse}.json`);
  if (!target.startsWith(root + path.sep)) return { status: 400, message: 'Zielpfad außerhalb des erlaubten Verzeichnisses.' };

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(file, null, 2) + '\n');
  fs.renameSync(tmp, target);
  return { status: 200, message: `Gespeichert: ${path.relative(root, target)}`, file: target };
}
