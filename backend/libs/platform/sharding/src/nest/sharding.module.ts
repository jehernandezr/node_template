import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { DirectoryChangeSubscription } from '../directory-change-subscription.js';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { InProcessDirectoryChannel } from '../in-process-directory-channel.js';
import { NullRoutingCache } from '../null-routing-cache.js';
import { DirectoryStore } from '../ports/directory-store.js';
import { DirectoryWriter } from '../ports/directory-writer.js';
import { TenantWriteGate } from '../ports/tenant-write-gate.js';
import { DirectoryWriteGate } from '../write-gate/directory-write-gate.js';
import { PlacementTransition } from '../write-gate/placement-transition.js';
import { TenantWriteWaiter } from '../write-gate/tenant-write-waiter.js';
import type { TenantWriteWaiterOptions } from '../write-gate/tenant-write-waiter-options.js';
import { RoutingCache } from '../ports/routing-cache.js';
import { ShardDirectoryChannel } from '../ports/shard-directory-channel.js';
import { ShardRouter } from '../shard-router.js';
import {
  SHARDING_OPTIONS,
  ShardingModuleClass,
  type ShardingModuleAsyncOptions,
} from './sharding.module-definition.js';
import type {
  ShardingModuleExtras,
  ShardingModuleOptions,
} from './sharding-module-options.js';

/**
 * Connects the change channel, the router and the directory. Provides `ShardRouter` and
 * `DirectoryChangeSubscription`; subscribes the channel on startup and closes it on destroy.
 * It is global because persistence and other modules use it without importing it.
 */
@Module({})
export class ShardingModule
  extends ShardingModuleClass
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly DEFAULT_WRITE_WAIT: TenantWriteWaiterOptions = {
    maxWaitMs: 5_000,
    pollMs: 100,
  };

  constructor(private readonly subscription: DirectoryChangeSubscription) {
    super();
  }

  static override forRoot(
    options: ShardingModuleOptions & ShardingModuleExtras,
  ): DynamicModule {
    return ShardingModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: ShardingModuleAsyncOptions & ShardingModuleExtras,
  ): DynamicModule {
    return ShardingModule.complete(super.forRootAsync(options), options);
  }

  onModuleInit(): Promise<void> {
    return this.subscription.start();
  }

  onModuleDestroy(): Promise<void> {
    return this.subscription.stop();
  }

  /** @throws ShardingError `InvalidConfiguration` when `directory` is missing. */
  private static complete(
    base: DynamicModule,
    extras: ShardingModuleExtras,
  ): DynamicModule {
    if (extras.directory === undefined) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'ShardingModule needs the directory type in `directory`',
        { details: { option: 'directory' } },
      );
    }
    return {
      ...base,
      global: true,
      providers: [
        ...(base.providers ?? []),
        ...ShardingModule.providersFor(extras.directory, extras),
      ],
      exports: [
        ShardRouter,
        DirectoryChangeSubscription,
        DirectoryStore,
        DirectoryWriter,
        PlacementTransition,
        TenantWriteGate,
        TenantWriteWaiter,
      ],
    };
  }

  private static writeGateProviders(extras: ShardingModuleExtras): Provider[] {
    return [
      extras.writeGate === undefined
        ? {
            provide: TenantWriteGate,
            useFactory: (
              router: ShardRouter,
              transition: PlacementTransition,
            ) => new DirectoryWriteGate(router, transition),
            inject: [ShardRouter, PlacementTransition],
          }
        : { provide: TenantWriteGate, useExisting: extras.writeGate },
      {
        provide: TenantWriteWaiter,
        useFactory: (
          options: ShardingModuleOptions,
          gate: TenantWriteGate,
          clock: Clock,
        ) =>
          new TenantWriteWaiter(
            gate,
            clock,
            options.writeWait ?? ShardingModule.DEFAULT_WRITE_WAIT,
          ),
        inject: [SHARDING_OPTIONS, TenantWriteGate, Clock],
      },
    ];
  }

  private static providersFor(
    directory: NonNullable<ShardingModuleExtras['directory']>,
    extras: ShardingModuleExtras,
  ): Provider[] {
    return [
      NullRoutingCache,
      InProcessDirectoryChannel,
      { provide: DirectoryStore, useExisting: directory },
      { provide: DirectoryWriter, useExisting: directory },
      {
        provide: PlacementTransition,
        useFactory: (writer: DirectoryWriter, router: ShardRouter) =>
          new PlacementTransition(writer, router),
        inject: [DirectoryWriter, ShardRouter],
      },
      ...ShardingModule.writeGateProviders(extras),
      {
        provide: RoutingCache,
        useExisting: extras.routingCache ?? NullRoutingCache,
      },
      {
        provide: ShardDirectoryChannel,
        useExisting: extras.channel ?? InProcessDirectoryChannel,
      },
      {
        provide: ShardRouter,
        useFactory: (
          options: ShardingModuleOptions,
          directory: DirectoryStore,
          cache: RoutingCache,
          channel: ShardDirectoryChannel,
          clock: Clock,
        ) =>
          new ShardRouter({
            ...options.router,
            directory,
            sharedCache: cache,
            changes: channel,
            clock: clock,
          }),
        inject: [
          SHARDING_OPTIONS,
          DirectoryStore,
          RoutingCache,
          ShardDirectoryChannel,
          Clock,
        ],
      },
      {
        provide: DirectoryChangeSubscription,
        useFactory: (router: ShardRouter, channel: ShardDirectoryChannel) =>
          new DirectoryChangeSubscription(router, channel),
        inject: [ShardRouter, ShardDirectoryChannel],
      },
    ];
  }
}
