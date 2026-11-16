import { PlatformError } from '@platform/kernel';
import { PersistenceError } from './persistence-error.js';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/** Traduce los errores del driver a `PersistenceError`. */
export class PersistenceErrorTranslator {
  /**
   * Envuelve un error del driver en `QueryFailed`. Los `PlatformError` pasan tal
   * cual. El mensaje no copia el texto del driver, que puede incluir valores.
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
