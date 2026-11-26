import type { ShardLocation } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import type { ConnectedTransfer } from './connected-transfer.js';
import type { TenantTransfer } from './tenant-transfer.js';

/** Opens the connection of a shard for the adapters of a move; the application layer only knows shard locations. */
export abstract class ShardConnections {
  /** The initialized connection of the shard. */
  abstract get(location: ShardLocation): Promise<DataSource>;

  /** The move with the connections of its source and target shards. */
  async connect(transfer: TenantTransfer): Promise<ConnectedTransfer> {
    return {
      moveId: transfer.moveId,
      tenantId: transfer.tenantId,
      source: await this.get(transfer.source),
      target: await this.get(transfer.target),
      ...(transfer.budget === undefined ? {} : { budget: transfer.budget }),
    };
  }
}
