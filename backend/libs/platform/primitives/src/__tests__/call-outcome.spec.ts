import { DomainError } from '@platform/kernel';
import {
  CallOutcome,
  CallOutcomeKind,
  isFinalOutcome,
  isSuccess,
} from '../call-outcome.js';
import { CallOutcomeFactory } from '../call-outcome-factory.js';
import { FailureClassifier } from '../failure/failure-classifier.js';

class OutOfStockError extends DomainError {
  override readonly code = 'SALES.STOCK.OUT_OF_STOCK';
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
  it('maps like a factory with the default classifier', () => {
    const error = new OutOfStockError('No stock', { sku: 'A1' });

    expect(CallOutcome.fromError(error)).toEqual(
      new CallOutcomeFactory(new FailureClassifier()).fromError(error),
    );
  });
});
