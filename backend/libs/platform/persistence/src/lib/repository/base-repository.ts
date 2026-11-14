import { PlatformErrorCode } from '@contracts/platform';
import {
  Criteria,
  encodeCursor,
  SortDirection,
  takePage,
  toSql,
  type CriteriaAst,
  type CursorOptions,
  type Page,
} from '@platform/criteria';
import { SystemClock, type Clock } from '@platform/kernel';
import { Database } from '../database.js';
import { DataAccess, type RowLock } from '../enums.js';
import {
  invalidConfiguration,
  OptimisticLockError,
  PersistenceError,
} from '../errors.js';
import {
  acrossShards,
  type AcrossShardsOptions,
  type ShardFailure,
} from '../sharding/across-shards.js';
import {
  SingleDatabaseResolver,
  type DatabaseResolver,
} from '../sharding/database-resolver.js';
import type { SqlSession } from '../sql/sql-session.js';
import {
  assertTableDefinition,
  qualifiedTableName,
  quoteIdentifier,
  type RecordField,
  type TableDefinition,
} from './table-definition.js';

/** Traduce entre el agregado del dominio y el registro que se guarda. */
export interface RecordMapper<D, R> {
  toDomain(record: R): D;
  toRecord(entity: D): R;
}

/** Opciones de {@link BaseRepository}. */
export interface BaseRepositoryOptions<D, R> {
  readonly table: TableDefinition<R>;
  readonly mapper: RecordMapper<D, R>;
  /** Una base fija o un resolver (con sharding, `ShardedDatabaseResolver`). */
  readonly databases: Database | DatabaseResolver;
  readonly clock?: Clock;
  /** Firma de los cursores que entrega `findMany`. Usa la misma en `Criteria.after`. */
  readonly cursor?: CursorOptions;
}

/** Opciones de lectura. */
export interface ReadOptions {
  /** Incluye filas con borrado lógico. */
  readonly withDeleted?: boolean;
  /** Bloqueo pesimista. Exige una transacción abierta. */
  readonly lock?: RowLock;
  /**
   * Lee sin filtrar por el tenant del contexto. Solo para backoffice y
   * reportes que lo piden de forma explícita.
   */
  readonly allTenants?: boolean;
}

/** Página de una consulta entre shards. */
export interface CrossShardPage<D> extends Page<D> {
  /** `true` si algún shard falló: faltan sus filas. */
  readonly partial: boolean;
  readonly failures: readonly ShardFailure[];
}

type Row = Record<string, unknown>;

/** Acumula parámetros y entrega sus marcadores `$n`. */
class Params {
  readonly values: unknown[] = [];

  bind = (value: unknown): string => {
    this.values.push(value);
    return `$${this.values.length}`;
  };
}

function cursorValue(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Repositorio base sobre SQL parametrizado. Cada repositorio concreto lo
 * extiende y agrega solo los métodos propios del agregado:
 *
 * ```ts
 * export class TypeOrmTaskRepository
 *   extends BaseRepository<Task, TaskOrmEntity>
 *   implements TaskRepository {}
 * ```
 *
 * - Lectura: `findById`, `findOne`, `findMany` (cursor de `@platform/criteria`),
 *   `exists`, `count`, `stream`, y `acrossShards` explícito.
 * - Escritura: `save`, `saveMany`, `upsert`, `softDelete`, `restore`. Siempre
 *   en una transacción del primario (la abierta o una corta).
 * - Bloqueo optimista con `version`: un `save` con versión vieja lanza
 *   `PLATFORM.CONFLICT.VERSION_MISMATCH`. Bloqueo pesimista con `lock`.
 * - Columnas de auditoría, tenant y borrado lógico automáticos.
 */
export class BaseRepository<D, R extends object> {
  protected readonly table: TableDefinition<R>;
  protected readonly mapper: RecordMapper<D, R>;
  protected readonly databases: DatabaseResolver;
  protected readonly clock: Clock;
  private readonly cursorOptions: CursorOptions | undefined;
  private readonly tableName: string;
  private readonly selectList: string;
  private readonly fields: RecordField<R>[];

  constructor(options: BaseRepositoryOptions<D, R>) {
    assertTableDefinition(options.table);
    this.table = options.table;
    this.mapper = options.mapper;
    this.databases =
      options.databases instanceof Database
        ? new SingleDatabaseResolver(options.databases)
        : options.databases;
    this.clock = options.clock ?? new SystemClock();
    this.cursorOptions = options.cursor;
    this.tableName = qualifiedTableName(options.table);
    this.fields = Object.keys(options.table.columns) as RecordField<R>[];
    this.selectList = this.fields
      .map(
        (field) =>
          `${quoteIdentifier(this.column(field))} AS ${quoteIdentifier(field)}`,
      )
      .join(', ');
  }

  async findById(
    id: string,
    options: ReadOptions = {},
  ): Promise<D | undefined> {
    const criteria = Criteria.for<Row>().where(this.table.id).eq(id).limit(1);
    const page = await this.findMany(
      criteria as unknown as Criteria<R>,
      options,
    );
    return page.items[0];
  }

  async findOne(
    criteria: Criteria<R>,
    options: ReadOptions = {},
  ): Promise<D | undefined> {
    const page = await this.findMany(criteria.limit(1), options);
    return page.items[0];
  }

  /** Página ordenada por los campos de `criteria` con el id como desempate. */
  async findMany(
    criteria: Criteria<R>,
    options: ReadOptions = {},
  ): Promise<Page<D>> {
    const database = await this.databases.resolve(DataAccess.Read);
    return this.findManyIn(database, criteria.toAst(), options);
  }

  async count(
    criteria: Criteria<R> = Criteria.for<R>(),
    options: ReadOptions = {},
  ): Promise<number> {
    const database = await this.databases.resolve(DataAccess.Read);
    const ast = {
      ...criteria.toAst(),
      order: [],
      limit: undefined,
      after: undefined,
    };
    return database.read(async (session) => {
      const params = new Params();
      const where = this.whereClause(database, ast, params, options);
      const result = await session.query<{ n: unknown }>(
        `SELECT count(*) AS "n" FROM ${this.tableName} WHERE ${where.sql}`,
        params.values,
      );
      return Number(result.rows[0]?.n ?? 0);
    });
  }

  async exists(
    criteria: Criteria<R>,
    options: ReadOptions = {},
  ): Promise<boolean> {
    return (await this.findOne(criteria, options)) !== undefined;
  }

  /**
   * Recorre todas las filas que cumplen `criteria` en lotes de `batchSize`,
   * con paginación por cursor. Cada lote es una consulta aparte.
   */
  async *stream(
    criteria: Criteria<R>,
    options: ReadOptions & { readonly batchSize?: number } = {},
  ): AsyncGenerator<D> {
    const batchSize = options.batchSize ?? 500;
    let next: Criteria<R> = criteria.limit(batchSize);
    for (;;) {
      const page = await this.findMany(next, options);
      for (const item of page.items) {
        yield item;
      }
      if (page.nextCursor === null) {
        return;
      }
      next = criteria
        .limit(batchSize)
        .after(page.nextCursor, this.cursorOptions);
    }
  }

  /**
   * Inserta si el registro no tiene versión (o es 0) y, si la tiene, actualiza
   * solo si la versión guardada es la misma. Devuelve el agregado como quedó.
   * @throws OptimisticLockError cuando la versión no coincide.
   */
  async save(entity: D): Promise<D> {
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write((session) => this.saveIn(database, session, entity));
  }

  /** Guarda varios agregados en una sola transacción. */
  async saveMany(entities: readonly D[]): Promise<D[]> {
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write(async (session) => {
      const saved: D[] = [];
      for (const entity of entities) {
        saved.push(await this.saveIn(database, session, entity));
      }
      return saved;
    });
  }

  /**
   * Inserta o reemplaza por id, sin comparar versión (la versión sube igual).
   * Para importaciones y proyecciones; el negocio usa `save`.
   */
  async upsert(entity: D): Promise<D> {
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write(async (session) => {
      const record = this.prepareInsert(database, this.mapper.toRecord(entity));
      const params = new Params();
      const columns = this.fields.map((field) =>
        quoteIdentifier(this.column(field)),
      );
      const values = this.fields.map((field) => params.bind(record[field]));
      const keep = new Set<string | undefined>([
        this.table.id,
        this.table.createdAt,
        this.table.createdBy,
        this.table.tenant,
      ]);
      const updates = this.fields
        .filter((field) => !keep.has(field))
        .map((field) => {
          const column = quoteIdentifier(this.column(field));
          return field === this.table.version
            ? `${column} = ${this.tableName}.${column} + 1`
            : `${column} = EXCLUDED.${column}`;
        });
      const conflict = quoteIdentifier(this.column(this.table.id));
      const tenantGuard =
        this.table.tenant === undefined
          ? ''
          : ` WHERE ${this.tableName}.${quoteIdentifier(this.column(this.table.tenant))} = EXCLUDED.${quoteIdentifier(this.column(this.table.tenant))}`;
      const result = await session.query<Row>(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ` +
          `ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(', ')}${tenantGuard} ` +
          `RETURNING ${this.selectList}`,
        params.values,
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw this.tenantMismatch();
      }
      return this.mapper.toDomain(row as R);
    });
  }

  /**
   * Marca la fila como borrada. Con `expectedVersion`, solo si la versión coincide.
   * Devuelve `false` si no existía o ya estaba borrada.
   */
  async softDelete(id: string, expectedVersion?: number): Promise<boolean> {
    return this.setDeleted(id, true, expectedVersion);
  }

  /** Quita la marca de borrado. Devuelve `false` si no estaba borrada. */
  async restore(id: string, expectedVersion?: number): Promise<boolean> {
    return this.setDeleted(id, false, expectedVersion);
  }

  /**
   * Consulta explícita en todos los shards, en paralelo con límite y timeout
   * por shard. Ordena solo por id (UUIDv7, es decir, por fecha de creación) y
   * fusiona los resultados. Si un shard falla, la página llega con
   * `partial: true` y sin sus filas.
   */
  async acrossShards(
    criteria: Criteria<R>,
    options: ReadOptions & AcrossShardsOptions = {},
  ): Promise<CrossShardPage<D>> {
    const ast = criteria.toAst();
    const direction = this.crossShardDirection(ast);
    const databases = await this.databases.all();
    const outcome = await acrossShards(
      databases,
      (database) => this.selectRows(database, ast, options),
      options,
    );
    const rows = outcome.results.flatMap((result) => result.value);
    const idField = this.table.id;
    rows.sort((a, b) => {
      const left = String(a[idField]).toLowerCase();
      const right = String(b[idField]).toLowerCase();
      const order = left < right ? -1 : left > right ? 1 : 0;
      return direction === SortDirection.Asc ? order : -order;
    });
    const limit = ast.limit;
    const kept = limit === undefined ? rows : rows.slice(0, limit);
    const last = kept[kept.length - 1];
    const nextCursor =
      limit !== undefined && rows.length > limit && last !== undefined
        ? encodeCursor(
            { values: [], id: String(last[idField]) },
            this.cursorOptions,
          )
        : null;
    return {
      items: kept.map((row) => this.mapper.toDomain(row as R)),
      nextCursor,
      partial: outcome.partial,
      failures: outcome.failures,
    };
  }

  /** Columna de un campo. */
  protected column(field: RecordField<R>): string {
    return this.table.columns[field];
  }

  /** Corre `fn` con una sesión de lectura de la base del contexto. */
  protected async withReadSession<T>(
    fn: (session: SqlSession) => Promise<T>,
  ): Promise<T> {
    const database = await this.databases.resolve(DataAccess.Read);
    return database.read(fn);
  }

  /** Corre `fn` en una transacción (la abierta o una nueva) de la base del contexto. */
  protected async withWriteSession<T>(
    fn: (session: SqlSession) => Promise<T>,
  ): Promise<T> {
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write(fn);
  }

  private async findManyIn(
    database: Database,
    ast: CriteriaAst,
    options: ReadOptions,
  ): Promise<Page<D>> {
    const rows = await this.selectRows(database, ast, options);
    const sortFields = ast.order
      .map((item) => item.field)
      .filter((field) => field !== this.table.id);
    const page = takePage(
      rows,
      ast.limit,
      (row) => String(row[this.table.id]),
      (row) => sortFields.map((field) => cursorValue(row[field])),
      this.cursorOptions,
    );
    return {
      items: page.items.map((row) => this.mapper.toDomain(row as R)),
      nextCursor: page.nextCursor,
    };
  }

  private async selectRows(
    database: Database,
    ast: CriteriaAst,
    options: ReadOptions,
  ): Promise<Row[]> {
    if (options.lock !== undefined && !database.isInTransaction()) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceTransactionRequired,
        'A row lock needs an open transaction',
        { details: { table: this.table.name } },
      );
    }
    return database.read(async (session) => {
      const params = new Params();
      const where = this.whereClause(database, ast, params, options);
      const limit =
        where.fetchLimit === null
          ? ''
          : ` LIMIT ${params.bind(where.fetchLimit)}`;
      const lock = options.lock === undefined ? '' : ` ${options.lock}`;
      const result = await session.query<Row>(
        `SELECT ${this.selectList} FROM ${this.tableName} WHERE ${where.sql} ORDER BY ${where.orderBy}${limit}${lock}`,
        params.values,
      );
      return result.rows;
    });
  }

  private whereClause(
    database: Database,
    ast: CriteriaAst,
    params: Params,
    options: ReadOptions,
  ): { sql: string; orderBy: string; fetchLimit: number | null } {
    const fragments = toSql(ast, {
      columns: this.table.columns,
      idColumn: this.column(this.table.id),
      bind: params.bind,
    });
    const clauses = [
      fragments.where === 'TRUE' ? undefined : `(${fragments.where})`,
    ];
    if (this.table.softDelete !== undefined && options.withDeleted !== true) {
      clauses.push(
        `${quoteIdentifier(this.column(this.table.softDelete))} IS NULL`,
      );
    }
    if (this.table.tenant !== undefined && options.allTenants !== true) {
      clauses.push(
        `${quoteIdentifier(this.column(this.table.tenant))} = ${params.bind(this.requireTenant(database))}`,
      );
    }
    const present = clauses.filter(
      (clause): clause is string => clause !== undefined,
    );
    return {
      sql: present.length === 0 ? 'TRUE' : present.join(' AND '),
      orderBy: fragments.orderBy,
      fetchLimit: fragments.fetchLimit,
    };
  }

  private async saveIn(
    database: Database,
    session: SqlSession,
    entity: D,
  ): Promise<D> {
    const record = this.mapper.toRecord(entity) as Record<string, unknown>;
    const versionField = this.table.version;
    const current =
      versionField === undefined ? undefined : record[versionField];
    if (
      versionField !== undefined &&
      (current === undefined || current === null || current === 0)
    ) {
      return this.insert(database, session, record);
    }
    if (versionField === undefined) {
      return this.upsert(entity);
    }
    const expected = Number(current);
    if (!Number.isSafeInteger(expected) || expected < 1) {
      throw invalidConfiguration('record version', 'a positive integer');
    }
    return this.update(database, session, record, expected);
  }

  private async insert(
    database: Database,
    session: SqlSession,
    input: Record<string, unknown>,
  ): Promise<D> {
    const record = this.prepareInsert(database, input as R);
    const params = new Params();
    const columns = this.fields.map((field) =>
      quoteIdentifier(this.column(field)),
    );
    const values = this.fields.map((field) => params.bind(record[field]));
    const result = await session.query<Row>(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING ${this.selectList}`,
      params.values,
    );
    return this.mapper.toDomain(result.rows[0] as R);
  }

  private async update(
    database: Database,
    session: SqlSession,
    input: Record<string, unknown>,
    expectedVersion: number,
  ): Promise<D> {
    const versionField = this.table.version as RecordField<R>;
    const record = { ...input };
    this.stampUpdate(database, record);
    const params = new Params();
    const fixed = new Set<string | undefined>([
      this.table.id,
      this.table.version,
      this.table.createdAt,
      this.table.createdBy,
      this.table.tenant,
    ]);
    const versionColumn = quoteIdentifier(this.column(versionField));
    const sets = this.fields
      .filter((field) => !fixed.has(field))
      .map(
        (field) =>
          `${quoteIdentifier(this.column(field))} = ${params.bind(record[field])}`,
      );
    sets.push(`${versionColumn} = ${versionColumn} + 1`);
    const conditions = [
      `${quoteIdentifier(this.column(this.table.id))} = ${params.bind(record[this.table.id])}`,
      `${versionColumn} = ${params.bind(expectedVersion)}`,
    ];
    if (this.table.tenant !== undefined) {
      conditions.push(
        `${quoteIdentifier(this.column(this.table.tenant))} = ${params.bind(this.requireTenant(database))}`,
      );
    }
    const result = await session.query<Row>(
      `UPDATE ${this.tableName} SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')} RETURNING ${this.selectList}`,
      params.values,
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new OptimisticLockError(this.table.name, expectedVersion);
    }
    return this.mapper.toDomain(row as R);
  }

  private async setDeleted(
    id: string,
    deleted: boolean,
    expectedVersion?: number,
  ): Promise<boolean> {
    const deletedField = this.table.softDelete;
    if (deletedField === undefined) {
      throw invalidConfiguration(
        'table.softDelete',
        'declared to soft delete or restore',
      );
    }
    const database = await this.databases.resolve(DataAccess.Write);
    return database.write(async (session) => {
      const params = new Params();
      const deletedColumn = quoteIdentifier(this.column(deletedField));
      const now = this.clock.now();
      const actor = database.currentContext().actorId ?? null;
      const sets = [
        `${deletedColumn} = ${deleted ? params.bind(now) : 'NULL'}`,
      ];
      if (this.table.updatedAt !== undefined) {
        sets.push(
          `${quoteIdentifier(this.column(this.table.updatedAt))} = ${params.bind(now)}`,
        );
      }
      if (this.table.updatedBy !== undefined) {
        sets.push(
          `${quoteIdentifier(this.column(this.table.updatedBy))} = ${params.bind(actor)}`,
        );
      }
      const conditions = [
        `${quoteIdentifier(this.column(this.table.id))} = ${params.bind(id)}`,
        `${deletedColumn} IS ${deleted ? '' : 'NOT '}NULL`,
      ];
      if (this.table.version !== undefined) {
        const versionColumn = quoteIdentifier(this.column(this.table.version));
        sets.push(`${versionColumn} = ${versionColumn} + 1`);
        if (expectedVersion !== undefined) {
          conditions.push(`${versionColumn} = ${params.bind(expectedVersion)}`);
        }
      }
      if (this.table.tenant !== undefined) {
        conditions.push(
          `${quoteIdentifier(this.column(this.table.tenant))} = ${params.bind(this.requireTenant(database))}`,
        );
      }
      const result = await session.query(
        `UPDATE ${this.tableName} SET ${sets.join(', ')} WHERE ${conditions.join(' AND ')}`,
        params.values,
      );
      if (result.rowCount === 0 && expectedVersion !== undefined) {
        throw new OptimisticLockError(this.table.name, expectedVersion);
      }
      return result.rowCount > 0;
    });
  }

  /** Fija versión, tenant y columnas de auditoría de un registro nuevo. */
  private prepareInsert(database: Database, input: R): Record<string, unknown> {
    const record: Record<string, unknown> = {
      ...(input as Record<string, unknown>),
    };
    const now = this.clock.now();
    const actor = database.currentContext().actorId ?? null;
    if (this.table.version !== undefined) {
      record[this.table.version] = 1;
    }
    if (this.table.createdAt !== undefined) {
      record[this.table.createdAt] = now;
    }
    if (this.table.createdBy !== undefined) {
      record[this.table.createdBy] = actor;
    }
    if (
      this.table.softDelete !== undefined &&
      record[this.table.softDelete] === undefined
    ) {
      record[this.table.softDelete] = null;
    }
    if (this.table.tenant !== undefined) {
      const tenant = this.requireTenant(database);
      const given = record[this.table.tenant];
      if (given !== undefined && given !== null && given !== tenant) {
        throw this.tenantMismatch();
      }
      record[this.table.tenant] = tenant;
    }
    this.stampUpdate(database, record);
    for (const field of this.fields) {
      if (record[field] === undefined) {
        record[field] = null;
      }
    }
    return record;
  }

  private stampUpdate(
    database: Database,
    record: Record<string, unknown>,
  ): void {
    if (this.table.updatedAt !== undefined) {
      record[this.table.updatedAt] = this.clock.now();
    }
    if (this.table.updatedBy !== undefined) {
      record[this.table.updatedBy] = database.currentContext().actorId ?? null;
    }
  }

  private requireTenant(database: Database): string {
    const tenantId = database.currentContext().tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceTenantRequired,
        'The table is tenant scoped and the context has no tenant',
        { details: { table: this.table.name } },
      );
    }
    return tenantId;
  }

  private tenantMismatch(): PersistenceError {
    return new PersistenceError(
      PlatformErrorCode.PersistenceTenantMismatch,
      'The row belongs to another tenant',
      { details: { table: this.table.name } },
    );
  }

  private crossShardDirection(ast: CriteriaAst): SortDirection {
    if (ast.after !== undefined && ast.after.values.length > 0) {
      throw invalidConfiguration('acrossShards cursor', 'an id-only cursor');
    }
    if (ast.order.length === 0) {
      return SortDirection.Asc;
    }
    if (ast.order.length > 1 || ast.order[0].field !== this.table.id) {
      throw invalidConfiguration('acrossShards orderBy', 'the id field only');
    }
    return ast.order[0].direction;
  }
}
