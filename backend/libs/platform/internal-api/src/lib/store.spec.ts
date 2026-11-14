import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import {
  CallOutcome,
  Deadline,
  InMemoryIdempotencyStore,
  StaleClaimError,
  type AcquiredClaim,
} from '@platform/primitives';
import { ClaimState, InMemoryProcessedOperationStore } from './store.js';

function setup() {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const store = new InMemoryProcessedOperationStore(
    clock,
    new SequentialIdGenerator(),
  );
  const request = (budgetMs = 1000) => ({
    fingerprint: 'h1',
    deadline: Deadline.after(budgetMs, clock),
    leaseMarginMs: 100,
  });
  return { clock, store, request };
}

describe('InMemoryProcessedOperationStore', () => {
  it('is the three-state store of @platform/primitives with default clock and ids', async () => {
    const store = new InMemoryProcessedOperationStore();
    expect(store).toBeInstanceOf(InMemoryIdempotencyStore);
    const claim = await store.claim('k', {
      fingerprint: 'h1',
      deadline: Deadline.after(1000, { now: () => new Date() }),
    });
    expect(claim.state).toBe(ClaimState.Acquired);
  });

  it('leases a claim until the deadline plus the margin', async () => {
    const { store, request, clock } = setup();
    const claim = (await store.claim('k', request())) as AcquiredClaim;

    expect(claim.leaseUntil).toBe(clock.now().getTime() + 1100);
    await expect(store.claim('k', request())).resolves.toMatchObject({
      state: ClaimState.InProgress,
    });
  });

  it('fences complete and release with the claim token after a takeover', async () => {
    const { store, request, clock } = setup();
    const first = (await store.claim('k', request())) as AcquiredClaim;
    clock.advance(1101);
    const second = (await store.claim('k', request())) as AcquiredClaim;

    expect(second).toMatchObject({
      state: ClaimState.Acquired,
      takeover: true,
    });
    await expect(
      store.complete('k', first.claimToken, CallOutcome.success(1)),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(store.release('k', first.claimToken)).rejects.toBeInstanceOf(
      StaleClaimError,
    );

    await store.complete('k', second.claimToken, CallOutcome.success(2));
    await expect(store.claim('k', request())).resolves.toEqual({
      state: ClaimState.Completed,
      result: CallOutcome.success(2),
      fingerprint: 'h1',
    });
  });
});
