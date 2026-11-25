import type { FinalOutcome } from '@platform/primitives';
import { ClaimRequest, ClaimResult } from '@platform/kernel';
import { InMemoryProcessedOperationStore } from '../../../__tests__/utils/in-memory-processed-operation-store.js';

/** In-memory store that records each `claim` received, to verify the key and the lease. */
export class RecordingProcessedOperationStore extends InMemoryProcessedOperationStore {
  readonly claims: Array<{ key: string; request: ClaimRequest }> = [];

  override claim(
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<FinalOutcome<unknown>>> {
    this.claims.push({ key, request });
    return super.claim(key, request);
  }
}
