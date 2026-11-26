import { DomainError, FailureKind, PlatformError } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { DeadlineExceededError } from '../../errors/deadline-exceeded.error.js';
import { InvalidArgumentError } from '../../errors/invalid-argument.error.js';
import { NonJsonValueError } from '../../errors/non-json-value.error.js';
import { StaleClaimError } from '../../errors/stale-claim.error.js';
import { FailureClassifier } from '../failure-classifier.js';
import { RetryAfterParser } from '../retry-after-parser.js';

const classifier = new FailureClassifier();

/** `Retry-After` wait with the clock fixed at `nowMs`. */
function retryAfter(
  value: string | number | Date | null | undefined,
  maxMs: number = RetryAfterParser.DEFAULT_MAX_MS,
  nowMs: number = Date.now(),
): number | undefined {
  return new RetryAfterParser(new FixedClock(new Date(nowMs)), maxMs).parse(
    value,
  );
}

class OutOfStockError extends DomainError {
  override readonly code = 'SALES.STOCK.OUT_OF_STOCK';
}

class UpstreamBusyError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.UPSTREAM_BUSY';

  constructor(cause?: unknown) {
    super('Upstream busy', { retryable: true, cause });
  }
}

class RejectedError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.REJECTED';
  readonly failureKind = FailureKind.Permanent;
  constructor(cause: unknown) {
    super('Rejected', { cause });
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

describe('FailureClassifier signals', () => {
  it.each([
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'EPIPE',
    'UND_ERR_SOCKET',
    'UND_ERR_HEADERS_TIMEOUT',
  ])('treats code %s as transient', (code) => {
    expect(classifier.classify(withCode(code))).toBe(FailureKind.Transient);
  });

  it.each(['40001', '08006', '23505', 'ERR_INVALID_ARG_TYPE', 'ENOENT'])(
    'does not treat code %s as transient',
    (code) => {
      expect(classifier.classify(withCode(code))).toBe(FailureKind.Permanent);
    },
  );

  it.each([408, 425, 429, 502, 503, 504])(
    'treats HTTP %i as transient',
    (status) => {
      expect(classifier.classify(withStatus(status))).toBe(
        FailureKind.Transient,
      );
      expect(classifier.classify(withStatus(status, 'statusCode'))).toBe(
        FailureKind.Transient,
      );
    },
  );

  it.each([400, 401, 403, 404, 409, 422, 500, 501])(
    'treats HTTP %i as permanent',
    (status) => {
      expect(classifier.classify(withStatus(status))).toBe(
        FailureKind.Permanent,
      );
    },
  );

  it('ignores status values that are not HTTP error statuses', () => {
    expect(classifier.classify(withStatus(200))).toBe(FailureKind.Permanent);
    expect(classifier.classify(withStatus(503.5))).toBe(FailureKind.Permanent);
  });

  it('maps AbortError to cancelled and TimeoutError to timeout', () => {
    expect(classifier.classify(named('AbortError'))).toBe(
      FailureKind.Cancelled,
    );
    expect(classifier.classify(named('TimeoutError'))).toBe(
      FailureKind.Timeout,
    );
  });

  it('classifies real abort and timeout reasons from AbortSignal', () => {
    const aborted = AbortSignal.abort();
    expect(classifier.classify(aborted.reason)).toBe(FailureKind.Cancelled);
    const controller = new AbortController();
    controller.abort(new DOMException('late', 'TimeoutError'));
    expect(classifier.classify(controller.signal.reason)).toBe(
      FailureKind.Timeout,
    );
  });

  it('uses the retryable flag of PlatformError', () => {
    expect(classifier.classify(new UpstreamBusyError())).toBe(
      FailureKind.Transient,
    );
    expect(classifier.classify(new OutOfStockError('no stock'))).toBe(
      FailureKind.Permanent,
    );
    expect(classifier.classify({ retryable: true })).toBe(
      FailureKind.Transient,
    );
  });

  it('does not follow the cause of a PlatformError: it carries its own failureKind', () => {
    class PersistenceError extends PlatformError {
      override readonly code = 'PLATFORM.TEST.PERSISTENCE';
      constructor(cause: unknown, failureKind?: FailureKind) {
        super('Persistence failed', { cause, failureKind });
      }
    }
    expect(
      classifier.classify(new PersistenceError(withCode('ECONNRESET'))),
    ).toBe(FailureKind.Permanent);
    expect(
      classifier.classify(
        new PersistenceError(withCode('ECONNRESET'), FailureKind.Transient),
      ),
    ).toBe(FailureKind.Transient);
  });

  it('prefers a declared failureKind', () => {
    expect(classifier.classify(new DeadlineExceededError(0))).toBe(
      FailureKind.Timeout,
    );
    expect(classifier.classify(new NonJsonValueError('$', 'x'))).toBe(
      FailureKind.ProtocolViolation,
    );
    expect(classifier.classify(new InvalidArgumentError('a', 'b'))).toBe(
      FailureKind.ProtocolViolation,
    );
    expect(classifier.classify(new StaleClaimError('complete'))).toBe(
      FailureKind.Permanent,
    );
    expect(
      classifier.classify({
        failureKind: FailureKind.Cancelled,
        retryable: true,
      }),
    ).toBe(FailureKind.Cancelled);
  });

  it('ignores an unknown failureKind value', () => {
    expect(
      classifier.classify({ failureKind: 'maybe', code: 'ECONNRESET' }),
    ).toBe(FailureKind.Transient);
  });

  it('walks the cause chain when the outer error says nothing', () => {
    const fetchFailed = new TypeError('fetch failed', {
      cause: withCode('ECONNREFUSED'),
    });
    expect(classifier.classify(fetchFailed)).toBe(FailureKind.Transient);

    const deep = new Error('l0', {
      cause: new Error('l1', {
        cause: new Error('l2', { cause: withStatus(503) }),
      }),
    });
    expect(classifier.classify(deep)).toBe(FailureKind.Transient);
  });

  it('stops after FailureClassifier.MAX_CAUSE_DEPTH levels of cause', () => {
    let error: unknown = withCode('ECONNRESET');
    for (let i = 0; i <= FailureClassifier.MAX_CAUSE_DEPTH; i += 1) {
      error = new Error(`level ${i}`, { cause: error });
    }
    expect(classifier.classify(error)).toBe(FailureKind.Permanent);
  });

  it('lets the outer explicit signal win over the cause', () => {
    expect(classifier.classify(new RejectedError(withCode('ECONNRESET')))).toBe(
      FailureKind.Permanent,
    );
    expect(classifier.classify(new UpstreamBusyError(withStatus(400)))).toBe(
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
    expect(classifier.classify(named(name))).toBe(
      FailureKind.ProtocolViolation,
    );
  });

  it('treats a real TypeError as a protocol violation', () => {
    let error: unknown;
    try {
      (undefined as unknown as { run(): void }).run();
    } catch (caught) {
      error = caught;
    }
    expect(classifier.classify(error)).toBe(FailureKind.ProtocolViolation);
  });

  it('treats anything else as permanent', () => {
    expect(classifier.classify(new Error('boom'))).toBe(FailureKind.Permanent);
    expect(classifier.classify('a string')).toBe(FailureKind.Permanent);
    expect(classifier.classify(42)).toBe(FailureKind.Permanent);
    expect(classifier.classify(null)).toBe(FailureKind.Permanent);
    expect(classifier.classify(undefined)).toBe(FailureKind.Permanent);
    expect(classifier.classify({})).toBe(FailureKind.Permanent);
  });

  it('ignores provider-specific fields: the adapter translates them', () => {
    const sdkError = Object.assign(new Error('ThrottlingException'), {
      name: 'ThrottlingException',
      $retryable: { throttling: true },
      $metadata: { httpStatusCode: 400 },
    });
    expect(classifier.classify(sdkError)).toBe(FailureKind.Permanent);
  });

  it('survives a self-referencing cause', () => {
    const error = new Error('loop') as Error & { cause?: unknown };
    error.cause = error;
    expect(classifier.classify(error)).toBe(FailureKind.Permanent);
  });
});

describe('FailureClassifier.isTransient', () => {
  it('is true only for transient failures', () => {
    expect(classifier.isTransient(withCode('ECONNRESET'))).toBe(true);
    expect(classifier.isTransient(new UpstreamBusyError())).toBe(true);
    expect(classifier.isTransient(named('TimeoutError'))).toBe(false);
    expect(classifier.isTransient(named('AbortError'))).toBe(false);
    expect(classifier.isTransient(new DeadlineExceededError(0))).toBe(false);
    expect(classifier.isTransient(new OutOfStockError('x'))).toBe(false);
    expect(classifier.isTransient(new TypeError('x'))).toBe(false);
  });
});

describe('RetryAfterParser.parse', () => {
  const now = Date.parse('2026-11-12T10:00:00.000Z');

  it('reads delay-seconds from a header', () => {
    expect(retryAfter('5', 60_000, now)).toBe(5_000);
    expect(retryAfter('2026', 60_000, now)).toBe(60_000);
    expect(retryAfter(' 0 ', 60_000, now)).toBe(0);
  });

  it('reads seconds as a number, including fractions', () => {
    expect(retryAfter(2, 60_000, now)).toBe(2_000);
    expect(retryAfter(0.25, 60_000, now)).toBe(250);
  });

  it('reads an HTTP date relative to now', () => {
    expect(retryAfter('Thu, 12 Nov 2026 10:00:30 GMT', 60_000, now)).toBe(
      30_000,
    );
  });

  it('reads a Date relative to now', () => {
    expect(retryAfter(new Date(now + 1_500), 60_000, now)).toBe(1_500);
  });

  it('returns 0 for dates in the past', () => {
    expect(retryAfter('Thu, 12 Nov 2026 09:00:00 GMT', 60_000, now)).toBe(0);
    expect(retryAfter(new Date(now - 10), 60_000, now)).toBe(0);
  });

  it('caps the result at maxMs', () => {
    expect(retryAfter('3600', 10_000, now)).toBe(10_000);
    expect(retryAfter(9_999_999_999, 10_000, now)).toBe(10_000);
    expect(retryAfter('Fri, 31 Dec 9999 23:59:59 GMT', 10_000, now)).toBe(
      10_000,
    );
  });

  it('uses RetryAfterParser.DEFAULT_MAX_MS when no max is given', () => {
    expect(retryAfter('99999')).toBe(RetryAfterParser.DEFAULT_MAX_MS);
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
      retryAfter(value as string | number | Date | undefined, 60_000, now),
    ).toBeUndefined();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects maxMs %p',
    (maxMs) => {
      expect(() => retryAfter('1', maxMs, now)).toThrow(InvalidArgumentError);
    },
  );
});
