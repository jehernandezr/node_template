import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { TenantShard } from '../../shared/utils/tenant-shard.js';

/** `TenantShard` for unit tests: a router without shards and its own request context. */
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
