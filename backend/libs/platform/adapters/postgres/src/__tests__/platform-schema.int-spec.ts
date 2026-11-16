import { ClaimState } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { OutboxStatus } from '@platform/messaging';
import { ManagerIntent } from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import type { DataSource } from 'typeorm';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { PlatformTestDatabase } from './utils/platform-test-database.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('platform tables over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
  });

  function shardA(): Promise<DataSource> {
    return database.db.sources.get({
      logicalShard: PlatformTestDatabase.SHARD_A,
      instance: ShardedTestDatabase.INSTANCE,
    });
  }

  async function shardRows<T>(sql: string): Promise<T[]> {
    const dataSource = await shardA();
    return dataSource.query(sql);
  }

  async function pendingSchemaChanges(dataSource: DataSource): Promise<number> {
    const diff = await dataSource.driver.createSchemaBuilder().log();
    return diff.upQueries.length;
  }

  it('leaves the shard and catalog schemas in sync with the entities', async () => {
    await expect(pendingSchemaChanges(await shardA())).resolves.toBe(0);
    await expect(
      pendingSchemaChanges(await database.db.catalog.get()),
    ).resolves.toBe(0);
  });

  it('reverts and reapplies the platform migrations', async () => {
    for (const dataSource of [
      await shardA(),
      await database.db.catalog.get(),
    ]) {
      await dataSource.undoLastMigration();
      await expect(pendingSchemaChanges(dataSource)).resolves.toBeGreaterThan(
        0,
      );
      await dataSource.runMigrations();
      await expect(pendingSchemaChanges(dataSource)).resolves.toBe(0);
    }
  });

  it('creates the partial indexes of the outbox', async () => {
    const rows = await shardRows<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'outbox' ORDER BY indexname`,
    );
    const partial = rows.filter((row) => row.indexdef.includes(' WHERE '));
    expect(partial.map((row) => row.indexname)).toEqual([
      'outbox_due_idx',
      'outbox_group_idx',
      'outbox_open_idx',
      'outbox_retention_idx',
    ]);
  });

  it('derives the CHECK constraints from the enums', async () => {
    const rows = await shardRows<{ conname: string; def: string }>(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype = 'c' ORDER BY conname`,
    );
    const byName = new Map(rows.map((row) => [row.conname, row.def]));
    for (const status of Object.values(OutboxStatus)) {
      expect(byName.get('outbox_status_check')).toContain(`'${status}'`);
    }
    for (const state of Object.values(ClaimState)) {
      expect(byName.get('idempotency_keys_state_check')).toContain(
        `'${state}'`,
      );
      expect(byName.get('processed_messages_state_check')).toContain(
        `'${state}'`,
      );
    }
  });

  it('stores a row in the shard of the tenant in the context and assigns seq', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    await database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
      database.managers.run(ManagerIntent.Write, (manager) =>
        manager.insert(OutboxEntity, {
          id: 'm-1',
          envelope: { id: 'm-1' } as never,
          status: OutboxStatus.Pending,
          attempts: 0,
          nextAttemptAt: now,
          createdAt: now,
          updatedAt: now,
          groupId: null,
          delayMs: null,
          lastError: null,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
        }),
      ),
    );

    const inA = await shardRows<{ id: string; seq: string }>(
      'SELECT id, seq FROM outbox',
    );
    expect(inA).toHaveLength(1);
    expect(Number(inA[0].seq)).toBeGreaterThan(0);
    const inB = await database.db.runAs(PlatformTestDatabase.TENANT_B, () =>
      database.managers.run(ManagerIntent.ReadPrimary, (manager) =>
        manager.count(OutboxEntity),
      ),
    );
    expect(inB).toBe(0);
  });
});
