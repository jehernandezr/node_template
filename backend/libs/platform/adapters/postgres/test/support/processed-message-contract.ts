import type { FixedClock } from '@platform/kernel/testing';
import {
  type ProcessedMessageStore,
  processedMessageKey,
} from '@platform/messaging';
import {
  ClaimState,
  Deadline,
  StaleClaimError,
  type ClaimRequest,
} from '@platform/primitives';

/** Entorno de una corrida del contrato de mensajes procesados. */
export interface ProcessedContractEnv {
  readonly store: ProcessedMessageStore;
  readonly clock: FixedClock;
}

/**
 * Contrato de `ProcessedMessageStore`: los mismos casos que cumple
 * `InMemoryProcessedMessageStore` de messaging.
 */
export function processedMessageStoreContract(
  setup: () => Promise<ProcessedContractEnv>,
): void {
  let env: ProcessedContractEnv;
  const request = (): ClaimRequest => ({
    fingerprint: 'fp',
    deadline: Deadline.after(1_000, env.clock),
    minLeaseMs: 30_000,
  });
  const key = processedMessageKey('audit', 'm1');

  beforeEach(async () => {
    env = await setup();
  });

  it('has three states: acquired, in progress, completed', async () => {
    const first = await env.store.claim(key, request());
    expect(first.state).toBe(ClaimState.Acquired);
    expect((await env.store.claim(key, request())).state).toBe(
      ClaimState.InProgress,
    );
    if (first.state !== ClaimState.Acquired) throw new Error('unreachable');
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
      processedMessageKey('notifications', 'm1'),
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
    const first = await env.store.claim(key, request());
    if (first.state !== ClaimState.Acquired) throw new Error('unreachable');
    await env.store.release(key, first.claimToken);
    expect((await env.store.claim(key, request())).state).toBe(
      ClaimState.Acquired,
    );
  });

  it('rejects completion and release with a stale token', async () => {
    const first = await env.store.claim(key, request());
    env.clock.advance(60_000);
    const second = await env.store.claim(key, request());
    if (first.state !== ClaimState.Acquired) throw new Error('unreachable');
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
}
