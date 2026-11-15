import type {
  ClaimRequest,
  ClaimResult,
  FinalOutcome,
} from '@platform/primitives';
import { InMemoryProcessedOperationStore } from '../../../__tests__/utils/in-memory-processed-operation-store.js';

/** Almacén en memoria que guarda cada `claim` recibido, para verificar la llave y el lease. */
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
