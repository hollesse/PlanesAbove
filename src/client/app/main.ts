// Browser bootstrap. ES2020 / Safari 16 (ADR 0004). No state is stored on the device.
import './app.css';
import '../ui/styles/ui.css';
import type { SceneState } from '../../shared/state';
import type { Photo } from '../ui/domain/photo';
import { startApp } from './app';

const root = document.getElementById('app') as HTMLElement;
const buildId = document.querySelector('meta[name="build-id"]')?.getAttribute('content') ?? 'dev';

const app = startApp({
  root,
  buildId,
  fetchState: async () => {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error(`state ${res.status}`);
    return (await res.json()) as SceneState;
  },
  fetchPhotos: async (icao24) => {
    const res = await fetch(`/api/photos/${encodeURIComponent(icao24)}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return ((await res.json()) as { photos?: Photo[] }).photos ?? [];
  },
  audio: new Audio(),
  timers: { setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (h) => window.clearTimeout(h as number) },
  now: () => new Date(),
  reload: () => window.location.reload(),
  events: {
    onOnline: (fn) => window.addEventListener('online', fn),
    onVisible: (fn) => document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fn(); }),
  },
});
(window as unknown as { planesAbove: unknown }).planesAbove = app; // handle for E2E / debugging
