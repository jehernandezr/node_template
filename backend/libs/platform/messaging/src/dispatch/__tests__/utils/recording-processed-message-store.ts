import { ClaimRequest } from '@platform/kernel';
import { InMemoryProcessedMessageStore } from '../../../__tests__/utils/in-memory-processed-message-store.js';

/** What the store checks to know whether an operation runs inside the delivery context. */
export interface DeliveryContextProbe {
  readonly active: boolean;
}

/** In-memory store that records each claim and each release, and whether the release ran in context. */
export class RecordingProcessedMessageStore extends InMemoryProcessedMessageStore {
  readonly claims: ClaimRequest[] = [];
  readonly releasesInContext: boolean[] = [];
  releases = 0;
  contextProbe: DeliveryContextProbe | undefined;

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
    if (this.contextProbe)
      this.releasesInContext.push(this.contextProbe.active);
    return super.release(key, claimToken);
  }
}
