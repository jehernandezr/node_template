import type { FieldError } from '@contracts/platform';
import { CallOutcome, type BusinessErrorOutcome } from '@platform/primitives';
import { OperationMetadata } from './operation-metadata.js';

/**
 * Input that breaks the contract: business error
 * `PLATFORM.VALIDATION.INVALID_INPUT` with `details.fieldErrors`. The client
 * returns it before any network call and the router returns the same
 * result, so the caller handles the case in a single way. It is never stored.
 */
export interface InputViolationOutcome extends BusinessErrorOutcome {
  readonly details: { readonly fieldErrors: readonly FieldError[] };
}

/** Builds the result of an input that breaks the contract, the same on both sides of the call. */
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
