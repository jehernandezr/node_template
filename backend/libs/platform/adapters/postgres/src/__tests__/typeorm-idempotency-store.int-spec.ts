import {
  ClaimState,
  type AcquiredClaim,
  type ClaimResult,
} from '@platform/kernel';
import {
  FixedClock,
  ContainerRuntime,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { ManagerIntent } from '@platform/persistence';
import { Deadline, PrimitivesErrorCode } from '@platform/primitives';
import {
  runIdempotencyStoreContract,
  type ContractOrder,
} from '@platform/primitives/test-utils';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity.js';
import { ClaimTable } from '../stores/claim-table.js';
import { TypeOrmIdempotencyStore } from '../stores/typeorm-idempotency-store.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

const KEY = 'billing:charge:tenant-1:abc';
const FINGERPRINT = 'fp-1';
const START = new Date('2026-11-12T10:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

runtime.describeIfAvailable('TypeOrmIdempotencyStore over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  runIdempotencyStoreContract(async () => {
    await database.truncateAll();
    const managers = await database.pinned(PlatformTestDatabase.SHARD_A);
    const clock = new FixedClock(START);
    const store = new TypeOrmIdempotencyStore<ContractOrder>(
      new ClaimTable<ContractOrder>(
        IdempotencyKeyEntity,
        managers,
        new SequentialIdGenerator(),
        clock,
      ),
    );
    return { store, clock };
  });

  describe('inside the tenant context', () => {
    let clock: FixedClock;
    let store: TypeOrmIdempotencyStore<ContractOrder>;

    function inTenantA<T>(fn: () => Promise<T>): Promise<T> {
      return database.db.runAs(PlatformTestDatabase.TENANT_A, fn);
    }

    beforeEach(async () => {
      await database.truncateAll();
      clock = new FixedClock(START);
      store = new TypeOrmIdempotencyStore<ContractOrder>(
        new ClaimTable<ContractOrder>(
          IdempotencyKeyEntity,
          database.managers,
          new SequentialIdGenerator(),
          clock,
        ),
      );
    });

    it('renews the lease of a claim in progress so another attempt cannot take it after the first lease would have ended', async () => {
      const first = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      const token = (first as AcquiredClaim).claimToken;
      clock.advance(5_000);

      const renewed = await inTenantA(() =>
        store.renew(KEY, token, clock.now().getTime() + 10_000),
      );
      clock.advance(5_000);
      const retry = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );

      expect(renewed).toBe(true);
      expect(retry.state).toBe(ClaimState.InProgress);
    });

    it('refuses to renew a claim that another attempt took over', async () => {
      const first = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      clock.advance(ONE_HOUR_MS);
      await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );

      await expect(
        inTenantA(() =>
          store.renew(
            KEY,
            (first as AcquiredClaim).claimToken,
            clock.now().getTime() + 10_000,
          ),
        ),
      ).resolves.toBe(false);
    });

    it('keeps the claim in progress when the transaction that completed it rolls back', async () => {
      const first = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      const token = (first as AcquiredClaim).claimToken;

      await expect(
        inTenantA(() =>
          database.db.transactions.runInTransaction(async () => {
            await store.complete(KEY, token, { orderId: 'order-1' });
            throw new Error('rollback');
          }),
        ),
      ).rejects.toThrow('rollback');

      const again = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      expect(again.state).toBe(ClaimState.InProgress);
    });

    it('stores the result with the transaction that completed it when it commits', async () => {
      const first = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      const token = (first as AcquiredClaim).claimToken;

      await inTenantA(() =>
        database.db.transactions.runInTransaction(async () => {
          await store.complete(KEY, token, { orderId: 'order-1' });
        }),
      );

      const again = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      expect(again).toEqual({
        state: ClaimState.Completed,
        result: { orderId: 'order-1' },
        fingerprint: FINGERPRINT,
      });
    });

    it('stores the serialized form and returns the deserialized result', async () => {
      const table = new ClaimTable<ContractOrder>(
        IdempotencyKeyEntity,
        database.managers,
        new SequentialIdGenerator(),
        clock,
        {
          serialize: (result) => ({ wrapped: result.orderId }),
          deserialize: (stored) => ({
            orderId: (stored as { wrapped: string }).wrapped,
          }),
        },
      );
      const mapped = new TypeOrmIdempotencyStore<ContractOrder>(table);
      const first = await inTenantA(() =>
        mapped.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      await inTenantA(() =>
        mapped.complete(KEY, (first as AcquiredClaim).claimToken, {
          orderId: 'order-1',
        }),
      );

      const raw = await database.pinned(PlatformTestDatabase.SHARD_A);
      const row = await raw.run(ManagerIntent.ReadPrimary, (manager) =>
        manager.findOneBy(IdempotencyKeyEntity, { key: KEY }),
      );
      expect(row?.result).toEqual({ wrapped: 'order-1' });

      const again = await inTenantA(() =>
        mapped.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      expect(again).toMatchObject({
        state: ClaimState.Completed,
        result: { orderId: 'order-1' },
      });
    });

    it('keeps the tenant of the claim next to the key so a tenant move can carry it', async () => {
      const tenanted = new TypeOrmIdempotencyStore<ContractOrder>(
        new ClaimTable<ContractOrder>(
          IdempotencyKeyEntity,
          database.managers,
          new SequentialIdGenerator(),
          clock,
          { tenantColumn: true },
        ),
      );

      await inTenantA(() =>
        tenanted.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
          tenantId: PlatformTestDatabase.TENANT_A,
        }),
      );
      await inTenantA(() =>
        tenanted.claim('without-tenant', {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );

      const raw = await database.pinned(PlatformTestDatabase.SHARD_A);
      const rows = await raw.run(ManagerIntent.ReadPrimary, (manager) =>
        manager.find(IdempotencyKeyEntity, { order: { key: 'ASC' } }),
      );
      expect(rows.map((row) => [row.key, row.tenantId])).toEqual([
        [KEY, PlatformTestDatabase.TENANT_A],
        ['without-tenant', null],
      ]);
    });

    it('purges only the completed results older than the cutoff, in the shard it is pinned to', async () => {
      const managers = await database.pinned(PlatformTestDatabase.SHARD_A);
      const pinned = new TypeOrmIdempotencyStore<ContractOrder>(
        new ClaimTable<ContractOrder>(
          IdempotencyKeyEntity,
          managers,
          new SequentialIdGenerator(),
          clock,
        ),
      );
      const completeKey = async (key: string): Promise<void> => {
        const claim = await pinned.claim(key, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        });
        await pinned.complete(key, (claim as AcquiredClaim).claimToken, {
          orderId: key,
        });
      };

      await completeKey('old');
      clock.advance(ONE_HOUR_MS);
      await completeKey('recent');
      const pendingClaim: ClaimResult<ContractOrder> = await pinned.claim(
        'pending',
        {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(600_000, clock),
        },
      );
      expect(pendingClaim.state).toBe(ClaimState.Acquired);

      const cutoff = new Date(START.getTime() + ONE_HOUR_MS / 2);
      await expect(pinned.purgeCompleted(cutoff)).resolves.toBe(1);

      await expect(
        pinned.claim('recent', {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      ).resolves.toMatchObject({ state: ClaimState.Completed });
      await expect(
        pinned.claim('pending', {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      ).resolves.toMatchObject({ state: ClaimState.InProgress });
    });

    it('rejects a claim whose deadline has passed when no result is stored', async () => {
      await expect(
        inTenantA(() =>
          store.claim('expired', {
            fingerprint: FINGERPRINT,
            deadline: Deadline.after(0, clock),
          }),
        ),
      ).rejects.toMatchObject({
        code: PrimitivesErrorCode.DeadlineExceeded,
      });
    });

    it('returns the stored result for a claim whose deadline has passed', async () => {
      const first = await inTenantA(() =>
        store.claim(KEY, {
          fingerprint: FINGERPRINT,
          deadline: Deadline.after(1_000, clock),
        }),
      );
      await inTenantA(() =>
        store.complete(KEY, (first as AcquiredClaim).claimToken, {
          orderId: 'order-1',
        }),
      );

      await expect(
        inTenantA(() =>
          store.claim(KEY, {
            fingerprint: FINGERPRINT,
            deadline: Deadline.after(0, clock),
          }),
        ),
      ).resolves.toMatchObject({
        state: ClaimState.Completed,
        result: { orderId: 'order-1' },
      });
    });
  });
});
