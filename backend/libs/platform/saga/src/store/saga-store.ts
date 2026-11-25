import type { SagaInstance } from '../model/saga-instance.js';
import type { StepLogEntry } from '../model/step-log-entry.js';
import type { DispatchWrite } from './dispatch-write.js';
import type { FencedWrite } from './fenced-write.js';
import type { SagaPurge } from './saga-purge.js';

/**
 * Port that persists the saga instances and their step journal. Every
 * implementation passes `runSagaStoreContract` from `@platform/saga/test-utils`.
 */
export abstract class SagaStore {
  /** Sagas that `purge` deletes per call if no other limit is requested: short batches that do not lock the table. */
  static readonly DEFAULT_PURGE_LIMIT = 500;

  /** Inserts a new instance. @throws SagaError `DuplicateSaga` if the id or the idempotency key already exist. */
  abstract create(instance: SagaInstance): Promise<void>;

  /** Returns the instance or `null`. */
  abstract get(id: string): Promise<SagaInstance | null>;

  /** Returns the instance with this idempotency key, or `null`. */
  abstract findByIdempotencyKey(key: string): Promise<SagaInstance | null>;

  /**
   * Atomically checks the lease token and the version, and writes
   * the instance and the optional journal entry together. An entry that already
   * exists for the same step and direction is replaced. Returns the saved
   * instance, with the version bumped by one.
   * @throws SagaError `NotFound` if the saga does not exist, `LeaseLost` if the token
   *   does not match and `ConcurrentModification` if the version does not match; in all
   *   three cases nothing is written.
   */
  abstract commitStep(write: FencedWrite): Promise<SagaInstance>;

  /**
   * Guarded write of a `Dispatched` entry together with the instance.
   * @throws SagaError `InvalidState` if the entry is not in `Dispatched`, and those of `commitStep`.
   */
  abstract dispatchStep(write: DispatchWrite): Promise<SagaInstance>;

  /** Journal of a saga, ordered by step index and, within it, forward before compensation. */
  abstract steps(sagaId: string): Promise<StepLogEntry[]>;

  /**
   * Instances that need a run: `Running` or `Compensating` with an
   * expired lease, or `Suspended` with `nextAttemptAt <= now`. Oldest
   * first (`updatedAt`, then `id`). With several shards it walks all of them.
   */
  abstract findRecoverable(now: Date, limit: number): Promise<SagaInstance[]>;

  /** Takes the lease for `token` until `until` if it is free or expired. */
  abstract tryAcquireLease(
    id: string,
    token: string,
    until: Date,
    now: Date,
  ): Promise<boolean>;

  /** Extends the lease if `token` still holds it. Returns `false` if it was lost. */
  abstract renewLease(id: string, token: string, until: Date): Promise<boolean>;

  /** Releases the lease if `token` holds it. */
  abstract releaseLease(id: string, token: string): Promise<void>;

  /** Deletes the sagas that finished successfully (`Completed`, `Compensated`) and their journal. Returns how many. */
  abstract purge(options: SagaPurge): Promise<number>;
}
