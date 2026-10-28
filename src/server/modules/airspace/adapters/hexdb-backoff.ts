// One 429 backoff window for the whole hexdb.io host, shared by the route and the aircraft-type adapter (airspace-t4x9k).
export class HexdbBackoff {
  private until = 0;
  blocked(now: number): boolean { return now < this.until; }
  block(now: number, ms: number): void { this.until = Math.max(this.until, now + ms); }
}
