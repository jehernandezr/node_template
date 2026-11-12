import { SagaError, SagaErrorCode } from './errors.js';

/** Exhaustiveness check for switches over unions. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected variant: ${JSON.stringify(value)}`);
}

/** Deep copy through JSON, the only representation that survives the store. */
export function jsonClone<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  const text = JSON.stringify(value);
  return text === undefined ? (undefined as T) : (JSON.parse(text) as T);
}

/** Copies a nullable date. */
export function copyDate(value: Date | null): Date | null {
  return value === null ? null : new Date(value.getTime());
}

/** Human-readable message of an unknown thrown value. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Rejects values that do not round-trip through JSON with their shape intact:
 * functions, symbols, bigints, non-finite numbers, cycles, and any object that
 * is not a plain object or array (Map, Set, Date, class instances).
 */
export function assertSerializableState(
  value: unknown,
  seen = new Set<object>(),
): void {
  if (value === null || value === undefined) {
    return;
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new SagaError(
          SagaErrorCode.InvalidState,
          'Saga state contains a non-finite number',
        );
      }
      return;
    case 'object':
      break;
    default:
      throw new SagaError(
        SagaErrorCode.InvalidState,
        `Saga state contains a value of type ${typeof value}`,
      );
  }
  if (seen.has(value)) {
    throw new SagaError(
      SagaErrorCode.InvalidState,
      'Saga state contains a cycle',
    );
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertSerializableState(item, seen);
    }
  } else {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SagaError(
        SagaErrorCode.InvalidState,
        'Saga state contains a non-plain object (Map, Set, Date or class instance)',
      );
    }
    for (const item of Object.values(value)) {
      assertSerializableState(item, seen);
    }
  }
  seen.delete(value);
}
