import {
  CriteriaErrorCode,
  Criteria,
  CursorCodec,
  Operator,
  SortDirection,
} from '@platform/criteria';
import type { SelectQueryBuilder } from 'typeorm';
import { CriteriaFieldMap } from '../criteria-field-map.js';
import { TypeOrmCriteriaTranslator } from '../typeorm-criteria-translator.js';
import { HandRolledCriteriaAst } from './utils/hand-rolled-criteria-ast.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { StubDataSource } from './utils/stub-data-source.js';

const ID = '0193f1c2-0000-7000-8000-0000000000c3';
const OTHER_ID = '0193f1c2-0000-7000-8000-0000000000c4';
const NEEDLE = 'needle-value-7';
const SECRET = 'test-secret';
const CODEC = new CursorCodec(SECRET);
const FIELDS = new CriteriaFieldMap('e', [
  'id',
  'name',
  'priority',
  'tenantId',
  'createdBy',
]);

function probeRow(id: string, priority: number, name = 'row'): ProbeEntity {
  return Object.assign(new ProbeEntity(), {
    id,
    priority,
    name,
    tenantId: 'tenant',
  });
}

async function newQueryBuilder(): Promise<SelectQueryBuilder<ProbeEntity>> {
  const dataSource = new StubDataSource('criteria', [ProbeEntity]);
  await dataSource.initialize();
  return dataSource.createEntityManager().createQueryBuilder(ProbeEntity, 'e');
}

describe('TypeOrmCriteriaTranslator', () => {
  const translator = new TypeOrmCriteriaTranslator(FIELDS);

  describe('conditions', () => {
    it.each([
      [
        'eq',
        Criteria.for<ProbeEntity>().where('name').eq(NEEDLE),
        '"e"."name" = $1',
      ],
      [
        'eq null',
        Criteria.for<ProbeEntity>().where('createdBy').eq(null),
        '"e"."created_by" IS NULL',
      ],
      [
        'ne',
        Criteria.for<ProbeEntity>().where('name').ne(NEEDLE),
        '"e"."name" IS DISTINCT FROM $1',
      ],
      [
        'ne null',
        Criteria.for<ProbeEntity>().where('createdBy').ne(null),
        '"e"."created_by" IS NOT NULL',
      ],
      [
        'gt',
        Criteria.for<ProbeEntity>().where('priority').gt(1),
        '"e"."priority" > $1',
      ],
      [
        'gte',
        Criteria.for<ProbeEntity>().where('priority').gte(1),
        '"e"."priority" >= $1',
      ],
      [
        'lt',
        Criteria.for<ProbeEntity>().where('priority').lt(1),
        '"e"."priority" < $1',
      ],
      [
        'lte',
        Criteria.for<ProbeEntity>().where('priority').lte(1),
        '"e"."priority" <= $1',
      ],
      [
        'in',
        Criteria.for<ProbeEntity>().where('name').in([NEEDLE, 'b']),
        '"e"."name" IN ($1, $2)',
      ],
      ['in empty', Criteria.for<ProbeEntity>().where('name').in([]), 'FALSE'],
      [
        'notIn',
        Criteria.for<ProbeEntity>().where('name').notIn([NEEDLE, 'b']),
        '"e"."name" NOT IN ($1, $2)',
      ],
      [
        'notIn empty',
        Criteria.for<ProbeEntity>().where('name').notIn([]),
        'TRUE',
      ],
      [
        'like',
        Criteria.for<ProbeEntity>().where('name').like(NEEDLE),
        '"e"."name" LIKE $1',
      ],
      [
        'ilike',
        Criteria.for<ProbeEntity>().where('name').ilike(NEEDLE),
        '"e"."name" ILIKE $1',
      ],
      [
        'isNull',
        Criteria.for<ProbeEntity>().where('name').isNull(),
        '"e"."name" IS NULL',
      ],
      [
        'isNotNull',
        Criteria.for<ProbeEntity>().where('name').isNotNull(),
        '"e"."name" IS NOT NULL',
      ],
      [
        'between',
        Criteria.for<ProbeEntity>().where('priority').between(1, 9),
        '"e"."priority" BETWEEN $1 AND $2',
      ],
    ])(
      'renders %s with bound parameters only',
      async (_label, criteria, fragment) => {
        const qb = await newQueryBuilder();

        translator.apply(qb, criteria.toAst());
        const [sql] = qb.getQueryAndParameters();

        expect(sql).toContain(fragment);
        expect(sql).not.toContain(NEEDLE);
      },
    );

    it('binds the value of an equality as a parameter', async () => {
      const qb = await newQueryBuilder();

      translator.apply(
        qb,
        Criteria.for<ProbeEntity>().where('name').eq(NEEDLE).toAst(),
      );
      const [, parameters] = qb.getQueryAndParameters();

      expect(parameters).toEqual([NEEDLE]);
    });

    it('keeps a LIKE pattern with wildcards as it was given', async () => {
      const qb = await newQueryBuilder();

      translator.apply(
        qb,
        Criteria.for<ProbeEntity>().where('name').like('a%_b').toAst(),
      );
      const [, parameters] = qb.getQueryAndParameters();

      expect(parameters).toEqual(['a%_b']);
    });

    it('rejects a LIKE value that is not a string with InvalidValue', async () => {
      const qb = await newQueryBuilder();
      const ast = HandRolledCriteriaAst.conditionOn('name', Operator.Like, 42);

      await expect(async () => translator.apply(qb, ast)).rejects.toMatchObject(
        {
          code: CriteriaErrorCode.InvalidValue,
        },
      );
    });

    it('rejects a between with a null bound', async () => {
      const qb = await newQueryBuilder();
      const ast = HandRolledCriteriaAst.conditionOn(
        'priority',
        Operator.Between,
        [1, null],
      );

      await expect(async () => translator.apply(qb, ast)).rejects.toMatchObject(
        {
          code: CriteriaErrorCode.InvalidValue,
        },
      );
    });
  });

  describe('groups', () => {
    it('joins a group of AND and OR branches with parentheses around compound children', async () => {
      const qb = await newQueryBuilder();
      const criteria = Criteria.for<ProbeEntity>()
        .where('name')
        .eq('a')
        .anyOf(
          (branch) => branch.where('priority').gt(1).where('priority').lt(9),
          (branch) => branch.where('priority').eq(20),
        );

      translator.apply(qb, criteria.toAst());
      const [sql] = qb.getQueryAndParameters();

      expect(sql).toContain(
        '("e"."name" = $1 AND (("e"."priority" > $2 AND "e"."priority" < $3) OR "e"."priority" = $4))',
      );
    });

    it('adds no filter for an AND group without conditions', async () => {
      const qb = await newQueryBuilder();

      translator.apply(
        qb,
        HandRolledCriteriaAst.orderedBy('name', SortDirection.Asc),
      );
      const [sql] = qb.getQueryAndParameters();

      expect(sql).toContain(
        'WHERE "e"."deleted_at" IS NULL ORDER BY "e"."name" ASC',
      );
    });

    it('keeps an id given explicitly as the last term', async () => {
      const qb = await newQueryBuilder();

      translator.apply(
        qb,
        Criteria.for<ProbeEntity>()
          .orderBy('priority')
          .orderBy('id', SortDirection.Desc)
          .toAst(),
      );
      const [sql] = qb.getQueryAndParameters();

      expect(sql).toContain('ORDER BY "e"."priority" ASC, "e"."id" DESC');
    });

    it('rejects an id that is not the last orderBy term', async () => {
      const qb = await newQueryBuilder();
      const criteria = Criteria.for<ProbeEntity>()
        .orderBy('id')
        .orderBy('priority');

      await expect(async () =>
        translator.apply(qb, criteria.toAst()),
      ).rejects.toMatchObject({
        code: CriteriaErrorCode.InvalidValue,
        message: 'the id must be the last orderBy term',
      });
    });
  });

  describe('limit', () => {
    it('fetches limit plus one row', async () => {
      const qb = await newQueryBuilder();

      translator.apply(qb, Criteria.for<ProbeEntity>().limit(3).toAst());
      const [sql] = qb.getQueryAndParameters();

      expect(sql).toMatch(/LIMIT 4$/);
    });

    it('rejects a limit above the maximum with InvalidLimit', async () => {
      const qb = await newQueryBuilder();
      const ast = { ...Criteria.for<ProbeEntity>().toAst(), limit: 10_000 };

      await expect(async () => translator.apply(qb, ast)).rejects.toMatchObject(
        {
          code: CriteriaErrorCode.InvalidLimit,
        },
      );
    });
  });

  describe('keyset cursor', () => {
    it('compares rows when every term has the same direction', async () => {
      const qb = await newQueryBuilder();
      const cursor = CODEC.encode({ values: [2], id: ID });
      const criteria = Criteria.for<ProbeEntity>()
        .orderBy('priority')
        .after(cursor, CODEC);

      translator.apply(qb, criteria.toAst());
      const [sql, parameters] = qb.getQueryAndParameters();

      expect(sql).toContain('("e"."priority", "e"."id") > ($1, $2)');
      expect(parameters).toEqual([2, ID]);
    });

    it('expands mixed directions into an OR chain', async () => {
      const qb = await newQueryBuilder();
      const cursor = CODEC.encode({ values: [2, 'b'], id: ID });
      const criteria = Criteria.for<ProbeEntity>()
        .orderBy('priority', SortDirection.Asc)
        .orderBy('name', SortDirection.Desc)
        .after(cursor, CODEC);

      translator.apply(qb, criteria.toAst());
      const [sql] = qb.getQueryAndParameters();

      expect(sql).toContain(
        '(("e"."priority" > $1) OR ("e"."priority" = $1 AND "e"."name" < $2) OR ("e"."priority" = $1 AND "e"."name" = $2 AND "e"."id" < $3))',
      );
    });

    it('rejects a cursor whose value count does not match the ordering', async () => {
      const qb = await newQueryBuilder();
      const cursor = CODEC.encode({ values: [2, 'extra'], id: ID });
      const criteria = Criteria.for<ProbeEntity>()
        .orderBy('priority')
        .after(cursor, CODEC);

      await expect(async () =>
        translator.apply(qb, criteria.toAst()),
      ).rejects.toMatchObject({
        code: CriteriaErrorCode.InvalidValue,
      });
    });
  });

  describe('field whitelist', () => {
    it('rejects a field outside the list with UnknownField and leaves the query untouched', async () => {
      const qb = await newQueryBuilder();
      const before = qb.getQuery();
      const ast = HandRolledCriteriaAst.conditionOn('secret', Operator.Eq, 'x');

      await expect(async () => translator.apply(qb, ast)).rejects.toMatchObject(
        {
          code: CriteriaErrorCode.UnknownField,
        },
      );
      expect(qb.getQuery()).toBe(before);
    });

    it('rejects an injected identifier as an unknown field', async () => {
      const qb = await newQueryBuilder();
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
    });
  });

  describe('toPage', () => {
    it('returns no cursor when the rows fit in the limit', () => {
      const ast = Criteria.for<ProbeEntity>()
        .orderBy('priority')
        .limit(3)
        .toAst();
      const rows = [probeRow(ID, 1), probeRow(OTHER_ID, 2)];

      const page = translator.toPage(rows, ast, new CursorCodec(SECRET));

      expect(page).toEqual({ items: rows, nextCursor: null });
    });

    it('drops the extra row and signs a cursor at the last kept row', () => {
      const ast = Criteria.for<ProbeEntity>()
        .orderBy('priority')
        .limit(2)
        .toAst();
      const rows = [
        probeRow(ID, 1),
        probeRow(OTHER_ID, 2),
        probeRow('0193f1c2-0000-7000-8000-0000000000c5', 3),
      ];

      const page = translator.toPage(rows, ast, new CursorCodec(SECRET));

      expect(page.items).toEqual([rows[0], rows[1]]);
      expect(page.nextCursor).not.toBeNull();
      expect(new CursorCodec(SECRET).decode(page.nextCursor ?? '')).toEqual({
        values: [2],
        id: OTHER_ID,
      });
    });
  });
});
