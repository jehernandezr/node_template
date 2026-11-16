import { ShardLister, type ShardLocation } from '@platform/persistence';
import type { TypeOrmDirectoryStore } from '../stores/typeorm-directory-store.js';

/** Lista los shards lógicos del servicio con su instancia desde el directorio del catálogo. */
export class DirectoryShardLister extends ShardLister {
  constructor(private readonly directory: TypeOrmDirectoryStore) {
    super();
  }

  list(): Promise<readonly ShardLocation[]> {
    return this.directory.listShardLocations();
  }
}
