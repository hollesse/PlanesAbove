// Download + atomic swap of the VRS standing-data snapshot (CC0, github.com/vradarserver/standing-data), ADR 0014 / ADR 0007.
// The snapshot is a separate replaceable file tree in dataDir (not part of the SQLite DB). Only routes/schema-01 and
// airports/schema-01 are kept from the repo tarball (~50 MB download, ~22 MB kept).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { guardedFetch, type Fetch } from './http';

export const VRS_TARBALL_URL = 'https://codeload.github.com/vradarserver/standing-data/tar.gz/refs/heads/main';
export const FETCHED_AT_FILE = 'fetched-at.txt';
const KEEP = ['routes/schema-01/', 'airports/schema-01/'];

/** Yields regular files of a (decompressed) tar archive. Handles ustar prefix and pax `path` records. */
export function* tarFiles(tar: Buffer): Generator<{ name: string; data: Buffer }> {
  let off = 0;
  let paxPath: string | undefined;
  const str = (b: Buffer): string => { const z = b.indexOf(0); return b.subarray(0, z < 0 ? b.length : z).toString('utf8'); };
  while (off + 512 <= tar.length) {
    const h = tar.subarray(off, off + 512);
    if (h.every((x) => x === 0)) return;
    const size = parseInt(str(h.subarray(124, 136)).trim() || '0', 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(h.subarray(345, 500));
    let name = (prefix ? prefix + '/' : '') + str(h.subarray(0, 100));
    const data = tar.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') { const m = /\d+ path=([^\n]*)\n/.exec(data.toString('utf8')); paxPath = m?.[1]; continue; }
    if (type === 'g') continue;
    if (paxPath) { name = paxPath; paxPath = undefined; }
    if (type === '0') yield { name, data };
  }
}

export interface SnapshotPaths { root: string; tmp: string; old: string }
export const snapshotPaths = (dataDir: string): SnapshotPaths => ({ root: path.join(dataDir, 'vrs-standing-data'), tmp: path.join(dataDir, 'vrs-standing-data.tmp'), old: path.join(dataDir, 'vrs-standing-data.old') });

/** Crash recovery: a swap interrupted between its two renames leaves only `.old`; put it back. */
export function recoverSnapshot(p: SnapshotPaths): void {
  if (!fs.existsSync(p.root) && fs.existsSync(p.old)) fs.renameSync(p.old, p.root);
}

/** Downloads the tarball, extracts routes/ + airports/ into a temp dir, then swaps it in. On any failure the old snapshot stays untouched. */
export async function downloadSnapshot(o: { fetch: Fetch; dataDir: string; userAgent: string; timeoutMs: number; now: number; url?: string }): Promise<void> {
  const p = snapshotPaths(o.dataDir);
  recoverSnapshot(p);
  fs.rmSync(p.tmp, { recursive: true, force: true });
  try {
    const res = await guardedFetch(o.fetch, o.url ?? VRS_TARBALL_URL, { headers: { 'user-agent': o.userAgent } }, o.timeoutMs);
    const tar = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
    let routes = 0;
    let airports = 0;
    for (const f of tarFiles(tar)) {
      const rel = f.name.split('/').slice(1).join('/'); // drop "standing-data-<ref>/"
      if (!rel.endsWith('.csv') || !KEEP.some((k) => rel.startsWith(k)) || rel.split('/').includes('..')) continue;
      const dest = path.join(p.tmp, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, f.data);
      if (rel.startsWith('routes/')) routes++; else airports++;
    }
    if (!routes || !airports) throw new Error('archive contains no routes/airports csv files');
    fs.writeFileSync(path.join(p.tmp, FETCHED_AT_FILE), String(o.now));
    fs.rmSync(p.old, { recursive: true, force: true });
    if (fs.existsSync(p.root)) fs.renameSync(p.root, p.old);
    try { fs.renameSync(p.tmp, p.root); } catch (e) { if (fs.existsSync(p.old)) fs.renameSync(p.old, p.root); throw e; }
    fs.rmSync(p.old, { recursive: true, force: true });
  } catch (e) {
    fs.rmSync(p.tmp, { recursive: true, force: true });
    throw e;
  }
}
