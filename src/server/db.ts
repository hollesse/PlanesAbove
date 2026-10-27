// One SQLite file (better-sqlite3, WAL), numbered forward-only migrations tracked by PRAGMA user_version (ADR 0007).
import Database from 'better-sqlite3';
import migration0001 from './migrations/0001-sightings';
import migration0002 from './migrations/0002-route-source';
import migration0003 from './migrations/0003-route-lookups';
import migration0004 from './migrations/0004-flightaware-calls';

export type Db = Database.Database;

/** Ordered by number; index + 1 is the schema version. Add new files at the end only. */
const MIGRATIONS: string[] = [migration0001, migration0002, migration0003, migration0004];
export const LATEST_SCHEMA_VERSION = MIGRATIONS.length;

export function openDatabase(file: string): Db {
  const db = new Database(file);
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  const current = db.pragma('user_version', { simple: true }) as number;
  if (current > LATEST_SCHEMA_VERSION) {
    db.close();
    throw new Error(`Database schema version ${current} is newer than this build (${LATEST_SCHEMA_VERSION}); refusing to start.`);
  }
  for (let v = current; v < LATEST_SCHEMA_VERSION; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
  return db;
}
