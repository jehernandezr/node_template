import type { Abstract, Type } from '@nestjs/common';
import type { DirectoryStore } from '../ports/directory-store.js';
import type { DirectoryWriter } from '../ports/directory-writer.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import type { ShardDirectoryChannel } from '../ports/shard-directory-channel.js';
import type { ShardRouterOptions } from '../router/shard-router-options.js';
import type { TenantWriteGate } from '../ports/tenant-write-gate.js';
import type { TenantWriteWaiterOptions } from '../write-gate/tenant-write-waiter-options.js';

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
  /** Espera de una escritura con la compuerta del tenant cerrada. Por defecto 5 s, mirando cada 100 ms. */
  readonly writeWait?: TenantWriteWaiterOptions;
}

/**
 * Adaptadores de `ShardingModule`. Se pasan como tipo, no como instancia, y se
 * fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface ShardingModuleExtras {
  /**
   * Obligatorio: directorio de tenants y shards, por ejemplo `TypeOrmDirectoryStore`. Implementa también
   * `DirectoryWriter`: la compuerta y los traslados escriben en él.
   */
  readonly directory?:
    | Type<DirectoryStore & DirectoryWriter>
    | Abstract<DirectoryStore & DirectoryWriter>;
  /** Por defecto `DirectoryWriteGate`. Con Valkey, `ValkeyWriteGate`. */
  readonly writeGate?: Type<TenantWriteGate> | Abstract<TenantWriteGate>;
  /** Por defecto `NullRoutingCache`: sin caché compartido. Con Valkey, `ValkeyRoutingCache`. */
  readonly routingCache?: Type<RoutingCache> | Abstract<RoutingCache>;
  /** Por defecto `InProcessDirectoryChannel`: una sola instancia. Con Valkey, `ValkeyShardDirectoryChannel`. */
  readonly channel?:
    Type<ShardDirectoryChannel> | Abstract<ShardDirectoryChannel>;
}
