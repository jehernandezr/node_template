import { PartitionBy, PartitionInterval } from '../enums.js';
import { PersistenceError } from '../errors/persistence-error.js';
import {
  auditedOptionsOf,
  type EntityClass,
} from '../metadata/entity-metadata.js';

/** How a table is partitioned. */
export interface PartitionedOptions {
  readonly by: PartitionBy;
  /** Partition column. For `Range` over UUIDv7 it is the `id` itself. */
  readonly column: string;
  /** Interval of each range partition. One month by default. */
  readonly interval?: PartitionInterval;
  /** Expired partitions that are archived, in months or days depending on the interval. */
  readonly retention?: number;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function identifier(value: string, what: string): string {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw PersistenceError.invalidConfiguration(what, 'a plain SQL identifier');
  }
  return value;
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Options of {@link auditTriggerSql}. */
export interface AuditTriggerOptions {
  /** Primary key column. `id` by default. */
  readonly idColumn?: string;
  /** Columns that are not copied to `audit_log`. */
  readonly exclude?: readonly string[];
}

/**
 * Statements that create the audit trigger of a table. Each INSERT,
 * UPDATE (changed fields only) and DELETE writes to `audit_log` with the actor,
 * the tenant and the `traceId` that the layer sets with `set_config` when opening the
 * transaction. Requires the `PlatformFunctions` migration.
 */
export function auditTriggerSql(
  table: string,
  options: AuditTriggerOptions = {},
): string[] {
  const name = identifier(table, 'audit table');
  const args = [
    identifier(options.idColumn ?? 'id', 'audit id column'),
    ...(options.exclude ?? []).map((column) =>
      identifier(column, 'audit excluded column'),
    ),
  ]
    .map(literal)
    .join(', ');
  return [
    `DROP TRIGGER IF EXISTS ${name}_audit ON "${name}"`,
    `CREATE TRIGGER ${name}_audit AFTER INSERT OR UPDATE OR DELETE ON "${name}" FOR EACH ROW EXECUTE FUNCTION platform_audit_row(${args})`,
  ];
}

/** Statement that drops the audit trigger (for the migration `down`). */
export function dropAuditTriggerSql(table: string): string {
  const name = identifier(table, 'audit table');
  return `DROP TRIGGER IF EXISTS ${name}_audit ON "${name}"`;
}

/**
 * Audit trigger according to the entity's `@Audited`.
 * @throws PersistenceError `INVALID_CONFIG` if the entity does not have `@Audited`.
 */
export function auditTriggerSqlFor(
  entity: EntityClass,
  table: string,
  idColumn = 'id',
): string[] {
  const audited = auditedOptionsOf(entity);
  if (audited === undefined) {
    throw PersistenceError.invalidConfiguration(
      'entity',
      'decorated with @Audited',
    );
  }
  return auditTriggerSql(table, { idColumn, exclude: audited.exclude });
}

/** `PARTITION BY …` clause for the `CREATE TABLE`. */
export function partitionClause(options: PartitionedOptions): string {
  const column = identifier(options.column, 'partition column');
  switch (options.by) {
    case PartitionBy.Range:
      return `PARTITION BY RANGE ("${column}")`;
    case PartitionBy.List:
      return `PARTITION BY LIST ("${column}")`;
    case PartitionBy.Hash:
      return `PARTITION BY HASH ("${column}")`;
    default:
      throw PersistenceError.invalidConfiguration(
        'partition by',
        'a PartitionBy',
      );
  }
}

/**
 * Statements to create a partitioned table: the table with its clause and,
 * in `Range`, a `DEFAULT` partition and the partitions of the current interval and
 * the next `ahead` ones. `columnsSql` is the body of the `CREATE TABLE`.
 * The primary key must include the partition column (with UUIDv7, the `id`).
 */
export function createPartitionedTableSql(
  table: string,
  columnsSql: string,
  options: PartitionedOptions,
  ahead = 3,
): string[] {
  const name = identifier(table, 'partitioned table');
  const statements = [
    `CREATE TABLE "${name}" (${columnsSql}) ${partitionClause(options)}`,
  ];
  if (options.by === PartitionBy.Range) {
    statements.push(
      `CREATE TABLE "${name}_default" PARTITION OF "${name}" DEFAULT`,
      ...createRangePartitionsSql(
        name,
        options.interval ?? PartitionInterval.Month,
        ahead,
      ),
    );
  }
  return statements;
}

/**
 * Statement that ensures the range partitions of the current interval and the
 * next `ahead` ones. The migration runs it once; a scheduled job
 * repeats it to create future ones.
 */
export function createRangePartitionsSql(
  table: string,
  interval: PartitionInterval,
  ahead: number,
): string[] {
  const name = identifier(table, 'partitioned table');
  if (!Object.values(PartitionInterval).includes(interval)) {
    throw PersistenceError.invalidConfiguration(
      'partition interval',
      'a PartitionInterval',
    );
  }
  if (!Number.isInteger(ahead) || ahead < 0 || ahead > 120) {
    throw PersistenceError.invalidConfiguration(
      'ahead',
      'an integer from 0 to 120',
    );
  }
  return [
    `SELECT platform_ensure_partitions(${literal(name)}, ${literal(interval)}, ${ahead})`,
  ];
}

/**
 * Smallest UUIDv7 of an instant: the 48 millisecond bits and the rest set to zero.
 * It is the bound of a range partition on `id`.
 */
export function uuidV7LowerBound(at: Date): string {
  const ms = at.getTime();
  if (!Number.isSafeInteger(ms) || ms < 0 || ms >= 2 ** 48) {
    throw PersistenceError.invalidConfiguration(
      'at',
      'a date inside the UUIDv7 range',
    );
  }
  const hex = ms.toString(16).padStart(12, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-0000-0000-000000000000`;
}
