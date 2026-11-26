import { PlatformError } from '@platform/kernel';
import { PersistenceError } from './persistence-error.js';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/** Translates driver errors into `PersistenceError`. */
export class PersistenceErrorTranslator {
  /**
   * Wraps a driver error in `QueryFailed`. `PlatformError`s pass through
   * unchanged. The message does not copy the driver text, which may include values.
   * @param error Driver error.
   * @returns The platform error.
   */
  static toPersistenceError(error: unknown): PlatformError {
    if (error instanceof PlatformError) {
      return error;
    }
    const sqlState = PostgresFailureClassifier.sqlStateOf(error);
    return new PersistenceError(
      PersistenceErrorCode.QueryFailed,
      'Database statement failed',
      {
        cause: error,
        details: sqlState === undefined ? undefined : { sqlState },
      },
    );
  }
}
