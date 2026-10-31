// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildConfig, ConfigError, ENV_VARS, loadConfigLayered, mergeLayers } from '../../../src/server/config';

const read = (p: string): string => fs.readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');
const REPO = read('config.yaml');
const REQUIRED_ENV = { PLANESABOVE_LAT: '50.05', PLANESABOVE_LON: '8.57', PLANESABOVE_PLACE: 'Testdorf' };

describe('the checked-in config.yaml (ADR 0030)', () => {
  it('contains no coordinates, no place name and no secret keys', () => {
    const noComments = REPO.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    expect(noComments).not.toMatch(/\b(lat|lon)\s*:\s*-?\d/);
    expect(noComments).not.toMatch(/api[-_]?key\s*:/i);
    expect(noComments).not.toMatch(/^place:[ \t]*[^\s#]/m);
    expect(noComments).not.toMatch(/^location:[ \t]*[^\s#]/m);
    expect(noComments).not.toMatch(/heartbeat/i);
  });
});

describe('required values (ADR 0030)', () => {
  it('refuses to start without location and place and names every missing variable', () => {
    try { buildConfig({ repoYaml: REPO, env: {} }); expect.unreachable(); } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      for (const v of ['PLANESABOVE_LAT', 'PLANESABOVE_LON', 'PLANESABOVE_PLACE']) expect((e as Error).message).toContain(v);
    }
    expect(() => buildConfig({ repoYaml: REPO, env: { PLANESABOVE_LAT: '50', PLANESABOVE_LON: '8' } })).toThrow(/PLANESABOVE_PLACE/);
  });
  it('treats empty variables as unset (compose passes ${X:-} through)', () => {
    expect(() => buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_PLACE: '  ' } })).toThrow(/PLANESABOVE_PLACE/);
    expect(buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_RADIUS_KM: '' } }).config.radiusKm).toBe(30);
  });
  it('converts numbers and booleans', () => {
    const { config: c } = buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_RADIUS_KM: '25', PLANESABOVE_PORT: '9000', PLANESABOVE_FLIGHTAWARE_ENABLED: 'TRUE' } });
    expect(c.location).toEqual({ lat: 50.05, lon: 8.57 });
    expect(c).toMatchObject({ place: 'Testdorf', radiusKm: 25, port: 9000 });
    expect(c.sources.route.order).toEqual(['hexdb', 'adsbdb', 'vrs', 'flightaware']);
  });
  it('rejects invalid values naming the variable, and schema ranges by key path', () => {
    expect(() => buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_LAT: 'north' } })).toThrow(/PLANESABOVE_LAT/);
    expect(() => buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_FLIGHTAWARE_ENABLED: 'maybe' } })).toThrow(/PLANESABOVE_FLIGHTAWARE_ENABLED/);
    expect(() => buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_LAT: '95' } })).toThrow(/location\.lat/);
    expect(() => buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_LOG_LEVEL: 'loud' } })).toThrow(/logLevel/);
  });
});

describe('layer order repo -> env -> override (ADR 0030)', () => {
  it('env beats the repo file', () => {
    expect(buildConfig({ repoYaml: REPO + '\n', env: { ...REQUIRED_ENV, PLANESABOVE_LOG_LEVEL: 'debug' } }).config.logLevel).toBe('debug');
    expect(buildConfig({ repoYaml: REPO, env: REQUIRED_ENV }).config.logLevel).toBe('info');
  });
  it('the override file beats env and is merged deeply', () => {
    const over = 'radiusKm: 12\nsources:\n  route:\n    hexdb:\n      timeoutMs: 9000\n';
    const { config: c, sources } = buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_RADIUS_KM: '25' }, overrideYaml: over, overrideFile: '/config/override.yaml' });
    expect(c.radiusKm).toBe(12);
    expect(c.sources.route.hexdb).toEqual({ timeoutMs: 9000, backoffMinutes: 5 });
    expect(c.sources.route.adsbdb.timeoutMs).toBe(5000);
    expect(sources.override).toEqual(['radiusKm', 'sources.route.hexdb.timeoutMs']);
    expect(sources.env).toContain('PLANESABOVE_RADIUS_KM');
  });
  it('lists are replaced, not united', () => {
    expect(mergeLayers({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
    const { config: c } = buildConfig({ repoYaml: REPO, env: REQUIRED_ENV, overrideYaml: 'sources:\n  flight:\n    order: [adsb-lol]\n' });
    expect(c.sources.flight.order).toEqual(['adsb-lol']);
    const o = buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, PLANESABOVE_FLIGHTAWARE_ENABLED: 'true' }, overrideYaml: 'sources:\n  route:\n    order: [vrs]\n' });
    expect(o.config.sources.route.order).toEqual(['vrs']);
  });
  it('reports which variables came from the environment, never values', () => {
    const { sources } = buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, ELEVENLABS_API_KEY: 'sk-secret' } });
    expect(sources.env).toEqual(['PLANESABOVE_LAT', 'PLANESABOVE_LON', 'PLANESABOVE_PLACE']);
    expect(JSON.stringify(sources)).not.toContain('sk-secret');
  });
});

describe('a stored key does not switch a feature on (ADR 0030)', () => {
  it('ELEVENLABS_API_KEY without PLANESABOVE_SPEECH_ADAPTER keeps piper', () => {
    expect(buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, ELEVENLABS_API_KEY: 'k' } }).config.speech.adapter).toBe('piper');
    const on = buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, ELEVENLABS_API_KEY: 'k', PLANESABOVE_SPEECH_ADAPTER: 'elevenlabs', PLANESABOVE_SPEECH_VOICE: 'v1' } }).config;
    expect(on.speech).toMatchObject({ adapter: 'elevenlabs', voice: 'v1' });
  });
  it('FLIGHTAWARE_API_KEY without PLANESABOVE_FLIGHTAWARE_ENABLED leaves the route order alone; false does too', () => {
    expect(buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, FLIGHTAWARE_API_KEY: 'k' } }).config.sources.route.order).not.toContain('flightaware');
    expect(buildConfig({ repoYaml: REPO, env: { ...REQUIRED_ENV, FLIGHTAWARE_API_KEY: 'k', PLANESABOVE_FLIGHTAWARE_ENABLED: 'false' } }).config.sources.route.order).not.toContain('flightaware');
  });
});

describe('loadConfigLayered (files)', () => {
  const tmp = (name: string, text: string): string => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-cfg-')); const f = path.join(d, name); fs.writeFileSync(f, text); return f; };
  it('reads the repo file and the override file named by PLANESABOVE_CONFIG_OVERRIDE', () => {
    const repo = tmp('config.yaml', REPO);
    const over = tmp('override.yaml', 'logLevel: warn\n');
    expect(loadConfigLayered(repo, { ...REQUIRED_ENV, PLANESABOVE_CONFIG_OVERRIDE: over }).config.logLevel).toBe('warn');
    expect(loadConfigLayered(repo, REQUIRED_ENV).sources.overrideFile).toBeUndefined();
  });
  it('fails readably when a named file is missing', () => {
    expect(() => loadConfigLayered('/nope/config.yaml', REQUIRED_ENV)).toThrow(/not found/);
    expect(() => loadConfigLayered(tmp('config.yaml', REPO), { ...REQUIRED_ENV, PLANESABOVE_CONFIG_OVERRIDE: '/nope/o.yaml' })).toThrow(/Override file not found/);
  });
});

describe('README documents every PLANESABOVE_* variable read in src/server (ADR 0030)', () => {
  it('lists them all in the Konfiguration table', () => {
    const readme = read('README.md');
    const section = readme.slice(readme.indexOf('## Konfiguration'), readme.indexOf('## Betrieb auf dem Heimserver'));
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const dir = new URL('../../../src/server', import.meta.url).pathname;
    const used = new Set(walk(dir).filter((f) => f.endsWith('.ts')).flatMap((f) => fs.readFileSync(f, 'utf8').match(/PLANESABOVE_[A-Z_]+/g) ?? []));
    expect(used.size).toBeGreaterThanOrEqual(ENV_VARS.length);
    for (const v of used) expect(section, v).toContain(`| \`${v}\``);
    for (const part of ['(a)', '(b)', '(c)', '(d)', '(e)']) expect(section).toContain(`**${part}`);
  });
});
