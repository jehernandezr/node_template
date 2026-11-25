import type { FixedClock } from '@platform/kernel/test-utils';
import { Deadline, StaleClaimError } from '@platform/primitives';
import { ClaimState, type ClaimRequest } from '@platform/kernel';
import { ProcessedMessageKey } from '../../dispatch/processed-message-key.js';
import { AcquiredClaim } from './acquired-claim.js';
import type { ProcessedMessageStore } from '../../dispatch/processed-message-store.js';

/** Environment of one run of the processed messages contract. */
export interface ProcessedMessageStoreContractEnv {
  readonly store: ProcessedMessageStore;
  readonly clock: FixedClock;
}

const FAR_PAST = new Date('2000-01-01T00:00:00.000Z');
const FAR_FUTURE = new Date('2999-01-01T00:00:00.000Z');

/**
 * `ProcessedMessageStore` contract: the cases that the in-memory adapter and
 * the Postgres one satisfy. Each adapter calls it from its own `describe`.
 */
export function runProcessedMessageStoreContract(
  setup: () => Promise<ProcessedMessageStoreContractEnv>,
): void {
  let env: ProcessedMessageStoreContractEnv;
  const request = (): ClaimRequest => ({
    fingerprint: 'fp',
    deadline: Deadline.after(1_000, env.clock),
    minLeaseMs: 30_000,
  });
  const key = ProcessedMessageKey.of('audit', 'm1');

  beforeEach(async () => {
    env = await setup();
  });

  it('has three states: acquired, in progress, completed', async () => {
    const first = AcquiredClaim.of(await env.store.claim(key, request()));
    expect(first.state).toBe(ClaimState.Acquired);
    expect((await env.store.claim(key, request())).state).toBe(
      ClaimState.InProgress,
    );
    await env.store.complete(key, first.claimToken, { processedAt: 1 });
    expect(await env.store.claim(key, request())).toEqual({
      state: ClaimState.Completed,
      result: { processedAt: 1 },
      fingerprint: 'fp',
    });
  });

  it('scopes claims by consumer', async () => {
    await env.store.claim(key, request());
    const other = await env.store.claim(
      ProcessedMessageKey.of('notifications', 'm1'),
      request(),
    );
    expect(other.state).toBe(ClaimState.Acquired);
  });

  it('keeps the lease for at least minLeaseMs', async () => {
    expect(await env.store.claim(key, request())).toMatchObject({
      state: ClaimState.Acquired,
      leaseUntil: env.clock.now().getTime() + 30_000,
    });
  });

  it('frees the key on release so a redelivery acquires it', async () => {
    const first = AcquiredClaim.of(await env.store.claim(key, request()));
    await env.store.release(key, first.claimToken);
    expect((await env.store.claim(key, request())).state).toBe(
      ClaimState.Acquired,
    );
  });

  it('rejects completion and release with a stale token', async () => {
    const first = AcquiredClaim.of(await env.store.claim(key, request()));
    env.clock.advance(60_000);
    const second = await env.store.claim(key, request());
    expect(second).toMatchObject({
      state: ClaimState.Acquired,
      takeover: true,
    });
    await expect(
      env.store.complete(key, first.claimToken, { processedAt: 1 }),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(
      env.store.release(key, first.claimToken),
    ).rejects.toBeInstanceOf(StaleClaimError);
  });

  it('purges only completed messages processed before the cutoff', async () => {
    const done = AcquiredClaim.of(await env.store.claim(key, request()));
    await env.store.complete(key, done.claimToken, {
      processedAt: env.clock.now().getTime(),
    });
    const openKey = ProcessedMessageKey.of('audit', 'm2');
    await env.store.claim(openKey, request());

    expect(await env.store.purgeCompleted(FAR_PAST)).toBe(0);
    expect(await env.store.purgeCompleted(FAR_FUTURE)).toBe(1);
    expect((await env.store.claim(openKey, request())).state).toBe(
      ClaimState.InProgress,
    );
    expect((await env.store.claim(key, request())).state).toBe(
      ClaimState.Acquired,
    );
  });
}
