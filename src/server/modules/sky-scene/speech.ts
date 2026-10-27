// SpeechSynthesizer port (ADR 0012): text in, audio out. Nothing adapter-specific leaks through it.
export type SpeechErrorKind = 'unavailable' | 'quota-exceeded' | 'bad-voice';

export class SpeechError extends Error {
  constructor(public readonly kind: SpeechErrorKind, message?: string) { super(message ?? kind); }
}

export interface SpeechResult { audio: Uint8Array; mimeType: string; durationMs: number }

export interface SpeechSynthesizer {
  readonly name: string;
  synthesize(text: string, voice: string): Promise<SpeechResult>;
}
