import { SystemClock } from '@platform/kernel';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { ShardScope } from '../../shard-scope.js';
import { ShardScopes } from '../../shard-scopes.js';

/**
 * `ShardScopes` for unit tests of use cases: a router without shards and its own request context. The scope and the
 * context are public so in-memory repositories can read the tenant the use case opened.
 */
export class UnroutedShardScopes {
  readonly scope = new ShardScope(
    new ShardRouter({
      clock: new SystemClock(),
      directory: new InMemoryDirectoryStore(),
    }),
  );
  readonly context = new RequestContextStore(new Tracing(new Redactor()));
  readonly scopes = new ShardScopes(this.scope, this.context);

  /** A ready `ShardScopes` when the test does not need to read the scope. */
  static create(): ShardScopes {
    return new UnroutedShardScopes().scopes;
  }
}
