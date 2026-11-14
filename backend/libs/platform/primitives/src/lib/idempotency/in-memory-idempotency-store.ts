import type { Clock, IdGenerator } from '@platform/kernel';
import { DeadlineExceededError, StaleClaimError } from '../errors.js';
import {
  assertClaimInput,
  ClaimState,
  computeLeaseUntil,
  type ClaimRequest,
  type ClaimResult,
  type IdempotencyStore,
} from './idempotency-store.js';

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
 * Adaptador en memoria. Es atómico dentro de un proceso porque cada método
 * resuelve sin ceder el hilo; sirve para tests y para un solo proceso. No
 * expira resultados completados.
 */
export class InMemoryIdempotencyStore<
  R = unknown,
> implements IdempotencyStore<R> {
  private readonly records = new Map<string, StoredRecord<R>>();

  constructor(
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

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

  private claimNow(key: string, request: ClaimRequest): ClaimResult<R> {
    assertClaimInput(key, request.fingerprint);
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

    // Llave libre o lease vencido: se emite un token nuevo y el anterior deja de valer.
    // Al tomar un lease vencido se conserva la huella del primer claim.
    const fingerprint = record?.fingerprint ?? request.fingerprint;
    const claimToken = this.ids.next().toString();
    const leaseUntil = computeLeaseUntil(request, now);
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

  /** Registro en curso cuyo token vigente es `claimToken`, aunque su lease haya vencido. */
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
