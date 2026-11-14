import type { EntityMetadata } from 'typeorm';
import { invalidConfiguration } from '../errors.js';

/** Nombre de un campo del registro. */
export type RecordField<R> = keyof R & string;

/**
 * Cómo se guarda un registro: tabla, campo a columna y columnas especiales.
 * Los campos son los del registro ORM (por ejemplo `TaskOrmEntity`); las
 * columnas, los nombres en Postgres. `Criteria` filtra por campo.
 */
export interface TableDefinition<R> {
  readonly name: string;
  readonly schema?: string;
  /** Campo a columna. Solo estos campos se leen, escriben y filtran. */
  readonly columns: Readonly<Record<RecordField<R>, string>>;
  /** Llave primaria (UUIDv7). También es el cursor y el desempate del orden. */
  readonly id: RecordField<R>;
  /** Columna entera de bloqueo optimista. Arranca en 1 y sube en cada escritura. */
  readonly version?: RecordField<R>;
  /** Columna del tenant: las lecturas filtran por el tenant del contexto y las escrituras lo fijan. */
  readonly tenant?: RecordField<R>;
  /** Fecha de borrado lógico. Las lecturas excluyen las filas borradas salvo `withDeleted`. */
  readonly softDelete?: RecordField<R>;
  readonly createdAt?: RecordField<R>;
  readonly updatedAt?: RecordField<R>;
  readonly createdBy?: RecordField<R>;
  readonly updatedBy?: RecordField<R>;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(value: unknown, what: string): void {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw invalidConfiguration(what, 'a plain SQL identifier');
  }
}

/** Valida la definición: identificadores simples y columnas especiales declaradas en `columns`. */
export function assertTableDefinition<R>(table: TableDefinition<R>): void {
  assertIdentifier(table.name, 'table.name');
  if (table.schema !== undefined) {
    assertIdentifier(table.schema, 'table.schema');
  }
  const fields = Object.keys(table.columns);
  if (fields.length === 0) {
    throw invalidConfiguration('table.columns', 'a non-empty map');
  }
  for (const field of fields) {
    assertIdentifier(field, 'table field');
    assertIdentifier(
      (table.columns as Record<string, string>)[field],
      'table column',
    );
  }
  const special = [
    'id',
    'version',
    'tenant',
    'softDelete',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
  ] as const;
  for (const key of special) {
    const field = table[key];
    if (field !== undefined && !Object.hasOwn(table.columns, field)) {
      throw invalidConfiguration(`table.${key}`, 'a field listed in columns');
    }
  }
}

/** Identificador entre comillas dobles. Solo recibe identificadores ya validados. */
export function quoteIdentifier(name: string): string {
  return `"${name}"`;
}

/** `"schema"."tabla"` o `"tabla"`. */
export function qualifiedTableName<R>(table: TableDefinition<R>): string {
  return table.schema === undefined
    ? quoteIdentifier(table.name)
    : `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`;
}

/** Campos especiales que no salen de los metadatos de TypeORM. */
export interface TypeOrmTableOverrides<R> {
  readonly tenant?: RecordField<R>;
  readonly createdBy?: RecordField<R>;
  readonly updatedBy?: RecordField<R>;
}

/**
 * Arma la {@link TableDefinition} desde los metadatos de una entidad de
 * TypeORM (`dataSource.getMetadata(TaskOrmEntity)`): tabla, columnas, llave
 * primaria, `@VersionColumn`, `@DeleteDateColumn`, `@CreateDateColumn` y
 * `@UpdateDateColumn`. Tenant y autor salen de `overrides` o, si no, de los
 * campos `tenantId`, `createdBy` y `updatedBy` cuando existen.
 */
export function tableFromTypeOrm<R>(
  metadata: EntityMetadata,
  overrides: TypeOrmTableOverrides<R> = {},
): TableDefinition<R> {
  const columns: Record<string, string> = {};
  for (const column of metadata.columns) {
    if (column.embeddedMetadata !== undefined || column.relationMetadata) {
      continue;
    }
    columns[column.propertyName] = column.databaseName;
  }
  if (metadata.primaryColumns.length !== 1) {
    throw invalidConfiguration('entity primary key', 'a single column');
  }
  const has = (field: string): string | undefined =>
    Object.hasOwn(columns, field) ? field : undefined;
  const table = {
    name: metadata.tableName,
    ...(metadata.schema === undefined ? {} : { schema: metadata.schema }),
    columns,
    id: metadata.primaryColumns[0].propertyName,
    version: metadata.versionColumn?.propertyName,
    softDelete: metadata.deleteDateColumn?.propertyName,
    createdAt: metadata.createDateColumn?.propertyName,
    updatedAt: metadata.updateDateColumn?.propertyName,
    tenant: overrides.tenant ?? has('tenantId'),
    createdBy: overrides.createdBy ?? has('createdBy'),
    updatedBy: overrides.updatedBy ?? has('updatedBy'),
  } as TableDefinition<R>;
  assertTableDefinition(table);
  return table;
}
