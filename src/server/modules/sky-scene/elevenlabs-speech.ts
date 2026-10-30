// `elevenlabs` adapter (opt-in, ADR 0012): POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=pcm_22050
// with header xi-api-key and body {text, model_id}. The response is raw 16-bit mono PCM, wrapped into a WAV here so the audio cache,
// the /audio route and the client stay WAV-only. The API key comes from the environment only (ADR 0007).
import type { Fetch } from '../airspace/adapters/http';
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
      res = await this.o.fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'xi-api-key': this.o.apiKey }, body: JSON.stringify({ text, model_id: this.o.modelId }), signal: AbortSignal.timeout(this.o.timeoutMs) });
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === 'TimeoutError' || name === 'AbortError') throw new SpeechError('unavailable', 'timeout', true);
      throw new SpeechError('unavailable', 'network');
    }
    if (!res.ok) throw await this.failure(res, voice);
    const pcm = new Uint8Array(await res.arrayBuffer());
    if (pcm.length < 2) throw new SpeechError('unavailable', 'ElevenLabs returned no audio');
    const audio = pcmToWav(pcm, pcmSampleRate(this.o.outputFormat));
    const durationMs = wavDurationMs(audio);
    if (durationMs === undefined) throw new SpeechError('unavailable', 'ElevenLabs response is not PCM');
    return { audio, mimeType: 'audio/wav', durationMs };
  }
  /** Maps a non-2xx answer to a typed SpeechError; the message always carries status, ElevenLabs detail.code and detail.message (or the first 300 body characters). */
  private async failure(res: { status: number; text(): Promise<string> }, voice: string): Promise<SpeechError> {
    const raw = await res.text().catch(() => '');
    let code: string | undefined; let message: string | undefined;
    try {
      const d = (JSON.parse(raw) as { detail?: unknown }).detail;
      if (typeof d === 'string') message = d;
      else if (d && typeof d === 'object') { const o = d as { code?: unknown; status?: unknown; message?: unknown }; code = typeof o.code === 'string' ? o.code : typeof o.status === 'string' ? o.status : undefined; message = typeof o.message === 'string' ? o.message : undefined; }
    } catch { /* not JSON */ }
    if (code === undefined && message === undefined) message = raw.slice(0, 300);
    const info = `status=${res.status}${code ? ` code=${code}` : ''}${message ? ` message=${message}` : ''}`;
    const full = `ElevenLabs ${info}`;
    const s = res.status;
    if (s === 429 || code === 'quota_exceeded') return new SpeechError('quota-exceeded', full);
    if (s === 401 || s === 402 || s === 403) {
      this.o.log?.warn(`ElevenLabs rejected the request (${info}); check speech.voice (a library voice must first be added to "My Voices"), the permissions of ELEVENLABS_API_KEY and the plan; using the fallback voice`, { source: 'tts' });
      return new SpeechError('bad-config', full);
    }
    if (s === 404 || s === 422) {
      this.o.log?.warn(`ElevenLabs rejected voice "${voice}" (${info}); check speech.voice; using the fallback voice`, { source: 'tts' });
      return new SpeechError('bad-voice', full);
    }
    return new SpeechError('unavailable', full);
  }
}
