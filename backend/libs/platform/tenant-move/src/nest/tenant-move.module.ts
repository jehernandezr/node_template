import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { Clock } from '@platform/kernel';
import {
  ShardDataSources,
  ShardLister,
  TenantWriteFence,
} from '@platform/persistence';
import {
  DirectoryStore,
  PlacementTransition,
  ShardRouter,
  TenantWriteGate,
} from '@platform/sharding';
import { OpenSagaActivity } from '../activity/open-saga-activity.js';
import { TenantMoveActivity } from '../application/tenant-move-activity.js';
import { TenantMoveFence } from '../application/tenant-move-fence.js';
import { TenantMoveListener } from '../application/tenant-move-listener.js';
import { ShardTenantMoveFence } from '../fence/shard-tenant-move-fence.js';
import { PooledShardConnections } from '../transfer/typeorm/pooled-shard-connections.js';
import { ShardConnections } from '../transfer/typeorm/shard-connections.js';
import { TenantMoveShards } from '../application/tenant-move-shards.js';
import { TenantMoves } from '../application/tenant-moves.js';
import {
  TenantMoveConfig,
  type TenantMoveSettings,
} from '../config/tenant-move.config.js';
import { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';
import { TenantMoveTargets } from '../targets/tenant-move-targets.js';
import { TenantDataTransfer } from '../transfer/tenant-data-transfer.js';
import { TenantDataTransferSelector } from '../transfer/tenant-data-transfer-selector.js';
import type { TenantMoveFeatureOptions } from './tenant-move-feature-options.js';
import { TenantMoveOperationsFactory } from './tenant-move-operations.factory.js';

/**
 * Registers the move operations of a service over its manifest. Requires the platform persistence and
 * sharding (`ShardRouter`, `DirectoryStore`, `TenantWriteGate`, `PlacementTransition`,
 * `ShardDataSources`, `ShardLister` and `TenantWriteFence`) in the context, which the `@platform/service` runtime mounts as globals.
 */
@Module({})
export class TenantMoveModule {
  /**
   * Registers the move steps of the service over its manifest and exposes its move operations.
   * @param options The contract operations, the manifest class, the optional listener and, in `imports`, the
   *   service modules whose exports the listener injects.
   */
  static forFeature(options: TenantMoveFeatureOptions): DynamicModule {
    const operations = TenantMoveOperationsFactory.create(options.operations);
    return {
      module: TenantMoveModule,
      imports: [
        ConfigModule.forFeature(TenantMoveConfig),
        ...(options.imports ?? []),
      ],
      providers: [
        { provide: TenantMoveManifest, useClass: options.manifest },
        {
          provide: ShardConnections,
          useFactory: (sources: ShardDataSources) =>
            new PooledShardConnections(sources),
          inject: [ShardDataSources],
        },
        {
          provide: TenantMoveActivity,
          useFactory: (connections: ShardConnections) =>
            new OpenSagaActivity(connections),
          inject: [ShardConnections],
        },
        {
          provide: TenantMoveFence,
          useFactory: (
            fence: TenantWriteFence,
            connections: ShardConnections,
          ) => new ShardTenantMoveFence(fence, connections),
          inject: [TenantWriteFence, ShardConnections],
        },
        ...TenantMoveModule.listenerProviders(options),
        {
          provide: TenantDataTransfer,
          useFactory: (
            settings: TenantMoveSettings,
            manifest: TenantMoveManifest,
            connections: ShardConnections,
            clock: Clock,
          ) =>
            new TenantDataTransferSelector(connections, clock).select(
              settings,
              manifest,
            ),
          inject: [
            TenantMoveConfig.token,
            TenantMoveManifest,
            ShardConnections,
            Clock,
          ],
        },
        {
          provide: TenantMoveShards,
          useFactory: (
            router: ShardRouter,
            directory: DirectoryStore,
            settings: TenantMoveSettings,
          ) =>
            new TenantMoveShards(
              router,
              directory,
              new TenantMoveTargets(settings.TENANT_MOVE_TARGETS),
            ),
          inject: [ShardRouter, DirectoryStore, TenantMoveConfig.token],
        },
        {
          provide: TenantMoves,
          useFactory: (
            shards: TenantMoveShards,
            transfer: TenantDataTransfer,
            gate: TenantWriteGate,
            fence: TenantMoveFence,
            transition: PlacementTransition,
            lister: ShardLister,
            activity: TenantMoveActivity,
            listener: TenantMoveListener | undefined,
          ) =>
            new TenantMoves(
              shards,
              transfer,
              gate,
              fence,
              transition,
              lister,
              activity,
              listener,
            ),
          inject: [
            TenantMoveShards,
            TenantDataTransfer,
            TenantWriteGate,
            TenantMoveFence,
            PlacementTransition,
            ShardLister,
            TenantMoveActivity,
            { token: TenantMoveListener, optional: true },
          ],
        },
        {
          provide: operations,
          useFactory: (moves: TenantMoves) => new operations(moves),
          inject: [TenantMoves],
        },
      ],
      exports: [TenantMoves],
    };
  }

  private static listenerProviders(
    options: TenantMoveFeatureOptions,
  ): Provider[] {
    return options.listener === undefined
      ? []
      : [{ provide: TenantMoveListener, useClass: options.listener }];
  }
}
