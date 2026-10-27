// `piper` adapter: HTTP to the Piper sidecar container (piper1-gpl, GPL-3.0 stays in that container, ADR 0012).
// Request: POST {endpoint} with JSON {text, voice}; response: audio/wav. The exact server contract is unverified here
// (no Piper container reachable in the cloud build) - the contract tests use constructed WAV fixtures; see infrastructure-d3v7k.
import { guardedFetch, type Fetch } from '../airspace/adapters/http';
import { SourceError } from '../airspace/model';
import { SpeechError, type SpeechResult, type SpeechSynthesizer } from './speech';
import { wavDurationMs } from './wav';

export class PiperSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = 'piper';
  constructor(private readonly o: { fetch: Fetch; endpoint: string; timeoutMs: number }) {}

  async synthesize(text: string, voice: string): Promise<SpeechResult> {
    let res;
    try {
      res = await guardedFetch(this.o.fetch, this.o.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, voice }) }, this.o.timeoutMs);
    } catch (e) {
      const cls = e instanceof SourceError ? e.errorClass : 'network';
      if (cls === 'http-429') throw new SpeechError('quota-exceeded');
      if (cls === 'http-4xx') throw new SpeechError('bad-voice', `Piper rejected voice "${voice}"`);
      throw new SpeechError('unavailable', cls);
    }
    const audio = new Uint8Array(await res.arrayBuffer());
    const durationMs = wavDurationMs(audio);
    if (durationMs === undefined) throw new SpeechError('unavailable', 'Piper response is not a WAV');
    return { audio, mimeType: 'audio/wav', durationMs };
  }
}
