import { isTransientError, retryAfterMs } from './transient.js';

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

describe('retryAfterMs', () => {
  it('reads a numeric retryAfterMs', () => {
    expect(retryAfterMs({ retryAfterMs: 250 })).toBe(250);
  });

  it('reads Retry-After in seconds from a plain headers object', () => {
    expect(retryAfterMs({ headers: { 'retry-after': '2' } })).toBe(2_000);
  });

  it('reads Retry-After from response headers with a get method', () => {
    const headers = {
      get: (name: string) => (name === 'retry-after' ? '3' : null),
    };
    expect(retryAfterMs({ response: { headers } })).toBe(3_000);
  });

  it('reads Retry-After as an HTTP date', () => {
    const date = new Date(Date.now() + 5_000).toUTCString();
    const value = retryAfterMs({ headers: { 'retry-after': date } });
    expect(value).toBeGreaterThan(3_000);
    expect(value).toBeLessThanOrEqual(5_000);
  });

  it('returns undefined without a hint', () => {
    expect(retryAfterMs(new Error('plain'))).toBeUndefined();
    expect(
      retryAfterMs({ headers: { 'retry-after': 'soon' } }),
    ).toBeUndefined();
  });
});
