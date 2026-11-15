import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardKey } from '@platform/sharding';
import { PersistenceFeature } from '../persistence-feature.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { Probe } from './utils/probe.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const ID = '0193f1c2-0000-7000-8000-0000000000e1';
const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;

new ContainerRuntime(process.env).describeIfAvailable(
  'audit trigger and catalog settings',
  () => {
    const db = new ShardedTestDatabase({
      shard: ProbeDatabaseSets.shard,
      catalog: ProbeDatabaseSets.catalog,
    });
    let repository: ProbeRepository;

    beforeAll(async () => {
      await db.start();
      await db.migrate();
      repository = new ProbeRepository(
        db.kitFor(
          new PersistenceFeature({
            key: ShardKey.Tenant,
            entities: [ProbeEntity],
          }),
        ),
        new ProbeMapper(),
      );
    });

    afterAll(async () => {
      await db.stop();
    });

    it('records insert, update, soft delete and hard delete with actor, tenant and trace', async () => {
      await db.runAs(ShardedTestDatabase.TENANT_A, async () => {
        const saved = await repository.save(new Probe(ID, 'audited', 1, 0));
        await repository.save(saved.rename('renamed'));
        await repository.remove(ID);
      });
      await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        db.transactions.runInTransaction((uow) =>
          uow.manager.delete(ProbeEntity, { id: ID }),
        ),
      );

      const shard = await db.sources.get({
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      });
      const rows: {
        operation: string;
        actor_id: string;
        tenant_id: string;
        trace_id: string;
      }[] = await shard.query(
        "SELECT operation, actor_id, tenant_id, trace_id FROM audit_log WHERE table_name = 'probes' AND row_id = $1 ORDER BY id",
        [ID],
      );

      expect(rows.map((row) => row.operation)).toEqual([
        'INSERT',
        'UPDATE',
        'UPDATE',
        'DELETE',
      ]);
      expect(rows.every((row) => row.actor_id === 'test-actor')).toBe(true);
      expect(
        rows.every((row) => row.tenant_id === ShardedTestDatabase.TENANT_A),
      ).toBe(true);
      expect(rows.every((row) => TRACE_ID_PATTERN.test(row.trace_id))).toBe(
        true,
      );
    });

    it('rejects a direct change to the audit log', async () => {
      const shard = await db.sources.get({
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      });

      await expect(
        shard.query("UPDATE audit_log SET actor_id = 'x'"),
      ).rejects.toThrow();
    });

    it('keeps synchronize off on every shard and on the catalog', async () => {
      const shard = await db.sources.get({
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      });
      const catalog = await db.catalog.get();

      expect(shard.options.synchronize).toBe(false);
      expect(catalog.options.synchronize).toBe(false);
    });
  },
);
