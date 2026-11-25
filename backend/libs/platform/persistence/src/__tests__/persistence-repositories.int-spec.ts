import { PlatformErrorCode } from '@contracts/platform';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { Criteria } from '@platform/criteria';
import { ShardKey } from '@platform/sharding';
import { PersistenceFeature } from '../persistence-feature.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { Probe } from './utils/probe.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const ALPHA_ID = '0193f1c2-0000-7000-8000-0000000000d1';
const BETA_ID = '0193f1c2-0000-7000-8000-0000000000d2';

/** Repository that reads against the primary: what was just committed. */
class PrimaryProbeRepository extends ProbeRepository {
  findByNameOnPrimary(name: string): Promise<Probe | null> {
    return this.readPrimary(async (manager) => {
      const entity = await manager.findOneBy(ProbeEntity, {
        name,
        tenantId: this.tenantId(),
      });
      return entity === null ? null : new ProbeMapper().toDomain(entity);
    });
  }
}

new ContainerRuntime(process.env).describeIfAvailable(
  'persistence repositories on two shards',
  () => {
    const db = new ShardedTestDatabase({
      shard: ProbeDatabaseSets.shard,
      catalog: ProbeDatabaseSets.catalog,
    });
    const feature = new PersistenceFeature({
      key: ShardKey.Tenant,
      entities: [ProbeEntity],
    });
    let repository: PrimaryProbeRepository;

    beforeAll(async () => {
      await db.start();
      await db.migrate();
      repository = new PrimaryProbeRepository(
        db.kitFor(feature),
        new ProbeMapper(),
      );
    });

    afterAll(async () => {
      await db.stop();
    });

    it('saves and reads each tenant on its own shard', async () => {
      await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.save(new Probe(ALPHA_ID, 'alpha', 1, 0)),
      );
      await db.runAs(ShardedTestDatabase.TENANT_B, () =>
        repository.save(new Probe(BETA_ID, 'beta', 1, 0)),
      );

      const shardA = await db.sources.get({
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      });
      const rows = await shardA.query('SELECT name FROM probes ORDER BY name');

      expect(rows).toEqual([{ name: 'alpha' }]);
      await expect(
        db.runAs(ShardedTestDatabase.TENANT_A, () =>
          repository.findById(ALPHA_ID),
        ),
      ).resolves.toMatchObject({ name: 'alpha' });
      await expect(
        db.runAs(ShardedTestDatabase.TENANT_B, () =>
          repository.findById(ALPHA_ID),
        ),
      ).resolves.toBeNull();
    });

    it('rejects a write with a stale version with VERSION_MISMATCH', async () => {
      const first = await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.save(
          new Probe('0193f1c2-0000-7000-8000-0000000000d3', 'gamma', 1, 0),
        ),
      );
      await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.save(first.rename('gamma-2')),
      );

      await expect(
        db.runAs(ShardedTestDatabase.TENANT_A, () =>
          repository.save(first.rename('gamma-stale')),
        ),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.ConflictVersionMismatch,
      });
    });

    it('hides a soft deleted row from findById and findByCriteria', async () => {
      const id = '0193f1c2-0000-7000-8000-0000000000d4';
      await db.runAs(ShardedTestDatabase.TENANT_A, async () => {
        await repository.save(new Probe(id, 'delta', 1, 0));
        await repository.remove(id);
      });

      const page = await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.findByCriteria(
          Criteria.for<ProbeEntity>().where('name').eq('delta'),
        ),
      );

      expect(page.items).toEqual([]);
      await expect(
        db.runAs(ShardedTestDatabase.TENANT_A, () => repository.findById(id)),
      ).resolves.toBeNull();
    });

    it('runs an afterCommit hook only after the transaction commits', async () => {
      const events: string[] = [];

      await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        db.transactions.runInTransaction(async () => {
          db.transactions.afterCommit(() => {
            events.push('committed');
          });
        }),
      );
      await expect(
        db.runAs(ShardedTestDatabase.TENANT_A, () =>
          db.transactions.runInTransaction(async () => {
            db.transactions.afterCommit(() => {
              events.push('rolled back');
            });
            throw new Error('rollback requested');
          }),
        ),
      ).rejects.toThrow('rollback requested');

      expect(events).toEqual(['committed']);
    });

    it('reads without a transaction from the primary when no replica is configured', async () => {
      await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.save(
          new Probe('0193f1c2-0000-7000-8000-0000000000d5', 'epsilon', 1, 0),
        ),
      );

      const found = await db.runAs(ShardedTestDatabase.TENANT_A, () =>
        repository.findByNameOnPrimary('epsilon'),
      );

      expect(found).toMatchObject({ name: 'epsilon' });
    });
  },
);
