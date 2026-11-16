import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { Deadline } from '@platform/primitives';
import { ClaimState } from '@platform/kernel';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { MessagingGuard } from '../../errors/messaging-guard.js';
import { ClaimGuard } from '../claim-guard.js';
import { type ClaimOutcome, ClaimOutcomeKind } from '../claim-outcome.js';
import { DispatchOutcome } from '../dispatch-outcome.enum.js';
import { ProcessedMessageKey } from '../processed-message-key.js';
import {
  FailingProcessedMessageStore,
  RecordingProcessedMessageStore,
  StoreOperation,
} from './utils/index.js';

type AcquiredOutcome = Extract<
  ClaimOutcome,
  { kind: ClaimOutcomeKind.Acquired }
>;

const CONSUMER = 'notifications';
const BASE_LEASE_MS = 30_000;
const KEY = ProcessedMessageKey.of(CONSUMER, 'msg-1');

function setup(config: { leaseMarginMs?: number } = {}) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const store = new RecordingProcessedMessageStore(
    clock,
    new SequentialIdGenerator(),
  );
  const guard = new ClaimGuard(store, clock, MessagingGuard.instance, {
    baseLeaseMs: BASE_LEASE_MS,
    ...config,
  });
  return { clock, store, guard };
}

function envelopeWith(data: unknown) {
  return EnvelopeBuilder.anEnvelope({ id: 'msg-1', data });
}

describe('ClaimGuard', () => {
  it('acquires the claim of a message nobody has processed', async () => {
    const { guard, store } = setup();
    const envelope = envelopeWith({ id: 't1' });

    const outcome = await guard.claim(
      envelope,
      guard.fingerprint(envelope),
      CONSUMER,
      { receiveCount: 1 },
    );

    expect(outcome).toEqual({
      kind: ClaimOutcomeKind.Acquired,
      claim: { key: KEY, token: expect.any(String) },
    });
    expect(store.claims).toHaveLength(1);
  });

  it('settles as in progress with the exact lease left while another delivery holds the claim', async () => {
    const { guard } = setup({ leaseMarginMs: 0 });
    const envelope = envelopeWith({ id: 't1' });
    const fingerprint = guard.fingerprint(envelope);
    await guard.claim(envelope, fingerprint, CONSUMER, { receiveCount: 1 });

    const outcome = await guard.claim(envelope, fingerprint, CONSUMER, {
      receiveCount: 2,
    });

    expect(outcome).toEqual({
      kind: ClaimOutcomeKind.Settled,
      result: {
        outcome: DispatchOutcome.InProgress,
        id: 'msg-1',
        delayMs: BASE_LEASE_MS,
      },
    });
  });

  it('settles as duplicate once the claim is completed', async () => {
    const { guard } = setup();
    const envelope = envelopeWith({ id: 't1' });
    const fingerprint = guard.fingerprint(envelope);
    const first = await guard.claim(envelope, fingerprint, CONSUMER, {
      receiveCount: 1,
    });
    await guard.complete((first as AcquiredOutcome).claim);

    expect(
      await guard.claim(envelope, fingerprint, CONSUMER, { receiveCount: 2 }),
    ).toEqual({
      kind: ClaimOutcomeKind.Settled,
      result: { outcome: DispatchOutcome.Duplicate, id: 'msg-1' },
    });
  });

  it('dead-letters a fingerprint conflict and releases the claim it had just acquired', async () => {
    const { guard, store, clock } = setup();
    await store.claim(KEY, {
      fingerprint: 'other-content',
      deadline: Deadline.after(1_000, clock),
    });
    clock.advance(60_000);
    const envelope = envelopeWith({ id: 't1' });

    expect(
      await guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
        receiveCount: 1,
      }),
    ).toEqual({
      kind: ClaimOutcomeKind.Settled,
      result: {
        outcome: DispatchOutcome.DeadLetter,
        id: 'msg-1',
        error: 'message id was already used with different content',
        code: MessagingErrorCode.IdempotencyConflict,
      },
    });
    expect(store.releases).toBe(1);
    expect(
      await store.claim(KEY, {
        fingerprint: 'probe',
        deadline: Deadline.after(1_000, clock),
      }),
    ).toMatchObject({ state: ClaimState.Acquired });
  });

  it('dead-letters a fingerprint conflict held by another delivery without releasing it', async () => {
    const { guard, store, clock } = setup();
    await store.claim(KEY, {
      fingerprint: 'other-content',
      deadline: Deadline.after(60_000, clock),
    });
    const envelope = envelopeWith({ id: 't1' });

    expect(
      await guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
        receiveCount: 1,
      }),
    ).toMatchObject({
      kind: ClaimOutcomeKind.Settled,
      result: { code: MessagingErrorCode.IdempotencyConflict },
    });
    expect(store.releases).toBe(0);
  });

  it.each([
    ['no visibility timeout is given', undefined, BASE_LEASE_MS],
    ['the visibility timeout is below the base lease', 10_000, BASE_LEASE_MS],
    ['the visibility timeout is above the base lease', 600_000, 600_000],
  ])(
    'asks the store for the larger of the base lease and the delivery timeout when %s',
    async (_label, visibilityTimeoutMs, expectedLease) => {
      const { guard, store } = setup();
      const envelope = envelopeWith({ id: 't1' });

      await guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
        receiveCount: 1,
        ...(visibilityTimeoutMs === undefined ? {} : { visibilityTimeoutMs }),
      });

      expect(store.claims[0]).toMatchObject({ minLeaseMs: expectedLease });
    },
  );

  it('passes the lease margin to the store only when it was configured', async () => {
    const { guard, store } = setup({ leaseMarginMs: 500 });
    const envelope = envelopeWith({ id: 't1' });

    await guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
      receiveCount: 1,
    });

    expect(store.claims[0]).toMatchObject({ leaseMarginMs: 500 });
  });

  it('omits the lease margin when it was not configured', async () => {
    const { guard, store } = setup();
    const envelope = envelopeWith({ id: 't1' });

    await guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
      receiveCount: 1,
    });

    expect(store.claims[0]).not.toHaveProperty('leaseMarginMs');
  });

  it('computes the same fingerprint whatever the order of the keys', () => {
    const { guard } = setup();

    expect(guard.fingerprint(envelopeWith({ a: 1, b: { c: 2, d: 3 } }))).toBe(
      guard.fingerprint(envelopeWith({ b: { d: 3, c: 2 }, a: 1 })),
    );
  });

  it('computes a different fingerprint when the data differs', () => {
    const { guard } = setup();

    expect(guard.fingerprint(envelopeWith({ a: 1 }))).not.toBe(
      guard.fingerprint(envelopeWith({ a: 2 })),
    );
  });

  it('rejects data that is not canonical JSON with InvalidEnvelope', () => {
    const { guard } = setup();

    expect(() =>
      guard.fingerprint(envelopeWith({ amount: BigInt(1) })),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
    );
  });

  it('stores the completion time read from the clock', async () => {
    const { guard, store, clock } = setup();
    const envelope = envelopeWith({ id: 't1' });
    const acquired = await guard.claim(
      envelope,
      guard.fingerprint(envelope),
      CONSUMER,
      { receiveCount: 1 },
    );
    clock.advance(5_000);

    await guard.complete((acquired as AcquiredOutcome).claim);

    expect(
      await store.claim(KEY, {
        fingerprint: 'probe',
        deadline: Deadline.after(1_000, clock),
      }),
    ).toMatchObject({
      state: ClaimState.Completed,
      result: { processedAt: clock.now().getTime() },
    });
  });

  it('swallows a failed release, since the lease bounds the claim', async () => {
    const { clock } = setup();
    const store = new FailingProcessedMessageStore(
      StoreOperation.Release,
      new Error('store down'),
    );
    const guard = new ClaimGuard(store, clock, MessagingGuard.instance, {
      baseLeaseMs: BASE_LEASE_MS,
    });

    await expect(
      guard.release({ key: KEY, token: 'token' }),
    ).resolves.toBeUndefined();
  });

  it('lets a store failure while claiming surface unchanged', async () => {
    const { clock } = setup();
    const failure = new Error('connection reset');
    const guard = new ClaimGuard(
      new FailingProcessedMessageStore(StoreOperation.Claim, failure),
      clock,
      MessagingGuard.instance,
      { baseLeaseMs: BASE_LEASE_MS },
    );
    const envelope = envelopeWith({ id: 't1' });

    await expect(
      guard.claim(envelope, guard.fingerprint(envelope), CONSUMER, {
        receiveCount: 1,
      }),
    ).rejects.toBe(failure);
  });

  it.each([
    ['a base lease of zero', { baseLeaseMs: 0 }],
    ['a base lease that is not an integer', { baseLeaseMs: 1.5 }],
    [
      'a negative lease margin',
      { baseLeaseMs: BASE_LEASE_MS, leaseMarginMs: -1 },
    ],
  ])('rejects %s with InvalidOptions', (_label, config) => {
    const { clock, store } = setup();

    expect(
      () => new ClaimGuard(store, clock, MessagingGuard.instance, config),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });
});
