import type { Provider } from '@nestjs/common';
import { Clock, IdGenerator, RandomSource } from '@platform/kernel';
import { ResilienceRegistry } from '@platform/resilience';
import { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import { LoggerPort, MetricsPort } from '@platform/observability';
import { OutboxRelayJob } from '../jobs/outbox-relay-job.js';
import { OutboxRetentionJob } from '../jobs/outbox-retention-job.js';
import { ProcessedMessageRetentionJob } from '../jobs/processed-message-retention-job.js';
import { EnvelopePublisher } from '../outbox/envelope-publisher.js';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { OutboxStore } from '../outbox/outbox-store.js';
import { RelayScopes } from '../relay/relay-scopes.js';
import { SingleRelayScope } from '../relay/single-relay-scope.js';
import { ResilientEnvelopePublisher } from '../resilience/resilient-envelope-publisher.js';
import { MessagingDefaults } from './messaging-defaults.js';
import type {
  MessagingModuleExtras,
  MessagingModuleOptions,
} from './messaging-module-options.js';
import { MESSAGING_MODULE_OPTIONS } from './messaging.module-definition.js';

/**
 * Relay providers of `MessagingModule`: the publisher with the `Queue`
 * policy, `OutboxRelay` and, with `relay: true`, the relay and retention jobs.
 */
export class MessagingRelayProviders {
  /**
   * Builds the providers of the outbox relay and its job.
   * @param extras Outbox store and publisher adapters.
   * @returns The providers.
   */
  static build(extras: MessagingModuleExtras): Provider[] {
    if (extras.publisher === undefined) {
      return [];
    }
    const providers: Provider[] = [
      {
        provide: EnvelopePublisher,
        useFactory: (inner: EnvelopePublisher, registry: ResilienceRegistry) =>
          new ResilientEnvelopePublisher(inner, registry),
        inject: [extras.publisher, ResilienceRegistry],
      },
      {
        provide: RelayScopes,
        useExisting: extras.relayScopes ?? SingleRelayScope,
      },
      ...(extras.relayScopes === undefined ? [SingleRelayScope] : []),
      {
        provide: OutboxRelay,
        useFactory: (
          options: MessagingModuleOptions,
          store: OutboxStore,
          publisher: EnvelopePublisher,
          clock: Clock,
          ids: IdGenerator,
          random: RandomSource,
        ) =>
          new OutboxRelay({
            store,
            publisher,
            topology: options.topology,
            retryPolicy:
              options.relayTuning?.retryPolicy ??
              MessagingDefaults.RELAY_RETRY_POLICY,
            ...(options.relayTuning?.batchSize === undefined
              ? {}
              : { batchSize: options.relayTuning.batchSize }),
            ...(options.relayTuning?.leaseMs === undefined
              ? {}
              : { leaseMs: options.relayTuning.leaseMs }),
            clock,
            ids,
            random,
          }),
        inject: [
          MESSAGING_MODULE_OPTIONS,
          OutboxStore,
          EnvelopePublisher,
          Clock,
          IdGenerator,
          RandomSource,
        ],
      },
    ];
    if (extras.relay !== true) {
      return providers;
    }
    return [
      ...providers,
      {
        provide: OutboxRelayJob,
        useFactory: (
          relay: OutboxRelay,
          scopes: RelayScopes,
          metrics?: MetricsPort,
          logger?: LoggerPort,
        ) => new OutboxRelayJob(relay, scopes, metrics, logger),
        inject: [
          OutboxRelay,
          RelayScopes,
          { token: MetricsPort, optional: true },
          { token: LoggerPort, optional: true },
        ],
      },
      {
        provide: OutboxRetentionJob,
        useFactory: (
          options: MessagingModuleOptions,
          store: OutboxStore,
          clock: Clock,
        ) =>
          new OutboxRetentionJob(
            store,
            clock,
            options.retention?.outboxMs ??
              MessagingDefaults.OUTBOX_RETENTION_MS,
          ),
        inject: [MESSAGING_MODULE_OPTIONS, OutboxStore, Clock],
      },
      {
        provide: ProcessedMessageRetentionJob,
        useFactory: (
          options: MessagingModuleOptions,
          store: ProcessedMessageStore,
          clock: Clock,
        ) =>
          new ProcessedMessageRetentionJob(
            store,
            clock,
            options.retention?.processedMs ??
              MessagingDefaults.PROCESSED_RETENTION_MS,
          ),
        inject: [MESSAGING_MODULE_OPTIONS, ProcessedMessageStore, Clock],
      },
    ];
  }
}
