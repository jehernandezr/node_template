import type { Abstract, Type } from '@nestjs/common';
import type { DirectoryStore } from '../ports/directory-store.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import type { ShardDirectoryChannel } from '../ports/shard-directory-channel.js';
import type { ShardRouterOptions } from '../router/shard-router-options.js';

/** Ajustes de `ShardRouter` que el servicio puede cambiar; lo demás lo cablea el módulo. */
export type ShardRouterTuning = Omit<
  ShardRouterOptions,
  'directory' | 'sharedCache' | 'changes' | 'clock'
>;

/**
 * Opciones de `ShardingModule` que pueden salir de la configuración, así que
 * `forRootAsync` las arma con una fábrica.
 */
export interface ShardingModuleOptions {
  /** Ajustes de TTL, límites, región y estrategia del router. */
  readonly router?: ShardRouterTuning;
}

/**
 * Adaptadores de `ShardingModule`. Se pasan como tipo, no como instancia, y se
 * fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface ShardingModuleExtras {
  /** Obligatorio: directorio de tenants y shards, por ejemplo `TypeOrmDirectoryStore`. */
  readonly directory?: Type<DirectoryStore> | Abstract<DirectoryStore>;
  /** Por defecto `NullRoutingCache`: sin caché compartido. Con Valkey, `ValkeyRoutingCache`. */
  readonly routingCache?: Type<RoutingCache> | Abstract<RoutingCache>;
  /** Por defecto `InProcessDirectoryChannel`: una sola instancia. Con Valkey, `ValkeyShardDirectoryChannel`. */
  readonly channel?:
    Type<ShardDirectoryChannel> | Abstract<ShardDirectoryChannel>;
}
