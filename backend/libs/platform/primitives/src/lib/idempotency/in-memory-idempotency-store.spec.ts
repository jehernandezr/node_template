import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { CallOutcome, type FinalOutcome } from '../call-outcome.js';
import { Deadline } from '../deadline.js';
import {
  DeadlineExceededError,
  InvalidArgumentError,
  PrimitivesErrorCode,
  StaleClaimError,
} from '../errors.js';
import {
  ClaimState,
  computeLeaseUntil,
  DEFAULT_LEASE_MARGIN_MS,
  MAX_FINGERPRINT_LENGTH,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  type AcquiredClaim,
  type ClaimRequest,
  type ClaimResult,
} from './idempotency-store.js';
import { InMemoryIdempotencyStore } from './in-memory-idempotency-store.js';

type Result = FinalOutcome<{ readonly orderId: string }>;

const KEY = 'billing:charge:tenant-1:abc';
const START = new Date('2026-11-12T10:00:00.000Z');

function expectAcquired<R>(result: ClaimResult<R>): AcquiredClaim {
  expect(result.state).toBe(ClaimState.Acquired);
  return result as AcquiredClaim;
}

describe('InMemoryIdempotencyStore', () => {
  let clock: FixedClock;
  let store: InMemoryIdempotencyStore<Result>;

  const request = (
    budgetMs = 1_000,
    overrides: Partial<ClaimRequest> = {},
  ): ClaimRequest => ({
    fingerprint: 'fp-1',
    deadline: Deadline.after(budgetMs, clock),
    ...overrides,
  });

  beforeEach(() => {
    clock = new FixedClock(START);
    store = new InMemoryIdempotencyStore<Result>(
      clock,
      new SequentialIdGenerator(START),
    );
  });

  describe('claim', () => {
    it('acquires a free key with a token and a lease of deadline plus margin', async () => {
      const claim = expectAcquired(await store.claim(KEY, request(1_000)));
      expect(claim.claimToken).toMatch(/^[0-9a-f-]{36}$/);
      expect(claim.leaseUntil).toBe(
        START.getTime() + 1_000 + DEFAULT_LEASE_MARGIN_MS,
      );
      expect(claim.fingerprint).toBe('fp-1');
      expect(claim.takeover).toBe(false);
    });

    it('honours a custom margin and a minimum lease', async () => {
      const withMargin = expectAcquired(
        await store.claim('k1', request(1_000, { leaseMarginMs: 100 })),
      );
      expect(withMargin.leaseUntil).toBe(START.getTime() + 1_100);

      const withMinimum = expectAcquired(
        await store.claim(
          'k2',
          request(1_000, { leaseMarginMs: 0, minLeaseMs: 30_000 }),
        ),
      );
      expect(withMinimum.leaseUntil).toBe(START.getTime() + 30_000);
    });

    it('reports in-progress while the lease is valid', async () => {
      const first = expectAcquired(await store.claim(KEY, request()));
      clock.advance(500);
      const second = await store.claim(
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
      const claim = expectAcquired(await store.claim(KEY, request()));
      const result = CallOutcome.success({ orderId: 'o-1' });
      await store.complete(KEY, claim.claimToken, result);

      clock.advance(1_000_000);
      expect(await store.claim(KEY, request())).toEqual({
        state: ClaimState.Completed,
        result,
        fingerprint: 'fp-1',
      });
    });

    it('stores business errors as final results', async () => {
      const claim = expectAcquired(await store.claim(KEY, request()));
      const result = CallOutcome.businessError('SALES.STOCK.OUT_OF_STOCK');
      await store.complete(KEY, claim.claimToken, result);
      const again = await store.claim(KEY, request());
      expect(again.state === ClaimState.Completed && again.result).toEqual(
        result,
      );
    });

    it('can acquire again after a release', async () => {
      const first = expectAcquired(await store.claim(KEY, request()));
      await store.release(KEY, first.claimToken);
      const second = expectAcquired(
        await store.claim(KEY, request(1_000, { fingerprint: 'fp-2' })),
      );
      expect(second.claimToken).not.toBe(first.claimToken);
      expect(second.takeover).toBe(false);
      expect(second.fingerprint).toBe('fp-2');
    });

    it('rejects an already expired deadline when it would acquire', async () => {
      const deadline = Deadline.after(10, clock);
      clock.advance(10);
      await expect(
        store.claim(KEY, { fingerprint: 'fp-1', deadline }),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
    });

    it('still returns a completed result with an expired deadline', async () => {
      const claim = expectAcquired(await store.claim(KEY, request()));
      await store.complete(
        KEY,
        claim.claimToken,
        CallOutcome.success({ orderId: 'o' }),
      );
      const deadline = Deadline.after(0, clock);
      const again = await store.claim(KEY, { fingerprint: 'fp-1', deadline });
      expect(again.state).toBe(ClaimState.Completed);
    });

    it.each<[string, string, string]>([
      ['an empty key', '', 'fp'],
      ['an overlong key', 'k'.repeat(MAX_IDEMPOTENCY_KEY_LENGTH + 1), 'fp'],
      ['an empty fingerprint', 'k', ''],
      ['an overlong fingerprint', 'k', 'f'.repeat(MAX_FINGERPRINT_LENGTH + 1)],
    ])('rejects %s', async (_label, key, fingerprint) => {
      await expect(
        store.claim(key, request(1_000, { fingerprint })),
      ).rejects.toBeInstanceOf(InvalidArgumentError);
    });

    it('rejects a negative margin', async () => {
      await expect(
        store.claim(KEY, request(1_000, { leaseMarginMs: -1 })),
      ).rejects.toBeInstanceOf(InvalidArgumentError);
    });
  });

  describe('lease takeover and fencing', () => {
    it('lets another attempt take over after the lease expires', async () => {
      const first = expectAcquired(await store.claim(KEY, request(1_000)));
      clock.set(new Date(first.leaseUntil));

      const second = expectAcquired(
        await store.claim(KEY, request(2_000, { fingerprint: 'fp-other' })),
      );
      expect(second.takeover).toBe(true);
      expect(second.claimToken).not.toBe(first.claimToken);
      expect(second.leaseUntil).toBe(
        first.leaseUntil + 2_000 + DEFAULT_LEASE_MARGIN_MS,
      );
      // La huella es la del primer claim, para detectar reusos de la llave.
      expect(second.fingerprint).toBe('fp-1');
    });

    it('rejects complete from the stale owner after a takeover', async () => {
      const first = expectAcquired(await store.claim(KEY, request(1_000)));
      clock.set(new Date(first.leaseUntil + 1));
      const second = expectAcquired(await store.claim(KEY, request()));

      const late = store.complete(
        KEY,
        first.claimToken,
        CallOutcome.success({ orderId: 'stale' }),
      );
      await expect(late).rejects.toBeInstanceOf(StaleClaimError);
      await expect(late).rejects.toMatchObject({
        code: PrimitivesErrorCode.StaleClaim,
      });

      // El dueño nuevo sí completa, y su resultado es el que queda.
      const fresh = CallOutcome.success({ orderId: 'fresh' });
      await store.complete(KEY, second.claimToken, fresh);
      const after = await store.claim(KEY, request());
      expect(after.state === ClaimState.Completed && after.result).toEqual(
        fresh,
      );
    });

    it('rejects release from the stale owner after a takeover', async () => {
      const first = expectAcquired(await store.claim(KEY, request(1_000)));
      clock.set(new Date(first.leaseUntil));
      const second = expectAcquired(await store.claim(KEY, request()));

      await expect(store.release(KEY, first.claimToken)).rejects.toBeInstanceOf(
        StaleClaimError,
      );
      // El claim del dueño nuevo sigue en curso.
      expect((await store.claim(KEY, request())).state).toBe(
        ClaimState.InProgress,
      );
      await store.release(KEY, second.claimToken);
    });

    it('lets the owner complete after its lease expired if nobody took over', async () => {
      const claim = expectAcquired(await store.claim(KEY, request(1_000)));
      clock.set(new Date(claim.leaseUntil + 10_000));
      await expect(
        store.complete(
          KEY,
          claim.claimToken,
          CallOutcome.success({ orderId: 'o' }),
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects a second complete with the same token', async () => {
      const claim = expectAcquired(await store.claim(KEY, request()));
      await store.complete(
        KEY,
        claim.claimToken,
        CallOutcome.success({ orderId: '1' }),
      );
      await expect(
        store.complete(
          KEY,
          claim.claimToken,
          CallOutcome.success({ orderId: '2' }),
        ),
      ).rejects.toBeInstanceOf(StaleClaimError);
    });

    it('rejects release after completion', async () => {
      const claim = expectAcquired(await store.claim(KEY, request()));
      await store.complete(
        KEY,
        claim.claimToken,
        CallOutcome.success({ orderId: '1' }),
      );
      await expect(store.release(KEY, claim.claimToken)).rejects.toBeInstanceOf(
        StaleClaimError,
      );
      expect((await store.claim(KEY, request())).state).toBe(
        ClaimState.Completed,
      );
    });

    it('rejects complete and release for unknown keys or tokens', async () => {
      await expect(
        store.complete(
          'missing',
          'token',
          CallOutcome.success({ orderId: '1' }),
        ),
      ).rejects.toBeInstanceOf(StaleClaimError);
      await expect(store.release('missing', 'token')).rejects.toBeInstanceOf(
        StaleClaimError,
      );
      expectAcquired(await store.claim(KEY, request()));
      await expect(store.release(KEY, 'not-the-token')).rejects.toBeInstanceOf(
        StaleClaimError,
      );
    });

    it('gives exactly one acquirer among concurrent claims', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => store.claim(KEY, request())),
      );
      const acquired = results.filter((r) => r.state === ClaimState.Acquired);
      expect(acquired).toHaveLength(1);
      expect(
        results.filter((r) => r.state === ClaimState.InProgress),
      ).toHaveLength(9);
    });

    it('keeps keys independent', async () => {
      expectAcquired(await store.claim('a', request()));
      expectAcquired(await store.claim('b', request()));
    });
  });
});

describe('computeLeaseUntil', () => {
  const clock = new FixedClock(START);
  const now = START.getTime();

  it('is the deadline plus the default margin', () => {
    expect(
      computeLeaseUntil({ deadline: Deadline.after(1_000, clock) }, now),
    ).toBe(now + 1_000 + DEFAULT_LEASE_MARGIN_MS);
  });

  it('is at least minLeaseMs from now', () => {
    expect(
      computeLeaseUntil(
        { deadline: Deadline.after(1_000, clock), minLeaseMs: 60_000 },
        now,
      ),
    ).toBe(now + 60_000);
  });

  it.each([
    { leaseMarginMs: Number.NaN },
    { leaseMarginMs: -1 },
    { minLeaseMs: Number.POSITIVE_INFINITY },
  ])('rejects %p', (override) => {
    expect(() =>
      computeLeaseUntil(
        { deadline: Deadline.after(1, clock), ...override },
        now,
      ),
    ).toThrow(InvalidArgumentError);
  });
});
