import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
} from '@platform/primitives';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';

/** Comprueba el resultado que entrega un transporte contra el contrato de la operación. */
export class ClientOutcomeChecker {
  constructor(private readonly payload: PayloadLimit) {}

  /**
   * - Éxito que pasa del tope: `protocol-violation` `payload-too-large`; si la salida no
   *   cumple el esquema: `protocol-violation` `invalid-output`; si cumple, `CallOutcome.success` con la salida parseada.
   * - Error de negocio fuera de `metadata.allowedErrorCodes()`: `protocol-violation` `undeclared-error` con ese código; si está permitido, sin cambios.
   * - `protocol-violation`, `transient-failure` y `uncertain`: sin cambios.
   * - Cualquier otra forma: `protocol-violation` `invalid-handler-result`.
   */
  settle(
    descriptor: OperationDescriptor,
    outcome: Outcome<unknown>,
  ): Outcome<unknown> {
    switch (outcome.kind) {
      case CallOutcomeKind.Success:
        return this.settleSuccess(descriptor, outcome.value);
      case CallOutcomeKind.BusinessError:
        return descriptor.metadata.allowedErrorCodes().has(outcome.code)
          ? outcome
          : CallOutcome.protocolViolation(
              InternalApiReason.UndeclaredError,
              outcome.code,
            );
      case CallOutcomeKind.ProtocolViolation:
      case CallOutcomeKind.TransientFailure:
      case CallOutcomeKind.Uncertain:
        return outcome;
      default:
        return CallOutcome.protocolViolation(
          InternalApiReason.InvalidHandlerResult,
          InternalApiErrorCode.InvalidHandlerResult,
        );
    }
  }

  private settleSuccess(
    descriptor: OperationDescriptor,
    value: unknown,
  ): Outcome<unknown> {
    if (!this.payload.fits(value)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      );
    }
    const parsed = descriptor.output.safeParse(value);
    if (!parsed.success) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidOutput,
        InternalApiErrorCode.InvalidOutput,
      );
    }
    return CallOutcome.success(parsed.data);
  }
}
