import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { TenantShard } from '../../shared/utils/tenant-shard.js';

/** `TenantShard` de las pruebas unitarias: un router sin shards y su propio contexto de petición. */
export class TestTenantShard {
  static create(): TenantShard {
    return new TenantShard(
      new ShardScope(
        new ShardRouter({ directory: new InMemoryDirectoryStore() }),
      ),
      new RequestContextStore(new Tracing(new Redactor())),
    );
  }
}
