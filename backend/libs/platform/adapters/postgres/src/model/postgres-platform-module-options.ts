import type { ShardedRelayScopesOptions } from './sharded-relay-scopes-options.js';

/** Opciones de `PostgresPlatformModule.forRoot`. */
export interface PostgresPlatformModuleOptions {
  /** Lee el directorio del primario del catálogo. Ver `TypeOrmDirectoryStoreOptions`. */
  readonly directoryReadPrimary?: boolean;
  /** Ajustes de `ShardedRelayScopes`. */
  readonly relay?: ShardedRelayScopesOptions;
}
