import { PlatformErrorCode } from '@contracts/platform';
import { RelayScopes } from '@platform/messaging';
import { type AcrossShards, PersistenceError } from '@platform/persistence';
import type { ShardBinding } from '../database/shard-binding.js';
import type { ShardedRelayScopesOptions } from '../model/sharded-relay-scopes-options.js';

/**
 * Corre una pasada del relay por cada shard lógico del servicio: recorre los shards con `AcrossShards` y, en cada uno,
 * fija el shard con `ShardBinding` para que `TypeOrmOutboxStore` trabaje contra su outbox. Un shard caído no detiene a
 * los demás; la pasada falla al final con la lista de los que fallaron.
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

  /** @throws PersistenceError `PersistenceQueryFailed` si `body` falló o no terminó a tiempo en algún shard. */
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
        PlatformErrorCode.PersistenceQueryFailed,
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
