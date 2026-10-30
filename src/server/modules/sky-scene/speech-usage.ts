// Monthly character counter of the metered speech adapter, persisted in SQLite so a restart does not reset the budget (ADR 0012).
import type { Clock } from '../../clock';
import type { Db } from '../../db';

export class SpeechUsage {
  constructor(private readonly db: Db, private readonly clock: Clock, private readonly timeZone = 'Europe/Berlin') {}

  private month(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.timeZone, year: 'numeric', month: '2-digit' }).format(this.clock.now()).slice(0, 7);
  }

  characters(): number {
    const row = this.db.prepare('SELECT characters FROM speech_usage WHERE month = ?').get(this.month()) as { characters: number } | undefined;
    return row?.characters ?? 0;
  }

  add(n: number): number {
    this.db.prepare('INSERT INTO speech_usage (month, characters) VALUES (?, ?) ON CONFLICT(month) DO UPDATE SET characters = characters + excluded.characters').run(this.month(), n);
    return this.characters();
  }
}
