import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// ADR 0003/0004: WebKit is the required E2E engine (closest to iPad Safari). Chromium is an extra project for
// environments where WebKit cannot run (e.g. containers lacking its system libraries):
//   npm run e2e                          -> all projects (WebKit + Chromium)
//   npx playwright test --project=webkit -> the required WebKit run
const PORT = 6007;
// ADR 0037: the editor's own Chromium-only project; it writes into a throwaway directory, never into the repo.
export const EDITOR_PORT = 5174;
export const EDITOR_OUT = path.join(os.tmpdir(), 'pa-editor-out');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: [
    { command: `node scripts/serve-static.mjs storybook-static ${PORT}`, url: `http://127.0.0.1:${PORT}/index.json`, reuseExistingServer: true },
    // never reuse: a hand-started editor would write into the repo
    { command: 'npm run editor', url: `http://127.0.0.1:${EDITOR_PORT}/`, reuseExistingServer: false, env: { LIVERY_EDITOR_OUT: EDITOR_OUT } },
  ],
  projects: [
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'editor-chromium', testDir: 'tests/e2e-editor', use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${EDITOR_PORT}` } },
  ],
});
