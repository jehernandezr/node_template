import type { ShardDirectoryChangeKind } from './shard-directory-change-kind.enum.js';
import type { ShardingEvent } from './sharding-event.enum.js';

/** A tenant placement changed. */
export interface TenantPlacementChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.TenantPlacement;
  readonly tenantId: string;
  /**
   * Newly committed placement version. The receiver discards earlier
   * versions from every cache level. Without it, the receiver only discards
   * its in-process copy.
   */
  readonly version?: number;
}

/** A logical shard moved to another instance. */
export interface ShardInstanceChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.ShardInstance;
  readonly logicalShard: string;
}

/** Content of {@link ShardingEvent.ShardDirectoryChanged}. */
export type ShardDirectoryChanged =
  TenantPlacementChanged | ShardInstanceChanged;

/** Receiver of a change. The subscriber reports its errors and never returns them to the channel. */
export type ShardDirectoryChangeHandler = (
  event: ShardDirectoryChanged,
) => void | Promise<void>;
