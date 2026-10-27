import { SourceError } from '../model';

export type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;

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
  if (res.status === 429) throw new SourceError('http-429');
  throw new SourceError(res.status >= 500 ? 'http-5xx' : 'http-4xx', `HTTP ${res.status}`);
}
