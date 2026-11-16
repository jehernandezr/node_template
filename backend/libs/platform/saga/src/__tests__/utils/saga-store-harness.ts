import type { SagaStore } from '../../store/saga-store.js';

/** Lo que `runSagaStoreContract` necesita para probar un almacén. */
export interface SagaStoreHarness {
  readonly store: SagaStore;
  /**
   * Corre `body` en el contexto que el almacén exige (por ejemplo, el tenant
   * de un shard). El de memoria lo corre tal cual.
   */
  within<T>(body: () => Promise<T>): Promise<T>;
  /** Deja el almacén vacío, para que cada prueba parta de cero. */
  reset(): Promise<void>;
}
