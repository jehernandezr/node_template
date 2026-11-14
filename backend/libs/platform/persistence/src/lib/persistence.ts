import {
  ShardRouter,
  ShardStrategy,
  type DirectoryStore,
  type ShardingFeatureOptions,
  type ShardRouterOptions,
} from '@platform/sharding';
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
import type { SqlTransactionManager } from './transaction/transaction-manager.js';

/** Nombre de la base del catálogo global. */
export const CATALOG_DATABASE = 'catalog';

/** Opciones comunes a todas las bases que crea {@link createPersistence}. */
export type CommonDatabaseOptions = Omit<
  DatabaseOptions,
  'name' | 'connection' | 'global'
>;

/** Directorio de ubicaciones que además lista los shards lógicos del servicio. */
export interface ShardDirectory extends DirectoryStore {
  listShards(): Promise<readonly string[]>;
}

/** Sharding del servicio. */
export interface PersistenceShardingOptions extends Omit<
  ShardingFeatureOptions<PersistenceContext>,
  'strategy'
> {
  /** Estrategia declarada. Por defecto `ShardStrategy.Directory`. */
  readonly strategy?: ShardStrategy;
  /** Conexión a cada shard lógico en su instancia. */
  readonly connect: (target: ShardTarget) => DatabaseConnection;
  /**
   * Directorio sobre la base del catálogo, por ejemplo
   * `(catalog) => new PostgresDirectoryStore({ catalog })` de
   * `@platform/adapters-postgres`. La capa no conoce sus tablas.
   */
  readonly directory: (catalog: Database) => ShardDirectory;
  /** Opciones del `ShardRouter`, salvo el directorio, que sale del catálogo. */
  readonly router?: Omit<ShardRouterOptions, 'directory'>;
}

/** Base única del servicio, sin sharding. */
export interface SingleDatabasePersistenceOptions {
  readonly database: DatabaseConnection;
  /** Nombre de la base. Por defecto `primary`. */
  readonly databaseName?: string;
  /** Contexto y errores de efectos de cada base. */
  readonly common?: CommonDatabaseOptions;
}

/** Servicio con sharding: el catálogo ubica a cada tenant en su shard. */
export interface ShardedPersistenceOptions {
  readonly catalog: DatabaseConnection;
  readonly sharding: PersistenceShardingOptions;
  /** Contexto y errores de efectos de cada base. */
  readonly common?: CommonDatabaseOptions;
}

/** Opciones de {@link createPersistence}: una base o sharding con catálogo. */
export type PersistenceOptions =
  SingleDatabasePersistenceOptions | ShardedPersistenceOptions;

/** Lo que un servicio recibe de la capa de persistencia. */
export interface Persistence {
  /** Puerto de transacciones para casos de uso, internal-api y messaging. */
  readonly transactions: SqlTransactionManager;
  /** Para construir repositorios y adaptadores: `new TaskRepository({ databases, ... })`. */
  readonly databases: DatabaseResolver;
  readonly catalog?: Database;
  readonly directory?: ShardDirectory;
  readonly router?: ShardRouter;
  close(): Promise<void>;
}

function isSharded(
  options: PersistenceOptions,
): options is ShardedPersistenceOptions {
  return 'sharding' in options && options.sharding !== undefined;
}

/**
 * Arma la capa de persistencia de un servicio. El arranque del servicio la
 * envuelve y registra `transactions`, `databases` y los repositorios como
 * providers.
 *
 * - Con `database`: una base, una `Database` como puerto de transacciones.
 * - Con `sharding` y `catalog`: el directorio sobre el catálogo alimenta al
 *   `ShardRouter`, y un `ShardedDatabaseResolver` enruta cada operación al
 *   shard del contexto.
 */
export function createPersistence(options: PersistenceOptions): Persistence {
  const common = options.common ?? {};
  const single = 'database' in options && options.database !== undefined;
  if (single === isSharded(options)) {
    throw invalidConfiguration('persistence', 'either database or sharding');
  }

  if (!isSharded(options)) {
    const { database: connection, databaseName } = options;
    const database = new Database({
      ...common,
      name: databaseName ?? 'primary',
      connection,
    });
    return {
      transactions: database,
      databases: new SingleDatabaseResolver(database),
      close: () => database.close(),
    };
  }

  const { sharding } = options;
  if (options.catalog === undefined) {
    throw invalidConfiguration('catalog', 'set when sharding is enabled');
  }
  const catalog = new Database({
    ...common,
    name: CATALOG_DATABASE,
    connection: options.catalog,
    global: true,
  });
  const directory = sharding.directory(catalog);
  const router = new ShardRouter({ ...sharding.router, directory });
  const resolver = new ShardedDatabaseResolver({
    router,
    sharding: {
      ...sharding,
      strategy: sharding.strategy ?? ShardStrategy.Directory,
    },
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
    close: async () => {
      await resolver.close();
      await catalog.close();
    },
  };
}
