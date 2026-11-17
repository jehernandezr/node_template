import { ClaimState, type AcquiredClaim } from '@platform/kernel';
import {
  ContainerRuntime,
  FixedClock,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { Deadline } from '@platform/primitives';
import {
  runIdempotencyStoreContract,
  type ContractOrder,
} from '@platform/primitives/test-utils';
import { CatalogClaimManagers } from '../database/catalog-claim-managers.js';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity.js';
import { CatalogIdempotencyStore } from '../stores/catalog-idempotency-store.js';
import { ClaimTable } from '../stores/claim-table.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

const KEY = 'identity:identity.users.suspend.v1:-:key-1';
const FINGERPRINT = 'fp-1';
const START = new Date('2026-11-16T10:00:00.000Z');
const ONE_HOUR_MS = 60 * 60 * 1000;

runtime.describeIfAvailable('CatalogIdempotencyStore over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  function storeWith(
    clock: FixedClock,
  ): CatalogIdempotencyStore<ContractOrder> {
    return new CatalogIdempotencyStore<ContractOrder>(
      new ClaimTable<ContractOrder>(
        IdempotencyKeyEntity,
        new CatalogClaimManagers(database.catalogManagers),
        new SequentialIdGenerator(),
        clock,
      ),
    );
  }

  runIdempotencyStoreContract(async () => {
    await database.truncateAll();
    const clock = new FixedClock(START);
    return { store: storeWith(clock), clock };
  });

  it('claims and completes without a tenant, a shard or a ShardScope', async () => {
    await database.truncateAll();
    const clock = new FixedClock(START);
    const store = storeWith(clock);

    const first = await store.claim(KEY, {
      fingerprint: FINGERPRINT,
      deadline: Deadline.after(1_000, clock),
    });
    await store.complete(KEY, (first as AcquiredClaim).claimToken, {
      orderId: 'order-1',
    });

    await expect(
      store.claim(KEY, {
        fingerprint: FINGERPRINT,
        deadline: Deadline.after(1_000, clock),
      }),
    ).resolves.toEqual({
      state: ClaimState.Completed,
      result: { orderId: 'order-1' },
      fingerprint: FINGERPRINT,
    });
  });

  it('purges the completed results older than the cutoff', async () => {
    await database.truncateAll();
    const clock = new FixedClock(START);
    const store = storeWith(clock);
    const first = await store.claim('old', {
      fingerprint: FINGERPRINT,
      deadline: Deadline.after(1_000, clock),
    });
    await store.complete('old', (first as AcquiredClaim).claimToken, {
      orderId: 'old',
    });
    clock.advance(ONE_HOUR_MS);

    await expect(
      store.purgeCompleted(new Date(START.getTime() + ONE_HOUR_MS / 2)),
    ).resolves.toBe(1);
  });
});
