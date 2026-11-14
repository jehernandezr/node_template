import { AsyncLocalStorage } from 'node:async_hooks';
import type { TransactionHook, TransactionOptions } from '@platform/primitives';
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
  SqlTransactionManager,
  SqlUnitOfWork,
} from './transaction/transaction-manager.js';

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
  /** Recibe los errores de los efectos post-commit y post-rollback. */
  readonly onHookError?: (error: unknown) => void;
}

interface ActiveUnitOfWork extends SqlUnitOfWork {
  readonly owner: Database;
  readonly commitHooks: TransactionHook[];
  readonly rollbackHooks: TransactionHook[];
}

/** Unidades de trabajo abiertas en el contexto asíncrono, una por base. */
type OpenUnits = ReadonlyMap<Database, ActiveUnitOfWork>;

const unitsStorage = new AsyncLocalStorage<OpenUnits>();

const NO_UNITS: OpenUnits = new Map();

/** Unidad de trabajo abierta más interna del contexto, en cualquier base. */
export function currentUnitOfWork(): SqlUnitOfWork | undefined {
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
 * `afterCommit` fuera de una transacción: no hay commit que esperar, así que
 * el efecto corre ya, sin bloquear a quien lo registra. Sus errores van a
 * `onError`, igual que los de un efecto después del commit.
 */
export function runHookNow(
  hook: TransactionHook,
  onError: (error: unknown) => void,
): void {
  void runHooks([hook], onError);
}

/**
 * Una base lógica (un shard o el catálogo) con su primario y su réplica.
 * Implementa el puerto de transacciones para esa base.
 *
 * - Escrituras: siempre en una transacción del primario. Si no hay una abierta,
 *   abre una corta, así los triggers de auditoría leen actor, tenant y `traceId`.
 * - Lecturas: dentro de una transacción usan su sesión. Fuera, van a la réplica.
 *   Quien necesita leer lo que acaba de escribir sin transacción usa
 *   `readPrimary`: la réplica puede ir atrasada y esta capa no recuerda
 *   escrituras entre peticiones, que pueden caer en otro proceso.
 * - Cada transacción fija `app.actor_id`, `app.actor_type`, `app.tenant_id` y
 *   `app.trace_id` con `set_config(…, true)`, que vale solo dentro de ella. Así
 *   nada queda pegado a la conexión que el pool (o RDS Proxy) presta a otro.
 * - Cada transacción de un shard abre su propio `TransactionShardGuard`; tocar
 *   otro shard dentro de ella lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 */
export class Database implements SqlTransactionManager {
  readonly name: string;
  readonly global: boolean;
  private readonly connection: DatabaseConnection;
  private readonly context: PersistenceContextProvider;
  private readonly onHookError: (error: unknown) => void;
  /** Sesiones prestadas y aún no devueltas. */
  private leased = 0;
  /** Con valor, la base se cierra cuando se devuelva la última sesión. */
  private closing: (() => void) | undefined;
  private closed: Promise<void> | undefined;

  constructor(options: DatabaseOptions) {
    if (typeof options.name !== 'string' || options.name.length === 0) {
      throw invalidConfiguration('name', 'a non-empty string');
    }
    this.name = options.name;
    this.global = options.global ?? false;
    this.connection = options.connection;
    this.context = options.context ?? requestContextProvider;
    this.onHookError = options.onHookError ?? ((): void => undefined);
  }

  /** Contexto de la petición actual, tal como lo ve esta base. */
  currentContext(): PersistenceContext {
    return this.context();
  }

  current(): SqlUnitOfWork | undefined {
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
    runHookNow(hook, this.onHookError);
  }

  /**
   * Corre `fn` en una transacción de esta base, o dentro de la que ya está
   * abierta en ella. Ver {@link TransactionManager.runInTransaction}.
   */
  async runInTransaction<T>(
    fn: (uow: SqlUnitOfWork) => Promise<T>,
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
    await runHooks(unit.commitHooks, this.onHookError);
    return result;
  }

  /** Lectura: usa la transacción abierta en esta base o, fuera de ella, la réplica. */
  async read<T>(fn: (session: SqlSession) => Promise<T>): Promise<T> {
    const open = this.current();
    if (open !== undefined) {
      return fn(open.session);
    }
    this.assertNoOtherShard();
    return this.withSession(DatabaseRole.Replica, this.context(), fn);
  }

  /**
   * Lectura forzada al primario: para leer y luego escribir sin transacción, o
   * para leer lo que se acaba de confirmar sin depender del atraso de la réplica.
   */
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
    fn: (session: SqlSession, uow: SqlUnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.runInTransaction((uow) => fn(uow.session, uow));
  }

  /** Cierra los pools ya, aunque haya sesiones prestadas. */
  close(): Promise<void> {
    this.closed ??= this.connection.close();
    return this.closed;
  }

  /**
   * Cierra los pools cuando se devuelva la última sesión prestada. Lo usa el
   * resolver cuando un shard se trasladó a otra instancia: las transacciones en
   * curso terminan contra la vieja y su pool no queda abierto para siempre.
   */
  closeWhenIdle(): Promise<void> {
    if (this.leased === 0) {
      return this.close();
    }
    return new Promise<void>((resolve, reject) => {
      this.closing = () => {
        this.close().then(resolve, reject);
      };
    });
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
    let lease: LeasedSession;
    try {
      lease = await this.connection.acquire(role);
    } catch (error) {
      throw toPersistenceError(error);
    }
    this.leased += 1;
    let returned = false;
    return {
      query: (sql, params) => lease.query(sql, params),
      release: async (error?: unknown) => {
        if (returned) {
          return;
        }
        returned = true;
        try {
          await lease.release(error);
        } finally {
          this.leased -= 1;
          if (this.leased === 0) {
            this.closing?.();
          }
        }
      },
    };
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
}
