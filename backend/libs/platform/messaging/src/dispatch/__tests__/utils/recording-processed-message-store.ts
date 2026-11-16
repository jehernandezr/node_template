import { ClaimRequest } from '@platform/kernel';
import { InMemoryProcessedMessageStore } from '../../../__tests__/utils/in-memory-processed-message-store.js';

/** Almacén en memoria que anota cada reclamo y cada liberación. */
export class RecordingProcessedMessageStore extends InMemoryProcessedMessageStore {
  readonly claims: ClaimRequest[] = [];
  releases = 0;

  override claim(
    key: string,
    request: ClaimRequest,
  ): ReturnType<InMemoryProcessedMessageStore['claim']> {
    this.claims.push(request);
    return super.claim(key, request);
  }

  override release(
    key: string,
    claimToken: string,
  ): ReturnType<InMemoryProcessedMessageStore['release']> {
    this.releases += 1;
    return super.release(key, claimToken);
  }
}
