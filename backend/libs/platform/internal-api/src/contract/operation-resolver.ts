import { Compensation, type OperationDefinition } from '@contracts/platform';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { OperationDescriptor } from './operation-descriptor.js';
import { OperationMetadata } from './operation-metadata.js';

/**
 * Resuelve las operaciones desde su descriptor de `defineOperation` y guarda el
 * resultado por descriptor. La caché vive en la instancia: dos resolvedores no
 * comparten estado.
 */
export class OperationResolver {
  private readonly resolved = new WeakMap<object, OperationDescriptor>();

  /**
   * @throws InternalApiError `InvalidOperation` si el valor no es un descriptor
   *   de `defineOperation` (solo un llamador sin tipos puede pasarlo) y
   *   `MissingCompensation` si usa `Compensation.None` sin motivo.
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

  /** Indica si `value` tiene la forma de un descriptor de `defineOperation`. */
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
