// `elevenlabs` adapter (opt-in, ADR 0012): POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=pcm_22050
// with header xi-api-key and body {text, model_id}. The response is raw 16-bit mono PCM, wrapped into a WAV here so the audio cache,
// the /audio route and the client stay WAV-only. The API key comes from the environment only (ADR 0007).
import { guardedFetch, type Fetch } from '../airspace/adapters/http';
import { SourceError } from '../airspace/model';
import type { Logger } from '../../logger';
import { SpeechError, type SpeechResult, type SpeechSynthesizer } from './speech';
import { pcmToWav, wavDurationMs } from './wav';

export function pcmSampleRate(outputFormat: string): number {
  const m = /^pcm_(\d+)$/.exec(outputFormat);
  if (!m) throw new Error(`unsupported ElevenLabs output format "${outputFormat}" (PCM only)`);
  return Number(m[1]);
}

export class ElevenLabsSpeechSynthesizer implements SpeechSynthesizer {
  readonly name = 'elevenlabs';
  constructor(private readonly o: { fetch: Fetch; apiKey: string; modelId: string; outputFormat: string; timeoutMs: number; baseUrl?: string; log?: Logger }) {
    pcmSampleRate(o.outputFormat);
  }

  async synthesize(text: string, voice: string): Promise<SpeechResult> {
    const url = `${(this.o.baseUrl ?? 'https://api.elevenlabs.io').replace(/\/+$/, '')}/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${encodeURIComponent(this.o.outputFormat)}`;
    let res;
    try {
      res = await guardedFetch(this.o.fetch, url, { method: 'POST', headers: { 'content-type': 'application/json', 'xi-api-key': this.o.apiKey }, body: JSON.stringify({ text, model_id: this.o.modelId }) }, this.o.timeoutMs);
    } catch (e) {
      const cls = e instanceof SourceError ? e.errorClass : 'network';
      const status = e instanceof SourceError ? /HTTP (\d{3})/.exec(e.message)?.[1] : undefined;
      if (cls === 'http-429' || status === '402') throw new SpeechError('quota-exceeded', `ElevenLabs ${status ?? 429}`);
      if (status === '401') { this.o.log?.warn('ElevenLabs rejected the API key (ELEVENLABS_API_KEY); using the fallback voice', { source: 'tts' }); throw new SpeechError('unavailable', 'key rejected'); }
      if (status === '404' || status === '422') throw new SpeechError('bad-voice', `ElevenLabs rejected voice "${voice}"`);
      throw new SpeechError('unavailable', cls);
    }
    const pcm = new Uint8Array(await res.arrayBuffer());
    if (pcm.length < 2) throw new SpeechError('unavailable', 'ElevenLabs returned no audio');
    const audio = pcmToWav(pcm, pcmSampleRate(this.o.outputFormat));
    const durationMs = wavDurationMs(audio);
    if (durationMs === undefined) throw new SpeechError('unavailable', 'ElevenLabs response is not PCM');
    return { audio, mimeType: 'audio/wav', durationMs };
  }
}
