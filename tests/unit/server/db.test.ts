// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { openDatabase, LATEST_SCHEMA_VERSION } from '../../../src/server/db';

describe('openDatabase (ADR 0007)', () => {
  it('applies numbered migrations and records them in PRAGMA user_version', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
    expect(db.prepare("select name from sqlite_master where name='sightings'").get()).toBeTruthy();
  });
  it('uses WAL and foreign keys on a file database and is idempotent on reopen', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const db = openDatabase(file);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
    expect(openDatabase(file).pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
  });
  it('refuses to start when the database is newer than the code', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pa-')), 'x.db');
    const raw = new Database(file);
    raw.pragma(`user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    raw.close();
    expect(() => openDatabase(file)).toThrow(/newer/);
  });
});
