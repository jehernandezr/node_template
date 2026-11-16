import { DomainError, FailureKind, PlatformError } from '@platform/kernel';
import { FailureClassifier } from '../failure-classifier.js';
import type { FailureRule } from '../failure-rule.js';

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

  constructor(cause: unknown) {
    super('Rejected', { cause, failureKind: FailureKind.Permanent });
  }
}

function like(props: Record<string, unknown>, name = 'Error'): Error {
  const error = new Error('x');
  error.name = name;
  return Object.assign(error, props);
}

describe('FailureClassifier', () => {
  const classifier = new FailureClassifier();

  it.each([
    ['domain error', new OutOfStockError('x'), FailureKind.Permanent],
    [
      'retryable platform error',
      new UpstreamBusyError(),
      FailureKind.Transient,
    ],
    [
      'explicit failureKind',
      like({ failureKind: FailureKind.Timeout }),
      FailureKind.Timeout,
    ],
    ['AbortError', like({}, 'AbortError'), FailureKind.Cancelled],
    ['TimeoutError', like({}, 'TimeoutError'), FailureKind.Timeout],
    ['retryable flag', like({ retryable: true }), FailureKind.Transient],
    ['network code', like({ code: 'ECONNRESET' }), FailureKind.Transient],
    ['unknown code', like({ code: 'EOTHER' }), FailureKind.Permanent],
    ['status 503', like({ status: 503 }), FailureKind.Transient],
    ['statusCode 429', like({ statusCode: 429 }), FailureKind.Transient],
    ['status 404', like({ status: 404 }), FailureKind.Permanent],
    ['status 500', like({ status: 500 }), FailureKind.Permanent],
    ['status 200 is no signal', like({ status: 200 }), FailureKind.Permanent],
    ['TypeError', new TypeError('x'), FailureKind.ProtocolViolation],
    ['ZodError by name', like({}, 'ZodError'), FailureKind.ProtocolViolation],
    ['plain error', new Error('x'), FailureKind.Permanent],
    ['string', 'boom', FailureKind.Permanent],
    ['null', null, FailureKind.Permanent],
  ])('classifies %s', (_label, error, expected) => {
    expect(classifier.classify(error)).toBe(expected);
  });

  it('follows the cause chain, outermost signal first', () => {
    const inner = like({ code: 'ECONNRESET' });
    expect(classifier.classify(new Error('wrap', { cause: inner }))).toBe(
      FailureKind.Transient,
    );
    expect(classifier.classify(new RejectedError(inner))).toBe(
      FailureKind.Permanent,
    );
  });

  it('stops after MAX_CAUSE_DEPTH levels', () => {
    let error: unknown = like({ code: 'ECONNRESET' });
    for (
      let level = 0;
      level <= FailureClassifier.MAX_CAUSE_DEPTH;
      level += 1
    ) {
      error = new Error('wrap', { cause: error });
    }
    expect(classifier.classify(error)).toBe(FailureKind.Permanent);
  });

  it('isTransient is true only for transient failures', () => {
    expect(classifier.isTransient(new UpstreamBusyError())).toBe(true);
    expect(classifier.isTransient(like({}, 'TimeoutError'))).toBe(false);
    expect(classifier.isTransient(like({}, 'AbortError'))).toBe(false);
  });

  describe('rules', () => {
    const rule: FailureRule = {
      classify: (error) =>
        (error as { sqlState?: string }).sqlState === '40001'
          ? FailureKind.Transient
          : undefined,
    };
    const withRule = new FailureClassifier([rule]);

    it('translates provider errors before the built-in signals', () => {
      expect(withRule.classify(like({ sqlState: '40001', status: 400 }))).toBe(
        FailureKind.Transient,
      );
    });

    it('applies to every node of the cause chain', () => {
      const wrapped = new Error('wrap', { cause: like({ sqlState: '40001' }) });
      expect(withRule.classify(wrapped)).toBe(FailureKind.Transient);
    });

    it('falls back to the built-in signals when no rule matches', () => {
      expect(withRule.classify(like({ status: 503 }))).toBe(
        FailureKind.Transient,
      );
    });
  });
});
