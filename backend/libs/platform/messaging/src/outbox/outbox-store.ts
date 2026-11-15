import type {
  ClaimOutboxRequest,
  OutboxLease,
  OutboxRecord,
  PurgeOutboxOptions,
} from './outbox.js';

/**
 * Puerto de persistencia del outbox.
 *
 * Fencing: toda marca es condicional a que el registro conserve el lease dado
 * (`leaseOwner = owner AND leaseToken = token`). Un relay al que le quitaron el
 * lease no puede pisar el estado del nuevo dueño: la marca devuelve `false`.
 */
export abstract class OutboxStore {
  /**
   * Toma de forma atómica hasta `limit` registros vencidos, del `createdAt` más
   * viejo al más nuevo, y los marca con `lease` hasta `now + leaseMs`. Un
   * registro vence cuando está Pending o Failed, `nextAttemptAt <= now` y no
   * tiene un lease activo.
   *
   * FIFO por `groupId`: cuando un registro Pending o Failed de un grupo no
   * vence (programado después, o con el lease de otro), no se devuelve ninguno
   * posterior de ese grupo. Los Published y Dead no bloquean a su grupo.
   */
  abstract claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]>;

  /** Marca un registro como publicado y limpia su lease. `false` si el lease ya no es suyo. */
  abstract markPublished(id: string, lease: OutboxLease): Promise<boolean>;

  /**
   * Guarda la falla, suma un intento, programa el siguiente y limpia el lease.
   * `false` si el lease ya no es suyo.
   */
  abstract markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;

  /** Guarda una falla terminal, suma un intento y limpia el lease. `false` si el lease ya no es suyo. */
  abstract markDead(
    id: string,
    lease: OutboxLease,
    error: string,
  ): Promise<boolean>;

  /**
   * Limpia el lease sin contar un intento, así el registro vence de inmediato.
   * Se usa con los registros de un grupo bloqueado en esta pasada. `false` si
   * el lease ya no es suyo.
   */
  abstract releaseLease(id: string, lease: OutboxLease): Promise<boolean>;

  /**
   * Retención: borra los publicados (y, con `includeDead`, los muertos) cuyo
   * último cambio es anterior a `before`. Nunca toca pendientes ni fallidos.
   * Devuelve cuántos borró.
   */
  abstract purge(options: PurgeOutboxOptions): Promise<number>;
}
