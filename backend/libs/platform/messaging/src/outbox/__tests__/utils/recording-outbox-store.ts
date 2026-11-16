import { type Clock } from '@platform/kernel';
import { InMemoryOutboxStore } from '../../../__tests__/utils/in-memory-outbox-store.js';
import type {
  ClaimOutboxRequest,
  OutboxLease,
  OutboxRecord,
} from '../../outbox.js';

/**
 * Almacén en memoria que guarda cada pedido de reclamo y puede rechazar las
 * próximas marcas de publicado, para probar el fencing sin espías.
 */
export class RecordingOutboxStore extends InMemoryOutboxStore {
  /** Pedidos de reclamo, en el orden en que llegaron. */
  readonly claims: ClaimOutboxRequest[] = [];
  private rejectedMarks = 0;

  constructor(clock: Clock) {
    super({ clock });
  }

  /** Hace que las próximas `count` marcas de publicado devuelvan `false`. */
  rejectNextPublishedMarks(count: number): void {
    this.rejectedMarks = count;
  }

  override claimPending(request: ClaimOutboxRequest): Promise<OutboxRecord[]> {
    this.claims.push(request);
    return super.claimPending(request);
  }

  override markPublished(id: string, lease: OutboxLease): Promise<boolean> {
    if (this.rejectedMarks > 0) {
      this.rejectedMarks -= 1;
      return Promise.resolve(false);
    }
    return super.markPublished(id, lease);
  }
}
