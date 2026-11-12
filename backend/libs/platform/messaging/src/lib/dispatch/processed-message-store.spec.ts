import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { ClaimState, Deadline, StaleClaimError } from '@platform/primitives';
import {
  InMemoryProcessedMessageStore,
  processedMessageKey,
} from './processed-message-store.js';

describe('processedMessageKey', () => {
  it('scopes keys by consumer without separator collisions', () => {
    expect(processedMessageKey('audit', 'm1')).not.toBe(
      processedMessageKey('notifications', 'm1'),
    );
    expect(processedMessageKey('a,b', 'c')).not.toBe(
      processedMessageKey('a', 'b,c'),
    );
  });
});

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
    const key = processedMessageKey('audit', 'm1');

    const first = await store.claim(key, request);
    expect(first.state).toBe(ClaimState.Acquired);
    expect((await store.claim(key, request)).state).toBe(ClaimState.InProgress);

    if (first.state !== ClaimState.Acquired) throw new Error('unreachable');
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
      processedMessageKey('audit', 'm1'),
      request,
    );
    expect(claim).toMatchObject({
      state: ClaimState.Acquired,
      leaseUntil: clock.now().getTime() + 30_000,
    });
  });

  it('rejects completion and release with a stale token', async () => {
    const { clock, store, request } = setup();
    const key = processedMessageKey('audit', 'm1');
    const first = await store.claim(key, request);
    clock.advance(60_000);
    const second = await store.claim(key, {
      ...request,
      deadline: Deadline.after(1_000, clock),
    });
    if (first.state !== ClaimState.Acquired) throw new Error('unreachable');
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
    const claim = await store.claim(processedMessageKey('audit', 'm1'), {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, new FixedClock(new Date())),
    });
    expect(claim.state).toBe(ClaimState.Acquired);
  });
});
