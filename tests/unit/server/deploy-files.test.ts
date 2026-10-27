// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { build } from 'esbuild';
import YAML from 'yaml';
import { parseConfig } from '../../../src/server/config';
import { parseScenario } from '../../../src/server/mock/scenario';

const read = (p: string): string => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

describe('shipped files stay valid', () => {
  it('config.example.yaml passes the zod schema (sample coordinates, no real location)', () => {
    const c = parseConfig(read('config.example.yaml'));
    expect(c.location).toEqual({ lat: 50.05, lon: 8.57 });
    expect(c.radiusKm).toBe(30);
  });
  it.each(['empty-sky', 'one-plane', 'two-planes', 'switch-during-narration', 'outage-recovery'])('scenario %s parses', (n) => {
    expect(parseScenario(read(`scenarios/${n}.json`)).name).toBe(n);
  });
  it('docker-compose.yml has the planesabove service plus optional tts and storybook profiles (ADR 0008)', () => {
    const c = YAML.parse(read('docker-compose.yml')).services;
    expect(c.planesabove.restart).toBe('unless-stopped');
    expect(c.planesabove.healthcheck.test.join(' ')).toContain('/healthz');
    expect(c.planesabove.profiles).toBeUndefined();
    expect(c.tts.profiles).toEqual(['tts']);
    expect(c.storybook.profiles).toEqual(['storybook']);
    expect(c.storybook.restart).toBe('unless-stopped');
  });
  it('the app client bundles for the Safari 16 / ES2020 baseline (ADR 0004)', async () => {
    const r = await build({ entryPoints: [new URL('../../../src/client/app/main.ts', import.meta.url).pathname], bundle: true, write: false, outdir: 'out', target: ['es2020', 'safari16'], loader: { '.woff2': 'file', '.png': 'file' }, logLevel: 'silent' });
    expect(r.errors).toEqual([]);
  });
});
