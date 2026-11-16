import { ClaimState, type Clock, type Guard } from '@platform/kernel';
import { CanonicalJson, Deadline } from '@platform/primitives';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import {
  type AcquiredMessageClaim,
  ClaimOutcomeKind,
  type ClaimOutcome,
} from './claim-outcome.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { DispatchOptions } from './dispatch-options.js';
import { ProcessedMessageKey } from './processed-message-key.js';
import type { ProcessedMessageStore } from './processed-message-store.js';

/** Ajustes del lease que {@link ClaimGuard} pide al almacén. */
export interface ClaimGuardConfig {
  /**
   * Lease mínimo en milisegundos: el visibility timeout de la cola del
   * consumidor, o `ClaimGuard.DEFAULT_LEASE_MS`. Un `visibilityTimeoutMs`
   * mayor en la entrega lo sube.
   */
  readonly baseLeaseMs: number;
  /** Margen extra sobre el lease. Por defecto, el de `ClaimRules`. */
  readonly leaseMarginMs?: number;
}

/**
 * Reclamo de idempotencia de una entrega con `ProcessedMessageStore`: toma el
 * claim de `(consumidor, id)`, lo completa o lo libera.
 */
export class ClaimGuard {
  /** Lease cuando ni las opciones ni la topología dan un visibility timeout (el de SQS). */
  static readonly DEFAULT_LEASE_MS = 30_000;

  constructor(
    private readonly store: ProcessedMessageStore,
    private readonly clock: Clock,
    guard: Guard,
    private readonly config: ClaimGuardConfig,
  ) {
    guard.positiveInteger('baseLeaseMs', config.baseLeaseMs);
    if (config.leaseMarginMs !== undefined) {
      guard.nonNegativeFinite('leaseMarginMs', config.leaseMarginMs);
    }
  }

  /**
   * Huella del mensaje: su tipo, su tenant y sus datos en JSON canónico.
   * @throws MessagingError `InvalidEnvelope` si `data` no es JSON canónico.
   */
  fingerprint(envelope: MessageEnvelope): string {
    try {
      return CanonicalJson.digest({
        type: envelope.type,
        tenantid: envelope.tenantid ?? null,
        data: envelope.data,
      });
    } catch {
      throw new MessagingError(
        MessagingErrorCode.InvalidEnvelope,
        'invalid envelope: data is not canonical JSON',
      );
    }
  }

  /**
   * Toma el claim de `(consumer, envelope.id)`. Resuelve `Settled` con
   * `Duplicate`, `InProgress` o `DeadLetter` (la huella guardada es otra:
   * conflicto de idempotencia; si el claim se había adquirido, se devuelve).
   * Si el almacén falla, el error sale tal cual.
   */
  async claim(
    envelope: MessageEnvelope,
    fingerprint: string,
    consumer: string,
    options: DispatchOptions,
  ): Promise<ClaimOutcome> {
    const key = ProcessedMessageKey.of(consumer, envelope.id);
    const leaseMs = Math.max(
      this.config.baseLeaseMs,
      options.visibilityTimeoutMs ?? 0,
    );
    const result = await this.store.claim(key, {
      fingerprint,
      deadline: Deadline.after(leaseMs, this.clock),
      minLeaseMs: leaseMs,
      ...(this.config.leaseMarginMs === undefined
        ? {}
        : { leaseMarginMs: this.config.leaseMarginMs }),
    });

    if (result.fingerprint !== fingerprint) {
      if (result.state === ClaimState.Acquired) {
        await this.release({ key, token: result.claimToken });
      }
      return {
        kind: ClaimOutcomeKind.Settled,
        result: {
          outcome: DispatchOutcome.DeadLetter,
          id: envelope.id,
          error: 'message id was already used with different content',
          code: MessagingErrorCode.IdempotencyConflict,
        },
      };
    }

    switch (result.state) {
      case ClaimState.Completed:
        return {
          kind: ClaimOutcomeKind.Settled,
          result: { outcome: DispatchOutcome.Duplicate, id: envelope.id },
        };
      case ClaimState.InProgress:
        return {
          kind: ClaimOutcomeKind.Settled,
          result: {
            outcome: DispatchOutcome.InProgress,
            id: envelope.id,
            delayMs: Math.max(
              0,
              result.leaseUntil - this.clock.now().getTime(),
            ),
          },
        };
      case ClaimState.Acquired:
        return {
          kind: ClaimOutcomeKind.Acquired,
          claim: { key, token: result.claimToken },
        };
    }
  }

  /** Guarda el resultado con el token del claim. */
  async complete(claim: AcquiredMessageClaim): Promise<void> {
    await this.store.complete(claim.key, claim.token, {
      processedAt: this.clock.now().getTime(),
    });
  }

  /**
   * Devuelve el claim con su token. Mejor esfuerzo: nunca lanza. Si la
   * liberación falla (almacén caído o token vencido), el claim queda en
   * progreso hasta que venza su lease, que acota cuánto bloquea reentregas.
   */
  async release(claim: AcquiredMessageClaim): Promise<void> {
    try {
      await this.store.release(claim.key, claim.token);
    } catch {
      // El lease acota cuánto tiempo puede bloquear el claim.
    }
  }
}
