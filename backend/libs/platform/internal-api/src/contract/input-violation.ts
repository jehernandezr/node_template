import type { FieldError } from '@contracts/platform';
import { CallOutcome, type BusinessErrorOutcome } from '@platform/primitives';
import { OperationMetadata } from './operation-metadata.js';

/**
 * Entrada que rompe el contrato: error de negocio
 * `PLATFORM.VALIDATION.INVALID_INPUT` con `details.fieldErrors`. El cliente lo
 * devuelve antes de cualquier llamada de red y el router devuelve el mismo
 * resultado, así quien llama maneja el caso de una sola forma. Nunca se guarda.
 */
export interface InputViolationOutcome extends BusinessErrorOutcome {
  readonly details: { readonly fieldErrors: readonly FieldError[] };
}

/** Construye el resultado de una entrada que rompe el contrato, igual en los dos lados de la llamada. */
export class InputViolation {
  static outcome(
    operationId: string,
    fieldErrors: readonly FieldError[],
  ): InputViolationOutcome {
    return {
      ...CallOutcome.businessError(OperationMetadata.INVALID_INPUT_CODE, {
        message: `Invalid input for "${operationId}"`,
      }),
      details: { fieldErrors },
    };
  }
}
