import type { SagaInstance } from '../model/saga-instance.js';

/**
 * Runs the work of a saga in the context of the partition where it lives. With
 * shards, the Postgres adapter provides a version that pins the shard of the
 * saga tenant; the recovery job uses it because there is no request that gives the tenant.
 */
export abstract class SagaScopes {
  /** Runs `body` in the partition of `instance`. */
  abstract run<T>(instance: SagaInstance, body: () => Promise<T>): Promise<T>;
}
