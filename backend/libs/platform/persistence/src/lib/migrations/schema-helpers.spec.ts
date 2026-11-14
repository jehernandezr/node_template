import { PlatformErrorCode } from '@contracts/platform';
import { PartitionBy, PartitionInterval } from '../enums.js';
import {
  Audited,
  EntityPlacement,
  GlobalEntity,
  Partitioned,
  persistenceMetadataOf,
  ShardedEntity,
  ShardKeyColumn,
} from '../metadata/entity-metadata.js';
import { catalogMigrations } from './catalog-migrations.js';
import {
  auditTriggerSql,
  auditTriggerSqlFor,
  createPartitionedTableSql,
  createRangePartitionsSql,
  dropAuditTriggerSql,
  partitionClause,
  uuidV7LowerBound,
} from './schema-helpers.js';
import { shardMigrations } from './shard-migrations.js';
import { assertMigrations, toTypeOrmMigration } from './sql-migration.js';

@ShardedEntity()
@Audited({ exclude: ['password_hash'] })
@Partitioned({ by: PartitionBy.Range, column: 'id' })
class UserOrmEntity {
  @ShardKeyColumn()
  id!: string;
}

@GlobalEntity()
class PlanOrmEntity {}

describe('schema helpers', () => {
  it('builds the audit trigger with the id column and the excluded columns', () => {
    expect(auditTriggerSql('users', { exclude: ['password_hash'] })).toEqual([
      'DROP TRIGGER IF EXISTS users_audit ON "users"',
      `CREATE TRIGGER users_audit AFTER INSERT OR UPDATE OR DELETE ON "users" FOR EACH ROW EXECUTE FUNCTION platform_audit_row('id', 'password_hash')`,
    ]);
    expect(dropAuditTriggerSql('users')).toBe(
      'DROP TRIGGER IF EXISTS users_audit ON "users"',
    );
  });

  it('refuses identifiers that are not plain', () => {
    expect(() => auditTriggerSql('users"; drop')).toThrow(
      'audit table must be a plain SQL identifier',
    );
    expect(() => auditTriggerSql('users', { exclude: ["x')--"] })).toThrow(
      'audit excluded column must be a plain SQL identifier',
    );
  });

  it('reads @Audited from the entity', () => {
    expect(auditTriggerSqlFor(UserOrmEntity, 'users')[1]).toContain(
      "platform_audit_row('id', 'password_hash')",
    );
    expect(() => auditTriggerSqlFor(PlanOrmEntity, 'plans')).toThrow(
      'entity must be decorated with @Audited',
    );
  });

  it('records sharding and partition declarations', () => {
    expect(persistenceMetadataOf(UserOrmEntity)).toEqual({
      placement: EntityPlacement.Sharded,
      shardKeyField: 'id',
      audited: { exclude: ['password_hash'] },
      partitioned: {
        by: PartitionBy.Range,
        column: 'id',
        interval: PartitionInterval.Month,
      },
    });
    expect(persistenceMetadataOf(PlanOrmEntity).placement).toBe(
      EntityPlacement.Global,
    );
  });

  it('refuses an entity declared both sharded and global', () => {
    expect(() => {
      @GlobalEntity()
      @ShardedEntity()
      class Both {}
      return Both;
    }).toThrow('entity placement must be either sharded or global');
  });

  it('builds partitioned tables with a default partition and future partitions', () => {
    expect(partitionClause({ by: PartitionBy.Hash, column: 'tenant_id' })).toBe(
      'PARTITION BY HASH ("tenant_id")',
    );
    expect(
      createPartitionedTableSql(
        'events',
        'id uuid PRIMARY KEY',
        {
          by: PartitionBy.Range,
          column: 'id',
          interval: PartitionInterval.Day,
        },
        7,
      ),
    ).toEqual([
      'CREATE TABLE "events" (id uuid PRIMARY KEY) PARTITION BY RANGE ("id")',
      'CREATE TABLE "events_default" PARTITION OF "events" DEFAULT',
      "SELECT platform_ensure_partitions('events', 'day', 7)",
    ]);
    expect(
      createPartitionedTableSql('t', 'k text', {
        by: PartitionBy.List,
        column: 'k',
      }),
    ).toEqual(['CREATE TABLE "t" (k text) PARTITION BY LIST ("k")']);
    expect(() =>
      createRangePartitionsSql('t', PartitionInterval.Month, -1),
    ).toThrow('ahead must be an integer from 0 to 120');
  });

  it('computes the lowest UUIDv7 of an instant', () => {
    expect(uuidV7LowerBound(new Date(0x0190f3a2b4c5))).toBe(
      '0190f3a2-b4c5-0000-0000-000000000000',
    );
    expect(() => uuidV7LowerBound(new Date(-1))).toThrow(
      expect.objectContaining({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      }),
    );
  });
});

describe('migrations', () => {
  it('are named for TypeORM and strictly ordered', () => {
    expect(() => assertMigrations(shardMigrations)).not.toThrow();
    expect(() => assertMigrations(catalogMigrations)).not.toThrow();
    expect(() => assertMigrations([...shardMigrations].reverse())).toThrow(
      'migration order must be strictly increasing timestamps',
    );
    expect(() =>
      assertMigrations([{ name: 'NoTimestamp', up: [], down: [] }]),
    ).toThrow(
      'migration name must be letters and digits ending in a 13 digit timestamp',
    );
  });

  it('wraps a migration as a TypeORM migration class that runs each statement', async () => {
    const Migration = toTypeOrmMigration({
      name: 'Demo1794600000999',
      up: ['A', 'B'],
      down: ['C'],
    });
    const migration = new Migration();
    const statements: string[] = [];
    const runner = { query: async (sql: string) => statements.push(sql) };
    await migration.up(runner as never);
    await migration.down(runner as never);
    expect(migration.name).toBe('Demo1794600000999');
    expect(statements).toEqual(['A', 'B', 'C']);
  });
});
