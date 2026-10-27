// JSON-line logger (ADR 0011). Never pass secret values or credential-bearing URLs in fields.
import type { Clock } from './clock';

export type Level = 'debug' | 'info' | 'warn' | 'error';
const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface Logger {
  log(level: Level, msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export function createLogger(clock: Clock, level: Level = 'info', write: (line: string) => void = (l) => process.stdout.write(l + '\n')): Logger {
  const log = (lv: Level, msg: string, fields: Record<string, unknown> = {}): void => {
    if (RANK[lv] < RANK[level]) return;
    write(JSON.stringify({ ts: new Date(clock.now()).toISOString(), level: lv, msg, ...fields }));
  };
  return { log, info: (m, f) => log('info', m, f), warn: (m, f) => log('warn', m, f), error: (m, f) => log('error', m, f) };
}

export const silentLogger: Logger = { log() {}, info() {}, warn() {}, error() {} };
