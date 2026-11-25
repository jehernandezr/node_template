import { QueueDefaults } from '@contracts/platform';
import { FailureKind } from '@platform/kernel';
import { FixedRandomSource } from '@platform/kernel/test-utils';
import {
  BackoffStrategy,
  FailureClassifier,
  FailureRule,
  RetryPolicy,
} from '@platform/primitives';
import { z } from 'zod';
import { PermanentMessageError } from '../../errors/permanent-message.error.js';
import { DeliveryClassifier } from '../delivery-classifier.js';
import { ErrorDisposition } from '../error-disposition.enum.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';

/** Test rule that classifies any error with the given class. */
class KindRule extends FailureRule {
  constructor(private readonly kind: FailureKind) {
    super();
  }

  classify(): FailureKind {
    return this.kind;
  }
}

const ID = 'msg-1';
const NO_RANDOM = new FixedRandomSource([0.5]);
const PLATFORM_RULES = new FailureClassifier();

function classifierWith(
  failures: FailureClassifier = PLATFORM_RULES,
  isPermanent?: (error: unknown) => boolean,
): DeliveryClassifier {
  return new DeliveryClassifier(failures, NO_RANDOM, isPermanent);
}

/** Test error with the retry signal the platform asks for. */
function transient(message: string): Error {
  return Object.assign(new Error(message), { retryable: true });
}

const fullJitter = new RetryPolicy(5, 100, 10_000, BackoffStrategy.FullJitter);

describe('DeliveryClassifier', () => {
  describe('disposition by error', () => {
    it.each([
      ['a transient error', transient('busy'), ErrorDisposition.Retry],
      [
        'a timeout error',
        Object.assign(new Error('slow'), { name: 'TimeoutError' }),
        ErrorDisposition.Retry,
      ],
      [
        'a cancellation error',
        Object.assign(new Error('stopped'), { name: 'AbortError' }),
        ErrorDisposition.Retry,
      ],
      [
        'a transport code the platform knows to be transient',
        Object.assign(new Error('reset'), { code: 'ECONNRESET' }),
        ErrorDisposition.Retry,
      ],
      ['an HTTP 503 status', { status: 503 }, ErrorDisposition.Retry],
      [
        'an unknown error without any signal',
        new Error('network'),
        ErrorDisposition.DeadLetter,
      ],
      ['an HTTP 404 status', { status: 404 }, ErrorDisposition.DeadLetter],
      [
        'a ZodError (protocol violation)',
        new z.ZodError([]),
        ErrorDisposition.DeadLetter,
      ],
      [
        'a permanent message error',
        new PermanentMessageError('gone'),
        ErrorDisposition.DeadLetter,
      ],
    ])('classifies %s', (_label, error, expected) => {
      expect(classifierWith().disposition(error)).toBe(expected);
    });
  });

  describe('disposition by failure kind', () => {
    it.each([
      [FailureKind.Transient, ErrorDisposition.Retry],
      [FailureKind.Timeout, ErrorDisposition.Retry],
      [FailureKind.Cancelled, ErrorDisposition.Retry],
      [FailureKind.Permanent, ErrorDisposition.DeadLetter],
      [FailureKind.ProtocolViolation, ErrorDisposition.DeadLetter],
    ])('maps %s to %s', (kind, expected) => {
      const failures = new FailureClassifier([new KindRule(kind)]);

      expect(classifierWith(failures).disposition(new Error('x'))).toBe(
        expected,
      );
    });
  });

  it('lets the consumer rule decide over the failure classifier', () => {
    const classifier = classifierWith(PLATFORM_RULES, () => false);

    expect(classifier.disposition(new PermanentMessageError('gone'))).toBe(
      ErrorDisposition.Retry,
    );
  });

  it('lets a consumer rule mark a transient error as permanent', () => {
    const classifier = classifierWith(PLATFORM_RULES, () => true);

    expect(classifier.disposition(transient('busy'))).toBe(
      ErrorDisposition.DeadLetter,
    );
  });

  it('dead-letters a failure when there is no retry policy', () => {
    expect(
      classifierWith().failure(
        ID,
        transient('busy'),
        { receiveCount: 1 },
        false,
      ),
    ).toEqual({
      outcome: DispatchOutcome.DeadLetter,
      id: ID,
      error: 'busy',
    });
  });

  it('dead-letters once receiveCount reaches maxAttempts', () => {
    const policy = new RetryPolicy(3, 100, 10_000, BackoffStrategy.None);

    expect(
      classifierWith().failure(
        ID,
        transient('busy'),
        { receiveCount: 3, retryPolicy: policy },
        false,
      ),
    ).toEqual({ outcome: DispatchOutcome.DeadLetter, id: ID, error: 'busy' });
  });

  it('asks for a retry with the exact backoff delay of the policy', () => {
    // Second attempt: 200 ms ceiling; with randomness at 0.5 the wait is 100 ms.
    expect(
      classifierWith().failure(
        ID,
        transient('busy'),
        { receiveCount: 2, retryPolicy: fullJitter },
        false,
      ),
    ).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: ID,
      delayMs: 100,
      error: 'busy',
    });
  });

  it('does not throw for a very large receiveCount and caps the delay at maxMs', () => {
    const policy = new RetryPolicy(
      10_000,
      100,
      10_000,
      BackoffStrategy.FullJitter,
    );

    expect(
      classifierWith().failure(
        ID,
        transient('busy'),
        { receiveCount: 5_000, retryPolicy: policy },
        false,
      ),
    ).toEqual({
      outcome: DispatchOutcome.RetryLater,
      id: ID,
      delayMs: 5_000,
      error: 'busy',
    });
  });

  describe('during a database failover of two minutes', () => {
    const queuePolicy = new RetryPolicy(
      QueueDefaults.retry.maxAttempts,
      QueueDefaults.retry.baseMs,
      QueueDefaults.retry.maxMs,
      BackoffStrategy.FullJitter,
    );

    it('keeps retrying a delivery whose claim cannot reach the database, whatever its receive count', () => {
      const deliveries = Array.from({ length: 40 }, (_, index) =>
        classifierWith().failure(
          ID,
          transient('connection terminated'),
          { receiveCount: index + 1, retryPolicy: queuePolicy },
          true,
        ),
      );

      expect(
        deliveries.every(
          (result) => result.outcome === DispatchOutcome.RetryLater,
        ),
      ).toBe(true);
    });

    it('retries a handler that fails on the database for longer than the failover before dead-lettering it', () => {
      let waitedMs = 0;
      let receiveCount = 1;
      for (;;) {
        const result = classifierWith().failure(
          ID,
          transient('terminating connection'),
          { receiveCount, retryPolicy: queuePolicy },
          false,
        );
        if (result.outcome !== DispatchOutcome.RetryLater) {
          break;
        }
        waitedMs += result.delayMs;
        receiveCount += 1;
      }

      expect(waitedMs).toBeGreaterThan(2 * 60_000);
    });
  });

  it('retries an infrastructure failure even when the error is permanent', () => {
    expect(
      classifierWith().failure(
        ID,
        new PermanentMessageError('gone'),
        { receiveCount: 1, retryPolicy: fullJitter },
        true,
      ),
    ).toMatchObject({ outcome: DispatchOutcome.RetryLater });
  });

  it('carries the error code only when the error declares a valid one', () => {
    const coded = Object.assign(new Error('stock empty'), {
      code: 'INVENTORY.STOCK.EMPTY',
    });

    expect(
      classifierWith().failure(
        ID,
        coded,
        { receiveCount: 1, retryPolicy: fullJitter },
        false,
      ),
    ).toMatchObject({ code: 'INVENTORY.STOCK.EMPTY' });
    expect(
      classifierWith().failure(
        ID,
        transient('busy'),
        { receiveCount: 1, retryPolicy: fullJitter },
        false,
      ),
    ).not.toHaveProperty('code');
  });
});
