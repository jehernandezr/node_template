import { CanonicalJson, NonJsonValueError } from '@platform/primitives';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';

/** Rules on the values the saga saves: state, and step input and output. */
export class SagaPayload {
  /**
   * Rejects what does not survive JSON with its shape intact, with the rules of
   * `CanonicalJson`: functions, symbols, bigints, non-finite numbers, cycles,
   * `undefined` inside arrays and any object that is not plain (Map, Set,
   * Date, class instances). A top-level `undefined` is accepted.
   * @throws SagaError `InvalidState`
   */
  static assertSerializable(value: unknown): void {
    if (value === undefined) {
      return;
    }
    try {
      CanonicalJson.canonicalize(value);
    } catch (error) {
      if (error instanceof NonJsonValueError) {
        throw new SagaError(
          SagaErrorCode.InvalidState,
          `Saga state is not JSON: ${error.message}`,
          { details: error.details },
        );
      }
      throw error;
    }
  }

  /** Deep copy through JSON, the only representation that survives the store. */
  static clone<T>(value: T): T {
    if (value === undefined) {
      return value;
    }
    const text = JSON.stringify(value);
    return text === undefined ? (undefined as T) : (JSON.parse(text) as T);
  }

  /** Stable fingerprint of the value, to compare initial states. */
  static digest(value: unknown): string {
    return CanonicalJson.digest(value ?? null);
  }
}
