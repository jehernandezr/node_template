import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { Deadline, StaleClaimError } from '@platform/primitives';
import { ClaimState } from '@platform/kernel';
import { ProcessedMessageKey } from '../dispatch/processed-message-key.js';
import { AcquiredClaim } from './utils/acquired-claim.js';
import { InMemoryProcessedMessageStore } from './utils/in-memory-processed-message-store.js';
import { runProcessedMessageStoreContract } from './utils/run-processed-message-store-contract.js';

describe('InMemoryProcessedMessageStore', () => {
  function setup() {
    const clock = new FixedClock();
    const store = new InMemoryProcessedMessageStore(
      clock,
      new SequentialIdGenerator(),
    );
    const request = {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, clock),
      minLeaseMs: 30_000,
    };
    return { clock, store, request };
  }

  it('has three states: acquired, in progress, completed', async () => {
    const { store, request } = setup();
    const key = ProcessedMessageKey.of('audit', 'm1');

    const first = AcquiredClaim.of(await store.claim(key, request));
    expect(first.state).toBe(ClaimState.Acquired);
    expect((await store.claim(key, request)).state).toBe(ClaimState.InProgress);

    await store.complete(key, first.claimToken, { processedAt: 1 });
    expect(await store.claim(key, request)).toEqual({
      state: ClaimState.Completed,
      result: { processedAt: 1 },
      fingerprint: 'fp',
    });
  });

  it('keeps the lease for at least minLeaseMs', async () => {
    const { clock, store, request } = setup();
    const claim = await store.claim(
      ProcessedMessageKey.of('audit', 'm1'),
      request,
    );
    expect(claim).toMatchObject({
      state: ClaimState.Acquired,
      leaseUntil: clock.now().getTime() + 30_000,
    });
  });

  it('rejects completion and release with a stale token', async () => {
    const { clock, store, request } = setup();
    const key = ProcessedMessageKey.of('audit', 'm1');
    const first = AcquiredClaim.of(await store.claim(key, request));
    clock.advance(60_000);
    const second = await store.claim(key, {
      ...request,
      deadline: Deadline.after(1_000, clock),
    });
    expect(second).toMatchObject({
      state: ClaimState.Acquired,
      takeover: true,
    });

    await expect(
      store.complete(key, first.claimToken, { processedAt: 1 }),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(store.release(key, first.claimToken)).rejects.toBeInstanceOf(
      StaleClaimError,
    );
  });

  it('defaults to the system clock and UUIDv7 tokens', async () => {
    const store = new InMemoryProcessedMessageStore();
    const claim = await store.claim(ProcessedMessageKey.of('audit', 'm1'), {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, new FixedClock(new Date())),
    });
    expect(claim.state).toBe(ClaimState.Acquired);
  });
});

describe('InMemoryProcessedMessageStore contract', () => {
  runProcessedMessageStoreContract(() => {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const store = new InMemoryProcessedMessageStore(
      clock,
      new SequentialIdGenerator(),
    );
    return Promise.resolve({ store, clock });
  });
});
