import { ShardAccess, ShardKey, ShardingErrorCode } from '@platform/sharding';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { PersistenceFeature } from '../persistence-feature.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { Probe } from './utils/probe.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const PROBE_ID = '0193f1c2-0000-7000-8000-0000000000f1';
const OTHER_PROBE_ID = '0193f1c2-0000-7000-8000-0000000000f2';
const TENANT_A = ShardedTestDatabase.TENANT_A;
const TENANT_B = ShardedTestDatabase.TENANT_B;
const SHARD_A = ShardedTestDatabase.SHARD_A;
const SHARD_B = ShardedTestDatabase.SHARD_B;
const INSTANCE = ShardedTestDatabase.INSTANCE;

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('shard routing over PostgreSQL', () => {
  let db: ShardedTestDatabase;
  let repo: ProbeRepository;

  /** Counts the rows of the `probes` table with that id in a shard, reading the database directly. */
  async function countIn(shard: string, id: string): Promise<number> {
    const dataSource = await db.sources.get({
      logicalShard: shard,
      instance: INSTANCE,
    });
    const rows: { count: number }[] = await dataSource.query(
      'SELECT count(*)::int AS count FROM probes WHERE id = $1',
      [id],
    );
    return rows[0].count;
  }

  beforeAll(async () => {
    db = new ShardedTestDatabase({
      shard: ProbeDatabaseSets.shard,
      catalog: ProbeDatabaseSets.catalog,
    });
    await db.start();
    await db.migrate();
    repo = new ProbeRepository(
      db.kitFor(new PersistenceFeature({ key: ShardKey.Tenant })),
      new ProbeMapper(),
    );
  });

  afterAll(async () => {
    await db.stop();
  });

  it('stores a tenant row only in the shard of that tenant', async () => {
    await db.runAs(TENANT_A, () =>
      repo.save(new Probe(PROBE_ID, 'alpha', 1, 0)),
    );

    expect(await countIn(SHARD_A, PROBE_ID)).toBe(1);
    expect(await countIn(SHARD_B, PROBE_ID)).toBe(0);
  });

  it('reads the row back by id inside its tenant', async () => {
    const found = await db.runAs(TENANT_A, () => repo.findById(PROBE_ID));

    expect(found).toMatchObject({ id: PROBE_ID, name: 'alpha' });
  });

  it('routes the other tenant to the other shard', async () => {
    await db.runAs(TENANT_B, () =>
      repo.save(new Probe(OTHER_PROBE_ID, 'beta', 2, 0)),
    );

    expect(await countIn(SHARD_B, OTHER_PROBE_ID)).toBe(1);
    expect(await countIn(SHARD_A, OTHER_PROBE_ID)).toBe(0);
  });

  it('rejects a read of another tenant inside a transaction with CROSS_SHARD_TX', async () => {
    await expect(
      db.runAs(TENANT_A, () =>
        db.transactions.runInTransaction(() =>
          db.scope.run({ tenantId: TENANT_B, keyKind: ShardKey.Tenant }, () =>
            repo.findById(PROBE_ID),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: ShardingErrorCode.CrossShardTransaction });
  });

  it('rejects a write to another tenant inside a transaction with CROSS_SHARD_TX', async () => {
    await expect(
      db.runAs(TENANT_A, () =>
        db.transactions.runInTransaction(() =>
          db.scope.run({ tenantId: TENANT_B, keyKind: ShardKey.Tenant }, () =>
            repo.save(new Probe(OTHER_PROBE_ID, 'gamma', 3, 0)),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: ShardingErrorCode.CrossShardTransaction });
  });

  it('runs afterCommit hooks only after a commit', async () => {
    const events: string[] = [];

    await db.runAs(TENANT_A, () =>
      db.transactions.runInTransaction((uow) => {
        uow.afterCommit(() => {
          events.push('commit');
        });
        events.push('body');
        return repo.save(new Probe(PROBE_ID, 'alpha', 1, 1));
      }),
    );
    await expect(
      db.runAs(TENANT_A, () =>
        db.transactions.runInTransaction(async (uow) => {
          uow.afterCommit(() => {
            events.push('never');
          });
          throw new Error('roll back');
        }),
      ),
    ).rejects.toThrow('roll back');

    expect(events).toEqual(['body', 'commit']);
  });

  it('records the audit row in the shard of the tenant with the actor', async () => {
    const dataSource = await db.sources.get({
      logicalShard: SHARD_A,
      instance: INSTANCE,
    });
    const rows: { count: number }[] = await dataSource.query(
      'SELECT count(*)::int AS count FROM audit_log WHERE actor_id = $1 AND tenant_id = $2',
      ['test-actor', TENANT_A],
    );

    expect(rows[0].count).toBeGreaterThan(0);
  });

  describe('when a scope is required', () => {
    it('rejects a resolution without a scope with KEY_MISSING', async () => {
      const strict = new ShardedTestDatabase({
        shard: ProbeDatabaseSets.shard,
        catalog: ProbeDatabaseSets.catalog,
        requireScope: true,
      });
      await strict.start();
      try {
        await strict.migrate();

        await expect(
          strict.runAs(TENANT_A, () =>
            strict.resolver.resolve({
              feature: new PersistenceFeature({ key: ShardKey.Tenant }),
              access: ShardAccess.Read,
            }),
          ),
        ).rejects.toMatchObject({ code: ShardingErrorCode.KeyMissing });
      } finally {
        await strict.stop();
      }
    });
  });
});
