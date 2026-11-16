import type { Clock } from '@platform/kernel';
import { validateContract } from '@contracts/platform';
import {
  CallOutcome,
  CanonicalJson,
  Deadline,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InputViolation } from '../contract/input-violation.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import { GateDecisionKind } from './gate-decision.js';
import type { IdempotencyGate } from './idempotency-gate.js';
import type { OperationRoute } from './operation-route.js';
import type { UnitOfWorkRunner } from './unit-of-work-runner.js';

/** Valida una llamada entrante contra el contrato y la lleva hasta su handler con la llave de idempotencia reclamada. */
export class OperationDispatcher {
  constructor(
    private readonly payload: PayloadLimit,
    private readonly gate: IdempotencyGate,
    private readonly runner: UnitOfWorkRunner,
    private readonly clock: Clock,
    private readonly outcomes: CallOutcomeFactory,
  ) {}

  /**
   * En este orden:
   * 1. `rawInput` pasa del tope: `protocol-violation` `payload-too-large`.
   * 2. Llave o tenant inválidos (`IdempotencyKeyPolicy.isValid`): `protocol-violation` `invalid-idempotency-key`.
   * 3. Entrada que rompe el contrato: `InputViolation.outcome` (no se guarda).
   * 4. Plazo (`Deadline.at(meta.deadline, clock)`) y huella (`CanonicalJson.digest` de la entrada
   *    parseada); si lanzan, `outcomes.fromError`. Plazo vencido: `transient-failure` `deadline-exceeded`.
   * 5. Llave del almacén (`IdempotencyKeyPolicy.storeKey`) que no cabe: `protocol-violation` `invalid-idempotency-key`.
   * 6. `gate.claim`: si responde, esa es la respuesta; si no, `runner.run` con la entrada parseada.
   */
  async dispatch(
    route: OperationRoute,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    if (!this.payload.fits(rawInput)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      );
    }
    if (!IdempotencyKeyPolicy.isValid(meta.idempotencyKey, meta.tenantId)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    const validation = validateContract(route.descriptor.input, rawInput);
    if (!validation.ok) {
      return InputViolation.outcome(route.descriptor.id, validation.errors);
    }

    let deadline: Deadline;
    let fingerprint: string;
    try {
      deadline = Deadline.at(meta.deadline, this.clock);
      fingerprint = CanonicalJson.digest(validation.value);
    } catch (error) {
      return this.outcomes.fromError(error);
    }
    if (deadline.isExpired()) {
      return CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded);
    }

    const key = IdempotencyKeyPolicy.storeKey({
      tenantId: meta.tenantId,
      operationId: route.descriptor.id,
      idempotencyKey: meta.idempotencyKey,
    });
    if (!IdempotencyKeyPolicy.fitsStore(key)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    const decision = await this.gate.claim(key, fingerprint, deadline);
    if (decision.kind === GateDecisionKind.Respond) {
      return decision.outcome;
    }
    return this.runner.run(route, decision.claimed, validation.value, meta);
  }
}
