import { canonicalize, NonJsonValueError } from '@platform/primitives';
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

/**
 * Rejects values that do not round-trip through JSON with their shape intact,
 * using the canonical JSON rules of `@platform/primitives`: functions,
 * symbols, bigints, non-finite numbers, cycles, `undefined` inside arrays and
 * any object that is not a plain object or array (Map, Set, Date, class
 * instances). A top-level `undefined` (no state, no input) is accepted.
 */
export function assertSerializableState(value: unknown): void {
  if (value === undefined) {
    return;
  }
  try {
    canonicalize(value);
  } catch (error) {
    if (error instanceof NonJsonValueError) {
      throw new SagaError(
        SagaErrorCode.InvalidState,
        `Saga state is not JSON: ${error.message}`,
        error.details,
      );
    }
    throw error;
  }
}
