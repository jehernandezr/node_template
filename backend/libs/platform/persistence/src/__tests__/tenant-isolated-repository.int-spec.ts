import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardKey } from '@platform/sharding';
import type { EntityManager } from 'typeorm';
import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { PersistenceFeature } from '../persistence-feature.js';
import type { RepositoryKit } from '../repository-kit.js';
import { TenantIsolatedRepository } from '../tenant-isolated-repository.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

interface SessionView {
  readonly tenant: string;
  readonly readOnly: string;
}

/** Expone lo que ve cada consulta del repositorio: el tenant de la sesión y si la transacción es de solo lectura. */
class SessionProbeRepository extends TenantIsolatedRepository {
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  sessionOnRead(): Promise<SessionView> {
    return this.read((manager) => SessionProbeRepository.session(manager));
  }

  sessionOnPrimaryRead(): Promise<SessionView> {
    return this.readPrimary((manager) =>
      SessionProbeRepository.session(manager),
    );
  }

  insertOnRead(id: string): Promise<unknown> {
    return this.read((manager) => SessionProbeRepository.insert(manager, id));
  }

  insertOnWrite(id: string): Promise<unknown> {
    return this.write((manager) => SessionProbeRepository.insert(manager, id));
  }

  countOnRead(id: string): Promise<number> {
    return this.read(async (manager) =>
      manager.countBy(ProbeEntity, { id, tenantId: this.tenantId() }),
    );
  }

  private static async session(manager: EntityManager): Promise<SessionView> {
    const [row] = (await manager.query(
      "SELECT current_setting('app.tenant_id', true) AS tenant, current_setting('transaction_read_only') AS \"readOnly\"",
    )) as SessionView[];
    return row as SessionView;
  }

  private static insert(manager: EntityManager, id: string): Promise<unknown> {
    return manager.query(
      `INSERT INTO probes (id, version, tenant_id, name) VALUES ($1, 1, $2, 'probe')`,
      [id, ShardedTestDatabase.TENANT_A],
    );
  }
}

new ContainerRuntime(process.env).describeIfAvailable(
  'TenantIsolatedRepository',
  () => {
    const db = new ShardedTestDatabase({
      shard: ProbeDatabaseSets.shard,
      catalog: ProbeDatabaseSets.catalog,
    });
    let repository: SessionProbeRepository;

    const inTenantA = <T>(fn: () => Promise<T>): Promise<T> =>
      db.runAs(ShardedTestDatabase.TENANT_A, () =>
        db.scope.run(
          { tenantId: ShardedTestDatabase.TENANT_A, keyKind: ShardKey.Tenant },
          fn,
        ),
      );

    beforeAll(async () => {
      await db.start();
      await db.migrate();
      repository = new SessionProbeRepository(
        db.kitFor(
          new PersistenceFeature({
            key: ShardKey.Tenant,
            entities: [ProbeEntity],
          }),
        ),
      );
    });

    afterAll(async () => {
      await db.stop();
    });

    it('reads outside a transaction in a read-only transaction bound to the scope tenant', async () => {
      await expect(
        inTenantA(() => repository.sessionOnRead()),
      ).resolves.toEqual({
        tenant: ShardedTestDatabase.TENANT_A,
        readOnly: 'on',
      });
    });

    it('refuses a write smuggled into a read', async () => {
      await expect(
        inTenantA(() =>
          repository.insertOnRead('0193f1c2-0000-7000-8000-0000000000e1'),
        ),
      ).rejects.toThrow(/read-only transaction/);
    });

    it('binds the tenant on primary reads too', async () => {
      await expect(
        inTenantA(() => repository.sessionOnPrimaryRead()),
      ).resolves.toMatchObject({ tenant: ShardedTestDatabase.TENANT_A });
    });

    it('reads inside an open transaction with its session and sees its uncommitted rows', async () => {
      const id = '0193f1c2-0000-7000-8000-0000000000e2';

      const seen = await inTenantA(() =>
        db.transactions.runInTransaction(async () => {
          await repository.insertOnWrite(id);
          return {
            count: await repository.countOnRead(id),
            session: await repository.sessionOnRead(),
          };
        }),
      );

      expect(seen).toEqual({
        count: 1,
        session: { tenant: ShardedTestDatabase.TENANT_A, readOnly: 'off' },
      });
    });

    it('fails without a tenant scope', async () => {
      await expect(
        db.runAs(ShardedTestDatabase.TENANT_A, () =>
          repository.countOnRead('0193f1c2-0000-7000-8000-0000000000e3'),
        ),
      ).rejects.toMatchObject({ code: PersistenceErrorCode.TenantRequired });
    });
  },
);
