import type { ShardedRelayScopesOptions } from './sharded-relay-scopes-options.js';

/** Options of `PostgresPlatformModule.forRoot`. */
export interface PostgresPlatformModuleOptions {
  /** Reads the directory from the catalog primary. See `TypeOrmDirectoryStoreOptions`. */
  readonly directoryReadPrimary?: boolean;
  /** Settings of `ShardedRelayScopes`. */
  readonly relay?: ShardedRelayScopesOptions;
}
