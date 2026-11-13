import type { IdGenerator } from '@platform/kernel';
import {
  ShardKey,
  ShardRouter,
  type ShardRouterOptions,
} from '@platform/sharding';
import { PostgresDirectoryStore } from './adapters/postgres-directory-store.js';
import { PostgresIdempotencyStore } from './adapters/postgres-idempotency-store.js';
import type { PersistenceContext } from './context/persistence-context.js';
import { Database, type DatabaseOptions } from './database.js';
import { invalidConfiguration } from './errors.js';
import {
  ShardedDatabaseResolver,
  SingleDatabaseResolver,
  type DatabaseResolver,
  type ShardTarget,
} from './sharding/database-resolver.js';
import type { DatabaseConnection } from './sql/sql-session.js';
import type { TransactionManager } from './transaction/transaction-manager.js';

/** Nombre de la base del catálogo global. */
export const CATALOG_DATABASE = 'catalog';

/** Opciones comunes a todas las bases que crea {@link createPersistence}. */
export type CommonDatabaseOptions = Omit<
  DatabaseOptions,
  'name' | 'connection' | 'global'
>;

/** Sharding del servicio, como `PersistenceModule.forFeature({ sharding })` del plan. */
export interface PersistenceShardingOptions {
  /** Llave del servicio: `ShardKey.Tenant`, `ShardKey.User` o propia. */
  readonly key: ShardKey;
  /** Valor de la llave cuando no es el tenant. Ver `ShardedDatabaseResolverOptions.keyValue`. */
  readonly keyValue?: (context: PersistenceContext) => string | undefined;
  /** Conexión a cada shard lógico en su instancia. */
  readonly connect: (target: ShardTarget) => DatabaseConnection;
  /** Opciones del `ShardRouter`, salvo el directorio, que sale del catálogo. */
  readonly router?: Omit<ShardRouterOptions, 'directory'>;
}

/** Opciones de {@link createPersistence}. Se elige `database` o `sharding`. */
export interface PersistenceOptions {
  /** Base única del servicio (sin sharding). */
  readonly database?: DatabaseConnection;
  /** Nombre de la base única. Por defecto `primary`. */
  readonly databaseName?: string;
  /** Conexión al catálogo global. Obligatoria con `sharding`. */
  readonly catalog?: DatabaseConnection;
  readonly sharding?: PersistenceShardingOptions;
  /** Contexto, reloj, ventana de lectura después de escribir y errores de efectos. */
  readonly common?: CommonDatabaseOptions;
}

/** Lo que un servicio recibe de la capa de persistencia. */
export interface Persistence {
  /** Puerto de transacciones para casos de uso, internal-api y messaging. */
  readonly transactions: TransactionManager;
  /** Para construir repositorios: `new TaskRepository({ databases, ... })`. */
  readonly databases: DatabaseResolver;
  readonly catalog?: Database;
  readonly directory?: PostgresDirectoryStore;
  readonly router?: ShardRouter;
  /** `IdempotencyStore` sobre Postgres en la base de la petición. */
  idempotencyStore<R>(ids: IdGenerator): PostgresIdempotencyStore<R>;
  close(): Promise<void>;
}

/**
 * Arma la capa de persistencia de un servicio. Cumple el papel de
 * `PersistenceModule.forFeature` del plan mientras NestJS no está en el
 * workspace: el módulo de NestJS será un envoltorio de esta función que
 * registre `transactions`, `databases` y los repositorios como providers.
 *
 * - Con `database`: una base, una `Database` como `TransactionManager`.
 * - Con `sharding` y `catalog`: el catálogo alimenta un `PostgresDirectoryStore`,
 *   este al `ShardRouter`, y un `ShardedDatabaseResolver` enruta cada operación
 *   al shard del contexto.
 */
export function createPersistence(options: PersistenceOptions): Persistence {
  const common = options.common ?? {};
  if ((options.database === undefined) === (options.sharding === undefined)) {
    throw invalidConfiguration('persistence', 'either database or sharding');
  }
  const catalog =
    options.catalog === undefined
      ? undefined
      : new Database({
          ...common,
          name: CATALOG_DATABASE,
          connection: options.catalog,
          global: true,
        });

  if (options.database !== undefined) {
    const database = new Database({
      ...common,
      name: options.databaseName ?? 'primary',
      connection: options.database,
    });
    const directory =
      catalog === undefined
        ? undefined
        : new PostgresDirectoryStore({ catalog, clock: common.clock });
    return {
      transactions: database,
      databases: new SingleDatabaseResolver(database),
      catalog,
      directory,
      idempotencyStore: <R>(ids: IdGenerator) =>
        new PostgresIdempotencyStore<R>({
          databases: database,
          ids,
          clock: common.clock,
        }),
      close: async () => {
        await database.close();
        await catalog?.close();
      },
    };
  }

  const sharding = options.sharding as PersistenceShardingOptions;
  if (catalog === undefined) {
    throw invalidConfiguration('catalog', 'set when sharding is enabled');
  }
  const directory = new PostgresDirectoryStore({
    catalog,
    clock: common.clock,
  });
  const router = new ShardRouter({ ...sharding.router, directory });
  const resolver = new ShardedDatabaseResolver({
    router,
    key: sharding.key,
    keyValue: sharding.keyValue,
    connect: sharding.connect,
    listShards: () => directory.listShards(),
    directory,
    database: common,
  });
  return {
    transactions: resolver,
    databases: resolver,
    catalog,
    directory,
    router,
    idempotencyStore: <R>(ids: IdGenerator) =>
      new PostgresIdempotencyStore<R>({
        databases: resolver,
        ids,
        clock: common.clock,
      }),
    close: async () => {
      await resolver.close();
      await catalog.close();
    },
  };
}
