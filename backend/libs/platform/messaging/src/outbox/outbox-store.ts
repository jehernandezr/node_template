import type {
  ClaimOutboxRequest,
  OutboxLease,
  OutboxRecord,
  PurgeOutboxOptions,
} from './outbox.js';

/**
 * Outbox persistence port.
 *
 * Fencing: every mark is conditional on the record keeping the given lease
 * (`leaseOwner = owner AND leaseToken = token`). A relay that lost the
 * lease cannot overwrite the state of the new owner: the mark returns `false`.
 */
export abstract class OutboxStore {
  /**
   * Atomically takes up to `limit` due records, from the oldest `createdAt`
   * to the newest, and marks them with `lease` until `now + leaseMs`. A
   * record is due when it is Pending or Failed, `nextAttemptAt <= now` and it has
   * no active lease.
   *
   * FIFO per `groupId`: when a Pending or Failed record of a group is not
   * due (scheduled later, or leased by another), no later one of that
   * group is returned. Published and Dead records do not block their group.
   */
  abstract claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]>;

  /** Marks a record as published and clears its lease. `false` if the lease is no longer its own. */
  abstract markPublished(id: string, lease: OutboxLease): Promise<boolean>;

  /**
   * Stores the failure, adds an attempt, schedules the next one and clears the lease.
   * `false` if the lease is no longer its own.
   */
  abstract markFailed(
    id: string,
    lease: OutboxLease,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;

  /** Saves a terminal failure, adds an attempt and clears the lease. `false` if the lease is no longer its own. */
  abstract markDead(
    id: string,
    lease: OutboxLease,
    error: string,
  ): Promise<boolean>;

  /**
   * Clears the lease without counting an attempt, so the record is due immediately.
   * Used with the records of a group blocked in this pass. `false` if
   * the lease is no longer its own.
   */
  abstract releaseLease(id: string, lease: OutboxLease): Promise<boolean>;

  /**
   * Retention: deletes the published ones (and, with `includeDead`, the dead ones) whose
   * last change is before `before`. Never touches pending or failed ones.
   * Returns how many it deleted.
   */
  abstract purge(options: PurgeOutboxOptions): Promise<number>;
}
