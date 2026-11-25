import type { Clock } from '@platform/kernel';
import { validateContract } from '@contracts/platform';
import {
  CallOutcome,
  CanonicalJson,
  Deadline,
  DeadlineExceededError,
  TimerScheduler,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InputViolation } from '../contract/input-violation.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { ClaimKeeper } from './claim-keeper.js';
import type { CompensationTombstones } from './compensation-tombstones.js';
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
    private readonly keeper: ClaimKeeper,
    private readonly tombstones: CompensationTombstones,
  ) {}

  /**
   * En este orden:
   * 1. `rawInput` pasa del tope: `protocol-violation` `payload-too-large`.
   * 2. Llave o tenant inválidos (`IdempotencyKeyPolicy.isValid`): `protocol-violation` `invalid-idempotency-key`.
   * 3. Entrada que rompe el contrato: `InputViolation.outcome` (no se guarda).
   * 4. Plazo (`Deadline.at(meta.deadline, clock)`) y huella (`CanonicalJson.digest` de la entrada
   *    parseada); si lanzan, `outcomes.fromError`. Plazo vencido: `transient-failure` `deadline-exceeded`.
   * 5. Llave del almacén (`IdempotencyKeyPolicy.storeKey`) que no cabe: `protocol-violation` `invalid-idempotency-key`.
   * 6. Con `forwards`, la llamada es la compensación de esas operaciones: `tombstones.lay` deja la lápida del paso que
   *    deshace y, si ese paso sigue en curso, esa es la respuesta.
   * 7. `gate.claim`: si responde, esa es la respuesta; si no, `runner.run` con la entrada parseada, mientras
   *    `keeper` renueva el lease de la llave. El handler recibe en `meta.signal` una señal que aborta al vencer el plazo
   *    del intento o cuando quien llama cancela.
   */
  async dispatch(
    route: OperationRoute,
    rawInput: unknown,
    meta: CallMeta,
    forwards: readonly string[] = [],
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

    if (forwards.length > 0) {
      let waiting: CallOutcome<never> | undefined;
      try {
        waiting = await this.tombstones.lay(forwards, meta, deadline);
      } catch (error) {
        return this.outcomes.fromError(error);
      }
      if (waiting !== undefined) {
        return waiting;
      }
    }

    const decision = await this.gate.claim(
      key,
      fingerprint,
      deadline,
      meta.tenantId,
    );
    if (decision.kind === GateDecisionKind.Respond) {
      return decision.outcome;
    }
    const claimed = decision.claimed;
    const expiry = new AbortController();
    const cancel = TimerScheduler.armDetached(deadline.remainingMs(), () =>
      expiry.abort(new DeadlineExceededError(deadline.atMs)),
    );
    const signal =
      meta.signal === undefined
        ? expiry.signal
        : AbortSignal.any([expiry.signal, meta.signal]);
    try {
      return await this.keeper.during(claimed, () =>
        this.runner.run(route, claimed, validation.value, { ...meta, signal }),
      );
    } finally {
      cancel();
    }
  }
}
