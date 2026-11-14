import { SagaInstance, StepLogEntry } from '../model.js';

/** A write that is accepted only if the version and the lease token still match. */
export interface FencedWrite {
  /** New instance state. Its `version` field is ignored; the store bumps it. */
  readonly instance: SagaInstance;
  readonly expectedVersion: number;
  readonly leaseToken: string;
  /** Step log entry to write together with the instance, if any. */
  readonly step?: StepLogEntry;
}

/** A fenced write that records the dispatch of a step. */
export interface DispatchWrite extends FencedWrite {
  readonly step: StepLogEntry;
}

/** Port that persists saga instances and their step log. */
export interface SagaStore {
  /** Inserts a new instance. Throws `DuplicateSaga` if the id or the idempotency key exists. */
  create(instance: SagaInstance): Promise<void>;
  /** Returns the instance or null. */
  get(id: string): Promise<SagaInstance | null>;
  /** Returns the instance with this idempotency key, or null. */
  findByIdempotencyKey(key: string): Promise<SagaInstance | null>;
  /**
   * Atomically checks the lease token and the version, then writes the
   * instance and the optional step entry together. Throws `LeaseLost` on a
   * token mismatch and `ConcurrentModification` on a version mismatch; in both
   * cases nothing is written. Returns the stored instance.
   */
  commitStep(write: FencedWrite): Promise<SagaInstance>;
  /** Fenced write of a `Dispatched` step entry together with the instance. */
  dispatchStep(write: DispatchWrite): Promise<SagaInstance>;
  /** Returns the step log of a saga. */
  steps(sagaId: string): Promise<StepLogEntry[]>;
  /**
   * Returns instances that need a worker: Running or Compensating with an
   * expired lease, or Suspended with `nextAttemptAt <= now`.
   */
  findRecoverable(now: Date, limit: number): Promise<SagaInstance[]>;
  /** Takes the lease for `token` until `until` if it is free or expired. */
  tryAcquireLease(
    id: string,
    token: string,
    until: Date,
    now: Date,
  ): Promise<boolean>;
  /** Extends the lease if `token` still holds it. Returns false when it was lost. */
  renewLease(id: string, token: string, until: Date): Promise<boolean>;
  /** Releases the lease if `token` holds it. */
  releaseLease(id: string, token: string): Promise<void>;
}
