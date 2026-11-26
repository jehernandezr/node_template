import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
} from '@platform/primitives';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';

/** Checks the result a transport delivers against the operation contract. */
export class ClientOutcomeChecker {
  constructor(private readonly payload: PayloadLimit) {}

  /**
   * - Success over the cap: `protocol-violation` `payload-too-large`; if the output does not
   *   match the schema: `protocol-violation` `invalid-output`; if it does, `CallOutcome.success` with the parsed output.
   * - Business error outside `metadata.allowedErrorCodes()`: `protocol-violation` `undeclared-error` with that code; if allowed, unchanged.
   * - `protocol-violation`, `transient-failure` and `uncertain`: unchanged.
   * - Any other shape: `protocol-violation` `invalid-handler-result`.
   * @param descriptor Operation descriptor.
   * @param outcome Outcome of the transport.
   * @returns The checked outcome.
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
