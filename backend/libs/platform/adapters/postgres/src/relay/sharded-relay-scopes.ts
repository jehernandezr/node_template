import { RelayScopes } from '@platform/messaging';
import {
  type AcrossShards,
  PersistenceError,
  PersistenceErrorCode,
} from '@platform/persistence';
import type { ShardBinding } from '../database/shard-binding.js';
import type { ShardedRelayScopesOptions } from '../model/sharded-relay-scopes-options.js';

/**
 * Runs one relay pass per logical shard of the service: visits the shards with `AcrossShards` and, in each one,
 * pins the shard with `ShardBinding` so `TypeOrmOutboxStore` works against its outbox. A down shard does not stop
 * the others; the pass fails at the end with the list of the ones that failed.
 */
export class ShardedRelayScopes extends RelayScopes {
  static readonly DEFAULT_SHARD_TIMEOUT_MS = 30_000;

  constructor(
    private readonly acrossShards: AcrossShards,
    private readonly binding: ShardBinding,
    private readonly options: ShardedRelayScopesOptions = {},
  ) {
    super();
  }

  /** @throws PersistenceError `PersistenceQueryFailed` if `body` failed or did not finish in time on some shard. */
  async forEach(body: () => Promise<void>): Promise<void> {
    const outcome = await this.acrossShards.run(
      (connection) => this.binding.run(connection, body),
      {
        ...(this.options.concurrency === undefined
          ? {}
          : { concurrency: this.options.concurrency }),
        shardTimeoutMs:
          this.options.shardTimeoutMs ??
          ShardedRelayScopes.DEFAULT_SHARD_TIMEOUT_MS,
      },
    );
    if (outcome.partial) {
      throw new PersistenceError(
        PersistenceErrorCode.QueryFailed,
        'The relay pass failed in some shards',
        {
          details: {
            shards: outcome.failures.map((failure) => failure.shard),
          },
        },
      );
    }
  }
}
