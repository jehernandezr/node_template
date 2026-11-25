import type { SagaStore } from '../../store/saga-store.js';

/** What `runSagaStoreContract` needs to test a store. */
export interface SagaStoreHarness {
  readonly store: SagaStore;
  /**
   * Runs `body` in the context the store requires (for example, the tenant
   * of a shard). The in-memory one runs it as is.
   */
  within<T>(body: () => Promise<T>): Promise<T>;
  /** Empties the store, so each test starts from zero. */
  reset(): Promise<void>;
}
