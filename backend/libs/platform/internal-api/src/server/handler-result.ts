import type { CallOutcome } from '@platform/primitives';

/** Lo que devuelve un handler: el resultado de la llamada y si sus efectos se confirman. */
export interface HandlerResult<T> {
  readonly outcome: CallOutcome<T>;
  /**
   * `false` deshace la transacción del handler. Un resultado final (éxito o
   * error de negocio) se guarda igual para que un reintento lo repita; uno que
   * no es final libera la llave. Por defecto `true`. Sin `TransactionManager`
   * no hay nada que deshacer y el resultado se trata como cualquier otro.
   */
  readonly commit?: boolean;
}
