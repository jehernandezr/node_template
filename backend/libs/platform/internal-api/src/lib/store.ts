import type { OperationResult } from './result.js';

/** Result of `ProcessedOperationStore.claim`. `inputHash` is the hash recorded when the key was first claimed. */
export enum ClaimState {
  Acquired = 'acquired',
  InProgress = 'in-progress',
  Completed = 'completed',
}

export type ClaimOutcome =
  | { readonly state: ClaimState.Acquired; readonly inputHash: string }
  | { readonly state: ClaimState.InProgress; readonly inputHash: string }
  | {
      readonly state: ClaimState.Completed;
      readonly inputHash: string;
      readonly result: OperationResult<unknown>;
    };

export interface ClaimRequest {
  readonly inputHash: string;
  /** How long the claim blocks other attempts. Must outlast the longest handler run. */
  readonly leaseMs: number;
  /** Epoch milliseconds. */
  readonly now: number;
}

/**
 * Idempotency state per key.
 * - `claim` must be atomic per key. Expired leases can be taken over.
 * - `complete` stores a final result (Success or BusinessError).
 * - `release` drops an in-progress claim so a later attempt can run.
 * A production store must write `complete` inside the same unit of work as the handler's side effects,
 * so a result is stored if and only if its effects were committed.
 */
export interface ProcessedOperationStore {
  claim(key: string, request: ClaimRequest): Promise<ClaimOutcome>;
  complete(key: string, result: OperationResult<unknown>): Promise<void>;
  release(key: string): Promise<void>;
}

type StoredRecord =
  | {
      readonly status: 'in-progress';
      readonly inputHash: string;
      readonly leaseUntil: number;
    }
  | {
      readonly status: 'completed';
      readonly inputHash: string;
      readonly result: OperationResult<unknown>;
    };

/** Process-local store. Atomic within one process, suitable for tests and single-process use only. */
export class InMemoryProcessedOperationStore implements ProcessedOperationStore {
  private readonly records = new Map<string, StoredRecord>();

  claim(
    key: string,
    { inputHash, leaseMs, now }: ClaimRequest,
  ): Promise<ClaimOutcome> {
    const record = this.records.get(key);
    if (record === undefined) {
      this.records.set(key, {
        status: 'in-progress',
        inputHash,
        leaseUntil: now + leaseMs,
      });
      return Promise.resolve({ state: ClaimState.Acquired, inputHash });
    }
    if (record.status === 'completed') {
      return Promise.resolve({
        state: ClaimState.Completed,
        inputHash: record.inputHash,
        result: record.result,
      });
    }
    if (record.leaseUntil > now) {
      return Promise.resolve({
        state: ClaimState.InProgress,
        inputHash: record.inputHash,
      });
    }
    // The previous lease expired: take it over, keeping the hash of the first claim.
    this.records.set(key, { ...record, leaseUntil: now + leaseMs });
    return Promise.resolve({
      state: ClaimState.Acquired,
      inputHash: record.inputHash,
    });
  }

  complete(key: string, result: OperationResult<unknown>): Promise<void> {
    const record = this.records.get(key);
    if (record === undefined) {
      return Promise.reject(
        new Error(`Cannot complete "${key}" without a claim`),
      );
    }
    this.records.set(key, {
      status: 'completed',
      inputHash: record.inputHash,
      result,
    });
    return Promise.resolve();
  }

  release(key: string): Promise<void> {
    if (this.records.get(key)?.status === 'in-progress') {
      this.records.delete(key);
    }
    return Promise.resolve();
  }
}
