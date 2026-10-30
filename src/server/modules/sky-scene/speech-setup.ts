// Wires the configured speech adapters (ADR 0012): primary, optional fallback, optional monthly budget. Secrets only from env (ADR 0007).
import type { Clock } from '../../clock';
import type { Config } from '../../config';
import type { Db } from '../../db';
import type { Logger } from '../../logger';
import type { Fetch } from '../airspace/adapters/http';
import { ElevenLabsSpeechSynthesizer } from './elevenlabs-speech';
import { FakeSpeechSynthesizer } from './fake-speech';
import { PiperSpeechSynthesizer } from './piper-speech';
import type { SpeechSynthesizer } from './speech';
import { SpeechUsage } from './speech-usage';

export interface SpeechSetup {
  synth: SpeechSynthesizer; voice: string;
  fallback?: { synth: SpeechSynthesizer; voice: string };
  budget?: { usage: SpeechUsage; monthlyCharacterBudget: number };
}

export function buildSpeechSetup(o: { config: Config; env: Record<string, string | undefined>; fetch: Fetch; db: Db; clock: Clock; log: Logger; timeZone?: string }): SpeechSetup {
  const s = o.config.speech;
  const simple = (adapter: 'piper' | 'fake'): SpeechSynthesizer => adapter === 'piper' ? new PiperSpeechSynthesizer({ fetch: o.fetch, endpoint: s.endpoint, timeoutMs: s.timeoutMs }) : new FakeSpeechSynthesizer();
  if (s.adapter !== 'elevenlabs') return { synth: simple(s.adapter), voice: s.voice };
  const fallback = { synth: simple(s.fallback), voice: s.fallbackVoice };
  const apiKey = o.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    o.log.warn('speech.adapter is elevenlabs but ELEVENLABS_API_KEY is not set: using the fallback adapter', { source: 'tts', fallback: s.fallback });
    return { synth: fallback.synth, voice: fallback.voice };
  }
  const e = s.elevenlabs;
  return {
    synth: new ElevenLabsSpeechSynthesizer({ fetch: o.fetch, apiKey, modelId: e.modelId, outputFormat: e.outputFormat, timeoutMs: e.timeoutMs, log: o.log }),
    voice: s.voice, fallback,
    budget: { usage: new SpeechUsage(o.db, o.clock, o.timeZone), monthlyCharacterBudget: e.monthlyCharacterBudget },
  };
}
