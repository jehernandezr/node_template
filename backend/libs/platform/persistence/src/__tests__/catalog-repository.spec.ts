import { PlatformErrorCode } from '@contracts/platform';
import { Criteria, CursorCodec } from '@platform/criteria';
import type { ReplicationMode, QueryRunner } from 'typeorm';
import { CatalogDataSource } from '../catalog-data-source.js';
import { CatalogRepository } from '../catalog-repository.js';
import { OptimisticWriter } from '../optimistic-writer.js';
import { FakeDataSourceFactory } from './utils/fake-data-source-factory.js';
import { FakeInstanceEndpointResolver } from './utils/fake-instance-endpoint-resolver.js';
import { Probe } from './utils/probe.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { StubDataSource } from './utils/stub-data-source.js';
import type { StubQueryRunner } from './utils/stub-query-runner.js';

const ID = '0193f1c2-0000-7000-8000-0000000000c3';
const OTHER_ID = '0193f1c2-0000-7000-8000-0000000000c4';

/** Fila que devuelve un SELECT sobre `probes`, con las claves `<alias>_<columna>` de TypeORM. */
function probeRow(
  id: string,
  name: string,
  version: number,
  alias = 'ProbeEntity',
) {
  return {
    [`${alias}_id`]: id,
    [`${alias}_version`]: version,
    [`${alias}_name`]: name,
    [`${alias}_priority`]: 0,
    [`${alias}_tenant_id`]: '0193f1c2-0000-7000-8000-0000000000a1',
    [`${alias}_created_by`]: null,
    [`${alias}_updated_by`]: null,
    [`${alias}_created_at`]: new Date('2026-01-01T00:00:00.000Z'),
    [`${alias}_updated_at`]: new Date('2026-01-01T00:00:00.000Z'),
    [`${alias}_deleted_at`]: null,
  };
}

/** Resultado estructurado de un SELECT de TypeORM con las filas dadas. */
function rowsResult(...rows: object[]) {
  return { records: rows, raw: rows, affected: rows.length };
}

/** Resultado estructurado de un INSERT o UPDATE de TypeORM. */
const WRITE_OK = { records: [], raw: [], affected: 1 };

/**
 * `DataSource` de prueba en el que cada `QueryRunner` que abre el repositorio recibe la siguiente lista
 * de respuestas en el orden en que se pidieron con `script`.
 */
class ScriptedDataSource extends StubDataSource {
  readonly modes: ReplicationMode[] = [];
  private readonly scripts: (readonly unknown[])[] = [];

  script(...responses: unknown[]): void {
    this.scripts.push(responses);
  }

  override createQueryRunner(mode: ReplicationMode = 'master'): QueryRunner {
    this.modes.push(mode);
    const runner = super.createQueryRunner(mode);
    const created = this.runners[this.runners.length - 1];
    created.responses.push(...(this.scripts.shift() ?? []));
    return runner;
  }
}

/** Catálogo cuyo `DataSource` es un doble ya inicializado. */
class StubCatalogDataSource extends CatalogDataSource {
  constructor(private readonly dataSource: ScriptedDataSource) {
    super(new FakeDataSourceFactory(), new FakeInstanceEndpointResolver(), {
      DB_CATALOG_NAME: 'catalog',
      DB_CATALOG_INSTANCE: 'catalog',
    });
  }

  override get(): Promise<StubDataSource> {
    return Promise.resolve(this.dataSource);
  }

  override close(): Promise<void> {
    return Promise.resolve();
  }
}

/** Repositorio de catálogo sobre `ProbeEntity`, sin tenant. */
class ProbeCatalogRepository extends CatalogRepository<Probe, ProbeEntity> {
  constructor(catalog: CatalogDataSource) {
    super(ProbeEntity, catalog, new ProbeMapper(), new OptimisticWriter());
  }
}

describe('CatalogRepository', () => {
  let dataSource: ScriptedDataSource;
  let repository: ProbeCatalogRepository;

  beforeEach(async () => {
    dataSource = new ScriptedDataSource('catalog', [ProbeEntity]);
    await dataSource.initialize();
    repository = new ProbeCatalogRepository(
      new StubCatalogDataSource(dataSource),
    );
  });

  function runnerAt(index: number): StubQueryRunner {
    return dataSource.runners[index];
  }

  describe('findById', () => {
    it('reads from a replica runner and releases it', async () => {
      dataSource.script(rowsResult(probeRow(ID, 'first', 1)));

      await repository.findById(ID);

      expect(dataSource.modes).toEqual(['slave']);
      expect(runnerAt(0).calls.at(-1)).toBe('release');
    });

    it('returns the aggregate read from the catalog', async () => {
      dataSource.script(rowsResult(probeRow(ID, 'first', 1)));

      const found = await repository.findById(ID);

      expect(found).toMatchObject({ id: ID, name: 'first', version: 1 });
    });

    it('returns null when no row matches', async () => {
      dataSource.script(rowsResult());

      await expect(repository.findById(ID)).resolves.toBeNull();
    });

    it('filters by id only, without a tenant', async () => {
      dataSource.script(rowsResult());

      await repository.findById(ID);

      const select = runnerAt(0).calls.find((call) =>
        call.startsWith('query SELECT'),
      );
      expect(select).not.toContain('"tenant_id" = $');
    });
  });

  describe('save', () => {
    it('inserts a new aggregate inside a transaction and returns it reloaded', async () => {
      dataSource.script(WRITE_OK, rowsResult(probeRow(ID, 'first', 1)));

      const saved = await repository.save(new Probe(ID, 'first', 0, 0));

      expect(saved).toMatchObject({ id: ID, name: 'first', version: 1 });
      const calls = runnerAt(0).calls;
      expect(calls.indexOf('begin')).toBeLessThan(
        calls.findIndex((call) => call.startsWith('query INSERT')),
      );
      expect(calls).toContain('commit');
    });

    it('updates an aggregate with a version through the optimistic writer', async () => {
      dataSource.script(WRITE_OK, rowsResult(probeRow(ID, 'renamed', 3)));

      const saved = await repository.save(new Probe(ID, 'renamed', 0, 2));

      expect(saved).toMatchObject({ name: 'renamed', version: 3 });
      const update = runnerAt(0).calls.find((call) =>
        call.startsWith('query UPDATE'),
      );
      expect(update).toContain('"version" = $');
    });

    it('rejects a stale version with VERSION_MISMATCH', async () => {
      dataSource.script({ records: [], raw: [], affected: 0 });

      await expect(
        repository.save(new Probe(ID, 'renamed', 0, 2)),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.ConflictVersionMismatch,
      });
    });
  });

  describe('remove', () => {
    it('soft deletes the row inside a transaction', async () => {
      dataSource.script(WRITE_OK);

      await repository.remove(ID);

      const update = runnerAt(0).calls.find((call) =>
        call.startsWith('query UPDATE'),
      );
      expect(update).toContain('"deleted_at" = CURRENT_TIMESTAMP');
      expect(runnerAt(0).calls).toContain('commit');
    });
  });

  describe('findByCriteria', () => {
    it('returns one page and a cursor when there is a row beyond the limit', async () => {
      dataSource.script(
        rowsResult(
          probeRow(ID, 'first', 1, 'e'),
          probeRow(OTHER_ID, 'second', 1, 'e'),
        ),
      );
      const criteria = Criteria.for<ProbeEntity>().orderBy('name').limit(1);

      const page = await repository.findByCriteria(
        criteria,
        new CursorCodec('test-secret'),
      );

      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toMatchObject({ id: ID, name: 'first' });
      expect(page.nextCursor).toEqual(expect.any(String));
    });
  });
});
