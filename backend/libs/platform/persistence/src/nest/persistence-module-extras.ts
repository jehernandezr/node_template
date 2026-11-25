import type { Abstract, Type } from '@nestjs/common';
import type { InstanceEndpointResolver } from '../ports/instance-endpoint-resolver.js';
import type { ShardLister } from '../ports/shard-lister.js';

/**
 * Adapters of `PersistenceModule`. They are passed as a type, not as an instance, and are fixed when composing the
 * module: they are the same in `forRoot` and in `forRootAsync`.
 */
export interface PersistenceModuleExtras {
  /** Required: lists the service shards, for example the directory from `@platform/adapters-postgres`. */
  readonly shardLister?: Type<ShardLister> | Abstract<ShardLister>;
  /** `ConfigInstanceEndpointResolver` by default, which reads `DB_INSTANCES`. */
  readonly endpoints?:
    Type<InstanceEndpointResolver> | Abstract<InstanceEndpointResolver>;
}
