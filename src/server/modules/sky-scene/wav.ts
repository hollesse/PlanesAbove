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
