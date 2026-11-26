import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardingErrorCode, ShardKey } from '@platform/sharding';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import type { DataSource } from 'typeorm';
import { PersistenceFeature } from '../persistence-feature.js';
import { TenantMaintenanceSession } from '../tenant-maintenance-session.js';
import { TenantWriteFence } from '../tenant-write-fence.js';
import { CreateTenantWriteFences1794700000002 } from './utils/create-tenant-write-fences.migration.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { Probe } from './utils/probe.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const MOVE_ID = '0193f1c2-0000-7000-8000-0000000000e1';
const NEXT_MOVE_ID = '0193f1c2-0000-7000-8000-0000000000e2';
const TENANT_A = ShardedTestDatabase.TENANT_A;
const TENANT_B = ShardedTestDatabase.TENANT_B;
const NEIGHBOUR_OF_A = '0193f1c2-0000-7000-8000-0000000000c3';
const WAIT_LIMIT_MS = 10_000;

/** A promise that the test resolves whenever it wants. */
class Gate {
  open: () => void = () => undefined;
  readonly opened = new Promise<void>((resolve) => {
    this.open = resolve;
  });
}

/** A barrier whose `leave` fails, like a connection that drops when releasing the lock. */
class UnreleasableFence extends TenantWriteFence {
  override leave(): Promise<void> {
    return Promise.reject(new Error('connection lost'));
  }
}

/** Waits until someone is waiting on a shard advisory lock. */
async function untilSomeoneWaitsForALock(shard: DataSource): Promise<void> {
  const deadline = Date.now() + WAIT_LIMIT_MS;
  while (Date.now() < deadline) {
    const waiting: unknown[] = await shard.query(
      "SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted",
    );
    if (waiting.length > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Nobody waited for an advisory lock');
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TenantWriteFence over PostgreSQL', () => {
  const fence = new TenantWriteFence();
  let db: ShardedTestDatabase;
  let repo: ProbeRepository;
  let sequence = 0;

  const save = (tenantId: string): Promise<Probe> => {
    sequence += 1;
    const id = `0193f1c2-0000-7000-8000-${String(sequence).padStart(12, '0')}`;
    return db.inTenant(tenantId, () => repo.save(new Probe(id, 'probe', 1, 0)));
  };

  const shardA = () =>
    db.sources.get({
      logicalShard: ShardedTestDatabase.SHARD_A,
      instance: ShardedTestDatabase.INSTANCE,
    });

  /** Opens a tenant write transaction that stays inside until `held` opens; resolves `entered` on entry. */
  const holdWrite = (
    held: Gate,
    entered: Gate,
    transactions = db.transactions,
  ): Promise<void> =>
    db.runAs(TENANT_A, () =>
      transactions.runInTransaction(async (uow) => {
        await uow.manager.query('SELECT 1');
        entered.open();
        await held.opened;
      }),
    );

  beforeAll(async () => {
    db = new ShardedTestDatabase({
      shard: {
        ...ProbeDatabaseSets.shard,
        migrations: [
          ...ProbeDatabaseSets.shard.migrations,
          CreateTenantWriteFences1794700000002,
        ],
      },
      catalog: ProbeDatabaseSets.catalog,
      fence,
    });
    await db.start();
    await db.migrate();
    repo = new ProbeRepository(
      db.kitFor(new PersistenceFeature({ key: ShardKey.Tenant })),
      new ProbeMapper(),
    );
  });

  afterEach(async () => {
    await fence.lowerAny(await shardA(), TENANT_A);
  });

  afterAll(async () => {
    await db.stop();
  });

  it('refuses the writes of a fenced tenant in its shard and lets the other tenants write', async () => {
    await save(TENANT_A);
    await fence.raise(await shardA(), TENANT_A, MOVE_ID);

    await expect(save(TENANT_A)).rejects.toMatchObject({
      code: ShardingErrorCode.TenantMigrating,
      details: { retryAfterSeconds: 1 },
    });
    await expect(save(TENANT_B)).resolves.toMatchObject({ name: 'probe' });
    await expect(fence.raisedBy(await shardA(), TENANT_A)).resolves.toBe(
      MOVE_ID,
    );
  });

  it('waits for the writes that already entered before it stands', async () => {
    const held = new Gate();
    const entered = new Gate();
    const slowWrite = holdWrite(held, entered);
    await entered.opened;
    let raised = false;
    const raising = fence.raise(await shardA(), TENANT_A, MOVE_ID).then(() => {
      raised = true;
    });

    await untilSomeoneWaitsForALock(await shardA());
    const raisedWhileWriting = raised;
    held.open();
    await slowWrite;
    await raising;

    expect(raisedWhileWriting).toBe(false);
    expect(raised).toBe(true);
  });

  it('lets the tenant write again once the fence is lowered', async () => {
    await fence.raise(await shardA(), TENANT_A, MOVE_ID);
    await fence.lower(await shardA(), TENANT_A, MOVE_ID);

    await expect(save(TENANT_A)).resolves.toMatchObject({ name: 'probe' });
    await expect(
      fence.raisedBy(await shardA(), TENANT_A),
    ).resolves.toBeUndefined();
  });

  it('hands the fence of an earlier move to the move that raises it again, so only that move lowers it', async () => {
    await fence.raise(await shardA(), TENANT_A, MOVE_ID);
    await fence.markSwitched(await shardA(), TENANT_A, MOVE_ID);

    await fence.raise(await shardA(), TENANT_A, NEXT_MOVE_ID);
    await fence.lower(await shardA(), TENANT_A, MOVE_ID);

    await expect(fence.raisedBy(await shardA(), TENANT_A)).resolves.toBe(
      NEXT_MOVE_ID,
    );
    const rows: { switched_at: string | null }[] = await (
      await shardA()
    ).query(
      'SELECT switched_at FROM tenant_write_fences WHERE tenant_id = $1',
      [TENANT_A],
    );
    expect(rows).toEqual([{ switched_at: null }]);
  });

  it('drops the connection whose fence lock could not be released, so a later move does not wait forever', async () => {
    const transactions = db.transactionsWith(new UnreleasableFence());
    await db.runAs(TENANT_A, () =>
      transactions.runInTransaction((uow) => uow.manager.query('SELECT 1')),
    );

    await fence.raise(await shardA(), TENANT_A, MOVE_ID);

    await expect(fence.raisedBy(await shardA(), TENANT_A)).resolves.toBe(
      MOVE_ID,
    );
  });

  describe('maintenance', () => {
    const maintain = async (): Promise<number> =>
      TenantMaintenanceSession.run(
        (await shardA()).manager,
        async (manager) => {
          const rows: unknown[] = await manager.query(
            `SELECT 1 FROM probes WHERE ${TenantWriteFence.unfenced('probes.tenant_id')}`,
          );
          return rows.length;
        },
      );

    it('refuses to run in a shard where a move has not switched yet', async () => {
      await fence.raise(await shardA(), TENANT_A, MOVE_ID);

      await expect(maintain()).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
      });
    });

    it('leaves out the rows of a tenant that already moved away', async () => {
      db.directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withTenantId(NEIGHBOUR_OF_A)
          .withShardGroup(ShardedTestDatabase.SHARD_A)
          .build(),
      );
      await save(TENANT_A);
      await save(NEIGHBOUR_OF_A);
      const everyRow = await maintain();
      await fence.raise(await shardA(), TENANT_A, MOVE_ID);
      await fence.markSwitched(await shardA(), TENANT_A, MOVE_ID);
      const tenantRows: unknown[] = await (
        await shardA()
      ).query('SELECT 1 FROM probes WHERE tenant_id = $1', [TENANT_A]);

      const remaining = await maintain();

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBe(everyRow - tenantRows.length);
    });

    it('makes a move wait for the maintenance that already entered', async () => {
      const held = new Gate();
      const entered = new Gate();
      const running = TenantMaintenanceSession.run(
        (await shardA()).manager,
        async () => {
          entered.open();
          await held.opened;
        },
      );
      await entered.opened;
      let raised = false;
      const raising = fence
        .raise(await shardA(), TENANT_A, MOVE_ID)
        .then(() => {
          raised = true;
        });

      await untilSomeoneWaitsForALock(await shardA());
      const raisedWhileMaintaining = raised;
      held.open();
      await running;
      await raising;

      expect(raisedWhileMaintaining).toBe(false);
      expect(raised).toBe(true);
    });
  });
});
