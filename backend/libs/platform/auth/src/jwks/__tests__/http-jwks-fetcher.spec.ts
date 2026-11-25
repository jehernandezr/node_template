import { AuthErrorCode } from '../../errors/auth-error-code.enum.js';
import { HttpJwksFetcher } from '../http-jwks-fetcher.js';

interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/** Fake `fetch` that remembers the last call and answers what it is told. */
class RecordingFetch {
  lastCall: RecordedCall | undefined;

  constructor(private readonly respond: () => Response | Promise<Response>) {}

  readonly fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    this.lastCall = { url: String(input), init };
    return this.respond();
  };
}

const URL_UNDER_TEST = 'https://identity.test/.well-known/jwks.json';

describe('HttpJwksFetcher', () => {
  describe('a successful download', () => {
    it('returns the parsed body', async () => {
      const fetchFn = new RecordingFetch(
        () => new Response(JSON.stringify({ keys: [] })),
      );
      const fetcher = new HttpJwksFetcher(URL_UNDER_TEST, fetchFn.fetch);

      await expect(fetcher.fetch()).resolves.toEqual({ keys: [] });
    });

    it('requests the url without following redirects and with a timeout signal', async () => {
      const fetchFn = new RecordingFetch(
        () => new Response(JSON.stringify({ keys: [] })),
      );
      const fetcher = new HttpJwksFetcher(URL_UNDER_TEST, fetchFn.fetch);

      await fetcher.fetch();

      expect(fetchFn.lastCall?.url).toBe(URL_UNDER_TEST);
      expect(fetchFn.lastCall?.init?.redirect).toBe('error');
      expect(fetchFn.lastCall?.init?.headers).toEqual({
        accept: 'application/json',
      });
      expect(fetchFn.lastCall?.init?.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('failures', () => {
    it.each([
      ['a 503 status', () => new Response('down', { status: 503 })],
      ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
      ['a body that is not JSON', () => new Response('not json')],
    ])('throws JWKS_UNAVAILABLE retryable for %s', async (_name, respond) => {
      const fetchFn = new RecordingFetch(respond);
      const fetcher = new HttpJwksFetcher(URL_UNDER_TEST, fetchFn.fetch);

      await expect(fetcher.fetch()).rejects.toMatchObject({
        code: AuthErrorCode.JwksUnavailable,
        retryable: true,
      });
    });
  });
});
