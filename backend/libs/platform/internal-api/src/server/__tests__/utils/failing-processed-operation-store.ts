import type { Clock, IdGenerator } from '@platform/kernel';
import type { FinalOutcome } from '@platform/primitives';
import { ClaimRequest, ClaimResult } from '@platform/kernel';
import { ProcessedOperationStore } from '../../processed-operation-store.js';
import { RecordingProcessedOperationStore } from './recording-processed-operation-store.js';

/** Almacén que falla en el método que se programe y delega el resto en memoria. */
export class FailingProcessedOperationStore extends ProcessedOperationStore {
  private readonly inner: RecordingProcessedOperationStore;
  private claimFailure?: { readonly error: unknown };
  private completeFailure?: { readonly error: unknown };
  private releaseFailure?: { readonly error: unknown };

  constructor(clock: Clock, ids: IdGenerator) {
    super();
    this.inner = new RecordingProcessedOperationStore(clock, ids);
  }

  failClaim(error: unknown): this {
    this.claimFailure = { error };
    return this;
  }

  failComplete(error: unknown): this {
    this.completeFailure = { error };
    return this;
  }

  failRelease(error: unknown): this {
    this.releaseFailure = { error };
    return this;
  }

  async claim(
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<FinalOutcome<unknown>>> {
    if (this.claimFailure !== undefined) {
      throw this.claimFailure.error;
    }
    return this.inner.claim(key, request);
  }

  async complete(
    key: string,
    claimToken: string,
    result: FinalOutcome<unknown>,
  ): Promise<void> {
    if (this.completeFailure !== undefined) {
      throw this.completeFailure.error;
    }
    return this.inner.complete(key, claimToken, result);
  }

  renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    return this.inner.renew(key, claimToken, leaseUntilMs);
  }

  async release(key: string, claimToken: string): Promise<void> {
    if (this.releaseFailure !== undefined) {
      throw this.releaseFailure.error;
    }
    return this.inner.release(key, claimToken);
  }
}
