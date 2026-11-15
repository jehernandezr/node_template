import type { Clock, RandomSource } from '@platform/kernel';
import type { Tracing, TraceContextRestorer } from '@platform/observability';
import type { FailureClassifier } from '@platform/primitives';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { Topology } from '../topology/topology.js';
import type { PermanenceCheck } from './delivery-classifier.js';
import type { ProcessedMessageStore } from './processed-message-store.js';
import type { TenantVerifier } from './tenant-verifier.js';

/** Dependencias y reglas del dispatcher. */
export interface MessageDispatcherOptions {
  /** Nombre del consumidor, normalmente la cola. La llave de idempotencia es `(consumer, id)`. */
  readonly consumer: string;
  readonly processed: ProcessedMessageStore;
  /** Dice de qué tipo es un mensaje sin manejador: un evento se ignora, un comando va a la cola de errores. */
  readonly topology?: Topology;
  /**
   * Regla de permanencia de los errores que lanza un manejador. Por defecto,
   * la del `FailureClassifier` (ver `DeliveryClassifier.disposition`).
   */
  readonly isPermanent?: PermanenceCheck;
  /** Envuelve el claim y el manejador, por ejemplo para abrir una transacción o un contexto de tenant. */
  readonly runInContext?: (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ) => Promise<void>;
  /** Fuente de la hora de los leases. Por defecto, el reloj del sistema. */
  readonly clock?: Clock;
  /**
   * Lease mínimo del claim en milisegundos, entero positivo. Debe cubrir el
   * visibility timeout de la cola. Por defecto, el visibility timeout de la
   * cola del consumidor en `topology` o `ClaimGuard.DEFAULT_LEASE_MS`.
   */
  readonly minLeaseMs?: number;
  /** Margen extra sobre `minLeaseMs`. Por defecto, el de `ClaimRules`. */
  readonly leaseMarginMs?: number;
  /** Tenant que sirve este consumidor (cola de un solo tenant). Ver `DispatchOptions.expectedTenantId`. */
  readonly expectedTenantId?: string;
  /** Verifica el tenant del sobre antes de correr el manejador. */
  readonly verifyTenant?: TenantVerifier;
}

/** Colaboradores opcionales del dispatcher; sin ellos arma los de por defecto. */
export interface MessageDispatcherParts {
  /** Spans de consumidor. Por defecto, un `Tracing` propio sin SDK registrado (no-op). */
  readonly tracing?: Tracing;
  /** Continúa la traza del `traceparent` del sobre. Por defecto, sobre `tracing`. */
  readonly restorer?: TraceContextRestorer;
  /** Fuente del jitter de la espera de reintento. Por defecto `SystemRandomSource`. */
  readonly random?: RandomSource;
  /** Clasificador de fallas. Por defecto `FailureClassifier` sin reglas. */
  readonly failures?: FailureClassifier;
}
