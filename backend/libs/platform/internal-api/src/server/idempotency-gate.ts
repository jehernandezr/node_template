import {
  CallOutcome,
  type CallOutcomeFactory,
  type Deadline,
  type FinalOutcome,
} from '@platform/primitives';
import { ClaimState, type ClaimResult } from '@platform/kernel';
import { CompensationKey } from '../contract/compensation-key.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { ClaimedOperation } from './claimed-operation.js';
import { GateDecisionKind, type GateDecision } from './gate-decision.js';
import type { IdempotencyGateOptions } from './idempotency-gate.options.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/** Claim, complete y release de la llave de idempotencia de una llamada sobre el `ProcessedOperationStore`. */
export class IdempotencyGate {
  constructor(
    private readonly store: ProcessedOperationStore,
    private readonly outcomes: CallOutcomeFactory,
    private readonly options: IdempotencyGateOptions = {},
  ) {}

  /**
   * Pide el claim de `key` con la huella `fingerprint`, del tenant de la llamada si la trae; el lease dura hasta
   * `deadline` más el margen.
   * - El almacén lanza: `Respond` con `outcomes.fromError(error)`.
   * - La llave tiene la lápida de su compensación: `Respond` con el resultado de la lápida, sin correr el paso.
   * - La huella guardada difiere: si el claim se adquirió se libera sin ruido, y `Respond`
   *   con `protocol-violation` `idempotency-key-reuse`.
   * - `Completed`: `Respond` con el resultado guardado.
   * - `InProgress`: `Respond` con `transient-failure` `in-progress`.
   * - `Acquired`: `Proceed` con la llave y su token.
   */
  async claim(
    key: string,
    fingerprint: string,
    deadline: Deadline,
    tenantId?: string,
  ): Promise<GateDecision> {
    let claim: ClaimResult<FinalOutcome<unknown>>;
    try {
      claim = await this.store.claim(key, {
        fingerprint,
        deadline,
        ...(tenantId !== undefined && { tenantId }),
        ...(this.options.leaseMarginMs !== undefined && {
          leaseMarginMs: this.options.leaseMarginMs,
        }),
        ...(this.options.minLeaseMs !== undefined && {
          minLeaseMs: this.options.minLeaseMs,
        }),
      });
    } catch (error) {
      return {
        kind: GateDecisionKind.Respond,
        outcome: this.outcomes.fromError(error),
      };
    }

    if (
      claim.state === ClaimState.Completed &&
      claim.fingerprint === CompensationKey.TOMBSTONE_FINGERPRINT
    ) {
      return { kind: GateDecisionKind.Respond, outcome: claim.result };
    }
    if (claim.fingerprint !== fingerprint) {
      // Un claim adquirido con otra huella no lo usa nadie: se libera para que la llave quede libre.
      if (claim.state === ClaimState.Acquired) {
        await this.release({ key, claimToken: claim.claimToken });
      }
      return {
        kind: GateDecisionKind.Respond,
        outcome: CallOutcome.protocolViolation(
          InternalApiReason.IdempotencyKeyReuse,
          InternalApiErrorCode.IdempotencyKeyReuse,
        ),
      };
    }

    switch (claim.state) {
      case ClaimState.Completed:
        return { kind: GateDecisionKind.Respond, outcome: claim.result };
      case ClaimState.InProgress:
        return {
          kind: GateDecisionKind.Respond,
          outcome: CallOutcome.transientFailure(InternalApiReason.InProgress),
        };
      case ClaimState.Acquired:
        return {
          kind: GateDecisionKind.Proceed,
          claimed: { key, claimToken: claim.claimToken },
        };
    }
  }

  /**
   * Guarda el resultado final con el token. Propaga `StaleClaimError` si otro
   * intento tomó la llave.
   */
  complete(
    claimed: ClaimedOperation,
    outcome: FinalOutcome<unknown>,
  ): Promise<void> {
    return this.store.complete(claimed.key, claimed.claimToken, outcome);
  }

  /**
   * Libera el claim. Un token viejo significa que otro intento es dueño de la
   * llave: no lanza nunca, porque el resultado de esta llamada ya está decidido.
   */
  async release(claimed: ClaimedOperation): Promise<void> {
    try {
      await this.store.release(claimed.key, claimed.claimToken);
    } catch {
      // El lease vence solo: fallar aquí no cambia la respuesta que ya se decidió.
    }
  }
}
