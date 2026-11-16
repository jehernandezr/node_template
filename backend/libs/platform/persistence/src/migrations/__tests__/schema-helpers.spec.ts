import { PersistenceErrorCode } from '../../errors/persistence-error-code.enum.js';
import { PartitionBy, PartitionInterval } from '../../enums.js';
import { Audited, auditedOptionsOf } from '../../metadata/entity-metadata.js';
import {
  auditTriggerSql,
  auditTriggerSqlFor,
  createPartitionedTableSql,
  createRangePartitionsSql,
  dropAuditTriggerSql,
  partitionClause,
  uuidV7LowerBound,
} from '../schema-helpers.js';

@Audited({ exclude: ['password_hash'] })
class UserRecord {
  id!: string;
}

class PlanRecord {}

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
    expect(auditTriggerSqlFor(UserRecord, 'users')[1]).toContain(
      "platform_audit_row('id', 'password_hash')",
    );
    expect(() => auditTriggerSqlFor(PlanRecord, 'plans')).toThrow(
      'entity must be decorated with @Audited',
    );
  });

  it('keeps the @Audited options per class', () => {
    expect(auditedOptionsOf(UserRecord)).toEqual({
      exclude: ['password_hash'],
    });
    expect(auditedOptionsOf(PlanRecord)).toBeUndefined();
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
        code: PersistenceErrorCode.InvalidConfig,
      }),
    );
  });
});
