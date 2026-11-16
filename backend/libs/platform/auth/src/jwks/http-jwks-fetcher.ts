import { JwksFetcher } from './jwks-fetcher.js';
import { JwksUnavailableError } from '../errors/jwks-unavailable.error.js';

/** `JwksFetcher` sobre `fetch` con un tiempo máximo por petición. */
export class HttpJwksFetcher extends JwksFetcher {
  /** Tiempo máximo de una descarga. */
  static readonly TIMEOUT_MS = 3_000;

  constructor(
    private readonly url: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs: number = HttpJwksFetcher.TIMEOUT_MS,
  ) {
    super();
  }

  async fetch(): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchFn(this.url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: 'application/json' },
        // Una redirección podría llevar la descarga a otro host sin que el emisor lo haya publicado.
        redirect: 'error',
      });
    } catch (error) {
      throw new JwksUnavailableError('request failed', error);
    }
    if (!response.ok) {
      throw new JwksUnavailableError(`status ${response.status}`);
    }
    try {
      return await response.json();
    } catch (error) {
      throw new JwksUnavailableError('invalid JSON', error);
    }
  }
}
