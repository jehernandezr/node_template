import { AsyncLocalStorage } from 'node:async_hooks';
import { SystemClock, type Clock } from '@platform/kernel';
import {
  ShardingError,
  ShardingErrorCode,
  TransactionShardGuard,
} from '@platform/sharding';
import {
  requestContextProvider,
  type PersistenceContext,
  type PersistenceContextProvider,
} from './context/persistence-context.js';
import { DatabaseRole, SessionSetting } from './enums.js';
import { invalidConfiguration, toPersistenceError } from './errors.js';
import { withSqlComment } from './sql/sql-comment.js';
import type {
  DatabaseConnection,
  LeasedSession,
  SqlResult,
  SqlSession,
} from './sql/sql-session.js';
import type {
  TransactionHook,
  TransactionManager,
  TransactionOptions,
  UnitOfWork,
} from './transaction/transaction-manager.js';

/** Valores por defecto de {@link Database}. */
export const DATABASE_DEFAULTS = {
  /** Tras escribir, las lecturas del mismo tenant van al primario durante este tiempo. */
  readAfterWriteMs: 5_000,
  /** Tenants recordados para la ventana de lectura después de escribir. */
  maxTrackedTenants: 10_000,
} as const;

/** Opciones de {@link Database}. */
export interface DatabaseOptions {
  /** Nombre de la base lógica: el id del shard, o `catalog`. Aparece en errores y en el guard. */
  readonly name: string;
  readonly connection: DatabaseConnection;
  /**
   * `true` para bases globales (el catálogo): no participan del guard de shard,
   * así leer el directorio dentro de la transacción de un shard no cuenta como
   * tocar otro shard. Por defecto `false`.
   */
  readonly global?: boolean;
  /** Por defecto lee `RequestContext` de observability. */
  readonly context?: PersistenceContextProvider;
  readonly clock?: Clock;
  /** Por defecto {@link DATABASE_DEFAULTS.readAfterWriteMs}. `0` la apaga. */
  readonly readAfterWriteMs?: number;
  readonly maxTrackedTenants?: number;
  /** Recibe los errores de los efectos post-commit y post-rollback. */
  readonly onHookError?: (error: unknown) => void;
}

interface ActiveUnitOfWork extends UnitOfWork {
  readonly owner: Database;
  readonly commitHooks: TransactionHook[];
  readonly rollbackHooks: TransactionHook[];
}

/** Unidades de trabajo abiertas en el contexto asíncrono, una por base. */
type OpenUnits = ReadonlyMap<Database, ActiveUnitOfWork>;

const unitsStorage = new AsyncLocalStorage<OpenUnits>();

const NO_UNITS: OpenUnits = new Map();

/** Unidad de trabajo abierta más interna del contexto, en cualquier base. */
export function currentUnitOfWork(): UnitOfWork | undefined {
  const units = unitsStorage.getStore();
  if (units === undefined || units.size === 0) {
    return undefined;
  }
  return [...units.values()][units.size - 1];
}

/** Sesión que antepone el comentario de traza y envuelve los errores del driver. */
class TracedSession implements SqlSession {
  constructor(
    private readonly inner: SqlSession,
    private readonly context: PersistenceContext,
  ) {}

  async query<Row>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<SqlResult<Row>> {
    try {
      return await this.inner.query<Row>(
        withSqlComment(sql, this.context),
        params,
      );
    } catch (error) {
      throw toPersistenceError(error);
    }
  }
}

function beginStatement(options: TransactionOptions): string {
  const parts = ['BEGIN'];
  if (options.isolation !== undefined) {
    parts.push(`ISOLATION LEVEL ${options.isolation}`);
  }
  if (options.readOnly === true) {
    parts.push('READ ONLY');
  }
  return parts.join(' ');
}

async function runHooks(
  hooks: readonly TransactionHook[],
  onError: (error: unknown) => void,
): Promise<void> {
  for (const hook of hooks) {
    try {
      await hook();
    } catch (error) {
      onError(error);
    }
  }
}

/**
 * Una base lógica (un shard o el catálogo) con su primario y su réplica.
 * Implementa {@link TransactionManager} para esa base.
 *
 * - Escrituras: siempre en una transacción del primario. Si no hay una abierta,
 *   abre una corta, así los triggers de auditoría leen actor, tenant y `traceId`.
 * - Lecturas: dentro de una transacción usan su sesión. Fuera, van a la réplica,
 *   salvo durante `readAfterWriteMs` después de que el mismo tenant escribió.
 * - Cada transacción fija `app.actor_id`, `app.actor_type`, `app.tenant_id` y
 *   `app.trace_id` con `set_config(…, true)`, que vale solo dentro de ella. Así
 *   nada queda pegado a la conexión que el pool (o RDS Proxy) presta a otro.
 * - Cada transacción de un shard abre su propio `TransactionShardGuard`; tocar
 *   otro shard dentro de ella lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 */
export class Database implements TransactionManager {
  readonly name: string;
  readonly global: boolean;
  private readonly connection: DatabaseConnection;
  private readonly context: PersistenceContextProvider;
  private readonly clock: Clock;
  private readonly readAfterWriteMs: number;
  private readonly maxTrackedTenants: number;
  private readonly onHookError: (error: unknown) => void;
  /** Última escritura confirmada por tenant (`''` sin tenant), en milisegundos epoch. */
  private readonly lastWrites = new Map<string, number>();

  constructor(options: DatabaseOptions) {
    if (typeof options.name !== 'string' || options.name.length === 0) {
      throw invalidConfiguration('name', 'a non-empty string');
    }
    this.name = options.name;
    this.global = options.global ?? false;
    this.connection = options.connection;
    this.context = options.context ?? requestContextProvider;
    this.clock = options.clock ?? new SystemClock();
    this.readAfterWriteMs =
      options.readAfterWriteMs ?? DATABASE_DEFAULTS.readAfterWriteMs;
    this.maxTrackedTenants =
      options.maxTrackedTenants ?? DATABASE_DEFAULTS.maxTrackedTenants;
    this.onHookError = options.onHookError ?? ((): void => undefined);
    if (!Number.isFinite(this.readAfterWriteMs) || this.readAfterWriteMs < 0) {
      throw invalidConfiguration('readAfterWriteMs', 'a finite number >= 0');
    }
    if (
      !Number.isInteger(this.maxTrackedTenants) ||
      this.maxTrackedTenants < 1
    ) {
      throw invalidConfiguration('maxTrackedTenants', 'an integer >= 1');
    }
  }

  /** Contexto de la petición actual, tal como lo ve esta base. */
  currentContext(): PersistenceContext {
    return this.context();
  }

  current(): UnitOfWork | undefined {
    return unitsStorage.getStore()?.get(this);
  }

  isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  afterCommit(hook: TransactionHook): void {
    const unit = this.current();
    if (unit !== undefined) {
      unit.afterCommit(hook);
      return;
    }
    void runHooks([hook], this.onHookError);
  }

  /**
   * Corre `fn` en una transacción de esta base, o dentro de la que ya está
   * abierta en ella. Ver {@link TransactionManager.runInTransaction}.
   */
  async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const open = this.current();
    if (open !== undefined) {
      return fn(open);
    }
    this.assertNoOtherShard();
    if (
      options.statementTimeoutMs !== undefined &&
      (!Number.isInteger(options.statementTimeoutMs) ||
        options.statementTimeoutMs < 1)
    ) {
      throw invalidConfiguration('statementTimeoutMs', 'an integer >= 1');
    }
    const context = this.context();
    const lease = await this.acquire(DatabaseRole.Primary);
    const session = new TracedSession(lease, context);
    const unit = this.newUnit(session);
    let result: T;
    try {
      await session.query(beginStatement(options));
      await this.applySessionSettings(session, context, options);
      result = await this.runInUnit(unit, () => fn(unit));
    } catch (error) {
      await this.rollback(session, lease, error);
      await runHooks(unit.rollbackHooks, this.onHookError);
      throw error;
    }
    try {
      await session.query('COMMIT');
    } catch (error) {
      await lease.release(error);
      await runHooks(unit.rollbackHooks, this.onHookError);
      throw error;
    }
    await lease.release();
    if (options.readOnly !== true) {
      this.rememberWrite(context.tenantId);
    }
    await runHooks(unit.commitHooks, this.onHookError);
    return result;
  }

  /**
   * Lectura: usa la transacción abierta en esta base o, fuera de ella, una
   * sesión de la réplica (del primario si el tenant escribió hace poco).
   */
  async read<T>(fn: (session: SqlSession) => Promise<T>): Promise<T> {
    const open = this.current();
    if (open !== undefined) {
      return fn(open.session);
    }
    this.assertNoOtherShard();
    const context = this.context();
    const role = this.wroteRecently(context.tenantId)
      ? DatabaseRole.Primary
      : DatabaseRole.Replica;
    return this.withSession(role, context, fn);
  }

  /** Lectura forzada al primario, por ejemplo para leer y luego escribir sin transacción. */
  async readPrimary<T>(fn: (session: SqlSession) => Promise<T>): Promise<T> {
    const open = this.current();
    if (open !== undefined) {
      return fn(open.session);
    }
    this.assertNoOtherShard();
    return this.withSession(DatabaseRole.Primary, this.context(), fn);
  }

  /** Escritura: dentro de la transacción abierta o en una nueva y corta. */
  write<T>(
    fn: (session: SqlSession, uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.runInTransaction((uow) => fn(uow.session, uow));
  }

  async close(): Promise<void> {
    await this.connection.close();
  }

  private async withSession<T>(
    role: DatabaseRole,
    context: PersistenceContext,
    fn: (session: SqlSession) => Promise<T>,
  ): Promise<T> {
    const lease = await this.acquire(role);
    try {
      const result = await fn(new TracedSession(lease, context));
      await lease.release();
      return result;
    } catch (error) {
      await lease.release(error);
      throw error;
    }
  }

  private async acquire(role: DatabaseRole): Promise<LeasedSession> {
    try {
      return await this.connection.acquire(role);
    } catch (error) {
      throw toPersistenceError(error);
    }
  }

  private newUnit(session: SqlSession): ActiveUnitOfWork {
    const commitHooks: TransactionHook[] = [];
    const rollbackHooks: TransactionHook[] = [];
    return {
      owner: this,
      database: this.name,
      session,
      commitHooks,
      rollbackHooks,
      afterCommit: (hook) => {
        commitHooks.push(hook);
      },
      afterRollback: (hook) => {
        rollbackHooks.push(hook);
      },
    };
  }

  /** Corre `fn` con la unidad visible y, si es un shard, con un guard nuevo. */
  private runInUnit<T>(
    unit: ActiveUnitOfWork,
    fn: () => Promise<T>,
  ): Promise<T> {
    const units = new Map(unitsStorage.getStore() ?? NO_UNITS);
    units.set(this, unit);
    const run = (): Promise<T> => unitsStorage.run(units, fn);
    if (this.global) {
      return run();
    }
    return TransactionShardGuard.run(() => {
      TransactionShardGuard.current()?.touch(this.name);
      return run();
    });
  }

  /** Dentro de la transacción de otro shard, tocar este lanza `CROSS_SHARD_TX`. */
  private assertNoOtherShard(): void {
    if (this.global) {
      return;
    }
    const units = unitsStorage.getStore();
    if (units === undefined || ![...units.keys()].some((db) => !db.global)) {
      return;
    }
    // Hay una transacción abierta en otro shard: su guard (abierto en runInUnit)
    // ya recuerda ese shard y rechaza este.
    TransactionShardGuard.current()?.touch(this.name);
    throw new ShardingError(
      ShardingErrorCode.CrossShardTransaction,
      'Transaction spans more than one logical shard',
      { details: { logicalShard: this.name } },
    );
  }

  private async applySessionSettings(
    session: SqlSession,
    context: PersistenceContext,
    options: TransactionOptions,
  ): Promise<void> {
    const settings: [SessionSetting, string | undefined][] = [
      [SessionSetting.ActorId, context.actorId],
      [SessionSetting.ActorType, context.actorType],
      [SessionSetting.TenantId, context.tenantId],
      [SessionSetting.TraceId, context.traceId],
    ];
    const params: string[] = [];
    const calls = settings.map(([name, value]) => {
      params.push(name, value ?? '');
      return `set_config($${params.length - 1}, $${params.length}, true)`;
    });
    if (options.statementTimeoutMs !== undefined) {
      params.push('statement_timeout', String(options.statementTimeoutMs));
      calls.push(`set_config($${params.length - 1}, $${params.length}, true)`);
    }
    await session.query(`SELECT ${calls.join(', ')}`, params);
  }

  private async rollback(
    session: SqlSession,
    lease: LeasedSession,
    cause: unknown,
  ): Promise<void> {
    try {
      await session.query('ROLLBACK');
      await lease.release();
    } catch {
      // La conexión quedó en un estado desconocido: el pool la descarta.
      await lease.release(cause);
    }
  }

  private wroteRecently(tenantId: string | undefined): boolean {
    if (this.readAfterWriteMs === 0) {
      return false;
    }
    const key = tenantId ?? '';
    const at = this.lastWrites.get(key);
    if (at === undefined) {
      return false;
    }
    if (this.clock.now().getTime() - at < this.readAfterWriteMs) {
      return true;
    }
    this.lastWrites.delete(key);
    return false;
  }

  private rememberWrite(tenantId: string | undefined): void {
    if (this.readAfterWriteMs === 0) {
      return;
    }
    const key = tenantId ?? '';
    this.lastWrites.delete(key);
    this.lastWrites.set(key, this.clock.now().getTime());
    if (this.lastWrites.size > this.maxTrackedTenants) {
      const oldest = this.lastWrites.keys().next().value;
      if (oldest !== undefined) {
        this.lastWrites.delete(oldest);
      }
    }
  }
}
