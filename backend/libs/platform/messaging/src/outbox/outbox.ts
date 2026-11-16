import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { TargetKind } from '../topology/target-kind.enum.js';

/** Estado de entrega de un registro del outbox. */
export enum OutboxStatus {
  /** Nunca se intentó. */
  Pending = 'pending',
  /** Publicado con éxito. */
  Published = 'published',
  /** El último intento falló; vuelve a ser elegible en `nextAttemptAt`. */
  Failed = 'failed',
  /** Abandonado: se llegó al máximo de intentos, no hay ruta o el payload es demasiado grande. Se conserva para inspección. */
  Dead = 'dead',
}

/** Sobre pendiente de publicar. Se escribe en la misma transacción que el cambio de negocio. */
export interface OutboxRecord {
  readonly id: string;
  readonly envelope: MessageEnvelope;
  readonly status: OutboxStatus;
  /** Pasadas del relay que intentaron este registro. */
  readonly attempts: number;
  readonly nextAttemptAt: Date;
  readonly createdAt: Date;
  /**
   * Grupo de orden (normalmente el id del agregado). Los registros de un grupo se
   * publican en orden de `createdAt`, y los destinos FIFO lo reciben como id de grupo.
   */
  readonly groupId?: string;
  /**
   * Espera de entrega de un comando, contada desde `createdAt`. El relay pasa al
   * transporte lo que le queda.
   */
  readonly delayMs?: number;
  readonly lastError?: string;
  readonly leaseOwner?: string;
  /** Token de fencing del lease vigente; cambia en cada reclamo. */
  readonly leaseToken?: string;
  readonly leaseExpiresAt?: Date;
}

/**
 * Lease que tiene una pasada del relay. `owner` identifica la instancia del relay
 * y `token` el reclamo; las marcas se aplican solo mientras ambos sigan vigentes.
 */
export interface OutboxLease {
  readonly owner: string;
  readonly token: string;
}

/** Argumentos de {@link OutboxStore.claimPending}. */
export interface ClaimOutboxRequest {
  readonly now: Date;
  readonly limit: number;
  readonly lease: OutboxLease;
  /** Duración del lease en milisegundos. */
  readonly leaseMs: number;
}

/** Destino de un sobre publicado, resuelto desde la topología. */
export interface OutboundTarget {
  readonly kind: TargetKind;
  readonly name: string;
  /** Tópico o cola FIFO: el transporte envía `groupId` como `MessageGroupId`. */
  readonly fifo?: boolean;
}

/** Indicaciones extra de publicación. */
export interface PublishOutboxOptions {
  readonly groupId?: string;
  /** Espera antes de que un comando sea visible en su cola. */
  readonly delayMs?: number;
}

/** Registro que se agrega al outbox junto con el cambio de negocio. */
export interface OutboxAppend {
  readonly envelope: MessageEnvelope;
  readonly groupId?: string;
  readonly delayMs?: number;
  /** Hora de creación y primera hora de vencimiento. */
  readonly createdAt: Date;
}

/** Opciones de {@link OutboxStore.purge}. */
export interface PurgeOutboxOptions {
  /** Borra lo terminado antes de este instante. */
  readonly before: Date;
  /** También borra los muertos. Por defecto se conservan para inspección. */
  readonly includeDead?: boolean;
}
