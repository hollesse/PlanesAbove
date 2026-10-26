import type { StorybookConfig } from '@storybook/html-vite';

// Storybook-first design system (ADR 0002): runs on the dev machine / home server only, never shipped to the iPad.
const config: StorybookConfig = {
  stories: ['../src/client/ui/**/*.stories.ts'],
  framework: { name: '@storybook/html-vite', options: {} },
  core: { disableTelemetry: true },
  viteFinal: async (cfg) => {
    cfg.build = { ...cfg.build, target: ['es2020', 'safari16'] };
    return cfg;
  },
};
export default config;
