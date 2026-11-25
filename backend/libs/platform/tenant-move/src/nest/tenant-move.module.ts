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
import { TenantMoveListener } from '../application/tenant-move-listener.js';
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
  static forFeature(options: TenantMoveFeatureOptions): DynamicModule {
    const operations = TenantMoveOperationsFactory.create(options.operations);
    return {
      module: TenantMoveModule,
      imports: [ConfigModule.forFeature(TenantMoveConfig)],
      providers: [
        { provide: TenantMoveManifest, useClass: options.manifest },
        { provide: TenantMoveActivity, useClass: OpenSagaActivity },
        ...TenantMoveModule.listenerProviders(options),
        {
          provide: TenantDataTransfer,
          useFactory: (
            settings: TenantMoveSettings,
            manifest: TenantMoveManifest,
            clock: Clock,
          ) =>
            new TenantDataTransferSelector().select(settings, manifest, clock),
          inject: [TenantMoveConfig.token, TenantMoveManifest, Clock],
        },
        {
          provide: TenantMoveShards,
          useFactory: (
            router: ShardRouter,
            directory: DirectoryStore,
            sources: ShardDataSources,
            settings: TenantMoveSettings,
          ) =>
            new TenantMoveShards(
              router,
              directory,
              sources,
              new TenantMoveTargets(settings.TENANT_MOVE_TARGETS),
            ),
          inject: [
            ShardRouter,
            DirectoryStore,
            ShardDataSources,
            TenantMoveConfig.token,
          ],
        },
        {
          provide: TenantMoves,
          useFactory: (
            shards: TenantMoveShards,
            transfer: TenantDataTransfer,
            gate: TenantWriteGate,
            fence: TenantWriteFence,
            transition: PlacementTransition,
            lister: ShardLister,
            sources: ShardDataSources,
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
              sources,
              activity,
              listener,
            ),
          inject: [
            TenantMoveShards,
            TenantDataTransfer,
            TenantWriteGate,
            TenantWriteFence,
            PlacementTransition,
            ShardLister,
            ShardDataSources,
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
