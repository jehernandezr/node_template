import type { ShardLocation } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import { ShardConnections } from '../../transfer/typeorm/shard-connections.js';

/** Connections a test hands out for the databases it creates, such as a fresh database pair per test. */
export class AssignedShardConnections extends ShardConnections {
  private static readonly INSTANCE = 'test';
  private readonly byShard = new Map<string, DataSource>();
  private readonly byConnection = new Map<DataSource, ShardLocation>();

  /** A stable shard location for the connection; the same connection always gets the same one. */
  locationOf(dataSource: DataSource): ShardLocation {
    const known = this.byConnection.get(dataSource);
    if (known !== undefined) {
      return known;
    }
    const location: ShardLocation = {
      logicalShard: `test_shard_${this.byConnection.size + 1}`,
      instance: AssignedShardConnections.INSTANCE,
    };
    this.byConnection.set(dataSource, location);
    this.byShard.set(location.logicalShard, dataSource);
    return location;
  }

  /**
   * The connection handed out for the location.
   * @throws Error if the location was not handed out by `locationOf`.
   */
  get(location: ShardLocation): Promise<DataSource> {
    const dataSource = this.byShard.get(location.logicalShard);
    if (dataSource === undefined) {
      return Promise.reject(
        new Error(`No connection for ${location.logicalShard}`),
      );
    }
    return Promise.resolve(dataSource);
  }
}
