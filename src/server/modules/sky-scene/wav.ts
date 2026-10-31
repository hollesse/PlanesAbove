/** Minimal PCM WAV helpers: a silent clip for the fake adapter, and the duration of a WAV for any adapter. */
export function makeSilentWav(durationMs: number, sampleRate = 8000): Uint8Array {
  const samples = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const buf = Buffer.alloc(44 + samples);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples, 40);
  buf.fill(128, 44); // 8-bit unsigned PCM silence
  return buf;
}

/** Duration of a PCM WAV in ms, or undefined when the bytes are not a readable WAV. */
export function wavDurationMs(bytes: Uint8Array): number | undefined {
  const b = Buffer.from(bytes);
  if (b.length < 44 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return undefined;
  let off = 12; let byteRate = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4); const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(off + 16);
    if (id === 'data') return byteRate ? Math.round((Math.min(size, b.length - off - 8) / byteRate) * 1000) : undefined;
    off += 8 + size + (size % 2);
  }
  return undefined;
}

/** Wraps raw 16-bit mono little-endian PCM (e.g. ElevenLabs `pcm_22050`) into a WAV so the cache, route and client stay WAV-only. */
export function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + pcm.length, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(pcm.length, 40);
  Buffer.from(pcm).copy(buf, 44);
  return buf;
}

export class WavFormatError extends Error {}

interface ParsedWav { rate: number; channels: number; bits: number; data: Buffer }
function parseWav(bytes: Uint8Array): ParsedWav {
  const b = Buffer.from(bytes);
  if (b.length < 44 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new WavFormatError('not a WAV');
  let off = 12; let rate = 0; let channels = 0; let bits = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4); const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') { channels = b.readUInt16LE(off + 10); rate = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === 'data') return { rate, channels, bits, data: b.subarray(off + 8, Math.min(b.length, off + 8 + size)) };
    off += 8 + size + (size % 2);
  }
  throw new WavFormatError('no data chunk');
}

/** Joins PCM WAVs with `gapMs` of silence between them (plain PCM append, no re-encoding). Throws WavFormatError when the formats differ. */
export function concatWav(parts: Uint8Array[], gapMs: number): Uint8Array {
  if (parts.length === 0) throw new WavFormatError('nothing to concatenate');
  const ps = parts.map(parseWav);
  const f = ps[0];
  if (ps.some((p) => p.rate !== f.rate || p.channels !== f.channels || p.bits !== f.bits)) throw new WavFormatError(`parts differ in format (sample rates ${ps.map((p) => p.rate).join('/')})`);
  const align = f.channels * (f.bits / 8);
  const gap = Buffer.alloc(Math.round((f.rate * gapMs) / 1000) * align, f.bits === 8 ? 128 : 0);
  const chunks: Buffer[] = [];
  ps.forEach((p, i) => { if (i > 0) chunks.push(gap); chunks.push(p.data); });
  const data = Buffer.concat(chunks);
  const buf = Buffer.alloc(44 + data.length);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data.length, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(f.channels, 22);
  buf.writeUInt32LE(f.rate, 24); buf.writeUInt32LE(f.rate * align, 28); buf.writeUInt16LE(align, 32); buf.writeUInt16LE(f.bits, 34);
  buf.write('data', 36); buf.writeUInt32LE(data.length, 40);
  data.copy(buf, 44);
  return buf;
}
