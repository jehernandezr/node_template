import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ResilienceModule } from '@platform/resilience/nest';
import { MessageBus } from '../bus/message-bus.js';
import { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { OutboxWriter } from '../outbox/outbox-writer.js';
import { MessagingPolicies } from '../resilience/messaging-policies.js';
import type {
  MessagingModuleExtras,
  MessagingModuleOptions,
} from './messaging-module-options.js';
import { MessagingRelayProviders } from './messaging-relay.providers.js';
import { MessagingProviders } from './messaging.providers.js';
import {
  MessagingModuleClass,
  type MessagingModuleAsyncOptions,
} from './messaging.module-definition.js';

/**
 * Messaging wiring. Provides `MessageBus` (the outbox one, unless the
 * service passes another), `MessageDispatcher`, `OutboxWriter` and
 * `MessagingExplorer`; with `relay: true` it adds `OutboxRelay` and the
 * relay and retention jobs, which `SchedulingModule` discovers without this module
 * importing it. It is global because business modules inject `MessageBus` without importing it.
 *
 * Imports `ResilienceModule.forFeature` for the `Queue` policy when there is a
 * publisher, so `ResilienceModule.forRoot()` must be in the application.
 */
@Module({})
export class MessagingModule extends MessagingModuleClass {
  static override forRoot(
    options: MessagingModuleOptions & MessagingModuleExtras,
  ): DynamicModule {
    return MessagingModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: MessagingModuleAsyncOptions & MessagingModuleExtras,
  ): DynamicModule {
    return MessagingModule.complete(super.forRootAsync(options), options);
  }

  /** @throws MessagingError `InvalidOptions` when a required adapter is missing. */
  private static complete(
    base: DynamicModule,
    extras: MessagingModuleExtras,
  ): DynamicModule {
    MessagingModule.assertExtras(extras);
    const relay = extras.relay === true;
    const withPublisher = extras.publisher !== undefined;
    return {
      ...base,
      global: true,
      imports: [
        ...(base.imports ?? []),
        DiscoveryModule,
        ...(withPublisher
          ? [
              ResilienceModule.forFeature({
                name: MessagingPolicies.Queue,
                policy: MessagingPolicies.queue,
              }),
            ]
          : []),
      ],
      providers: [
        ...(base.providers ?? []),
        ...MessagingProviders.build(extras),
        ...MessagingRelayProviders.build(extras),
      ],
      exports: [
        MessageBus,
        MessageDispatcher,
        OutboxWriter,
        ...(relay ? [OutboxRelay] : []),
      ],
    };
  }

  private static assertExtras(extras: MessagingModuleExtras): void {
    const missing = [
      extras.outboxStore === undefined ? 'outboxStore' : undefined,
      extras.processedStore === undefined ? 'processedStore' : undefined,
      extras.relay === true && extras.publisher === undefined
        ? 'publisher'
        : undefined,
    ].filter((name) => name !== undefined);
    if (missing.length > 0) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `MessagingModule necesita el tipo del adaptador en: ${missing.join(', ')}`,
        { details: { options: missing } },
      );
    }
  }
}
