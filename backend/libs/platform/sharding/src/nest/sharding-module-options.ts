import type { Abstract, Type } from '@nestjs/common';
import type { DirectoryStore } from '../ports/directory-store.js';
import type { DirectoryWriter } from '../ports/directory-writer.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import type { ShardDirectoryChannel } from '../ports/shard-directory-channel.js';
import type { ShardRouterOptions } from '../router/shard-router-options.js';
import type { TenantWriteGate } from '../ports/tenant-write-gate.js';
import type { TenantWriteWaiterOptions } from '../write-gate/tenant-write-waiter-options.js';

/** `ShardRouter` settings the service can change; the module wires the rest. */
export type ShardRouterTuning = Omit<
  ShardRouterOptions,
  'directory' | 'sharedCache' | 'changes' | 'clock'
>;

/**
 * `ShardingModule` options that can come from configuration, so
 * `forRootAsync` builds them with a factory.
 */
export interface ShardingModuleOptions {
  /** Router TTL, limit, region and strategy settings. */
  readonly router?: ShardRouterTuning;
  /** Wait for a write while the tenant gate is closed. Defaults to 5 s, checking every 100 ms. */
  readonly writeWait?: TenantWriteWaiterOptions;
}

/**
 * `ShardingModule` adapters. They are passed as types, not instances, and are
 * fixed when composing the module: they are the same in `forRoot` and `forRootAsync`.
 */
export interface ShardingModuleExtras {
  /**
   * Required: tenant and shard directory, for example `TypeOrmDirectoryStore`. It also implements
   * `DirectoryWriter`: the gate and the moves write to it.
   */
  readonly directory?:
    | Type<DirectoryStore & DirectoryWriter>
    | Abstract<DirectoryStore & DirectoryWriter>;
  /** Defaults to `DirectoryWriteGate`. With Valkey, `ValkeyWriteGate`. */
  readonly writeGate?: Type<TenantWriteGate> | Abstract<TenantWriteGate>;
  /** Defaults to `NullRoutingCache`: no shared cache. With Valkey, `ValkeyRoutingCache`. */
  readonly routingCache?: Type<RoutingCache> | Abstract<RoutingCache>;
  /** Defaults to `InProcessDirectoryChannel`: a single instance. With Valkey, `ValkeyShardDirectoryChannel`. */
  readonly channel?:
    Type<ShardDirectoryChannel> | Abstract<ShardDirectoryChannel>;
}
