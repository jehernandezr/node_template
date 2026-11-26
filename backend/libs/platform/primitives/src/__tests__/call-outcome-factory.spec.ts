import { DomainError, FailureKind, PlatformError } from '@platform/kernel';
import { CallOutcomeKind, isFinalOutcome } from '../call-outcome.js';
import { CallOutcomeFactory } from '../call-outcome-factory.js';
import { DeadlineExceededError } from '../errors/deadline-exceeded.error.js';
import { NonJsonValueError } from '../errors/non-json-value.error.js';
import { FailureClassifier } from '../failure/failure-classifier.js';
import { FailureRule } from '../failure/failure-rule.js';

class OutOfStockError extends DomainError {
  override readonly code = 'SALES.STOCK.OUT_OF_STOCK';
}

class UpstreamBusyError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.UPSTREAM_BUSY';
  constructor() {
    super('Upstream busy', { retryable: true });
  }
}

/** Rule of a fake provider: its `THROTTLED` code is transient. */
class ThrottledRule extends FailureRule {
  override classify(error: object): FailureKind | undefined {
    return (error as { code?: unknown }).code === 'THROTTLED'
      ? FailureKind.Transient
      : undefined;
  }
}

describe('CallOutcomeFactory', () => {
  const factory = new CallOutcomeFactory(new FailureClassifier());

  it('maps a DomainError to a business error with its code', () => {
    const outcome = factory.fromError(
      new OutOfStockError('No stock', { sku: 'A1' }),
    );
    expect(outcome).toEqual({
      kind: 'business-error',
      code: 'SALES.STOCK.OUT_OF_STOCK',
      message: 'No stock',
      details: { sku: 'A1' },
    });
  });

  it('maps a retryable DomainError to a non-final transient failure', () => {
    class ConflictError extends DomainError {
      override readonly code = 'SALES.STOCK.CONFLICT';
    }
    const error = new ConflictError('Conflict', undefined, {
      retryable: true,
    });
    const outcome = factory.fromError(error);
    expect(outcome).toEqual({
      kind: 'transient-failure',
      reason: 'SALES.STOCK.CONFLICT',
      cause: error,
    });
    expect(isFinalOutcome(outcome)).toBe(false);
  });

  it('omits details when the DomainError has none', () => {
    expect(factory.fromError(new OutOfStockError('x'))).not.toHaveProperty(
      'details',
    );
  });

  it('maps transient errors to transient-failure and keeps the cause', () => {
    const cause = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    const outcome = factory.fromError(cause);
    expect(outcome).toEqual({
      kind: 'transient-failure',
      reason: 'ECONNRESET',
      cause,
    });
    expect(factory.fromError(new UpstreamBusyError()).kind).toBe(
      CallOutcomeKind.TransientFailure,
    );
  });

  it('maps timeouts and cancellations to uncertain', () => {
    const timeout = new DeadlineExceededError(0);
    expect(factory.fromError(timeout)).toEqual({
      kind: 'uncertain',
      reason: 'PLATFORM.PRIMITIVES.DEADLINE_EXCEEDED',
      cause: timeout,
    });
    expect(factory.fromError(AbortSignal.abort().reason).kind).toBe(
      CallOutcomeKind.Uncertain,
    );
  });

  it('maps protocol violations and unknown errors to protocol-violation', () => {
    expect(factory.fromError(new NonJsonValueError('$', 'x'))).toEqual({
      kind: 'protocol-violation',
      reason: 'PLATFORM.PRIMITIVES.NON_JSON_VALUE',
      code: 'PLATFORM.PRIMITIVES.NON_JSON_VALUE',
    });
    expect(factory.fromError(new TypeError('x is undefined'))).toEqual({
      kind: 'protocol-violation',
      reason: 'TypeError',
    });
    expect(factory.fromError('boom')).toEqual({
      kind: 'protocol-violation',
      reason: 'string',
    });
    expect(factory.fromError(null)).toEqual({
      kind: 'protocol-violation',
      reason: 'object',
    });
  });

  it('does not copy the raw message of non-domain errors', () => {
    const outcome = factory.fromError(
      new Error('raw input RAW-VALUE-123 rejected'),
    );
    expect(JSON.stringify(outcome)).not.toContain('RAW-VALUE-123');
  });

  it('uses the rules of the injected classifier', () => {
    const throttled = Object.assign(new Error('slow down'), {
      code: 'THROTTLED',
    });
    const withRule = new CallOutcomeFactory(
      new FailureClassifier([new ThrottledRule()]),
    );

    expect(withRule.fromError(throttled).kind).toBe(
      CallOutcomeKind.TransientFailure,
    );
    expect(factory.fromError(throttled).kind).toBe(
      CallOutcomeKind.ProtocolViolation,
    );
  });
});
