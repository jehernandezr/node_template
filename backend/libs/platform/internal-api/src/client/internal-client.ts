import type { OperationDefinition } from '@contracts/platform';
import { validateContract } from '@contracts/platform';
import { CallOutcome, Deadline } from '@platform/primitives';
import type { ContractRegistry } from '../contract/contract-registry.js';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InputViolation } from '../contract/input-violation.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type {
  CallInputOf,
  OperationOutputOf,
} from '../contract/operation-io.type.js';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { CallAttempt } from './call-attempt.js';
import type { CallOptions } from './call-options.js';
import type { InternalClientCollaborators } from './internal-client-collaborators.js';

/**
 * Typed client for internal operations. It validates before sending and leaves
 * retries, timeouts and the breaker to the `ResilienceRegistry`. It never throws
 * for contract problems: every result is a `CallOutcome`.
 * - Invalid input: business error `PLATFORM.VALIDATION.INVALID_INPUT` with
 *   `details.fieldErrors` (`InputViolationOutcome`), without calling the transport. The
 *   router answers the same input with the same result.
 * - Invalid or too large output, or an undeclared business code: `protocol-violation`.
 * - Declared business error: `business-error`, never retried.
 * - Transport exceptions: classified with `FailureClassifier`.
 * - Expired or cancelled attempt: `uncertain`.
 * An idempotent operation retries `transient-failure` and `uncertain` within
 * the deadline; the server deduplicates by idempotency key.
 */
export class InternalClient {
  constructor(private readonly collaborators: InternalClientCollaborators) {}

  /** Catalog of the operations this client can call, if it was given one. */
  get contracts(): ContractRegistry | undefined {
    return this.collaborators.registry;
  }

  /**
   * Calls an operation declared with `defineOperation`. An operation that
   * does not resolve (`InvalidOperation`) or is not in the catalog
   * (`UnknownOperation`) does not throw: the `InternalApiError` goes through
   * `translator.translate(error, { started: false })`, which converts it into
   * `protocol-violation` with its code.
   * The translator converts the contract error into its result; its output does not have the operation type.
   * The output already went through `descriptor.output`, so its shape matches the operation's.
   */
  async call<S extends OperationDefinition>(
    operation: S,
    input: CallInputOf<S>,
    options: CallOptions,
  ): Promise<CallOutcome<OperationOutputOf<S>>> {
    let descriptor: OperationDescriptor;
    try {
      descriptor = this.descriptorFor(operation);
    } catch (error) {
      return this.collaborators.translator.translate(error, {
        started: false,
      }) as CallOutcome<OperationOutputOf<S>>;
    }
    return (await this.callDescriptor(
      descriptor,
      input,
      options,
    )) as CallOutcome<OperationOutputOf<S>>;
  }

  /** Calls a registered operation by its id. Used by generic callers such as the saga engine. */
  callById(
    operationId: string,
    input: unknown,
    options: CallOptions,
  ): Promise<CallOutcome<unknown>> {
    const registered = this.collaborators.registry?.get(operationId);
    if (registered === undefined) {
      return Promise.resolve(
        CallOutcome.protocolViolation(
          InternalApiReason.UnknownOperation,
          InternalApiErrorCode.UnknownOperation,
        ),
      );
    }
    return this.callDescriptor(registered.descriptor, input, options);
  }

  private descriptorFor(operation: OperationDefinition): OperationDescriptor {
    const descriptor = this.collaborators.resolver.resolve(operation);
    const registry = this.collaborators.registry;
    if (registry === undefined) {
      return descriptor;
    }
    const registered = registry.get(descriptor.id);
    if (registered === undefined) {
      throw new InternalApiError(
        InternalApiErrorCode.UnknownOperation,
        `Operation "${descriptor.id}" is not in the client catalogue`,
      );
    }
    return registered.descriptor;
  }

  /**
   * The breaker is per service that owns the operation; the registry decides the retry with `idempotent`.
   */
  private async callDescriptor(
    descriptor: OperationDescriptor,
    input: unknown,
    options: CallOptions,
  ): Promise<CallOutcome<unknown>> {
    const {
      payload,
      checker,
      restorer,
      transport,
      resilience,
      policies,
      translator,
      clock,
    } = this.collaborators;
    if (
      !IdempotencyKeyPolicy.isValid(options.idempotencyKey, options.tenantId)
    ) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }
    const validation = validateContract(descriptor.input, input);
    if (!validation.ok) {
      return InputViolation.outcome(descriptor.id, validation.errors);
    }
    if (!payload.fits(input)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      );
    }
    const metadata = descriptor.metadata;
    const deadline =
      options.deadline ?? Deadline.after(metadata.callBudgetMs(), clock);
    const attempt = new CallAttempt(
      transport,
      checker,
      restorer,
      descriptor,
      input,
      options,
    );
    try {
      return await resilience.execute(
        policies.resolve(metadata),
        (signal, current) => attempt.run(signal, current),
        {
          idempotent: metadata.idempotent,
          deadline,
          dependencyKey: metadata.service(),
          ...(options.signal !== undefined && { signal: options.signal }),
        },
      );
    } catch (error) {
      return translator.translate(error, {
        started: attempt.started,
        ...(options.signal !== undefined && { signal: options.signal }),
      });
    }
  }
}
