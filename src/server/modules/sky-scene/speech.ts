// SpeechSynthesizer port (ADR 0012): text in, audio out. Nothing adapter-specific leaks through it.
export type SpeechErrorKind = 'unavailable' | 'quota-exceeded' | 'bad-voice' | 'bad-config';

export class SpeechError extends Error {
  /** `timedOut`: the request was sent but no answer came in time; the provider may still have charged for it. */
  constructor(public readonly kind: SpeechErrorKind, message?: string, public readonly timedOut = false) { super(message ?? kind); }
}

export interface SpeechResult { audio: Uint8Array; mimeType: string; durationMs: number }

export interface SpeechSynthesizer {
  readonly name: string;
  synthesize(text: string, voice: string): Promise<SpeechResult>;
}
