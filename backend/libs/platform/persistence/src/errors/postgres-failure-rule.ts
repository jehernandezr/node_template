import type { FailureKind } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/**
 * Regla de `FailureClassifier` para los errores del driver de Postgres: un SQLSTATE pasajero (serialización, deadlock,
 * reinicio o conexión caída) se reintenta. Sin ella un `QueryFailedError` es permanente y una conmutación de la base
 * manda a la cola de errores lo que se podía reintentar.
 */
export class PostgresFailureRule extends FailureRule {
  /**
   * Clasifica un error del driver por su SQLSTATE.
   * @param error Error a clasificar.
   * @returns El tipo de falla pasajera, o `undefined` para que decidan las demás reglas.
   */
  classify(error: object): FailureKind | undefined {
    return PostgresFailureClassifier.transientKindOf(error);
  }
}
