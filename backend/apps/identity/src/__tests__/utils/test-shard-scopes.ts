import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { IdentityShardScopes } from '../../shared/utils/identity-shard-scopes.js';

/** `IdentityShardScopes` for unit tests: a router without shards and its own request context. */
export class TestShardScopes {
  readonly scope = new ShardScope(
    new ShardRouter({ directory: new InMemoryDirectoryStore() }),
  );
  readonly context = new RequestContextStore(new Tracing(new Redactor()));
  readonly scopes = new IdentityShardScopes(this.scope, this.context);

  static create(): IdentityShardScopes {
    return new TestShardScopes().scopes;
  }
}
