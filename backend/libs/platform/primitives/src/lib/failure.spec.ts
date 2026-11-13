import { DomainError, PlatformError } from '@platform/kernel';
import {
  DeadlineExceededError,
  InvalidArgumentError,
  NonJsonValueError,
  StaleClaimError,
} from './errors.js';
import {
  classifyFailure,
  DEFAULT_RETRY_AFTER_MAX_MS,
  FailureKind,
  isTransientError,
  MAX_CAUSE_DEPTH,
  retryAfterMs,
} from './failure.js';

class OutOfStockError extends DomainError {
  override readonly code = 'SALES.STOCK.OUT_OF_STOCK';
}

class UpstreamBusyError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.UPSTREAM_BUSY';

  constructor(cause?: unknown) {
    super('Upstream busy', { retryable: true, cause });
  }
}

class WrappedError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.WRAPPED';
  constructor(cause: unknown) {
    super('Wrapped', { cause, retryable: false });
  }
}

function withCode(code: string): Error {
  return Object.assign(new Error('x'), { code });
}

function withStatus(status: number, key = 'status'): Error {
  return Object.assign(new Error('x'), { [key]: status });
}

function named(name: string): Error {
  const error = new Error('x');
  error.name = name;
  return error;
}

describe('classifyFailure', () => {
  it.each([
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'EPIPE',
    'UND_ERR_SOCKET',
    'UND_ERR_HEADERS_TIMEOUT',
    '40001',
    '40P01',
    '57P01',
    '53300',
    '08006',
    '08P01',
  ])('treats code %s as transient', (code) => {
    expect(classifyFailure(withCode(code))).toBe(FailureKind.Transient);
  });

  it.each(['23505', '22P02', 'ERR_INVALID_ARG_TYPE', 'ENOENT'])(
    'does not treat code %s as transient',
    (code) => {
      expect(classifyFailure(withCode(code))).toBe(FailureKind.Permanent);
    },
  );

  it.each([408, 425, 429, 502, 503, 504])(
    'treats HTTP %i as transient',
    (status) => {
      expect(classifyFailure(withStatus(status))).toBe(FailureKind.Transient);
      expect(classifyFailure(withStatus(status, 'statusCode'))).toBe(
        FailureKind.Transient,
      );
    },
  );

  it.each([400, 401, 403, 404, 409, 422, 500, 501])(
    'treats HTTP %i as permanent',
    (status) => {
      expect(classifyFailure(withStatus(status))).toBe(FailureKind.Permanent);
    },
  );

  it('ignores status values that are not HTTP error statuses', () => {
    expect(classifyFailure(withStatus(200))).toBe(FailureKind.Permanent);
    expect(classifyFailure(withStatus(503.5))).toBe(FailureKind.Permanent);
  });

  it('maps AbortError to cancelled and TimeoutError to timeout', () => {
    expect(classifyFailure(named('AbortError'))).toBe(FailureKind.Cancelled);
    expect(classifyFailure(named('TimeoutError'))).toBe(FailureKind.Timeout);
  });

  it('classifies real abort and timeout reasons from AbortSignal', () => {
    const aborted = AbortSignal.abort();
    expect(classifyFailure(aborted.reason)).toBe(FailureKind.Cancelled);
    const controller = new AbortController();
    controller.abort(new DOMException('late', 'TimeoutError'));
    expect(classifyFailure(controller.signal.reason)).toBe(FailureKind.Timeout);
  });

  it('uses the retryable flag of PlatformError', () => {
    expect(classifyFailure(new UpstreamBusyError())).toBe(
      FailureKind.Transient,
    );
    expect(classifyFailure(new OutOfStockError('no stock'))).toBe(
      FailureKind.Permanent,
    );
    expect(classifyFailure({ retryable: true })).toBe(FailureKind.Transient);
  });

  it('prefers a declared failureKind', () => {
    expect(classifyFailure(new DeadlineExceededError(0))).toBe(
      FailureKind.Timeout,
    );
    expect(classifyFailure(new NonJsonValueError('$', 'x'))).toBe(
      FailureKind.ProtocolViolation,
    );
    expect(classifyFailure(new InvalidArgumentError('a', 'b'))).toBe(
      FailureKind.ProtocolViolation,
    );
    expect(classifyFailure(new StaleClaimError('complete'))).toBe(
      FailureKind.Permanent,
    );
    expect(
      classifyFailure({ failureKind: FailureKind.Cancelled, retryable: true }),
    ).toBe(FailureKind.Cancelled);
  });

  it('ignores an unknown failureKind value', () => {
    expect(classifyFailure({ failureKind: 'maybe', code: 'ECONNRESET' })).toBe(
      FailureKind.Transient,
    );
  });

  it('walks the cause chain when the outer error says nothing', () => {
    // fetch de undici: TypeError('fetch failed') con la causa de red.
    const fetchFailed = new TypeError('fetch failed', {
      cause: withCode('ECONNREFUSED'),
    });
    expect(classifyFailure(fetchFailed)).toBe(FailureKind.Transient);

    const deep = new Error('l0', {
      cause: new Error('l1', {
        cause: new Error('l2', { cause: withStatus(503) }),
      }),
    });
    expect(classifyFailure(deep)).toBe(FailureKind.Transient);
  });

  it('stops after MAX_CAUSE_DEPTH levels of cause', () => {
    let error: unknown = withCode('ECONNRESET');
    for (let i = 0; i <= MAX_CAUSE_DEPTH; i += 1) {
      error = new Error(`level ${i}`, { cause: error });
    }
    expect(classifyFailure(error)).toBe(FailureKind.Permanent);
  });

  it('lets the outer explicit signal win over the cause', () => {
    expect(classifyFailure(new WrappedError(withCode('ECONNRESET')))).toBe(
      FailureKind.Permanent,
    );
    expect(classifyFailure(new UpstreamBusyError(withStatus(400)))).toBe(
      FailureKind.Transient,
    );
  });

  it.each([
    'TypeError',
    'ReferenceError',
    'SyntaxError',
    'RangeError',
    'ZodError',
  ])('treats an unexplained %s as a protocol violation', (name) => {
    expect(classifyFailure(named(name))).toBe(FailureKind.ProtocolViolation);
  });

  it('treats a real TypeError as a protocol violation', () => {
    let error: unknown;
    try {
      (undefined as unknown as { run(): void }).run();
    } catch (caught) {
      error = caught;
    }
    expect(classifyFailure(error)).toBe(FailureKind.ProtocolViolation);
  });

  it('treats anything else as permanent', () => {
    expect(classifyFailure(new Error('boom'))).toBe(FailureKind.Permanent);
    expect(classifyFailure('a string')).toBe(FailureKind.Permanent);
    expect(classifyFailure(42)).toBe(FailureKind.Permanent);
    expect(classifyFailure(null)).toBe(FailureKind.Permanent);
    expect(classifyFailure(undefined)).toBe(FailureKind.Permanent);
    expect(classifyFailure({})).toBe(FailureKind.Permanent);
  });

  describe('AWS SDK v3 errors', () => {
    function awsError(
      name: string,
      httpStatusCode: number,
      extra: Record<string, unknown> = {},
    ): Error {
      return Object.assign(new Error(name), {
        name,
        $fault: httpStatusCode >= 500 ? 'server' : 'client',
        $metadata: { httpStatusCode },
        ...extra,
      });
    }

    it('treats throttling as transient even with a 400 status', () => {
      expect(classifyFailure(awsError('ThrottlingException', 400))).toBe(
        FailureKind.Transient,
      );
      expect(
        classifyFailure(
          awsError('ProvisionedThroughputExceededException', 400),
        ),
      ).toBe(FailureKind.Transient);
      expect(classifyFailure(awsError('SlowDown', 503))).toBe(
        FailureKind.Transient,
      );
      expect(classifyFailure(awsError('RequestTimeout', 400))).toBe(
        FailureKind.Transient,
      );
    });

    it('trusts the $retryable marker the SDK sets', () => {
      expect(
        classifyFailure(
          awsError('SomeServiceException', 400, {
            $retryable: { throttling: true },
          }),
        ),
      ).toBe(FailureKind.Transient);
    });

    it('falls back to $metadata.httpStatusCode', () => {
      expect(classifyFailure(awsError('ServiceUnavailable', 503))).toBe(
        FailureKind.Transient,
      );
      expect(classifyFailure(awsError('ValidationException', 400))).toBe(
        FailureKind.Permanent,
      );
      expect(classifyFailure(awsError('ResourceNotFoundException', 404))).toBe(
        FailureKind.Permanent,
      );
    });

    it('finds the AWS error in the cause chain', () => {
      const wrapped = new Error('send failed', {
        cause: awsError('ThrottlingException', 400),
      });
      expect(classifyFailure(wrapped)).toBe(FailureKind.Transient);
    });
  });

  it('survives a self-referencing cause', () => {
    const error = new Error('loop') as Error & { cause?: unknown };
    error.cause = error;
    expect(classifyFailure(error)).toBe(FailureKind.Permanent);
  });
});

describe('isTransientError', () => {
  it('is true only for transient failures', () => {
    expect(isTransientError(withCode('ECONNRESET'))).toBe(true);
    expect(isTransientError(new UpstreamBusyError())).toBe(true);
    expect(isTransientError(named('TimeoutError'))).toBe(false);
    expect(isTransientError(named('AbortError'))).toBe(false);
    expect(isTransientError(new DeadlineExceededError(0))).toBe(false);
    expect(isTransientError(new OutOfStockError('x'))).toBe(false);
    expect(isTransientError(new TypeError('x'))).toBe(false);
  });
});

describe('retryAfterMs', () => {
  const now = Date.parse('2026-11-12T10:00:00.000Z');

  it('reads delay-seconds from a header', () => {
    expect(retryAfterMs('5', 60_000, now)).toBe(5_000);
    expect(retryAfterMs('2026', 60_000, now)).toBe(60_000);
    expect(retryAfterMs(' 0 ', 60_000, now)).toBe(0);
  });

  it('reads seconds as a number, including fractions', () => {
    expect(retryAfterMs(2, 60_000, now)).toBe(2_000);
    expect(retryAfterMs(0.25, 60_000, now)).toBe(250);
  });

  it('reads an HTTP date relative to now', () => {
    expect(retryAfterMs('Thu, 12 Nov 2026 10:00:30 GMT', 60_000, now)).toBe(
      30_000,
    );
  });

  it('reads a Date relative to now', () => {
    expect(retryAfterMs(new Date(now + 1_500), 60_000, now)).toBe(1_500);
  });

  it('returns 0 for dates in the past', () => {
    expect(retryAfterMs('Thu, 12 Nov 2026 09:00:00 GMT', 60_000, now)).toBe(0);
    expect(retryAfterMs(new Date(now - 10), 60_000, now)).toBe(0);
  });

  it('caps the result at maxMs', () => {
    expect(retryAfterMs('3600', 10_000, now)).toBe(10_000);
    expect(retryAfterMs(9_999_999_999, 10_000, now)).toBe(10_000);
    expect(retryAfterMs('Fri, 31 Dec 9999 23:59:59 GMT', 10_000, now)).toBe(
      10_000,
    );
  });

  it('uses DEFAULT_RETRY_AFTER_MAX_MS when no max is given', () => {
    expect(retryAfterMs('99999')).toBe(DEFAULT_RETRY_AFTER_MAX_MS);
  });

  it.each<[string, unknown]>([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['a negative number of seconds', '-5'],
    ['a decimal header', '1.5'],
    ['garbage', 'soon'],
    ['a date without day name', '12 Nov 2026 10:00:30 GMT'],
    ['an ISO-like non-HTTP date', '2026-11-12T10:00:30Z'],
    ['an overlong header', `${'9'.repeat(65)}`],
    ['a header with too many digits', '12345678901'],
    ['a negative number', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['an invalid Date', new Date(Number.NaN)],
  ])('returns undefined for %s', (_label, value) => {
    expect(
      retryAfterMs(value as string | number | Date | undefined, 60_000, now),
    ).toBeUndefined();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects maxMs %p',
    (maxMs) => {
      expect(() => retryAfterMs('1', maxMs, now)).toThrow(InvalidArgumentError);
    },
  );
});
