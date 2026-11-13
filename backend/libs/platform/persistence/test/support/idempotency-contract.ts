import type { FixedClock } from '@platform/kernel/testing';
import {
  ClaimState,
  Deadline,
  DEFAULT_LEASE_MARGIN_MS,
  DeadlineExceededError,
  InvalidArgumentError,
  StaleClaimError,
  type AcquiredClaim,
  type ClaimRequest,
  type ClaimResult,
  type IdempotencyStore,
} from '@platform/primitives';

type Result = { readonly orderId: string };

const KEY = 'billing:charge:tenant-1:abc';

function expectAcquired<R>(result: ClaimResult<R>): AcquiredClaim {
  expect(result.state).toBe(ClaimState.Acquired);
  return result as AcquiredClaim;
}

/** Entorno de una corrida del contrato. */
export interface IdempotencyContractEnv {
  readonly store: IdempotencyStore<Result>;
  readonly clock: FixedClock;
  readonly start: Date;
}

/**
 * Casos del contrato de `IdempotencyStore` (los mismos que cumple el adaptador
 * en memoria de primitives). Los corren las pruebas con `pg-mem` y las de
 * integración con Postgres real.
 */
export function idempotencyStoreContract(
  setup: () => Promise<IdempotencyContractEnv>,
): void {
  let env: IdempotencyContractEnv;
  const request = (
    budgetMs = 1_000,
    overrides: Partial<ClaimRequest> = {},
  ): ClaimRequest => ({
    fingerprint: 'fp-1',
    deadline: Deadline.after(budgetMs, env.clock),
    ...overrides,
  });

  beforeEach(async () => {
    env = await setup();
  });

  it('acquires a free key with a token and a lease of deadline plus margin', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request(1_000)));
    expect(claim.claimToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(claim.leaseUntil).toBe(
      env.start.getTime() + 1_000 + DEFAULT_LEASE_MARGIN_MS,
    );
    expect(claim.fingerprint).toBe('fp-1');
    expect(claim.takeover).toBe(false);
  });

  it('reports in-progress while the lease is valid', async () => {
    const first = expectAcquired(await env.store.claim(KEY, request()));
    const second = await env.store.claim(
      KEY,
      request(1_000, { fingerprint: 'fp-2' }),
    );
    expect(second).toEqual({
      state: ClaimState.InProgress,
      leaseUntil: first.leaseUntil,
      fingerprint: 'fp-1',
    });
  });

  it('returns the stored result once completed, even after the lease', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.complete(KEY, claim.claimToken, { orderId: 'o-1' });
    env.clock.advance(60_000);
    expect(await env.store.claim(KEY, request())).toEqual({
      state: ClaimState.Completed,
      result: { orderId: 'o-1' },
      fingerprint: 'fp-1',
    });
  });

  it('can acquire again after a release', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.release(KEY, claim.claimToken);
    const again = expectAcquired(
      await env.store.claim(KEY, request(1_000, { fingerprint: 'fp-2' })),
    );
    expect(again.takeover).toBe(false);
    expect(again.fingerprint).toBe('fp-2');
  });

  it('rejects an already expired deadline when it would acquire', async () => {
    const deadline = Deadline.after(0, env.clock);
    await expect(
      env.store.claim(KEY, request(0, { deadline })),
    ).rejects.toBeInstanceOf(DeadlineExceededError);
  });

  it('still returns a completed result with an expired deadline', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.complete(KEY, claim.claimToken, { orderId: 'o-1' });
    const result = await env.store.claim(KEY, request(0));
    expect(result.state).toBe(ClaimState.Completed);
  });

  it('validates key and fingerprint before touching storage', async () => {
    await expect(env.store.claim('', request())).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(
      env.store.claim(KEY, request(1_000, { fingerprint: '' })),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
  });

  it('lets another attempt take over after the lease expires and keeps the first fingerprint', async () => {
    const first = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(first.leaseUntil - env.start.getTime());
    const second = expectAcquired(
      await env.store.claim(KEY, request(1_000, { fingerprint: 'fp-2' })),
    );
    expect(second.takeover).toBe(true);
    expect(second.fingerprint).toBe('fp-1');
    expect(second.claimToken).not.toBe(first.claimToken);
  });

  it('rejects complete and release from the stale owner after a takeover', async () => {
    const first = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(first.leaseUntil - env.start.getTime());
    const second = expectAcquired(await env.store.claim(KEY, request()));
    await expect(
      env.store.complete(KEY, first.claimToken, { orderId: 'stale' }),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(
      env.store.release(KEY, first.claimToken),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await env.store.complete(KEY, second.claimToken, { orderId: 'o-2' });
    const result = await env.store.claim(KEY, request());
    expect(result).toMatchObject({
      state: ClaimState.Completed,
      result: { orderId: 'o-2' },
    });
  });

  it('lets the owner complete after its lease expired if nobody took over', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(claim.leaseUntil - env.start.getTime() + 1);
    await env.store.complete(KEY, claim.claimToken, { orderId: 'late' });
    expect((await env.store.claim(KEY, request())).state).toBe(
      ClaimState.Completed,
    );
  });

  it('rejects a second complete and a release after completion', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.complete(KEY, claim.claimToken, { orderId: 'o-1' });
    await expect(
      env.store.complete(KEY, claim.claimToken, { orderId: 'o-2' }),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(
      env.store.release(KEY, claim.claimToken),
    ).rejects.toBeInstanceOf(StaleClaimError);
  });

  it('rejects complete and release for unknown keys or tokens', async () => {
    await expect(
      env.store.complete('nope', 'token', { orderId: 'x' }),
    ).rejects.toBeInstanceOf(StaleClaimError);
    await expect(env.store.release('nope', 'token')).rejects.toBeInstanceOf(
      StaleClaimError,
    );
  });

  it('keeps keys independent', async () => {
    expectAcquired(await env.store.claim('a', request()));
    expectAcquired(await env.store.claim('b', request()));
  });
}
