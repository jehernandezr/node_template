import {
  ClaimState,
  IdempotencyStore,
  type ClaimRequest,
  type ClaimResult,
  type Clock,
  type IdGenerator,
} from '@platform/kernel';
import { DeadlineExceededError } from '../errors/deadline-exceeded.error.js';
import { StaleClaimError } from '../errors/stale-claim.error.js';
import { ClaimRules } from './claim-rules.js';

type StoredRecord<R> =
  | {
      readonly state: ClaimState.InProgress;
      readonly fingerprint: string;
      readonly claimToken: string;
      readonly leaseUntil: number;
    }
  | {
      readonly state: ClaimState.Completed;
      readonly fingerprint: string;
      readonly result: R;
    };

/**
 * In-memory adapter. It is atomic within a process because each method
 * resolves without yielding the thread; it suits tests and a single process. It
 * does not expire completed results.
 */
export class InMemoryIdempotencyStore<R = unknown> extends IdempotencyStore<R> {
  private readonly records = new Map<string, StoredRecord<R>>();

  constructor(
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>> {
    try {
      return Promise.resolve(this.claimNow(key, request));
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }

  complete(key: string, claimToken: string, result: R): Promise<void> {
    const record = this.ownedRecord(key, claimToken);
    if (record === undefined) {
      return Promise.reject(new StaleClaimError('complete'));
    }
    this.records.set(key, {
      state: ClaimState.Completed,
      fingerprint: record.fingerprint,
      result,
    });
    return Promise.resolve();
  }

  release(key: string, claimToken: string): Promise<void> {
    if (this.ownedRecord(key, claimToken) === undefined) {
      return Promise.reject(new StaleClaimError('release'));
    }
    this.records.delete(key);
    return Promise.resolve();
  }

  /**
   * Extends to `leaseUntilMs` the lease of an in-progress claim that still belongs to `claimToken`. Returns `false` if
   * the claim already finished or another attempt took it.
   */
  renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    const record = this.ownedRecord(key, claimToken);
    if (record === undefined) {
      return Promise.resolve(false);
    }
    this.records.set(key, {
      ...record,
      leaseUntil: Math.max(record.leaseUntil, leaseUntilMs),
    });
    return Promise.resolve(true);
  }

  private claimNow(key: string, request: ClaimRequest): ClaimResult<R> {
    ClaimRules.assertInput(key, request.fingerprint);
    const now = this.clock.now().getTime();
    const record = this.records.get(key);

    if (record?.state === ClaimState.Completed) {
      return {
        state: ClaimState.Completed,
        result: record.result,
        fingerprint: record.fingerprint,
      };
    }
    if (record !== undefined && record.leaseUntil > now) {
      return {
        state: ClaimState.InProgress,
        leaseUntil: record.leaseUntil,
        fingerprint: record.fingerprint,
      };
    }
    if (request.deadline.atMs <= now) {
      throw new DeadlineExceededError(request.deadline.atMs);
    }

    // Free key or expired lease: a new token is issued and the previous one stops being valid.
    // When an expired lease is taken, the fingerprint of the first claim is kept.
    const fingerprint = record?.fingerprint ?? request.fingerprint;
    const claimToken = this.ids.next().toString();
    const leaseUntil = ClaimRules.computeLeaseUntil(request, now);
    this.records.set(key, {
      state: ClaimState.InProgress,
      fingerprint,
      claimToken,
      leaseUntil,
    });
    return {
      state: ClaimState.Acquired,
      claimToken,
      leaseUntil,
      fingerprint,
      takeover: record !== undefined,
    };
  }

  /** In-progress record whose current token is `claimToken`, even if its lease has expired. */
  private ownedRecord(
    key: string,
    claimToken: string,
  ): Extract<StoredRecord<R>, { state: ClaimState.InProgress }> | undefined {
    const record = this.records.get(key);
    return record?.state === ClaimState.InProgress &&
      record.claimToken === claimToken
      ? record
      : undefined;
  }
}
