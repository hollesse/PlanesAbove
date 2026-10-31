// Entry point: read config, start the service, exit non-zero on unrecoverable startup errors (ADR 0008).
import { loadConfigLayered } from './config';
import { startService } from './app';

async function main(): Promise<void> {
  const { config, sources } = loadConfigLayered(process.env.CONFIG_PATH ?? './config.yaml');
  // Which keys came from the environment / the override file (names and key paths only, never values; ADR 0030).
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg: 'config layers', env: sources.env, override: sources.override, overrideFile: sources.overrideFile }) + '\n');
  const service = await startService({ config, clientDir: process.env.CLIENT_DIR, timeZone: process.env.TZ });
  const shutdown = (): void => { void service.stop().then(() => process.exit(0)); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e: Error) => {
  process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'startup failed', detail: e.message }) + '\n');
  process.exit(1);
});
