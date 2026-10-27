import { SourceError } from '../model';

export type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; headers?: { get(name: string): string | null }; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;

/** Maps HTTP/network failures to the port's SourceError classes (ADR 0005/0011 errorClass vocabulary). */
export async function guardedFetch(fetchFn: Fetch, url: string, init: { method?: string; headers?: Record<string, string>; body?: string } | undefined, timeoutMs: number): Promise<Awaited<ReturnType<Fetch>>> {
  let res: Awaited<ReturnType<Fetch>>;
  try {
    res = await fetchFn(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const name = (e as { name?: string }).name;
    throw new SourceError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network', (e as Error).message);
  }
  if (res.ok) return res;
  if (res.status === 403) throw new SourceError('http-403');
  if (res.status === 429) throw new SourceError('http-429', undefined, retryAfterMs(res.headers));
  throw new SourceError(res.status >= 500 ? 'http-5xx' : 'http-4xx', `HTTP ${res.status}`);
}

/** Pause requested by a 429: `Retry-After` (seconds or HTTP date), else `x-ratelimit-reset` (seconds until the window resets). undefined = none given. */
export function retryAfterMs(headers: { get(name: string): string | null } | undefined, now: number = Date.now()): number | undefined {
  if (!headers) return undefined;
  const ra = headers.get('retry-after');
  if (ra !== null && ra.trim() !== '') {
    const s = Number(ra);
    if (Number.isFinite(s) && s >= 0) return Math.round(s * 1000);
    const at = Date.parse(ra);
    if (!Number.isNaN(at)) return Math.max(0, at - now);
  }
  const reset = headers.get('x-ratelimit-reset');
  if (reset !== null && reset.trim() !== '' && Number.isFinite(Number(reset)) && Number(reset) >= 0) return Math.round(Number(reset) * 1000);
  return undefined;
}
