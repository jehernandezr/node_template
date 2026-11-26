import type { Provider } from '@nestjs/common';
import {
  Clock,
  IdGenerator,
  RandomSource,
  TransactionManager,
} from '@platform/kernel';
import { TraceContextRestorer, Tracing } from '@platform/observability';
import { FailureClassifier } from '@platform/primitives';
import { JobRunner } from '@platform/scheduling';
import { MessageBus } from '../bus/message-bus.js';
import { OutboxMessageBus } from '../bus/outbox-message-bus.js';
import { DeliveryContext } from '../dispatch/delivery-context.js';
import { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import { TenantVerifier } from '../dispatch/tenant-verifier.js';
import { MessagingJob } from '../jobs/messaging-job.enum.js';
import { OutboxStore } from '../outbox/outbox-store.js';
import { OutboxWriter } from '../outbox/outbox-writer.js';
import { MessagingExplorer } from './messaging-explorer.js';
import type {
  MessagingModuleExtras,
  MessagingModuleOptions,
} from './messaging-module-options.js';
import { MESSAGING_MODULE_OPTIONS } from './messaging.module-definition.js';

/** Base providers of `MessagingModule`: stores, dispatcher, bus and explorer. */
export class MessagingProviders {
  /**
   * Builds the providers of the bus, the dispatcher and the stores.
   * `MessagingModule` already checked that both required adapters exist.
   * @param extras Outbox and processed message adapters.
   * @returns The providers.
   */
  static build(extras: MessagingModuleExtras): Provider[] {
    const { outboxStore, processedStore } = extras as Required<
      Pick<MessagingModuleExtras, 'outboxStore' | 'processedStore'>
    >;
    return [
      { provide: OutboxStore, useExisting: outboxStore },
      { provide: OutboxWriter, useExisting: outboxStore },
      { provide: ProcessedMessageStore, useExisting: processedStore },
      ...(extras.tenantVerifier === undefined
        ? []
        : [{ provide: TenantVerifier, useExisting: extras.tenantVerifier }]),
      ...(extras.deliveryContext === undefined
        ? []
        : [{ provide: DeliveryContext, useExisting: extras.deliveryContext }]),
      MessagingProviders.dispatcher(),
      MessagingProviders.bus(extras),
      MessagingExplorer,
    ];
  }

  private static dispatcher(): Provider {
    return {
      provide: MessageDispatcher,
      useFactory: (
        options: MessagingModuleOptions,
        processed: ProcessedMessageStore,
        clock: Clock,
        random: RandomSource,
        tracing: Tracing,
        restorer: TraceContextRestorer,
        failures: FailureClassifier,
        verifier: TenantVerifier | undefined,
        deliveryContext: DeliveryContext | undefined,
      ) =>
        new MessageDispatcher(
          {
            consumer: options.consumer,
            processed,
            topology: options.topology,
            clock,
            ...(options.expectedTenantId === undefined
              ? {}
              : { expectedTenantId: options.expectedTenantId }),
            ...(verifier === undefined ? {} : { verifyTenant: verifier }),
            ...(deliveryContext === undefined
              ? {}
              : {
                  runInContext: (envelope, fn) =>
                    deliveryContext.run(envelope, fn),
                }),
          },
          {
            random,
            tracing,
            restorer,
            failures,
          },
        ),
      inject: [
        MESSAGING_MODULE_OPTIONS,
        ProcessedMessageStore,
        Clock,
        RandomSource,
        Tracing,
        TraceContextRestorer,
        FailureClassifier,
        { token: TenantVerifier, optional: true },
        { token: DeliveryContext, optional: true },
      ],
    };
  }

  private static bus(extras: MessagingModuleExtras): Provider {
    if (extras.bus !== undefined) {
      return { provide: MessageBus, useExisting: extras.bus };
    }
    const relay = extras.relay === true;
    return {
      provide: MessageBus,
      useFactory: (
        options: MessagingModuleOptions,
        writer: OutboxWriter,
        transactions: TransactionManager,
        clock: Clock,
        ids: IdGenerator,
        restorer: TraceContextRestorer,
        runner?: JobRunner,
      ) =>
        new OutboxMessageBus({
          topology: options.topology,
          source: options.source,
          writer,
          transactions,
          clock,
          ids,
          restorer,
          ...(relay && runner !== undefined
            ? { onCommitted: () => runner.trigger(MessagingJob.OutboxRelay) }
            : {}),
        }),
      inject: [
        MESSAGING_MODULE_OPTIONS,
        OutboxWriter,
        TransactionManager,
        Clock,
        IdGenerator,
        TraceContextRestorer,
        ...(relay ? [JobRunner] : []),
      ],
    };
  }
}
