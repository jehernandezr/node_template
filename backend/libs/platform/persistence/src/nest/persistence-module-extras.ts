import type { Abstract, Type } from '@nestjs/common';
import type { InstanceEndpointResolver } from '../ports/instance-endpoint-resolver.js';
import type { ShardLister } from '../ports/shard-lister.js';

/**
 * Adaptadores de `PersistenceModule`. Se pasan como tipo, no como instancia, y se fijan al componer el
 * módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface PersistenceModuleExtras {
  /** Obligatorio: lista los shards del servicio, por ejemplo el directorio de `@platform/adapters-postgres`. */
  readonly shardLister?: Type<ShardLister> | Abstract<ShardLister>;
  /** Por defecto `ConfigInstanceEndpointResolver`, que lee `DB_INSTANCES`. */
  readonly endpoints?:
    Type<InstanceEndpointResolver> | Abstract<InstanceEndpointResolver>;
}
