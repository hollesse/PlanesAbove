import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = resolve(__dirname, '../..');
const load = (f: string) => parse(readFileSync(resolve(root, f), 'utf8'));

describe('deploy workflow (ADR 0022)', () => {
  const wf = load('.github/workflows/deploy.yml');

  it('triggers on push to main', () => {
    expect(wf.on.push.branches).toEqual(['main']);
  });

  it('publishes only after the test and e2e jobs (a failing test publishes no image)', () => {
    expect(wf.jobs.publish.needs).toEqual(['test', 'e2e']);
    const steps = wf.jobs.test.steps.map((s: { run?: string }) => s.run).filter(Boolean);
    expect(steps).toEqual(['npm ci', 'npm run typecheck', 'npm test', 'npm run build']);
    expect(wf.jobs.publish.permissions.packages).toBe('write');
  });

  it('makes e2e a blocking gate before publish (ADR 0022 amendment 2026-10-28)', () => {
    expect(wf.jobs.e2e.needs).toBe('test');
    expect(wf.jobs.e2e['continue-on-error']).toBeUndefined();
    expect(wf.jobs.e2e.steps.map((s: { run?: string }) => s.run).filter(Boolean)).toContain('npm run e2e');
  });

  it('builds Piper only on a push-range change, force_tts or a missing image', () => {
    const steps = wf.jobs.publish.steps as { uses?: string; with?: Record<string, unknown>; id?: string; run?: string; if?: string }[];
    const checkout = steps.find((s) => s.uses?.startsWith('actions/checkout'));
    expect(checkout?.with?.['fetch-depth']).toBe(0);
    const decide = steps.find((s) => s.id === 'tts');
    expect(decide?.run).toContain('github.event.before');
    expect(decide?.run).toContain('github.sha');
    expect(decide?.run).toContain('docker/piper');
    expect(decide?.run).not.toContain('HEAD^');
    expect(decide?.run).toContain('force_tts');
    expect(decide?.run).toContain('docker manifest inspect');
    const build = steps.find((s) => s.uses?.startsWith('docker/build-push-action') && s.with?.context === 'docker/piper');
    expect(build?.if).toBe("steps.tts.outputs.build == 'true'");
  });
});

describe('docker-compose.yml (ADR 0022)', () => {
  const c = load('docker-compose.yml');
  const label = 'com.centurylinklabs.watchtower.enable=true';

  it('points planesabove and tts at GHCR with the watchtower label', () => {
    expect(c.services.planesabove.image).toBe('ghcr.io/hollesse/planesabove:main');
    expect(c.services.tts.image).toBe('ghcr.io/hollesse/planesabove-tts:main');
    expect(c.services.planesabove.labels).toContain(label);
    expect(c.services.tts.labels).toContain(label);
    expect(c.services.planesabove.build).toBeDefined();
  });

  it('has a label-filtered watchtower with the docker socket', () => {
    const w = c.services.watchtower;
    expect(w.image).toContain('watchtower');
    expect(w.image).not.toContain('containrrr');
    expect(w.command).toContain('--label-enable');
    expect(w.volumes).toContain('/var/run/docker.sock:/var/run/docker.sock');
  });
});

describe('docker-compose.zimaos.yml (UI import on ZimaOS)', () => {
  const c = load('docker-compose.zimaos.yml');
  const label = 'com.centurylinklabs.watchtower.enable=true';
  const volumes = (Object.values(c.services) as { volumes?: string[] }[]).flatMap((s) => s.volumes ?? []);

  it('has no build, no profiles, no relative bind mount and no storybook', () => {
    for (const svc of Object.values(c.services) as Record<string, unknown>[]) {
      expect(svc.build).toBeUndefined();
      expect(svc.profiles).toBeUndefined();
    }
    expect(c.services.storybook).toBeUndefined();
    expect(volumes.length).toBeGreaterThan(0);
    for (const v of volumes) expect(v.split(':')[0].startsWith('/')).toBe(true);
  });

  it('runs planesabove and tts from GHCR with the watchtower label', () => {
    expect(c.services.planesabove.image).toBe('ghcr.io/hollesse/planesabove:main');
    expect(c.services.tts.image).toBe('ghcr.io/hollesse/planesabove-tts:main');
    expect(c.services.planesabove.labels).toContain(label);
    expect(c.services.tts.labels).toContain(label);
    const p = c.services.planesabove;
    expect(p.healthcheck).toBeDefined();
    expect(p.ports).toContain('8080:8080');
    expect(p.environment.CONFIG_PATH).toBe('/config/config.yaml');
    expect(p.environment.TZ).toBeDefined();
  });

  it('uses the maintained watchtower fork, not containrrr', () => {
    const w = c.services.watchtower;
    expect(w.image).toContain('nickfedor/watchtower');
    expect(w.command).toContain('--label-enable');
    expect(w.volumes).toContain('/var/run/docker.sock:/var/run/docker.sock');
  });
});
