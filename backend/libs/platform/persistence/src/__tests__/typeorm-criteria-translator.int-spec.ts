import {
  Criteria,
  CriteriaErrorCode,
  CursorCodec,
  Operator,
  SortDirection,
} from '@platform/criteria';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardKey } from '@platform/sharding';
import { CriteriaFieldMap } from '../criteria-field-map.js';
import { PersistenceFeature } from '../persistence-feature.js';
import { TypeOrmCriteriaTranslator } from '../typeorm-criteria-translator.js';
import { HandRolledCriteriaAst } from './utils/hand-rolled-criteria-ast.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { Probe } from './utils/probe.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { ProbeMapper } from './utils/probe.mapper.js';
import { ProbeRepository } from './utils/probe.repository.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const SECRET = 'test-secret';
const PRIORITIES = [5, 1, 3, 2, 4, 6, 7];

new ContainerRuntime(process.env).describeIfAvailable(
  'TypeOrmCriteriaTranslator against PostgreSQL',
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
      for (const [index, priority] of PRIORITIES.entries()) {
        await db.runAs(ShardedTestDatabase.TENANT_A, () =>
          repository.save(new Probe(seedId(index), `a-${index}`, priority, 0)),
        );
      }
      await db.runAs(ShardedTestDatabase.TENANT_B, () =>
        repository.save(new Probe(seedId(90), 'b-0', 0, 0)),
      );
    });

    afterAll(async () => {
      await db.stop();
    });

    /** Recorre todas las páginas con el cursor firmado y devuelve las filas en orden. */
    async function collect(direction: SortDirection): Promise<Probe[]> {
      const rows: Probe[] = [];
      let token: string | null = null;
      do {
        const criteria = Criteria.for<ProbeEntity>()
          .orderBy('priority', direction)
          .limit(3);
        const next: Criteria<ProbeEntity> =
          token === null
            ? criteria
            : criteria.after(token, new CursorCodec(SECRET));
        const page = await db.runAs(ShardedTestDatabase.TENANT_A, () =>
          repository.findByCriteria(next, new CursorCodec(SECRET)),
        );
        rows.push(...page.items);
        token = page.nextCursor;
      } while (token !== null);
      return rows;
    }

    it('pages ascending without duplicates or skipped rows, and never sees tenant B', async () => {
      const rows = await collect(SortDirection.Asc);

      expect(rows.map((row) => row.priority)).toEqual(
        [...PRIORITIES].sort((a, b) => a - b),
      );
      expect(new Set(rows.map((row) => row.id)).size).toBe(PRIORITIES.length);
      expect(rows.every((row) => row.name.startsWith('a-'))).toBe(true);
    });

    it('pages descending with the same guarantees', async () => {
      const rows = await collect(SortDirection.Desc);

      expect(rows.map((row) => row.priority)).toEqual(
        [...PRIORITIES].sort((a, b) => b - a),
      );
    });

    it('rejects an injected field name and leaves the table in place', async () => {
      const shard = await db.sources.get({
        logicalShard: ShardedTestDatabase.SHARD_A,
        instance: ShardedTestDatabase.INSTANCE,
      });
      const qb = shard
        .createEntityManager()
        .createQueryBuilder(ProbeEntity, 'e');
      const translator = new TypeOrmCriteriaTranslator(
        new CriteriaFieldMap('e', ['id', 'name', 'priority', 'tenantId']),
      );
      const ast = HandRolledCriteriaAst.conditionOn(
        'name; DROP TABLE probes',
        Operator.Eq,
        'x',
      );

      await expect(async () => translator.apply(qb, ast)).rejects.toMatchObject(
        {
          code: CriteriaErrorCode.UnknownField,
        },
      );
      const rows = await shard.query(
        "SELECT to_regclass('probes') AS table_name",
      );
      expect(rows[0].table_name).not.toBeNull();
    });
  },
);

/** Id UUIDv7 determinista para las filas de prueba. */
function seedId(index: number): string {
  return `0193f1c2-0000-7000-8000-${index.toString(16).padStart(12, '0')}`;
}
