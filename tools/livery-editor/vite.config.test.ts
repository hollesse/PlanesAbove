import { describe, expect, it } from 'vitest';
import { proxyFor } from './vite.config';

describe('proxyFor', () => {
  it('sets no proxy without PLANESABOVE_HOME_URL', () => {
    expect(proxyFor({})).toBeUndefined();
    expect(proxyFor({ PLANESABOVE_HOME_URL: '  ' })).toBeUndefined();
  });
  it('proxies /api to the home server when set', () => {
    expect(proxyFor({ PLANESABOVE_HOME_URL: 'http://192.168.1.5:3000' })).toEqual({ '/api': { target: 'http://192.168.1.5:3000', changeOrigin: true } });
  });
});
