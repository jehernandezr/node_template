import type { ShardLocation } from '../../model/shard-location.js';
import { ShardLister } from '../../ports/shard-lister.js';

/** `ShardLister` con una lista fija de shards, para pruebas y para el arnés de dos shards. */
export class StaticShardLister extends ShardLister {
  constructor(private readonly shards: readonly ShardLocation[]) {
    super();
  }

  list(): Promise<readonly ShardLocation[]> {
    return Promise.resolve(this.shards);
  }
}
