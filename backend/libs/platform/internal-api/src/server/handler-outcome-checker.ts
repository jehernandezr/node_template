import { CallOutcome, CallOutcomeKind } from '@platform/primitives';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import type { OperationRoute } from './operation-route.js';

/** Comprueba el resultado de un handler contra el contrato de su operación. */
export class HandlerOutcomeChecker {
  /** Tipos de resultado que el protocolo conoce; cualquier otro valor viene de un handler mal escrito. */
  private static readonly KNOWN_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(CallOutcomeKind),
  );

  constructor(private readonly payload: PayloadLimit) {}

  /**
   * Devuelve el resultado que se le responde a quien llama:
   * - algo que no es un `CallOutcome` conocido: `protocol-violation` `invalid-handler-result`;
   * - un éxito cuya salida no cumple el esquema: `protocol-violation` `invalid-output`; si
   *   cumple, `CallOutcome.success` con la salida parseada, salvo que pase del tope
   *   (`protocol-violation` `payload-too-large`);
   * - un error de negocio fuera de `route.allowedCodes`: `protocol-violation`
   *   `undeclared-error` con ese código;
   * - cualquier otro resultado, sin cambios.
   */
  check(
    route: OperationRoute,
    outcome: CallOutcome<unknown>,
  ): CallOutcome<unknown> {
    if (
      typeof outcome !== 'object' ||
      outcome === null ||
      !HandlerOutcomeChecker.KNOWN_KINDS.has(outcome.kind)
    ) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidHandlerResult,
        InternalApiErrorCode.InvalidHandlerResult,
      );
    }
    if (outcome.kind === CallOutcomeKind.Success) {
      const parsed = route.descriptor.output.safeParse(outcome.value);
      if (!parsed.success) {
        return CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        );
      }
      if (!this.payload.fits(parsed.data)) {
        return CallOutcome.protocolViolation(
          InternalApiReason.PayloadTooLarge,
          InternalApiErrorCode.PayloadTooLarge,
        );
      }
      return CallOutcome.success(parsed.data);
    }
    if (
      outcome.kind === CallOutcomeKind.BusinessError &&
      !route.allowedCodes.has(outcome.code)
    ) {
      return CallOutcome.protocolViolation(
        InternalApiReason.UndeclaredError,
        outcome.code,
      );
    }
    return outcome;
  }

  /**
   * Saca el `CallOutcome` de lo que devolvió un handler. Un valor que no es un
   * `HandlerResult` queda como está y `check` lo rechaza como `invalid-handler-result`.
   */
  static outcomeOf(result: unknown): CallOutcome<unknown> {
    if (typeof result === 'object' && result !== null) {
      return (result as { outcome: CallOutcome<unknown> }).outcome;
    }
    return result as CallOutcome<unknown>;
  }
}
