import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const details = readFileSync('src/client/ui/assets/planes/narrowbody/details.svg', 'utf8');
const legacy = readFileSync('src/client/ui/assets/svg/narrowbody.svg', 'utf8');

describe('narrowbody details.svg cockpit windows', () => {
  it('keeps the side cockpit windows of the legacy graphic (windshield follows the new nose, liveries-ygdxc)', () => {
    const legacyD = legacy.match(/class="paint-window-line"[^>]*\sd="([^"]+)"/)![1];
    const subs = legacyD.split(/ (?=M)/);
    expect(subs.length).toBeGreaterThan(1);
    for (const sub of subs.slice(1)) expect(details).toContain(sub);
  });
  it('keeps engine inlet ring and fan', () => {
    expect(details).toContain('<ellipse');
    expect(details).toContain('stroke-linecap="round"');
  });
});
