import { DomainError, PlatformError } from '@platform/kernel';
import {
  CallOutcome,
  CallOutcomeKind,
  isFinalOutcome,
  isSuccess,
} from './call-outcome.js';
import { DeadlineExceededError, NonJsonValueError } from './errors.js';

class OutOfStockError extends DomainError {
  override readonly code = 'SALES.STOCK.OUT_OF_STOCK';
}

class UpstreamBusyError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.UPSTREAM_BUSY';
  constructor() {
    super('Upstream busy', { retryable: true });
  }
}

function describeOutcome(outcome: CallOutcome<number>): string {
  switch (outcome.kind) {
    case CallOutcomeKind.Success:
      return `ok:${outcome.value}`;
    case CallOutcomeKind.BusinessError:
      return `business:${outcome.code}`;
    case CallOutcomeKind.ProtocolViolation:
      return `protocol:${outcome.reason}`;
    case CallOutcomeKind.TransientFailure:
      return `transient:${outcome.retryAfterMs ?? '-'}`;
    case CallOutcomeKind.Uncertain:
      return `uncertain:${outcome.reason}`;
  }
}

describe('CallOutcome constructors', () => {
  it('builds each kind', () => {
    expect(CallOutcome.success(1)).toEqual({ kind: 'success', value: 1 });
    expect(
      CallOutcome.businessError('SALES.STOCK.OUT_OF_STOCK', {
        message: 'No stock',
        details: { sku: 'A1' },
      }),
    ).toEqual({
      kind: 'business-error',
      code: 'SALES.STOCK.OUT_OF_STOCK',
      message: 'No stock',
      details: { sku: 'A1' },
    });
    expect(CallOutcome.businessError('A.B.C')).toEqual({
      kind: 'business-error',
      code: 'A.B.C',
    });
    expect(CallOutcome.protocolViolation('bad output')).toEqual({
      kind: 'protocol-violation',
      reason: 'bad output',
    });
    expect(CallOutcome.protocolViolation('bad', 'A.B.C')).toEqual({
      kind: 'protocol-violation',
      reason: 'bad',
      code: 'A.B.C',
    });
    expect(CallOutcome.transientFailure('busy', { retryAfterMs: 500 })).toEqual(
      { kind: 'transient-failure', reason: 'busy', retryAfterMs: 500 },
    );
    expect(CallOutcome.uncertain('timeout')).toEqual({
      kind: 'uncertain',
      reason: 'timeout',
    });
  });

  it('supports exhaustive switches on kind', () => {
    expect(describeOutcome(CallOutcome.success(2))).toBe('ok:2');
    expect(describeOutcome(CallOutcome.businessError('A.B.C'))).toBe(
      'business:A.B.C',
    );
    expect(describeOutcome(CallOutcome.protocolViolation('x'))).toBe(
      'protocol:x',
    );
    expect(describeOutcome(CallOutcome.transientFailure('x'))).toBe(
      'transient:-',
    );
    expect(describeOutcome(CallOutcome.uncertain('late'))).toBe(
      'uncertain:late',
    );
  });
});

describe('guards', () => {
  it('isSuccess narrows to the success kind', () => {
    const outcome: CallOutcome<string> = CallOutcome.success('v');
    expect(isSuccess(outcome)).toBe(true);
    if (isSuccess(outcome)) {
      expect(outcome.value.toUpperCase()).toBe('V');
    }
    expect(isSuccess(CallOutcome.uncertain('x'))).toBe(false);
  });

  it('isFinalOutcome accepts only success and business errors', () => {
    expect(isFinalOutcome(CallOutcome.success(1))).toBe(true);
    expect(isFinalOutcome(CallOutcome.businessError('A.B.C'))).toBe(true);
    expect(isFinalOutcome(CallOutcome.protocolViolation('x'))).toBe(false);
    expect(isFinalOutcome(CallOutcome.transientFailure('x'))).toBe(false);
    expect(isFinalOutcome(CallOutcome.uncertain('x'))).toBe(false);
  });
});

describe('CallOutcome.fromError', () => {
  it('maps a DomainError to a business error with its code', () => {
    const outcome = CallOutcome.fromError(
      new OutOfStockError('No stock', { sku: 'A1' }),
    );
    expect(outcome).toEqual({
      kind: 'business-error',
      code: 'SALES.STOCK.OUT_OF_STOCK',
      message: 'No stock',
      details: { sku: 'A1' },
    });
  });

  it('omits details when the DomainError has none', () => {
    expect(CallOutcome.fromError(new OutOfStockError('x'))).not.toHaveProperty(
      'details',
    );
  });

  it('maps transient errors to transient-failure and keeps the cause', () => {
    const cause = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    const outcome = CallOutcome.fromError(cause);
    expect(outcome).toEqual({
      kind: 'transient-failure',
      reason: 'ECONNRESET',
      cause,
    });
    expect(CallOutcome.fromError(new UpstreamBusyError()).kind).toBe(
      CallOutcomeKind.TransientFailure,
    );
  });

  it('maps timeouts and cancellations to uncertain', () => {
    const timeout = new DeadlineExceededError(0);
    expect(CallOutcome.fromError(timeout)).toEqual({
      kind: 'uncertain',
      reason: 'PLATFORM.PRIMITIVES.DEADLINE_EXCEEDED',
      cause: timeout,
    });
    expect(CallOutcome.fromError(AbortSignal.abort().reason).kind).toBe(
      CallOutcomeKind.Uncertain,
    );
  });

  it('maps protocol violations and unknown errors to protocol-violation', () => {
    expect(CallOutcome.fromError(new NonJsonValueError('$', 'x'))).toEqual({
      kind: 'protocol-violation',
      reason: 'PLATFORM.PRIMITIVES.NON_JSON_VALUE',
      code: 'PLATFORM.PRIMITIVES.NON_JSON_VALUE',
    });
    expect(CallOutcome.fromError(new TypeError('x is undefined'))).toEqual({
      kind: 'protocol-violation',
      reason: 'TypeError',
    });
    expect(CallOutcome.fromError('boom')).toEqual({
      kind: 'protocol-violation',
      reason: 'string',
    });
    expect(CallOutcome.fromError(null)).toEqual({
      kind: 'protocol-violation',
      reason: 'object',
    });
  });

  it('does not copy the raw message of non-domain errors', () => {
    const outcome = CallOutcome.fromError(
      new Error('raw input RAW-VALUE-123 rejected'),
    );
    expect(JSON.stringify(outcome)).not.toContain('RAW-VALUE-123');
  });
});
