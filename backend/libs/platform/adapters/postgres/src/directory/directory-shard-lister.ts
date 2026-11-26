import { ShardLister, type ShardLocation } from '@platform/persistence';
import type { TypeOrmDirectoryStore } from '../stores/typeorm-directory-store.js';

/** Lists the service's logical shards with their instance from the catalog directory. */
export class DirectoryShardLister extends ShardLister {
  constructor(private readonly directory: TypeOrmDirectoryStore) {
    super();
  }

  override list(): Promise<readonly ShardLocation[]> {
    return this.directory.listShardLocations();
  }
}
