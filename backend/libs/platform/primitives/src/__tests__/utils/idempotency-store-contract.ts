import {
  ClaimState,
  type AcquiredClaim,
  type ClaimRequest,
  type ClaimResult,
  type IdempotencyStore,
} from '@platform/kernel';
import type { FixedClock } from '@platform/kernel/test-utils';
import { Deadline } from '../../deadline.js';
import { PrimitivesErrorCode } from '../../errors/primitives-error-code.enum.js';
import { ClaimRules } from '../../idempotency/claim-rules.js';

/** Result stored by the contract tests. */
export interface ContractOrder {
  readonly orderId: string;
}

/** Environment of a contract run: the store under test and the clock that drives it. */
export interface IdempotencyStoreContractEnv {
  readonly store: IdempotencyStore<ContractOrder>;
  readonly clock: FixedClock;
}

const KEY = 'billing:charge:tenant-1:abc';

const STALE = { code: PrimitivesErrorCode.StaleClaim };

function expectAcquired<R>(result: ClaimResult<R>): AcquiredClaim {
  expect(result.state).toBe(ClaimState.Acquired);
  return result as AcquiredClaim;
}

/**
 * Behavior that every `IdempotencyStore` satisfies, whether the in-memory
 * adapter or one over a real database. Each adapter runs it with its `setup`,
 * which provides an empty store and its clock.
 */
export function runIdempotencyStoreContract(
  setup: () => Promise<IdempotencyStoreContractEnv>,
): void {
  let env: IdempotencyStoreContractEnv;
  let startMs: number;

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
    startMs = env.clock.now().getTime();
  });

  it('acquires a free key with a token and a lease of deadline plus margin', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request(1_000)));

    expect(claim).toMatchObject({
      claimToken: expect.any(String),
      leaseUntil: startMs + 1_000 + ClaimRules.DEFAULT_LEASE_MARGIN_MS,
      fingerprint: 'fp-1',
      takeover: false,
    });
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

    const again = await env.store.claim(KEY, request());

    expect(again).toEqual({
      state: ClaimState.Completed,
      result: { orderId: 'o-1' },
      fingerprint: 'fp-1',
    });
  });

  it('acquires again after a release, with the new fingerprint', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.release(KEY, claim.claimToken);

    const again = await env.store.claim(
      KEY,
      request(1_000, { fingerprint: 'fp-2' }),
    );

    expect(again).toMatchObject({
      state: ClaimState.Acquired,
      takeover: false,
      fingerprint: 'fp-2',
    });
  });

  it('rejects an expired deadline when it would acquire', async () => {
    const deadline = Deadline.after(0, env.clock);

    await expect(
      env.store.claim(KEY, request(0, { deadline })),
    ).rejects.toMatchObject({ code: PrimitivesErrorCode.DeadlineExceeded });
  });

  it('still returns a completed result with an expired deadline', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.complete(KEY, claim.claimToken, { orderId: 'o-1' });

    const again = await env.store.claim(KEY, request(0));

    expect(again.state).toBe(ClaimState.Completed);
  });

  it.each([
    ['an empty key', '', 'fp-1'],
    ['an empty fingerprint', KEY, ''],
  ])('rejects %s before touching storage', async (_label, key, fingerprint) => {
    await expect(
      env.store.claim(key, request(1_000, { fingerprint })),
    ).rejects.toMatchObject({ code: PrimitivesErrorCode.InvalidArgument });
  });

  it('lets another attempt take over after the lease expires and keeps the first fingerprint', async () => {
    const first = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(first.leaseUntil - startMs);

    const second = expectAcquired(
      await env.store.claim(KEY, request(1_000, { fingerprint: 'fp-2' })),
    );

    expect(second.takeover).toBe(true);
    expect(second.fingerprint).toBe('fp-1');
    expect(second.claimToken).not.toBe(first.claimToken);
  });

  it('rejects complete and release from the stale owner after a takeover', async () => {
    const first = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(first.leaseUntil - startMs);
    const second = expectAcquired(await env.store.claim(KEY, request()));

    await expect(
      env.store.complete(KEY, first.claimToken, { orderId: 'stale' }),
    ).rejects.toMatchObject(STALE);
    await expect(
      env.store.release(KEY, first.claimToken),
    ).rejects.toMatchObject(STALE);
    await env.store.complete(KEY, second.claimToken, { orderId: 'o-2' });
    await expect(env.store.claim(KEY, request())).resolves.toMatchObject({
      state: ClaimState.Completed,
      result: { orderId: 'o-2' },
    });
  });

  it('lets the owner complete after its lease expired if nobody took over', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    env.clock.advance(claim.leaseUntil - startMs + 1);

    await env.store.complete(KEY, claim.claimToken, { orderId: 'late' });

    await expect(env.store.claim(KEY, request())).resolves.toMatchObject({
      state: ClaimState.Completed,
    });
  });

  it('rejects a second complete and a release after completion', async () => {
    const claim = expectAcquired(await env.store.claim(KEY, request()));
    await env.store.complete(KEY, claim.claimToken, { orderId: 'o-1' });

    await expect(
      env.store.complete(KEY, claim.claimToken, { orderId: 'o-2' }),
    ).rejects.toMatchObject(STALE);
    await expect(
      env.store.release(KEY, claim.claimToken),
    ).rejects.toMatchObject(STALE);
  });

  it('rejects complete and release for unknown keys or tokens', async () => {
    await expect(
      env.store.complete('unknown', 'token', { orderId: 'x' }),
    ).rejects.toMatchObject(STALE);
    await expect(env.store.release('unknown', 'token')).rejects.toMatchObject(
      STALE,
    );
  });

  it('keeps keys independent', async () => {
    expectAcquired(await env.store.claim('a', request()));

    await expect(env.store.claim('b', request())).resolves.toMatchObject({
      state: ClaimState.Acquired,
    });
  });
}
