import type { Abstract, Type } from '@nestjs/common';
import type { RetryPolicy } from '@platform/primitives';
import type { DeliveryContext } from '../dispatch/delivery-context.js';
import type { TenantVerifier } from '../dispatch/tenant-verifier.js';
import type { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import type { MessageBus } from '../bus/message-bus.js';
import type { EnvelopePublisher } from '../outbox/envelope-publisher.js';
import type { OutboxStore } from '../outbox/outbox-store.js';
import type { OutboxWriter } from '../outbox/outbox-writer.js';
import type { RelayScopes } from '../relay/relay-scopes.js';
import type { Topology } from '../topology/topology.js';
import type { MessagingRetention } from './messaging-retention.js';

/** Outbox relay settings. */
export interface MessagingRelayTuning {
  /** Retries and the wait between them. Defaults to 10 attempts, from 1 s to 5 min, full jitter. */
  readonly retryPolicy?: RetryPolicy;
  /** Records per pass. Defaults to 100. */
  readonly batchSize?: number;
  /** Lease duration in milliseconds. Defaults to 30 000. */
  readonly leaseMs?: number;
}

/**
 * `MessagingModule` options that can come from configuration, so
 * `forRootAsync` builds them with a factory.
 */
export interface MessagingModuleOptions {
  /** `source` attribute of the envelopes the service emits. */
  readonly source: string;
  /** Consumer name, usually the queue. The idempotency key is `(consumer, id)`. */
  readonly consumer: string;
  /** Topology of the service, from `topologyFromContracts`. */
  readonly topology: Topology;
  /** Tenant this consumer serves (single-tenant queue). */
  readonly expectedTenantId?: string;
  readonly retention?: MessagingRetention;
  readonly relayTuning?: MessagingRelayTuning;
}

/**
 * `MessagingModule` adapters. They are passed as a type, not as an instance, and are
 * fixed when composing the module: they are the same in `forRoot` and in `forRootAsync`.
 */
export interface MessagingModuleExtras {
  /** `true`: registers `OutboxRelayJob` and the retention jobs; requires `publisher`. Defaults to `false`. */
  readonly relay?: boolean;
  /** Required: outbox store, for example `TypeOrmOutboxStore`. */
  readonly outboxStore?: Type<OutboxStore & OutboxWriter>;
  /** Required: processed messages store, for example `TypeOrmProcessedMessageStore`. */
  readonly processedStore?: Type<ProcessedMessageStore>;
  /** Required with `relay: true`: relay publisher, for example `SnsSqsEnvelopePublisher`. */
  readonly publisher?: Type<EnvelopePublisher> | Abstract<EnvelopePublisher>;
  /** Defaults to `OutboxMessageBus`. A custom bus publishes directly, without an outbox. */
  readonly bus?: Type<MessageBus> | Abstract<MessageBus>;
  /** Defaults to `SingleRelayScope`: a single database. With shards, `ShardedRelayScopes`. */
  readonly relayScopes?: Type<RelayScopes> | Abstract<RelayScopes>;
  /** None by default: without `expectedTenantId`, the dispatcher rejects every envelope with a tenant. */
  readonly tenantVerifier?: Type<TenantVerifier> | Abstract<TenantVerifier>;
  /** None by default: the claim and the handler run in the context of whoever delivers the message. */
  readonly deliveryContext?: Type<DeliveryContext> | Abstract<DeliveryContext>;
}
