import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { Criteria, CursorCodec } from '@platform/criteria';
import { ActorType } from '@platform/observability';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import type { EntityManager } from 'typeorm';
import { OptimisticWriter } from '../optimistic-writer.js';
import { ManagerIntent } from '../model/manager-intent.enum.js';
import { PersistenceFeature } from '../persistence-feature.js';
import { RepositoryKit } from '../repository-kit.js';
import { ShardScope } from '../shard-scope.js';
import { FakeEntityManagerProvider } from './utils/fake-entity-manager-provider.js';
import { FixedPersistenceContextProvider } from './utils/fixed-persistence-context-provider.js';
import { Probe } from './utils/probe.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { StubDataSource } from './utils/stub-data-source.js';

const TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
const TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';
const ID = '0193f1c2-0000-7000-8000-0000000000c3';
const OTHER_ID = '0193f1c2-0000-7000-8000-0000000000c4';
const ACTOR = 'user-1';

/** Fila que devuelve un SELECT sobre `probes`, con las claves `<alias>_<columna>` de TypeORM. */
function probeRow(
  name: string,
  version: number,
  tenantId = TENANT_A,
  alias = 'ProbeEntity',
  id = ID,
) {
  return {
    [`${alias}_id`]: id,
    [`${alias}_version`]: version,
    [`${alias}_name`]: name,
    [`${alias}_priority`]: 0,
    [`${alias}_tenant_id`]: tenantId,
    [`${alias}_created_by`]: ACTOR,
    [`${alias}_updated_by`]: ACTOR,
    [`${alias}_created_at`]: new Date('2026-01-01T00:00:00.000Z'),
    [`${alias}_updated_at`]: new Date('2026-01-01T00:00:00.000Z'),
    [`${alias}_deleted_at`]: null,
  };
}

/** Resultado estructurado de un SELECT de TypeORM con las filas dadas. */
function rowsResult(...rows: object[]) {
  return { records: rows, raw: rows, affected: rows.length };
}

/** Mapper que deja la entidad en otro tenant, para probar la guarda de `save`. */
class ForeignTenantProbeMapper extends ProbeMapper {
  override toPersistence(aggregate: Probe): ProbeEntity {
    const entity = super.toPersistence(aggregate);
    entity.tenantId = TENANT_B;
    return entity;
  }
}

/** Repositorio que expone la lectura contra el primario. */
class PrimaryProbeRepository extends ProbeRepository {
  findOnPrimary(id: string): Promise<ProbeEntity | null> {
    return this.readPrimary((manager: EntityManager) =>
      manager.findOneBy(ProbeEntity, { id }),
    );
  }
}

describe('ShardedRepository', () => {
  let context: FixedPersistenceContextProvider;
  let scope: ShardScope;
  let dataSource: StubDataSource;
  let provider: FakeEntityManagerProvider;

  beforeEach(async () => {
    context = new FixedPersistenceContextProvider();
    context.set({
      tenantId: TENANT_A,
      actorId: ACTOR,
      actorType: ActorType.User,
    });
    const router = new ShardRouter({ directory: new InMemoryDirectoryStore() });
    scope = new ShardScope(router);
    dataSource = new StubDataSource('probes', [ProbeEntity]);
    await dataSource.initialize();
    provider = new FakeEntityManagerProvider(
      context,
      scope,
      router,
      dataSource,
    );
  });

  function repositoryWith(
    mapper: ProbeMapper = new ProbeMapper(),
  ): ProbeRepository {
    const kit = new RepositoryKit(
      new PersistenceFeature({ key: ShardKey.Tenant, entities: [ProbeEntity] }),
      provider,
      new OptimisticWriter(),
      context,
      scope,
    );
    return new ProbeRepository(kit, mapper);
  }

  describe('save', () => {
    it('inserts a new aggregate with the context tenant and actor, and returns it reloaded', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(
        { records: [], raw: [], affected: 1 },
        rowsResult(probeRow('first', 1)),
      );

      const saved = await repository.save(new Probe(ID, 'first', 0, 0));

      const insert = provider.runner.calls.find((call) =>
        call.startsWith('query INSERT'),
      );
      expect(insert).toContain('"tenant_id"');
      expect(insert).toContain(TENANT_A);
      expect(insert).toContain(ACTOR);
      expect(saved).toEqual(new Probe(ID, 'first', 0, 1, TENANT_A));
    });

    it('updates an aggregate with a version through the optimistic writer', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(
        { records: [], raw: [], affected: 1 },
        rowsResult(probeRow('renamed', 3)),
      );

      await repository.save(new Probe(ID, 'renamed', 0, 2));

      const update = provider.runner.calls.find((call) =>
        call.startsWith('query UPDATE'),
      );
      expect(update).toContain('"version" = $');
      expect(update).toContain('"deleted_at" IS NULL');
    });

    it('rejects a save without tenant with PERSISTENCE.TENANT_REQUIRED', async () => {
      context.set({});
      const repository = repositoryWith();

      await expect(
        repository.save(new Probe(ID, 'first', 0, 0)),
      ).rejects.toMatchObject({
        code: PersistenceErrorCode.TenantRequired,
      });
    });

    it('rejects an entity that declares another tenant with PERSISTENCE.TENANT_MISMATCH', async () => {
      const repository = repositoryWith(new ForeignTenantProbeMapper());

      await expect(
        repository.save(new Probe(ID, 'first', 0, 0)),
      ).rejects.toMatchObject({
        code: PersistenceErrorCode.TenantMismatch,
      });
    });
  });

  describe('findById', () => {
    it('filters by the context tenant', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(rowsResult(probeRow('first', 1)));

      const found = await repository.findById(ID);

      const select = provider.runner.calls.find((call) =>
        call.startsWith('query SELECT'),
      );
      expect(select).toContain('"tenant_id" = $');
      expect(select).toContain(TENANT_A);
      expect(found).toEqual(new Probe(ID, 'first', 0, 1, TENANT_A));
    });

    it('returns null when the row does not exist', async () => {
      const repository = repositoryWith();

      await expect(repository.findById(ID)).resolves.toBeNull();
    });
  });

  describe('remove', () => {
    it('soft deletes the row by setting deleted_at', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push({ records: [], raw: [], affected: 1 });

      await repository.remove(ID);

      const update = provider.runner.calls.find((call) =>
        call.startsWith('query UPDATE'),
      );
      expect(update).toContain('"deleted_at" = CURRENT_TIMESTAMP');
    });
  });

  describe('findByCriteria', () => {
    it('filters by the context tenant and returns the page of the criteria', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(
        rowsResult(
          probeRow('first', 1, TENANT_A, 'e'),
          probeRow('second', 1, TENANT_A, 'e', OTHER_ID),
        ),
      );

      const page = await repository.findByCriteria(
        Criteria.for<ProbeEntity>().orderBy('name').limit(1),
        new CursorCodec('test-secret'),
      );

      const select = provider.runner.calls.find((call) =>
        call.startsWith('query SELECT'),
      );
      expect(select).toContain('"e"."tenant_id" = $');
      expect(select).toContain(TENANT_A);
      expect(page.items).toEqual([new Probe(ID, 'first', 0, 1, TENANT_A)]);
      expect(page.nextCursor).toEqual(expect.any(String));
    });
  });

  describe('tenant scope', () => {
    it('uses the tenant of a ShardScope instead of the context tenant', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(
        rowsResult(probeRow('first', 1, TENANT_B)),
      );

      await scope.run({ tenantId: TENANT_B, keyKind: ShardKey.Tenant }, () =>
        repository.findById(ID),
      );

      const select = provider.runner.calls.find((call) =>
        call.startsWith('query SELECT'),
      );
      expect(select).toContain(TENANT_B);
      expect(select).not.toContain(TENANT_A);
    });
  });

  describe('custom queries', () => {
    it('findByName filters by tenant', async () => {
      const repository = repositoryWith();
      provider.runner.responses.push(rowsResult(probeRow('first', 1)));

      await repository.findByName('first');

      const select = provider.runner.calls.find((call) =>
        call.startsWith('query SELECT'),
      );
      expect(select).toContain('"tenant_id" = $');
      expect(select).toContain(TENANT_A);
    });
  });

  describe('intents', () => {
    it('reads with Read, writes with Write and primary reads with ReadPrimary', async () => {
      const repository = new PrimaryProbeRepository(
        new RepositoryKit(
          new PersistenceFeature({
            key: ShardKey.Tenant,
            entities: [ProbeEntity],
          }),
          provider,
          new OptimisticWriter(),
          context,
          scope,
        ),
        new ProbeMapper(),
      );
      provider.runner.responses.push(
        rowsResult(probeRow('first', 1)),
        { records: [], raw: [], affected: 1 },
        rowsResult(probeRow('first', 1)),
        rowsResult(probeRow('first', 1)),
      );

      await repository.findById(ID);
      await repository.save(new Probe(ID, 'first', 0, 0));
      await repository.findOnPrimary(ID);

      expect(provider.requests.map((request) => request.intent)).toEqual([
        ManagerIntent.Read,
        ManagerIntent.Write,
        ManagerIntent.ReadPrimary,
      ]);
    });
  });
});
