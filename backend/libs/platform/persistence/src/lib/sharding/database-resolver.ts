import {
  routingKeyFor,
  ShardAccess,
  validateShardingFeature,
  type DirectoryStore,
  type ShardingFeatureOptions,
  type ShardRouter,
} from '@platform/sharding';
import {
  requestContextProvider,
  type PersistenceContext,
} from '../context/persistence-context.js';
import {
  currentUnitOfWork,
  Database,
  type DatabaseOptions,
} from '../database.js';
import { DataAccess } from '../enums.js';
import type { DatabaseConnection } from '../sql/sql-session.js';
import type {
  TransactionHook,
  TransactionManager,
  TransactionOptions,
  UnitOfWork,
} from '../transaction/transaction-manager.js';

/** Elige la base lógica de cada operación. */
export interface DatabaseResolver {
  /** Base de la petición actual. Una escritura exige que el tenant admita escrituras. */
  resolve(access: DataAccess): Promise<Database>;
  /** Todas las bases lógicas, para consultas explícitas entre shards. */
  all(): Promise<readonly Database[]>;
}

/** Resolver de una sola base: servicios sin sharding o con un shard. */
export class SingleDatabaseResolver implements DatabaseResolver {
  constructor(private readonly database: Database) {}

  async resolve(): Promise<Database> {
    return this.database;
  }

  async all(): Promise<readonly Database[]> {
    return [this.database];
  }
}

/** Shard lógico y la instancia física que lo aloja. */
export interface ShardTarget {
  readonly logicalShard: string;
  readonly instance: string;
}

/** Opciones de {@link ShardedDatabaseResolver}. */
export interface ShardedDatabaseResolverOptions {
  /** Router de `@platform/sharding`. Se consume tal cual. */
  readonly router: ShardRouter;
  /**
   * Declaración de sharding del servicio. Se valida al construir el resolver.
   * `ShardKey.User` toma el actor del contexto; `ShardKey.Custom` pide un
   * `keyResolver` que lee la llave del contexto. Sin llave, el resultado es
   * `PLATFORM.SHARDING.KEY_MISSING`.
   */
  readonly sharding: ShardingFeatureOptions<PersistenceContext>;
  /** Abre la conexión a un shard lógico en su instancia. Se llama una vez por par. */
  readonly connect: (target: ShardTarget) => DatabaseConnection;
  /** Lista los shards lógicos del servicio, por ejemplo `PostgresDirectoryStore.listShards`. */
  readonly listShards: () => Promise<readonly string[]>;
  /** Catálogo, para ubicar la instancia de cada shard en `all()`. */
  readonly directory: DirectoryStore;
  /** Opciones comunes de cada {@link Database}. */
  readonly database?: Omit<DatabaseOptions, 'name' | 'connection' | 'global'>;
}

interface CachedDatabase {
  readonly instance: string;
  readonly database: Database;
}

/**
 * Resolver con sharding: toma tenant y llave del contexto, pregunta al
 * `ShardRouter` y entrega la {@link Database} del shard lógico. Nunca hay un
 * shard por defecto: sin tenant, el router responde `PLATFORM.SHARDING.KEY_MISSING`.
 * También es el {@link TransactionManager} del servicio: cada transacción vive
 * en el shard del contexto.
 */
export class ShardedDatabaseResolver
  implements DatabaseResolver, TransactionManager
{
  private readonly databases = new Map<string, CachedDatabase>();
  private readonly retired: Database[] = [];
  private readonly context: () => PersistenceContext;

  constructor(private readonly options: ShardedDatabaseResolverOptions) {
    validateShardingFeature(options.sharding);
    this.context = options.database?.context ?? requestContextProvider;
  }

  async resolve(access: DataAccess): Promise<Database> {
    const context = this.context();
    const key = routingKeyFor(
      this.options.sharding,
      { tenantId: context.tenantId ?? '', userId: context.actorId },
      context,
    );
    const resolved = await this.options.router.resolve({
      tenantId: context.tenantId ?? '',
      keyKind: key.keyKind,
      keyValue: key.keyValue,
      access:
        access === DataAccess.Write ? ShardAccess.Write : ShardAccess.Read,
    });
    return this.databaseFor({
      logicalShard: resolved.logicalShard,
      instance: resolved.instance,
    });
  }

  async all(): Promise<readonly Database[]> {
    const shards = await this.options.listShards();
    const databases: Database[] = [];
    for (const logicalShard of shards) {
      const instance = await this.options.directory.getInstance(logicalShard);
      if (instance !== undefined) {
        databases.push(this.databaseFor({ logicalShard, instance }));
      }
    }
    return databases;
  }

  async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const database = await this.resolve(DataAccess.Write);
    return database.runInTransaction(fn, options);
  }

  current(): UnitOfWork | undefined {
    return currentUnitOfWork();
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
    void Promise.resolve()
      .then(hook)
      .catch((error: unknown) => this.options.database?.onHookError?.(error));
  }

  /** Cierra las conexiones abiertas, incluidas las de instancias anteriores. */
  async close(): Promise<void> {
    const all = [
      ...[...this.databases.values()].map((cached) => cached.database),
      ...this.retired,
    ];
    this.databases.clear();
    this.retired.length = 0;
    await Promise.all(all.map((database) => database.close()));
  }

  /**
   * Una {@link Database} por shard lógico. Si el shard cambió de instancia (un
   * traslado), se abre una nueva y la anterior se cierra en `close()`, porque
   * puede tener sesiones en uso.
   */
  private databaseFor(target: ShardTarget): Database {
    const cached = this.databases.get(target.logicalShard);
    if (cached?.instance === target.instance) {
      return cached.database;
    }
    if (cached !== undefined) {
      this.retired.push(cached.database);
    }
    const database = new Database({
      ...this.options.database,
      name: target.logicalShard,
      connection: this.options.connect(target),
    });
    this.databases.set(target.logicalShard, {
      instance: target.instance,
      database,
    });
    return database;
  }
}
