import { type Clock } from '@platform/kernel';
import { InMemoryOutboxStore } from '../../../__tests__/utils/in-memory-outbox-store.js';
import type {
  ClaimOutboxRequest,
  OutboxLease,
  OutboxRecord,
} from '../../outbox.js';

/**
 * In-memory store that keeps each claim request and can reject the
 * next published marks, to test fencing without spies.
 */
export class RecordingOutboxStore extends InMemoryOutboxStore {
  /** Claim requests, in the order they arrived. */
  readonly claims: ClaimOutboxRequest[] = [];
  private rejectedMarks = 0;

  constructor(clock: Clock) {
    super({ clock });
  }

  /** Makes the next `count` published marks return `false`. */
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
