import { CallOutcome, CallOutcomeKind } from '@platform/primitives';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import type { OperationRoute } from './operation-route.js';

/** Checks the result of a handler against the contract of its operation. */
export class HandlerOutcomeChecker {
  /** Result types the protocol knows; any other value comes from a badly written handler. */
  private static readonly KNOWN_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(CallOutcomeKind),
  );

  constructor(private readonly payload: PayloadLimit) {}

  /**
   * Returns the result sent back to the caller:
   * - something that is not a known `CallOutcome`: `protocol-violation` `invalid-handler-result`;
   * - a success whose output does not match the schema: `protocol-violation` `invalid-output`; if
   *   it matches, `CallOutcome.success` with the parsed output, unless it exceeds the cap
   *   (`protocol-violation` `payload-too-large`);
   * - a business error outside `route.allowedCodes`: `protocol-violation`
   *   `undeclared-error` with that code;
   * - any other result, unchanged.
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
   * Extracts the `CallOutcome` from what a handler returned. A value that is not a
   * `HandlerResult` stays as it is and `check` rejects it as `invalid-handler-result`.
   */
  static outcomeOf(result: unknown): CallOutcome<unknown> {
    if (typeof result === 'object' && result !== null) {
      return (result as { outcome: CallOutcome<unknown> }).outcome;
    }
    return result as CallOutcome<unknown>;
  }
}
