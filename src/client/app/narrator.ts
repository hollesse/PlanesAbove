// Client Narrator (ADR 0012): plays a server-rendered audio URL with an <audio> element and holds the Vorlese-Sperre while it plays.

export interface AudioLike {
  src: string;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(event: string, fn: () => void): void;
  removeEventListener(event: string, fn: () => void): void;
}

/** The part of the Vorlese-Sperre the Narrator needs. */
export interface SperreLike { readonly locked: boolean; lock(watchdogMs: number): void; release(): void }

const END_EVENTS = ['ended', 'error', 'stalled'] as const;

export class Narrator {
  constructor(private readonly o: { audio: AudioLike; sperre: SperreLike; watchdogSeconds: number }) {}

  /** Must be called synchronously from the tap handler (iPadOS only starts audio inside a user gesture). */
  speak(audioUrl: string, durationMs?: number): void {
    const { audio, sperre, watchdogSeconds } = this.o;
    if (sperre.locked) return;
    const done = (): void => {
      for (const e of END_EVENTS) audio.removeEventListener(e, done);
      sperre.release();
    };
    for (const e of END_EVENTS) audio.addEventListener(e, done);
    audio.src = audioUrl;
    sperre.lock(durationMs ? durationMs + 5000 : watchdogSeconds * 1000);
    try {
      const p = audio.play();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(done);
    } catch { done(); }
  }
}
