import type { Provider, Type } from '@nestjs/common';
import {
  Clock,
  ErrorDescriptor,
  IdGenerator,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { ServiceConfig, type ServiceSettings } from '@platform/config';
import { LoggerPort } from '@platform/observability';
import type { Valkey } from 'iovalkey';
import { ValkeyAuthRevocationFeed } from '../auth/valkey-auth-revocation-feed.js';
import { ValkeyAuthStateReader } from '../auth/valkey-auth-state-reader.js';
import { ValkeyAuthStateWriter } from '../auth/valkey-auth-state-writer.js';
import { ValkeyAuthTokenProvider } from '../valkey-auth-token-provider.js';
import { ValkeyBloomFilterFactory } from '../valkey-bloom-filter-factory.js';
import { ValkeyCache } from '../valkey-cache.js';
import { ValkeyClientFactory } from '../valkey-client-factory.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyConnectionResolver } from '../valkey-connection-resolver.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyHealthIndicator } from '../valkey-health-indicator.js';
import { ValkeyJobLock } from '../valkey-job-lock.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../valkey-rate-limiter.js';
import { ValkeyRoutingCache } from '../valkey-routing-cache.js';
import type { ValkeyRuntimeOptions } from '../valkey-runtime-options.js';
import { ValkeyShardDirectoryChannel } from '../valkey-shard-directory-channel.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { type ValkeySettings, ValkeyConfig } from '../valkey.config.js';
import type { ValkeyModuleExtras } from './valkey-module-options.js';
import { ValkeyLifecycle } from './valkey-lifecycle.js';
import { VALKEY_CLIENT, VALKEY_MODULE_OPTIONS } from './valkey.tokens.js';

/**
 * Proveedores de `ValkeyModule`. Todos se arman con `useFactory` porque el
 * núcleo de la librería no lleva decoradores; solo `ValkeyLifecycle` es una
 * clase de Nest.
 */
export class ValkeyProviders {
  static build(extras: ValkeyModuleExtras): Provider[] {
    return [
      { provide: Clock, useFactory: () => new SystemClock() },
      { provide: RandomSource, useFactory: () => new SystemRandomSource() },
      {
        provide: IdGenerator,
        useFactory: (clock: Clock, random: RandomSource) =>
          new UuidV7IdGenerator(clock, random),
        inject: [Clock, RandomSource],
      },
      ...(extras.authToken === undefined
        ? []
        : [
            {
              provide: ValkeyAuthTokenProvider,
              useExisting: extras.authToken,
            },
          ]),
      {
        provide: ValkeyClientFactory,
        useFactory: (
          settings: ValkeySettings,
          options: ValkeyRuntimeOptions,
          authToken: ValkeyAuthTokenProvider | undefined,
        ) =>
          new ValkeyClientFactory(
            new ValkeyConnectionResolver(),
            settings,
            options,
            authToken,
          ),
        inject: [
          ValkeyConfig.token,
          VALKEY_MODULE_OPTIONS,
          { token: ValkeyAuthTokenProvider, optional: true },
        ],
      },
      {
        provide: VALKEY_CLIENT,
        useFactory: (factory: ValkeyClientFactory) => factory.create(),
        inject: [ValkeyClientFactory],
      },
      {
        provide: ValkeyErrorTranslator,
        useFactory: () => new ValkeyErrorTranslator(),
      },
      {
        provide: ValkeyCommandExecutor,
        useFactory: (client: Valkey, errors: ValkeyErrorTranslator) =>
          new ValkeyCommandExecutor(client, errors),
        inject: [VALKEY_CLIENT, ValkeyErrorTranslator],
      },
      {
        provide: ValkeyKeyspace,
        useFactory: (valkey: ValkeySettings, service: ServiceSettings) =>
          ValkeyKeyspace.fromSettings(valkey, service.SERVICE_NAME),
        inject: [ValkeyConfig.token, ServiceConfig.token],
      },
      {
        provide: ValkeySubscriberSource,
        useFactory: (factory: ValkeyClientFactory) =>
          new ValkeySubscriberSource(factory),
        inject: [ValkeyClientFactory],
      },
      {
        provide: ValkeyCache,
        useFactory: (
          executor: ValkeyCommandExecutor,
          keyspace: ValkeyKeyspace,
        ) => new ValkeyCache(executor, keyspace),
        inject: [ValkeyCommandExecutor, ValkeyKeyspace],
      },
      {
        provide: ValkeyRateLimiter,
        useFactory: (
          executor: ValkeyCommandExecutor,
          keyspace: ValkeyKeyspace,
          clock: Clock,
        ) => new ValkeyRateLimiter(executor, keyspace, clock),
        inject: [ValkeyCommandExecutor, ValkeyKeyspace, Clock],
      },
      {
        provide: ValkeyRoutingCache,
        useFactory: (
          executor: ValkeyCommandExecutor,
          keyspace: ValkeyKeyspace,
        ) => new ValkeyRoutingCache(executor, keyspace),
        inject: [ValkeyCommandExecutor, ValkeyKeyspace],
      },
      {
        provide: ValkeyShardDirectoryChannel,
        useFactory: (
          executor: ValkeyCommandExecutor,
          subscribers: ValkeySubscriberSource,
          keyspace: ValkeyKeyspace,
          logger: LoggerPort | undefined,
        ) =>
          new ValkeyShardDirectoryChannel(
            executor,
            subscribers,
            keyspace,
            (error) =>
              logger?.error('shard directory change not delivered', {
                error: ErrorDescriptor.describe(error),
              }),
          ),
        inject: [
          ValkeyCommandExecutor,
          ValkeySubscriberSource,
          ValkeyKeyspace,
          { token: LoggerPort, optional: true },
        ],
      },
      {
        provide: ValkeyAuthStateReader,
        useFactory: (executor: ValkeyCommandExecutor, clock: Clock) =>
          new ValkeyAuthStateReader(executor, clock),
        inject: [ValkeyCommandExecutor, Clock],
      },
      {
        provide: ValkeyAuthStateWriter,
        useFactory: (executor: ValkeyCommandExecutor, clock: Clock) =>
          new ValkeyAuthStateWriter(executor, clock),
        inject: [ValkeyCommandExecutor, Clock],
      },
      {
        provide: ValkeyAuthRevocationFeed,
        useFactory: (
          subscribers: ValkeySubscriberSource,
          logger: LoggerPort | undefined,
        ) =>
          new ValkeyAuthRevocationFeed(subscribers, (error) =>
            logger?.error('auth revocation not delivered', {
              error: ErrorDescriptor.describe(error),
            }),
          ),
        inject: [ValkeySubscriberSource, { token: LoggerPort, optional: true }],
      },
      {
        provide: ValkeyBloomFilterFactory,
        useFactory: (
          executor: ValkeyCommandExecutor,
          keyspace: ValkeyKeyspace,
          ids: IdGenerator,
        ) => new ValkeyBloomFilterFactory(executor, keyspace, ids),
        inject: [ValkeyCommandExecutor, ValkeyKeyspace, IdGenerator],
      },
      {
        provide: ValkeyJobLock,
        useFactory: (
          executor: ValkeyCommandExecutor,
          keyspace: ValkeyKeyspace,
          random: RandomSource,
        ) => new ValkeyJobLock(executor, keyspace, random),
        inject: [ValkeyCommandExecutor, ValkeyKeyspace, RandomSource],
      },
      {
        provide: ValkeyHealthIndicator,
        useFactory: (executor: ValkeyCommandExecutor) =>
          new ValkeyHealthIndicator(executor),
        inject: [ValkeyCommandExecutor],
      },
      ValkeyLifecycle,
    ];
  }

  /** Lo que otros módulos reciben: el cliente, los adaptadores por clase y el indicador de salud. */
  static exports(): Array<symbol | Type<unknown>> {
    return [
      VALKEY_CLIENT,
      ValkeyCommandExecutor,
      ValkeyKeyspace,
      ValkeyErrorTranslator,
      ValkeyCache,
      ValkeyRateLimiter,
      ValkeyRoutingCache,
      ValkeyShardDirectoryChannel,
      ValkeyAuthStateReader,
      ValkeyAuthStateWriter,
      ValkeyAuthRevocationFeed,
      ValkeyBloomFilterFactory,
      ValkeyJobLock,
      ValkeyHealthIndicator,
    ];
  }
}
