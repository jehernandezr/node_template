import { JwksFetcher } from './jwks-fetcher.js';
import { JwksUnavailableError } from '../errors/jwks-unavailable.error.js';

/** `JwksFetcher` on `fetch` with a maximum time per request. */
export class HttpJwksFetcher extends JwksFetcher {
  /** Maximum time of a download. */
  static readonly TIMEOUT_MS = 3_000;

  constructor(
    private readonly url: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs: number = HttpJwksFetcher.TIMEOUT_MS,
  ) {
    super();
  }

  /**
   * A redirect could take the download to another host the issuer has not published.
   */
  override async fetch(): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchFn(this.url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: 'application/json' },
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
