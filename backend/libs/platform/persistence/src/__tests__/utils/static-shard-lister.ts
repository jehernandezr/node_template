import type { ShardLocation } from '../../model/shard-location.js';
import { ShardLister } from '../../ports/shard-lister.js';

/** `ShardLister` with a fixed list of shards, for tests and for the two-shard harness. */
export class StaticShardLister extends ShardLister {
  constructor(private readonly shards: readonly ShardLocation[]) {
    super();
  }

  override list(): Promise<readonly ShardLocation[]> {
    return Promise.resolve(this.shards);
  }
}
