import { ClaimRequest } from '@platform/kernel';
import { InMemoryProcessedMessageStore } from '../../../__tests__/utils/in-memory-processed-message-store.js';

/** Lo que el almacén consulta para saber si una operación corre dentro del contexto de la entrega. */
export interface DeliveryContextProbe {
  readonly active: boolean;
}

/** Almacén en memoria que anota cada reclamo y cada liberación, y si la liberación corrió en contexto. */
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
