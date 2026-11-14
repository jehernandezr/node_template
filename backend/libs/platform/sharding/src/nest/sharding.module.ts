import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Clock, SystemClock } from '@platform/kernel';
import { DirectoryChangeSubscription } from '../directory-change-subscription.js';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { InProcessDirectoryChannel } from '../in-process-directory-channel.js';
import { NullRoutingCache } from '../null-routing-cache.js';
import { DirectoryStore } from '../ports/directory-store.js';
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
 * Conecta el canal de cambios, el router y el directorio. Provee `ShardRouter` y
 * `DirectoryChangeSubscription`; suscribe el canal al iniciar y lo cierra al destruirse.
 * Es global porque lo usan la persistencia y otros módulos sin importarlo.
 */
@Module({})
export class ShardingModule
  extends ShardingModuleClass
  implements OnModuleInit, OnModuleDestroy
{
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

  /** @throws ShardingError `InvalidConfiguration` cuando falta `directory`. */
  private static complete(
    base: DynamicModule,
    extras: ShardingModuleExtras,
  ): DynamicModule {
    if (extras.directory === undefined) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'ShardingModule necesita el tipo del directorio en `directory`',
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
      exports: [ShardRouter, DirectoryChangeSubscription],
    };
  }

  private static providersFor(
    directory: NonNullable<ShardingModuleExtras['directory']>,
    extras: ShardingModuleExtras,
  ): Provider[] {
    return [
      NullRoutingCache,
      InProcessDirectoryChannel,
      { provide: DirectoryStore, useExisting: directory },
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
          clock: Clock | undefined,
        ) =>
          new ShardRouter({
            ...options.router,
            directory,
            sharedCache: cache,
            changes: channel,
            clock: clock ?? new SystemClock(),
          }),
        inject: [
          SHARDING_OPTIONS,
          DirectoryStore,
          RoutingCache,
          ShardDirectoryChannel,
          { token: Clock, optional: true },
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
