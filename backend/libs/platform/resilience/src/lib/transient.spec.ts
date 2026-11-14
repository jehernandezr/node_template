import { isTransientError } from '@platform/primitives';
import { retryAfterHintMs } from './transient.js';

describe('isTransientError', () => {
  it.each([
    [{ retryable: true }],
    [Object.assign(new Error('reset'), { code: 'ECONNRESET' })],
    [Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })],
    [Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })],
    [Object.assign(new Error('dns'), { code: 'EAI_AGAIN' })],
    [Object.assign(new Error('nx'), { code: 'ENOTFOUND' })],
    [Object.assign(new Error('unreach'), { code: 'ENETUNREACH' })],
    [Object.assign(new Error('pipe'), { code: 'EPIPE' })],
    [Object.assign(new Error('undici'), { code: 'UND_ERR_CONNECT_TIMEOUT' })],
    [Object.assign(new Error('undici'), { code: 'UND_ERR_SOCKET' })],
    [Object.assign(new Error('undici'), { code: 'UND_ERR_HEADERS_TIMEOUT' })],
    [{ status: 408 }],
    [{ status: 429 }],
    [{ statusCode: 502 }],
    [{ status: 503 }],
    [{ statusCode: 504 }],
  ])('treats %p as transient', (error) => {
    expect(isTransientError(error)).toBe(true);
  });

  it.each([
    [new Error('validation failed')],
    [{ status: 400 }],
    [{ statusCode: 404 }],
    [{ status: 500 }],
    [{ status: 501 }],
    [{ status: 505 }],
    [{ retryable: false }],
    [Object.assign(new Error('x'), { code: 'EACCES' })],
    ['string error'],
    [null],
    [undefined],
  ])('treats %p as not transient', (error) => {
    expect(isTransientError(error)).toBe(false);
  });

  it('inspects the cause chain up to three levels', () => {
    const level3 = { code: 'ECONNRESET' };
    expect(
      isTransientError(Object.assign(new Error('wrap'), { cause: level3 })),
    ).toBe(true);
    expect(
      isTransientError(
        Object.assign(new Error('a'), {
          cause: Object.assign(new Error('b'), { cause: { cause: level3 } }),
        }),
      ),
    ).toBe(true);
  });

  it('ignores transient causes deeper than three levels', () => {
    const deep = Object.assign(new Error('a'), {
      cause: { cause: { cause: { cause: { code: 'ECONNRESET' } } } },
    });
    expect(isTransientError(deep)).toBe(false);
  });

  it.each([
    ['40001'],
    ['40P01'],
    ['57P01'],
    ['53300'],
    ['08000'],
    ['08006'],
    ['08P01'],
  ])('treats Postgres SQLSTATE %s as transient', (code) => {
    expect(isTransientError({ code })).toBe(true);
  });

  it.each([['23505'], ['42P01'], ['22001']])(
    'treats Postgres SQLSTATE %s as not transient',
    (code) => {
      expect(isTransientError({ code })).toBe(false);
    },
  );
});

describe('retryAfterHintMs without options', () => {
  it('reads a numeric retryAfterMs', () => {
    expect(retryAfterHintMs({ retryAfterMs: 250 })).toBe(250);
  });

  it('reads Retry-After in seconds from a plain headers object', () => {
    expect(retryAfterHintMs({ headers: { 'retry-after': '2' } })).toBe(2_000);
  });

  it('reads Retry-After from response headers with a get method', () => {
    const headers = {
      get: (name: string) => (name === 'retry-after' ? '3' : null),
    };
    expect(retryAfterHintMs({ response: { headers } })).toBe(3_000);
  });

  it('reads Retry-After as an HTTP date', () => {
    const date = new Date(Date.now() + 5_000).toUTCString();
    const value = retryAfterHintMs({ headers: { 'retry-after': date } });
    expect(value).toBeGreaterThan(3_000);
    expect(value).toBeLessThanOrEqual(5_000);
  });

  it('returns undefined without a hint', () => {
    expect(retryAfterHintMs(new Error('plain'))).toBeUndefined();
    expect(
      retryAfterHintMs({ headers: { 'retry-after': 'soon' } }),
    ).toBeUndefined();
  });
});

describe('isTransientError precedence', () => {
  it('treats an outer retryable false as final even with a transient cause', () => {
    expect(
      isTransientError(
        Object.assign(new Error('final'), {
          retryable: false,
          cause: { code: 'ECONNRESET' },
        }),
      ),
    ).toBe(false);
  });
});

describe('retryAfterHintMs', () => {
  it('bounds a numeric hint and a header to maxMs', () => {
    expect(retryAfterHintMs({ retryAfterMs: 10_000 }, { maxMs: 500 })).toBe(
      500,
    );
    expect(
      retryAfterHintMs(
        { headers: { 'retry-after': '3600' } },
        { maxMs: 1_000 },
      ),
    ).toBe(1_000);
  });

  it('caps unbounded hints at the primitives default of 60 s', () => {
    expect(retryAfterHintMs({ headers: { 'retry-after': '86400' } })).toBe(
      60_000,
    );
    expect(retryAfterHintMs({ retryAfterMs: 10_000_000 })).toBe(60_000);
  });

  it('resolves HTTP dates against the given now', () => {
    const nowMs = Date.parse('2026-01-01T00:00:00.000Z');
    expect(
      retryAfterHintMs(
        { headers: { 'retry-after': 'Thu, 01 Jan 2026 00:00:05 GMT' } },
        { nowMs },
      ),
    ).toBe(5_000);
  });

  it('ignores oversized and fractional headers', () => {
    expect(
      retryAfterHintMs({ headers: { 'retry-after': '1'.repeat(100) } }),
    ).toBeUndefined();
    expect(
      retryAfterHintMs({ headers: { 'retry-after': '1.5' } }),
    ).toBeUndefined();
  });

  it('reads a hint in the cause chain', () => {
    expect(
      retryAfterHintMs(
        Object.assign(new Error('wrap'), { cause: { retryAfterMs: 42 } }),
      ),
    ).toBe(42);
  });
});
