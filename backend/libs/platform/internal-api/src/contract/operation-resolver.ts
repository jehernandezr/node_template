import { Compensation, type OperationDefinition } from '@contracts/platform';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { OperationDescriptor } from './operation-descriptor.js';
import { OperationMetadata } from './operation-metadata.js';

/**
 * Resolves operations from their `defineOperation` descriptor and caches the
 * result per descriptor. The cache lives in the instance: two resolvers do not
 * share state.
 */
export class OperationResolver {
  private readonly resolved = new WeakMap<object, OperationDescriptor>();

  /**
   * @throws InternalApiError `InvalidOperation` if the value is not a `defineOperation`
   *   descriptor (only an untyped caller can pass it) and
   *   `MissingCompensation` if it uses `Compensation.None` without a reason.
   */
  resolve(definition: OperationDefinition): OperationDescriptor {
    const cached = this.resolved.get(definition);
    if (cached !== undefined) {
      return cached;
    }
    if (!OperationResolver.isDefinition(definition)) {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidOperation,
        'Expected a defineOperation descriptor',
      );
    }
    const descriptor = OperationResolver.describe(definition);
    this.resolved.set(definition, descriptor);
    return descriptor;
  }

  /** Whether `value` has the shape of a `defineOperation` descriptor. */
  static isDefinition(value: unknown): value is OperationDefinition {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Partial<OperationDefinition>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.idempotent === 'boolean' &&
      typeof candidate.input?.safeParse === 'function' &&
      typeof candidate.output?.safeParse === 'function'
    );
  }

  private static describe(
    definition: OperationDefinition,
  ): OperationDescriptor {
    if (
      definition.compensatedBy === Compensation.None &&
      !definition.compensationReason?.trim()
    ) {
      throw new InternalApiError(
        InternalApiErrorCode.MissingCompensation,
        `Operation "${definition.id}" uses Compensation.None without a reason`,
      );
    }
    return Object.freeze({
      id: definition.id,
      input: definition.input,
      output: definition.output,
      metadata: new OperationMetadata(definition),
    });
  }
}
