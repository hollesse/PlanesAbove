import { defineConfig, devices } from '@playwright/test';

// ADR 0003/0004: WebKit is the required E2E engine (closest to iPad Safari). Chromium is an extra project for
// environments where WebKit cannot run (e.g. containers lacking its system libraries):
//   npm run e2e                          -> all projects (WebKit + Chromium)
//   npx playwright test --project=webkit -> the required WebKit run
const PORT = 6007;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: { command: `node scripts/serve-static.mjs storybook-static ${PORT}`, url: `http://127.0.0.1:${PORT}/index.json`, reuseExistingServer: true },
  projects: [
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
