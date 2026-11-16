import type { Abstract, Type } from '@nestjs/common';
import type { RetryPolicy } from '@platform/primitives';
import type { TenantVerifier } from '../dispatch/tenant-verifier.js';
import type { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import type { MessageBus } from '../bus/message-bus.js';
import type { EnvelopePublisher } from '../outbox/envelope-publisher.js';
import type { OutboxStore } from '../outbox/outbox-store.js';
import type { OutboxWriter } from '../outbox/outbox-writer.js';
import type { RelayScopes } from '../relay/relay-scopes.js';
import type { Topology } from '../topology/topology.js';
import type { MessagingRetention } from './messaging-retention.js';

/** Ajustes del relay del outbox. */
export interface MessagingRelayTuning {
  /** Reintentos y espera entre ellos. Por defecto 10 intentos, de 1 s a 5 min, jitter completo. */
  readonly retryPolicy?: RetryPolicy;
  /** Registros por pasada. Por defecto 100. */
  readonly batchSize?: number;
  /** Duración del lease en milisegundos. Por defecto 30 000. */
  readonly leaseMs?: number;
}

/**
 * Opciones de `MessagingModule` que pueden salir de la configuración, así que
 * `forRootAsync` las arma con una fábrica.
 */
export interface MessagingModuleOptions {
  /** Atributo `source` de los sobres que emite el servicio. */
  readonly source: string;
  /** Nombre del consumidor, normalmente la cola. La llave de idempotencia es `(consumer, id)`. */
  readonly consumer: string;
  /** Topología del servicio, de `topologyFromContracts`. */
  readonly topology: Topology;
  /** Tenant que sirve este consumidor (cola de un solo tenant). */
  readonly expectedTenantId?: string;
  readonly retention?: MessagingRetention;
  readonly relayTuning?: MessagingRelayTuning;
}

/**
 * Adaptadores de `MessagingModule`. Se pasan como tipo, no como instancia, y se
 * fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface MessagingModuleExtras {
  /** `true`: registra `OutboxRelayJob` y los jobs de retención; exige `publisher`. Por defecto `false`. */
  readonly relay?: boolean;
  /** Obligatorio: almacén del outbox, por ejemplo `TypeOrmOutboxStore`. */
  readonly outboxStore?: Type<OutboxStore & OutboxWriter>;
  /** Obligatorio: almacén de mensajes procesados, por ejemplo `TypeOrmProcessedMessageStore`. */
  readonly processedStore?: Type<ProcessedMessageStore>;
  /** Obligatorio con `relay: true`: publicador del relay, por ejemplo `SnsSqsEnvelopePublisher`. */
  readonly publisher?: Type<EnvelopePublisher> | Abstract<EnvelopePublisher>;
  /** Por defecto, `OutboxMessageBus`. Un bus propio publica directo, sin outbox. */
  readonly bus?: Type<MessageBus> | Abstract<MessageBus>;
  /** Por defecto `SingleRelayScope`: una sola base. Con shards, `ShardedRelayScopes`. */
  readonly relayScopes?: Type<RelayScopes> | Abstract<RelayScopes>;
  /** Por defecto ninguno: sin `expectedTenantId`, el dispatcher rechaza todo sobre con tenant. */
  readonly tenantVerifier?: Type<TenantVerifier> | Abstract<TenantVerifier>;
}
