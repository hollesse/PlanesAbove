import { SpeechError, type SpeechResult, type SpeechSynthesizer } from './speech';
import { makeSilentWav } from './wav';

export interface FakeSpeechBehaviour { durationMs: number; failure?: 'unavailable' | 'quota-exceeded' | 'bad-voice' | 'bad-config'; timedOut?: boolean }

/** Mock-mode / test adapter: a silent clip of scenario-controlled length, or a typed failure (ADR 0012). */
export class FakeSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = 'fake';
  constructor(private readonly behaviour: () => FakeSpeechBehaviour = () => ({ durationMs: 800 })) {}
  async synthesize(): Promise<SpeechResult> {
    const b = this.behaviour();
    if (b.failure) throw new SpeechError(b.failure, undefined, b.timedOut);
    return { audio: makeSilentWav(b.durationMs), mimeType: 'audio/wav', durationMs: b.durationMs };
  }
}
