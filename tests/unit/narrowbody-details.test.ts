import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const details = readFileSync('src/client/ui/assets/planes/narrowbody/details.svg', 'utf8');
const legacy = readFileSync('src/client/ui/assets/svg/narrowbody.svg', 'utf8');

describe('narrowbody details.svg cockpit windows', () => {
  it('contains the complete paint-window-line path of the legacy graphic', () => {
    const legacyD = legacy.match(/class="paint-window-line"[^>]*\sd="([^"]+)"/)![1];
    expect(legacyD.match(/M/g)!.length).toBeGreaterThan(1);
    expect(details).toContain(`fill="#3A3F44" d="${legacyD}"`);
  });
  it('keeps engine inlet ring and fan', () => {
    expect(details).toContain('<ellipse');
    expect(details).toContain('stroke-linecap="round"');
  });
});
