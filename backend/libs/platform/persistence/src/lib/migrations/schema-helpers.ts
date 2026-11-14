import { PartitionBy, PartitionInterval } from '../enums.js';
import { invalidConfiguration } from '../errors.js';
import {
  persistenceMetadataOf,
  type EntityClass,
  type PartitionedOptions,
} from '../metadata/entity-metadata.js';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function identifier(value: string, what: string): string {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw invalidConfiguration(what, 'a plain SQL identifier');
  }
  return value;
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Opciones de {@link auditTriggerSql}. */
export interface AuditTriggerOptions {
  /** Columna de la llave primaria. Por defecto `id`. */
  readonly idColumn?: string;
  /** Columnas que no se copian a `audit_log`. */
  readonly exclude?: readonly string[];
}

/**
 * Sentencias que crean el trigger de auditoría de una tabla. Cada INSERT,
 * UPDATE (solo campos cambiados) y DELETE escribe en `audit_log` con el actor,
 * el tenant y el `traceId` que la capa fija con `set_config` al abrir la
 * transacción. Requiere la migración `PlatformFunctions`.
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

/** Sentencia que quita el trigger de auditoría (para el `down` de la migración). */
export function dropAuditTriggerSql(table: string): string {
  const name = identifier(table, 'audit table');
  return `DROP TRIGGER IF EXISTS ${name}_audit ON "${name}"`;
}

/**
 * Trigger de auditoría según `@Audited` de la entidad.
 * @throws PersistenceError `INVALID_CONFIG` si la entidad no lleva `@Audited`.
 */
export function auditTriggerSqlFor(
  entity: EntityClass,
  table: string,
  idColumn = 'id',
): string[] {
  const audited = persistenceMetadataOf(entity).audited;
  if (audited === undefined) {
    throw invalidConfiguration('entity', 'decorated with @Audited');
  }
  return auditTriggerSql(table, { idColumn, exclude: audited.exclude });
}

/** Cláusula `PARTITION BY …` para el `CREATE TABLE`. */
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
      throw invalidConfiguration('partition by', 'a PartitionBy');
  }
}

/**
 * Sentencias para crear una tabla particionada: la tabla con su cláusula y,
 * en `Range`, una partición `DEFAULT` y las particiones del intervalo actual y
 * los `ahead` siguientes. `columnsSql` es el cuerpo del `CREATE TABLE`.
 * La llave primaria debe incluir la columna de partición (con UUIDv7, el `id`).
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
 * Sentencia que asegura las particiones por rango del intervalo actual y los
 * `ahead` siguientes. La migración la corre una vez; un job programado la
 * repite para crear las futuras.
 */
export function createRangePartitionsSql(
  table: string,
  interval: PartitionInterval,
  ahead: number,
): string[] {
  const name = identifier(table, 'partitioned table');
  if (!Object.values(PartitionInterval).includes(interval)) {
    throw invalidConfiguration('partition interval', 'a PartitionInterval');
  }
  if (!Number.isInteger(ahead) || ahead < 0 || ahead > 120) {
    throw invalidConfiguration('ahead', 'an integer from 0 to 120');
  }
  return [
    `SELECT platform_ensure_partitions(${literal(name)}, ${literal(interval)}, ${ahead})`,
  ];
}

/**
 * Menor UUIDv7 de un instante: los 48 bits de milisegundos y el resto en cero.
 * Es el límite de una partición por rango sobre `id`.
 */
export function uuidV7LowerBound(at: Date): string {
  const ms = at.getTime();
  if (!Number.isSafeInteger(ms) || ms < 0 || ms >= 2 ** 48) {
    throw invalidConfiguration('at', 'a date inside the UUIDv7 range');
  }
  const hex = ms.toString(16).padStart(12, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-0000-0000-000000000000`;
}
